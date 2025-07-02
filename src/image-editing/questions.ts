import type { Question } from '../shared/question-handler.js';

export const imageEditingQuestions: Question[] = [
  {
    type: 'input',
    name: 'imageUrl',
    label: 'Enter the image URL',
    hint: 'Paste a valid image URL',
    required: true,
    validate: (value) => {
      if (!value || value.trim() === '') return 'This field is required';
      try {
        new URL(value);
        return true;
      } catch {
        return 'Must be a valid URL';
      }
    }
  },
  {
    type: 'confirm',
    name: 'removeBackground',
    label: 'Remove background?',
    default: true
  },
  {
    type: 'select',
    name: 'backgroundType',
    label: 'Select background type',
    choices: [
      { message: 'Transparent', name: 'transparent', value: 'transparent' },
      { message: 'White', name: 'white', value: 'white' },
      { message: 'Black', name: 'black', value: 'black' },
      { message: 'Custom', name: 'custom', value: 'custom' }
    ],
    default: 'transparent',
    subquestions: {
      custom: [
        {
          type: 'input',
          name: 'backgroundColor',
          label: 'Hex color (without #, e.g. FF0000)',
          hint: 'Enter hex color (e.g. FF0000)',
          validate: (value) => {
            if (!value || value.trim() === '') return 'This field cannot be empty';
            return true;
          }
        }
      ]
    }
  }
] as const;
