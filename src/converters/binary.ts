import { InputFormat, ConversionResult, DocumentMetadata } from '../types';

/**
 * Suggested packages for handling binary document formats.
 */
const BINARY_FORMAT_SUGGESTIONS: Record<string, { packages: string[]; description: string }> = {
  pdf: {
    packages: ['pdfjs-dist', 'pdf-parse', 'pdf2json'],
    description: 'PDF parsing requires an external library to extract text from the binary format.',
  },
  docx: {
    packages: ['mammoth', 'jszip'],
    description: 'DOCX parsing requires an external library to unzip and parse Office Open XML.',
  },
  pptx: {
    packages: ['jszip', 'pptx-parser'],
    description: 'PPTX parsing requires an external library to unzip and parse Office Open XML.',
  },
};

/**
 * Handle binary document formats (PDF, DOCX, PPTX) by returning an informative
 * message that binary parsing requires external tools.
 *
 * This is the zero-dependency fallback. The package does not include binary
 * parsers to keep the dependency tree clean. Users who need binary format
 * support should install the suggested packages.
 *
 * @param format - The detected binary format
 * @returns A ConversionResult with an informative markdown message
 */
export function handleBinaryFormat(format: InputFormat): ConversionResult {
  const suggestion = BINARY_FORMAT_SUGGESTIONS[format];
  const startTime = Date.now();

  if (!suggestion) {
    return {
      markdown: `> **Unsupported format:** \`${format}\` is not supported.\n`,
      metadata: createEmptyMetadata(),
      images: [],
      pages: [],
      warnings: [`Unsupported binary format: ${format}`],
      durationMs: Date.now() - startTime,
    };
  }

  const suggestedList = suggestion.packages.map(p => `\`${p}\``).join(', ');

  const markdown = [
    `> **Binary format detected:** \`${format.toUpperCase()}\``,
    '>',
    `> ${suggestion.description}`,
    '>',
    '> This package provides zero-dependency document-to-markdown conversion for text-based formats (HTML, Markdown, plain text).',
    `> For \`${format.toUpperCase()}\` support, consider installing: ${suggestedList}`,
    '>',
    '> Example with suggested package:',
    '>',
    format === 'pdf'
      ? '> ```js\n> import pdf from \'pdf-parse\';\n> const data = await pdf(buffer);\n> console.log(data.text);\n> ```'
      : format === 'docx'
        ? '> ```js\n> import mammoth from \'mammoth\';\n> const result = await mammoth.convertToHtml({ buffer });\n> console.log(result.value);\n> ```'
        : '> ```js\n> import JSZip from \'jszip\';\n> const zip = await JSZip.loadAsync(buffer);\n> // Parse slide XML files\n> ```',
    '',
  ].join('\n');

  return {
    markdown,
    metadata: createEmptyMetadata(),
    images: [],
    pages: [],
    warnings: [
      `Binary format "${format}" detected. Install a dedicated parser for full support.`,
      `Suggested packages: ${suggestedList}`,
    ],
    durationMs: Date.now() - startTime,
  };
}

/**
 * Create an empty metadata object for binary format placeholders.
 */
function createEmptyMetadata(): DocumentMetadata {
  return {
    wordCount: 0,
    headingCount: 0,
    imageCount: 0,
    readingTimeMinutes: 0,
  };
}
