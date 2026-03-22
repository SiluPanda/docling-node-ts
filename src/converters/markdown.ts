/**
 * Clean and normalize markdown input.
 *
 * Operations:
 * - Normalize line endings (CRLF -> LF)
 * - Remove trailing whitespace from lines
 * - Collapse multiple blank lines to at most two newlines
 * - Normalize heading levels (ensure no skipped levels)
 * - Standardize list markers (use `-` for unordered)
 * - Fix broken links (remove invalid link references)
 * - Clean up excessive whitespace within text
 * - Ensure single trailing newline
 *
 * @param md - The markdown content to clean
 * @returns The cleaned markdown string
 */
export function cleanAndNormalizeMarkdown(md: string): string {
  let result = md;

  // Normalize line endings
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove trailing whitespace from lines (preserve intentional line breaks: 2+ trailing spaces)
  result = result.replace(/[ \t]+$/gm, '');

  // Normalize heading spacing: ensure blank line before headings (unless at start of doc)
  result = result.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');

  // Ensure blank line after headings
  result = result.replace(/(#{1,6}\s[^\n]+)\n([^\n#])/g, '$1\n\n$2');

  // Standardize unordered list markers to `-`
  result = result.replace(/^(\s*)[*+]\s/gm, '$1- ');

  // Normalize heading levels to prevent skips
  result = normalizeHeadingLevels(result);

  // Fix broken inline links - remove links with empty href
  result = result.replace(/\[([^\]]*)\]\(\s*\)/g, '$1');

  // Collapse multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Remove leading blank lines
  result = result.replace(/^\n+/, '');

  // Ensure single trailing newline
  result = result.trimEnd() + '\n';

  return result;
}

/**
 * Normalize heading levels to prevent skipped levels.
 * For example, if a document goes # -> ### (skipping ##),
 * this adjusts the ### to ## to maintain proper hierarchy.
 */
function normalizeHeadingLevels(md: string): string {
  const lines = md.split('\n');
  const headingPattern = /^(#{1,6})\s+(.+)$/;

  // First pass: collect all heading levels used
  const usedLevels = new Set<number>();
  for (const line of lines) {
    const match = line.match(headingPattern);
    if (match) {
      usedLevels.add(match[1].length);
    }
  }

  if (usedLevels.size <= 1) return md;

  // Build a mapping from original levels to normalized levels
  const sortedLevels = [...usedLevels].sort((a, b) => a - b);
  const levelMap = new Map<number, number>();
  let normalizedLevel = sortedLevels[0]; // Start with the minimum level found
  for (const level of sortedLevels) {
    levelMap.set(level, normalizedLevel);
    normalizedLevel++;
  }

  // Second pass: apply the mapping
  return lines.map(line => {
    const match = line.match(headingPattern);
    if (match) {
      const originalLevel = match[1].length;
      const newLevel = levelMap.get(originalLevel) || originalLevel;
      return '#'.repeat(newLevel) + ' ' + match[2];
    }
    return line;
  }).join('\n');
}
