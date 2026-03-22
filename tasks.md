# docling-node-ts — Task Breakdown

This file tracks all implementation tasks derived from SPEC.md. Each task is granular and actionable. Tasks are grouped by phase, matching the implementation roadmap in the spec.

---

## Phase 0: Project Scaffolding & Dependencies

- [ ] **Install runtime dependencies** — Add `pdfjs-dist`, `jszip`, and `cheerio` to `package.json` dependencies. | Status: not_done
- [x] **Install dev dependencies** — Add `typescript`, `vitest`, `eslint`, `@types/node`, and any necessary ESLint plugins/configs to devDependencies. | Status: done
- [ ] **Declare optional peer dependencies** — Add `tesseract.js` and `canvas` as optional peerDependencies in `package.json` with `peerDependenciesMeta` marking them optional. | Status: not_done
- [ ] **Configure CLI bin entry** — Add `"bin": { "docling-node-ts": "./dist/cli.js" }` to `package.json`. | Status: not_done
- [ ] **Create directory structure** — Create the full directory tree as specified in Section 20: `src/parsers/pdf/`, `src/parsers/docx/`, `src/parsers/pptx/`, `src/parsers/html/`, `src/parsers/text/`, `src/pipeline/`, `src/__tests__/`, and all subdirectories. | Status: not_done
- [x] **Configure Vitest** — Create `vitest.config.ts` (or add config to `package.json`) so `npm run test` works with the project structure. | Status: done
- [x] **Configure ESLint** — Create `.eslintrc` or `eslint.config.js` for TypeScript linting so `npm run lint` works. | Status: done
- [ ] **Create .gitignore** — Ensure `node_modules/`, `dist/`, and any temp/test output directories are ignored. | Status: not_done
- [ ] **Create test fixtures directory** — Create `src/__tests__/fixtures/pdf/`, `fixtures/docx/`, `fixtures/pptx/`, `fixtures/html/` directories for test documents. | Status: not_done

---

## Phase 1: Core Infrastructure, Types, and HTML (v0.1.0)

### 1A: Type Definitions (`src/types.ts`)

- [ ] **Define DocumentInput type** — `type DocumentInput = string | Buffer | URL | ReadableStream<Uint8Array>` covering file paths, Buffers, URLs, and streams. | Status: not_done
- [x] **Define DocumentFormat type** — `type DocumentFormat = 'pdf' | 'docx' | 'pptx' | 'html' | 'text' | 'markdown'`. | Status: done
- [ ] **Define ConversionResult interface** — With fields: `markdown`, `metadata`, `images`, `tables`, `pages?`, `warnings`, `format`, `durationMs`. | Status: not_done
- [ ] **Define DocumentMetadata interface** — With fields: `title?`, `author?`, `createdDate?`, `modifiedDate?`, `pageCount?`, `wordCount`, `charCount`, `formatMetadata?`. | Status: not_done
- [ ] **Define ImageInfo interface** — With fields: `index`, `filePath?`, `data?`, `base64?`, `format`, `width?`, `height?`, `alt`, `page?`. | Status: not_done
- [ ] **Define ExtractedTable interface** — With fields: `index`, `headers`, `rows`, `alignment?`, `page?`, `markdown`. | Status: not_done
- [ ] **Define PageInfo interface** — With fields: `number`, `markdown`, `ocrApplied`, `imageCount`, `tableCount`. | Status: not_done
- [ ] **Define ConversionWarning interface** — With fields: `code`, `message`, `page?`. | Status: not_done
- [ ] **Define ConvertOptions interface** — With fields: `format?`, `images?`, `normalizeHeadings?`, `pageBreaks?`, `pdf?`, `docx?`, `pptx?`, `html?`, `ocr?`, `signal?`. | Status: not_done
- [ ] **Define ImageOptions interface** — With fields: `mode?` (5 modes), `outputDir?`, `format?`, `quality?`. | Status: not_done
- [ ] **Define PDFOptions interface** — With fields: `columns?`, `headingFontSizeRatio?`, `removeHeaders?`, `removeFooters?`, `removePageNumbers?`, `headerMargin?`, `footerMargin?`, `headerRepeatThreshold?`, `password?`, `pages?`. | Status: not_done
- [ ] **Define DOCXOptions interface** — With fields: `includeFootnotes?`, `includeEndnotes?`, `includeHeadersFooters?`, `footnoteStyle?`. | Status: not_done
- [ ] **Define PPTXOptions interface** — With fields: `includeNotes?`, `notesStyle?`, `slideHeadingLevel?`, `includeSlideNumbers?`. | Status: not_done
- [ ] **Define HTMLConvertOptions interface** — With fields: `readability?`, `baseUrl?`, `removeSelectors?`, `contentSelector?`. | Status: not_done
- [ ] **Define OCROptions interface** — With fields: `enabled?`, `language?`, `dpi?`, `pages?`. | Status: not_done
- [ ] **Define FormatDetectionResult interface** — With fields: `format`, `confidence`, `method`. | Status: not_done
- [ ] **Define DocumentConverter interface** — With methods: `convert`, `convertPDF`, `convertDOCX`, `convertPPTX`, `convertHTML`, `detectFormat`. | Status: not_done

### 1B: Error Classes (`src/errors.ts`)

- [ ] **Implement FormatDetectionError** — Extends `Error` with `code: 'FORMAT_DETECTION_FAILED'`. | Status: not_done
- [ ] **Implement DependencyError** — Extends `Error` with `code: 'MISSING_DEPENDENCY'` and `dependency: string`. | Status: not_done
- [ ] **Implement ParseError** — Extends `Error` with `code: 'PARSE_FAILED'` and `format: DocumentFormat`. | Status: not_done
- [ ] **Implement EncryptedDocumentError** — Extends `Error` with `code: 'ENCRYPTED_DOCUMENT'`. | Status: not_done

### 1C: Content Block Intermediate Representation (`src/pipeline/content-block.ts`)

- [ ] **Define ContentBlock interface** — With fields: `type` (heading, paragraph, table, list, image, code, blockquote, horizontal-rule, page-break), `level?`, `text?`, `rows?`, `alignment?`, `items?`, `language?`, `src?`, `alt?`, `href?`, `ordered?`, `page?`. | Status: not_done
- [ ] **Define ListItem interface** — With fields: `text`, `children?`. | Status: not_done

### 1D: Format Detection (`src/detect.ts`)

