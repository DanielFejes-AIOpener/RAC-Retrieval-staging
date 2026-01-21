import { findFileByPath, loadFile } from './loader';

/**
 * Apply inheritance (extends) by merging base template with child
 * 
 * @param content - The file content that may have an "extends" field
 * @param layer - The layer name (e.g., "USE_CASE", "OPS")
 * @returns Merged content with base template applied
 */
export function applyInheritance(content: any, layer: string): any {
  if (!content || typeof content !== 'object') {
    return content;
  }

  // Check for extends field
  const extendsValue = content.extends;
  
  if (!extendsValue || typeof extendsValue !== 'string') {
    return content;
  }

  // Parse the extends value
  // Format: "USE_CASE_00_BASE_TEMPLATE" or just "BASE_TEMPLATE"
  let baseFileId = extendsValue.replace(/^["']|["']$/g, ''); // Remove quotes if present
  
  // Extract the short name if full ID provided
  const shortMatch = baseFileId.match(/^[A-Z_]+_\d+_(.+)$/);
  if (shortMatch) {
    baseFileId = shortMatch[1];
  }

  // Find and load the base template
  const baseFilePath = findFileByPath(layer, baseFileId);
  
  if (!baseFilePath) {
    console.warn(`Base template not found for extends: ${extendsValue}`);
    return content;
  }

  const baseContent = loadFile(baseFilePath);
  
  if (!baseContent) {
    console.warn(`Could not load base template: ${baseFilePath}`);
    return content;
  }

  // Deep merge: child wins
  const merged = deepMerge(baseContent, content);
  
  // Remove the extends field from result
  delete merged.extends;
  
  return merged;
}

/**
 * Deep merge two objects. Values from 'override' take precedence.
 * Arrays are replaced, not concatenated.
 * 
 * @param base - The base object
 * @param override - The overriding object
 * @returns Merged object
 */
export function deepMerge(base: any, override: any): any {
  // Handle null/undefined
  if (override === null || override === undefined) {
    return base;
  }
  if (base === null || base === undefined) {
    return override;
  }

  // If either is not an object, override wins
  if (typeof base !== 'object' || typeof override !== 'object') {
    return override;
  }

  // If arrays, override replaces
  if (Array.isArray(base) || Array.isArray(override)) {
    return override;
  }

  // Deep merge objects
  const result: Record<string, any> = { ...base };
  
  for (const [key, value] of Object.entries(override)) {
    if (key in result && typeof result[key] === 'object' && typeof value === 'object' 
        && !Array.isArray(result[key]) && !Array.isArray(value)) {
      // Recursively merge objects
      result[key] = deepMerge(result[key], value);
    } else {
      // Override
      result[key] = value;
    }
  }
  
  return result;
}
