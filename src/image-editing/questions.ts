import type { Question } from '../shared/question-handler.js';

// Common editing questions that apply to both URL and file inputs
const commonEditingQuestions: Question[] = [
  {
    type: 'input',
    name: 'outputDir',
    label: 'Output directory',
    hint: 'Directory to save edited images',
    required: true,
    default: 'output'
  },
  {
    type: 'confirm',
    name: 'removeBackground',
    label: 'Remove background?',
    hint: 'Remove the background from the image',
    default: true
  },
  {
    type: 'input',
    name: 'backgroundColor',
    label: 'Background color',
    hint: 'Hex color (FF0000, #FF0000) or color name (red, blue)',
    required: false,
    default: 'transparent',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmedValue = value.trim();

      // Check for 'transparent'
      if (trimmedValue.toLowerCase() === 'transparent') return true;

      // Check hex format (with or without #, 6 or 8 characters)
      const hexPattern = /^#?[A-Fa-f0-9]{6}([A-Fa-f0-9]{2})?$/;
      if (hexPattern.test(trimmedValue)) return true;

      // Check common color names
      const colorNames = [
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

      if (colorNames.includes(trimmedValue.toLowerCase())) return true;

      return 'Must be a hex color (FF0000, #FF0000) or color name (red, blue, etc.)';
    }
  }
  // TODO: Add more editing parameters here (background type, size, etc.)
];

export const imageEditingQuestions: Question[] = [
  {
    type: 'select',
    name: 'imageSource',
    label: 'Select image source',
    hint: 'Choose how to provide the image',
    choices: [
      { message: 'URL (GET endpoint)', name: 'url', value: 'url' },
      { message: 'Local file (POST endpoint)', name: 'file', value: 'file' }
    ],
    default: 'file',
    required: true,
    subquestions: {
      url: [
        {
          type: 'input',
          name: 'imageUrl',
          label: 'Enter the image URL',
          hint: 'Paste a valid image URL',
          required: true,
          validate: (value: string) => {
            if (!value || value.trim() === '') return 'This field is required';

            try {
              const url = new URL(value);

              // Check if URL has image extension
              const imageExtensions = [
                '.jpg',
                '.jpeg',
                '.png',
                '.gif',
                '.bmp',
                '.webp',
                '.svg',
                '.tiff'
              ];
              const pathname = url.pathname.toLowerCase();
              const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

              if (hasImageExtension) {
                return true;
              }

              return 'URL must end with an image extension (.jpg, .png, .gif, .webp, etc.)';
            } catch {
              return 'Must be a valid URL';
            }
          }
        },
        ...commonEditingQuestions
      ],
      file: [
        {
          type: 'select-images',
          name: 'imageFiles',
          label: 'Select image file(s) to edit',
          hint: 'Choose one or more images to edit',
          required: true
        },
        ...commonEditingQuestions
      ]
    }
  }
] as const;