- [x] **Implement file extension detection** — Match `.pdf`, `.docx`, `.pptx`, `.html`, `.htm`, `.txt`, `.md` from file paths and URLs. | Status: done
- [x] **Implement magic byte detection for PDF** — Check for `%PDF` (bytes `25 50 44 46`) at start of Buffer. | Status: done
- [x] **Implement magic byte detection for ZIP-based formats** — Check for `PK` (bytes `50 4B 03 04`) at start of Buffer. | Status: done
- [x] **Implement DOCX vs PPTX disambiguation** — Read `[Content_Types].xml` from the ZIP to distinguish `wordprocessingml` (DOCX) from `presentationml` (PPTX). | Status: done
- [x] **Implement HTML detection from content** — Check for `<!DOCTYPE` or `<html` (case-insensitive) at start of content. | Status: done
- [x] **Implement fallback to plain text** — Default to `text` when no other format matches. | Status: done
- [x] **Implement explicit format override** — When `options.format` is provided, use it directly without detection. | Status: done
- [ ] **Handle URL inputs** — Fetch the resource from a URL, detect format from URL extension, Content-Type header, or response body. | Status: not_done
- [ ] **Handle ReadableStream inputs** — Buffer the stream to a complete Buffer before detection. | Status: not_done
- [ ] **Return FormatDetectionResult** — Include `format`, `confidence` (0.0-1.0), and `method` (explicit, extension, magic-bytes, zip-content-type, heuristic). | Status: not_done
- [ ] **Throw FormatDetectionError on failure** — When no format can be detected and none was explicitly specified. | Status: not_done

### 1E: Markdown Generator (`src/pipeline/markdown-generator.ts`)

- [ ] **Serialize heading ContentBlocks** — Convert heading blocks to ATX syntax (`#` repeated N times + space + text). | Status: not_done
- [ ] **Serialize paragraph ContentBlocks** — Convert paragraph blocks to text followed by a blank line. | Status: not_done
- [ ] **Serialize table ContentBlocks** — Convert table blocks to GFM pipe tables with header row, separator row (with alignment markers `:---`, `:---:`, `---:`), and data rows. | Status: not_done
- [ ] **Serialize unordered list ContentBlocks** — Convert list blocks with `- ` prefix and 2-space indentation for nesting. | Status: not_done
- [ ] **Serialize ordered list ContentBlocks** — Convert list blocks with `1. ` prefix and 3-space indentation for nesting. | Status: not_done
- [ ] **Serialize image ContentBlocks** — Convert image blocks to `![alt](src)` syntax. | Status: not_done
- [ ] **Serialize code ContentBlocks** — Convert code blocks to fenced code blocks with language hints. | Status: not_done
- [ ] **Serialize blockquote ContentBlocks** — Convert blockquote blocks to `> ` prefixed lines. | Status: not_done
- [ ] **Serialize horizontal-rule ContentBlocks** — Convert to `---`. | Status: not_done
- [ ] **Serialize page-break ContentBlocks** — Convert to `---` with optional `<!-- Page N -->` comment based on `pageBreaks` option. | Status: not_done
- [ ] **Handle table cell escaping** — Escape pipe characters in cell content (`|` to `\|`). | Status: not_done
- [ ] **Pad short table rows** — Ensure all rows have the same number of cells by padding with empty cells. | Status: not_done

### 1F: Post-Processing Cleanup (`src/pipeline/cleanup.ts`)

- [x] **Implement whitespace normalization** — Collapse multiple consecutive blank lines to max 2, remove trailing whitespace from lines, ensure document ends with single newline. | Status: done
- [ ] **Implement encoding fixes** — Replace ligatures (`fi`, `fl`, `ff`), optionally convert curly quotes to straight quotes, remove soft hyphens. | Status: not_done
- [ ] **Implement garbage character removal** — Remove null bytes, control characters (except `\n` and `\t`), and PDF operator fragments (`BT`, `ET`, `Tf`, `Tm`, `Tj`). | Status: not_done
- [x] **Implement heading normalization** — When `normalizeHeadings` is true, shift heading levels to form a valid hierarchy (no jumps from H1 to H4 without H2/H3). | Status: done
- [ ] **Implement table cleanup** — Ensure consistent cell counts across rows, escape pipe characters. | Status: not_done
- [ ] **Implement link deduplication** — Remove duplicate links from overlapping extraction methods. | Status: not_done
- [x] **Implement HTML entity decoding** — Decode `&amp;`, `&lt;`, `&gt;`, `&nbsp;` to Unicode equivalents. | Status: done

### 1G: Image Handler (`src/pipeline/image-handler.ts`)

- [ ] **Implement 'extract' mode** — Save images to files in the configured `outputDir`, return file path references. | Status: not_done
- [ ] **Implement 'inline' mode** — Encode images as base64 data URIs. | Status: not_done
- [ ] **Implement 'skip' mode** — Insert `<!-- Image omitted -->` comment or nothing, do not process image data. | Status: not_done
- [ ] **Implement 'reference' mode** — Insert `![alt](image-N.ext)` references, return `ImageInfo[]` without image data. | Status: not_done
- [ ] **Implement 'buffer' mode** — Return image data as Buffers in `ConversionResult.images`, no markdown references. | Status: not_done
- [ ] **Implement alt text generation** — Source from document metadata, caption proximity, or generate `Image N` labels. | Status: not_done
- [ ] **Implement image format conversion** — Convert between PNG, JPEG, and WebP using `sharp` (if available) or Canvas API. Pass through when source matches target format. | Status: not_done

### 1H: HTML Parser (`src/parsers/html/`)

