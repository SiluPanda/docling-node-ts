import { ConversionResult, ConvertOptions, InputFormat } from './types';
import { detectFormat } from './detect';
import { convertHtmlToMarkdown, extractHtmlMetadata } from './converters/html';
import { cleanAndNormalizeMarkdown } from './converters/markdown';
import { convertTextToMarkdown } from './converters/text';
import { handleBinaryFormat } from './converters/binary';
import { extractMetadata } from './metadata';

/**
 * Convert a document to clean, structured markdown.
 *
 * Accepts a string or Buffer input, auto-detects the format (or uses the
 * explicit format from options), routes to the appropriate converter, extracts
 * metadata, and returns a ConversionResult.
 *
 * Supported formats:
 * - HTML: Full conversion with heading, list, table, code block support
 * - Markdown: Cleaning and normalization
 * - Text: Structure detection and markdown wrapping
 * - PDF/DOCX/PPTX: Informative message about required external packages
 *
 * @param input - The document content as a string or Buffer
 * @param options - Conversion options
 * @returns The conversion result with markdown, metadata, images, and warnings
 */
export function convert(
  input: string | Buffer,
  options: ConvertOptions = {}
): ConversionResult {
  const startTime = Date.now();
  const warnings: string[] = [];

  // Detect format
  const format: InputFormat = options.format || detectFormat(input, options.fileName);

  // Handle binary formats
  if (format === 'pdf' || format === 'docx' || format === 'pptx') {
    return handleBinaryFormat(format);
  }

  // Convert Buffer to string for text-based formats
  const content = Buffer.isBuffer(input) ? input.toString('utf-8') : input;

  let markdown: string;
  let images: { id: string; alt: string; src: string; page?: number }[] = [];
  let title: string | undefined;
  let author: string | undefined;
  let date: string | undefined;

  switch (format) {
    case 'html': {
      // Extract metadata from HTML head
      const htmlMeta = extractHtmlMetadata(content);
      title = htmlMeta.title;
      author = htmlMeta.author;
      date = htmlMeta.date;

      // Convert HTML to markdown
      const result = convertHtmlToMarkdown(content);
      markdown = result.markdown;
      images = result.images;
      break;
    }

    case 'markdown': {
      markdown = cleanAndNormalizeMarkdown(content);
      break;
    }

    case 'text': {
      markdown = convertTextToMarkdown(content);
      break;
    }

    default: {
      warnings.push(`Unexpected format: ${format}. Treating as plain text.`);
      markdown = convertTextToMarkdown(content);
      break;
    }
  }

  // Apply structure preservation options
  if (options.preserveStructure === false) {
    // Strip all markdown formatting if structure preservation is disabled
    markdown = stripMarkdownFormatting(markdown);
  }

  // Filter images if extraction is disabled
  if (options.extractImages === false) {
    images = [];
  }

  // Extract metadata from the converted markdown
  const contentMeta = extractMetadata(markdown);

  const durationMs = Date.now() - startTime;

  return {
    markdown,
    metadata: {
      title,
      author,
      date,
      wordCount: contentMeta.wordCount,
      headingCount: contentMeta.headingCount,
      imageCount: contentMeta.imageCount,
      readingTimeMinutes: contentMeta.readingTimeMinutes,
    },
    images,
    pages: [],
    warnings,
    durationMs,
  };
}

/**
 * Strip markdown formatting, leaving only plain text.
 */
function stripMarkdownFormatting(md: string): string {
  let text = md;

  // Remove headings markers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  text = text.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');

  // Remove strikethrough
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // Convert links to just text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Remove images
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

  // Remove blockquote markers
  text = text.replace(/^>\s*/gm, '');

  // Remove list markers
  text = text.replace(/^(\s*)[-*+]\s+/gm, '$1');
  text = text.replace(/^(\s*)\d+\.\s+/gm, '$1');

  // Remove horizontal rules
  text = text.replace(/^---+\s*$/gm, '');

  // Clean up
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trimEnd() + '\n';

  return text;
}

/**
 * Convert HTML content to markdown.
 * Convenience function that calls convert() with format set to 'html'.
 *
 * @param html - The HTML content to convert
 * @returns The conversion result
 */
export function convertHtml(html: string): ConversionResult {
  return convert(html, { format: 'html' });
}

/**
 * Clean and normalize markdown content.
 * Convenience function that calls convert() with format set to 'markdown'.
 *
 * @param md - The markdown content to clean
 * @returns The conversion result
 */
export function convertMarkdown(md: string): ConversionResult {
  return convert(md, { format: 'markdown' });
}

/**
 * Convert plain text to markdown.
 * Convenience function that calls convert() with format set to 'text'.
 *
 * @param text - The plain text to convert
 * @returns The conversion result
 */
export function convertText(text: string): ConversionResult {
  return convert(text, { format: 'text' });
}
