/**
 * Strip the 'meta' section from an object
 * 
 * @param obj - The object to strip meta from
 * @returns Object without the meta key
 */
export function stripMeta(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (key !== 'meta') {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Extract a section from an object by dot-notation path
 * 
 * @param obj - The object to extract from
 * @param sectionPath - Dot-notation path, e.g., "prohibitions" or "critical_functions.write_content"
 * @returns The value at the path, or null if not found
 */
export function extractSection(obj: any, sectionPath: string): any {
  if (!obj || !sectionPath) {
    return obj;
  }

  const parts = sectionPath.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }
    
    // Handle array index notation like "phases[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      current = current[arrayName];
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return null;
      }
    } else {
      current = current[part];
    }
  }
  
  return current;
}

/**
 * Get suggestions for a failed path lookup
 * 
 * @param layer - The layer being searched
 * @param index - The file index
 * @param maxSuggestions - Maximum number of suggestions to return
 * @returns Array of suggestion strings
 */
export function getSuggestions(
  layer: string, 
  index: Record<string, string>, 
  maxSuggestions: number = 5
): string[] {
  const suggestions: string[] = [];
  
  for (const [key, filePath] of Object.entries(index)) {
    if (filePath.includes(`/${layer}/`)) {
      // Extract short name from key
      const match = key.match(/_\d+_(.+)$/);
      if (match) {
        suggestions.push(`${layer}/${match[1]}`);
        if (suggestions.length >= maxSuggestions) break;
      }
    }
  }
  
  return suggestions;
}
