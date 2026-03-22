import { describe, it, expect } from 'vitest';
import { extractMetadata } from '../metadata';

describe('extractMetadata', () => {
  describe('word count', () => {
    it('counts words in plain text', () => {
      const meta = extractMetadata('Hello world this is a test\n');
      expect(meta.wordCount).toBe(6);
    });

    it('counts words ignoring markdown syntax', () => {
      const md = '# Title\n\nSome **bold** and *italic* text.\n';
      const meta = extractMetadata(md);
      // "Title", "Some", "bold", "and", "italic", "text." = 6 words
      expect(meta.wordCount).toBe(6);
    });

    it('excludes code blocks from word count', () => {
      const md = 'Before\n\n```js\nconst x = 1;\n```\n\nAfter\n';
      const meta = extractMetadata(md);
      // "Before", "After" = 2 words (code block excluded)
      expect(meta.wordCount).toBe(2);
    });

    it('excludes image references from word count', () => {
      const md = 'Text ![alt text](image.png) more\n';
      const meta = extractMetadata(md);
      // "Text", "more" = 2 (image excluded)
      expect(meta.wordCount).toBe(2);
    });

    it('counts link text but not URL', () => {
      const md = 'Click [here](https://example.com) now\n';
      const meta = extractMetadata(md);
      // "Click", "here", "now" = 3
      expect(meta.wordCount).toBe(3);
    });

    it('handles empty input', () => {
      const meta = extractMetadata('');
      expect(meta.wordCount).toBe(0);
    });

    it('ignores blockquote markers', () => {
      const md = '> Quoted text here\n';
      const meta = extractMetadata(md);
      // "Quoted", "text", "here"
      expect(meta.wordCount).toBe(3);
    });

    it('ignores horizontal rules', () => {
      const md = 'Before\n\n---\n\nAfter\n';
      const meta = extractMetadata(md);
      expect(meta.wordCount).toBe(2);
    });
  });

  describe('heading count', () => {
    it('counts headings', () => {
      const md = '# H1\n\n## H2\n\n### H3\n\nText\n';
      const meta = extractMetadata(md);
      expect(meta.headingCount).toBe(3);
    });

    it('counts all heading levels', () => {
      const md = '# One\n## Two\n### Three\n#### Four\n##### Five\n###### Six\n';
      const meta = extractMetadata(md);
      expect(meta.headingCount).toBe(6);
    });

    it('returns 0 for no headings', () => {
      const md = 'Just regular text.\n';
      const meta = extractMetadata(md);
      expect(meta.headingCount).toBe(0);
    });

    it('does not count non-heading hash marks', () => {
      const md = 'This has a #hashtag in it\n';
      const meta = extractMetadata(md);
      expect(meta.headingCount).toBe(0);
    });
  });

  describe('image count', () => {
    it('counts images', () => {
      const md = '![alt1](img1.png)\n\nText\n\n![alt2](img2.jpg)\n';
      const meta = extractMetadata(md);
      expect(meta.imageCount).toBe(2);
    });

    it('returns 0 for no images', () => {
      const md = 'No images here.\n';
      const meta = extractMetadata(md);
      expect(meta.imageCount).toBe(0);
    });

    it('counts images with empty alt', () => {
      const md = '![](photo.png)\n';
      const meta = extractMetadata(md);
      expect(meta.imageCount).toBe(1);
    });

    it('does not count regular links as images', () => {
      const md = '[link text](https://example.com)\n';
      const meta = extractMetadata(md);
      expect(meta.imageCount).toBe(0);
    });
  });

  describe('reading time', () => {
    it('calculates reading time (minimum 1 minute)', () => {
      const meta = extractMetadata('Short text.\n');
      expect(meta.readingTimeMinutes).toBe(1);
    });

    it('calculates reading time for longer text', () => {
      // 400 words = 2 minutes at 200 wpm
      const words = Array(400).fill('word').join(' ');
      const meta = extractMetadata(words + '\n');
      expect(meta.readingTimeMinutes).toBe(2);
    });

    it('rounds up reading time', () => {
      // 201 words = 1.005 minutes, rounds up to 2
      const words = Array(201).fill('word').join(' ');
      const meta = extractMetadata(words + '\n');
      expect(meta.readingTimeMinutes).toBe(2);
    });

    it('returns 1 for empty input', () => {
      const meta = extractMetadata('');
      expect(meta.readingTimeMinutes).toBe(1);
    });
  });
});