- [x] **Implement HTML parser entry point** — `src/parsers/html/index.ts` that accepts HTML input and options, returns `ContentBlock[]` and metadata. | Status: done
- [ ] **Implement readability-based article extraction** — Strip noise elements (`<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, etc.), score content nodes by text length, paragraph count, and link density, select top candidate container. Prefer `<article>` and `<main>` elements. | Status: not_done
- [x] **Implement noise element removal** — Remove elements matching common ad/navigation class names: `nav`, `sidebar`, `footer`, `ad`, `advertisement`, `cookie`, `banner`, `popup`, `modal`. Support custom `removeSelectors`. | Status: done
- [ ] **Implement contentSelector override** — When `htmlOptions.contentSelector` is provided, use that CSS selector instead of readability scoring. | Status: not_done
- [ ] **Implement readability bypass** — When `htmlOptions.readability` is `false`, convert the entire HTML document. | Status: not_done
- [x] **Implement heading tag mapping** — `<h1>` through `<h6>` to heading ContentBlocks with correct levels. | Status: done
- [x] **Implement paragraph tag mapping** — `<p>` to paragraph ContentBlocks. | Status: done
- [x] **Implement inline formatting mapping** — `<strong>`/`<b>` to `**bold**`, `<em>`/`<i>` to `*italic*`, `<code>` to backtick code, `<del>`/`<s>`/`<strike>` to `~~strikethrough~~`. | Status: done
- [x] **Implement link mapping** — `<a href="url">` to `[text](url)` markdown links. | Status: done
- [x] **Implement image mapping** — `<img src="url" alt="text">` to `![text](url)` with alt text from attributes. | Status: done
- [x] **Implement list mapping** — `<ul>` to unordered lists, `<ol>` to ordered lists, handle nested `<li>` elements. | Status: done
- [x] **Implement table mapping** — `<table>` to GFM pipe tables. Parse `<thead>`, `<tbody>`, `<th>`, `<td>`. Expand `rowspan` and `colspan` into the grid. | Status: done
- [x] **Implement code block mapping** — `<pre>` and `<pre><code>` to fenced code blocks. Preserve `class="language-*"` language hints. | Status: done
- [x] **Implement blockquote mapping** — `<blockquote>` to `> ` prefixed blocks. | Status: done
- [x] **Implement figure/figcaption mapping** — `<figure>` as image with optional `<figcaption>` as italic text below. | Status: done
- [ ] **Implement details/summary passthrough** — Preserve `<details>` and `<summary>` as HTML. | Status: not_done
- [x] **Implement sup/sub mapping** — `<sup>` to `<sup>text</sup>`, `<sub>` to `<sub>text</sub>`. | Status: done
- [x] **Implement horizontal rule mapping** — `<hr>` to `---`. | Status: done
- [x] **Implement line break mapping** — `<br>` to newline within paragraphs. | Status: done
- [x] **Implement div/span/section unwrapping** — Remove wrapper tags, preserve inner content. | Status: done
- [ ] **Implement mark tag mapping** — `<mark>` to `==text==` or plain text. | Status: not_done
- [ ] **Implement base URL resolution** — When `htmlOptions.baseUrl` is provided, resolve relative URLs in images and links. | Status: not_done
- [x] **Implement HTML metadata extraction** — Extract `<title>`, `<meta name="author">`, `<meta name="description">`, `<meta name="date">`, Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type`, `og:url`), Twitter Card tags, and `<link rel="canonical">`. | Status: done

### 1I: Plain Text Passthrough (`src/parsers/text/index.ts`)

- [x] **Implement plain text parser** — Read raw text, normalize whitespace and line endings, wrap in paragraph content blocks. | Status: done
- [x] **Implement markdown passthrough** — For `.md` files, clean up whitespace, normalize line endings, remove trailing spaces, optionally reformat. | Status: done

### 1J: Conversion Orchestration (`src/convert.ts`)

- [x] **Implement convert() function** — Accept `DocumentInput` and `ConvertOptions`, orchestrate the pipeline: detect format, resolve input (file path to Buffer, URL to Buffer, stream to Buffer), invoke parser, generate markdown, run cleanup, compute metadata (word count, char count), measure duration, return `ConversionResult`. | Status: done
- [ ] **Implement input resolution for file paths** — Read file from disk using `fs.promises.readFile`. | Status: not_done
- [ ] **Implement input resolution for URLs** — Fetch content from HTTP/HTTPS URLs. | Status: not_done
- [ ] **Implement input resolution for ReadableStreams** — Buffer the stream to a complete Buffer. | Status: not_done
- [x] **Implement input resolution for Buffers** — Use the Buffer directly. | Status: done
- [ ] **Implement AbortSignal support** — Check `options.signal` for cancellation at key pipeline stages. Throw on abort. | Status: not_done
- [x] **Wire up parser dispatch** — Based on detected format, invoke the correct parser (HTML, text/markdown in Phase 1). | Status: done
- [x] **Compute wordCount and charCount** — From the final extracted text, compute metadata statistics. | Status: done

### 1K: Parser Registry (`src/parsers/index.ts`)

- [ ] **Implement parser registry** — Map `DocumentFormat` to parser functions. Dispatch to the correct parser based on format. | Status: not_done

### 1L: Factory Function (`src/factory.ts`)

- [ ] **Implement createConverter()** — Accept `ConvertOptions` preset, return a `DocumentConverter` instance that merges preset options with per-call overrides (per-call > factory > defaults). | Status: not_done
- [ ] **Implement option merge precedence** — Per-call overrides > factory-level options > built-in defaults. Deep merge for nested option objects (`pdf`, `docx`, etc.). | Status: not_done

### 1M: Public API Exports (`src/index.ts`)

- [x] **Export convert function** — From `src/convert.ts`. | Status: done
- [x] **Export format-specific functions** — `convertPDF`, `convertDOCX`, `convertPPTX`, `convertHTML` (stubs for Phase 1, wire up as parsers are built). | Status: done
- [ ] **Export createConverter factory** — From `src/factory.ts`. | Status: not_done
- [x] **Export detectFormat function** — From `src/detect.ts`. | Status: done
- [x] **Export all type definitions** — From `src/types.ts`. | Status: done
- [ ] **Export all error classes** — From `src/errors.ts`. | Status: not_done

### 1N: CLI Skeleton (`src/cli.ts`)

