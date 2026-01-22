import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadFile, findFileByPath, getFileIndex } from '../../lib/loader';
import { resolveRefs } from '../../lib/resolver';
import { applyInheritance } from '../../lib/merger';
import { stripMeta, extractSection } from '../../lib/utils';

// Client slug → client_id mapping
const CLIENT_MAP: Record<string, string> = {
  'uhu': 'UHU',
  'demo': 'AI_OPENER',
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
  
  if (!clientSlug || !CLIENT_MAP[clientSlug]) {
    return res.status(404).json({
      error: true,
      code: 'UNKNOWN_CLIENT',
      message: `Unknown client: ${clientSlug}`,
      available_clients: Object.keys(CLIENT_MAP)
    });
  }

  const clientId = CLIENT_MAP[clientSlug];

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
      const suggestions = Object.keys(index)
        .filter(k => k.includes(layer))
        .slice(0, 10)
        .map(k => {
          const m = k.match(/_\d+_(.+)$/);
          return m ? `${layer}/${m[1]}` : k;
        });

      return res.status(404).json({
        error: true,
        code: 'NOT_FOUND',
        message: `Path not found: ${pathString}`,
        suggestions
      });
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
      const clientFile = findClientFile(clientId);
      if (clientFile) {
        let clientContent = loadFile(clientFile);
        clientContent = resolveRefs(clientContent);
        clientContent = stripMeta(clientContent);
        response.client_data = {
          id: clientId,
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

function findClientFile(clientId: string): string | null {
  const index = getFileIndex();
  
  // Find by client_id in meta
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes('CLIENT') && !key.includes('BASE_TEMPLATE')) {
      const content = loadFile(filePath);
      // Check meta.client_id or meta.Client
      if (content?.meta?.client_id === clientId || content?.meta?.Client === clientId) {
        return filePath;
      }
    }
  }

  // Find by name in key
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes('CLIENT') && key.toUpperCase().includes(clientId.toUpperCase())) {
      return filePath;
    }
  }

  return null;
}
