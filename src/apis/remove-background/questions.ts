import { basename, extname, join } from 'node:path';
import enquirer from 'enquirer';
import { selectImages } from '../../utils/image-selection.js';
import type { RemoveBackgroundConfig } from './types.js';

const { prompt } = enquirer;

export async function askRemoveBackgroundQuestions(
  config: Partial<RemoveBackgroundConfig>
): Promise<RemoveBackgroundConfig> {
  const questions = [];

  if (!config.imageFile) {
    const imageSelection = await selectImages();
    config.imageFile = imageSelection.imageFile;
    config.imageFiles = imageSelection.imageFiles;
  }

  if (!config.outputPath) {
    // Always ask for output directory since user might process multiple images
    questions.push({
      type: 'input',
      name: 'outputPath',
      message: 'Output directory (where processed images will be saved):',
      initial: './output',
      validate: (value: string) => value.length > 0 || 'Output directory is required'
    });
  }

  questions.push({
    type: 'select',
    name: 'format',
    message: 'Output format (the format of the resulting image):',
    choices: [
      { name: 'png', message: 'PNG (default, best quality with transparency)' },
      { name: 'jpg', message: 'JPG (smaller file size, no transparency)' },
      { name: 'webp', message: 'WebP (modern format, good compression)' }
    ],
    initial: config.format || 'png'
  });

  questions.push({
    type: 'select',
    name: 'channels',
    message: 'Output channels (the channels of the resulting image):',
    choices: [
      { name: 'rgba', message: 'RGBA (default, full color with transparency)' },
      { name: 'alpha', message: 'Alpha (only transparency channel, grayscale)' }
    ],
    initial: config.channels || 'rgba'
  });

  questions.push({
    type: 'input',
    name: 'bgColor',
    message: 'Background color (optional - replaces transparent areas with solid color):',
    hint: 'Can be hex code (#FF00FF) or HTML color (red, green, blue, etc.). Leave empty for transparency.',
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
    message: 'Output size (resizes the output to specified size, useful for mobile apps):',
    choices: [
      { name: 'preview', message: 'Preview (0.25 MP - smallest, fastest)' },
      { name: 'medium', message: 'Medium (1.5 MP - balanced)' },
      { name: 'hd', message: 'HD (4 MP - high quality)' },
      { name: 'full', message: 'Full (36 MP - original size, can be slower)' }
    ],
    initial: config.size || 'full'
  });

  questions.push({
    type: 'confirm',
    name: 'crop',
    message: 'Crop to cutout border? (removes transparent pixels from edges, tighter framing)',
    initial: config.crop || false
  });

  questions.push({
    type: 'confirm',
    name: 'despill',
    message:
      'Remove green screen reflections? (automatically removes green reflections on subject)',
    initial: config.despill || false
  });

  try {
    const answers = await prompt(questions);
    const finalConfig = { ...config, ...answers } as RemoveBackgroundConfig;

    if (finalConfig.bgColor === '') {
      delete finalConfig.bgColor;
    }

    // For single image, generate filename in the output directory
    if (!finalConfig.imageFiles || finalConfig.imageFiles.length <= 1) {
      const inputFile = finalConfig.imageFile;
      const inputBasename = basename(inputFile, extname(inputFile));
      const outputFilename = `${inputBasename}_processed.${finalConfig.format}`;
      finalConfig.outputPath = join(finalConfig.outputPath, outputFilename);
    }

    return finalConfig;
  } catch (_error) {
    // User cancelled with Ctrl+C
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}
