import { InputFormat } from './types';

/**
 * File extension to format mapping.
 */
const EXTENSION_MAP: Record<string, InputFormat> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.pptx': 'pptx',
  '.html': 'html',
  '.htm': 'html',
  '.xhtml': 'html',
  '.txt': 'text',
  '.md': 'markdown',
  '.markdown': 'markdown',
};

/**
 * Detect the input format from a file name extension.
 */
function detectFromExtension(fileName: string): InputFormat | null {
  const lower = fileName.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return null;
  const ext = lower.slice(dotIndex);
  return EXTENSION_MAP[ext] ?? null;
}

/**
 * Detect the input format from magic bytes at the start of a buffer.
 */
function detectFromMagicBytes(input: Buffer): InputFormat | null {
  if (input.length < 4) return null;

  // PDF: starts with %PDF
  if (input[0] === 0x25 && input[1] === 0x50 && input[2] === 0x44 && input[3] === 0x46) {
    return 'pdf';
  }

  // ZIP-based formats (DOCX, PPTX): starts with PK\x03\x04
  if (input[0] === 0x50 && input[1] === 0x4b && input[2] === 0x03 && input[3] === 0x04) {
    // Look for content type hints in the raw bytes
    const content = input.toString('latin1', 0, Math.min(input.length, 4096));
    if (content.includes('word/')) {
      return 'docx';
    }
    if (content.includes('ppt/')) {
      return 'pptx';
    }
    // Default ZIP to docx as it's more common
    return 'docx';
  }

  return null;
}

/**
 * Detect the input format from content analysis (HTML tags, markdown patterns).
 */
function detectFromContent(input: string): InputFormat {
  const trimmed = input.trimStart();

  // Check for HTML indicators
  if (/^<!doctype\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return 'html';
  }

  // Check for HTML tags indicating HTML content
  const htmlTagPattern = /<(div|p|span|table|tr|td|th|ul|ol|li|h[1-6]|head|body|meta|link|script|style|article|section|nav|header|footer|main|a\s|img\s|br\s*\/?>)[^>]*>/i;
  if (htmlTagPattern.test(trimmed)) {
    // Count HTML tags (opening and closing) - if there are several, it's likely HTML
    const tagMatches = trimmed.match(/<\/?[a-zA-Z][^>]*>/g);
    if (tagMatches && tagMatches.length >= 3) {
      return 'html';
    }
  }

  // Check for markdown patterns
  let markdownScore = 0;

  // ATX headings
  if (/^#{1,6}\s+/m.test(trimmed)) markdownScore += 2;
  // Bold/italic
  if (/\*\*[^*]+\*\*/.test(trimmed) || /\*[^*]+\*/.test(trimmed)) markdownScore += 1;
  // Links
  if (/\[[^\]]+\]\([^)]+\)/.test(trimmed)) markdownScore += 2;
  // Images
  if (/!\[[^\]]*\]\([^)]+\)/.test(trimmed)) markdownScore += 2;
  // Unordered lists
  if (/^[-*+]\s+/m.test(trimmed)) markdownScore += 1;
  // Ordered lists
  if (/^\d+\.\s+/m.test(trimmed)) markdownScore += 1;
  // Code blocks
  if (/^```/m.test(trimmed)) markdownScore += 2;
  // Horizontal rules
  if (/^---+\s*$/m.test(trimmed) || /^\*\*\*+\s*$/m.test(trimmed)) markdownScore += 1;
  // Blockquotes
  if (/^>\s+/m.test(trimmed)) markdownScore += 1;

  if (markdownScore >= 2) {
    return 'markdown';
  }

  return 'text';
}

/**
 * Detect the format of the input document.
 *
 * Detection priority:
 * 1. Explicit format in options
 * 2. File extension from fileName
 * 3. Magic bytes (for Buffer inputs)
 * 4. Content analysis (HTML tags, markdown patterns)
 * 5. Default to plain text
 *
 * @param input - The document content as a string or Buffer
 * @param fileName - Optional file name hint for extension-based detection
 * @returns The detected input format
 */
export function detectFormat(input: string | Buffer, fileName?: string): InputFormat {
  // Try file extension first
  if (fileName) {
    const fromExt = detectFromExtension(fileName);
    if (fromExt) return fromExt;
  }

  // Try magic bytes for Buffer input
  if (Buffer.isBuffer(input)) {
    const fromBytes = detectFromMagicBytes(input);
    if (fromBytes) return fromBytes;

    // Fall back to content analysis on the string representation
    const str = input.toString('utf-8');
    return detectFromContent(str);
  }

  // Content analysis for string input
  return detectFromContent(input);
}