- [ ] **Implement CLI argument parsing** — Parse positional `<input>` argument and all flags defined in Section 15: `-o/--output`, `-f/--format`, `--images`, `--image-dir`, `--columns`, `--heading-ratio`, `--no-remove-headers`, `--no-remove-footers`, `--pages`, `--password`, `--footnotes`/`--no-footnotes`, `--endnotes`/`--no-endnotes`, `--notes`/`--no-notes`, `--no-readability`, `--base-url`, `--content-selector`, `--ocr`, `--ocr-lang`, `--ocr-dpi`, `--normalize-headings`/`--no-normalize-headings`, `--page-breaks`, `--json`, `--quiet`, `--verbose`, `--version`, `--help`. | Status: not_done
- [ ] **Implement --help flag** — Print usage information and exit. | Status: not_done
- [ ] **Implement --version flag** — Read version from `package.json` and print. | Status: not_done
- [ ] **Implement file input reading** — Read from file path passed as positional argument. | Status: not_done
- [ ] **Implement URL input fetching** — Detect URL input and fetch content. | Status: not_done
- [ ] **Implement stdout output** — Write markdown to stdout by default. | Status: not_done
- [ ] **Implement -o/--output file writing** — Write markdown to specified file path. | Status: not_done
- [ ] **Implement --json output mode** — Serialize full `ConversionResult` as JSON to stdout. | Status: not_done
- [ ] **Implement --quiet flag** — Suppress warnings and status messages. | Status: not_done
- [ ] **Implement --verbose flag** — Show detailed conversion progress. | Status: not_done
- [ ] **Implement exit codes** — 0 for success, 1 for conversion error, 2 for config error, 3 for input error. | Status: not_done
- [ ] **Implement --pages range parsing** — Parse `"1-10"`, `"1,3,5"`, `"5-"` into `number[]` or `{ start, end }`. | Status: not_done
- [ ] **Add shebang line** — Add `#!/usr/bin/env node` to top of `cli.ts`. | Status: not_done

### 1O: Phase 1 Tests

- [x] **Write format detection unit tests** — Test extension detection for each format, magic byte detection for PDF, ZIP detection for DOCX/PPTX, HTML content detection, plain text fallback, explicit format override, ambiguous ZIP input. | Status: done
- [ ] **Write markdown generator unit tests** — Test serialization for every ContentBlock type: headings (all 6 levels), paragraphs, tables (with alignment, escaping, padding), unordered lists (flat and nested), ordered lists (flat and nested), images, code blocks (with and without language), blockquotes, horizontal rules, page breaks. | Status: not_done
- [x] **Write cleanup unit tests** — Test whitespace normalization, encoding fixes (ligatures, curly quotes, soft hyphens), garbage character removal, heading normalization, table cleanup, link deduplication, HTML entity decoding. | Status: done
- [ ] **Write HTML readability tests** — Feed HTML with content and noise elements, verify correct content container selection and noise stripping. | Status: not_done
- [x] **Write HTML tag mapping tests** — Test every HTML-to-markdown mapping listed in Section 9.2. | Status: done
- [x] **Write HTML metadata extraction tests** — Test extraction of title, author, description, date, Open Graph, Twitter Card, and canonical URL. | Status: done
- [x] **Write plain text passthrough tests** — Verify whitespace normalization and line ending handling. | Status: done
- [x] **Write convert() orchestration tests** — Test the full pipeline with HTML and text inputs end-to-end. | Status: done
- [ ] **Write CLI skeleton tests** — Test argument parsing, --help, --version, file input, stdout output, --json mode, exit codes for errors. | Status: not_done
- [ ] **Create HTML test fixtures** — `article.html` (with navigation, sidebar, ads), `minimal.html` (content only). | Status: not_done

---

## Phase 2: DOCX Conversion (v0.2.0)

### 2A: DOCX ZIP Extraction (`src/parsers/docx/`)

- [ ] **Implement ZIP extraction** — Use `jszip` to read DOCX files and extract: `word/document.xml`, `word/styles.xml`, `word/_rels/document.xml.rels`, `word/numbering.xml`, `word/footnotes.xml`, `word/endnotes.xml`, `word/media/*`, `[Content_Types].xml`. | Status: not_done

### 2B: XML Reader Utilities (`src/parsers/docx/xml-reader.ts`)

- [ ] **Implement XML parsing** — Parse DOCX XML files using a lightweight XML parser (Node.js built-in or lightweight library). Provide traversal helpers for navigating the XML tree. | Status: not_done

### 2C: Style Mapper (`src/parsers/docx/style-mapper.ts`)

- [ ] **Parse styles.xml** — Read style definitions and build a map of style IDs to style names and properties. | Status: not_done
- [ ] **Map heading styles** — `Heading 1` through `Heading 6` to heading levels 1-6. Map `Title` to H1, `Subtitle` to H2. | Status: not_done
- [ ] **Map quote styles** — `Quote` and `IntenseQuote` to blockquote content blocks. | Status: not_done
- [ ] **Map code styles** — Styles with monospace fonts to code content blocks. | Status: not_done
- [ ] **Map custom outline levels** — Styles with `<w:outlineLvl>` to heading levels. | Status: not_done
- [ ] **Map list paragraph style** — `ListParagraph` to list items (actual list type determined by numbering.xml). | Status: not_done

### 2D: DOCX Paragraph and Run Extraction (`src/parsers/docx/index.ts`)

- [ ] **Implement document.xml traversal** — Walk `<w:body>` children, identify paragraphs (`<w:p>`), tables (`<w:tbl>`), and other block elements. | Status: not_done
- [ ] **Implement paragraph text extraction** — Extract text from `<w:r><w:t>` runs within paragraphs. | Status: not_done
- [ ] **Implement run-level formatting** — Detect `<w:b/>` (bold to `**`), `<w:i/>` (italic to `*`), `<w:strike/>` (strikethrough to `~~`), monospace `<w:rFonts>` (to backtick code), `<w:vertAlign>` superscript/subscript (to `<sup>`/`<sub>`). | Status: not_done
- [ ] **Handle nested formatting** — Bold+italic produces `***text***`. | Status: not_done
- [ ] **Handle underline** — `<w:u/>` preserves text as-is (no markdown equivalent). | Status: not_done

### 2E: DOCX List Parser (`src/parsers/docx/list-parser.ts`)

- [ ] **Parse numbering.xml** — Build map of numbering definition IDs to list types (ordered/unordered) and indent levels. | Status: not_done
- [ ] **Determine list type and level per paragraph** — From numbering reference and indent level on each list paragraph. | Status: not_done
- [ ] **Group consecutive list paragraphs** — Into list content blocks with correct nesting. | Status: not_done
- [ ] **Generate nested list items** — With proper `ListItem` children hierarchy. | Status: not_done

### 2F: DOCX Table Parser (`src/parsers/docx/table-parser.ts`)

- [ ] **Implement table row/cell extraction** — Traverse `<w:tbl>` > `<w:tr>` > `<w:tc>` and extract cell content. | Status: not_done
- [ ] **Handle horizontal cell merges** — `<w:hMerge w:val="restart"/>` and `<w:hMerge w:val="continue"/>`. | Status: not_done
- [ ] **Handle vertical cell merges** — `<w:vMerge>` for vertical spans. | Status: not_done
- [ ] **Join multi-paragraph cells** — Concatenate multiple paragraphs within a cell with `<br>` or spaces. | Status: not_done
- [ ] **Identify header row** — Treat first row as header unless `<w:tblHeader/>` is absent from all cells. | Status: not_done
- [ ] **Emit as table ContentBlock** — With `headers`, `rows`, and `alignment` fields. | Status: not_done

