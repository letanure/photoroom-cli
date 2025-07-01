#!/usr/bin/env node

import { Command } from 'commander';
import { getApiKey } from './api-key-manager.js';
import { handleAccount } from './apis/account/index.js';
import { handleImageEditing } from './apis/image-editing/index.js';
import { handleRemoveBackground } from './apis/remove-background/index.js';
import {
  handleConfigGet,
  handleConfigPath,
  handleConfigReset,
  handleConfigSet
} from './commands/config.js';
import { askForAction } from './questions.js';

const program = new Command();

program
  .name('photoroom-cli')
  .description('CLI tool for PhotoRoom API')
  .version('1.0.0')
  .option('--dry-run', 'Log API requests without executing them')
  .option('--api-key <key>', 'PhotoRoom API key');

program.action(async (options) => {
  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN MODE ACTIVE - No API requests will be executed\n');
  }

  // Get API key first (skip if dry run)
  const apiKey = options.dryRun ? 'dry-run-key' : await getApiKey(options);

  const action = await askForAction();

  switch (action) {
    case 'remove-bg':
      await handleRemoveBackground({ dryRun: options.dryRun, apiKey });
      break;
    case 'account':
      await handleAccount({ dryRun: options.dryRun, apiKey });
      break;
    case 'image-editing':
      await handleImageEditing({ dryRun: options.dryRun, apiKey });
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
  .option('--api-key <key>', 'PhotoRoom API key')
  .action(async (options) => {
    await handleRemoveBackground(options);
  });

program
  .command('account')
  .description('View account details and usage statistics')
  .option('--dry-run', 'Log the API request without executing it')
  .option('--api-key <key>', 'PhotoRoom API key')
  .action(async (options) => {
    await handleAccount(options);
  });

program
  .command('image-editing')
  .description('Advanced image editing with AI (Plus plan)')
  .option('--dry-run', 'Log the API request without executing it')
  .option('--api-key <key>', 'PhotoRoom API key')
  .action(async (options) => {
    await handleImageEditing(options);
  });

const config = program.command('config').description('Manage configuration');

config
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(async (key, value) => {
    await handleConfigSet(key, value);
  });

config
  .command('get [key]')
  .description('Get configuration value(s)')
  .action(async (key) => {
    await handleConfigGet(key);
  });

config
  .command('reset')
  .description('Reset all configuration')
  .action(async () => {
    await handleConfigReset();
  });

config
  .command('path')
  .description('Show configuration file path')
  .action(() => {
    handleConfigPath();
  });

program.parse();
