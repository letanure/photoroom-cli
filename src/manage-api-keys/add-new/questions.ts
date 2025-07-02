import type { SelectQuestion } from '../../shared/question-handler.js';

type ApiKeyTypeOptions = readonly ['sandbox', 'live'];

export const addNewApiKeyQuestions: SelectQuestion<ApiKeyTypeOptions>[] = [
  {
    type: 'select',
    name: 'apiKeyType',
    label: 'Select API key type',
    hint: 'Choose between sandbox for testing or live for production',
    choices: [
      { message: 'Sandbox', name: 'sandbox', value: 'sandbox' },
      { message: 'Live', name: 'live', value: 'live' }
    ],
    default: 'sandbox',
    subquestions: {
      sandbox: [
        {
          type: 'input',
          name: 'apiKeyName',
          label: 'Enter API key name',
          hint: 'A descriptive name for this API key',
          default: 'Sandbox Key 1' // This will be dynamic in action
        },
        {
          type: 'confirm',
          name: 'activateNow',
          label: 'Activate this API key now?',
          default: true
        }
      ],
      live: [
        {
          type: 'input',
          name: 'apiKeyName',
          label: 'Enter API key name',
          hint: 'A descriptive name for this API key',
          default: 'Live Key 1' // This will be dynamic in action
        },
        {
          type: 'confirm',
          name: 'activateNow',
          label: 'Activate this API key now?',
          default: true
        }
      ]
    }
  }
];
