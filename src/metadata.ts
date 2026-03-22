import { DocumentMetadata } from './types';

/**
 * Average reading speed in words per minute.
 */
const WORDS_PER_MINUTE = 200;

/**
 * Extract metadata from converted markdown content.
 *
 * Computes:
 * - Word count
 * - Heading count
 * - Image count
 * - Estimated reading time in minutes
 *
 * @param markdown - The converted markdown string
 * @returns Metadata extracted from the markdown
 */
export function extractMetadata(markdown: string): Pick<
  DocumentMetadata,
  'wordCount' | 'headingCount' | 'imageCount' | 'readingTimeMinutes'
> {
  const wordCount = countWords(markdown);
  const headingCount = countHeadings(markdown);
  const imageCount = countImages(markdown);
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  return {
    wordCount,
    headingCount,
    imageCount,
    readingTimeMinutes,
  };
}

/**
 * Count the number of words in a markdown string.
 * Strips markdown syntax before counting.
 */
function countWords(markdown: string): number {
  // Remove code blocks
  let text = markdown.replace(/```[\s\S]*?```/g, '');

  // Remove inline code
  text = text.replace(/`[^`]+`/g, '');

  // Remove image references
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

  // Remove link syntax but keep text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Remove heading markers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove blockquote markers
  text = text.replace(/^>\s*/gm, '');

  // Remove horizontal rules
  text = text.replace(/^---+\s*$/gm, '');

  // Remove emphasis markers
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Remove table syntax
  text = text.replace(/\|/g, ' ');
  text = text.replace(/^[-:| ]+$/gm, '');

  // Count words by splitting on whitespace
  const words = text.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

/**
 * Count the number of headings in a markdown string.
 */
function countHeadings(markdown: string): number {
  const headingPattern = /^#{1,6}\s+.+$/gm;
  const matches = markdown.match(headingPattern);
  return matches ? matches.length : 0;
}

/**
 * Count the number of images in a markdown string.
 */
function countImages(markdown: string): number {
  const imagePattern = /!\[[^\]]*\]\([^)]*\)/g;
  const matches = markdown.match(imagePattern);
  return matches ? matches.length : 0;
}
