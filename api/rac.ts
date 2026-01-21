import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadFile, findFileByPath, getFileIndex, getAvailableClients } from '../lib/loader';
import { resolveRefs } from '../lib/resolver';
import { applyInheritance } from '../lib/merger';
import { stripMeta, extractSection } from '../lib/utils';

// Valid layers
const VALID_LAYERS = ['CONFIG', 'CLIENT', 'LOGIC', 'OPS', 'ORG', 'PACK', 'ROLE', 'USE_CASE', 'WORKFLOW'];

// Layers that require client_id
const LAYERS_NEEDING_CLIENT = ['USE_CASE', 'OPS', 'ORG', 'PACK', 'WORKFLOW'];

interface RequestBody {
  path: string;           // Required: "USE_CASE/COPYWRITER" or "USE_CASE/COPYWRITER/prohibitions"
  client_id: string;      // Required: "AI_OPENER"
  include_client?: boolean; // Optional: default true
}

/**
 * Get all available paths for a layer
 */
function getLayerPaths(layer: string): string[] {
  const index = getFileIndex();
  const paths: string[] = [];
  
  for (const key of Object.keys(index)) {
    if (key.startsWith(`${layer}_`) || key.startsWith(`${layer}:`)) {
      const match = key.match(/_\d+_(.+)$/);
      if (match) {
        paths.push(`${layer}/${match[1]}`);
      }
    }
  }
  
  return paths;
}

/**
 * Get top-level sections from content
 */
function getAvailableSections(content: any): string[] {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return [];
  }
  return Object.keys(content).filter(k => k !== 'meta' && k !== 'extends');
}

/**
 * Try to extract short name from a full file ID
 * e.g., "ORG_02_BRAND_POSITIONING" -> "BRAND_POSITIONING"
 */
function extractShortName(fileId: string): string | null {
  const match = fileId.match(/^[A-Z_]+_\d+_(.+)$/);
  return match ? match[1] : null;
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
      message: 'path is required. Format: LAYER/FILE_ID or LAYER/FILE_ID/SECTION',
      valid_layers: VALID_LAYERS,
      example: 'USE_CASE/COPYWRITER'
    });
  }

  // Parse the path: LAYER/FILE_ID/SECTION
  const pathParts = pathString.split('/').filter(Boolean);
  
  if (pathParts.length === 0) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_PATH',
      message: 'path is required. Format: LAYER/FILE_ID or LAYER/FILE_ID/SECTION',
      valid_layers: VALID_LAYERS,
      example: 'USE_CASE/COPYWRITER'
    });
  }

  const layer = pathParts[0].toUpperCase();
  let fileId = pathParts[1] || '';
  let sectionPath = pathParts.slice(2).join('.');

  // Validate layer
  if (!VALID_LAYERS.includes(layer)) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_LAYER',
      message: `Invalid layer: ${layer}`,
      valid_layers: VALID_LAYERS
    });
  }

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
      message: `client_id is required for ${layer} paths`,
      available_clients: getAvailableClients()
    });
  }

  try {
    // Find the file
    let filePath = findFileByPath(layer, fileId);
    
    // If not found, check if user provided full ID instead of short name
    if (!filePath && fileId) {
      const shortName = extractShortName(fileId);
      if (shortName) {
        filePath = findFileByPath(layer, shortName);
        if (filePath) {
          // Auto-correct and continue, but note in response
          fileId = shortName;
        }
      }
    }
    
    if (!filePath) {
      const availablePaths = getLayerPaths(layer);
      
      // Try to find similar paths for suggestions
      const suggestions = availablePaths.slice(0, 10);
      
      // Check if user used wrong format
      const shortName = extractShortName(fileId);
      let hint = '';
      if (shortName) {
        hint = `Did you mean "${layer}/${shortName}"? Use short names, not full file IDs.`;
      }
      
      return res.status(404).json({
        error: true,
        code: 'NOT_FOUND',
        message: `Path not found: ${pathString}`,
        hint: hint || 'Use short names like "COPYWRITER", not "USE_CASE_04_COPYWRITER"',
        suggestions,
        available_in_layer: availablePaths
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
      const availableSections = getAvailableSections(content);
      const extracted = extractSection(content, sectionPath);
      
      if (extracted === null || extracted === undefined) {
        return res.status(404).json({
          error: true,
          code: 'SECTION_NOT_FOUND',
          message: `Section not found: ${sectionPath}`,
          available_sections: availableSections
        });
      }
      content = extracted;
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
      } else {
        // Client not found - add warning
        response.client_warning = `Client '${clientId}' not found`;
        response.available_clients = getAvailableClients();
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
