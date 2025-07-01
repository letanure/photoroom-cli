import enquirer from 'enquirer';
import { configManager, type NamedApiKey } from '../config.js';

const { prompt } = enquirer;

export async function handleApiKeyManagement(): Promise<void> {
  while (true) {
    const namedKeys = configManager.getNamedApiKeys();
    const activeKeyName = configManager.getActiveApiKeyName();
    const hasAnyKeys = namedKeys.length > 0;

    console.log('\nAPI Key Management');
    console.log('─'.repeat(30));

    if (!hasAnyKeys) {
      console.log('No API keys configured yet');
      console.log("Let's add your first API key...\n");
      const success = await addNewApiKey();
      if (!success) {
        return; // User cancelled, exit management
      }
      continue; // Successfully added key, show the management menu
    }

    try {
      const choices = [];

      // Show existing named keys
      for (const apiKey of namedKeys) {
        const indicator = activeKeyName === apiKey.name ? '[active]' : '';
        const typeLabel = apiKey.type === 'live' ? 'Live' : 'Sandbox';
        choices.push({
          name: `manage-${apiKey.name}`,
          message: `${apiKey.name} (${typeLabel}) ${indicator}`
        });
      }

      if (choices.length > 0) {
        choices.push({ name: 'separator', message: '─'.repeat(40), disabled: true });
      }

      // Always show add new key option
      choices.push({ name: 'add-new', message: 'Add New API Key' });
      choices.push({ name: 'help', message: 'How to get API key?' });
      choices.push({ name: 'back', message: '<- Back to Main Menu' });

      const { action } = (await prompt({
        type: 'select',
        name: 'action',
        message: 'Select an API key to manage or add a new one:',
        choices
      })) as { action: string };

      if (action.startsWith('manage-')) {
        const keyName = action.replace('manage-', '');
        const apiKey = namedKeys.find((k) => k.name === keyName);
        if (apiKey) {
          await manageApiKey(apiKey);
        }
      } else {
        switch (action) {
          case 'add-new':
            await addNewApiKey();
            break;
          case 'help':
            showApiKeyHelp();
            break;
          case 'back':
            return;
          default:
            console.log('Invalid option');
        }
      }
    } catch (_error) {
      console.log('\nGoodbye!');
      process.exit(0);
    }
  }
}

async function addNewApiKey(): Promise<boolean> {
  try {
    console.log('\nAdd New API Key');
    console.log('─'.repeat(20));

    // Step 1: Choose environment type
    const { envType } = (await prompt({
      type: 'select',
      name: 'envType',
      message: 'What type of API key would you like to add?',
      choices: [
        { name: 'sandbox', message: 'Sandbox (free for testing)' },
        { name: 'live', message: 'Live (production)' }
      ]
    })) as { envType: 'live' | 'sandbox' };

    // Step 2: Ask for name with suggestion
    const suggestedName = configManager.suggestApiKeyName(envType);
    const { keyName } = (await prompt({
      type: 'input',
      name: 'keyName',
      message: 'Name for this API key:',
      initial: suggestedName,
      validate: (value: string) => {
        if (!value.trim()) return 'Name is required';
        const existingNames = configManager.getNamedApiKeys().map((k) => k.name.toLowerCase());
        if (existingNames.includes(value.trim().toLowerCase())) {
          return 'Name already exists, please choose a different name';
        }
        return true;
      }
    })) as { keyName: string };

    const finalName = keyName.trim();
    const envLabel = envType === 'live' ? 'Live' : 'Sandbox';

    // Step 3: Enter API key
    const { apiKey } = (await prompt({
      type: 'password',
      name: 'apiKey',
      message: `Enter your ${envLabel} API key:`,
      validate: (value: string) => value.length > 0 || 'API key is required'
    })) as { apiKey: string };

    // Step 4: Save the key
    configManager.addNamedApiKey(finalName, apiKey, envType);
    console.log(`\n${envLabel} API key "${finalName}" saved successfully!`);

    // Step 5: Ask if they want to make it active
    const activeKeyName = configManager.getActiveApiKeyName();

    if (activeKeyName !== finalName) {
      const { makeActive } = (await prompt({
        type: 'confirm',
        name: 'makeActive',
        message: `Make "${finalName}" the active API key?`,
        initial: !activeKeyName // Default to yes if no active key exists
      })) as { makeActive: boolean };

      if (makeActive) {
        configManager.setActiveApiKey(finalName);
        console.log(`"${finalName}" is now the active API key`);
      }
    }

    return true; // Success
  } catch (_error) {
    console.log('\nOperation cancelled');
    return false; // Cancelled
  }
}

