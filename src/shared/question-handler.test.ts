import enquirer from 'enquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  InputQuestion,
  NumberQuestion,
  SelectQuestion,
  ToggleQuestion
} from './question-handler.js';
import { askQuestions } from './question-handler.js';

// Mock enquirer
vi.mock('enquirer', () => ({
  default: {
    prompt: vi.fn(),
    // Mock the constructors
    NumberPrompt: vi.fn().mockImplementation(() => ({
      run: vi.fn().mockResolvedValue(100)
    })),
    Toggle: vi.fn().mockImplementation(() => ({
      run: vi.fn().mockResolvedValue(true)
    }))
  }
}));

// Mock image selector
vi.mock('./image-selector.js', () => ({
  findImages: vi.fn(() => Promise.resolve([])),
  formatImageChoice: vi.fn()
}));

describe('question-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('askQuestions', () => {
    it('should handle input questions', async () => {
      const questions: InputQuestion[] = [
        {
          type: 'input',
          name: 'username',
          label: 'Enter username'
        }
      ];

      vi.mocked(enquirer.prompt).mockResolvedValue({ username: 'testuser' });

      const result = await askQuestions(questions);

      expect(enquirer.prompt).toHaveBeenCalled();
      expect(result).toEqual({ username: 'testuser' });
    });

    it('should handle select questions', async () => {
      type TestOptions = readonly ['option1', 'option2'];
      const questions: SelectQuestion<TestOptions>[] = [
        {
          type: 'select',
          name: 'choice',
          label: 'Select an option',
          choices: [
            { message: 'Option 1', name: 'option1', value: 'option1' },
            { message: 'Option 2', name: 'option2', value: 'option2' }
          ]
        }
      ];

      vi.mocked(enquirer.prompt).mockResolvedValue({ choice: 'option2' });

      const result = await askQuestions(questions);

      expect(enquirer.prompt).toHaveBeenCalled();
      expect(result).toEqual({ choice: 'option2' });
    });

    it('should handle multiple questions in sequence', async () => {
      const questions = [
        {
          type: 'input' as const,
          name: 'name',
          label: 'Enter name'
        },
        {
          type: 'input' as const,
          name: 'email',
          label: 'Enter email'
        }
      ];

      vi.mocked(enquirer.prompt)
        .mockResolvedValueOnce({ name: 'testname' })
        .mockResolvedValueOnce({ email: 'test@example.com' });

      const result = await askQuestions(questions);

      expect(enquirer.prompt).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ name: 'testname', email: 'test@example.com' });
    });

    it('should handle number questions', async () => {
      const questions: NumberQuestion[] = [
        {
          type: 'number',
          name: 'dpi',
          label: 'Enter DPI',
          min: 72,
          max: 1200,
          default: 300
        }
      ];

      const result = await askQuestions(questions);

      expect(result).toEqual({ dpi: 100 }); // Mocked to return 100
    });

    it('should handle toggle questions', async () => {
      const questions: ToggleQuestion[] = [
        {
          type: 'toggle',
          name: 'enabled',
          label: 'Enable feature',
          default: false
        }
      ];

      const result = await askQuestions(questions);

      expect(result).toEqual({ enabled: true }); // Mocked to return true
    });
  });
});
