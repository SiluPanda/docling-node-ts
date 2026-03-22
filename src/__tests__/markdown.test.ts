import { describe, it, expect } from 'vitest';
import { cleanAndNormalizeMarkdown } from '../converters/markdown';

describe('cleanAndNormalizeMarkdown', () => {
  describe('line ending normalization', () => {
    it('converts CRLF to LF', () => {
      const result = cleanAndNormalizeMarkdown('Line 1\r\nLine 2\r\n');
      expect(result).not.toContain('\r');
      expect(result).toContain('Line 1\nLine 2');
    });

    it('converts CR to LF', () => {
      const result = cleanAndNormalizeMarkdown('Line 1\rLine 2\r');
      expect(result).not.toContain('\r');
      expect(result).toContain('Line 1\nLine 2');
    });
  });

  describe('trailing whitespace', () => {
    it('removes trailing spaces from lines', () => {
      const result = cleanAndNormalizeMarkdown('Hello   \nWorld  \n');
      const lines = result.split('\n');
      for (const line of lines) {
        expect(line).toBe(line.trimEnd());
      }
    });

    it('removes trailing tabs from lines', () => {
      const result = cleanAndNormalizeMarkdown('Hello\t\nWorld\t\n');
      const lines = result.split('\n');
      for (const line of lines) {
        expect(line).toBe(line.trimEnd());
      }
    });
  });

  describe('blank line collapsing', () => {
    it('collapses triple blank lines to double', () => {
      const result = cleanAndNormalizeMarkdown('A\n\n\nB');
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('collapses many blank lines to double', () => {
      const result = cleanAndNormalizeMarkdown('A\n\n\n\n\n\nB');
      expect(result).toContain('A\n\nB');
    });
  });

  describe('heading spacing', () => {
    it('ensures blank line before headings', () => {
      const result = cleanAndNormalizeMarkdown('Text\n## Heading');
      expect(result).toContain('Text\n\n## Heading');
    });

    it('ensures blank line after headings', () => {
      const result = cleanAndNormalizeMarkdown('## Heading\nText');
      expect(result).toContain('## Heading\n\nText');
    });

    it('preserves existing blank lines around headings', () => {
      const result = cleanAndNormalizeMarkdown('Text\n\n## Heading\n\nMore text');
      expect(result).toContain('Text\n\n## Heading\n\nMore text');
    });
  });

  describe('list marker standardization', () => {
    it('converts * to -', () => {
      const result = cleanAndNormalizeMarkdown('* Item 1\n* Item 2');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('converts + to -', () => {
      const result = cleanAndNormalizeMarkdown('+ Item 1\n+ Item 2');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('preserves - marker', () => {
      const result = cleanAndNormalizeMarkdown('- Item 1\n- Item 2');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('handles indented list markers', () => {
      const result = cleanAndNormalizeMarkdown('  * Nested\n    * Deep');
      expect(result).toContain('  - Nested');
      expect(result).toContain('    - Deep');
    });
  });

  describe('heading level normalization', () => {
    it('fills gaps in heading levels', () => {
      const result = cleanAndNormalizeMarkdown('# Title\n\n### Subsection');
      // ### should become ## since ## is not used
      expect(result).toContain('# Title');
      expect(result).toContain('## Subsection');
    });

    it('preserves already-correct levels', () => {
      const result = cleanAndNormalizeMarkdown('# Title\n\n## Section\n\n### Sub');
      expect(result).toContain('# Title');
      expect(result).toContain('## Section');
      expect(result).toContain('### Sub');
    });

    it('handles single heading level', () => {
      const result = cleanAndNormalizeMarkdown('## Only Level');
      expect(result).toContain('## Only Level');
    });

    it('normalizes multiple skipped levels', () => {
      const result = cleanAndNormalizeMarkdown('# Title\n\n#### Deep\n\n###### Deeper');
      expect(result).toContain('# Title');
      expect(result).toContain('## Deep');
      expect(result).toContain('### Deeper');
    });
  });

  describe('broken link cleanup', () => {
    it('removes links with empty href', () => {
      const result = cleanAndNormalizeMarkdown('Click [here]() for info');
      expect(result).toContain('Click here for info');
      expect(result).not.toContain('[here]()');
    });

    it('preserves valid links', () => {
      const result = cleanAndNormalizeMarkdown('[Link](https://example.com)');
      expect(result).toContain('[Link](https://example.com)');
    });
  });

  describe('trailing newline', () => {
    it('ensures single trailing newline', () => {
      const result = cleanAndNormalizeMarkdown('Content');
      expect(result).toMatch(/\n$/);
      expect(result).not.toMatch(/\n\n$/);
    });

    it('removes excess trailing newlines', () => {
      const result = cleanAndNormalizeMarkdown('Content\n\n\n');
      expect(result).toBe('Content\n');
    });
  });

  describe('leading blank lines', () => {
    it('removes leading blank lines', () => {
      const result = cleanAndNormalizeMarkdown('\n\n\nContent');
      expect(result).toBe('Content\n');
    });
  });

  describe('complex documents', () => {
    it('handles a full markdown document', () => {
      const input = [
        '# Title',
        '',
        'Introduction paragraph.',
        '',
        '### Skipped Level',
        '',
        '* Item 1',
        '+ Item 2',
        '- Item 3',
        '',
        'Click [here]() for nothing.',
        '',
        '[Valid](https://example.com)',
        '',
      ].join('\n');

      const result = cleanAndNormalizeMarkdown(input);
      expect(result).toContain('# Title');
      expect(result).toContain('## Skipped Level'); // Normalized from ###
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
      expect(result).toContain('- Item 3');
      expect(result).toContain('Click here for nothing.');
      expect(result).toContain('[Valid](https://example.com)');
    });
  });
});
