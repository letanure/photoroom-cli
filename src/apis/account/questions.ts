import enquirer from 'enquirer';
import type { AccountConfig } from './types.js';

const { prompt } = enquirer;

export async function askAccountQuestions(): Promise<AccountConfig> {
  const questions = [
    {
      type: 'confirm',
      name: 'showDetails',
      message: 'Show account details?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'includeUsage',
      message: 'Include usage statistics?',
      initial: false
    }
  ];

  const answers = await prompt(questions);
  return answers as AccountConfig;
}
