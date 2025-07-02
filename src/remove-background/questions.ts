import type { Question } from '../shared/question-handler.js';

export const removeBackgroundQuestions: Question[] = [
  {
    type: 'select-images',
    name: 'image_files',
    label: 'Select image(s) to process',
    hint: 'Choose one or more images to remove background',
    required: true
  },
  {
    type: 'select',
    name: 'format',
    label: 'Output format',
    hint: 'Image format for the result',
    choices: [
      { message: 'PNG (transparent)', name: 'png', value: 'png' },
      { message: 'JPG', name: 'jpg', value: 'jpg' },
      { message: 'WebP', name: 'webp', value: 'webp' }
    ],
    default: 'png',
    required: false
  },
  {
    type: 'select',
    name: 'channels',
    label: 'Output channels',
    hint: 'The channels of the resulting image',
    choices: [
      { message: 'RGBA (color + transparency)', name: 'rgba', value: 'rgba' },
      { message: 'Alpha (transparency only)', name: 'alpha', value: 'alpha' }
    ],
    default: 'rgba',
    required: false
  },
  {
    type: 'input',
    name: 'bg_color',
    label: 'Background color (optional)',
    hint: 'Hex code (#FF00FF) or HTML color (red, green). Leave empty for transparent',
    required: false,
    validate: (value: string) => {
      if (!value) return true; // Optional field

      // Check hex pattern with #
      const hexPattern = /^#[A-Fa-f0-9]{6}$/;

      // Common HTML color names
      const htmlColors = [
        'red',
        'green',
        'blue',
        'yellow',
        'orange',
        'purple',
        'pink',
        'black',
        'white',
        'gray',
        'grey',
        'brown',
        'cyan',
        'magenta',
        'lime',
        'navy',
        'teal',
        'silver',
        'maroon',
        'olive'
      ];

      if (!hexPattern.test(value) && !htmlColors.includes(value.toLowerCase())) {
        return 'Background color must be a hex code (#FF00FF) or HTML color (red, green, etc.)';
      }
      return true;
    }
  },
  {
    type: 'select',
    name: 'size',
    label: 'Output size',
    hint: 'Resolution of the processed image',
    choices: [
      { message: 'Preview (0.25 MP)', name: 'preview', value: 'preview' },
      { message: 'Medium (1.5 MP)', name: 'medium', value: 'medium' },
      { message: 'HD (4 MP)', name: 'hd', value: 'hd' },
      { message: 'Full (36 MP)', name: 'full', value: 'full' }
    ],
    default: 'full',
    required: false
  },
  {
    type: 'confirm',
    name: 'crop',
    label: "Crop to subject's bounding box?",
    hint: 'Remove extra transparent space around the subject',
    default: false,
    required: false
  },
  {
    type: 'confirm',
    name: 'despill',
    label: 'Remove color spill?',
    hint: 'Automatically removes colored reflections left by green backgrounds',
    default: false,
    required: false
  }
] as const;
