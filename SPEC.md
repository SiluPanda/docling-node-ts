# docling-node-ts -- Specification

## 1. Overview

`docling-node-ts` is a document-to-markdown conversion library that transforms PDF, DOCX, PPTX, HTML, and plain text files into clean, structure-preserving markdown suitable for RAG (Retrieval-Augmented Generation) pipelines, knowledge base construction, and LLM ingestion. It accepts a file path, Buffer, URL, or ReadableStream, detects the input format, runs the appropriate format-specific parser, extracts text with structural elements (headings, tables, lists, images, code blocks), reconstructs reading order and document layout, and produces a `ConversionResult` containing the markdown string, extracted metadata, image references, and per-page breakdowns. No Python runtime, no cloud API, no external service is required -- the entire conversion pipeline runs locally in Node.js.

The gap this package fills is the single most discussed pain point in AI JavaScript development. Every RAG tutorial written in Node.js hits the same wall: how do you get structured text out of a PDF, Word document, or PowerPoint file? The Python ecosystem has IBM's Docling, Unstructured, LlamaParse, PyMuPDF, and a rich set of document processing libraries that produce structured, embedding-ready output. The JavaScript ecosystem has almost nothing.

The existing JavaScript tools are either too primitive or too narrow. `pdf-parse` and its fork `pdf-parse-new` extract raw text from PDFs with no awareness of layout, headings, tables, columns, or images -- the output is a flat string where multi-column text is interleaved, table rows are garbled, and all structural hierarchy is lost. `pdfjs-dist` (Mozilla's PDF.js) provides low-level text extraction with positioning data, but the developer must write their own layout analysis, table detection, heading recognition, and markdown generation on top of it. `mammoth` converts DOCX to HTML but not to markdown, and provides no table-aware or heading-aware chunking. `pptx-parser` handles PowerPoint at a basic level. No package combines these into a unified, format-detecting, structure-preserving, markdown-producing pipeline.

The consequence is that JavaScript developers building RAG pipelines must either shell out to Python (adding an entire Python runtime as a deployment dependency), pay for cloud APIs (Google Document AI, AWS Textract, Azure AI Document Intelligence -- adding latency, cost, and data-residency concerns), or accept garbage-quality text extraction that produces terrible embeddings and terrible retrieval. A document that contains a financial table, a heading hierarchy, and inline images produces an embedding-useless blob when processed with `pdf-parse`. The headings become indistinguishable from body text. The table rows become interleaved character sequences. The images are silently discarded. Downstream, the RAG pipeline retrieves chunks that contain meaningless text fragments, and the LLM produces answers based on corrupted context.

`docling-node-ts` solves this by implementing a complete document-to-markdown pipeline in TypeScript. For PDFs, it uses `pdfjs-dist` (Mozilla's PDF.js) to extract text with positioning data, then applies heuristic analysis to detect headings (from font size and weight), reconstruct tables (from text positioning and alignment), identify multi-column layouts (from text x-coordinates), remove headers and footers (from repeated text at page boundaries), and extract embedded images. For DOCX, it parses the Office Open XML structure to map Word styles to markdown headings, preserve lists and tables, and extract embedded images. For PPTX, it processes slides sequentially, extracting text from text boxes and shapes, tables from slide tables, and speaker notes. For HTML, it uses readability-based article extraction to strip navigation, ads, and scripts, then maps HTML elements to markdown. The output is clean markdown with proper heading hierarchy, GFM pipe tables, formatted lists, code blocks, and image references -- ready for chunking by `chunk-smart` and embedding.

The package provides both a TypeScript/JavaScript API for programmatic use and a CLI for converting documents from the terminal. The API returns structured `ConversionResult` objects with the markdown string, document metadata, extracted images, table data, and conversion warnings. The CLI reads from a file path or URL and writes markdown to stdout or a file. Both interfaces support format-specific options, image handling configuration, and quality/speed tradeoffs.

---

## 2. Goals and Non-Goals

### Goals

- Provide a single function (`convert`) that accepts a document (file path, Buffer, URL, or ReadableStream), auto-detects the format, converts it to markdown, and returns a `ConversionResult` with the markdown string, metadata, images, and warnings.
- Provide format-specific functions (`convertPDF`, `convertDOCX`, `convertPPTX`, `convertHTML`) for callers who know the input format and want access to format-specific options.
- Provide a factory function (`createConverter`) that creates a configured converter instance with preset options, avoiding repeated option parsing across multiple conversions.
- Support five input formats: PDF, DOCX, PPTX, HTML, and plain text.
- Detect input format automatically from file extension, magic bytes, and MIME type.
- Extract and preserve document structure: headings (with correct hierarchy), paragraphs, lists (ordered, unordered, nested), tables (with headers and alignment), code blocks, blockquotes, hyperlinks, and image references.
- For PDFs, apply heuristic layout analysis: heading detection from font metrics, table reconstruction from text positioning, multi-column reading order, header/footer removal, and page number stripping.
- Extract embedded images to files or buffers and insert markdown image references (`![alt](path)`) in the output.
- Extract document metadata: title, author, creation date, page count, word count, and format-specific properties.
- Provide a CLI (`docling-node-ts`) that converts a file or URL to markdown and writes to stdout or a file.
- Produce deterministic output: the same input with the same options always produces the same markdown. No LLM calls, no network access during conversion (except for URL input fetching and optional OCR), no non-determinism.
- Target Node.js 18 and above.

### Non-Goals

- **Not an AI-powered layout analyzer.** This package uses heuristic analysis (font size thresholds, text positioning, alignment patterns) to detect headings, tables, and layout structure. It does not use machine learning models for layout detection. IBM's Docling uses deep learning models (DocLayNet-based) for page layout segmentation. Heuristic approaches handle the majority of well-structured documents; they degrade on complex layouts (overlapping text boxes, decorative elements, unconventional reading orders). For documents requiring AI-powered analysis, use Docling via Python or a cloud API.
- **Not an OCR engine.** This package extracts text from digital (text-based) PDFs. For scanned PDFs and images, optional OCR integration is available via `tesseract.js`, but OCR accuracy and language support are delegated entirely to Tesseract. Native OCR is not implemented. For production OCR, consider dedicated OCR services.
- **Not a PDF renderer.** This package extracts content from PDFs for text-based consumption. It does not render PDFs to images, display them in a browser, or produce pixel-accurate visual output. For PDF rendering, use `pdfjs-dist` directly or a browser-based PDF viewer.
- **Not a document editor.** This package converts documents to markdown. It does not create, edit, or modify PDF, DOCX, or PPTX files. For document creation, use `pdfkit` (PDF), `docx` (DOCX), or `pptxgenjs` (PPTX).
- **Not a web scraper.** This package converts HTML content to markdown. It does not fetch web pages, follow links, handle JavaScript-rendered content, or manage cookies and sessions. For web scraping, use `puppeteer`, `playwright`, or `cheerio` with `fetch`. The caller provides the HTML content; this package converts it.
- **Not a markdown parser or renderer.** This package produces markdown as output. It does not parse markdown to AST, render markdown to HTML, or validate markdown syntax. For markdown parsing, use `remark`, `marked`, or `markdown-it`.
- **Not a chunking library.** This package produces a single markdown string from a document. Splitting that markdown into chunks for embedding is the responsibility of `chunk-smart`. The canonical pipeline is: `docling-node-ts` (convert) then `chunk-smart` (chunk) then `embed-cache` (embed).
- **Not a LangChain integration.** This package is framework-independent. It returns plain strings and typed objects. Wrapping the output into LangChain `Document` objects is trivial and left to the caller.

---

## 3. Target Users and Use Cases

### RAG Pipeline Builders

Developers constructing retrieval-augmented generation pipelines who need to ingest documents from heterogeneous sources -- PDF reports, Word documents, PowerPoint presentations, HTML pages -- and convert them to clean text for embedding. The current workflow requires either a Python sidecar process running Docling/Unstructured, a paid cloud API, or accepting the garbage output of `pdf-parse`. `docling-node-ts` eliminates the Python dependency and the cloud API cost. A typical integration is: `const { markdown } = await convert('./quarterly-report.pdf'); const chunks = chunk(markdown, { maxChunkSize: 512 });`.

### Knowledge Base Construction

Teams building internal knowledge bases that ingest corporate documents -- policy manuals, technical specifications, training materials, meeting notes -- stored as PDFs and Word files on SharePoint, Google Drive, or local file systems. These documents contain headings, tables, and images that must be preserved in the markdown output for meaningful search and retrieval. The heading hierarchy enables section-aware search; the preserved tables enable structured data extraction by `table-chunk`.

### Content Migration

Organizations migrating content between systems -- from a legacy CMS that exports DOCX to a modern system that consumes markdown, from PDF archives to a searchable wiki, from PowerPoint slide decks to documentation sites. `docling-node-ts` produces clean markdown that requires minimal manual cleanup, preserving the document's structural intent.

### Document Processing APIs

Backend engineers building document processing endpoints -- an API that accepts a file upload, converts it to markdown, chunks it, embeds it, and stores it in a vector database. The API runs in Node.js. Adding a Python runtime or calling a cloud API for document conversion adds complexity, latency, and failure modes. `docling-node-ts` keeps the entire pipeline in a single runtime.

### PDF Report Processing

Data teams processing structured PDF reports -- financial statements, regulatory filings, research papers, medical records -- where table extraction and heading detection are critical. A financial statement PDF contains tables of numerical data that must be extracted with column headers intact. `docling-node-ts` reconstructs these tables as GFM markdown tables, which `table-chunk` can then chunk row-by-row with header preservation.

### CLI and Shell Script Authors

Engineers who convert documents in shell pipelines. `docling-node-ts report.pdf > report.md` -- a one-line conversion from the terminal. Batch processing: `for f in *.pdf; do docling-node-ts "$f" -o "${f%.pdf}.md"; done`. The CLI bridges document conversion and standard Unix text tools.

### Integration with npm-master Ecosystem

Developers using other packages in the npm-master monorepo. `docling-node-ts` is the first stage in the document ingestion pipeline: it produces the markdown that `chunk-smart` chunks, `table-chunk` extracts tables from, `embed-cache` embeds, `context-packer` packs into LLM context windows, and `rag-prompt-builder` composes into prompts. `ai-file-router` can detect document files and route them to `docling-node-ts` for conversion.

---

## 4. Core Concepts

### Document Conversion

Document conversion is the process of transforming a binary or structured document (PDF, DOCX, PPTX) or a markup document (HTML) into a clean, structured text representation -- in this case, markdown. Conversion is lossy by nature: documents contain visual formatting (colors, fonts, page layout, decorative elements) that has no equivalent in markdown. The conversion preserves semantic structure (headings, lists, tables, code, images) and discards presentation-only formatting (font colors, background shading, page margins, text kerning). The goal is not pixel-accurate reproduction but semantic-accurate representation.

### Format Detection

Format detection identifies the type of a document input so the correct parser can be invoked. Detection uses three signals in priority order: (1) explicit format specification by the caller, (2) file extension (`.pdf`, `.docx`, `.pptx`, `.html`, `.htm`, `.txt`, `.md`), (3) magic bytes (the first bytes of the file content that identify the format -- `%PDF` for PDF, `PK` for ZIP-based Office formats, `<!DOCTYPE` or `<html` for HTML). For Buffer inputs without a file extension, magic bytes are the primary detection mechanism. DOCX and PPTX are both ZIP archives; distinguishing between them requires reading the ZIP's `[Content_Types].xml` to identify the Office document type.

### Content Extraction

Content extraction is the process of pulling text, images, and structural elements from a parsed document. For PDFs, this means reading text content items with their positions, font information, and page coordinates from `pdfjs-dist`. For DOCX, this means traversing the XML tree of `document.xml` and mapping styles to semantic roles. For HTML, this means traversing the DOM and mapping elements to markdown. Extraction produces an intermediate representation -- a sequence of content blocks with type annotations (heading, paragraph, table, list, image, code) -- that is then serialized to markdown.

### Layout Analysis

Layout analysis is the process of understanding the spatial arrangement of content on a page and converting it to linear reading order. This is primarily relevant for PDFs, where content is positioned absolutely on a two-dimensional page. Layout analysis includes: detecting multi-column text and merging columns into reading order, identifying headers and footers by finding repeated text at page boundaries, detecting page numbers, identifying sidebar content, and determining the correct reading sequence for text blocks that may not be stored in visual order in the PDF structure. Layout analysis is heuristic -- it uses positional thresholds, statistical patterns, and structural rules, not machine learning.

### Markdown Output

The markdown output is the final product of the conversion pipeline. It is a UTF-8 string using GitHub Flavored Markdown (GFM) syntax, containing ATX headings (`#`, `##`, etc.), paragraphs separated by blank lines, unordered and ordered lists with nesting, GFM pipe tables with optional alignment, fenced code blocks with language hints where detectable, inline formatting (bold, italic, links), and image references (`![alt](path)`). The output is designed to be immediately consumable by `chunk-smart` for RAG chunking, renderable by any GFM-compatible viewer, and readable by humans.

### RAG-Ready

"RAG-ready" means the markdown output is optimized for the retrieval-augmented generation pipeline. Specifically: headings provide section boundaries for semantic chunking, tables use the GFM pipe format that `table-chunk` can parse and chunk with header preservation, images have descriptive alt text for embedding, noise elements (headers, footers, page numbers, navigation) are removed so they do not pollute embeddings, and the text is clean (no garbage characters, no encoding artifacts, no raw PDF operator sequences). The output is not merely "text extracted from a document" -- it is text structured for machines to process.

---

## 5. Supported Formats

### 5.1 PDF

PDF is the hardest format to convert and the most important. PDFs are the dominant format for business documents, academic papers, government filings, technical manuals, and financial reports. A PDF file is not a text document -- it is a page description language that positions text characters, lines, and images on two-dimensional pages. There is no inherent concept of "heading," "paragraph," "table," or "list" in a PDF. These structures must be inferred from visual properties: a heading is text with a larger font size or bold weight; a table is a grid of text positioned in aligned rows and columns; a list is text preceded by bullet characters or sequential numbers. Reconstruction of these structures from raw positioned text is the core technical challenge of PDF conversion.

**What is extracted:**

- **Text content**: All text from all pages, in reading order. Text is extracted via `pdfjs-dist`, which returns text content items with string values, x/y positions, font names, and font sizes.
- **Headings**: Detected from font size, font weight (bold), and position. Text with a font size significantly larger than the body text or with a bold variant of the body font is classified as a heading. Heading levels (H1-H6) are assigned based on relative font size (largest = H1, next = H2, etc.).
- **Tables**: Detected from text positioning -- text items aligned in grid patterns with consistent column x-coordinates and row y-coordinates. Ruled lines (horizontal and vertical lines in the PDF graphics stream) provide additional table boundary signals.
- **Lists**: Detected from bullet characters (U+2022, U+25CF, U+25CB, -, *) or sequential numbers/letters at the start of text blocks with consistent indentation.
- **Images**: Extracted as embedded image objects from the PDF structure. Images are saved as files (PNG or JPEG) and referenced in the markdown as `![image](path)`.
- **Links**: Hyperlink annotations are preserved as markdown links `[text](url)`.
- **Code blocks**: Detected from monospace font usage over multiple consecutive lines.

**Limitations:**

- Scanned PDFs (image-only) produce no text without OCR. Optional OCR via `tesseract.js` is available but adds significant processing time and depends on OCR accuracy.
- Complex layouts with overlapping text boxes, rotated text, watermarks, and decorative elements may produce incorrect reading order or garbled output.
- Tables without ruled lines and with irregular spacing are harder to detect. Table detection accuracy depends on how consistently the text is aligned.
- Form fields, annotations, and interactive PDF elements are not extracted.
- Encrypted or password-protected PDFs require the password to be provided.
- Mathematical equations rendered as embedded fonts (common in academic papers) may produce incorrect Unicode characters.

**Quality level:** Good for well-structured digital PDFs (business documents, reports, papers). Moderate for complex layouts. Poor for scanned documents without OCR.

**Dependencies:** `pdfjs-dist` (Mozilla PDF.js).

### 5.2 DOCX

DOCX is the Microsoft Word format based on Office Open XML (OOXML). A DOCX file is a ZIP archive containing XML files that describe the document's content (`word/document.xml`), styles (`word/styles.xml`), relationships (`word/_rels/document.xml.rels`), and media files (`word/media/`). Unlike PDF, DOCX preserves semantic structure explicitly: headings are paragraphs with heading styles (`Heading 1`, `Heading 2`, etc.), lists have list-level formatting, tables are XML elements with rows and cells, and images are embedded media files referenced by relationship IDs.

**What is extracted:**

- **Text content**: All paragraph text, preserving run-level formatting (bold, italic, underline, strikethrough, superscript, subscript, inline code).
- **Headings**: Mapped directly from Word styles. `Heading 1` becomes `#`, `Heading 2` becomes `##`, through `Heading 6` becoming `######`. Custom heading styles mapped to outline levels are also detected.
- **Lists**: Numbered lists become ordered markdown lists (`1.`). Bulleted lists become unordered lists (`-`). Nested lists preserve indentation levels.
- **Tables**: Rows and cells extracted from the table XML. Merged cells (horizontal and vertical spans) are expanded. Cell content (including nested paragraphs, lists, and images) is flattened to text. The table is emitted as a GFM pipe table.
- **Images**: Extracted from the `word/media/` directory of the ZIP archive. Inline images and floating images are both captured. Each image is saved as a file and referenced in the markdown.
- **Hyperlinks**: Internal and external hyperlinks are preserved as markdown links.
- **Footnotes and endnotes**: Extracted and appended at the end of the markdown (or inline, configurable).
- **Headers and footers**: Optionally extracted or ignored (default: ignored, as they are typically noise for RAG).

**Limitations:**

- Complex Word formatting (text boxes, shapes, SmartArt, charts, equations, embedded OLE objects) is not fully supported. Text boxes are extracted as inline text; shapes and SmartArt are ignored or extracted as plain text without visual structure.
- Track changes and comments are ignored (only the current document state is extracted).
- Password-protected DOCX files are not supported.
- Custom XML parts and macros are ignored.

**Quality level:** High. DOCX preserves semantic structure explicitly, making conversion to markdown straightforward and accurate.

**Dependencies:** `jszip` (ZIP extraction), custom XML parser using Node.js built-in XML parsing or a lightweight XML parser.

### 5.3 PPTX

PPTX is the Microsoft PowerPoint format, also based on Office Open XML. A PPTX file is a ZIP archive containing XML files for each slide (`ppt/slides/slide1.xml`, etc.), slide layouts, masters, and media. Each slide contains shapes (text boxes, images, tables, charts), and each text box contains paragraphs with runs.

**What is extracted:**

- **Slide content**: Each slide becomes a markdown section headed by `## Slide N: Title` (where the title is extracted from the slide's title placeholder, if present).
- **Text boxes**: All text from all text boxes on each slide, ordered by position (top-to-bottom, left-to-right).
- **Tables**: Slide tables extracted as GFM pipe tables.
- **Images**: Extracted from the `ppt/media/` directory and referenced in the markdown.
- **Speaker notes**: Extracted from `ppt/notesSlides/` and appended after each slide's content (configurable: include, exclude, or separate section).
- **Slide transitions and animations**: Ignored (no textual representation).
- **Hyperlinks**: Preserved as markdown links.

**Limitations:**

- Charts and SmartArt diagrams are not converted to text or markdown tables. Their embedded data may be partially extractable but is not guaranteed.
- Grouped shapes are flattened; spatial relationships between shapes on a slide are approximated by positional ordering but may not perfectly reflect visual layout.
- Master slide and layout text (common elements across slides like company logos, footers) is excluded by default to avoid duplication.
- Heavily visual presentations (minimal text, mostly images and diagrams) produce sparse markdown.

**Quality level:** Good for text-heavy presentations. Moderate for mixed content. Limited for visual-heavy presentations.

**Dependencies:** `jszip` (ZIP extraction), custom XML parser.

### 5.4 HTML

HTML is an already-structured markup language, but raw web pages contain substantial noise: navigation bars, sidebars, footers, advertisements, cookie banners, JavaScript, CSS, and other non-content elements. Converting HTML to markdown requires both element mapping (HTML tags to markdown syntax) and content extraction (identifying the main article content and stripping noise).

**What is extracted:**

- **Article content**: The main content of the page, identified using readability-based algorithms (similar to Mozilla Readability). Navigation, sidebars, ads, scripts, styles, and other non-content elements are stripped.
- **Headings**: `<h1>` through `<h6>` mapped to `#` through `######`.
- **Paragraphs**: `<p>` elements become markdown paragraphs separated by blank lines.
- **Lists**: `<ul>` becomes unordered lists (`-`), `<ol>` becomes ordered lists (`1.`). Nested lists preserve indentation.
- **Tables**: `<table>` elements converted to GFM pipe tables. `<thead>`, `<tbody>`, `<th>`, `<td>` are parsed. `rowspan` and `colspan` are expanded into the grid.
- **Code blocks**: `<pre>` and `<code>` elements become fenced code blocks. Language hints from `class="language-*"` attributes are preserved.
- **Images**: `<img>` elements become `![alt](src)` references. `alt` attributes are used as alt text.
- **Links**: `<a>` elements become `[text](href)` markdown links.
- **Blockquotes**: `<blockquote>` elements become `>` prefixed blocks.
- **Inline formatting**: `<strong>`/`<b>` becomes `**bold**`, `<em>`/`<i>` becomes `*italic*`, `<code>` becomes `` `code` ``, `<del>`/`<s>` becomes `~~strikethrough~~`.
- **Metadata**: `<title>`, `<meta name="author">`, `<meta name="description">`, `<meta name="date">`, and Open Graph tags are extracted into the metadata object.

**Limitations:**

- JavaScript-rendered content (SPAs, dynamic pages) is not executed. Only the static HTML is processed. For dynamic content, the caller must use a headless browser (Puppeteer, Playwright) to render the page and pass the resulting HTML.
- Complex CSS layouts (flexbox, grid) that determine visual reading order are not analyzed. Content order follows DOM order.
- Embedded SVGs are ignored (no text extraction from SVG elements).
- `<iframe>` content is not fetched or processed.
- Web components and Shadow DOM content are not traversed.

**Quality level:** High for well-structured HTML (articles, documentation, blog posts). Moderate for complex web applications. Readability extraction quality depends on the page's HTML structure.

**Dependencies:** `cheerio` (HTML parsing and DOM manipulation), custom readability implementation or `@mozilla/readability` adapted for Node.js.

### 5.5 Plain Text and Markdown

Plain text (`.txt`) and markdown (`.md`) files are passed through with minimal processing. Plain text is wrapped in appropriate paragraph blocks. Existing markdown is cleaned up: normalized whitespace, fixed line endings, removed trailing spaces, and optionally reformatted for consistency.

**What is extracted:**

- The full text content, with normalized whitespace and line endings.

**Limitations:**

- No structural analysis beyond what is already present in the text.

**Quality level:** Perfect (passthrough with cleanup only).

**Dependencies:** None.

---

## 6. Conversion Pipeline

Every document conversion follows the same six-stage pipeline. Format-specific logic is encapsulated within individual stages; the pipeline itself is format-agnostic.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         convert(input, options)                       │
│                                                                      │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐  │
│  │  Stage 1   │   │  Stage 2   │   │  Stage 3   │   │  Stage 4   │  │
│  │  Format    │──▶│  Parse     │──▶│  Extract    │──▶│  Layout    │  │
│  │  Detection │   │            │   │  Content   │   │  Analysis  │  │
│  └────────────┘   └────────────┘   └────────────┘   └────────────┘  │
│                                                           │          │
│                                          ┌────────────┐   │          │
│                                          │  Stage 6   │   │          │
│                                          │  Cleanup   │◀──┘          │
│                                          │            │              │
│                                          └─────┬──────┘              │
│                                                │                     │
│                                          ┌─────▼──────┐              │
│                                          │  Stage 5   │              │
│                                          │  Markdown  │              │
│                                          │  Generate  │              │
│                                          └─────┬──────┘              │
│                                                │                     │
│                                          ConversionResult            │
└──────────────────────────────────────────────────────────────────────┘
```

### Stage 1: Format Detection

Determines the document format from the input. Detection uses three signals in priority order:

1. **Explicit format**: If the caller provides `options.format`, that format is used directly.
2. **File extension**: If the input is a file path or URL, the extension is matched: `.pdf` = PDF, `.docx` = DOCX, `.pptx` = PPTX, `.html`/`.htm` = HTML, `.txt` = text, `.md` = markdown.
3. **Magic bytes**: If the input is a Buffer or stream without an extension, the first bytes are examined:
   - `%PDF` (bytes `25 50 44 46`) = PDF.
   - `PK` (bytes `50 4B 03 04`) = ZIP-based format (DOCX or PPTX). Disambiguation requires reading the ZIP's `[Content_Types].xml`: presence of `application/vnd.openxmlformats-officedocument.wordprocessingml` = DOCX; `application/vnd.openxmlformats-officedocument.presentationml` = PPTX.
   - `<!DOCTYPE` or `<html` (case-insensitive) = HTML.
   - All other inputs = plain text.

If detection fails, the conversion throws a `FormatDetectionError` with a descriptive message.

### Stage 2: Format-Specific Parsing

Invokes the appropriate parser for the detected format. Each parser reads the raw input and produces a parsed representation:

- **PDF parser**: Uses `pdfjs-dist` to load the document and extract `TextContent` items from each page, plus page dimensions and image references.
- **DOCX parser**: Uses `jszip` to unzip the archive, reads `word/document.xml`, `word/styles.xml`, and `word/_rels/document.xml.rels`, and builds an XML tree of the document content.
- **PPTX parser**: Uses `jszip` to unzip the archive, reads each `ppt/slides/slideN.xml` and `ppt/notesSlides/notesSlideN.xml`, and builds slide content trees.
- **HTML parser**: Uses `cheerio` to parse the HTML into a DOM tree.
- **Text parser**: Reads the raw text string. No parsing needed.

### Stage 3: Content Extraction

Traverses the parsed representation and extracts content blocks. Each content block has a type (`heading`, `paragraph`, `table`, `list`, `image`, `code`, `blockquote`, `link`, `footnote`, `page-break`) and associated data. The extraction is format-specific but produces a format-independent intermediate representation:

```typescript
interface ContentBlock {
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'image' | 'code'
      | 'blockquote' | 'horizontal-rule' | 'page-break';
  level?: number;          // For headings: 1-6
  text?: string;           // For paragraphs, headings, code blocks
  rows?: string[][];       // For tables: [headers, ...dataRows]
  alignment?: ('left' | 'center' | 'right' | 'none')[];  // For tables
  items?: ListItem[];      // For lists
  language?: string;       // For code blocks
  src?: string;            // For images: file path or URL
  alt?: string;            // For images: alt text
  href?: string;           // For links
  ordered?: boolean;       // For lists
  page?: number;           // Source page number (PDF, PPTX)
}

interface ListItem {
  text: string;
  children?: ListItem[];   // Nested items
}
```

### Stage 4: Layout Analysis

Applies to PDF only (other formats have explicit structure). Processes the raw positioned text items and applies heuristic analysis:

1. **Reading order reconstruction**: Groups text items by page, sorts by position (top-to-bottom, left-to-right within tolerance), and merges adjacent items into lines and paragraphs.
2. **Column detection**: Analyzes the distribution of text x-coordinates to identify multi-column layouts. If text clusters around two or more distinct x-ranges, each range is a column. Text is merged column-by-column (all of column 1 before column 2).
3. **Heading detection**: Identifies headings from font metrics. Text items whose font size exceeds the median body font size by a configurable threshold (default: 1.2x for H2+, 1.5x for H1) or whose font name includes "Bold" variants are classified as headings.
4. **Table detection**: Groups text items into grid cells based on positional alignment. Rows are detected from y-coordinate clustering; columns from x-coordinate clustering. Ruled lines in the PDF graphics stream provide additional boundary signals.
5. **Header/footer removal**: Identifies text that repeats at the top or bottom of every page (or most pages) and removes it. Detection uses text content matching with position thresholds.
6. **Page number removal**: Identifies isolated numbers at the top or bottom of pages that match a sequential pattern and removes them.
7. **List detection**: Identifies text lines that begin with bullet characters or sequential numbers at consistent indentation levels.

### Stage 5: Markdown Generation

Serializes the sequence of `ContentBlock` objects into a GFM markdown string.

| Content Block | Markdown Output |
|---------------|----------------|
| `heading` (level N) | `#` repeated N times, followed by space and text |
| `paragraph` | Text followed by a blank line |
| `table` | GFM pipe table with header row, separator row, and data rows |
| `list` (unordered) | `- ` prefix, nested items indented with 2 spaces |
| `list` (ordered) | `1. ` prefix, nested items indented with 3 spaces |
| `image` | `![alt](src)` |
| `code` | Fenced code block with language hint |
| `blockquote` | `> ` prefix on each line |
| `horizontal-rule` | `---` |
| `page-break` | `---` with optional `<!-- Page N -->` comment |

Table generation uses GFM pipe table syntax:

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

Alignment markers are added to the separator row when alignment information is available: `:---` for left, `:---:` for center, `---:` for right.

### Stage 6: Cleanup

Post-processes the generated markdown to fix common artifacts:

- **Whitespace normalization**: Collapse multiple consecutive blank lines to a maximum of two. Remove trailing whitespace from lines. Ensure the document ends with a single newline.
- **Encoding fixes**: Replace common encoding artifacts -- ligatures (`ﬁ` to `fi`, `ﬂ` to `fl`, `ﬀ` to `ff`), curly quotes to straight quotes (configurable), em/en dashes preserved as Unicode, soft hyphens removed.
- **Garbage character removal**: Remove null bytes, control characters (except newline and tab), and PDF operator fragments that may leak through extraction.
- **Heading normalization**: Ensure heading levels form a valid hierarchy (no jumps from H1 to H4 without H2 and H3 in between -- optionally correct by shifting levels).
- **Table cleanup**: Ensure all table rows have the same number of cells (pad short rows with empty cells). Escape pipe characters in cell content (`|` to `\|`).
- **Link deduplication**: Remove duplicate links that may result from overlapping extraction methods.

---

## 7. PDF Processing

PDF processing is the most complex format handler and the primary technical contribution of this package. This section specifies each component of the PDF conversion pipeline in detail.

### 7.1 Text Extraction via pdfjs-dist

`pdfjs-dist` (the npm distribution of Mozilla's PDF.js) is the industry-standard JavaScript library for PDF processing. It provides a `getDocument()` function that loads a PDF and returns page objects. Each page's `getTextContent()` method returns an array of text content items, each containing:

- `str`: The text string.
- `dir`: Text direction (`ltr` or `rtl`).
- `transform`: A 6-element transformation matrix `[a, b, c, d, e, f]` where `e` is the x-coordinate and `f` is the y-coordinate. The font size can be derived from `Math.sqrt(a*a + b*b)`.
- `fontName`: The internal font name reference.
- `hasEOL`: Whether the item ends with a newline.

The PDF parser processes pages sequentially, collects all text items per page, and passes them to the layout analysis stages.

**Font information**: `pdfjs-dist` provides a `commonObjs` map that maps font name references to font data objects containing the actual font family name (`name` field) and whether the font is a standard font. Bold fonts are detected from font names containing "Bold," "Bd," or "Heavy." Italic fonts are detected from names containing "Italic," "It," or "Oblique." Monospace fonts are detected from names matching common monospace families ("Courier," "Consolas," "Monaco," "Menlo").

### 7.2 Heading Detection

Headings in PDFs are visually distinguished from body text by larger font size, bold weight, or both. Heading detection is a two-pass process:

**Pass 1: Font metric collection.** Scan all text items across all pages. Build a histogram of font sizes weighted by character count. The most common font size is the "body font size." Build a set of distinct font sizes that appear in the document.

**Pass 2: Heading classification.** For each text item (or merged line of text items):

1. Compute the font size ratio: `item.fontSize / bodyFontSize`.
2. Classify based on ratio thresholds:
   - Ratio >= 2.0 and bold: H1
   - Ratio >= 2.0 and not bold: H2
   - Ratio >= 1.5 and bold: H1
   - Ratio >= 1.5 and not bold: H2
   - Ratio >= 1.2 and bold: H2
   - Ratio >= 1.2 and not bold: H3
   - Bold at body size and starts a new paragraph: H4
3. Additional signals:
   - Text that appears alone on a line (no adjacent text at the same y-coordinate) is more likely a heading.
   - Text at the beginning of a page is more likely a heading.
   - All-caps text at a larger font size is more likely a heading.

**Configurable thresholds**: The `pdfOptions.headingFontSizeRatio` option allows tuning the font size ratio thresholds. Documents with minimal font size variation (e.g., all text at 12pt, headings at 14pt) may need lower thresholds.

### 7.3 Table Detection

Tables in PDFs are not semantic elements -- they are text characters positioned in a grid pattern. Reconstructing table structure from raw text positions is one of the hardest problems in PDF processing.

**Algorithm:**

1. **Grid candidate detection**: Group text items by y-coordinate (within a tolerance of the body line height). Each group is a candidate row. Within each row, group items by x-coordinate (within column-alignment tolerance). Track the x-coordinates of column boundaries.

2. **Column alignment verification**: A set of candidate rows forms a table if:
   - At least 3 consecutive rows share the same number of columns (within tolerance).
   - Column x-coordinates are consistent across rows (the same set of x-boundaries appears in each row, within tolerance).
   - The spacing between columns is significantly larger than the spacing between words within a column.

3. **Ruled line detection** (optional, depends on PDF graphics stream access): If the PDF contains horizontal and vertical lines in the page's operator stream, these lines provide strong table boundary signals. Lines that form a grid pattern confirm table presence and refine column boundaries.

4. **Cell content extraction**: Once the grid is established, text items are assigned to cells based on their position within the grid. Multiple text items within a single cell are concatenated with spaces.

5. **Header row identification**: The first row of a detected table is treated as the header row if it has different formatting (bold font, different background in the original PDF) or if the content is clearly descriptive (non-numeric text while subsequent rows contain numbers).

6. **Table boundary termination**: A table ends when a row's column structure diverges significantly from the established pattern, or when a non-text element (image, horizontal rule, heading) interrupts the grid.

**Limitations:**

- Tables without ruled lines and with irregular column spacing are harder to detect.
- Nested tables (tables within table cells) are not detected.
- Tables that span multiple pages require cross-page merging, which uses heuristics (matching column counts and positions across page boundaries).
- Rotated tables are not detected.

### 7.4 Multi-Column Layout Detection

Many documents (academic papers, newspapers, magazines, some reports) use multi-column layouts. Without column detection, text from different columns is interleaved in the output, producing nonsensical text.

**Algorithm:**

1. **X-coordinate histogram**: For each page, build a histogram of text item starting x-coordinates. A multi-column layout produces clusters of x-coordinates separated by a significant gap (the column gutter).

2. **Gap detection**: Find gaps in the x-coordinate histogram that exceed a threshold (default: 2x the average character width). Each gap boundary defines a column separator.

3. **Column assignment**: Assign each text item to a column based on its x-coordinate. Items whose x-coordinate falls within a column's range belong to that column.

4. **Reading order**: For each page, read all text in column 1 (top to bottom), then all text in column 2, then column 3, etc. Within a column, text is ordered by y-coordinate (top to bottom).

5. **Full-width elements**: Text that spans the full page width (headings, figures, captions) is detected as full-width and placed in reading order relative to the column flow. A full-width heading above the columns is emitted before column content; a full-width element between column sections is emitted at the appropriate position.

**Configurable**: The `pdfOptions.columns` option can be set to `'auto'` (default), `'single'` (force single-column), or a number (force N columns) to override detection.

### 7.5 Header and Footer Removal

Document headers and footers (running text at the top and bottom of pages) are noise for RAG embeddings. They repeat on every page and pollute search results.

**Algorithm:**

1. **Top-of-page text collection**: For each page, collect all text items within the top 10% of the page height (configurable via `pdfOptions.headerMargin`).

2. **Bottom-of-page text collection**: Similarly, collect text within the bottom 10% of the page height (`pdfOptions.footerMargin`).

3. **Repetition detection**: Compare the top-of-page text across all pages. Text strings that appear on more than 50% of pages (configurable via `pdfOptions.headerRepeatThreshold`) in the same position are classified as headers and removed.

4. **Page number detection**: Within header/footer candidates, identify text that matches a sequential pattern: isolated numbers that increment by 1 across pages, or patterns like "Page N of M," "N/M," or Roman numerals. These are removed.

5. **Output**: Header and footer text is excluded from the content blocks. Optionally, extracted header/footer text is stored in the `ConversionResult.metadata` for reference.

### 7.6 Image Extraction

PDFs contain embedded images as binary streams in various formats (JPEG, JPEG2000, CCITT fax, inline images). `pdfjs-dist` provides access to page operator lists that include image painting operators.

**Algorithm:**

1. **Image enumeration**: For each page, scan the operator list for image operators (`paintImageXObject`, `paintInlineImageXObject`). Record the image reference name and the position/dimensions from the transformation matrix.

2. **Image data extraction**: Use `pdfjs-dist`'s `commonObjs` to retrieve the image data for each reference. The image data includes raw pixel data, width, height, and color space.

3. **Image encoding**: Encode the raw pixel data into a standard image format (PNG for lossless, JPEG for photographic images). The choice is configurable via `imageOptions.format`.

4. **Image output**: Depending on configuration:
   - `imageOptions.mode = 'extract'` (default): Save images to files in the configured output directory. Insert `![Image N](./images/image-N.png)` references in the markdown.
   - `imageOptions.mode = 'inline'`: Encode images as base64 data URIs. Insert `![Image N](data:image/png;base64,...)` in the markdown. Increases markdown size significantly.
   - `imageOptions.mode = 'skip'`: Do not extract images. Insert `<!-- Image omitted -->` comments or nothing.
   - `imageOptions.mode = 'reference'`: Insert `![Image N](image-N.png)` references without extracting the actual image data. Return image metadata in `ConversionResult.images`.

5. **Image placement**: Images are placed in the markdown at the position corresponding to their page location, between the text blocks that surround them in the original layout.

### 7.7 Scanned PDF Handling (Optional OCR)

Scanned PDFs contain page images with no extractable text. When `pdfjs-dist` returns empty or near-empty text content for a page, the page is classified as scanned.

**OCR integration** (optional, requires `tesseract.js` as a peer dependency):

1. **Detection**: A page is classified as scanned if the extracted text contains fewer than 10 characters while the page contains image operators that cover more than 80% of the page area.

2. **OCR execution**: The page image is rendered at a configurable DPI (default: 300) and passed to `tesseract.js` for text recognition.

3. **OCR output**: The recognized text is used in place of the (empty) extracted text. OCR text is marked in the metadata as `ocrApplied: true` for the affected pages.

4. **Performance**: OCR adds 2-10 seconds per page depending on page complexity and DPI. For large documents, OCR can be limited to specific pages via `ocrOptions.pages`.

**Configuration**: OCR is disabled by default. Enable with `ocrOptions.enabled: true`. Requires `tesseract.js` to be installed as a peer dependency.

---

## 8. DOCX Processing

DOCX processing is the most reliable conversion because the format preserves semantic structure explicitly.

### 8.1 ZIP Extraction

A DOCX file is a ZIP archive. The parser uses `jszip` to read the archive and extract the required XML files:

- `word/document.xml`: The main document content.
- `word/styles.xml`: Style definitions mapping style IDs to style names and properties.
- `word/_rels/document.xml.rels`: Relationships mapping relationship IDs to target files (images, hyperlinks).
- `word/numbering.xml`: List numbering definitions.
- `word/footnotes.xml`: Footnote content (if present).
- `word/endnotes.xml`: Endnote content (if present).
- `word/media/*`: Embedded images and other media.
- `[Content_Types].xml`: Content type declarations for all parts.

### 8.2 Style-to-Markdown Mapping

Word styles define the semantic role of each paragraph. The style mapping converts Word styles to markdown elements:

| Word Style | Markdown Output |
|-----------|----------------|
| `Heading 1` / `heading 1` | `# Text` |
| `Heading 2` / `heading 2` | `## Text` |
| `Heading 3` through `Heading 6` | `###` through `######` |
| `Title` | `# Text` (treated as H1) |
| `Subtitle` | `## Text` (treated as H2) |
| `Normal` / default | Paragraph text |
| `Quote` / `IntenseQuote` | `> Text` |
| `ListParagraph` | List item (with numbering from `numbering.xml`) |
| `Code` / any monospace style | Fenced code block content |

Custom styles with outline levels (defined in `styles.xml` as `<w:outlineLvl w:val="N"/>`) are mapped to heading levels accordingly.

### 8.3 Run-Level Formatting

Within a paragraph, text is split into "runs" (`<w:r>` elements), each with its own formatting properties (`<w:rPr>`). Run formatting is mapped to inline markdown:

| Run Property | Markdown |
|-------------|----------|
| `<w:b/>` (bold) | `**text**` |
| `<w:i/>` (italic) | `*text*` |
| `<w:strike/>` (strikethrough) | `~~text~~` |
| `<w:u/>` (underline) | No markdown equivalent; text preserved as-is |
| `<w:rFonts>` with monospace font | `` `text` `` |
| `<w:vertAlign w:val="superscript"/>` | `<sup>text</sup>` (HTML in markdown) |
| `<w:vertAlign w:val="subscript"/>` | `<sub>text</sub>` (HTML in markdown) |

Nested formatting (bold italic) produces combined markers: `***bold italic***`.

### 8.4 List Extraction

Lists in DOCX are defined by the `numbering.xml` file, which maps abstract numbering definitions to concrete list styles (numbered, bulleted, with specific indent levels). Each list paragraph (`<w:pStyle w:val="ListParagraph"/>`) references a numbering ID and indent level.

**Algorithm:**

1. Read `numbering.xml` to build a map of numbering definition IDs to list types (ordered/unordered) and indent levels.
2. For each paragraph with a numbering reference, determine the list type and indent level.
3. Group consecutive list paragraphs into list blocks.
4. Generate markdown list syntax with appropriate indentation for nesting.

### 8.5 Table Extraction

DOCX tables (`<w:tbl>`) contain rows (`<w:tr>`) and cells (`<w:tc>`). Each cell contains one or more paragraphs.

**Algorithm:**

1. Traverse `<w:tbl>` elements in `document.xml`.
2. For each row, extract cell content. Multi-paragraph cells are joined with `<br>` or spaces.
3. Handle merged cells:
   - Horizontal merge: `<w:hMerge w:val="restart"/>` starts a merged cell; `<w:hMerge w:val="continue"/>` extends it. The merged value is placed in the first cell; continuation cells are filled with the same value.
   - Vertical merge: `<w:vMerge>` works similarly for vertical spans.
4. Determine the header row: the first row is treated as the header unless the `<w:tblHeader/>` property is absent from all cells.
5. Emit the table as a GFM pipe table.

### 8.6 Image Extraction

Images in DOCX are referenced via relationship IDs. Inline images appear as `<w:drawing>` elements containing `<a:blip r:embed="rId5"/>`, where `rId5` maps to a file in `word/media/` via `document.xml.rels`.

**Algorithm:**

1. When a `<w:drawing>` element is encountered, extract the relationship ID from `<a:blip>`.
2. Look up the relationship ID in `document.xml.rels` to get the target file path (e.g., `media/image1.png`).
3. Read the image data from the ZIP archive.
4. Save or encode the image according to `imageOptions.mode`.
5. Insert a markdown image reference at the position of the `<w:drawing>` element.

### 8.7 Hyperlinks

Hyperlinks in DOCX are `<w:hyperlink>` elements that reference a relationship ID (for external links) or a bookmark name (for internal links). The relationship ID maps to a URL in `document.xml.rels`.

---

## 9. HTML Processing

### 9.1 Readability-Based Article Extraction

Raw HTML web pages contain substantial non-content elements. The HTML processor applies readability-based extraction to isolate the main article content before converting to markdown.

**Algorithm:**

1. **Parse HTML** with `cheerio` to build a DOM tree.
2. **Remove noise elements**: Strip `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, `<noscript>`, `<iframe>`, and elements with common ad/navigation class names (`nav`, `sidebar`, `footer`, `ad`, `advertisement`, `cookie`, `banner`, `popup`, `modal`).
3. **Score content nodes**: For each `<div>`, `<section>`, `<article>`, and `<main>` element, compute a content score based on: text length, number of paragraphs, link density (low link-to-text ratio indicates content, high indicates navigation), and presence of content indicators in class/id names (`article`, `content`, `post`, `entry`, `body`, `text`).
4. **Select top candidate**: The element with the highest content score is selected as the article container. If an `<article>` or `<main>` element exists, it is strongly preferred.
5. **Extract content**: The selected container's content is converted to markdown.

**Bypass**: The `htmlOptions.readability` option (default: `true`) can be set to `false` to skip article extraction and convert the entire HTML document.

### 9.2 Tag-to-Markdown Mapping

After article extraction, HTML elements are traversed depth-first and converted to markdown:

| HTML Element | Markdown Output |
|-------------|----------------|
| `<h1>` through `<h6>` | `#` through `######` |
| `<p>` | Paragraph text with blank line after |
| `<br>` | Newline within a paragraph |
| `<hr>` | `---` |
| `<strong>`, `<b>` | `**text**` |
| `<em>`, `<i>` | `*text*` |
| `<del>`, `<s>`, `<strike>` | `~~text~~` |
| `<code>` (inline) | `` `text` `` |
| `<pre>` | Fenced code block (``` ``` ```) |
| `<pre><code class="language-X">` | Fenced code block with language `X` |
| `<a href="url">` | `[text](url)` |
| `<img src="url" alt="text">` | `![text](url)` |
| `<ul>` | Unordered list with `- ` items |
| `<ol>` | Ordered list with `1. ` items |
| `<li>` | List item (handles nesting) |
| `<blockquote>` | `> ` prefixed text |
| `<table>` | GFM pipe table |
| `<th>`, `<td>` | Table cells |
| `<figure>` | Image with optional caption |
| `<figcaption>` | Italic text below image |
| `<details>` | Preserved as HTML (no markdown equivalent) |
| `<summary>` | Preserved as HTML |
| `<sup>` | `<sup>text</sup>` |
| `<sub>` | `<sub>text</sub>` |
| `<mark>` | `==text==` (extended markdown) or plain text |
| `<div>`, `<span>`, `<section>` | Unwrapped (content preserved, tags removed) |

### 9.3 Metadata Extraction

HTML metadata is extracted from the document's `<head>`:

- **Title**: `<title>` element content.
- **Author**: `<meta name="author" content="...">`.
- **Description**: `<meta name="description" content="...">`.
- **Date**: `<meta name="date" content="...">` or `<time datetime="...">` within the article.
- **Open Graph**: `<meta property="og:title">`, `og:description`, `og:image`, `og:type`, `og:url`.
- **Twitter Card**: `<meta name="twitter:title">`, `twitter:description`.
- **Canonical URL**: `<link rel="canonical" href="...">`.

---

## 10. Markdown Output Quality

The markdown produced by `docling-node-ts` adheres to strict quality standards. This section specifies what the output looks like and what invariants it maintains.

### 10.1 Heading Hierarchy

Headings use ATX syntax (`#` markers) and form a valid hierarchy:

```markdown
# Document Title

## Section One

### Subsection A

### Subsection B

## Section Two
```

The converter ensures that heading levels do not skip (no `#` followed by `###` without an intervening `##`). When the source document's heading levels are inconsistent, the `normalizeHeadings` option (default: `true`) shifts levels to form a valid tree. When `normalizeHeadings` is `false`, the original heading levels are preserved exactly as detected.

### 10.2 List Formatting

Lists use consistent markers: `-` for unordered, `1.` for ordered. Nested lists use 2-space indentation for unordered and 3-space for ordered:

```markdown
- First item
  - Nested item
  - Another nested item
- Second item

1. Step one
   1. Sub-step
   2. Sub-step
2. Step two
```

### 10.3 GFM Tables

Tables use GitHub Flavored Markdown pipe syntax with alignment markers:

```markdown
| Product | Price | Stock |
|:--------|------:|:-----:|
| Widget  | 49.99 |  240  |
| Gadget  | 29.00 |   55  |
```

All rows have the same number of cells. Cell content is escaped (pipe characters become `\|`). Empty cells are represented as empty strings between pipes. Excessively wide tables (more than 120 characters per line) are not wrapped -- they are emitted as-is, since GFM tables do not support line wrapping.

### 10.4 Code Blocks

Code blocks use fenced syntax with language hints when detectable:

````markdown
```python
def hello():
    print("Hello, world!")
```
````

Language hints are derived from: HTML `class="language-*"` attributes, file associations in the source document, or font-based detection (monospace font sequences in PDFs). When no language can be determined, the fence has no language tag.

### 10.5 Image References

Images include alt text and file paths or URLs:

```markdown
![Company Logo](./images/image-1.png)

![Chart showing Q3 revenue growth](./images/image-2.png)
```

Alt text is sourced from: the image's alt attribute (HTML), the image's description property (DOCX/PPTX), or a generated label (`Image N`) when no description is available.

### 10.6 Clean Text Guarantees

The output markdown is guaranteed to be:

- **UTF-8 encoded** with no byte-order mark.
- **Free of null bytes** and control characters (except `\n` and `\t`).
- **Free of PDF operator fragments** (`BT`, `ET`, `Tf`, `Tm`, `Tj` sequences that can leak from poorly parsed PDFs).
- **Free of HTML artifacts** (no `&amp;`, `&lt;`, `&gt;`, `&nbsp;` entities -- all decoded to their Unicode equivalents).
- **Free of excessive whitespace** (no more than two consecutive blank lines, no trailing whitespace on lines).
- **Terminated with a single newline**.

---

## 11. API Surface

### Installation

```bash
npm install docling-node-ts
```

### Main Export: `convert`

The primary API. Auto-detects format and returns a conversion result.

```typescript
import { convert } from 'docling-node-ts';

// From file path
const result = await convert('./report.pdf');
console.log(result.markdown);

// From Buffer
const buffer = await fs.promises.readFile('./document.docx');
const result = await convert(buffer, { format: 'docx' });

// From URL
const result = await convert('https://example.com/paper.pdf');
```

### Format-Specific Exports

```typescript
import { convertPDF, convertDOCX, convertPPTX, convertHTML } from 'docling-node-ts';

// PDF with format-specific options
const result = await convertPDF('./report.pdf', {
  columns: 'auto',
  headingFontSizeRatio: 1.3,
  removeHeaders: true,
  removeFooters: true,
});

// DOCX
const result = await convertDOCX('./document.docx', {
  includeFootnotes: true,
  includeEndnotes: false,
});

// PPTX
const result = await convertPPTX('./presentation.pptx', {
  includeNotes: true,
  slideHeadingLevel: 2,
});

// HTML
const result = await convertHTML(htmlString, {
  readability: true,
  baseUrl: 'https://example.com',
});
```

### Factory Export: `createConverter`

Creates a configured converter instance with preset options.

```typescript
import { createConverter } from 'docling-node-ts';

const converter = createConverter({
  images: { mode: 'extract', outputDir: './images' },
  pdf: { columns: 'auto', removeHeaders: true },
  normalizeHeadings: true,
});

const result1 = await converter.convert('./report1.pdf');
const result2 = await converter.convert('./report2.docx');
const result3 = await converter.convertPDF('./report3.pdf', { columns: 'single' });
```

### Detection Export: `detectFormat`

Detects the document format without converting.

```typescript
import { detectFormat } from 'docling-node-ts';

const format = await detectFormat('./mystery-file');
console.log(format);
// { format: 'pdf', confidence: 1.0, method: 'magic-bytes' }

const format2 = await detectFormat(buffer);
console.log(format2);
// { format: 'docx', confidence: 1.0, method: 'zip-content-type' }
```

### Type Definitions

```typescript
// ── Input Types ─────────────────────────────────────────────────────

/** Accepted input types for document conversion. */
type DocumentInput = string | Buffer | URL | ReadableStream<Uint8Array>;

/** Supported document formats. */
type DocumentFormat = 'pdf' | 'docx' | 'pptx' | 'html' | 'text' | 'markdown';

// ── Conversion Result ───────────────────────────────────────────────

/** The complete result of a document conversion. */
interface ConversionResult {
  /** The converted markdown string. */
  markdown: string;

  /** Document metadata extracted during conversion. */
  metadata: DocumentMetadata;

  /** Information about extracted images, if any. */
  images: ImageInfo[];

  /** Extracted tables in structured form (in addition to their markdown representation). */
  tables: ExtractedTable[];

  /** Per-page information, if applicable (PDF, PPTX). */
  pages?: PageInfo[];

  /** Warnings generated during conversion (non-fatal issues). */
  warnings: ConversionWarning[];

  /** The detected or specified input format. */
  format: DocumentFormat;

  /** Time taken for the conversion in milliseconds. */
  durationMs: number;
}

/** Document metadata. */
interface DocumentMetadata {
  /** Document title, if available. */
  title?: string;

  /** Document author(s), if available. */
  author?: string;

  /** Document creation date, if available. */
  createdDate?: string;

  /** Document last modified date, if available. */
  modifiedDate?: string;

  /** Total number of pages (PDF, PPTX) or undefined (DOCX, HTML, text). */
  pageCount?: number;

  /** Approximate word count of the extracted text. */
  wordCount: number;

  /** Approximate character count of the extracted text. */
  charCount: number;

  /** Format-specific metadata. */
  formatMetadata?: Record<string, unknown>;
}

/** Information about an extracted image. */
interface ImageInfo {
  /** Sequential index of this image in the document. */
  index: number;

  /** The file path where the image was saved (if mode is 'extract'). */
  filePath?: string;

  /** The image data as a Buffer (if mode is 'buffer'). */
  data?: Buffer;

  /** The base64-encoded image data (if mode is 'inline'). */
  base64?: string;

  /** Image format (png, jpeg, etc.). */
  format: string;

  /** Image width in pixels. */
  width?: number;

  /** Image height in pixels. */
  height?: number;

  /** The alt text used in the markdown reference. */
  alt: string;

  /** The page or slide number where the image appears. */
  page?: number;
}

/** A table extracted from the document in structured form. */
interface ExtractedTable {
  /** Sequential index of this table in the document. */
  index: number;

  /** Column headers. */
  headers: string[];

  /** Data rows (each row is an array of cell strings). */
  rows: string[][];

  /** Column alignment, if detected. */
  alignment?: ('left' | 'center' | 'right' | 'none')[];

  /** The page or slide number where the table appears. */
  page?: number;

  /** The GFM markdown representation of this table. */
  markdown: string;
}

/** Information about a single page or slide. */
interface PageInfo {
  /** One-based page or slide number. */
  number: number;

  /** The markdown content for this page/slide. */
  markdown: string;

  /** Whether OCR was applied to this page. */
  ocrApplied: boolean;

  /** Number of images on this page. */
  imageCount: number;

  /** Number of tables on this page. */
  tableCount: number;
}

/** A non-fatal warning generated during conversion. */
interface ConversionWarning {
  /** Warning code for programmatic handling. */
  code: string;

  /** Human-readable warning message. */
  message: string;

  /** The page or location where the warning occurred. */
  page?: number;
}

// ── Options ─────────────────────────────────────────────────────────

/** Options for the convert function. */
interface ConvertOptions {
  /**
   * Explicitly specify the input format.
   * If not provided, the format is auto-detected.
   */
  format?: DocumentFormat;

  /**
   * Image handling configuration.
   */
  images?: ImageOptions;

  /**
   * Whether to normalize heading levels to form a valid hierarchy.
   * Default: true.
   */
  normalizeHeadings?: boolean;

  /**
   * Whether to include page break markers in the output.
   * Default: false.
   */
  pageBreaks?: boolean;

  /**
   * PDF-specific options. Only used when converting PDFs.
   */
  pdf?: PDFOptions;

  /**
   * DOCX-specific options. Only used when converting DOCX files.
   */
  docx?: DOCXOptions;

  /**
   * PPTX-specific options. Only used when converting PPTX files.
   */
  pptx?: PPTXOptions;

  /**
   * HTML-specific options. Only used when converting HTML.
   */
  html?: HTMLConvertOptions;

  /**
   * OCR options for scanned PDFs.
   */
  ocr?: OCROptions;

  /**
   * AbortSignal for external cancellation.
   */
  signal?: AbortSignal;
}

/** Image handling options. */
interface ImageOptions {
  /**
   * How to handle images.
   * 'extract': Save images to files, insert markdown references.
   * 'inline': Encode as base64 data URIs in markdown.
   * 'skip': Do not extract images.
   * 'reference': Insert references without extracting image data.
   * 'buffer': Return image data as Buffers in ConversionResult.images.
   * Default: 'reference'.
   */
  mode?: 'extract' | 'inline' | 'skip' | 'reference' | 'buffer';

  /**
   * Output directory for extracted images (when mode is 'extract').
   * Default: './images' relative to the output file, or a temp directory.
   */
  outputDir?: string;

  /**
   * Image output format.
   * Default: 'png'.
   */
  format?: 'png' | 'jpeg' | 'webp';

  /**
   * JPEG quality (1-100) when format is 'jpeg'.
   * Default: 85.
   */
  quality?: number;
}

/** PDF-specific options. */
interface PDFOptions {
  /**
   * Column detection mode.
   * 'auto': Automatically detect column count.
   * 'single': Force single-column reading.
   * number: Force N columns.
   * Default: 'auto'.
   */
  columns?: 'auto' | 'single' | number;

  /**
   * Font size ratio threshold for heading detection.
   * A text item is classified as a heading if its font size
   * exceeds the body font size by this ratio.
   * Default: 1.2.
   */
  headingFontSizeRatio?: number;

  /**
   * Whether to remove detected headers from pages.
   * Default: true.
   */
  removeHeaders?: boolean;

  /**
   * Whether to remove detected footers from pages.
   * Default: true.
   */
  removeFooters?: boolean;

  /**
   * Whether to remove page numbers.
   * Default: true.
   */
  removePageNumbers?: boolean;

  /**
   * Header margin as a fraction of page height (0.0-0.5).
   * Text within this margin from the top is considered header candidate.
   * Default: 0.1.
   */
  headerMargin?: number;

  /**
   * Footer margin as a fraction of page height (0.0-0.5).
   * Default: 0.1.
   */
  footerMargin?: number;

  /**
   * Minimum fraction of pages a text must appear on
   * to be classified as a header/footer.
   * Default: 0.5.
   */
  headerRepeatThreshold?: number;

  /**
   * Password for encrypted PDFs.
   */
  password?: string;

  /**
   * Specific pages to convert (1-based).
   * Default: all pages.
   * Example: [1, 2, 5] or { start: 1, end: 10 }.
   */
  pages?: number[] | { start: number; end: number };
}

/** DOCX-specific options. */
interface DOCXOptions {
  /**
   * Whether to include footnotes in the output.
   * Default: true.
   */
  includeFootnotes?: boolean;

  /**
   * Whether to include endnotes in the output.
   * Default: true.
   */
  includeEndnotes?: boolean;

  /**
   * Whether to include document headers and footers.
   * Default: false.
   */
  includeHeadersFooters?: boolean;

  /**
   * How to render footnotes.
   * 'inline': Insert footnote content at the point of reference.
   * 'end': Collect all footnotes at the end of the document.
   * Default: 'end'.
   */
  footnoteStyle?: 'inline' | 'end';
}

/** PPTX-specific options. */
interface PPTXOptions {
  /**
   * Whether to include speaker notes.
   * Default: false.
   */
  includeNotes?: boolean;

  /**
   * How to render speaker notes.
   * 'inline': After each slide's content.
   * 'separate': In a separate "Speaker Notes" section at the end.
   * Default: 'inline'.
   */
  notesStyle?: 'inline' | 'separate';

  /**
   * Heading level for slide titles.
   * Default: 2 (## Slide N: Title).
   */
  slideHeadingLevel?: 1 | 2 | 3;

  /**
   * Whether to include slide numbers in heading.
   * Default: true.
   */
  includeSlideNumbers?: boolean;
}

/** HTML-specific conversion options. */
interface HTMLConvertOptions {
  /**
   * Whether to apply readability-based article extraction.
   * Default: true.
   */
  readability?: boolean;

  /**
   * Base URL for resolving relative URLs in the HTML.
   * Required when converting HTML strings with relative image/link URLs.
   */
  baseUrl?: string;

  /**
   * CSS selectors for elements to remove before conversion.
   * Default: ['nav', '.sidebar', '.ad', '.advertisement', '.cookie-banner'].
   */
  removeSelectors?: string[];

  /**
   * CSS selector for the main content element.
   * If specified, only this element's content is converted.
   * Overrides readability extraction.
   */
  contentSelector?: string;
}

/** OCR options for scanned PDFs. */
interface OCROptions {
  /**
   * Whether to enable OCR for scanned pages.
   * Requires tesseract.js as a peer dependency.
   * Default: false.
   */
  enabled?: boolean;

  /**
   * Language(s) for OCR recognition.
   * Default: 'eng'.
   */
  language?: string;

  /**
   * DPI for rendering PDF pages for OCR.
   * Higher DPI = better accuracy but slower.
   * Default: 300.
   */
  dpi?: number;

  /**
   * Specific pages to OCR (1-based).
   * Default: all scanned pages.
   */
  pages?: number[];
}

// ── Format Detection ────────────────────────────────────────────────

/** Result of format detection. */
interface FormatDetectionResult {
  /** The detected format. */
  format: DocumentFormat;

  /** Confidence score (0.0 to 1.0). */
  confidence: number;

  /** The detection method used. */
  method: 'explicit' | 'extension' | 'magic-bytes' | 'zip-content-type' | 'heuristic';
}

// ── Converter Instance ──────────────────────────────────────────────

/** A configured converter instance created by createConverter(). */
interface DocumentConverter {
  /** Auto-detecting conversion with preset options. */
  convert(input: DocumentInput, overrides?: Partial<ConvertOptions>): Promise<ConversionResult>;

  /** PDF-specific conversion with preset options. */
  convertPDF(input: DocumentInput, overrides?: Partial<PDFOptions>): Promise<ConversionResult>;

  /** DOCX-specific conversion with preset options. */
  convertDOCX(input: DocumentInput, overrides?: Partial<DOCXOptions>): Promise<ConversionResult>;

  /** PPTX-specific conversion with preset options. */
  convertPPTX(input: DocumentInput, overrides?: Partial<PPTXOptions>): Promise<ConversionResult>;

  /** HTML-specific conversion with preset options. */
  convertHTML(input: DocumentInput, overrides?: Partial<HTMLConvertOptions>): Promise<ConversionResult>;

  /** Detect format with preset options. */
  detectFormat(input: DocumentInput): Promise<FormatDetectionResult>;
}

// ── Errors ──────────────────────────────────────────────────────────

/** Thrown when format detection fails. */
class FormatDetectionError extends Error {
  code: 'FORMAT_DETECTION_FAILED';
}

/** Thrown when a required dependency is missing. */
class DependencyError extends Error {
  code: 'MISSING_DEPENDENCY';
  dependency: string;
}

/** Thrown when the document cannot be parsed. */
class ParseError extends Error {
  code: 'PARSE_FAILED';
  format: DocumentFormat;
}

/** Thrown when the document is encrypted and no password is provided. */
class EncryptedDocumentError extends Error {
  code: 'ENCRYPTED_DOCUMENT';
}
```

### Example: Full RAG Pipeline

```typescript
import { convert } from 'docling-node-ts';
import { chunk } from 'chunk-smart';
import { chunkTable } from 'table-chunk';

// Convert PDF to markdown
const { markdown, tables, metadata } = await convert('./quarterly-report.pdf', {
  images: { mode: 'skip' },
  pdf: { columns: 'auto', removeHeaders: true },
});

console.log(`Converted: ${metadata.title} (${metadata.pageCount} pages, ${metadata.wordCount} words)`);

// Chunk the markdown for embedding
const chunks = chunk(markdown, {
  maxChunkSize: 512,
  overlap: 50,
  customMetadata: { source: 'quarterly-report.pdf', title: metadata.title },
});

// Separately chunk extracted tables for better table retrieval
const tableChunks = tables.flatMap(t =>
  chunkTable(t.markdown, { strategy: 'serialized', maxTokens: 512 })
);

console.log(`Produced ${chunks.length} text chunks and ${tableChunks.length} table chunks`);
```

---

## 12. Image Handling

Image handling is configurable because different use cases have different requirements. A RAG pipeline may want to skip images entirely (they cannot be embedded as text). A content migration tool may want to extract and preserve every image. A summary generator may want image references without the actual image data.

### Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `extract` | Save images to files in `outputDir`. Insert `![alt](path)` references. | Content migration, documentation conversion. |
| `inline` | Encode as base64 data URIs. Insert `![alt](data:image/...)`. | Self-contained output, no external file management. |
| `skip` | Do not process images. Insert nothing or `<!-- Image omitted -->`. | RAG pipelines where images are not embedded. |
| `reference` | Insert `![alt](image-N.ext)` references. Return `ImageInfo[]` in result. | When the caller handles image storage separately. |
| `buffer` | Return image data as Buffers in `ConversionResult.images`. No markdown references. | Programmatic image processing pipelines. |

### Alt Text Generation

Alt text is sourced from:

1. **Document metadata**: The image's description or alt text property from the source format (HTML `alt` attribute, DOCX image description, PDF image metadata).
2. **Caption proximity**: If a caption or label appears immediately below or above the image in the document, it is used as alt text.
3. **Generated label**: If no description is available, a generic label is generated: `Image 1`, `Image 2`, etc. The label includes the page number for PDFs: `Image 1 (page 3)`.

### Image Format Conversion

Extracted images are output in the format specified by `imageOptions.format` (default: `png`). If the source image is already in the requested format and no transformation is needed, it is passed through without re-encoding. If format conversion is required, Node.js built-in `sharp` (if available) or Canvas API is used for encoding.

---

## 13. Metadata Extraction

Every conversion produces a `DocumentMetadata` object with information about the source document.

### Common Metadata

| Field | Source | Available For |
|-------|--------|---------------|
| `title` | PDF: document properties. DOCX: `core.xml` title. HTML: `<title>`. | PDF, DOCX, HTML |
| `author` | PDF: document properties. DOCX: `core.xml` creator. HTML: `<meta name="author">`. | PDF, DOCX, HTML |
| `createdDate` | PDF: creation date. DOCX: `core.xml` created. HTML: `<meta name="date">`. | PDF, DOCX, HTML |
| `modifiedDate` | PDF: modification date. DOCX: `core.xml` modified. | PDF, DOCX |
| `pageCount` | PDF: number of pages. PPTX: number of slides. | PDF, PPTX |
| `wordCount` | Computed from extracted text (split on whitespace). | All formats |
| `charCount` | Computed from extracted text (`string.length`). | All formats |

### Format-Specific Metadata

**PDF** (`formatMetadata`):
- `producer`: PDF producer application (e.g., "Microsoft Word," "Adobe Acrobat").
- `creator`: PDF creator application.
- `pdfVersion`: PDF specification version (e.g., "1.7").
- `encrypted`: Whether the PDF is encrypted.
- `linearized`: Whether the PDF is linearized (optimized for web).

**DOCX** (`formatMetadata`):
- `revision`: Document revision number.
- `lastModifiedBy`: Last author to modify the document.
- `company`: Company property from `app.xml`.
- `template`: Template used to create the document.
- `totalEditingTime`: Total editing time in minutes.

**PPTX** (`formatMetadata`):
- `slideCount`: Number of slides.
- `hiddenSlideCount`: Number of hidden slides.
- `noteCount`: Number of slides with speaker notes.
- `presentationFormat`: Presentation format (e.g., "On-screen Show (4:3)").

**HTML** (`formatMetadata`):
- `canonicalUrl`: The canonical URL from `<link rel="canonical">`.
- `ogTitle`: Open Graph title.
- `ogDescription`: Open Graph description.
- `ogImage`: Open Graph image URL.
- `language`: Document language from `<html lang="...">`.

---

## 14. Configuration

### Default Values

| Option | Default | Description |
|--------|---------|-------------|
| `format` | `undefined` (auto-detect) | Input format. |
| `images.mode` | `'reference'` | Image handling mode. |
| `images.outputDir` | `'./images'` | Output directory for extracted images. |
| `images.format` | `'png'` | Image output format. |
| `images.quality` | `85` | JPEG quality. |
| `normalizeHeadings` | `true` | Normalize heading hierarchy. |
| `pageBreaks` | `false` | Include page break markers. |
| `pdf.columns` | `'auto'` | Column detection mode. |
| `pdf.headingFontSizeRatio` | `1.2` | Font size ratio for heading detection. |
| `pdf.removeHeaders` | `true` | Remove page headers. |
| `pdf.removeFooters` | `true` | Remove page footers. |
| `pdf.removePageNumbers` | `true` | Remove page numbers. |
| `pdf.headerMargin` | `0.1` | Header margin (fraction of page height). |
| `pdf.footerMargin` | `0.1` | Footer margin (fraction of page height). |
| `pdf.headerRepeatThreshold` | `0.5` | Repeat threshold for header/footer detection. |
| `docx.includeFootnotes` | `true` | Include footnotes. |
| `docx.includeEndnotes` | `true` | Include endnotes. |
| `docx.includeHeadersFooters` | `false` | Include document headers/footers. |
| `docx.footnoteStyle` | `'end'` | Footnote rendering style. |
| `pptx.includeNotes` | `false` | Include speaker notes. |
| `pptx.notesStyle` | `'inline'` | Notes rendering style. |
| `pptx.slideHeadingLevel` | `2` | Heading level for slide titles. |
| `pptx.includeSlideNumbers` | `true` | Include slide numbers in headings. |
| `html.readability` | `true` | Apply readability extraction. |
| `html.removeSelectors` | `['nav', '.sidebar', '.ad', ...]` | Elements to remove. |
| `ocr.enabled` | `false` | Enable OCR. |
| `ocr.language` | `'eng'` | OCR language. |
| `ocr.dpi` | `300` | OCR rendering DPI. |

### Configuration Precedence

When using `createConverter`, options are merged with the following precedence (highest first):

1. Per-call overrides passed to `converter.convert(input, overrides)`.
2. Factory-level options passed to `createConverter(options)`.
3. Built-in defaults.

---

## 15. CLI Design

### Installation and Invocation

```bash
# Global install
npm install -g docling-node-ts
docling-node-ts report.pdf

# npx (no install)
npx docling-node-ts document.docx -o document.md

# Package script
# package.json: { "scripts": { "convert": "docling-node-ts" } }
```

### CLI Binary Name

`docling-node-ts`

### Commands and Flags

```
docling-node-ts <input> [options]

Input:
  <input>                    File path or URL of the document to convert.

Output:
  -o, --output <path>        Write markdown to a file instead of stdout.
  --stdout                   Force output to stdout (default when no -o).

Format:
  -f, --format <format>      Input format: pdf, docx, pptx, html, text.
                             Default: auto-detect.

Image options:
  --images <mode>            Image handling: extract, inline, skip, reference.
                             Default: skip (CLI), reference (API).
  --image-dir <path>         Output directory for extracted images.
                             Default: ./images.

PDF options:
  --columns <mode>           Column mode: auto, single, or a number.
                             Default: auto.
  --heading-ratio <n>        Font size ratio for heading detection.
                             Default: 1.2.
  --no-remove-headers        Keep page headers in output.
  --no-remove-footers        Keep page footers in output.
  --pages <range>            Page range: "1-10", "1,3,5", "5-".
                             Default: all pages.
  --password <pwd>           Password for encrypted PDFs.

DOCX options:
  --footnotes                Include footnotes (default: true).
  --no-footnotes             Exclude footnotes.
  --endnotes                 Include endnotes (default: true).
  --no-endnotes              Exclude endnotes.

PPTX options:
  --notes                    Include speaker notes.
  --no-notes                 Exclude speaker notes (default).

HTML options:
  --no-readability           Skip readability extraction, convert full HTML.
  --base-url <url>           Base URL for resolving relative URLs.
  --content-selector <sel>   CSS selector for main content element.

OCR options:
  --ocr                      Enable OCR for scanned PDFs.
  --ocr-lang <lang>          OCR language. Default: eng.
  --ocr-dpi <n>              OCR rendering DPI. Default: 300.

General:
  --normalize-headings       Normalize heading levels (default: true).
  --no-normalize-headings    Keep original heading levels.
  --page-breaks              Include page break markers.
  --json                     Output ConversionResult as JSON instead of markdown.
  --quiet                    Suppress warnings and status messages.
  --verbose                  Show detailed conversion progress.
  --version                  Print version and exit.
  --help                     Print help and exit.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success. Markdown written to stdout or file. |
| `1` | Conversion error. Document could not be converted. |
| `2` | Configuration error. Invalid flags, missing input, unsupported format. |
| `3` | Input error. File not found, URL unreachable, permission denied. |

### Usage Examples

```bash
# Convert PDF to markdown (stdout)
docling-node-ts report.pdf

# Convert and save to file
docling-node-ts report.pdf -o report.md

# Convert DOCX with images extracted
docling-node-ts document.docx -o document.md --images extract --image-dir ./doc-images

# Convert first 5 pages of a PDF
docling-node-ts large-report.pdf --pages 1-5

# Convert encrypted PDF
docling-node-ts secure.pdf --password "secret123"

# Convert HTML with specific content selector
docling-node-ts https://example.com/article --content-selector "article.main"

# Convert PowerPoint with speaker notes
docling-node-ts presentation.pptx --notes -o slides.md

# Batch convert all PDFs in a directory
for f in *.pdf; do docling-node-ts "$f" -o "${f%.pdf}.md"; done

# Convert with OCR for scanned PDF
docling-node-ts scanned-document.pdf --ocr --ocr-lang eng

# Output full ConversionResult as JSON
docling-node-ts report.pdf --json | jq '.metadata'
```

---

## 16. Integration

### With `chunk-smart`

`chunk-smart` provides structure-aware text chunking for RAG pipelines. `docling-node-ts` produces the markdown; `chunk-smart` chunks it for embedding.

```typescript
import { convert } from 'docling-node-ts';
import { chunk } from 'chunk-smart';

const { markdown, metadata } = await convert('./report.pdf');

const chunks = chunk(markdown, {
  maxChunkSize: 512,
  overlap: 50,
  customMetadata: {
    source: 'report.pdf',
    title: metadata.title,
    author: metadata.author,
  },
});
```

### With `table-chunk`

`table-chunk` provides specialized table chunking that preserves row-column relationships. Tables extracted by `docling-node-ts` can be separately chunked with `table-chunk` for better table retrieval quality.

```typescript
import { convert } from 'docling-node-ts';
import { chunkTable } from 'table-chunk';

const { markdown, tables } = await convert('./financial-report.pdf');

// Chunk each extracted table with header preservation
const tableChunks = tables.flatMap(table =>
  chunkTable(table.markdown, {
    strategy: 'serialized',
    maxTokens: 512,
  })
);
```

### With `ai-file-router`

`ai-file-router` detects file types and routes them to appropriate processors. `docling-node-ts` is the natural handler for document file types.

```typescript
import { createRouter } from 'ai-file-router';
import { convert } from 'docling-node-ts';

const router = createRouter({
  routes: {
    document: {
      extensions: ['.pdf', '.docx', '.pptx', '.html'],
      handler: async (filePath) => {
        const { markdown } = await convert(filePath);
        return markdown;
      },
    },
  },
});
```

### With `rag-prompt-builder`

`rag-prompt-builder` composes RAG prompts from retrieved chunks. Documents converted by `docling-node-ts` and chunked by `chunk-smart` flow into `rag-prompt-builder` with full heading context and metadata.

```typescript
import { convert } from 'docling-node-ts';
import { chunk } from 'chunk-smart';
import { buildPrompt } from 'rag-prompt-builder';

const { markdown, metadata } = await convert('./manual.pdf');
const chunks = chunk(markdown, { maxChunkSize: 512 });

// After embedding and retrieval...
const retrieved = await searchChunks(query, chunks);

const prompt = buildPrompt({
  query,
  chunks: retrieved,
  includeHeadings: true,
  systemContext: `Source: ${metadata.title} by ${metadata.author}`,
});
```

### With `embed-cache`

`embed-cache` provides content-addressable embedding caching. Convert documents, chunk them, then embed with deduplication and caching.

```typescript
import { convert } from 'docling-node-ts';
import { chunk } from 'chunk-smart';
import { createEmbedCache } from 'embed-cache';

const cache = createEmbedCache({ provider: 'openai', model: 'text-embedding-3-small' });
const { markdown } = await convert('./document.pdf');
const chunks = chunk(markdown, { maxChunkSize: 512 });

const embeddings = await Promise.all(
  chunks.map(c => cache.embed(c.content))
);
```

---

## 17. Testing Strategy

### Unit Tests

Unit tests verify individual components in isolation.

- **Format detection tests**: Verify correct detection for each format. Test file extension detection, magic byte detection (PDF header, ZIP header with DOCX vs PPTX content types), HTML detection from content, and fallback to plain text. Test ambiguous inputs (a ZIP file that is neither DOCX nor PPTX).
- **PDF heading detection tests**: Feed pre-constructed text item arrays with known font sizes to the heading detector. Verify correct heading level assignment for various font size ratios. Test edge cases: all text same size (no headings), only two font sizes, many font sizes.
- **PDF table detection tests**: Feed pre-constructed text item grids to the table detector. Verify correct row and column identification. Test tables with regular spacing, irregular spacing, missing cells, and spanning text.
- **PDF column detection tests**: Feed text item arrays with multi-column x-coordinate distributions. Verify correct column count detection. Test single column, two columns, three columns, and full-width headings above columns.
- **PDF header/footer removal tests**: Feed multi-page text item arrays with repeated text at page boundaries. Verify correct identification and removal. Test cases: text that repeats on all pages, text that repeats on most pages, text that varies slightly across pages (page numbers).
- **DOCX style mapping tests**: Feed XML paragraphs with known styles. Verify correct mapping to heading levels, list items, and block types.
- **DOCX list extraction tests**: Feed numbering XML and list paragraph XML. Verify correct list type (ordered/unordered), nesting levels, and list grouping.
- **DOCX table extraction tests**: Feed table XML with simple cells, merged cells (horizontal and vertical), and nested content. Verify correct grid construction and cell content extraction.
- **HTML readability tests**: Feed HTML documents with varying amounts of content and noise. Verify that the correct content element is identified and non-content elements are stripped.
- **HTML tag mapping tests**: Feed individual HTML elements and verify correct markdown output. Test all mapped element types.
- **Markdown generation tests**: Feed sequences of content blocks and verify correct markdown serialization. Test heading levels, list nesting, table formatting, code blocks, image references.
- **Cleanup tests**: Feed markdown with known artifacts and verify correct cleanup. Test whitespace normalization, encoding fixes, garbage character removal, heading normalization, table padding.
- **Metadata extraction tests**: Feed documents with known metadata and verify correct extraction for each format.

### Integration Tests

End-to-end tests that convert real documents and verify output quality.

- **PDF roundtrip test**: Convert a PDF with known content (headings, tables, paragraphs, images). Verify that all headings appear at the correct levels, all table data is present with correct column structure, all paragraphs are present, and image references exist.
- **DOCX roundtrip test**: Convert a DOCX with known content. Verify heading styles map correctly, lists are properly nested, tables are complete, and images are referenced.
- **PPTX roundtrip test**: Convert a PPTX with known slides. Verify each slide produces a section, text boxes are extracted, tables are converted, and speaker notes appear when enabled.
- **HTML roundtrip test**: Convert HTML pages with known content. Verify readability extraction produces clean article content, tags map correctly to markdown, and metadata is extracted.
- **Multi-column PDF test**: Convert a two-column academic paper. Verify that text from column 1 appears before column 2, not interleaved.
- **Table-heavy PDF test**: Convert a financial statement PDF with multiple tables. Verify that each table is correctly reconstructed with the right number of columns, correct headers, and correct data.
- **Large document test**: Convert a 100+ page PDF. Verify completion within performance targets and correct output structure.
- **Encrypted PDF test**: Convert a password-protected PDF with the correct password. Verify conversion succeeds. Verify that conversion without a password throws `EncryptedDocumentError`.
- **Format detection test**: Present the same content in different formats (save a document as PDF, DOCX, and HTML). Convert each and verify that the markdown output is structurally equivalent.
- **Determinism test**: Convert the same document twice with the same options. Verify identical output.

### Test Fixtures

Test fixtures are real documents created specifically for testing. The test fixture set covers:

- `simple.pdf`: A single-page PDF with one heading, two paragraphs, and a simple table.
- `multi-column.pdf`: A two-column academic paper with abstract, sections, and references.
- `tables.pdf`: A PDF with multiple tables of varying complexity (simple, merged cells, spanning pages).
- `images.pdf`: A PDF with embedded images at various positions.
- `scanned.pdf`: A scanned PDF (image-only) for OCR testing.
- `headers-footers.pdf`: A multi-page PDF with consistent headers and footers.
- `simple.docx`: A Word document with headings, lists, tables, and images.
- `complex.docx`: A Word document with footnotes, merged table cells, nested lists, and multiple heading levels.
- `simple.pptx`: A PowerPoint with 5 slides, text, a table, and speaker notes.
- `article.html`: An HTML page with article content, navigation, sidebar, and ads.
- `minimal.html`: A minimal HTML page with just content, no noise.

### Edge Cases to Test

- Empty document (zero-page PDF, empty DOCX).
- PDF with no text (image-only, no OCR).
- DOCX with no paragraphs (only tables or images).
- PPTX with no text boxes (blank slides).
- HTML with no `<body>` or `<html>` tags (fragment).
- Document with only one heading level.
- Table with one row (header only, no data).
- Table with one column.
- Document with extremely long paragraphs (10,000+ characters).
- Document with deeply nested lists (10+ levels).
- PDF with rotated pages.
- DOCX with track changes enabled.
- Mixed-content PPTX (some slides with tables, some with only images).
- HTML with malformed tags (unclosed elements, nested errors).
- File path that does not exist (throws appropriate error).
- Buffer with unrecognizable format (throws `FormatDetectionError`).
- AbortSignal triggered mid-conversion.
- Unicode edge cases: CJK text, RTL text, emoji, mathematical symbols.

### Test Framework

Tests use Vitest, matching the project's existing configuration in `package.json`.

---

## 18. Performance

### Design Constraints

Document conversion is inherently slower than text processing operations like chunking or embedding. PDFs require parsing a binary format, analyzing text positions, and reconstructing layout. DOCX and PPTX require ZIP decompression and XML parsing. The performance goal is to be fast enough for batch processing pipelines that convert hundreds of documents, not to match the sub-millisecond speed of text chunkers.

### Performance Targets

| Format | Document Size | Expected Time |
|--------|--------------|---------------|
| PDF | 1 page, text only | < 200ms |
| PDF | 10 pages, text + tables | < 1s |
| PDF | 50 pages, text + tables + images | < 5s |
| PDF | 100 pages, complex layout | < 10s |
| PDF | Scanned page with OCR | 2-10s per page |
| DOCX | Simple (10 pages) | < 500ms |
| DOCX | Complex (50 pages, tables, images) | < 2s |
| PPTX | 20 slides | < 1s |
| HTML | Single page | < 100ms |
| HTML | Large page (100KB) | < 500ms |

Benchmarks measured on a 2024 MacBook Pro, Node.js 22.

### Memory Usage

PDF processing with `pdfjs-dist` loads the entire PDF into memory. For large PDFs (100+ pages with embedded images), peak memory usage can reach 500MB-1GB. The converter processes pages sequentially, not in parallel, to limit memory usage. Image extraction is the primary memory consumer: each extracted image is decoded into raw pixel data before re-encoding.

Mitigation strategies:
- Pages are processed sequentially and intermediate data is released after each page.
- Image extraction can be skipped (`images.mode: 'skip'`) to reduce memory usage significantly.
- The `pdf.pages` option limits conversion to specific pages, reducing both time and memory for large documents.
- Stream-based input is buffered to a complete Buffer before parsing (PDF.js requires random access to the file). For very large files, this means the file is held in memory. A future optimization could support file-path-based loading that avoids buffering.

### Optimization Strategy

- **Lazy image extraction**: Images are only extracted when `images.mode` is not `'skip'`. When images are skipped, the page operator list is not scanned for image operators.
- **Page-level parallelism** (future): Pages could be processed in parallel using worker threads. Not implemented in v1 to keep the architecture simple.
- **Font metric caching**: Font size and weight information is cached per font name, not re-computed per text item.
- **Single-pass layout analysis**: Reading order, column detection, and heading detection are performed in a single pass through the sorted text items.

---

## 19. Dependencies

### Runtime Dependencies

| Dependency | Purpose | Why Not Avoid It |
|-----------|---------|-----------------|
| `pdfjs-dist` | PDF text extraction with positioning data, image extraction, page rendering. | This is Mozilla's PDF.js, the industry-standard JavaScript PDF library. It is the only JavaScript library that provides text content with position, font, and size information needed for layout analysis. `pdf-parse` wraps an outdated version of `pdfjs-dist` and strips all positioning data. Using `pdfjs-dist` directly is required for heading detection, table detection, and column detection. |
| `jszip` | ZIP archive reading for DOCX and PPTX (which are ZIP-based Office Open XML formats). | DOCX and PPTX files are ZIP archives containing XML files. `jszip` is the most widely used, well-maintained ZIP library for Node.js. Alternatives (`adm-zip`, `unzipper`) are either less maintained or have different API models. |
| `cheerio` | HTML parsing and DOM traversal for HTML-to-markdown conversion and readability extraction. | `cheerio` provides a jQuery-like API for server-side HTML manipulation with fast, forgiving HTML parsing via `htmlparser2`. For HTML conversion, a DOM API is required to traverse elements, read attributes, and extract text content. `cheerio` is faster and lighter than `jsdom` (which implements a full browser DOM). |

### Optional Peer Dependencies

| Dependency | Purpose | Required When |
|-----------|---------|---------------|
| `tesseract.js` | OCR for scanned PDFs. | Only when `ocr.enabled: true`. Not installed by default. |
| `canvas` | Image format conversion and PDF page rendering for OCR. | Only when extracting images that need format conversion, or when rendering PDF pages for OCR. |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | TypeScript compiler. |
| `vitest` | Test runner. |
| `eslint` | Linter. |
| `@types/node` | Node.js type definitions. |

### Why These Dependencies

The dependency set is deliberately minimal. Only libraries that solve fundamentally hard problems (PDF binary format parsing, ZIP archive reading, HTML DOM traversal) are included as runtime dependencies. XML parsing for DOCX/PPTX uses a lightweight approach -- either Node.js built-in XML parsing or a simple SAX-style parser -- rather than adding a heavy XML library. Markdown generation is string concatenation with no library dependency. Layout analysis, heading detection, table detection, and cleanup are all implemented with hand-written algorithms.

---

## 20. File Structure

```
docling-node-ts/
  package.json
  tsconfig.json
  SPEC.md
  README.md
  src/
    index.ts                         -- Public API exports
    convert.ts                       -- convert() function, orchestration
    factory.ts                       -- createConverter() factory
    detect.ts                        -- detectFormat() function
    types.ts                         -- All TypeScript type definitions
    errors.ts                        -- Error classes
    parsers/
      index.ts                       -- Parser registry and dispatch
      pdf/
        index.ts                     -- PDF parser entry point
        text-extractor.ts            -- pdfjs-dist text extraction
        heading-detector.ts          -- Font-based heading detection
        table-detector.ts            -- Position-based table detection
        column-detector.ts           -- Multi-column layout detection
        header-footer-remover.ts     -- Repeated text removal
        image-extractor.ts           -- PDF image extraction
        page-number-remover.ts       -- Page number detection and removal
        reading-order.ts             -- Text item sorting and line merging
        ocr.ts                       -- Optional OCR via tesseract.js
      docx/
        index.ts                     -- DOCX parser entry point
        xml-reader.ts                -- XML traversal utilities
        style-mapper.ts              -- Word style to markdown mapping
        list-parser.ts               -- List numbering and nesting
        table-parser.ts              -- Table XML parsing with merged cells
        image-parser.ts              -- Image extraction from media/
        footnote-parser.ts           -- Footnote and endnote extraction
        hyperlink-parser.ts          -- Hyperlink resolution
      pptx/
        index.ts                     -- PPTX parser entry point
        slide-parser.ts              -- Slide XML parsing
        notes-parser.ts              -- Speaker notes extraction
        table-parser.ts              -- Slide table parsing
        image-parser.ts              -- Image extraction from media/
      html/
        index.ts                     -- HTML parser entry point
        readability.ts               -- Article content extraction
        tag-mapper.ts                -- HTML element to markdown mapping
        metadata-extractor.ts        -- HTML metadata extraction
      text/
        index.ts                     -- Plain text/markdown passthrough
    pipeline/
      content-block.ts               -- ContentBlock intermediate type
      markdown-generator.ts          -- ContentBlock[] to markdown string
      cleanup.ts                     -- Post-processing cleanup
      image-handler.ts               -- Image mode handling (extract/inline/skip)
    cli.ts                           -- CLI entry point
  src/__tests__/
    convert.test.ts                  -- Main convert() function tests
    detect.test.ts                   -- Format detection tests
    parsers/
      pdf/
        heading-detector.test.ts     -- Heading detection tests
        table-detector.test.ts       -- Table detection tests
        column-detector.test.ts      -- Column detection tests
        header-footer-remover.test.ts -- Header/footer removal tests
        reading-order.test.ts        -- Reading order tests
      docx/
        style-mapper.test.ts         -- Style mapping tests
        list-parser.test.ts          -- List parsing tests
        table-parser.test.ts         -- Table parsing tests
      pptx/
        slide-parser.test.ts         -- Slide parsing tests
      html/
        readability.test.ts          -- Readability extraction tests
        tag-mapper.test.ts           -- Tag mapping tests
    pipeline/
      markdown-generator.test.ts     -- Markdown generation tests
      cleanup.test.ts                -- Cleanup tests
    integration/
      pdf.test.ts                    -- PDF end-to-end tests
      docx.test.ts                   -- DOCX end-to-end tests
      pptx.test.ts                   -- PPTX end-to-end tests
      html.test.ts                   -- HTML end-to-end tests
    cli.test.ts                      -- CLI integration tests
    fixtures/
      pdf/                           -- PDF test documents
      docx/                          -- DOCX test documents
      pptx/                          -- PPTX test documents
      html/                          -- HTML test documents
  dist/                              -- Compiled output (generated by tsc)
```

---

## 21. Implementation Roadmap

### Phase 1: Core Infrastructure and HTML (v0.1.0)

Implement the foundation: types, format detection, the conversion pipeline skeleton, HTML conversion (the simplest structured format), and the CLI skeleton.

1. **Types**: Define all TypeScript types in `types.ts` -- `ConversionResult`, `DocumentMetadata`, `ConvertOptions`, `PDFOptions`, `DOCXOptions`, `PPTXOptions`, `HTMLConvertOptions`, `ImageOptions`, `OCROptions`, `DocumentFormat`, and all error classes.
2. **Format detection**: Implement `detectFormat()` with extension matching, magic byte detection, and ZIP content type reading in `detect.ts`.
3. **Content block intermediate type**: Define `ContentBlock` and the markdown generator that serializes `ContentBlock[]` to a markdown string.
4. **Cleanup**: Implement the post-processing cleanup stage (whitespace normalization, encoding fixes, garbage removal).
5. **HTML parser**: Implement HTML conversion using `cheerio` -- readability extraction, tag-to-markdown mapping, and metadata extraction.
6. **Plain text passthrough**: Implement the text/markdown passthrough parser.
7. **convert() orchestration**: Wire up the pipeline: detect format, invoke parser, generate markdown, run cleanup.
8. **CLI skeleton**: Implement basic CLI argument parsing, file reading, and stdout output.
9. **Tests**: Format detection tests, HTML conversion tests, cleanup tests, CLI tests.

### Phase 2: DOCX Conversion (v0.2.0)

Implement DOCX parsing -- the most reliable format for conversion quality.

1. **ZIP extraction**: Read DOCX files with `jszip`, extract required XML files.
2. **Style mapper**: Parse `styles.xml` and map Word styles to markdown element types.
3. **Paragraph extraction**: Traverse `document.xml`, extract paragraphs with style information, and convert to content blocks.
4. **Run-level formatting**: Handle bold, italic, strikethrough, code, and other inline formatting within paragraphs.
5. **List extraction**: Parse `numbering.xml` and convert list paragraphs to nested list content blocks.
6. **Table extraction**: Parse `<w:tbl>` elements with merged cell handling.
7. **Image extraction**: Read images from `word/media/` and create image references.
8. **Hyperlink resolution**: Resolve relationship-based hyperlinks.
9. **Footnotes and endnotes**: Parse footnote/endnote XML and attach to the document.
10. **Tests**: DOCX conversion tests with real Word documents.

### Phase 3: PDF Conversion (v0.3.0)

Implement PDF processing -- the hardest format and the core technical contribution.

1. **Text extraction**: Use `pdfjs-dist` to extract text items with positioning data from all pages.
2. **Reading order**: Sort text items by position, merge adjacent items into lines and paragraphs.
3. **Heading detection**: Implement font metric analysis for heading classification.
4. **Column detection**: Implement x-coordinate histogram analysis for multi-column layouts.
5. **Header/footer removal**: Implement repeated-text detection across pages.
6. **Page number removal**: Implement sequential-number pattern detection.
7. **Table detection**: Implement position-based grid detection for PDF tables.
8. **Image extraction**: Implement PDF image operator scanning and image data extraction.
9. **Tests**: PDF conversion tests with multi-column papers, table-heavy reports, and various layout types.

### Phase 4: PPTX, OCR, and Polish (v1.0.0)

Complete format coverage and production readiness.

1. **PPTX parser**: Implement slide parsing, text box extraction, table extraction, speaker notes, and image extraction.
2. **OCR integration**: Implement optional scanned PDF detection and `tesseract.js` integration.
3. **Image handling**: Implement all image modes (extract, inline, skip, reference, buffer).
4. **CLI polish**: Complete all CLI flags, output formats, error messages, and exit codes.
5. **Performance optimization**: Benchmark suite, memory profiling, page-level optimizations.
6. **Edge case hardening**: Unicode edge cases, malformed documents, very large documents.
7. **Documentation**: Comprehensive README with usage examples for every common scenario.
8. **Tests**: PPTX tests, OCR tests, integration tests with the full npm-master pipeline (`docling-node-ts` then `chunk-smart` then `table-chunk`).

---

## 22. Example Use Cases

### 22.1 RAG Document Ingestion Pipeline

A developer is building a RAG system that ingests corporate documents stored in a SharePoint library. Documents are a mix of PDF reports, Word memos, and PowerPoint presentations.

```typescript
import { convert } from 'docling-node-ts';
import { chunk } from 'chunk-smart';
import { createEmbedCache } from 'embed-cache';

const cache = createEmbedCache({ provider: 'openai', model: 'text-embedding-3-small' });

async function ingestDocument(filePath: string): Promise<void> {
  // Convert any document to markdown
  const { markdown, metadata, warnings } = await convert(filePath, {
    images: { mode: 'skip' },
    pdf: { columns: 'auto', removeHeaders: true },
  });

  if (warnings.length > 0) {
    console.warn(`Warnings for ${filePath}:`, warnings.map(w => w.message));
  }

  // Chunk the markdown
  const chunks = chunk(markdown, {
    maxChunkSize: 512,
    overlap: 50,
    customMetadata: {
      source: filePath,
      title: metadata.title,
      author: metadata.author,
      format: metadata.formatMetadata,
    },
  });

  // Embed and store
  for (const c of chunks) {
    const embedding = await cache.embed(c.content);
    await vectorStore.insert({
      content: c.content,
      embedding,
      metadata: c.metadata,
    });
  }

  console.log(`Ingested ${filePath}: ${chunks.length} chunks from ${metadata.pageCount ?? 1} pages`);
}
```

### 22.2 Knowledge Base Builder

A team is building an internal knowledge base from hundreds of PDF manuals and Word documents.

```typescript
import { convert } from 'docling-node-ts';
import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SUPPORTED = new Set(['.pdf', '.docx', '.pptx', '.html']);

async function buildKnowledgeBase(directory: string): Promise<void> {
  const files = await readdir(directory, { recursive: true });
  const documents = files.filter(f => SUPPORTED.has(extname(f).toLowerCase()));

  console.log(`Found ${documents.length} documents to process`);

  for (const file of documents) {
    const filePath = join(directory, file);
    try {
      const { markdown, metadata } = await convert(filePath, {
        images: { mode: 'reference' },
      });

      await writeFile(
        filePath.replace(extname(filePath), '.md'),
        markdown
      );

      console.log(`Converted: ${file} (${metadata.wordCount} words)`);
    } catch (error) {
      console.error(`Failed: ${file} — ${error.message}`);
    }
  }
}
```

### 22.3 PDF Financial Report Processing

A data team processes quarterly financial reports that are heavy on tables.

```typescript
import { convert } from 'docling-node-ts';
import { chunkTable } from 'table-chunk';

const { markdown, tables, metadata } = await convert('./10-K-filing.pdf', {
  pdf: {
    columns: 'single',
    removeHeaders: true,
    removeFooters: true,
  },
});

console.log(`Extracted ${tables.length} tables from ${metadata.pageCount} pages`);

// Process each table with specialized table chunking
for (const table of tables) {
  console.log(`Table ${table.index}: ${table.headers.join(', ')} (${table.rows.length} rows)`);

  const tableChunks = chunkTable(table.markdown, {
    strategy: 'serialized',
    serializationFormat: 'key-value',
    maxTokens: 256,
  });

  for (const chunk of tableChunks) {
    await vectorStore.insert({
      content: chunk.text,
      metadata: {
        source: '10-K-filing.pdf',
        tableIndex: table.index,
        ...chunk.metadata,
      },
    });
  }
}
```

### 22.4 Content Migration from DOCX to Markdown

An organization migrates their Word document library to a markdown-based wiki.

```typescript
import { convert } from 'docling-node-ts';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

async function migrateDocument(docxPath: string, outputDir: string): Promise<void> {
  const name = basename(docxPath, extname(docxPath));
  const imageDir = join(outputDir, name, 'images');
  await mkdir(imageDir, { recursive: true });

  const { markdown, images, metadata } = await convert(docxPath, {
    images: {
      mode: 'extract',
      outputDir: imageDir,
      format: 'png',
    },
    docx: {
      includeFootnotes: true,
      footnoteStyle: 'end',
    },
  });

  await writeFile(join(outputDir, `${name}.md`), markdown);
  console.log(`Migrated: ${name} — ${metadata.wordCount} words, ${images.length} images`);
}
```

### 22.5 CLI Batch Processing

A developer converts all PDFs in a directory from the command line.

```bash
# Convert all PDFs to markdown
for f in /path/to/documents/*.pdf; do
  docling-node-ts "$f" -o "${f%.pdf}.md" --images skip --quiet
done

# Convert a specific PDF with table extraction, output as JSON
docling-node-ts financial-report.pdf --json | jq '.tables[] | .headers'

# Convert an HTML page by URL
docling-node-ts https://example.com/article -o article.md --base-url https://example.com

# Convert with verbose progress
docling-node-ts large-report.pdf -o report.md --verbose --pages 1-20
```

### 22.6 Document Processing API Endpoint

A backend engineer builds a document conversion endpoint in Express.

```typescript
import express from 'express';
import multer from 'multer';
import { convert } from 'docling-node-ts';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/convert', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  try {
    const result = await convert(req.file.buffer, {
      format: req.body.format,  // optional explicit format
      images: { mode: 'skip' },
      pdf: { columns: 'auto' },
    });

    res.json({
      markdown: result.markdown,
      metadata: result.metadata,
      tables: result.tables.length,
      warnings: result.warnings,
      durationMs: result.durationMs,
    });
  } catch (error) {
    res.status(422).json({ error: error.message });
  }
});
```
