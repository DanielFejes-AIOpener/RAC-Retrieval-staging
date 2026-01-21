import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadFile, findFileByPath, getFileIndex, getAvailableClients } from '../lib/loader';
import { resolveRefs } from '../lib/resolver';
import { applyInheritance } from '../lib/merger';
import { stripMeta, extractSection } from '../lib/utils';

// Layers that require client_id
const LAYERS_NEEDING_CLIENT = ['USE_CASE', 'OPS', 'ORG', 'PACK', 'WORKFLOW'];

interface RequestBody {
  path: string;           // Required: "USE_CASE/COPYWRITER" or "USE_CASE/COPYWRITER/prohibitions"
  client_id: string;      // Required: "AI_OPENER"
  include_client?: boolean; // Optional: default true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' });
  }

  // Parse body
  const body: RequestBody = req.body || {};
  const { path: pathString, client_id: clientId, include_client: includeClient = true } = body;

  // Validate required fields
  if (!pathString) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_PATH',
      message: 'path is required. Format: LAYER/FILE_ID or LAYER/FILE_ID/SECTION'
    });
  }

  // Parse the path: LAYER/FILE_ID/SECTION
  const pathParts = pathString.split('/').filter(Boolean);
  
  if (pathParts.length === 0) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_PATH',
      message: 'path is required. Format: LAYER/FILE_ID or LAYER/FILE_ID/SECTION'
    });
  }

  const layer = pathParts[0].toUpperCase();
  let fileId = pathParts[1] || '';
  let sectionPath = pathParts.slice(2).join('.');

  // Special case: CONFIG layer
  if (layer === 'CONFIG') {
    if (!fileId) {
      fileId = 'INSTANCE';
    } else {
      // CONFIG/agents -> section is fileId, file is INSTANCE
      sectionPath = fileId;
      fileId = 'INSTANCE';
    }
  }

  // Check if client_id is required
  if (LAYERS_NEEDING_CLIENT.includes(layer) && !clientId) {
    return res.status(400).json({
      error: true,
      code: 'CLIENT_REQUIRED',
      message: 'client_id is required for this path',
      available_clients: getAvailableClients()
    });
  }

  try {
    // Find the file
    const filePath = findFileByPath(layer, fileId);
    
    if (!filePath) {
      const index = getFileIndex();
      const suggestions = Object.keys(index)
        .filter(k => k.includes(layer))
        .slice(0, 5)
        .map(k => {
          const match = k.match(/_\d+_(.+)$/);
          return match ? `${layer}/${match[1]}` : k;
        });
      
      return res.status(404).json({
        error: true,
        code: 'NOT_FOUND',
        message: `Path not found: ${pathString}`,
        suggestions
      });
    }

    // Load the file
    let content = loadFile(filePath);
    
    if (!content) {
      return res.status(500).json({
        error: true,
        code: 'LOAD_ERROR',
        message: `Failed to load file: ${filePath}`
      });
    }

    // Apply inheritance (extends)
    content = applyInheritance(content, layer);

    // Resolve $ref pointers
    content = resolveRefs(content);

    // Strip meta
    content = stripMeta(content);

    // Extract section if specified
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
      path: pathString,
      resolved: true,
      content
    };

    // Load CLIENT if required and requested
    if (clientId && includeClient && LAYERS_NEEDING_CLIENT.includes(layer)) {
      const clientFile = findClientFile(clientId);
      if (clientFile) {
        let clientContent = loadFile(clientFile);
        clientContent = resolveRefs(clientContent);
        clientContent = stripMeta(clientContent);
        response.client = {
          id: clientId,
          ...clientContent
        };
      }
    }

    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({
      error: true,
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function findClientFile(clientId: string): string | null {
  const index = getFileIndex();
  
  // Find CLIENT file by client_id in content
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes('CLIENT') && !key.includes('BASE_TEMPLATE')) {
      const content = loadFile(filePath);
      if (content?.meta?.client_id === clientId) {
        return filePath;
      }
    }
  }
  
  // Fallback: find by name
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes('CLIENT') && key.includes(clientId)) {
      return filePath;
    }
  }
  
  // Last resort: first non-template CLIENT
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes('CLIENT') && !key.includes('BASE_TEMPLATE')) {
      return filePath;
    }
  }
  
  return null;
}
