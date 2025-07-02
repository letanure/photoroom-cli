#!/usr/bin/env node

import { accountDetails } from './account-details/index.js';
import { imageEditing } from './image-editing/index.js';
import { manageApiKeys } from './manage-api-keys/index.js';
import { askQuestions, type SelectQuestion } from './shared/question-handler.js';

type MainMenuOptions = readonly [
  'removeBackground',
  'imageEditing',
  'accountDetails',
  'manageApiKeys',
  'exit'
];

const questions: SelectQuestion<MainMenuOptions>[] = [
  {
    type: 'select',
    name: 'mainMenu',
    label: 'Main Menu',
    hint: 'Use arrow keys to navigate',
    choices: [
      { message: 'Remove Background', name: 'removeBackground', value: 'removeBackground' },
      { message: 'Image Editing', name: 'imageEditing', value: 'imageEditing' },
      { message: 'Account details', name: 'accountDetails', value: 'accountDetails' },
      { message: 'Manage API keys', name: 'manageApiKeys', value: 'manageApiKeys' },
      { message: 'Exit', name: 'exit', value: 'exit' }
    ],
    default: 'removeBackground'
  }
];

async function main() {
  try {
    console.log('🎨 PhotoRoom CLI\n');

    while (true) {
      const answers = await askQuestions(questions);

      if (answers.mainMenu === 'exit') {
        console.log('\n👋 Goodbye!');
        process.exit(0);
      }

      // Based on answers, decide what to call
      const actions = {
        removeBackground: () => {},
        imageEditing: () => imageEditing(),
        accountDetails: () => accountDetails(),
        manageApiKeys: () => manageApiKeys()
      };

      const action = actions[answers.mainMenu as keyof typeof actions];
      if (action) {
        await action();
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
