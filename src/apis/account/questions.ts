import enquirer from 'enquirer';
import type { AccountConfig } from './types.js';

const { prompt } = enquirer;

async function _askAccountQuestions(): Promise<AccountConfig> {
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

  try {
    const answers = await prompt(questions);
    return answers as AccountConfig;
  } catch (_error) {
    // User cancelled with Ctrl+C
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}