### 2G: DOCX Image Parser (`src/parsers/docx/image-parser.ts`)

- [ ] **Detect drawing elements** — Find `<w:drawing>` elements with `<a:blip r:embed>` references. | Status: not_done
- [ ] **Resolve relationship IDs** — Look up `r:embed` IDs in `document.xml.rels` to get target file paths in `word/media/`. | Status: not_done
- [ ] **Extract image data from ZIP** — Read the image bytes from the ZIP archive. | Status: not_done
- [ ] **Create ImageInfo entries** — With format, dimensions (from drawing element attributes), and alt text (from description properties). | Status: not_done
- [ ] **Insert image ContentBlocks** — At the position of the `<w:drawing>` element in the document flow. | Status: not_done

### 2H: DOCX Footnote/Endnote Parser (`src/parsers/docx/footnote-parser.ts`)

- [ ] **Parse footnotes.xml** — Extract footnote content by footnote ID. | Status: not_done
- [ ] **Parse endnotes.xml** — Extract endnote content by endnote ID. | Status: not_done
- [ ] **Implement 'inline' footnote style** — Insert footnote content at the point of reference in the document. | Status: not_done
- [ ] **Implement 'end' footnote style** — Collect all footnotes and append at the end of the document. | Status: not_done
- [ ] **Respect includeFootnotes/includeEndnotes options** — Skip extraction when disabled. | Status: not_done

### 2I: DOCX Hyperlink Parser (`src/parsers/docx/hyperlink-parser.ts`)

- [ ] **Detect hyperlink elements** — Find `<w:hyperlink>` elements in paragraphs. | Status: not_done
- [ ] **Resolve external hyperlinks** — Look up relationship ID in `document.xml.rels` to get the URL. | Status: not_done
- [ ] **Resolve internal hyperlinks** — Handle bookmark-based internal links. | Status: not_done
- [ ] **Emit markdown links** — Convert `<w:hyperlink>` to `[text](url)` inline in paragraph text. | Status: not_done

### 2J: DOCX Metadata Extraction

- [ ] **Extract common metadata from core.xml** — Title, author (creator), created date, modified date. | Status: not_done
- [ ] **Extract format-specific metadata from app.xml** — Revision, lastModifiedBy, company, template, totalEditingTime. | Status: not_done

### 2K: DOCX Headers/Footers Handling

- [ ] **Implement includeHeadersFooters option** — When true, extract content from document headers and footers. Default: false (ignored as noise). | Status: not_done

### 2L: Wire up DOCX in pipeline

- [ ] **Register DOCX parser in parser registry** — Add DOCX format to the parser dispatch map. | Status: not_done
- [ ] **Implement convertDOCX() function** — Format-specific entry point that skips format detection. | Status: not_done

### 2M: Phase 2 Tests

- [ ] **Write DOCX style mapping tests** — Test heading styles (1-6), Title, Subtitle, Quote, Code, custom outline levels. | Status: not_done
- [ ] **Write DOCX run formatting tests** — Test bold, italic, strikethrough, code, superscript, subscript, nested formatting. | Status: not_done
- [ ] **Write DOCX list extraction tests** — Test ordered, unordered, nested lists, and list grouping. | Status: not_done
- [ ] **Write DOCX table extraction tests** — Test simple tables, horizontal merges, vertical merges, multi-paragraph cells, header detection. | Status: not_done
- [ ] **Write DOCX image extraction tests** — Test inline and floating image extraction, relationship resolution, alt text. | Status: not_done
- [ ] **Write DOCX footnote/endnote tests** — Test inline and end-of-document styles, include/exclude options. | Status: not_done
- [ ] **Write DOCX hyperlink tests** — Test external and internal hyperlinks. | Status: not_done
- [ ] **Write DOCX metadata tests** — Test extraction from core.xml and app.xml. | Status: not_done
- [ ] **Write DOCX integration test** — Full end-to-end conversion of a DOCX with headings, lists, tables, images, footnotes. Verify all elements present and correct in output. | Status: not_done
- [ ] **Create DOCX test fixtures** — `simple.docx` (headings, lists, tables, images), `complex.docx` (footnotes, merged cells, nested lists, multiple heading levels). | Status: not_done

---

## Phase 3: PDF Conversion (v0.3.0)

### 3A: PDF Text Extraction (`src/parsers/pdf/text-extractor.ts`)

- [ ] **Implement pdfjs-dist document loading** — Use `getDocument()` to load PDFs from Buffer. Handle password-protected PDFs with `password` option; throw `EncryptedDocumentError` when password is needed but not provided. | Status: not_done
- [ ] **Extract text content items per page** — Call `page.getTextContent()` for each page. Collect `str`, `transform`, `fontName`, `hasEOL`, `dir` from each item. | Status: not_done
- [ ] **Derive font size from transform matrix** — Compute font size as `Math.sqrt(a*a + b*b)` from the 6-element transform. | Status: not_done
- [ ] **Derive x/y position from transform** — `e` is x-coordinate, `f` is y-coordinate. | Status: not_done
- [ ] **Extract font metadata** — Use `commonObjs` to get font family name, detect bold (from "Bold"/"Bd"/"Heavy"), italic (from "Italic"/"It"/"Oblique"), monospace (from "Courier"/"Consolas"/"Monaco"/"Menlo"). | Status: not_done
- [ ] **Extract document metadata from PDF info** — Title, author, creation date, modification date, producer, creator, pdfVersion, encrypted, linearized. | Status: not_done
- [ ] **Implement page range support** — Honor `pdfOptions.pages` to convert only specific pages. | Status: not_done
- [ ] **Process pages sequentially** — To limit memory usage, process one page at a time and release intermediate data. | Status: not_done

### 3B: Reading Order Reconstruction (`src/parsers/pdf/reading-order.ts`)

