import { describe, it, expect } from 'vitest';
import { convert, convertHtml, convertMarkdown, convertText } from '../convert';

describe('convert', () => {
  describe('format detection and routing', () => {
    it('detects and converts HTML', () => {
      const result = convert('<html><body><h1>Title</h1><p>Content</p></body></html>');
      expect(result.markdown).toContain('# Title');
      expect(result.markdown).toContain('Content');
    });

    it('detects and converts markdown', () => {
      const result = convert('# Title\n\n## Section\n\n- item 1\n- item 2\n\n[link](url)');
      expect(result.markdown).toContain('# Title');
      expect(result.markdown).toContain('## Section');
    });

    it('detects and converts plain text', () => {
      const result = convert('Just some plain text.\n\nAnother paragraph.');
      expect(result.markdown).toContain('Just some plain text.');
      expect(result.markdown).toContain('Another paragraph.');
    });

    it('uses explicit format from options', () => {
      // Force text format on what looks like markdown
      const result = convert('# Not a heading', { format: 'text' });
      // With text converter, # should remain as-is (no heading detection by ATX pattern)
      expect(result.warnings).toHaveLength(0);
    });

    it('uses fileName for format detection', () => {
      const result = convert('<p>Content</p>', { fileName: 'file.html' });
      expect(result.markdown).toContain('Content');
    });

    it('handles binary formats with informative message', () => {
      const result = convert('content', { format: 'pdf' });
      expect(result.markdown).toContain('Binary format detected');
      expect(result.markdown).toContain('PDF');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles docx format', () => {
      const result = convert('content', { format: 'docx' });
      expect(result.markdown).toContain('DOCX');
      expect(result.warnings).toContainEqual(expect.stringContaining('docx'));
    });

    it('handles pptx format', () => {
      const result = convert('content', { format: 'pptx' });
      expect(result.markdown).toContain('PPTX');
    });
  });

  describe('ConversionResult structure', () => {
    it('returns all required fields', () => {
      const result = convert('<p>Hello world</p>', { format: 'html' });
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('pages');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('durationMs');
    });

    it('includes metadata', () => {
      const result = convert('<h1>Title</h1><p>Some words here</p>', { format: 'html' });
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.headingCount).toBe(1);
      expect(result.metadata.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    });

    it('reports durationMs', () => {
      const result = convert('text');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('returns empty pages array', () => {
      const result = convert('text');
      expect(result.pages).toEqual([]);
    });
  });

  describe('options', () => {
    it('extracts images by default', () => {
      const result = convert('<img src="photo.jpg" alt="Photo">', { format: 'html' });
      expect(result.images.length).toBeGreaterThan(0);
    });

    it('skips images when extractImages is false', () => {
      const result = convert('<img src="photo.jpg" alt="Photo">', {
        format: 'html',
        extractImages: false,
      });
      expect(result.images).toEqual([]);
    });

    it('strips formatting when preserveStructure is false', () => {
      const result = convert('# Heading\n\n**bold** text', {
        format: 'markdown',
        preserveStructure: false,
      });
      expect(result.markdown).not.toContain('#');
      expect(result.markdown).not.toContain('**');
    });
  });

  describe('HTML metadata extraction', () => {
    it('extracts title from HTML', () => {
      const result = convert(
        '<html><head><title>My Doc</title></head><body><p>Content</p></body></html>',
        { format: 'html' }
      );
      expect(result.metadata.title).toBe('My Doc');
    });

    it('extracts author from HTML meta tags', () => {
      const result = convert(
        '<html><head><meta name="author" content="Jane"></head><body><p>Content</p></body></html>',
        { format: 'html' }
      );
      expect(result.metadata.author).toBe('Jane');
    });

    it('extracts date from HTML meta tags', () => {
      const result = convert(
        '<html><head><meta name="date" content="2024-06-15"></head><body><p>Content</p></body></html>',
        { format: 'html' }
      );
      expect(result.metadata.date).toBe('2024-06-15');
    });
  });

  describe('Buffer input', () => {
    it('handles Buffer input for HTML', () => {
      const buf = Buffer.from('<h1>From Buffer</h1><p>Text</p>', 'utf-8');
      const result = convert(buf);
      expect(result.markdown).toContain('# From Buffer');
      expect(result.markdown).toContain('Text');
    });

    it('handles Buffer input for text', () => {
      const buf = Buffer.from('Plain text content', 'utf-8');
      const result = convert(buf);
      expect(result.markdown).toContain('Plain text content');
    });

    it('detects PDF from Buffer magic bytes', () => {
      const buf = Buffer.from('%PDF-1.4 fake content');
      const result = convert(buf);
      expect(result.markdown).toContain('Binary format detected');
    });
  });
});

describe('convertHtml', () => {
  it('converts HTML to markdown', () => {
    const result = convertHtml('<h1>Hello</h1><p>World</p>');
    expect(result.markdown).toContain('# Hello');
    expect(result.markdown).toContain('World');
  });

  it('returns ConversionResult', () => {
    const result = convertHtml('<p>Test</p>');
    expect(result).toHaveProperty('markdown');
    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('images');
  });
});

describe('convertMarkdown', () => {
  it('cleans and normalizes markdown', () => {
    const result = convertMarkdown('# Title\n\n\n\n\n## Section\n\n* Item');
    expect(result.markdown).not.toMatch(/\n{3,}/);
    expect(result.markdown).toContain('- Item'); // * -> -
  });

  it('returns metadata', () => {
    const result = convertMarkdown('# Title\n\nSome words here.\n');
    expect(result.metadata.headingCount).toBe(1);
    expect(result.metadata.wordCount).toBeGreaterThan(0);
  });
});

describe('convertText', () => {
  it('converts text to markdown', () => {
    const result = convertText('TITLE\n=====\n\nBody text.');
    expect(result.markdown).toContain('# TITLE');
    expect(result.markdown).toContain('Body text.');
  });

  it('returns metadata', () => {
    const result = convertText('Some text content here.\n\nMore text.');
    expect(result.metadata.wordCount).toBeGreaterThan(0);
  });
});
