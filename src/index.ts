#!/usr/bin/env node

import { Command } from 'commander';
import { handleAccount } from './apis/account/index.js';
import { handleImageEditing } from './apis/image-editing/index.js';
import { handleRemoveBackground } from './apis/remove-background/index.js';
import { askForAction } from './questions.js';

const program = new Command();

program.name('photoroom-cli').description('CLI tool for PhotoRoom API').version('1.0.0');

program.action(async () => {
  const action = await askForAction();

  switch (action) {
    case 'remove-bg':
      await handleRemoveBackground({});
      break;
    case 'account':
      await handleAccount();
      break;
    case 'image-editing':
      await handleImageEditing();
      break;
    default:
      console.log(`\n⚠️  ${action} is not implemented yet.`);
  }
});

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

program
  .command('account')
  .description('View account details and usage statistics')
  .action(async () => {
    await handleAccount();
  });

program
  .command('image-editing')
  .description('Advanced image editing with AI (Plus plan)')
  .action(async () => {
    await handleImageEditing();
  });

program.parse();
