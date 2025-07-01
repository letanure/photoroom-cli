#!/usr/bin/env node

import { Command } from 'commander';
import { handleAccount } from './apis/account/index.js';
import { handleImageEditing } from './apis/image-editing/index.js';
import { handleRemoveBackground } from './apis/remove-background/index.js';
import { askForAction } from './questions.js';

const program = new Command();

program
  .name('photoroom-cli')
  .description('CLI tool for PhotoRoom API')
  .version('1.0.0')
  .option('--dry-run', 'Log API requests without executing them');

program.action(async (options) => {
  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN MODE ACTIVE - No API requests will be executed\n');
  }

  const action = await askForAction();

  switch (action) {
    case 'remove-bg':
      await handleRemoveBackground({ dryRun: options.dryRun });
      break;
    case 'account':
      await handleAccount({ dryRun: options.dryRun });
      break;
    case 'image-editing':
      await handleImageEditing({ dryRun: options.dryRun });
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
  .option('--dry-run', 'Log the API request without executing it')
  .action(async (options) => {
    await handleRemoveBackground(options);
  });

program
  .command('account')
  .description('View account details and usage statistics')
  .option('--dry-run', 'Log the API request without executing it')
  .action(async (options) => {
    await handleAccount(options);
  });

program
  .command('image-editing')
  .description('Advanced image editing with AI (Plus plan)')
  .option('--dry-run', 'Log the API request without executing it')
  .action(async (options) => {
    await handleImageEditing(options);
  });

program.parse();
