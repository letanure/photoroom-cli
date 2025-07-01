import enquirer from 'enquirer';
import { removeBackground } from './api.js';
import { askRemoveBackgroundQuestions } from './questions.js';
import type { RemoveBackgroundConfig } from './types.js';

const { prompt } = enquirer;

export async function handleRemoveBackground(options: any): Promise<void> {
  const config: Partial<RemoveBackgroundConfig> = {
    imageFile: options.input,
    outputPath: options.output,
    format: options.format,
    channels: options.channels,
    bgColor: options.bgColor,
    size: options.size,
    crop: options.crop || false,
    despill: options.despill || false,
    dryRun: options.dryRun || false
  };

  const finalConfig = await askRemoveBackgroundQuestions(config);

  if (finalConfig.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No actual API request will be made');
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

  // Get API key
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) {
    try {
      const { key } = (await prompt({
        type: 'password',
        name: 'key',
        message: 'Enter your PhotoRoom API key:',
        validate: (value: string) => value.length > 0 || 'API key is required'
      })) as { key: string };

      // Call the API
      await removeBackground(finalConfig, key);
    } catch (_error) {
      // User cancelled with Ctrl+C
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }
  } else {
    // Call the API with env key
    await removeBackground(finalConfig, apiKey);
  }
}
