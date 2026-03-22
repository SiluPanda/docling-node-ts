# docling-node-ts

Zero-dependency document-to-markdown conversion for Node.js.

[![npm version](https://img.shields.io/npm/v/docling-node-ts.svg)](https://www.npmjs.com/package/docling-node-ts)
[![npm downloads](https://img.shields.io/npm/dt/docling-node-ts.svg)](https://www.npmjs.com/package/docling-node-ts)
[![license](https://img.shields.io/npm/l/docling-node-ts.svg)](https://github.com/SiluPanda/docling-node-ts/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/docling-node-ts.svg)](https://nodejs.org)

Convert HTML, plain text, and markdown documents into clean, structure-preserving markdown suitable for RAG (Retrieval-Augmented Generation) pipelines, knowledge base construction, and LLM ingestion. Accepts string or Buffer input, auto-detects the format, routes to the appropriate converter, extracts metadata and image references, and returns a typed `ConversionResult`. No external services, no Python runtime, no network calls -- everything runs locally in Node.js.

---

## Installation

```bash
npm install docling-node-ts
```

Requires Node.js 18 or later.

## Quick Start

```typescript
import { convert } from 'docling-node-ts';

// Convert HTML to markdown
const result = convert('<h1>Quarterly Report</h1><p>Revenue grew <strong>15%</strong> year-over-year.</p>');

console.log(result.markdown);
// # Quarterly Report
//
// Revenue grew **15%** year-over-year.

console.log(result.metadata);
// { wordCount: 5, headingCount: 1, imageCount: 0, readingTimeMinutes: 1 }

console.log(result.durationMs);
// 2
```

```typescript
// Convert a Buffer with auto-detection
import { readFileSync } from 'fs';

const buf = readFileSync('report.html');
const { markdown, metadata, images, warnings } = convert(buf);
```

## Features

- **HTML to Markdown** -- Converts headings (h1-h6), paragraphs, bold, italic, strikethrough, inline code, links, images, ordered and unordered lists (including nested), GFM pipe tables, fenced code blocks with language hints, blockquotes, horizontal rules, `<figure>`/`<figcaption>`, and `<sup>`/`<sub>` elements.
- **Plain Text to Markdown** -- Detects setext-style headings (underlined with `===` or `---`), ALL CAPS headings, unordered and ordered lists, and paragraph breaks. Normalizes list markers and line endings.
- **Markdown Normalization** -- Cleans and normalizes existing markdown: collapses excessive blank lines, standardizes list markers to `-`, normalizes heading levels to eliminate gaps, fixes broken links with empty hrefs, and ensures consistent spacing around headings.
- **Format Auto-Detection** -- Detects the input format automatically using file extension, magic bytes (for Buffer inputs), and content analysis (HTML tags, markdown patterns). Supports explicit format override via options.
- **Metadata Extraction** -- Returns word count, heading count, image count, and estimated reading time. For HTML inputs, extracts title, author, and date from `<title>`, `<meta>`, and Open Graph tags.
- **Image Reference Extraction** -- Collects all image references from HTML with their `id`, `alt` text, and `src` path. Can be disabled with `extractImages: false`.
- **Binary Format Guidance** -- Detects PDF, DOCX, and PPTX inputs (via magic bytes or extension) and returns informative messages with suggested packages (`pdfjs-dist`, `mammoth`, `jszip`) and code examples. No binary parsers are bundled to keep the dependency tree at zero.
- **HTML Sanitization** -- Strips `<script>`, `<style>`, `<noscript>`, `<iframe>`, `<svg>`, `<canvas>`, `<nav>`, `<footer>`, `<header>`, and `<aside>` elements. Decodes HTML entities including numeric and hex character references.
- **Zero Dependencies** -- No runtime dependencies. Only devDependencies for building and testing.

## API Reference

### `convert(input, options?)`

The primary conversion function. Accepts a string or Buffer, auto-detects the format (or uses the explicit format from options), converts to markdown, and returns a `ConversionResult`.

```typescript
function convert(input: string | Buffer, options?: ConvertOptions): ConversionResult;
```

**Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `string \| Buffer` | The document content to convert |
| `options` | `ConvertOptions` | Optional conversion settings |

**Returns:** `ConversionResult`

```typescript
import { convert } from 'docling-node-ts';

const result = convert('<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>Alice</td><td>30</td></tr></tbody></table>');
console.log(result.markdown);
// | Name | Age |
// | --- | --- |
// | Alice | 30 |
```

---

### `convertHtml(html)`

Convenience function that converts HTML to markdown. Equivalent to calling `convert(html, { format: 'html' })`.

```typescript
function convertHtml(html: string): ConversionResult;
```

```typescript
import { convertHtml } from 'docling-node-ts';

const { markdown } = convertHtml('<ul><li>First</li><li>Second</li></ul>');
// - First
// - Second
```

---

### `convertMarkdown(md)`

Cleans and normalizes existing markdown. Standardizes list markers, normalizes heading levels, collapses blank lines, removes broken links, and ensures consistent formatting. Equivalent to calling `convert(md, { format: 'markdown' })`.

```typescript
function convertMarkdown(md: string): ConversionResult;
```

```typescript
import { convertMarkdown } from 'docling-node-ts';

const { markdown } = convertMarkdown('# Title\n\n\n\n\n#### Skipped Level\n\n* Item');
// # Title
//
// ## Skipped Level
//
// - Item
```

---

### `convertText(text)`

Converts plain text to markdown. Detects headings, lists, and paragraph structure. Equivalent to calling `convert(text, { format: 'text' })`.

```typescript
function convertText(text: string): ConversionResult;
```

```typescript
import { convertText } from 'docling-node-ts';

const { markdown } = convertText('INTRODUCTION\n\nSome body text.\n\n1) First step\n2) Second step');
// ## INTRODUCTION
//
// Some body text.
//
// 1. First step
// 2. Second step
```

---

### `detectFormat(input, fileName?)`

Detects the format of a document from its content or file name.

Detection priority:
1. File extension from `fileName` (`.pdf`, `.docx`, `.pptx`, `.html`, `.htm`, `.xhtml`, `.txt`, `.md`, `.markdown`)
2. Magic bytes for Buffer inputs (`%PDF` for PDF, `PK\x03\x04` for ZIP-based Office formats)
3. Content analysis (HTML tags, markdown patterns)
4. Default: `'text'`

```typescript
function detectFormat(input: string | Buffer, fileName?: string): InputFormat;
```

```typescript
import { detectFormat } from 'docling-node-ts';

detectFormat('', 'report.pdf');           // 'pdf'
detectFormat('<html><body>Hi</body></html>'); // 'html'
detectFormat('# Title\n\n## Section');       // 'markdown'
detectFormat('Just plain text.');             // 'text'

const pdfBuffer = Buffer.from('%PDF-1.4 ...');
detectFormat(pdfBuffer);                      // 'pdf'
```

---

### `extractMetadata(markdown)`

Extracts metadata from a markdown string. Computes word count, heading count, image count, and estimated reading time.

```typescript
function extractMetadata(markdown: string): Pick<
  DocumentMetadata,
  'wordCount' | 'headingCount' | 'imageCount' | 'readingTimeMinutes'
>;
```

```typescript
import { extractMetadata } from 'docling-node-ts';

const meta = extractMetadata('# Title\n\nSome **bold** text with ![img](photo.png).\n');
// { wordCount: 4, headingCount: 1, imageCount: 1, readingTimeMinutes: 1 }
```

Word counting strips markdown syntax (headings, bold/italic, code blocks, image references, links, blockquotes, horizontal rules, table pipes, and HTML tags) before counting. Reading time is calculated at 200 words per minute, rounded up, with a minimum of 1 minute.

## Types

### `ConversionResult`

The return type of all conversion functions.

```typescript
interface ConversionResult {
  /** The converted markdown string */
  markdown: string;
  /** Extracted document metadata */
  metadata: DocumentMetadata;
  /** Image references found in the document */
  images: ImageReference[];
  /** Per-page content breakdown (for paginated formats) */
  pages: PageContent[];
  /** Warnings generated during conversion */
  warnings: string[];
  /** Conversion duration in milliseconds */
  durationMs: number;
}
```

### `ConvertOptions`

Options for the `convert` function.

```typescript
interface ConvertOptions {
  /** Explicitly specify the input format (skips auto-detection) */
  format?: InputFormat;
  /** Whether to extract image references (default: true) */
  extractImages?: boolean;
  /** Whether to preserve document structure like headings and lists (default: true) */
  preserveStructure?: boolean;
  /** Maximum number of pages to process (for paginated formats) */
  maxPages?: number;
  /** Whether to insert page break markers (default: false) */
  pageBreaks?: boolean;
  /** File name hint for format detection */
  fileName?: string;
}
```

### `InputFormat`

Supported input format identifiers.

```typescript
type InputFormat = 'html' | 'markdown' | 'text' | 'pdf' | 'docx' | 'pptx';
```

### `DocumentMetadata`

Metadata extracted from a converted document.

```typescript
interface DocumentMetadata {
  title?: string;
  author?: string;
  date?: string;
  pageCount?: number;
  wordCount: number;
  headingCount: number;
  imageCount: number;
  readingTimeMinutes: number;
}
```

### `ImageReference`

A reference to an image found in the document.

```typescript
interface ImageReference {
  /** Unique identifier for the image (e.g., "img-1") */
  id: string;
  /** Alt text for the image */
  alt: string;
  /** Source URL or path of the image */
  src: string;
  /** Page number where the image was found (if applicable) */
  page?: number;
}
```

### `PageContent`

Content of a single page in a paginated document.

```typescript
interface PageContent {
  /** Page number (1-based) */
  pageNumber: number;
  /** Markdown content of the page */
  markdown: string;
  /** Headings found on this page */
  headings: string[];
}
```

## Configuration

### Format Override

Skip auto-detection by specifying the format explicitly:

```typescript
const result = convert(content, { format: 'html' });
```

### File Name Hint

Provide a file name for extension-based format detection:

```typescript
const result = convert(buffer, { fileName: 'report.html' });
```

### Disable Image Extraction

Suppress image reference collection:

```typescript
const result = convert(html, { extractImages: false });
console.log(result.images); // []
```

### Strip All Formatting

Produce plain text output with no markdown syntax:

```typescript
const result = convert('# Heading\n\n**bold** and *italic*', {
  format: 'markdown',
  preserveStructure: false,
});
console.log(result.markdown);
// Heading
//
// bold and italic
```

## Error Handling

All conversion functions are synchronous and do not throw under normal operation. Errors and edge cases are communicated through the `warnings` array in the `ConversionResult`.

### Binary Formats

When a binary format (PDF, DOCX, PPTX) is detected, the library does not throw. Instead, it returns a `ConversionResult` with an informative markdown message describing the detected format, suggested external packages, and example code:

```typescript
const result = convert(pdfBuffer);
console.log(result.warnings);
// [
//   'Binary format "pdf" detected. Install a dedicated parser for full support.',
//   'Suggested packages: `pdfjs-dist`, `pdf-parse`, `pdf2json`'
// ]
```

### Unexpected Formats

If the detected format does not match any known converter, the input is treated as plain text and a warning is added:

```typescript
// result.warnings: ['Unexpected format: xyz. Treating as plain text.']
```

### Empty or Whitespace Input

Empty strings and whitespace-only input produce minimal output without errors:

```typescript
const result = convert('');
console.log(result.markdown);    // '\n'
console.log(result.metadata.wordCount); // 0
```

## Advanced Usage

### RAG Pipeline Integration

Use `docling-node-ts` as the first stage in a document ingestion pipeline. The output markdown is designed for downstream chunking and embedding:

```typescript
import { convert } from 'docling-node-ts';

function ingestDocument(html: string) {
  const { markdown, metadata, images, warnings } = convert(html);

  if (warnings.length > 0) {
    console.warn('Conversion warnings:', warnings);
  }

  // Chunk the markdown for embedding (e.g., with chunk-smart)
  // const chunks = chunkMarkdown(markdown, { maxTokens: 512 });

  return { markdown, metadata, images };
}
```

### Processing Buffers from File Uploads

```typescript
import { convert } from 'docling-node-ts';

function handleUpload(buffer: Buffer, originalFileName: string) {
  const result = convert(buffer, { fileName: originalFileName });

  return {
    markdown: result.markdown,
    title: result.metadata.title,
    wordCount: result.metadata.wordCount,
    readingTime: result.metadata.readingTimeMinutes,
    imageCount: result.images.length,
  };
}
```

### HTML Metadata Extraction

When converting HTML, the library extracts metadata from `<head>` elements:

```typescript
import { convert } from 'docling-node-ts';

const html = `
<html>
<head>
  <title>Annual Report 2024</title>
  <meta name="author" content="Finance Team">
  <meta name="date" content="2024-12-01">
  <meta property="og:title" content="Annual Report">
</head>
<body>
  <h1>Annual Report</h1>
  <p>Revenue increased by 20%.</p>
</body>
</html>
`;

const result = convert(html);
console.log(result.metadata.title);  // 'Annual Report 2024'
console.log(result.metadata.author); // 'Finance Team'
console.log(result.metadata.date);   // '2024-12-01'
```

Title extraction priority: `<title>` tag, then `og:title`. Author extraction checks both `name="author"` and `property="article:author"`. Date extraction checks both `name="date"` and `property="article:published_time"`.

### Normalizing Imported Markdown

Clean up markdown from external sources that may have inconsistent formatting:

```typescript
import { convertMarkdown } from 'docling-node-ts';

const messy = `
# Title


#### Jumped Heading Level

* Mixed
+ List
- Markers

Click [broken]() link.

[Valid link](https://example.com)
`;

const { markdown } = convertMarkdown(messy);
// Heading levels normalized (#### becomes ##)
// List markers standardized to -
// Broken link text extracted without brackets
// Excessive blank lines collapsed
```

### HTML Table Conversion

Tables are converted to GitHub Flavored Markdown pipe tables with column normalization and pipe escaping:

```typescript
import { convertHtml } from 'docling-node-ts';

const html = `
<table>
  <thead>
    <tr><th>Product</th><th>Q1</th><th>Q2</th></tr>
  </thead>
  <tbody>
    <tr><td>Widget A</td><td>$1,200</td><td>$1,500</td></tr>
    <tr><td>Widget B</td><td>$800</td><td>$950</td></tr>
  </tbody>
</table>
`;

const { markdown } = convertHtml(html);
// | Product | Q1 | Q2 |
// | --- | --- | --- |
// | Widget A | $1,200 | $1,500 |
// | Widget B | $800 | $950 |
```

Rows with fewer columns are padded with empty cells. Pipe characters (`|`) inside cell content are escaped as `\|`.

## TypeScript

This package is written in TypeScript and ships type declarations (`dist/index.d.ts`) alongside the compiled JavaScript. All public types are exported from the package entry point:

```typescript
import type {
  ConversionResult,
  ConvertOptions,
  InputFormat,
  DocumentMetadata,
  ImageReference,
  PageContent,
} from 'docling-node-ts';
```

Compiled with `strict: true`, targeting ES2022 with CommonJS module output.

## License

MIT
