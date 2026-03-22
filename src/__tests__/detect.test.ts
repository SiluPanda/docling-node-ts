import { describe, it, expect } from 'vitest';
import { detectFormat } from '../detect';

describe('detectFormat', () => {
  describe('file extension detection', () => {
    it('detects .pdf extension', () => {
      expect(detectFormat('', 'report.pdf')).toBe('pdf');
    });

    it('detects .docx extension', () => {
      expect(detectFormat('', 'document.docx')).toBe('docx');
    });

    it('detects .pptx extension', () => {
      expect(detectFormat('', 'slides.pptx')).toBe('pptx');
    });

    it('detects .html extension', () => {
      expect(detectFormat('', 'page.html')).toBe('html');
    });

    it('detects .htm extension', () => {
      expect(detectFormat('', 'page.htm')).toBe('html');
    });

    it('detects .xhtml extension', () => {
      expect(detectFormat('', 'page.xhtml')).toBe('html');
    });

    it('detects .txt extension', () => {
      expect(detectFormat('', 'notes.txt')).toBe('text');
    });

    it('detects .md extension', () => {
      expect(detectFormat('', 'README.md')).toBe('markdown');
    });

    it('detects .markdown extension', () => {
      expect(detectFormat('', 'guide.markdown')).toBe('markdown');
    });

    it('is case-insensitive for extensions', () => {
      expect(detectFormat('', 'REPORT.PDF')).toBe('pdf');
      expect(detectFormat('', 'Document.DOCX')).toBe('docx');
      expect(detectFormat('', 'PAGE.HTML')).toBe('html');
    });

    it('handles paths with directories', () => {
      expect(detectFormat('', '/path/to/report.pdf')).toBe('pdf');
      expect(detectFormat('', 'C:\\docs\\file.docx')).toBe('docx');
    });

    it('handles files with multiple dots', () => {
      expect(detectFormat('', 'report.v2.final.pdf')).toBe('pdf');
    });
  });

  describe('magic bytes detection', () => {
    it('detects PDF from magic bytes', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 some content', 'utf-8');
      expect(detectFormat(pdfBuffer)).toBe('pdf');
    });

    it('detects ZIP-based format from magic bytes', () => {
      const zipBuffer = Buffer.alloc(100);
      zipBuffer[0] = 0x50; // P
      zipBuffer[1] = 0x4b; // K
      zipBuffer[2] = 0x03;
      zipBuffer[3] = 0x04;
      // Add word/ hint
      const wordHint = Buffer.from('word/document.xml');
      wordHint.copy(zipBuffer, 10);
      expect(detectFormat(zipBuffer)).toBe('docx');
    });

    it('detects PPTX from ZIP magic bytes with ppt/ content', () => {
      const zipBuffer = Buffer.alloc(100);
      zipBuffer[0] = 0x50; // P
      zipBuffer[1] = 0x4b; // K
      zipBuffer[2] = 0x03;
      zipBuffer[3] = 0x04;
      const pptHint = Buffer.from('ppt/slides/slide1.xml');
      pptHint.copy(zipBuffer, 10);
      expect(detectFormat(zipBuffer)).toBe('pptx');
    });

    it('defaults ZIP to docx when no content type hints', () => {
      const zipBuffer = Buffer.alloc(10);
      zipBuffer[0] = 0x50;
      zipBuffer[1] = 0x4b;
      zipBuffer[2] = 0x03;
      zipBuffer[3] = 0x04;
      expect(detectFormat(zipBuffer)).toBe('docx');
    });

    it('falls back to content analysis for unknown binary', () => {
      const htmlBuffer = Buffer.from('<html><body>Hello</body></html>', 'utf-8');
      expect(detectFormat(htmlBuffer)).toBe('html');
    });
  });

  describe('content analysis detection', () => {
    it('detects HTML from <!DOCTYPE html>', () => {
      expect(detectFormat('<!DOCTYPE html><html><body>Hello</body></html>')).toBe('html');
    });

    it('detects HTML from <!doctype html> (case-insensitive)', () => {
      expect(detectFormat('<!doctype html><html><body>Hello</body></html>')).toBe('html');
    });

    it('detects HTML from <html> tag', () => {
      expect(detectFormat('<html><body>Hello</body></html>')).toBe('html');
    });

    it('detects HTML from multiple HTML tags', () => {
      expect(detectFormat('<div><p>Hello</p><p>World</p></div>')).toBe('html');
    });

    it('detects markdown from ATX headings', () => {
      expect(detectFormat('# Title\n\nSome text\n\n## Section\n\nMore text')).toBe('markdown');
    });

    it('detects markdown from links and emphasis', () => {
      expect(detectFormat('This is **bold** and [a link](https://example.com)\n\n- item 1\n- item 2')).toBe('markdown');
    });

    it('detects markdown from code blocks', () => {
      expect(detectFormat('Some text\n\n```js\nconst x = 1;\n```\n\n## Heading')).toBe('markdown');
    });

    it('detects markdown from image references', () => {
      expect(detectFormat('# Title\n\n![alt text](image.png)\n\nSome text')).toBe('markdown');
    });

    it('defaults to text for plain content', () => {
      expect(detectFormat('Just some plain text here.\nNothing special.')).toBe('text');
    });

    it('defaults to text for empty string', () => {
      expect(detectFormat('')).toBe('text');
    });

    it('defaults to text for short content without markers', () => {
      expect(detectFormat('Hello world')).toBe('text');
    });

    it('handles whitespace-only input', () => {
      expect(detectFormat('   \n\n  \t  ')).toBe('text');
    });

    it('does not detect single HTML tag as HTML', () => {
      // Need multiple tags to be classified as HTML
      expect(detectFormat('This has a <br> in it')).toBe('text');
    });

    it('detects markdown from blockquotes', () => {
      expect(detectFormat('# Title\n\n> This is a quote\n\nSome text')).toBe('markdown');
    });
  });

  describe('priority order', () => {
    it('file extension takes priority over content', () => {
      const htmlContent = '<html><body>Hello</body></html>';
      expect(detectFormat(htmlContent, 'file.txt')).toBe('text');
    });

    it('file extension takes priority over magic bytes', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 content', 'utf-8');
      expect(detectFormat(pdfBuffer, 'file.txt')).toBe('text');
    });

    it('falls back to magic bytes when no extension', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 content', 'utf-8');
      expect(detectFormat(pdfBuffer)).toBe('pdf');
    });

    it('falls back to content when no extension and not buffer', () => {
      expect(detectFormat('# Hello\n\n## World\n\n- item')).toBe('markdown');
    });
  });

  describe('edge cases', () => {
    it('handles buffer shorter than 4 bytes', () => {
      const shortBuf = Buffer.from('Hi');
      expect(detectFormat(shortBuf)).toBe('text');
    });

    it('handles fileName without extension', () => {
      expect(detectFormat('content', 'Makefile')).toBe('text');
    });

    it('handles fileName with unknown extension', () => {
      expect(detectFormat('content', 'file.xyz')).toBe('text');
    });
  });
});
