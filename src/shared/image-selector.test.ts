import { describe, expect, it } from 'vitest';
import type { ImageInfo } from './image-selector.js';
import { formatImageChoice } from './image-selector.js';

describe('image-selector', () => {
  describe('formatImageChoice', () => {
    it('should format valid image choice correctly', () => {
      const image: ImageInfo = {
        path: '/path/to/image.jpg',
        name: 'image.jpg',
        size: 1024,
        isValid: true
      };

      const result = formatImageChoice(image);

      expect(result).toContain('✓');
      expect(result).toContain('image.jpg');
      expect(result).toContain('1.0 KB');
    });

    it('should format invalid image choice correctly', () => {
      const image: ImageInfo = {
        path: '/path/to/large.jpg',
        name: 'large.jpg',
        size: 60 * 1024 * 1024, // 60MB
        isValid: false,
        validationMessage: 'File too large'
      };

      const result = formatImageChoice(image);

      expect(result).toContain('✗');
      expect(result).toContain('large.jpg');
      expect(result).toContain('File too large');
    });
  });
});
