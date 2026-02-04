import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadFile, findFileByPath, findFileByPathForClient, getFileIndex } from '../../lib/loader';
import { resolveRefs } from '../../lib/resolver';
import { applyInheritance } from '../../lib/merger';
import { stripMeta, extractSection } from '../../lib/utils';

// Client slug → client file ID (the part after _NN_)
const CLIENT_FILE_MAP: Record<string, string> = {
  'uhu': 'CLIENT_05_UHU',
  'demo': 'CLIENT_01_DEMO_CLIENT',
  'fixico': 'CLIENT_01_FIXICO',
  'msn': 'CLIENT_01_MSN',
  'reducate': 'CLIENT_02_PO_ONLINE',
  'aaa': 'CLIENT_01_AAA',  // No CLIENT file yet, but ORG/LIBRARY overrides exist
  'prorail': 'CLIENT_01_PRORAIL',
};

// All available layers
const ALL_LAYERS = ['CONFIG', 'CLIENT', 'LOGIC', 'OPS', 'ORG', 'PACK', 'ROLE', 'USE_CASE', 'WORKFLOW', 'LIBRARY'];

// Layers that can have client-specific overrides
const CLIENT_OVERRIDE_LAYERS = ['CLIENT', 'CONFIG', 'ORG', 'PACK', 'ROLE', 'LIBRARY'];

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
  'reducate': ['CME-ONLINE', 'PO_ONLINE'],  // Reducate can access both CME-Online and PO-Online
};

// Layers that get client data attached
const LAYERS_WITH_CLIENT = ['USE_CASE', 'OPS', 'ORG', 'PACK', 'WORKFLOW'];

interface RequestBody {
  path: string;
  include_client?: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get client from URL
  const clientSlug = (req.query.client as string)?.toLowerCase();
  
  if (!clientSlug || !CLIENT_FILE_MAP[clientSlug]) {
    return res.status(200).json({
      error: true,
      code: 'UNKNOWN_CLIENT',
      message: `Unknown client: ${clientSlug}`,
      available_clients: Object.keys(CLIENT_FILE_MAP)
    });
  }

  // GET: Return available files index for this client
  if (req.method === 'GET') {
    return handleGetIndex(clientSlug, res);
  }

