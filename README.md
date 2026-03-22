# docling-node-ts

Document-to-markdown conversion library for RAG pipelines and LLM ingestion. Converts HTML, plain text, and markdown to clean, structure-preserving markdown.

## Install

```bash
npm install docling-node-ts
```

## Quick Start

```typescript
import { convert } from 'docling-node-ts';

const result = convert('<h1>Hello</h1><p>World</p>');
console.log(result.markdown);
// # Hello
//
// World

console.log(result.metadata);
// { wordCount: 2, headingCount: 1, ... }
```

## API

### `convert(input, options?): ConversionResult`

Convert a document to markdown. Auto-detects format from content.

### `convertHtml(html, options?): ConversionResult`

Convert HTML to markdown.

### `convertText(text, options?): ConversionResult`

Convert plain text to markdown.

### `convertMarkdown(md, options?): ConversionResult`

Clean and normalize existing markdown.

### `detectFormat(input, fileName?): InputFormat`

Detect document format from content or file extension.

## Supported Formats

- **HTML** — Full conversion with headings, tables, lists, links, images, code blocks
- **Plain text** — Auto-detect paragraphs, headings, lists
- **Markdown** — Clean and normalize
- **PDF/DOCX/PPTX** — Format detection with helpful fallback messages

## License

MIT
