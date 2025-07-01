#!/usr/bin/env node

import { Command } from 'commander';
import enquirer from 'enquirer';
import { existsSync } from 'fs';
const { prompt } = enquirer;

interface RemoveBackgroundConfig {
  imageFile: string;
  outputPath: string;
  format: 'png' | 'jpg' | 'webp';
  channels: 'rgba' | 'alpha';
  bgColor?: string;
  size: 'preview' | 'medium' | 'hd' | 'full';
  crop: boolean;
  despill: boolean;
}

const program = new Command();

program
  .name('photoroom-cli')
  .description('CLI tool for PhotoRoom API')
  .version('1.0.0');

program
  .action(async () => {
    const { action } = await prompt({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'remove-bg', message: 'Remove Background (Basic plan)' },
        { name: 'account', message: 'Account Details (todo)' },
        { name: 'image-editing', message: 'Image Editing v2 (Plus plan) (todo)' }
      ]
    });

    if (action === 'remove-bg') {
      await handleRemoveBackground({});
    } else {
      console.log(`\n⚠️  ${action} is not implemented yet.`);
    }
  });

async function handleRemoveBackground(options: any) {
  const config: Partial<RemoveBackgroundConfig> = {
    imageFile: options.input,
    outputPath: options.output,
    format: options.format,
    channels: options.channels,
    bgColor: options.bgColor,
    size: options.size,
    crop: options.crop || false,
    despill: options.despill || false
  };

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
      if (['red', 'green', 'blue', 'black', 'white', 'yellow', 'cyan', 'magenta'].includes(value.toLowerCase())) return true;
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
  
  console.log('\n🎨 Remove Background Configuration:');
  console.log(`Input: ${finalConfig.imageFile}`);
  console.log(`Output: ${finalConfig.outputPath}`);
  console.log(`Format: ${finalConfig.format}`);
  console.log(`Channels: ${finalConfig.channels}`);
  if (finalConfig.bgColor) console.log(`Background: ${finalConfig.bgColor}`);
  console.log(`Size: ${finalConfig.size}`);
  console.log(`Crop: ${finalConfig.crop}`);
  console.log(`Despill: ${finalConfig.despill}`);
  
  console.log('\n🚀 Ready to process image!');
}

program
  .command('remove-bg')
  .description('Remove background from an image')
  .option('-i, --input <path>', 'Input image file path')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Output format (png, jpg, webp)', 'png')
  .option('-c, --channels <channels>', 'Output channels (rgba, alpha)', 'rgba')
  .option('-b, --bg-color <color>', 'Background color (hex or HTML color)')
  .option('-s, --size <size>', 'Output size (preview, medium, hd, full)', 'full')
  .option('--crop', 'Crop to cutout border')
  .option('--despill', 'Remove colored reflections from green background')
  .action(async (options) => {
    await handleRemoveBackground(options);
  });

program.parse();