import enquirer from 'enquirer';
import { configManager } from '../config.js';

const { prompt } = enquirer;

export async function handleConfigSet(key?: string, value?: string): Promise<void> {
  if (!key || !value) {
    console.error('Usage: photoroom-cli config set <key> <value>');
    console.error('\nAvailable keys:');
    console.error('  api-key          Your PhotoRoom API key');
    console.error('  default-format   Default output format (png, jpg, webp)');
    console.error('  default-size     Default output size (preview, medium, hd, full)');
    console.error('  default-output   Default output path');
    process.exit(1);
  }

  try {
    switch (key) {
      case 'api-key':
        await configManager.setApiKey(value);
        console.log('✅ API key saved successfully');
        break;
      case 'default-format':
        if (!['png', 'jpg', 'webp'].includes(value)) {
          console.error('❌ Invalid format. Must be: png, jpg, webp');
          process.exit(1);
        }
        configManager.set('defaultFormat', value);
        console.log(`✅ Default format set to: ${value}`);
        break;
      case 'default-size':
        if (!['preview', 'medium', 'hd', 'full'].includes(value)) {
          console.error('❌ Invalid size. Must be: preview, medium, hd, full');
          process.exit(1);
        }
        configManager.set('defaultSize', value);
        console.log(`✅ Default size set to: ${value}`);
        break;
      case 'default-output':
        configManager.set('defaultOutputPath', value);
        console.log(`✅ Default output path set to: ${value}`);
        break;
      default:
        console.error(`❌ Unknown config key: ${key}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error saving config:', error);
    process.exit(1);
  }
}

export async function handleConfigGet(key?: string): Promise<void> {
  if (!key) {
    // Show all config
    const config = configManager.getAll();
    if (Object.keys(config).length === 0) {
      console.log('No configuration found');
      return;
    }

    console.log('Current configuration:');
    if (config.apiKey) {
      console.log(`  api-key: ${'*'.repeat(20)}...`);
    }
    if (config.defaultFormat) {
      console.log(`  default-format: ${config.defaultFormat}`);
    }
    if (config.defaultSize) {
      console.log(`  default-size: ${config.defaultSize}`);
    }
    if (config.defaultOutputPath) {
      console.log(`  default-output: ${config.defaultOutputPath}`);
    }
    return;
  }

  let value: string | undefined;
  switch (key) {
    case 'api-key':
      value = await configManager.getApiKey();
      if (value) {
        console.log(`${'*'.repeat(20)}...`);
      } else {
        console.log('Not set');
      }
      break;
    case 'default-format':
    case 'default-size':
    case 'default-output': {
      const configKey =
        key.replace('-', '') === 'defaultoutput'
          ? 'defaultOutputPath'
          : key.replace('-', '') === 'defaultformat'
            ? 'defaultFormat'
            : 'defaultSize';
      value = configManager.get(configKey as 'defaultFormat' | 'defaultSize' | 'defaultOutputPath');
      console.log(value || 'Not set');
      break;
    }
    default:
      console.error(`❌ Unknown config key: ${key}`);
      process.exit(1);
  }
}

export async function handleConfigReset(): Promise<void> {
  try {
    const { confirm } = (await prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to reset all configuration?',
      initial: false
    })) as { confirm: boolean };

    if (confirm) {
      configManager.reset();
      console.log('✅ Configuration reset successfully');
    } else {
      console.log('❌ Reset cancelled');
    }
  } catch (_error) {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}

export function handleConfigPath(): void {
  console.log(configManager.getConfigFilePath());
}
