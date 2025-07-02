export interface QuestionChoice {
  name: string;
  message: string;
}

export interface QuestionDefinition {
  name: string;
  type: 'select' | 'input' | 'confirm';
  message: string;
  choices?: QuestionChoice[];
  initial?: string | boolean;
  hint?: string;
  validate?: (value: string) => boolean | string;
  skip?: boolean; // Skip this question if true
}

export const REMOVE_BACKGROUND_QUESTIONS: QuestionDefinition[] = [
  {
    name: 'format',
    type: 'select',
    message: 'Output format (the format of the resulting image):',
    initial: 'png',
    choices: [
      { name: 'png', message: 'PNG (default, best quality with transparency)' },
      { name: 'jpg', message: 'JPG (smaller file size, no transparency)' },
      { name: 'webp', message: 'WebP (modern format, good compression)' }
    ]
  },
  {
    name: 'channels',
    type: 'select',
    message: 'Output channels (the channels of the resulting image):',
    initial: 'rgba',
    choices: [
      { name: 'rgba', message: 'RGBA (default, full color with transparency)' },
      { name: 'alpha', message: 'Alpha (only transparency channel, grayscale)' }
    ]
  },
  {
    name: 'bgColor',
    type: 'input',
    message: 'Background color (optional - replaces transparent areas with solid color):',
    hint: 'Can be hex code (#FF00FF) or HTML color (red, green, blue, etc.). Leave empty for transparency.',
    initial: '',
    validate: (value: string) => {
      if (value === '') return true;
      if (value.match(/^#[0-9A-Fa-f]{6}$/)) return true;
      if (
        ['red', 'green', 'blue', 'black', 'white', 'yellow', 'cyan', 'magenta'].includes(
          value.toLowerCase()
        )
      )
        return true;
      return 'Please enter a valid hex color (#FF00FF) or HTML color name';
    }
  },
  {
    name: 'size',
    type: 'select',
    message: 'Output size (resizes the output to specified size, useful for mobile apps):',
    initial: 'full',
    choices: [
      { name: 'preview', message: 'Preview (0.25 MP - smallest, fastest)' },
      { name: 'medium', message: 'Medium (1.5 MP - balanced)' },
      { name: 'hd', message: 'HD (4 MP - high quality)' },
      { name: 'full', message: 'Full (36 MP - original size, can be slower)' }
    ]
  },
  {
    name: 'crop',
    type: 'confirm',
    message: 'Crop to cutout border? (removes transparent pixels from edges, tighter framing)',
    initial: false
  },
  {
    name: 'despill',
    type: 'confirm',
    message:
      'Remove green screen reflections? (automatically removes green reflections on subject)',
    initial: false
  }
];

/**
 * Get questions that should be asked (excluding those already configured)
 */
export function getQuestionsToAsk(
  config: Record<string, unknown>,
  questions = REMOVE_BACKGROUND_QUESTIONS
): QuestionDefinition[] {
  return questions.filter((question) => {
    // Skip if already configured
    if (config[question.name] !== undefined) return false;
    // Skip if marked to skip
    if (question.skip) return false;
    return true;
  });
}

/**
 * Convert question definition to enquirer format
 */
export function toEnquirerFormat(question: QuestionDefinition): Record<string, unknown> {
  const enquirerQuestion: Record<string, unknown> = {
    type: question.type,
    name: question.name,
    message: question.message
  };

  if (question.initial !== undefined) {
    enquirerQuestion.initial = question.initial;
  }

  if (question.hint) {
    enquirerQuestion.hint = question.hint;
  }

  if (question.validate) {
    enquirerQuestion.validate = question.validate;
  }

  if (question.choices) {
    enquirerQuestion.choices = question.choices;
  }

  return enquirerQuestion;
}
