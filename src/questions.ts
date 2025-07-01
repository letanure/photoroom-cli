import enquirer from 'enquirer';
import type { ActionType } from './types.js';

const { prompt } = enquirer;

export async function askForAction(): Promise<ActionType> {
  try {
    const { action } = (await prompt({
      type: 'select',
      name: 'action',
      message: 'Which PhotoRoom API would you like to use?',
      choices: [
        { name: 'remove-bg', message: 'Remove Background (Basic plan)' },
        { name: 'account', message: 'Account Details' },
        { name: 'image-editing', message: 'Image Editing v2 (Plus plan)' }
      ]
    })) as { action: ActionType };

    return action;
  } catch (_error) {
    // User cancelled with Ctrl+C
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}
