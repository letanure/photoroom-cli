import { getApiKey } from '../../api-key-manager.js';
import { removeBackground } from './api.js';
import { askRemoveBackgroundQuestions } from './questions.js';
import type { RemoveBackgroundConfig } from './types.js';

interface RemoveBackgroundOptions {
  input?: string;
  output?: string;
  format?: 'png' | 'jpg' | 'webp';
  channels?: 'rgba' | 'alpha';
  bgColor?: string;
  size?: 'preview' | 'medium' | 'hd' | 'full';
  crop?: boolean;
  despill?: boolean;
  dryRun?: boolean;
  apiKey?: string;
}

export async function handleRemoveBackground(options: RemoveBackgroundOptions): Promise<void> {
  // Get API key (use passed apiKey or fall back to getApiKey, skip if dry run)
  const apiKey = options.apiKey || (options.dryRun ? 'dry-run-key' : await getApiKey(options));

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

  // Call the API
  await removeBackground(finalConfig, apiKey);
}
