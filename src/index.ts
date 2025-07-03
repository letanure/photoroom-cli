#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { accountDetails } from './account-details/index.js';
import { imageEditing } from './image-editing/index.js';
import { manageApiKeys } from './manage-api-keys/index.js';
import { removeBackground } from './remove-background/index.js';
import { getAccountDetails } from './shared/api-client.js';
import { getActiveApiKey } from './shared/config-manager.js';
import { isDryRunEnabled, setDebugMode, setDryRunMode } from './shared/debug.js';
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

async function runInteractiveMode() {
  console.log('🎨 PhotoRoom CLI');

  while (true) {
    // Check for active API key on each iteration
    const activeKey: Awaited<ReturnType<typeof getActiveApiKey>> = await getActiveApiKey();
    if (activeKey) {
      console.log(`\n✅ Active API key: ${activeKey.data.name} (${activeKey.data.type})`);
    } else {
      console.log('\n⚠️  No active API key found. Please configure one in "Manage API keys"');
    }

    // Show dry-run banner if enabled
    if (isDryRunEnabled()) {
      console.log('\n🔧 DRY-RUN MODE: No actual API requests will be made');
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
}

async function runAccountCommand() {
  try {
    const activeKey = await getActiveApiKey();
    if (!activeKey) {
      console.error(
        '❌ No API key found. Set PHOTOROOM_API_KEY environment variable or configure keys with: photoroom-cli'
      );
      process.exit(1);
    }

    console.log('🔑 Using API key:', activeKey.data.name);
    console.log('📊 Fetching account details...\n');

    const result = await getAccountDetails();

    if ('error' in result) {
      console.error('❌ Error:', result.error.message);
      process.exit(1);
    }

    console.log('✅ Account Details:');
    console.log('   Available credits:', result.credits.available);
    console.log('   Subscription credits:', result.credits.subscription);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

async function main() {
  try {
    // Parse command line arguments
    const argv = await yargs(hideBin(process.argv))
      .option('debug', {
        alias: 'd',
        type: 'boolean',
        description: 'Enable debug mode to log API requests and responses',
        default: false
      })
      .option('dry-run', {
        type: 'boolean',
        description: 'Show what requests would be made without executing them',
        default: false
      })
      .command(
        'account',
        'Show account details and credits',
        (yargs) => {
          return yargs;
        },
        async (argv) => {
          // Set debug/dry-run modes before running command
          if (argv.debug) {
            setDebugMode(true);
          }
          if (argv['dry-run']) {
            setDryRunMode(true);
          }
          await runAccountCommand();
          process.exit(0);
        }
      )
      .help()
      .alias('help', 'h')
      .version()
      .alias('version', 'v')
      .strict()
      .parse();

    // Enable debug mode if flag is set
    if (argv.debug) {
      setDebugMode(true);
    }

    // Enable dry-run mode if flag is set
    if (argv['dry-run']) {
      setDryRunMode(true);
    }

    // If no command was matched, run interactive mode
    await runInteractiveMode();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
