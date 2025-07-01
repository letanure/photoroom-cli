import { existsSync } from 'node:fs';
import enquirer from 'enquirer';
import type { ImageEditingConfig } from './types.js';

const { prompt } = enquirer;

export async function askImageEditingQuestions(): Promise<ImageEditingConfig> {
  const questions = [
    {
      type: 'input',
      name: 'imageFile',
      message: 'Enter path to input image:',
      validate: (value: string) => {
        if (value.length === 0) return 'Input image path is required';
        if (!existsSync(value)) return 'File does not exist';
        return true;
      }
    },
    {
      type: 'input',
      name: 'outputPath',
      message: 'Enter output file path:',
      initial: './edited-output.jpg',
      validate: (value: string) => value.length > 0 || 'Output path is required'
    },
    {
      type: 'select',
      name: 'operation',
      message: 'Select editing operation:',
      choices: [
        { name: 'enhance', message: 'Enhance image quality' },
        { name: 'resize', message: 'Resize image' },
        { name: 'filter', message: 'Apply filters' },
        { name: 'crop', message: 'Crop image' }
      ],
      initial: 'enhance'
    },
    {
      type: 'select',
      name: 'quality',
      message: 'Processing quality:',
      choices: [
        { name: 'low', message: 'Low (fast)' },
        { name: 'medium', message: 'Medium (balanced)' },
        { name: 'high', message: 'High (slow)' },
        { name: 'ultra', message: 'Ultra (very slow)' }
      ],
      initial: 'medium'
    },
    {
      type: 'confirm',
      name: 'preserveAspectRatio',
      message: 'Preserve aspect ratio?',
      initial: true
    }
  ];

  const answers = await prompt(questions);
  return answers as ImageEditingConfig;
}
