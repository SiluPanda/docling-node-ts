import { describe, it, expect } from 'vitest';
import { convertTextToMarkdown } from '../converters/text';

describe('convertTextToMarkdown', () => {
  describe('basic text', () => {
    it('preserves simple text', () => {
      const result = convertTextToMarkdown('Hello world');
      expect(result.trim()).toBe('Hello world');
    });

    it('normalizes CRLF line endings', () => {
      const result = convertTextToMarkdown('Line 1\r\nLine 2');
      expect(result).not.toContain('\r');
      expect(result).toContain('Line 1\nLine 2');
    });

    it('normalizes CR line endings', () => {
      const result = convertTextToMarkdown('Line 1\rLine 2');
      expect(result).not.toContain('\r');
    });

    it('removes trailing whitespace from lines', () => {
      const result = convertTextToMarkdown('Hello   \nWorld  ');
      const lines = result.split('\n');
      for (const line of lines) {
        expect(line).toBe(line.trimEnd());
      }
    });
  });

  describe('paragraph detection', () => {
    it('preserves paragraph breaks (double newlines)', () => {
      const result = convertTextToMarkdown('First paragraph.\n\nSecond paragraph.');
      expect(result).toContain('First paragraph.\n\nSecond paragraph.');
    });

    it('collapses multiple blank lines', () => {
      const result = convertTextToMarkdown('A\n\n\n\n\nB');
      expect(result).not.toMatch(/\n{3,}/);
    });
  });

  describe('heading detection', () => {
    it('detects setext-style h1 (===)', () => {
      const result = convertTextToMarkdown('Title\n=====\n\nContent');
      expect(result).toContain('# Title');
      expect(result).not.toContain('=====');
    });

    it('detects setext-style h2 (---)', () => {
      const result = convertTextToMarkdown('Section\n-------\n\nContent');
      expect(result).toContain('## Section');
      expect(result).not.toContain('-------');
    });

    it('detects ALL CAPS headings', () => {
      const result = convertTextToMarkdown('\nINTRODUCTION\n\nSome body text follows.');
      expect(result).toContain('## INTRODUCTION');
    });

    it('does not convert long ALL CAPS text to headings', () => {
      const longCaps = 'THIS IS A VERY LONG LINE THAT SHOULD NOT BE TREATED AS A HEADING BECAUSE IT HAS TOO MANY WORDS IN IT';
      const result = convertTextToMarkdown(`\n${longCaps}\n\nNext paragraph.`);
      // More than 10 words, should not become heading
      expect(result).not.toMatch(/^## THIS IS A VERY LONG/m);
    });

    it('does not convert ALL CAPS with no letters to heading', () => {
      const result = convertTextToMarkdown('\n12345\n\nContent');
      expect(result).not.toContain('## 12345');
    });

    it('requires blank line before ALL CAPS heading', () => {
      const result = convertTextToMarkdown('Some text\nCAPITALS\n\nMore text');
      // No blank line before, so should not be a heading
      expect(result).not.toContain('## CAPITALS');
    });
  });

  describe('list detection', () => {
    it('preserves dash list items', () => {
      const result = convertTextToMarkdown('- Item 1\n- Item 2\n- Item 3');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
      expect(result).toContain('- Item 3');
    });

    it('standardizes * list items to -', () => {
      const result = convertTextToMarkdown('* Item 1\n* Item 2');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('standardizes + list items to -', () => {
      const result = convertTextToMarkdown('+ Item 1\n+ Item 2');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('normalizes ordered list markers', () => {
      const result = convertTextToMarkdown('1. First\n2. Second\n3. Third');
      expect(result).toContain('1. First');
      expect(result).toContain('2. Second');
      expect(result).toContain('3. Third');
    });

    it('handles ordered list with ) marker', () => {
      const result = convertTextToMarkdown('1) First\n2) Second');
      expect(result).toContain('1. First');
      expect(result).toContain('2. Second');
    });
  });

  describe('whitespace handling', () => {
    it('removes leading blank lines', () => {
      const result = convertTextToMarkdown('\n\n\nContent');
      expect(result).not.toMatch(/^\n/);
    });

    it('ensures single trailing newline', () => {
      const result = convertTextToMarkdown('Content');
      expect(result).toMatch(/\n$/);
      expect(result).not.toMatch(/\n\n$/);
    });

    it('handles empty input', () => {
      const result = convertTextToMarkdown('');
      expect(result).toBe('\n');
    });

    it('handles whitespace-only input', () => {
      const result = convertTextToMarkdown('   \n\n  ');
      expect(result).toBe('\n');
    });
  });

  describe('complex documents', () => {
    it('handles a full text document', () => {
      const input = [
        'DOCUMENT TITLE',
        '',
        'This is the introduction to the document.',
        'It spans multiple lines.',
        '',
        'Key Points',
        '----------',
        '',
        '- First point',
        '- Second point',
        '- Third point',
        '',
        '1. Step one',
        '2. Step two',
        '3. Step three',
        '',
        'CONCLUSION',
        '',
        'This is the conclusion.',
      ].join('\n');

      const result = convertTextToMarkdown(input);
      expect(result).toContain('## DOCUMENT TITLE');
      expect(result).toContain('This is the introduction');
      expect(result).toContain('## Key Points');
      expect(result).toContain('- First point');
      expect(result).toContain('1. Step one');
      expect(result).toContain('## CONCLUSION');
      expect(result).toContain('This is the conclusion.');
    });
  });

  describe('ordered list indentation', () => {
    it('preserves indentation for ordered list items', () => {
      const text = '  1) First\n  2) Second\n    3) Nested';
      const result = convertTextToMarkdown(text);
      expect(result).toContain('  1. First');
      expect(result).toContain('  2. Second');
      expect(result).toContain('    3. Nested');
    });
  });
});
