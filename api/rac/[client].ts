import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadFile, findFileByPath, getFileIndex } from '../../lib/loader';
import { resolveRefs } from '../../lib/resolver';
import { applyInheritance } from '../../lib/merger';
import { stripMeta, extractSection } from '../../lib/utils';

// Client slug → client file ID (the part after _NN_)
const CLIENT_FILE_MAP: Record<string, string> = {
  'uhu': 'CLIENT_05_UHU',
  'demo': 'CLIENT_01_DEMO_CLIENT',
};

// Client-specific role remapping (old role → new role)
// Used to redirect legacy role names to client-specific versions
const CLIENT_ROLE_REMAP: Record<string, Record<string, string>> = {
  'uhu': {
    'STRATEGIST': 'EMPLOYER_BRAND_STRATEGIST',
    'TRAFFIC': 'MEDIA_DISTRIBUTION_STRATEGIST',
  }
};

// Client access grants - which sub-clients a parent client can access
// Format: parent client slug → array of allowed client file IDs (without CLIENT_NN_ prefix)
const CLIENT_ACCESS_GRANTS: Record<string, string[]> = {
  'uhu': ['PRORAIL'],  // UHU can access ProRail client data
};

// Layers that get client data attached
const LAYERS_WITH_CLIENT = ['USE_CASE', 'OPS', 'ORG', 'PACK', 'WORKFLOW'];