  // POST: Query specific file
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, code: 'METHOD_NOT_ALLOWED', message: 'Only GET and POST allowed' });
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
    
    // Build list of all allowed client files for this endpoint
    const allAllowed = [allowedFileId, 'BASE_TEMPLATE', ...accessGrants.map(g => g.toUpperCase())];
    
    // Only allow access to own client file, BASE_TEMPLATE, or granted sub-clients
    if (requestedFileId !== allowedFileId && !requestedFileId.includes('BASE_TEMPLATE') && !hasAccessGrant) {
      // Check for typos - normalize by removing special chars for comparison
      const normalizedRequest = requestedFileId.replace(/[_-]/g, '');
      const similar = allAllowed.filter(allowed => {
        const normalizedAllowed = allowed.replace(/[_-]/g, '');
        return normalizedAllowed.includes(normalizedRequest) || 
               normalizedRequest.includes(normalizedAllowed) ||
               normalizedAllowed === normalizedRequest;
      });
      
      const errorResponse: any = {
        error: true,
        code: 'ACCESS_DENIED',
        message: `Access denied: cannot access other clients' data from /${clientSlug} endpoint`,
        hint: `You can only access CLIENT/${allowedFileId}, CLIENT/BASE_TEMPLATE${accessGrants.length > 0 ? `, or granted sub-clients: ${accessGrants.join(', ')}` : ''}`
      };
      
      // Add typo suggestions if we found similar matches
      if (similar.length > 0 && !similar.includes(requestedFileId)) {
        errorResponse.did_you_mean = similar.map(s => `CLIENT/${s}`);
      }
      
      errorResponse.allowed_paths = allAllowed.map(a => `CLIENT/${a}`);
      
      return res.status(403).json(errorResponse);
    }
  }

  try {
    // Find file (uses client-specific override for supported layers)
    let filePath = findFileByPathForClient(layer, fileId, clientSlug);
    
    // Auto-correct full ID to short name
    if (!filePath && fileId) {
      const match = fileId.match(/^[A-Z_]+_\d+_(.+)$/);
      if (match) {
        filePath = findFileByPathForClient(layer, match[1], clientSlug);
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

      return res.status(200).json(errorResponse);
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
        return res.status(200).json({
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
      const clientFile = findClientFileById(clientFileId, clientSlug);
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

/**
 * Handle GET requests - return available files index for client
 */
/**
 * Extract top-level section keys from file content
 */
function getFileSections(content: any): string[] {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return [];
  }
  return Object.keys(content).filter(k => k !== 'meta' && k !== 'extends');
}

function handleGetIndex(clientSlug: string, res: VercelResponse) {
  const index = getFileIndex();
  
  // Get this client's allowed CLIENT files
  const clientFileId = CLIENT_FILE_MAP[clientSlug] || '';
  const ownClientFile = clientFileId.replace(/^CLIENT_\d+_/, '');
  const accessGrants = CLIENT_ACCESS_GRANTS[clientSlug] || [];
  const allowedClientFiles = new Set([
    'BASE_TEMPLATE',
    ownClientFile.toUpperCase(),
    ...accessGrants.map(g => g.toUpperCase())
  ]);
  
  // Build structured response by layer
  const available: Record<string, { shared: string[]; client_specific: string[] }> = {};
  // Track file paths for section extraction
  const filePathMap: Record<string, string> = {}; // "LAYER/FILE" -> actual file path
  
  for (const layer of ALL_LAYERS) {
    const shared: string[] = [];
    const clientSpecific: string[] = [];
    
    for (const [key, filePath] of Object.entries(index)) {
      // Skip client-prefixed entries when looking for shared files
      if (key.startsWith('clients:')) {
        // Check if this is for our client
        if (!key.startsWith(`clients:${clientSlug}:`)) continue;
        
        // Check if file is in this layer
        if (!filePath.includes(`/${layer}/`)) continue;
        
        // Only use layer:shortName format (clients:{slug}:{layer}:{shortName})
        // This avoids duplicates from the cleanId format
        const clientLayerPrefix = `clients:${clientSlug}:${layer}:`;
        if (key.startsWith(clientLayerPrefix)) {
          const shortName = key.substring(clientLayerPrefix.length);
          clientSpecific.push(shortName);
          filePathMap[`${layer}/${shortName}`] = filePath;
        } else {
          // Handle non-standard format (clients:{slug}:{LAYER_NAME}) 
          // Only if no layer:shortName format exists for this file
          const cleanId = key.substring(`clients:${clientSlug}:`.length);
          if (cleanId.startsWith(`${layer}_`)) {
            // Check if a standard format key exists for this file
            const shortName = cleanId.substring(`${layer}_`.length);
            // Strip _NN_ prefix if present to get actual short name
            const actualShortName = shortName.replace(/^\d+_/, '');
            const standardKey = `clients:${clientSlug}:${layer}:${actualShortName}`;
            // Only add if no standard key exists
            if (!index[standardKey]) {
              clientSpecific.push(shortName);
              filePathMap[`${layer}/${shortName}`] = filePath;
            }
          }
        }
        continue;
      }
      
      // Check if this is a shared file in this layer
      if (filePath.includes(`/data/${layer}/`) || filePath.includes(`\\data\\${layer}\\`)) {
        // Extract short name from LAYER_NN_NAME pattern
        const match = key.match(/^[A-Z_]+_\d+_(.+)$/);
        if (match) {
          const shortName = match[1];
          // For CLIENT layer, filter to only allowed files
          if (layer === 'CLIENT') {
            if (allowedClientFiles.has(shortName.toUpperCase())) {
              shared.push(shortName);
              filePathMap[`${layer}/${shortName}`] = filePath;
            }
          } else {
            shared.push(shortName);
            filePathMap[`${layer}/${shortName}`] = filePath;
          }
        } else if (key.includes(':')) {
          // It's a layer:shortName format, extract shortName
          const shortName = key.split(':')[1];
          if (shortName && !shared.includes(shortName)) {
            // For CLIENT layer, filter to only allowed files
            if (layer === 'CLIENT') {
              if (allowedClientFiles.has(shortName.toUpperCase())) {
                shared.push(shortName);
                filePathMap[`${layer}/${shortName}`] = filePath;
              }
            } else {
              shared.push(shortName);
              filePathMap[`${layer}/${shortName}`] = filePath;
            }
          }
        }
      }
    }
    
    // Dedupe and sort
    const uniqueShared = Array.from(new Set(shared)).sort();
    const uniqueClientSpecific = Array.from(new Set(clientSpecific)).sort();
    
    // Only include layer if it has files
    if (uniqueShared.length > 0 || uniqueClientSpecific.length > 0) {
      available[layer] = {
        shared: uniqueShared,
        client_specific: uniqueClientSpecific
      };
    }
  }
  
  // Build path list and extract sections for each file
  const paths: string[] = [];
  const files: Record<string, string[]> = {};
  
  for (const [layer, layerFiles] of Object.entries(available)) {
    // Client-specific files take precedence
    const clientFiles = new Set(layerFiles.client_specific);
    
    for (const file of layerFiles.client_specific) {
      const path = `${layer}/${file}`;
      paths.push(path);
      
      // Load file and extract sections
      const filePath = filePathMap[path];
      if (filePath) {
        const content = loadFile(filePath);
        const sections = getFileSections(content);
        if (sections.length > 0) {
          files[path] = sections;
        }
      }
    }
    for (const file of layerFiles.shared) {
      // Only add shared if not overridden by client-specific
      if (!clientFiles.has(file)) {
        const path = `${layer}/${file}`;
        paths.push(path);
        
        // Load file and extract sections
        const filePath = filePathMap[path];
        if (filePath) {
          const content = loadFile(filePath);
          const sections = getFileSections(content);
          if (sections.length > 0) {
            files[path] = sections;
          }
        }
      }
    }
  }
  
  return res.status(200).json({
    client: clientSlug,
    usage_hint: "Most tasks only need a single section. Use LAYER/FILE/SECTION (e.g., OPS/COPYWRITING_PLAYBOOK/hooks) instead of loading entire files to reduce context and improve accuracy.",
    files,
    all_paths: paths.sort()
  });
}

function findClientFileById(clientFileId: string, clientSlug?: string): string | null {
  const index = getFileIndex();
  
  // First check client-specific folder if we have a slug
  if (clientSlug) {
    for (const [key, filePath] of Object.entries(index)) {
      if (key.startsWith(`clients:${clientSlug}:`) && key.includes(clientFileId)) {
        return filePath;
      }
    }
  }
  
  // Fall back to shared CLIENT folder
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes(clientFileId) && !key.startsWith('clients:')) {
      return filePath;
    }
  }

  return null;
}
