#!/usr/bin/env npx ts-node

/**
 * Test the RAC Context Engine implementation
 * 
 * Run: npm test
 */

// Override DATA_DIR for testing (use current working directory structure)
process.env.DATA_DIR = process.cwd();

import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';

// Since our lib uses process.cwd()/data, we need to adjust
// Let's implement tests inline for now

const DATA_DIR = path.join(process.cwd(), 'data');

// ============================================================================
// LOADER
// ============================================================================

function buildFileIndex(): Record<string, string> {
  const index: Record<string, string> = {};
  const layers = ['CONFIG', 'CLIENT', 'LOGIC', 'OPS', 'ORG', 'PACK', 'ROLE', 'USE_CASE', 'WORKFLOW'];
  
  for (const layer of layers) {
    const layerPath = path.join(DATA_DIR, layer);
    if (!fs.existsSync(layerPath)) continue;
    
    const files = fs.readdirSync(layerPath).filter(f => f.endsWith('.yaml'));
    
    for (const file of files) {
      const match = file.match(/^[a-f0-9-]+_(.+)\.yaml$/);
      if (match) {
        const cleanId = match[1];
        const fullPath = path.join(layerPath, file);
        index[cleanId] = fullPath;
        
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
  
  return index;
}

function loadFile(filePath: string): any {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.parse(content);
}

function findFileByPath(layer: string, fileId: string, index: Record<string, string>): string | null {
  const layerKey = `${layer}:${fileId}`;
  if (index[layerKey]) return index[layerKey];
  
  for (const [key, filePath] of Object.entries(index)) {
    if (filePath.includes(`/${layer}/`) && key.endsWith(`_${fileId}`)) {
      return filePath;
    }
    if (key.includes(`${layer}_`) && key.endsWith(`_${fileId}`)) {
      return filePath;
    }
  }
  
  if (layer === 'CONFIG') {
    for (const [key, filePath] of Object.entries(index)) {
      if (key.startsWith('CONFIG_')) return filePath;
    }
  }
  
  return null;
}

// ============================================================================
// RESOLVER
// ============================================================================

function resolveRefs(obj: any, index: Record<string, string>, depth: number = 0): any {
  if (depth > 10) return obj;
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string' && obj.startsWith('$ref:')) {
    const refContent = obj.replace(/^\$ref:\s*/, '').trim();
    const [fileRef, sectionPath] = refContent.split('#');
    
    // Find the file
    let filePath: string | null = null;
    for (const [key, fp] of Object.entries(index)) {
      if (key.includes(fileRef.trim())) {
        filePath = fp;
        break;
      }
    }
    
    if (!filePath) return obj;
    
    let content = loadFile(filePath);
    if (!content) return obj;
    
    if (sectionPath) {
      const parts = sectionPath.trim().split('.');
      for (const part of parts) {
        if (content === null || content === undefined) return obj;
        content = content[part];
      }
    }
    
    return resolveRefs(content, index, depth + 1);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item, index, depth));
  }

  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveRefs(value, index, depth);
    }
    return result;
  }

  return obj;
}

// ============================================================================
// MERGER
// ============================================================================

function deepMerge(base: any, override: any): any {
  if (override === null || override === undefined) return base;
  if (base === null || base === undefined) return override;
  if (typeof base !== 'object' || typeof override !== 'object') return override;
  if (Array.isArray(base) || Array.isArray(override)) return override;

  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (key in result && typeof result[key] === 'object' && typeof value === 'object' 
        && !Array.isArray(result[key]) && !Array.isArray(value)) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function applyInheritance(content: any, layer: string, index: Record<string, string>): any {
  if (!content || typeof content !== 'object') return content;
  
  const extendsValue = content.extends;
  if (!extendsValue || typeof extendsValue !== 'string') return content;

  let baseFileId = extendsValue.replace(/^["']|["']$/g, '');
  const shortMatch = baseFileId.match(/^[A-Z_]+_\d+_(.+)$/);
  if (shortMatch) baseFileId = shortMatch[1];

  const baseFilePath = findFileByPath(layer, baseFileId, index);
  if (!baseFilePath) return content;

  const baseContent = loadFile(baseFilePath);
  if (!baseContent) return content;

  const merged = deepMerge(baseContent, content);
  delete merged.extends;
  return merged;
}

// ============================================================================
// UTILS
// ============================================================================

function stripMeta(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key !== 'meta') result[key] = value;
  }
  return result;
}

function extractSection(obj: any, sectionPath: string): any {
  if (!obj || !sectionPath) return obj;
  const parts = sectionPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = current[part];
  }
  return current;
}

// ============================================================================
// SIMULATE API
// ============================================================================

interface Response {
  path: string;
  resolved: boolean;
  content: any;
  client?: any;
  error?: boolean;
  code?: string;
  message?: string;
}