- [ ] **Sort text items by position** — Top-to-bottom (descending y), left-to-right (ascending x) within tolerance of body line height. | Status: not_done
- [ ] **Merge adjacent text items into lines** — Items at the same y-coordinate (within tolerance) are merged into a single line. | Status: not_done
- [ ] **Merge lines into paragraphs** — Consecutive lines with consistent line spacing are grouped into paragraphs. Lines separated by larger gaps start new paragraphs. | Status: not_done

### 3C: Heading Detection (`src/parsers/pdf/heading-detector.ts`)

- [ ] **Build font size histogram** — Scan all text items, build a histogram of font sizes weighted by character count. Determine the body (most common) font size. | Status: not_done
- [ ] **Classify headings by font size ratio** — Ratio >= 2.0 + bold = H1, >= 2.0 not bold = H2, >= 1.5 + bold = H1, >= 1.5 not bold = H2, >= 1.2 + bold = H2, >= 1.2 not bold = H3, bold at body size + new paragraph = H4. | Status: not_done
- [ ] **Apply additional heading signals** — Text alone on a line, text at page beginning, all-caps at larger size are more likely headings. | Status: not_done
- [ ] **Support configurable headingFontSizeRatio** — Allow tuning thresholds via `pdfOptions.headingFontSizeRatio`. | Status: not_done

### 3D: Table Detection (`src/parsers/pdf/table-detector.ts`)

- [ ] **Implement grid candidate detection** — Group text items by y-coordinate (within row tolerance), then by x-coordinate (within column tolerance). Track column x-boundaries. | Status: not_done
- [ ] **Implement column alignment verification** — Verify at least 3 consecutive rows share the same column count and consistent x-boundaries. Check that inter-column spacing exceeds intra-column word spacing. | Status: not_done
- [ ] **Implement ruled line detection** — Scan page operator list for horizontal and vertical lines that form grid patterns. Use as table boundary signals. | Status: not_done
- [ ] **Implement cell content extraction** — Assign text items to cells based on grid position. Concatenate multiple items within a cell. | Status: not_done
- [ ] **Implement header row identification** — Detect header from bold formatting, non-numeric content in first row when subsequent rows are numeric. | Status: not_done
- [ ] **Implement table boundary termination** — End table when row structure diverges, or when a non-table element (heading, image, rule) interrupts. | Status: not_done
- [ ] **Handle cross-page tables** — Merge tables that span page boundaries using column count and position matching heuristics. | Status: not_done

### 3E: Multi-Column Layout Detection (`src/parsers/pdf/column-detector.ts`)

- [ ] **Build x-coordinate histogram** — For each page, histogram of text item starting x-coordinates. | Status: not_done
- [ ] **Detect column gaps** — Find gaps in the histogram exceeding threshold (2x average character width). Each gap defines a column separator. | Status: not_done
- [ ] **Assign text items to columns** — Based on x-coordinate falling within column ranges. | Status: not_done
- [ ] **Reconstruct reading order** — Read all text in column 1 (top to bottom), then column 2, etc. | Status: not_done
- [ ] **Detect full-width elements** — Headings and other elements spanning full page width are placed in reading order relative to column flow. | Status: not_done
- [ ] **Support configurable column mode** — Honor `pdfOptions.columns`: `'auto'` (detect), `'single'` (force single), or a number (force N columns). | Status: not_done

### 3F: Header and Footer Removal (`src/parsers/pdf/header-footer-remover.ts`)

- [ ] **Collect top-of-page text** — For each page, collect text within top `headerMargin` fraction of page height. | Status: not_done
- [ ] **Collect bottom-of-page text** — For each page, collect text within bottom `footerMargin` fraction. | Status: not_done
- [ ] **Detect repeated header text** — Compare top-of-page text across all pages. Text appearing on > `headerRepeatThreshold` fraction of pages at the same position is classified as header and removed. | Status: not_done
- [ ] **Detect repeated footer text** — Same algorithm applied to bottom-of-page text. | Status: not_done
- [ ] **Store removed header/footer text in metadata** — Optionally include in `ConversionResult.metadata` for reference. | Status: not_done
- [ ] **Respect removeHeaders/removeFooters options** — Skip removal when disabled. | Status: not_done

### 3G: Page Number Removal (`src/parsers/pdf/page-number-remover.ts`)

- [ ] **Detect sequential page numbers** — Identify isolated numbers at top/bottom of pages that increment by 1 across pages. | Status: not_done
- [ ] **Detect patterned page numbers** — Recognize patterns like "Page N of M", "N/M", Roman numerals. | Status: not_done
- [ ] **Remove detected page numbers** — Exclude from content blocks. | Status: not_done
- [ ] **Respect removePageNumbers option** — Skip removal when disabled. | Status: not_done

### 3H: PDF Image Extraction (`src/parsers/pdf/image-extractor.ts`)

- [ ] **Enumerate images per page** — Scan page operator list for `paintImageXObject` and `paintInlineImageXObject` operators. Record image reference name and position/dimensions. | Status: not_done
- [ ] **Extract image data** — Use `pdfjs-dist` `commonObjs` to retrieve raw pixel data, width, height, color space. | Status: not_done
- [ ] **Encode image data** — Encode raw pixels to PNG/JPEG/WebP based on `imageOptions.format`. | Status: not_done
- [ ] **Determine image placement** — Place images in markdown at position corresponding to their page location, between surrounding text blocks. | Status: not_done
- [ ] **Implement lazy image extraction** — Only scan for images when `images.mode` is not `'skip'`. | Status: not_done

### 3I: PDF List Detection

- [ ] **Detect bullet characters** — Identify lines starting with bullet characters (U+2022, U+25CF, U+25CB, `-`, `*`) at consistent indentation. | Status: not_done
- [ ] **Detect numbered lists** — Identify lines starting with sequential numbers or letters at consistent indentation. | Status: not_done
- [ ] **Group list items** — Group consecutive detected list lines into list content blocks with nesting. | Status: not_done

### 3J: PDF Code Block Detection

- [ ] **Detect monospace font sequences** — Identify consecutive lines using monospace fonts. | Status: not_done
- [ ] **Group as code blocks** — Emit as code ContentBlocks with no language hint (unless detectable). | Status: not_done

### 3K: PDF Link Extraction

- [ ] **Extract hyperlink annotations** — Preserve PDF hyperlink annotations as markdown links `[text](url)`. | Status: not_done

### 3L: PDF Parser Entry Point (`src/parsers/pdf/index.ts`)

