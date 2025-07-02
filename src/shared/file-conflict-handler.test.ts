import { promises as fs } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ConflictState, handleFileConflict } from './file-conflict-handler.js';

// Mock file system
vi.mock('node:fs', () => ({
  promises: {
    access: vi.fn()
  }
}));

// Mock question handler
vi.mock('./question-handler.js', () => ({
  askQuestions: vi.fn()
}));

import * as questionHandler from './question-handler.js';

describe('file-conflict-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleFileConflict', () => {
    const mockConflictState: ConflictState = {
      overwriteAll: false,
      renameAll: false
    };

    it('should return overwrite when file does not exist', async () => {
      const outputPath = '/path/to/output.png';

      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const result = await handleFileConflict(outputPath, mockConflictState);

      expect(result).toEqual({
        action: 'overwrite',
        newPath: outputPath
      });
    });

    it('should return overwriteAll when state is set', async () => {
      const outputPath = '/path/to/output.png';
      const conflictState: ConflictState = {
        overwriteAll: true,
        renameAll: false
      };

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await handleFileConflict(outputPath, conflictState);

      expect(result).toEqual({
        action: 'overwriteAll',
        newPath: outputPath
      });
    });

    it('should ask user and handle their choice', async () => {
      const outputPath = '/path/to/output.png';

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(questionHandler.askQuestions).mockResolvedValue({
        conflictAction: 'overwrite'
      });

      const result = await handleFileConflict(outputPath, mockConflictState);

      expect(questionHandler.askQuestions).toHaveBeenCalled();
      expect(result.action).toBe('overwrite');
    });

    it('should handle cancel choice', async () => {
      const outputPath = '/path/to/output.png';

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(questionHandler.askQuestions).mockResolvedValue({
        conflictAction: 'cancel'
      });

      const result = await handleFileConflict(outputPath, mockConflictState);

      expect(result).toEqual({
        action: 'cancel'
      });
    });
  });
});