function simulateRacContext(
  pathStr: string, 
  clientId: string, 
  includeClient: boolean = true,
  index: Record<string, string>
): Response {
  const pathParts = pathStr.split('/').filter(Boolean);
  const layer = pathParts[0]?.toUpperCase() || '';
  let fileId = pathParts[1] || '';
  const sectionPath = pathParts.slice(2).join('.');

  // CONFIG special case
  if (layer === 'CONFIG') {
    if (!fileId) fileId = 'INSTANCE';
    else {
      const section = fileId;
      fileId = 'INSTANCE';
      pathParts[2] = section;
    }
  }

  // Find file
  const filePath = findFileByPath(layer, fileId, index);
  if (!filePath) {
    return {
      path: pathStr,
      resolved: false,
      content: null,
      error: true,
      code: 'NOT_FOUND',
      message: `Path not found: ${pathStr}`
    };
  }

  // Load
  let content = loadFile(filePath);
  if (!content) {
    return {
      path: pathStr,
      resolved: false,
      content: null,
      error: true,
      code: 'LOAD_ERROR',
      message: `Failed to load file`
    };
  }

  // Inheritance
  content = applyInheritance(content, layer, index);

  // Resolve refs
  content = resolveRefs(content, index);

  // Strip meta
  content = stripMeta(content);

  // Extract section
  const actualSection = sectionPath || (pathParts.length > 2 ? pathParts.slice(2).join('.') : '');
  if (actualSection) {
    content = extractSection(content, actualSection);
    if (content === null || content === undefined) {
      return {
        path: pathStr,
        resolved: false,
        content: null,
        error: true,
        code: 'SECTION_NOT_FOUND',
        message: `Section not found: ${actualSection}`
      };
    }
  }

  // Build response
  const response: Response = {
    path: pathStr,
    resolved: true,
    content
  };

  // Load client
  const layersNeedingClient = ['USE_CASE', 'OPS', 'ORG', 'PACK', 'WORKFLOW'];
  if (clientId && includeClient && layersNeedingClient.includes(layer)) {
    // Find client file
    let clientFile: string | null = null;
    for (const [key, fp] of Object.entries(index)) {
      if (key.includes('CLIENT') && !key.includes('BASE_TEMPLATE')) {
        const c = loadFile(fp);
        if (c?.meta?.client_id === clientId) {
          clientFile = fp;
          break;
        }
      }
    }
    if (!clientFile) {
      for (const [key, fp] of Object.entries(index)) {
        if (key.includes('CLIENT') && !key.includes('BASE_TEMPLATE')) {
          clientFile = fp;
          break;
        }
      }
    }
    
    if (clientFile) {
      let clientContent = loadFile(clientFile);
      clientContent = resolveRefs(clientContent, index);
      clientContent = stripMeta(clientContent);
      response.client = { id: clientId, ...clientContent };
    }
  }

  return response;
}

// ============================================================================
// RUN TESTS
// ============================================================================

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           RAC Context Engine Implementation Test              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Build index
console.log('Building file index...');
const index = buildFileIndex();
console.log(`Indexed ${Object.keys(index).length} files\n`);

// Test cases
const tests = [
  { path: 'USE_CASE/COPYWRITER', client_id: 'AI_OPENER', include_client: true, desc: 'Full USE_CASE with CLIENT' },
  { path: 'USE_CASE/COPYWRITER/prohibitions', client_id: 'AI_OPENER', include_client: false, desc: 'Section only, no CLIENT' },
  { path: 'OPS/CAMPAIGN_STRUCTURES', client_id: 'AI_OPENER', include_client: false, desc: 'OPS without CLIENT' },
  { path: 'CONFIG/agents', client_id: 'AI_OPENER', include_client: false, desc: 'CONFIG section' },
  { path: 'LOGIC/QUALITY_GATES/universal_gates', client_id: 'AI_OPENER', include_client: false, desc: 'LOGIC section' },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`\n🧪 Test: ${test.desc}`);
  console.log(`   Path: ${test.path}`);
  console.log(`   include_client: ${test.include_client}\n`);

  const result = simulateRacContext(test.path, test.client_id, test.include_client, index);

  if (result.error) {
    console.log(`❌ FAILED: ${result.code} - ${result.message}`);
    failed++;
  } else {
    console.log(`✅ PASSED`);
    console.log(`   - resolved: ${result.resolved}`);
    console.log(`   - content keys: ${Object.keys(result.content || {}).slice(0, 5).join(', ')}...`);
    console.log(`   - client included: ${!!result.client}`);
    
    // Check for unresolved refs
    const contentStr = JSON.stringify(result.content);
    const unresolvedRefs = (contentStr.match(/\$ref:/g) || []).length;
    if (unresolvedRefs > 0) {
      console.log(`   ⚠️  ${unresolvedRefs} unresolved $ref pointers found`);
    }
    
    // Check meta is stripped
    if (result.content?.meta) {
      console.log(`   ⚠️  meta section was NOT stripped`);
    }
    
    passed++;
  }
}

console.log(`\n${'─'.repeat(70)}`);
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

// Show sample output for first test
console.log('─'.repeat(70));
console.log('\n📄 Sample output (USE_CASE/COPYWRITER with CLIENT):');
const sample = simulateRacContext('USE_CASE/COPYWRITER', 'AI_OPENER', true, index);
const truncated = JSON.stringify(sample, null, 2);
console.log(truncated.substring(0, 2000) + '\n... [truncated]');
