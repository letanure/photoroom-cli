import type { Question } from '../shared/question-handler.js';

export const removeBackgroundQuestions: Question[] = [
  {
    type: 'select-images',
    name: 'image_file',
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
    name: 'size',
    label: 'Output size',
    hint: 'Size of the processed image',
    choices: [
      { message: 'HD (high definition)', name: 'hd', value: 'hd' },
      { message: 'Original size', name: 'original', value: 'original' },
      { message: 'Custom size...', name: 'custom', value: 'custom' }
    ],
    default: 'original',
    required: false,
    subquestions: {
      custom: [
        {
          type: 'input',
          name: 'customSize',
          label: 'Custom size (e.g. 1000x1000)',
          hint: 'Format: WIDTHxHEIGHT',
          required: true,
          validate: (value: string) => {
            const sizePattern = /^\d+x\d+$/;
            if (!sizePattern.test(value)) {
              return 'Size must be in format WIDTHxHEIGHT (e.g. 1000x1000)';
            }
            return true;
          }
        }
      ]
    }
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
    type: 'input',
    name: 'bg_color',
    label: 'Background color (optional)',
    hint: 'Hex color code (e.g. FFFFFF for white). Leave empty for transparent',
    required: false,
    validate: (value: string) => {
      if (!value) return true; // Optional field
      const hexPattern = /^[A-Fa-f0-9]{6}$/;
      if (!hexPattern.test(value)) {
        return 'Background color must be a 6-digit hex code (e.g. FFFFFF)';
      }
      return true;
    }
  },
  {
    type: 'select',
    name: 'channels',
    label: 'Output channels',
    hint: 'Alpha for transparency or RGB for opaque',
    choices: [
      { message: 'Alpha (transparent)', name: 'alpha', value: 'alpha' },
      { message: 'RGB (opaque)', name: 'rgb', value: 'rgb' }
    ],
    default: 'alpha',
    required: false
  }
] as const;
