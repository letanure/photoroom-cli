import { existsSync } from 'node:fs';
import enquirer from 'enquirer';
import type { RemoveBackgroundConfig } from './types.js';

const { prompt } = enquirer;

export async function askRemoveBackgroundQuestions(
  config: Partial<RemoveBackgroundConfig>
): Promise<RemoveBackgroundConfig> {
  const questions = [];

  if (!config.imageFile) {
    questions.push({
      type: 'input',
      name: 'imageFile',
      message: 'Enter path to input image:',
      validate: (value: string) => {
        if (value.length === 0) return 'Input image path is required';
        if (!existsSync(value)) return 'File does not exist';
        return true;
      }
    });
  }

  if (!config.outputPath) {
    questions.push({
      type: 'input',
      name: 'outputPath',
      message: 'Enter output file path:',
      initial: './output.png',
      validate: (value: string) => value.length > 0 || 'Output path is required'
    });
  }

  questions.push({
    type: 'select',
    name: 'format',
    message: 'Output format:',
    choices: ['png', 'jpg', 'webp'],
    initial: config.format || 'png'
  });

  questions.push({
    type: 'select',
    name: 'channels',
    message: 'Output channels:',
    choices: ['rgba', 'alpha'],
    initial: config.channels || 'rgba'
  });

  questions.push({
    type: 'input',
    name: 'bgColor',
    message: 'Background color (optional - hex or HTML color):',
    initial: config.bgColor || '',
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
  });

  questions.push({
    type: 'select',
    name: 'size',
    message: 'Output size:',
    choices: [
      { name: 'preview', message: 'Preview (0.25 MP)' },
      { name: 'medium', message: 'Medium (1.5 MP)' },
      { name: 'hd', message: 'HD (4 MP)' },
      { name: 'full', message: 'Full (36 MP)' }
    ],
    initial: config.size || 'full'
  });

  questions.push({
    type: 'confirm',
    name: 'crop',
    message: 'Crop to cutout border?',
    initial: config.crop || false
  });

  questions.push({
    type: 'confirm',
    name: 'despill',
    message: 'Remove colored reflections from green background?',
    initial: config.despill || false
  });

  const answers = await prompt(questions);
  const finalConfig = { ...config, ...answers } as RemoveBackgroundConfig;

  if (finalConfig.bgColor === '') {
    delete finalConfig.bgColor;
  }

  return finalConfig;
}
