/**
 * Supported input formats for document conversion.
 */
export type InputFormat = 'html' | 'markdown' | 'text' | 'pdf' | 'docx' | 'pptx';

/**
 * Metadata extracted from a converted document.
 */
export interface DocumentMetadata {
  /** Document title, if detected */
  title?: string;
  /** Document author, if detected */
  author?: string;
  /** Document date, if detected */
  date?: string;
  /** Number of pages (for paginated formats) */
  pageCount?: number;
  /** Total word count of the converted markdown */
  wordCount: number;
  /** Number of headings in the output */
  headingCount: number;
  /** Number of images referenced in the output */
  imageCount: number;
  /** Estimated reading time in minutes */
  readingTimeMinutes: number;
}

/**
 * A reference to an image found in the document.
 */
export interface ImageReference {
  /** Unique identifier for the image */
  id: string;
  /** Alt text for the image */
  alt: string;
  /** Source URL or path of the image */
  src: string;
  /** Page number where the image was found (if applicable) */
  page?: number;
}

/**
 * Content of a single page in a paginated document.
 */
export interface PageContent {
  /** Page number (1-based) */
  pageNumber: number;
  /** Markdown content of the page */
  markdown: string;
  /** Headings found on this page */
  headings: string[];
}

/**
 * Options for document conversion.
 */
export interface ConvertOptions {
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

/**
 * Result of a document conversion.
 */
export interface ConversionResult {
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
