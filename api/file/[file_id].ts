import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadFile, getFileIndex } from '../../lib/loader';
import { extractSection } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, code: 'METHOD_NOT_ALLOWED', message: 'Only GET allowed' });
  }

  const fileId = req.query.file_id as string;
  const section = req.query.section as string;

  if (!fileId) {
    return res.status(400).json({
      error: true,
      code: 'FILE_ID_REQUIRED',
      message: 'file_id is required'
    });
  }

  try {
    const index = getFileIndex();
    
    // Find the file path
    let filePath: string | null = null;
    
    for (const [key, path] of Object.entries(index)) {
      if (key === fileId || key.includes(fileId)) {
        filePath = path;
        break;
      }
    }
    
    if (!filePath) {
      const suggestions = Object.keys(index)
        .filter(k => k.toLowerCase().includes(fileId.toLowerCase().split('_').pop() || ''))
        .slice(0, 5);
      
      return res.status(200).json({
        error: true,
        code: 'NOT_FOUND',
        message: `File not found: ${fileId}`,
        suggestions
      });
    }

    // Load raw file (no resolution)
    let content = loadFile(filePath);
    
    if (!content) {
      return res.status(500).json({
        error: true,
        code: 'LOAD_ERROR',
        message: `Failed to load file: ${filePath}`
      });
    }

    // Extract section if specified
    if (section) {
      content = extractSection(content, section);
      if (content === null || content === undefined) {
        return res.status(200).json({
          error: true,
          code: 'SECTION_NOT_FOUND',
          message: `Section not found: ${section}`
        });
      }
    }

    return res.status(200).json({
      file_id: fileId,
      raw: true,
      content
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({
      error: true,
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
