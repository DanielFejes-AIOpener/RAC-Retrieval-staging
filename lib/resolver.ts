import { findFileById, loadFile } from './loader';

const MAX_RECURSION_DEPTH = 10;

/**
 * Resolve all $ref pointers in an object
 * 
 * Format: "$ref: FILE_ID#path.to.section"
 * 
 * @param obj - The object to resolve refs in
 * @param depth - Current recursion depth (to prevent infinite loops)
 * @returns Object with all refs resolved
 */
export function resolveRefs(obj: any, depth: number = 0): any {
  if (depth > MAX_RECURSION_DEPTH) {
    console.warn('Max recursion depth reached in resolveRefs');
    return obj;
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle $ref strings
  if (typeof obj === 'string' && obj.startsWith('$ref:')) {
    return resolveRef(obj, depth);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item, depth));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveRefs(value, depth);
    }
    return result;
  }

  // Return primitives as-is
  return obj;
}

/**
 * Resolve a single $ref string
 * 
 * @param refString - The $ref string, e.g., "$ref: LOGIC_08_QUALITY_GATES#evidence_tiers"
 * @param depth - Current recursion depth
 * @returns The resolved content
 */
function resolveRef(refString: string, depth: number): any {
  // Parse: "$ref: FILE_ID#path.to.section" or "$ref: FILE_ID"
  const refContent = refString.replace(/^\$ref:\s*/, '').trim();
  const [fileRef, sectionPath] = refContent.split('#');
  
  if (!fileRef) {
    console.warn(`Invalid $ref format: ${refString}`);
    return refString;
  }

  // Find the file
  const filePath = findFileById(fileRef.trim());
  
  if (!filePath) {
    console.warn(`Could not resolve $ref - file not found: ${fileRef}`);
    return refString; // Return original if can't resolve
  }

  // Load the file
  let content = loadFile(filePath);
  
  if (!content) {
    console.warn(`Could not load file for $ref: ${fileRef}`);
    return refString;
  }

  // Extract section if specified
  if (sectionPath) {
    content = extractByPath(content, sectionPath.trim());
    if (content === undefined) {
      console.warn(`Section not found in $ref: ${refString}`);
      return refString;
    }
  }

  // Recursively resolve any nested refs
  return resolveRefs(content, depth + 1);
}

/**
 * Extract a value from an object by dot-notation path
 * 
 * @param obj - The object to extract from
 * @param path - Dot-notation path, e.g., "evidence_tiers" or "universal_gates.entry"
 * @returns The value at the path, or undefined if not found
 */
function extractByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}
