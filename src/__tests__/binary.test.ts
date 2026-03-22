import { describe, it, expect } from 'vitest';
import { handleBinaryFormat } from '../converters/binary';

describe('handleBinaryFormat', () => {
  describe('PDF format', () => {
    it('returns informative message for PDF', () => {
      const result = handleBinaryFormat('pdf');
      expect(result.markdown).toContain('PDF');
      expect(result.markdown).toContain('Binary format detected');
    });

    it('suggests pdf-parse package', () => {
      const result = handleBinaryFormat('pdf');
      expect(result.markdown).toContain('pdf-parse');
    });

    it('includes warnings', () => {
      const result = handleBinaryFormat('pdf');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('pdf');
    });

    it('returns zero word count', () => {
      const result = handleBinaryFormat('pdf');
      expect(result.metadata.wordCount).toBe(0);
    });

    it('includes example code', () => {
      const result = handleBinaryFormat('pdf');
      expect(result.markdown).toContain('pdf-parse');
    });
  });

  describe('DOCX format', () => {
    it('returns informative message for DOCX', () => {
      const result = handleBinaryFormat('docx');
      expect(result.markdown).toContain('DOCX');
    });

    it('suggests mammoth package', () => {
      const result = handleBinaryFormat('docx');
      expect(result.markdown).toContain('mammoth');
    });

    it('includes code example', () => {
      const result = handleBinaryFormat('docx');
      expect(result.markdown).toContain('mammoth');
    });
  });

  describe('PPTX format', () => {
    it('returns informative message for PPTX', () => {
      const result = handleBinaryFormat('pptx');
      expect(result.markdown).toContain('PPTX');
    });

    it('suggests jszip package', () => {
      const result = handleBinaryFormat('pptx');
      expect(result.markdown).toContain('jszip');
    });
  });

  describe('unsupported format', () => {
    it('handles unknown formats gracefully', () => {
      // Force an unsupported format through the type system
      const result = handleBinaryFormat('html' as any);
      expect(result.markdown).toContain('Unsupported format');
      expect(result.warnings).toContain('Unsupported binary format: html');
    });
  });

  describe('ConversionResult structure', () => {
    it('returns all required fields', () => {
      const result = handleBinaryFormat('pdf');
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('pages');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('durationMs');
    });

    it('returns empty images array', () => {
      const result = handleBinaryFormat('pdf');
      expect(result.images).toEqual([]);
    });

    it('returns empty pages array', () => {
      const result = handleBinaryFormat('pdf');
      expect(result.pages).toEqual([]);
    });

    it('returns non-negative durationMs', () => {
      const result = handleBinaryFormat('pdf');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('returns metadata with all fields', () => {
      const result = handleBinaryFormat('docx');
      expect(result.metadata.wordCount).toBe(0);
      expect(result.metadata.headingCount).toBe(0);
      expect(result.metadata.imageCount).toBe(0);
      expect(result.metadata.readingTimeMinutes).toBe(0);
    });
  });
});