- [ ] **Wire up all PDF sub-components** — Orchestrate text extraction, reading order, column detection, heading detection, table detection, header/footer removal, page number removal, list detection, image extraction, link extraction into a cohesive pipeline. Return `ContentBlock[]`, metadata, images, tables, pages. | Status: not_done

### 3M: Wire up PDF in pipeline

- [ ] **Register PDF parser in parser registry** — Add PDF format to the parser dispatch map. | Status: not_done
- [ ] **Implement convertPDF() function** — Format-specific entry point that skips format detection. | Status: not_done

### 3N: Phase 3 Tests

- [ ] **Write heading detection unit tests** — Test various font size ratios, bold/non-bold, all-same-size (no headings), two font sizes, many font sizes. | Status: not_done
- [ ] **Write table detection unit tests** — Test regular grids, irregular spacing, missing cells, spanning text, tables without ruled lines, tables with ruled lines. | Status: not_done
- [ ] **Write column detection unit tests** — Test single column, two columns, three columns, full-width headings above columns. | Status: not_done
- [ ] **Write header/footer removal unit tests** — Test text repeating on all pages, most pages, varying slightly (page numbers). | Status: not_done
- [ ] **Write reading order unit tests** — Test sorting, line merging, paragraph grouping. | Status: not_done
- [ ] **Write page number removal unit tests** — Test sequential numbers, "Page N of M" pattern, Roman numerals. | Status: not_done
- [ ] **Write PDF integration test (simple)** — Single-page PDF with heading, paragraphs, simple table. Verify all elements correct in output. | Status: not_done
- [ ] **Write PDF integration test (multi-column)** — Two-column academic paper. Verify column 1 text before column 2, no interleaving. | Status: not_done
- [ ] **Write PDF integration test (tables)** — Financial statement with multiple tables. Verify correct column count, headers, data. | Status: not_done
- [ ] **Write PDF integration test (headers/footers)** — Multi-page PDF with repeating headers/footers. Verify removal. | Status: not_done
- [ ] **Write PDF integration test (images)** — PDF with embedded images. Verify image extraction/references. | Status: not_done
- [ ] **Write encrypted PDF test** — Test with correct password (succeeds) and without password (throws `EncryptedDocumentError`). | Status: not_done
- [ ] **Write PDF integration test (large document)** — 100+ page PDF. Verify completion within performance targets (<10s). | Status: not_done
- [ ] **Write determinism test** — Convert same PDF twice with same options, verify identical output. | Status: not_done
- [ ] **Create PDF test fixtures** — `simple.pdf`, `multi-column.pdf`, `tables.pdf`, `images.pdf`, `scanned.pdf`, `headers-footers.pdf`. | Status: not_done

---

## Phase 4: PPTX, OCR, and Polish (v1.0.0)

### 4A: PPTX Parser (`src/parsers/pptx/`)

- [ ] **Implement PPTX ZIP extraction** — Use `jszip` to read PPTX files, extract `ppt/slides/slideN.xml`, `ppt/notesSlides/notesSlideN.xml`, `ppt/media/*`, `[Content_Types].xml`. | Status: not_done
- [ ] **Implement slide parser** — Parse each slide XML, extract text from text boxes ordered by position (top-to-bottom, left-to-right). Extract slide title from title placeholder. | Status: not_done
- [ ] **Implement slide heading generation** — Each slide becomes `## Slide N: Title` (or configurable heading level via `slideHeadingLevel`). Include/exclude slide numbers via `includeSlideNumbers`. | Status: not_done
- [ ] **Implement speaker notes parser** — Extract notes from `ppt/notesSlides/`. Support `notesStyle`: `'inline'` (after each slide) or `'separate'` (end section). Respect `includeNotes` option. | Status: not_done
- [ ] **Implement slide table parser** — Extract tables from slide XML as GFM pipe tables. | Status: not_done
- [ ] **Implement slide image parser** — Extract images from `ppt/media/`, create ImageInfo entries and image ContentBlocks. | Status: not_done
- [ ] **Implement hyperlink extraction** — Preserve hyperlinks from slides as markdown links. | Status: not_done
- [ ] **Exclude master slide/layout text** — Exclude common elements (logos, footers) from master slides and layouts by default. | Status: not_done
- [ ] **Extract PPTX metadata** — Slide count, hidden slide count, note count, presentation format. | Status: not_done

### 4B: Wire up PPTX in pipeline

- [ ] **Register PPTX parser in parser registry** — Add PPTX format to the parser dispatch map. | Status: not_done
- [ ] **Implement convertPPTX() function** — Format-specific entry point. | Status: not_done

### 4C: OCR Integration (`src/parsers/pdf/ocr.ts`)

- [ ] **Implement scanned page detection** — Classify page as scanned if extracted text < 10 characters and image operators cover > 80% of page area. | Status: not_done
- [ ] **Implement tesseract.js integration** — Render page at configurable DPI, pass to `tesseract.js` for recognition. Gracefully fail if `tesseract.js` is not installed (throw `DependencyError`). | Status: not_done
- [ ] **Replace empty text with OCR text** — Use recognized text in place of empty extracted text for scanned pages. | Status: not_done
- [ ] **Mark OCR-applied pages** — Set `ocrApplied: true` in `PageInfo` for affected pages. | Status: not_done
- [ ] **Support ocr.language option** — Pass language to `tesseract.js`. Default: `'eng'`. | Status: not_done
- [ ] **Support ocr.dpi option** — Configure rendering DPI. Default: 300. | Status: not_done
- [ ] **Support ocr.pages option** — Limit OCR to specific pages. | Status: not_done
- [ ] **OCR is disabled by default** — Only activate when `ocr.enabled: true`. | Status: not_done

### 4D: CLI Polish

- [ ] **Implement all remaining CLI flags** — Ensure every flag from Section 15 is fully wired to the conversion pipeline. | Status: not_done
- [ ] **Implement CLI error messages** — Descriptive error messages for missing files, unsupported formats, invalid options. | Status: not_done
- [ ] **Implement CLI progress reporting** — When `--verbose`, show per-page/per-slide progress. | Status: not_done
- [ ] **Implement CLI warning output** — When not `--quiet`, print conversion warnings to stderr. | Status: not_done

### 4E: Performance Optimization