async function manageApiKey(apiKey: NamedApiKey): Promise<void> {
  const activeKeyName = configManager.getActiveApiKeyName();
  const isActive = activeKeyName === apiKey.name;
  const typeLabel = apiKey.type === 'live' ? 'Live' : 'Sandbox';

  try {
    console.log(`\n${apiKey.name} (${typeLabel})`);
    console.log('─'.repeat(20));
    console.log(`Status: ${isActive ? 'Active' : 'Inactive'}`);

    const choices = [];

    if (!isActive) {
      choices.push({ name: 'activate', message: 'Activate' });
    }

    choices.push({ name: 'update', message: 'Update' });
    choices.push({ name: 'remove', message: 'Remove' });
    choices.push({ name: 'back', message: '<- Back' });

    const { action } = (await prompt({
      type: 'select',
      name: 'action',
      message: `Manage "${apiKey.name}":`,
      choices
    })) as { action: string };

    switch (action) {
      case 'activate':
        configManager.setActiveApiKey(apiKey.name);
        console.log(`\n"${apiKey.name}" is now the active API key`);
        break;
      case 'update':
        await updateApiKey(apiKey);
        break;
      case 'remove':
        await removeApiKey(apiKey);
        break;
      case 'back':
        return;
    }
  } catch (_error) {
    console.log('\nOperation cancelled');
  }
}

async function updateApiKey(apiKey: NamedApiKey): Promise<void> {
  const typeLabel = apiKey.type === 'live' ? 'Live' : 'Sandbox';

  try {
    const { newApiKey } = (await prompt({
      type: 'password',
      name: 'newApiKey',
      message: `Enter new ${typeLabel} API key for "${apiKey.name}":`,
      validate: (value: string) => value.length > 0 || 'API key is required'
    })) as { newApiKey: string };

    configManager.addNamedApiKey(apiKey.name, newApiKey, apiKey.type);
    console.log(`\n"${apiKey.name}" API key updated successfully!`);
  } catch (_error) {
    console.log('\nOperation cancelled');
  }
}

async function removeApiKey(apiKey: NamedApiKey): Promise<void> {
  try {
    const { confirm } = (await prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to remove "${apiKey.name}"?`,
      initial: false
    })) as { confirm: boolean };

    if (confirm) {
      configManager.removeNamedApiKey(apiKey.name);
      console.log(`\n"${apiKey.name}" removed successfully`);

      // Check if we need to inform about active key change
      const newActiveKey = configManager.getActiveApiKeyName();
      if (!newActiveKey) {
        console.log('No active API key remaining');
      }
    } else {
      console.log('\nOperation cancelled');
    }
  } catch (_error) {
    console.log('\nOperation cancelled');
  }
}

function showApiKeyHelp(): void {
  console.log('\nHow to get your PhotoRoom API key:');
  console.log('━'.repeat(40));
  console.log('\nVisit: https://docs.photoroom.com/getting-started/how-can-i-get-my-api-key');
  console.log("\nWhat you'll find there:");
  console.log('  • How to sign up for PhotoRoom');
  console.log('  • Where to find your API keys in the dashboard');
  console.log('  • Difference between Live and Sandbox keys');
  console.log('  • API usage limits and pricing');
  console.log('\nTips:');
  console.log('  • Use Sandbox keys for testing (free)');
  console.log('  • Use Live keys for production');
  console.log('  • Keep your API keys secure and never share them');
  console.log('\nPress any key to continue...');
}
