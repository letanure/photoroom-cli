import { promises as fs } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveApiKey, listApiKeys } from './config-manager.js';

// Mock file system operations
vi.mock('node:fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn()
  }
}));

describe('config-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveApiKey', () => {
    it('should return null when config file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await getActiveApiKey();

      expect(result).toBeNull();
    });

    it('should return null when no active key exists', async () => {
      const mockConfig = {
        apiKeys: {},
        activeKey: null
      };

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const result = await getActiveApiKey();

      expect(result).toBeNull();
    });
  });

  describe('listApiKeys', () => {
    it('should return empty object when config file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await listApiKeys();

      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBe(0);
    });

    it('should return empty object when no keys exist', async () => {
      const mockConfig = {
        apiKeys: {},
        activeKey: null
      };

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const result = await listApiKeys();

      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBe(0);
    });
  });
});
