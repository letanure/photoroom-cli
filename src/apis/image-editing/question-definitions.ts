export interface QuestionChoice {
  value: string;
  label: string;
  hint?: string;
}

export interface QuestionDefinition {
  group: 'core' | 'background' | 'layout' | 'spacing' | 'effects' | 'export';
  type: 'select' | 'input' | 'confirm' | 'number';
  name: string;
  label: string;
  defaultValue?: string | number | boolean;
  choices?: QuestionChoice[];
  hint?: string;
  validate?: (value: unknown) => boolean | string;
}

export const QUESTION_DEFINITIONS: QuestionDefinition[] = [
  // Core questions
  {
    group: 'core',
    type: 'confirm',
    name: 'removeBackground',
    label: 'Remove background from images?',
    defaultValue: true,
    hint: 'Remove the background and keep only the subject'
  },

  // Background questions
  {
    group: 'background',
    type: 'input',
    name: 'background.prompt',
    label: 'Background prompt',
    hint: 'Describe the background you want (e.g., "modern office", "tropical beach")'
  },
  {
    group: 'background',
    type: 'input',
    name: 'background.color',
    label: 'Background color',
    hint: 'Hex code (#FF0000) or color name (red, transparent)',
    validate: (value: unknown) => {
      if (!value) return true;
      if (typeof value !== 'string') return 'Please enter a valid color';
      if (value.match(/^#[0-9A-Fa-f]{6}$/)) return true;
      if (['red', 'green', 'blue', 'black', 'white', 'transparent'].includes(value.toLowerCase()))
        return true;
      return 'Please enter a valid hex color or color name';
    }
  },
  {
    group: 'background',
    type: 'input',
    name: 'background.negativePrompt',
    label: 'Background negative prompt',
    hint: 'What to avoid in the background (e.g., "blurry", "dark", "cluttered")'
  },

  // Layout questions
  {
    group: 'layout',
    type: 'select',
    name: 'outputSize',
    label: 'Output size',
    defaultValue: 'original',
    choices: [
      { value: 'original', label: 'Original size', hint: 'Keep original dimensions' },
      { value: 'small', label: 'Small (512px)', hint: 'Good for thumbnails' },
      { value: 'medium', label: 'Medium (1024px)', hint: 'Good for web' },
      { value: 'large', label: 'Large (2048px)', hint: 'Good for print' }
    ],
    hint: 'Choose the size of the output image'
  },
  {
    group: 'layout',
    type: 'number',
    name: 'maxWidth',
    label: 'Maximum width (pixels)',
    hint: 'Leave empty to use outputSize'
  },
  {
    group: 'layout',
    type: 'number',
    name: 'maxHeight',
    label: 'Maximum height (pixels)',
    hint: 'Leave empty to use outputSize'
  },
  {
    group: 'layout',
    type: 'select',
    name: 'scaling',
    label: 'Scaling mode',
    defaultValue: 'fit',
    choices: [
      { value: 'fit', label: 'Fit', hint: 'Maintain aspect ratio' },
      { value: 'fill', label: 'Fill', hint: 'May crop image' },
      { value: 'stretch', label: 'Stretch', hint: 'May distort image' }
    ]
  },
  {
    group: 'layout',
    type: 'select',
    name: 'horizontalAlignment',
    label: 'Horizontal alignment',
    defaultValue: 'center',
    choices: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' }
    ]
  },
  {
    group: 'layout',
    type: 'select',
    name: 'verticalAlignment',
    label: 'Vertical alignment',
    defaultValue: 'center',
    choices: [
      { value: 'top', label: 'Top' },
      { value: 'center', label: 'Center' },
      { value: 'bottom', label: 'Bottom' }
    ]
  },

  // Spacing questions
  {
    group: 'spacing',
    type: 'number',
    name: 'margin',
    label: 'Margin (pixels)',
    defaultValue: 0,
    hint: 'Space around the entire image'
  },
  {
    group: 'spacing',
    type: 'number',
    name: 'padding',
    label: 'Padding (pixels)',
    defaultValue: 0,
    hint: 'Space between the subject and edges'
  },

  // Effects questions
  {
    group: 'effects',
    type: 'select',
    name: 'lighting.mode',
    label: 'Lighting mode',
    choices: [
      { value: 'none', label: 'None' },
      { value: 'auto', label: 'Auto adjust' },
      { value: 'studio', label: 'Studio lighting' },
      { value: 'natural', label: 'Natural lighting' }
    ]
  },
  {
    group: 'effects',
    type: 'select',
    name: 'shadow.mode',
    label: 'Shadow mode',
    choices: [
      { value: 'none', label: 'No shadow' },
      { value: 'soft', label: 'Soft shadow' },
      { value: 'hard', label: 'Hard shadow' },
      { value: 'drop', label: 'Drop shadow' }
    ]
  },
  {
    group: 'effects',
    type: 'select',
    name: 'upscale.mode',
    label: 'Upscale mode',
    choices: [
      { value: 'none', label: 'No upscaling' },
      { value: '2x', label: '2x upscale' },
      { value: '4x', label: '4x upscale' }
    ]
  },
  {
    group: 'effects',
    type: 'select',
    name: 'textRemoval.mode',
    label: 'Text removal',
    choices: [
      { value: 'none', label: 'Keep text' },
      { value: 'auto', label: 'Auto remove text' }
    ]
  },

  // Export questions
  {
    group: 'export',
    type: 'select',
    name: 'export.format',
    label: 'Export format',
    defaultValue: 'png',
    choices: [
      { value: 'png', label: 'PNG', hint: 'Best quality with transparency' },
      { value: 'jpg', label: 'JPG', hint: 'Smaller file size, no transparency' },
      { value: 'webp', label: 'WebP', hint: 'Modern format, good compression' }
    ]
  },
  {
    group: 'export',
    type: 'number',
    name: 'export.dpi',
    label: 'Export DPI',
    defaultValue: 72,
    hint: 'Dots per inch (72 for web, 300 for print)'
  }
];

// Helper function to get questions by group
function _getQuestionsByGroup(group: QuestionDefinition['group']): QuestionDefinition[] {
  return QUESTION_DEFINITIONS.filter((q) => q.group === group);
}

// Helper function to get a specific question
export function getQuestion(name: string): QuestionDefinition | undefined {
  return QUESTION_DEFINITIONS.find((q) => q.name === name);
}
