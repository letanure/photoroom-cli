#!/usr/bin/env node

import { accountDetails } from './account-details/index.js';
import { imageEditing } from './image-editing/index.js';
import { manageApiKeys } from './manage-api-keys/index.js';
import { removeBackground } from './remove-background/index.js';
import { getActiveApiKey } from './shared/config-manager.js';
import { askQuestions, type SelectQuestion } from './shared/question-handler.js';

type MainMenuOptions = readonly [
  'removeBackground',
  'imageEditing',
  'accountDetails',
  'manageApiKeys',
  'exit'
];

function createMainMenuQuestions(hasActiveKey: boolean): SelectQuestion<MainMenuOptions>[] {
  return [
    {
      type: 'select',
      name: 'mainMenu',
      label: 'Main Menu',
      hint: 'Use arrow keys to navigate',
      choices: [
        {
          message: 'Remove Background',
          name: 'removeBackground',
          value: 'removeBackground',
          disabled: !hasActiveKey
        },
        {
          message: 'Image Editing',
          name: 'imageEditing',
          value: 'imageEditing',
          disabled: !hasActiveKey
        },
        {
          message: 'Account details',
          name: 'accountDetails',
          value: 'accountDetails',
          disabled: !hasActiveKey
        },
        { message: 'Manage API keys', name: 'manageApiKeys', value: 'manageApiKeys' },
        { message: 'Exit', name: 'exit', value: 'exit' }
      ],
      default: hasActiveKey ? 'removeBackground' : 'manageApiKeys'
    }
  ];
}

async function main() {
  try {
    console.log('🎨 PhotoRoom CLI');

    while (true) {
      // Check for active API key on each iteration
      const activeKey: Awaited<ReturnType<typeof getActiveApiKey>> = await getActiveApiKey();
      if (activeKey) {
        console.log(`\n✅ Active API key: ${activeKey.data.name} (${activeKey.data.type})`);
      } else {
        console.log('\n⚠️  No active API key found. Please configure one in "Manage API keys"');
      }
      console.log('');

      const questions = createMainMenuQuestions(!!activeKey);
      const answers = await askQuestions(questions);

      if (answers.mainMenu === 'exit') {
        console.log('\n👋 Goodbye!');
        process.exit(0);
      }

      // Based on answers, decide what to call
      const actions = {
        removeBackground: () => removeBackground(),
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