- [ ] **Implement font metric caching** — Cache font size and weight per font name, avoid re-computing per text item. | Status: not_done
- [ ] **Implement single-pass layout analysis** — Combine reading order, column detection, and heading detection into a single pass through sorted text items where possible. | Status: not_done
- [ ] **Implement lazy image extraction** — Skip page operator list scanning entirely when `images.mode` is `'skip'`. | Status: not_done
- [ ] **Create performance benchmark suite** — Benchmark conversion times for documents of various sizes and formats against the targets in Section 18. | Status: not_done
- [ ] **Profile memory usage** — Measure peak memory for large documents (100+ page PDFs with images). Verify sequential page processing limits memory. | Status: not_done

### 4F: Edge Case Hardening

- [ ] **Handle empty documents** — Zero-page PDF, empty DOCX, empty PPTX. Return empty markdown with appropriate metadata. | Status: not_done
- [ ] **Handle image-only PDF without OCR** — Return empty/minimal markdown with a warning. | Status: not_done
- [ ] **Handle DOCX with no paragraphs** — Only tables or images. Convert what exists. | Status: not_done
- [ ] **Handle PPTX with blank slides** — No text boxes. Emit slide heading with no content. | Status: not_done
- [ ] **Handle HTML fragments** — No `<body>` or `<html>` tags. Process as content. | Status: not_done
- [ ] **Handle single heading level documents** — Avoid incorrect normalization. | Status: not_done
- [ ] **Handle single-row tables** — Header only, no data rows. Emit valid GFM table. | Status: not_done
- [ ] **Handle single-column tables** — Emit valid GFM table. | Status: not_done
- [ ] **Handle extremely long paragraphs** — 10,000+ characters. No truncation, no performance degradation. | Status: not_done
- [ ] **Handle deeply nested lists** — 10+ nesting levels. Correct indentation. | Status: not_done
- [ ] **Handle rotated PDF pages** — Detect page rotation and adjust coordinate system. | Status: not_done
- [ ] **Handle DOCX with track changes** — Extract only current document state, ignore change tracking markup. | Status: not_done
- [ ] **Handle malformed HTML** — Unclosed elements, nesting errors. Rely on cheerio's forgiving parser. | Status: not_done
- [ ] **Handle file not found** — Throw appropriate error with descriptive message. | Status: not_done
- [ ] **Handle unrecognizable Buffer format** — Throw `FormatDetectionError`. | Status: not_done
- [ ] **Handle AbortSignal mid-conversion** — Check signal at pipeline stages, throw on abort. | Status: not_done
- [ ] **Handle Unicode edge cases** — CJK text, RTL text, emoji, mathematical symbols. Verify correct extraction and rendering. | Status: not_done
- [ ] **Handle PDF with rotated text** — Text at non-standard angles may produce garbled output; emit warning. | Status: not_done
- [ ] **Handle PDF form fields** — Not extracted; emit warning if detected. | Status: not_done

### 4G: Phase 4 Tests

- [ ] **Write PPTX slide parser tests** — Test text extraction from text boxes, title extraction, positional ordering. | Status: not_done
- [ ] **Write PPTX speaker notes tests** — Test inline and separate styles, include/exclude option. | Status: not_done
- [ ] **Write PPTX table tests** — Test slide table extraction. | Status: not_done
- [ ] **Write PPTX image tests** — Test image extraction from media directory. | Status: not_done
- [ ] **Write PPTX integration test** — Full end-to-end conversion of a PPTX with slides, text, tables, and notes. | Status: not_done
- [ ] **Write OCR unit tests** — Test scanned page detection, tesseract.js integration (mocked), OCR text replacement. | Status: not_done
- [ ] **Write OCR missing dependency test** — Verify `DependencyError` when `tesseract.js` is not installed. | Status: not_done
- [ ] **Write image handler mode tests** — Test all 5 image modes (extract, inline, skip, reference, buffer) for each format. | Status: not_done
- [ ] **Write CLI integration tests** — Test all CLI flags, file/URL input, stdout/file output, --json mode, --quiet, --verbose, exit codes for various error conditions. | Status: not_done
- [ ] **Write edge case tests** — Empty documents, image-only PDFs, blank slides, HTML fragments, malformed HTML, deeply nested lists, single-row tables, Unicode text, AbortSignal cancellation. | Status: not_done
- [ ] **Write cross-format consistency test** — Same content in PDF, DOCX, and HTML. Convert each and verify structurally equivalent markdown output. | Status: not_done
- [ ] **Write determinism test (all formats)** — Convert each format twice with same options, verify identical output. | Status: not_done
- [ ] **Write createConverter() factory tests** — Test option merge precedence (per-call > factory > defaults), test all methods on DocumentConverter instance. | Status: not_done
- [ ] **Create PPTX test fixture** — `simple.pptx` (5 slides, text, table, speaker notes). | Status: not_done
- [ ] **Write performance benchmark tests** — Verify conversion times meet targets from Section 18 for each format and document size. | Status: not_done

---

## Phase 5: Documentation & Publishing

- [ ] **Write README.md** — Comprehensive readme with: overview, installation, quick start, API reference for `convert()`, `convertPDF()`, `convertDOCX()`, `convertPPTX()`, `convertHTML()`, `createConverter()`, `detectFormat()`. Include examples for every major use case (RAG pipeline, knowledge base, content migration, document processing API, CLI batch). Document all options with defaults. Document CLI usage with all flags. Document supported formats with quality levels and limitations. | Status: not_done
- [ ] **Add JSDoc comments to all public exports** — `convert`, `convertPDF`, `convertDOCX`, `convertPPTX`, `convertHTML`, `createConverter`, `detectFormat`, all types, all error classes. | Status: not_done
- [ ] **Version bump to 0.1.0** — Already at 0.1.0 in package.json. Bump appropriately per phase: 0.1.0 for Phase 1, 0.2.0 for Phase 2, 0.3.0 for Phase 3, 1.0.0 for Phase 4. | Status: not_done
- [ ] **Verify package.json fields** — Ensure `description`, `keywords`, `author`, `repository`, `homepage`, and `license` are set. | Status: not_done
- [ ] **Verify build produces correct dist output** — Run `npm run build`, verify `dist/index.js`, `dist/index.d.ts`, and `dist/cli.js` exist with correct exports. | Status: not_done
- [ ] **Verify npm publish dry run** — Run `npm publish --dry-run` and verify the correct files are included (only `dist/`). | Status: not_done
- [ ] **Final test suite run** — All unit tests, integration tests, edge case tests, and performance benchmarks pass. | Status: not_done
- [ ] **Final lint run** — `npm run lint` passes with zero errors and zero warnings. | Status: not_done
