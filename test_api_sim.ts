#!/usr/bin/env npx ts-node

/**
 * RAC Context API Simulator
 * 
 * Quick test script to simulate what the API would return.
 * Edit the TEST_QUERIES array below to try different queries.
 * 
 * Run: npx ts-node test_api_sim.ts
 * Or:  chmod +x test_api_sim.ts && ./test_api_sim.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATA_DIR = __dirname;

// ============================================================================
// TEST QUERIES - Edit these to test different paths
// ============================================================================

interface TestQuery {
  path: string;
  client_id?: string;
  description?: string;
}

const TEST_QUERIES: TestQuery[] = [
  {
    path: 'OPS/CAMPAIGN_STRUCTURES',
    client_id: 'AI_OPENER',
    description: 'Campaign structure templates and archetypes for AI Opener marketing campaign'
  },
  {
    path: 'ORG/BRAND_POSITIONING',
    client_id: 'AI_OPENER',
    description: 'AI Opener brand positioning, offers, differentiators and proof points'
  },
  {
    path: 'ORG/AUDIENCE_MESSAGING',
    client_id: 'AI_OPENER',
    description: 'Target audiences and messaging framework for AI Opener'
  },
];

// ============================================================================
// FILE INDEX - Maps clean IDs to actual filenames
// ============================================================================

function buildFileIndex(): Record<string, string> {
  const index: Record<string, string> = {};
  const layers = ['CONFIG', 'CLIENT', 'LOGIC', 'OPS', 'ORG', 'PACK', 'ROLE', 'USE_CASE', 'WORKFLOW'];
  
  for (const layer of layers) {
    const layerPath = path.join(DATA_DIR, layer);
    if (!fs.existsSync(layerPath)) continue;
    
    const files = fs.readdirSync(layerPath).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      // Extract clean ID: remove UUID prefix
      const match = file.match(/^[a-f0-9-]+_(.+)\.yaml$/);
      if (match) {
        const cleanId = match[1];
        index[cleanId] = path.join(layerPath, file);
        
        // Also index by short name (e.g., "COPYWRITER" -> "USE_CASE_04_COPYWRITER")
        const shortMatch = cleanId.match(/^[A-Z_]+_\d+_(.+)$/);
        if (shortMatch) {
          const shortName = shortMatch[1];
          // Only add if not already present (first match wins)
          if (!index[`${layer}/${shortName}`]) {
            index[`${layer}/${shortName}`] = path.join(layerPath, file);
          }
        }
      }
    }
  }
  
  return index;
}

// ============================================================================
// YAML LOADER
// ============================================================================

function loadYamlFile(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.parse(content);
}

// ============================================================================
// PATH PARSER
// ============================================================================

interface ParsedPath {
  layer: string;
  fileId: string;
  section?: string;
}

function parsePath(pathStr: string): ParsedPath {
  const parts = pathStr.split('/');
  
  return {
    layer: parts[0],
    fileId: parts[1] || '',
    section: parts.slice(2).join('.') || undefined
  };
}

// ============================================================================
// SECTION EXTRACTOR
// ============================================================================

function extractSection(obj: any, sectionPath: string): any {
  const parts = sectionPath.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = current[part];
  }
  
  return current;
}

// ============================================================================
// FILE FINDER
// ============================================================================

function findFile(layer: string, fileId: string, index: Record<string, string>): string | null {
  // Try exact match with layer prefix
  const patterns = [
    `${layer}/${fileId}`,                    // USE_CASE/COPYWRITER
    `${layer}_${fileId}`,                    // USE_CASE_COPYWRITER (shouldn't happen but just in case)
  ];
  
  // Try to find by iterating through index
  for (const [key, filePath] of Object.entries(index)) {
    // Match "USE_CASE_04_COPYWRITER" when looking for "COPYWRITER"
    if (key.includes(`_${fileId}`) && filePath.includes(`/${layer}/`)) {
      return filePath;
    }
    // Match exact key
    if (patterns.includes(key)) {
      return filePath;
    }
  }
  
  // Try CONFIG layer specially (only one file)
  if (layer === 'CONFIG') {
    for (const [key, filePath] of Object.entries(index)) {
      if (key.startsWith('CONFIG_')) {
        return filePath;
      }
    }
  }
  
  return null;
}

// ============================================================================
// CLIENT FINDER
// ============================================================================

function findClientFile(clientId: string, index: Record<string, string>): string | null {
  // First, try to find by client_id in the actual file content
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes('CLIENT') && !key.includes('BASE_TEMPLATE')) {
      // Load and check client_id field
      const content = loadYamlFile(filePath);
      if (content?.meta?.client_id === clientId) {
        return filePath;
      }
    }
  }
  
  // Fallback: find by filename containing client_id
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes('CLIENT') && key.includes(clientId)) {
      return filePath;
    }
  }
  
  // Last resort: return first non-template CLIENT file
  for (const [key, filePath] of Object.entries(index)) {
    if (key.includes('CLIENT') && !key.includes('BASE_TEMPLATE')) {
      return filePath;
    }
  }
  
  return null;
}

// ============================================================================
// SIMPLE $ref RESOLVER (basic implementation)
// ============================================================================

function resolveRefs(obj: any, index: Record<string, string>, depth = 0): any {
  if (depth > 10) return obj; // Prevent infinite recursion
  
  if (typeof obj === 'string' && obj.startsWith('$ref:')) {
    // Parse: "$ref: FILE_ID#path.to.section"
    const refStr = obj.replace('$ref:', '').trim();
    const [fileRef, sectionPath] = refStr.split('#');
    
    // Find and load the referenced file
    const layer = fileRef.split('_')[0];
    const filePath = findFile(layer, fileRef, index);
    
    if (filePath) {
      let refContent = loadYamlFile(filePath);
      if (sectionPath && refContent) {
        refContent = extractSection(refContent, sectionPath);
      }
      return resolveRefs(refContent, index, depth + 1);
    }
    
    return `[UNRESOLVED: ${obj}]`;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item, index, depth));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveRefs(value, index, depth);
    }
    return result;
  }
  
  return obj;
}

// ============================================================================
// MAIN API SIMULATOR
// ============================================================================

interface ApiResponse {
  path: string;
  resolved: boolean;
  content: any;
  client?: any;
  error?: boolean;
  code?: string;
  message?: string;
  suggestions?: string[];
}

function simulateRacContext(query: TestQuery, index: Record<string, string>): ApiResponse {
  const parsed = parsePath(query.path);
  
  // Special case: CONFIG doesn't need a file ID
  if (parsed.layer === 'CONFIG' && !parsed.fileId) {
    parsed.fileId = 'INSTANCE';
    parsed.section = undefined;
  } else if (parsed.layer === 'CONFIG' && parsed.fileId) {
    // CONFIG/agents -> section is "agents"
    parsed.section = parsed.fileId;
    parsed.fileId = 'INSTANCE';
  }
  
  // Find the main file
  const mainFilePath = findFile(parsed.layer, parsed.fileId, index);
  
  if (!mainFilePath) {
    return {
      path: query.path,
      resolved: false,
      content: null,
      error: true,
      code: 'NOT_FOUND',
      message: `Path not found: ${query.path}`,
      suggestions: getLayerSuggestions(parsed.layer, index)
    };
  }
  
  // Load and resolve the file
  let content = loadYamlFile(mainFilePath);
  
  if (!content) {
    return {
      path: query.path,
      resolved: false,
      content: null,
      error: true,
      code: 'LOAD_ERROR',
      message: `Failed to load: ${mainFilePath}`
    };
  }
  
  // Resolve $ref pointers
  content = resolveRefs(content, index);
  
  // Extract section if specified
  if (parsed.section) {
    content = extractSection(content, parsed.section);
    if (content === null || content === undefined) {
      return {
        path: query.path,
        resolved: false,
        content: null,
        error: true,
        code: 'SECTION_NOT_FOUND',
        message: `Section not found: ${parsed.section}`
      };
    }
  }
  
  // Build response
  const response: ApiResponse = {
    path: query.path,
    resolved: true,
    content: content
  };
  
  // Load CLIENT if provided and layer requires it
  const layersNeedingClient = ['USE_CASE', 'OPS', 'ORG', 'PACK', 'WORKFLOW'];
  
  if (query.client_id && layersNeedingClient.includes(parsed.layer)) {
    const clientFilePath = findClientFile(query.client_id, index);
    if (clientFilePath) {
      let clientContent = loadYamlFile(clientFilePath);
      clientContent = resolveRefs(clientContent, index);
      response.client = {
        id: query.client_id,
        ...clientContent
      };
    }
  }
  
  return response;
}

function getLayerSuggestions(layer: string, index: Record<string, string>): string[] {
  const suggestions: string[] = [];
  for (const [key, filePath] of Object.entries(index)) {
    if (filePath.includes(`/${layer}/`)) {
      const match = key.match(/_(\d+)_(.+)$/);
      if (match) {
        suggestions.push(`${layer}/${match[2]}`);
      }
    }
  }
  return suggestions.slice(0, 5);
}

// ============================================================================
// RUNNER
// ============================================================================

function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           RAC Context API Simulator v0.1                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Build file index
  console.log('Building file index...');
  const index = buildFileIndex();
  console.log(`Indexed ${Object.keys(index).length} files\n`);
  
  // Run test queries
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const query = TEST_QUERIES[i];
    
    console.log('─'.repeat(70));
    console.log(`\n📋 Query ${i + 1}: ${query.description || query.path}`);
    console.log(`   Path: ${query.path}`);
    console.log(`   Client: ${query.client_id || '(none)'}\n`);
    
    const response = simulateRacContext(query, index);
    
    // Pretty print response (full output, no truncation)
    const output = JSON.stringify(response, null, 2);
    console.log(output);
    
    console.log();
  }
  
  console.log('─'.repeat(70));
  console.log('\n✅ Done! Edit TEST_QUERIES in the script to try different paths.\n');
}

// Run if executed directly
main();
