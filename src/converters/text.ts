/**
 * Convert plain text to markdown.
 *
 * Detects and converts:
 * - Paragraph breaks (double newlines)
 * - Potential headings (ALL CAPS lines, underlined lines)
 * - Lists (lines starting with -, *, +, or sequential numbers)
 * - Preserves text structure and reading order
 *
 * @param text - The plain text content to convert
 * @returns The converted markdown string
 */
export function convertTextToMarkdown(text: string): string {
  // Normalize line endings
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove trailing whitespace from lines
  normalized = normalized.replace(/[ \t]+$/gm, '');

  const lines = normalized.split('\n');
  const outputLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

    // Skip blank lines (they become paragraph separators)
    if (line.trim() === '') {
      outputLines.push('');
      i++;
      continue;
    }

    // Check for setext-style heading (underlined with === or ---)
    if (nextLine && /^={3,}\s*$/.test(nextLine)) {
      outputLines.push(`# ${line.trim()}`);
      i += 2;
      continue;
    }

    if (nextLine && /^-{3,}\s*$/.test(nextLine) && line.trim().length > 0) {
      outputLines.push(`## ${line.trim()}`);
      i += 2;
      continue;
    }

    // Check for ALL CAPS heading
    // Must be a short line (< 80 chars), all uppercase letters, not a list item
    const trimmedLine = line.trim();
    if (
      trimmedLine.length > 1 &&
      trimmedLine.length < 80 &&
      trimmedLine === trimmedLine.toUpperCase() &&
      /[A-Z]/.test(trimmedLine) &&
      !/^[-*+\d]/.test(trimmedLine) &&
      // Avoid treating ALL CAPS sentences as headings - they should be short
      trimmedLine.split(/\s+/).length <= 10
    ) {
      // Check surrounding context - headings typically have blank lines around them
      const prevLine = i > 0 ? lines[i - 1] : '';
      if (prevLine.trim() === '' || i === 0) {
        outputLines.push(`## ${trimmedLine}`);
        i++;
        continue;
      }
    }

    // Check for list items (unordered)
    if (/^\s*[-*+]\s+/.test(line)) {
      outputLines.push(line.replace(/^\s*[*+]\s+/, (match) => match.replace(/[*+]/, '-')));
      i++;
      continue;
    }

    // Check for list items (ordered)
    if (/^\s*\d+[.)]\s+/.test(line)) {
      outputLines.push(line.replace(/^\s*(\d+)[.)]\s+/, '$1. '));
      i++;
      continue;
    }

    // Regular text line
    outputLines.push(line);
    i++;
  }

  let result = outputLines.join('\n');

  // Collapse multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Remove leading blank lines
  result = result.replace(/^\n+/, '');

  // Ensure single trailing newline
  result = result.trimEnd() + '\n';

  return result;
}
