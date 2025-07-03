import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AccountErrorResponse,
  type AccountResponse,
  getAccountDetails
} from './api-client.js';
import * as configManager from './config-manager.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock config manager
vi.mock('./config-manager.js', () => ({
  getActiveApiKey: vi.fn()
}));

describe('api-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccountDetails', () => {
    it('should return account details when API call succeeds', async () => {
      // Mock active API key
      vi.mocked(configManager.getActiveApiKey).mockResolvedValue({
        id: 'test-key',
        data: {
          name: 'Test Key',
          type: 'sandbox',
          key: 'sandbox_sk_test123',
          active: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      });

      // Mock successful API response
      const mockResponse: AccountResponse = {
        credits: {
          available: 100,
          subscription: 50
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await getAccountDetails();

      expect(fetch).toHaveBeenCalledWith('https://image-api.photoroom.com/v1/account', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-api-key': 'sandbox_sk_test123'
        }
      });

      expect(result).toEqual(mockResponse);
      expect('credits' in result).toBe(true);
    });

    it('should return error when API call fails', async () => {
      // Mock active API key
      vi.mocked(configManager.getActiveApiKey).mockResolvedValue({
        id: 'test-key',
        data: {
          name: 'Test Key',
          type: 'sandbox',
          key: 'sandbox_sk_test123',
          active: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      });

      // Mock error API response
      const mockErrorResponse: AccountErrorResponse = {
        error: {
          message: 'Invalid API key'
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const result = await getAccountDetails();

      expect(result).toEqual(mockErrorResponse);
      expect('error' in result).toBe(true);
    });

    it('should throw error when no active API key is found', async () => {
      // Mock no active API key
      vi.mocked(configManager.getActiveApiKey).mockResolvedValue(null);

      await expect(getAccountDetails()).rejects.toThrow(
        'No active API key found. Please add and activate an API key first.'
      );

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should throw error when network request fails', async () => {
      // Mock active API key
      vi.mocked(configManager.getActiveApiKey).mockResolvedValue({
        id: 'test-key',
        data: {
          name: 'Test Key',
          type: 'sandbox',
          key: 'sandbox_sk_test123',
          active: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      });

      // Mock network error
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(getAccountDetails()).rejects.toThrow('Network error: Network error');
    });
  });
});
