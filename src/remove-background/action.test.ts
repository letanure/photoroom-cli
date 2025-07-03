import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoveBackgroundOptions } from '../shared/api-client.js';
import type { ConflictState } from '../shared/file-conflict-handler.js';
import { processRemoveBackground } from './action.js';

// Mock the API client
vi.mock('../shared/api-client.js', () => ({
  removeBackgroundApi: vi.fn(),
  saveProcessedImage: vi.fn()
}));

import * as apiClient from '../shared/api-client.js';

describe('remove-background action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processRemoveBackground', () => {
    const mockOptions: RemoveBackgroundOptions = {
      format: 'png',
      outputDir: 'output'
    };

    const mockConflictState: ConflictState = {
      overwriteAll: false,
      renameAll: false
    };

    it('should process image successfully', async () => {
      const mockApiResponse = [
        {
          path: '/test/image.jpg',
          result: {
            success: true as const,
            data: Buffer.from('processed image data'),
            uncertaintyScore: 0.1
          }
        }
      ];

      vi.mocked(apiClient.removeBackgroundApi).mockResolvedValue(mockApiResponse);
      vi.mocked(apiClient.saveProcessedImage).mockResolvedValue('output/image_processed.png');

      const result = await processRemoveBackground(
        '/test/image.jpg',
        mockOptions,
        mockConflictState
      );

      expect(apiClient.removeBackgroundApi).toHaveBeenCalledWith(['/test/image.jpg'], mockOptions);
      expect(apiClient.saveProcessedImage).toHaveBeenCalledWith(
        '/test/image.jpg',
        Buffer.from('processed image data'),
        mockOptions,
        mockConflictState
      );

      expect(result).toEqual({
        success: true,
        outputPath: 'output/image_processed.png',
        uncertaintyScore: 0.1
      });
    });

    it('should handle API errors', async () => {
      const mockApiResponse = [
        {
          path: '/test/image.jpg',
          result: {
            success: false as const,
            error: 'Invalid image format',
            detail: 'Image must be JPEG or PNG',
            type: 'validation_error',
            statusCode: 400
          }
        }
      ];

      vi.mocked(apiClient.removeBackgroundApi).mockResolvedValue(mockApiResponse);

      const result = await processRemoveBackground(
        '/test/image.jpg',
        mockOptions,
        mockConflictState
      );

      expect(result).toEqual({
        success: false,
        error: 'Invalid image format',
        detail: 'Image must be JPEG or PNG',
        type: 'validation_error',
        statusCode: 400
      });
    });

    it('should handle no result from API', async () => {
      const mockApiResponse: Array<{
        path: string;
        result: import('../shared/api-client.js').ApiResponse;
      }> = [];

      vi.mocked(apiClient.removeBackgroundApi).mockResolvedValue(mockApiResponse);

      const result = await processRemoveBackground(
        '/test/image.jpg',
        mockOptions,
        mockConflictState
      );

      expect(result).toEqual({
        success: false,
        error: 'No result returned from API'
      });
    });

    it('should handle save operation cancellation', async () => {
      const mockApiResponse = [
        {
          path: '/test/image.jpg',
          result: {
            success: true as const,
            data: Buffer.from('processed image data'),
            uncertaintyScore: 0.1
          }
        }
      ];

      vi.mocked(apiClient.removeBackgroundApi).mockResolvedValue(mockApiResponse);
      vi.mocked(apiClient.saveProcessedImage).mockResolvedValue(null); // User cancelled

      const result = await processRemoveBackground(
        '/test/image.jpg',
        mockOptions,
        mockConflictState
      );

      expect(result).toEqual({
        success: false,
        error: 'Operation cancelled by user'
      });
    });

    it('should handle save operation errors', async () => {
      const mockApiResponse = [
        {
          path: '/test/image.jpg',
          result: {
            success: true as const,
            data: Buffer.from('processed image data'),
            uncertaintyScore: 0.1
          }
        }
      ];

      vi.mocked(apiClient.removeBackgroundApi).mockResolvedValue(mockApiResponse);
      vi.mocked(apiClient.saveProcessedImage).mockRejectedValue(new Error('Permission denied'));

      const result = await processRemoveBackground(
        '/test/image.jpg',
        mockOptions,
        mockConflictState
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to save processed image: Error: Permission denied'
      });
    });

    it('should handle API client exceptions', async () => {
      vi.mocked(apiClient.removeBackgroundApi).mockRejectedValue(new Error('Network timeout'));

      const result = await processRemoveBackground(
        '/test/image.jpg',
        mockOptions,
        mockConflictState
      );

      expect(result).toEqual({
        success: false,
        error: 'Network timeout'
      });
    });
  });
});
