import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Data directory - relative to project root
const DATA_DIR = path.join(process.cwd(), 'data');

// Layers that can have client-specific overrides
// Other layers (LOGIC, OPS, USE_CASE, WORKFLOW) are always shared
const CLIENT_OVERRIDE_LAYERS = ['CLIENT', 'CONFIG', 'ORG', 'PACK', 'ROLE', 'LIBRARY'];

// File index cache
let fileIndex: Record<string, string> | null = null;

/**
 * Build the file index mapping clean IDs to file paths
 */
export function buildFileIndex(): Record<string, string> {
  const index: Record<string, string> = {};
  const layers = ['CONFIG', 'CLIENT', 'LOGIC', 'OPS', 'ORG', 'PACK', 'ROLE', 'USE_CASE', 'WORKFLOW', 'LIBRARY'];
  
  // Index shared files from data/{LAYER}/
  for (const layer of layers) {
    const layerPath = path.join(DATA_DIR, layer);
    if (!fs.existsSync(layerPath)) continue;
    
    const files = fs.readdirSync(layerPath).filter(f => f.endsWith('.yaml'));
    
    for (const file of files) {
      // Extract clean ID: remove UUID prefix
      // Format: {UUID}_{LAYER}_{NN}_{NAME}.yaml
      const match = file.match(/^[a-f0-9-]+_(.+)\.yaml$/);
      if (match) {
        const cleanId = match[1]; // e.g., "USE_CASE_04_COPYWRITER"
        const fullPath = path.join(layerPath, file);
        index[cleanId] = fullPath;
        
        // Also index by short name for path-based lookup
        // e.g., "COPYWRITER" -> full path
        const shortMatch = cleanId.match(/^[A-Z_]+_\d+_(.+)$/);
        if (shortMatch) {
          const shortName = shortMatch[1];
          const layerKey = `${layer}:${shortName}`;
          if (!index[layerKey]) {
            index[layerKey] = fullPath;
          }
        }
      }
    }
  }
  
  // Index client-specific files from data/clients/{slug}/{LAYER}/
  const clientsDir = path.join(DATA_DIR, 'clients');
  if (fs.existsSync(clientsDir)) {
    const clientSlugs = fs.readdirSync(clientsDir).filter(f => {
      const stat = fs.statSync(path.join(clientsDir, f));
      return stat.isDirectory();
    });
    
    for (const clientSlug of clientSlugs) {
      for (const layer of CLIENT_OVERRIDE_LAYERS) {
        const clientLayerPath = path.join(clientsDir, clientSlug, layer);
        if (!fs.existsSync(clientLayerPath)) continue;
        
        const files = fs.readdirSync(clientLayerPath).filter(f => f.endsWith('.yaml'));
        
        for (const file of files) {
          const match = file.match(/^[a-f0-9-]+_(.+)\.yaml$/);
          if (match) {
            const cleanId = match[1];
            const fullPath = path.join(clientLayerPath, file);
            
            // Index with client prefix: clients:{slug}:{layer}:{shortName}
            const shortMatch = cleanId.match(/^[A-Z_]+_\d+_(.+)$/);
            if (shortMatch) {
              const shortName = shortMatch[1];
              const clientKey = `clients:${clientSlug}:${layer}:${shortName}`;
              index[clientKey] = fullPath;
            }
            
            // Also index by full clean ID with client prefix
            const clientCleanKey = `clients:${clientSlug}:${cleanId}`;
            index[clientCleanKey] = fullPath;
          }
        }
      }
    }
  }
  
  return index;
}

/**
 * Get the file index (cached)
 */
export function getFileIndex(): Record<string, string> {
  if (!fileIndex) {
    fileIndex = buildFileIndex();
  }
  return fileIndex;
}

/**
 * Clear the file index cache (useful for testing)
 */
export function clearFileIndexCache(): void {
  fileIndex = null;
}

/**
 * Find a file by layer and file ID (short name)
 */
export function findFileByPath(layer: string, fileId: string): string | null {
  const index = getFileIndex();
  
  // Try layer:shortName key first
  const layerKey = `${layer}:${fileId}`;
  if (index[layerKey]) {
    return index[layerKey];
  }
  
  // Try finding by scanning for matches
  for (const [key, filePath] of Object.entries(index)) {
    // Match patterns like "USE_CASE_04_COPYWRITER" when looking for "COPYWRITER"
    if (filePath.includes(`/${layer}/`) && key.endsWith(`_${fileId}`)) {
      return filePath;
    }
    // Also check if key contains the layer and ends with fileId
    if (key.includes(`${layer}_`) && key.endsWith(`_${fileId}`)) {
      return filePath;
    }
  }
  
  // Special case for CONFIG
  if (layer === 'CONFIG') {
    for (const [key, filePath] of Object.entries(index)) {
      if (key.startsWith('CONFIG_')) {
        return filePath;
      }
    }
  }
  
  return null;
}

/**
 * Find a file by layer and file ID, with client-specific override support.
 * For layers in CLIENT_OVERRIDE_LAYERS, checks client folder first, then falls back to shared.
 * For other layers (LOGIC, OPS, USE_CASE, WORKFLOW), always returns shared version.
 */
export function findFileByPathForClient(
  layer: string,
  fileId: string,
  clientSlug?: string
): string | null {
  const index = getFileIndex();
  
  // For layers that support overrides, check client folder first
  if (clientSlug && CLIENT_OVERRIDE_LAYERS.includes(layer)) {
    // Try client-specific key: clients:{slug}:{layer}:{shortName}
    const clientKey = `clients:${clientSlug}:${layer}:${fileId}`;
    if (index[clientKey]) {
      return index[clientKey];
    }
    
    // Try scanning for client-specific matches
    for (const [key, filePath] of Object.entries(index)) {
      if (key.startsWith(`clients:${clientSlug}:`) && 
          filePath.includes(`/${layer}/`) && 
          key.endsWith(`:${fileId}`)) {
        return filePath;
      }
      // Also match by clean ID pattern
      if (key.startsWith(`clients:${clientSlug}:${layer}_`) && 
          key.endsWith(`_${fileId}`)) {
        return filePath;
      }
    }
  }
  
  // Fall back to shared file
  return findFileByPath(layer, fileId);
}

/**
 * Find a file by its full clean ID
 */
export function findFileById(fileId: string): string | null {
  const index = getFileIndex();
  
  // Exact match
  if (index[fileId]) {
    return index[fileId];
  }
  
  // Partial match
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes(fileId)) {
      return filePath;
    }
  }
  
  return null;
}

/**
 * Load and parse a YAML file
 */
export function loadFile(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.parse(content);
  } catch (error) {
    console.error(`Error loading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Get list of available client IDs
 */
export function getAvailableClients(): string[] {
  const index = getFileIndex();
  const clients: string[] = [];
  
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes('CLIENT') && !key.includes('BASE_TEMPLATE')) {
      const content = loadFile(filePath);
      if (content?.meta?.client_id) {
        clients.push(content.meta.client_id);
      }
    }
  }
  
  return clients;
}
