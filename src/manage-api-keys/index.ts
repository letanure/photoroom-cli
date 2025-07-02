import {
  deactivateApiKey,
  deleteApiKey,
  listApiKeys,
  setActiveApiKey
} from '../shared/config-manager.js';
import { askQuestions, type SelectQuestion } from '../shared/question-handler.js';
import { addNewApiKey } from './add-new/action.js';

export async function createMainMenuQuestions() {
  const keys = await listApiKeys();
  const keyEntries = Object.entries(keys);

  const choices = [{ message: 'Add new API key', name: 'addNew', value: 'addNew' }];

  // Add existing keys to the menu
  for (const [id, keyData] of keyEntries) {
    const status = keyData.active ? 'Active  ' : 'Inactive';
    const paddedName = keyData.name.padEnd(20);
    const paddedType = keyData.type.padEnd(8);
    choices.push({
      message: `  ${paddedName} ${paddedType} ${status}`,
      name: id,
      value: id
    });
  }

  choices.push({ message: 'Back to main menu', name: 'back', value: 'back' });

  return [
    {
      type: 'select' as const,
      name: 'apiKeyMenu',
      label: 'Manage API Keys',
      hint: 'Use arrow keys to navigate',
      choices,
      default: 'addNew'
    }
  ];
}

type KeyActionOptions = readonly ['remove', 'activate', 'back'];

function createKeyActionsQuestions(
  keyName: string,
  keyType: string,
  isActive: boolean
): SelectQuestion<KeyActionOptions>[] {
  return [
    {
      type: 'select',
      name: 'action',
      label: `Managing: ${keyName} (${keyType})`,
      hint: 'Choose an action for this API key',
      choices: [
        { message: 'Remove key', name: 'remove', value: 'remove' },
        { message: isActive ? 'Deactivate' : 'Activate', name: 'activate', value: 'activate' },
        { message: 'Back to keys list', name: 'back', value: 'back' }
      ],
      default: 'remove'
    }
  ];
}

async function showKeyActions(keyId: string) {
  const keys = await listApiKeys();
  const keyData = keys[keyId];

  if (!keyData) {
    console.log('❌ API key not found.');
    return;
  }

  const actionQuestions = createKeyActionsQuestions(keyData.name, keyData.type, keyData.active);
  const actionAnswer = await askQuestions(actionQuestions);

  switch (actionAnswer.action) {
    case 'remove':
      await removeApiKey(keyId, keyData.name);
      break;
    case 'activate':
      await toggleApiKeyStatus(keyId, keyData.name, keyData.active);
      break;
    case 'back':
      // Just return to go back to the main menu
      break;
  }
}

async function removeApiKey(keyId: string, keyName: string) {
  try {
    // Confirm deletion
    const confirmQuestion = [
      {
        type: 'confirm' as const,
        name: 'confirmDelete',
        label: `Are you sure you want to delete "${keyName}"?`,
        hint: 'This action cannot be undone',
        default: false
      }
    ];

    const confirmation = await askQuestions(confirmQuestion);

    if (confirmation.confirmDelete) {
      const success = await deleteApiKey(keyId);

      if (success) {
        console.log(`\n✅ API key "${keyName}" has been deleted successfully.`);
      } else {
        console.log(`\n❌ Failed to delete API key "${keyName}". Key not found.`);
      }
    } else {
      console.log('\n⏹️ Deletion cancelled.');
    }
  } catch (error) {
    console.error('❌ Failed to delete API key:', error);
  }
}

async function toggleApiKeyStatus(keyId: string, keyName: string, currentlyActive: boolean) {
  try {
    const action = currentlyActive ? 'deactivate' : 'activate';

    // Confirm activation/deactivation
    const confirmQuestion = [
      {
        type: 'confirm' as const,
        name: 'confirmToggle',
        label: `Are you sure you want to ${action} "${keyName}"?`,
        default: true
      }
    ];

    const confirmation = await askQuestions(confirmQuestion);

    if (confirmation.confirmToggle) {
      if (currentlyActive) {
        // Deactivate the key
        const success = await deactivateApiKey(keyId);

        if (success) {
          console.log(`\n✅ API key "${keyName}" has been deactivated.`);
        } else {
          console.log(`\n❌ Failed to deactivate API key "${keyName}". Key not found.`);
        }
      } else {
        // Activate: Use setActiveApiKey which handles deactivating others of same type
        const success = await setActiveApiKey(keyId);

        if (success) {
          console.log(`\n✅ API key "${keyName}" has been activated.`);
        } else {
          console.log(`\n❌ Failed to activate API key "${keyName}". Key not found.`);
        }
      }
    } else {
      console.log(`\n⏹️ ${action.charAt(0).toUpperCase() + action.slice(1)} cancelled.`);
    }
  } catch (error) {
    console.error('❌ Failed to toggle API key status:', error);
  }
}

export async function manageApiKeys() {
  while (true) {
    console.log('\n🔑 Managing API Keys...');

    const menuQuestions = await createMainMenuQuestions();
    const answers = await askQuestions(menuQuestions);

    if (answers.apiKeyMenu === 'back') {
      console.log('Returning to main menu...');
      break;
    }

    if (answers.apiKeyMenu === 'addNew') {
      await addNewApiKey();
    } else {
      // Selected an existing key
      await showKeyActions(answers.apiKeyMenu as string);
    }
  }
}