interface RequestBody {
  path: string;
  include_client?: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' });
  }

  // Get client from URL
  const clientSlug = (req.query.client as string)?.toLowerCase();
  
  if (!clientSlug || !CLIENT_FILE_MAP[clientSlug]) {
    return res.status(404).json({
      error: true,
      code: 'UNKNOWN_CLIENT',
      message: `Unknown client: ${clientSlug}`,
      available_clients: Object.keys(CLIENT_FILE_MAP)
    });
  }

  const clientFileId = CLIENT_FILE_MAP[clientSlug];

  // Parse body
  const body: RequestBody = req.body || {};
  const { path: pathString, include_client: includeClient = true } = body;

  if (!pathString) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_PATH',
      message: 'path is required. Format: LAYER/FILE_ID or LAYER/FILE_ID/SECTION'
    });
  }

  // Parse path
  const pathParts = pathString.split('/').filter(Boolean);
  const layer = pathParts[0]?.toUpperCase() || '';
  let fileId = pathParts[1] || '';
  let sectionPath = pathParts.slice(2).join('.');

  // CONFIG special case
  if (layer === 'CONFIG') {
    if (!fileId) {
      fileId = 'INSTANCE';
    } else {
      sectionPath = fileId;
      fileId = 'INSTANCE';
    }
  }

  // Apply client-specific role remapping
  if (layer === 'ROLE' && CLIENT_ROLE_REMAP[clientSlug]) {
    const remap = CLIENT_ROLE_REMAP[clientSlug];
    const fileIdUpper = fileId.toUpperCase();
    if (remap[fileIdUpper]) {
      fileId = remap[fileIdUpper];
    }
  }

  // Block access to other clients' data
  if (layer === 'CLIENT') {
    // Extract the client name from the file ID being requested
    const requestedFileId = fileId.toUpperCase();
    const allowedFileId = clientFileId.replace(/^CLIENT_\d+_/, '');
    
    // Check if this client has access grants for the requested client
    const accessGrants = CLIENT_ACCESS_GRANTS[clientSlug] || [];
    const hasAccessGrant = accessGrants.some(grant => requestedFileId.includes(grant.toUpperCase()));
    
    // Only allow access to own client file, BASE_TEMPLATE, or granted sub-clients
    if (requestedFileId !== allowedFileId && !requestedFileId.includes('BASE_TEMPLATE') && !hasAccessGrant) {
      return res.status(403).json({
        error: true,
        code: 'ACCESS_DENIED',
        message: `Access denied: cannot access other clients' data from /${clientSlug} endpoint`,
        hint: `You can only access CLIENT/${allowedFileId}, CLIENT/BASE_TEMPLATE${accessGrants.length > 0 ? `, or granted sub-clients: ${accessGrants.join(', ')}` : ''}`
      });
    }
  }

  try {
    // Find file
    let filePath = findFileByPath(layer, fileId);
    
    // Auto-correct full ID to short name
    if (!filePath && fileId) {
      const match = fileId.match(/^[A-Z_]+_\d+_(.+)$/);
      if (match) {
        filePath = findFileByPath(layer, match[1]);
        if (filePath) fileId = match[1];
      }
    }

    if (!filePath) {
      const index = getFileIndex();
      
      // Get all files in the requested layer
      const layerFiles = Object.keys(index)
        .filter(k => k.startsWith(`${layer}_`) || k.startsWith(`${layer}:`))
        .map(k => {
          const m = k.match(/_\d+_(.+)$/);
          return m ? m[1] : k.replace(`${layer}:`, '');
        })
        .filter((v, i, a) => a.indexOf(v) === i); // dedupe
      
      // Check if file exists in a different layer
      const allLayers = ['CONFIG', 'CLIENT', 'LOGIC', 'OPS', 'ORG', 'PACK', 'ROLE', 'USE_CASE', 'WORKFLOW'];
      let foundInLayer: string | null = null;
      for (const otherLayer of allLayers) {
        if (otherLayer === layer) continue;
        const found = Object.keys(index).find(k => 
          (k.startsWith(`${otherLayer}_`) || k.startsWith(`${otherLayer}:`)) && 
          k.toUpperCase().includes(fileId.toUpperCase())
        );
        if (found) {
          foundInLayer = otherLayer;
          break;
        }
      }

      // Find similar files in this layer (fuzzy match)
      const similar = layerFiles.filter(f => 
        f.toUpperCase().includes(fileId.toUpperCase()) ||
        fileId.toUpperCase().includes(f.toUpperCase().substring(0, 4))
      );

      const errorResponse: any = {
        error: true,
        code: 'NOT_FOUND',
        message: `Path not found: ${pathString}`
      };

      if (foundInLayer) {
        errorResponse.hint = `Did you mean ${foundInLayer}/${fileId}? The file exists in the ${foundInLayer} layer, not ${layer}.`;
      }

      if (similar.length > 0) {
        errorResponse.similar = similar.slice(0, 5).map(f => `${layer}/${f}`);
      }

      errorResponse.available_in_layer = layerFiles.slice(0, 15).map(f => `${layer}/${f}`);

      return res.status(404).json(errorResponse);
    }

    // Load & process
    let content = loadFile(filePath);
    if (!content) {
      return res.status(500).json({ error: true, code: 'LOAD_ERROR', message: 'Failed to load file' });
    }

    content = applyInheritance(content, layer);
    content = resolveRefs(content);
    content = stripMeta(content);

    // Extract section
    if (sectionPath) {
      content = extractSection(content, sectionPath);
      if (content === null || content === undefined) {
        return res.status(404).json({
          error: true,
          code: 'SECTION_NOT_FOUND',
          message: `Section not found: ${sectionPath}`
        });
      }
    }

    // Build response
    const response: any = {
      client: clientSlug,
      path: pathString,
      resolved: true,
      content
    };

    // Attach client data
    if (includeClient && LAYERS_WITH_CLIENT.includes(layer)) {
      const clientFile = findClientFileById(clientFileId);
      if (clientFile) {
        let clientContent = loadFile(clientFile);
        clientContent = resolveRefs(clientContent);
        clientContent = stripMeta(clientContent);
        response.client_data = {
          id: clientSlug,
          ...clientContent
        };
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: true,
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function findClientFileById(clientFileId: string): string | null {
  const index = getFileIndex();
  
  // Find by file ID (e.g., CLIENT_05_UHU)
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes(clientFileId)) {
      return filePath;
    }
  }

  return null;
}
