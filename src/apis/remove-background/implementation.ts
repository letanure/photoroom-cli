import { mkdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
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

  if (finalConfig.imageFiles && finalConfig.imageFiles.length > 1) {
    console.log(`Processing: ${finalConfig.imageFiles.length} images`);
    console.log(`Output directory: ${finalConfig.outputPath}`);
  } else {
    console.log(`Input: ${finalConfig.imageFile}`);
    console.log(`Output: ${finalConfig.outputPath}`);
  }

  console.log(`Format: ${finalConfig.format}`);
  console.log(`Channels: ${finalConfig.channels}`);
  if (finalConfig.bgColor) console.log(`Background: ${finalConfig.bgColor}`);
  console.log(`Size: ${finalConfig.size}`);
  console.log(`Crop: ${finalConfig.crop}`);
  console.log(`Despill: ${finalConfig.despill}`);

  // Call the API - handle multiple images
  if (finalConfig.imageFiles && finalConfig.imageFiles.length > 1) {
    await processMultipleImages(finalConfig, apiKey);
  } else {
    await removeBackground(finalConfig, apiKey);
  }
}

async function processMultipleImages(
  config: RemoveBackgroundConfig,
  apiKey: string
): Promise<void> {
  const { imageFiles } = config;
  if (!imageFiles) return;

  // Ensure output directory exists
  try {
    mkdirSync(config.outputPath, { recursive: true });
  } catch (error) {
    console.error(`❌ Failed to create output directory: ${config.outputPath}`);
    throw error;
  }

  console.log(`\n🔄 Processing ${imageFiles.length} images...`);

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    if (!imagePath) continue;

    const imageExt = extname(imagePath);
    const imageBasename = basename(imagePath, imageExt);
    const outputPath = join(config.outputPath, `${imageBasename}_processed.${config.format}`);

    console.log(`\n📸 Processing ${i + 1}/${imageFiles.length}: ${basename(imagePath)}`);

    const singleConfig: RemoveBackgroundConfig = {
      ...config,
      imageFile: imagePath,
      outputPath: outputPath
    };

    try {
      await removeBackground(singleConfig, apiKey);
    } catch (error) {
      console.error(`❌ Failed to process ${basename(imagePath)}:`, error);
      // Continue with next image instead of stopping
    }
  }

  console.log(`\n✅ Finished processing ${imageFiles.length} images`);
}
