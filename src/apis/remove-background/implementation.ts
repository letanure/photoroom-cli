import { existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import enquirer from 'enquirer';
import { getApiKey } from '../../api-key-manager.js';
import { removeBackground } from './api.js';
import { askRemoveBackgroundQuestions } from './questions.js';
import type { RemoveBackgroundConfig } from './types.js';

const { prompt } = enquirer;

// Global state for overwrite handling
let overwriteAll = false;
let createNewAll = false;

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    try {
      mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created output directory: ${dirPath}`);
    } catch (error) {
      console.error(`❌ Failed to create directory: ${dirPath}`);
      throw error;
    }
  }
}

function generateUniqueFilename(originalPath: string): string {
  const dir = dirname(originalPath);
  const ext = extname(originalPath);
  const nameWithoutExt = basename(originalPath, ext);

  let counter = 2; // Start with -2 since the original would be -1
  let newPath: string;

  do {
    newPath = join(dir, `${nameWithoutExt}-${counter}${ext}`);
    counter++;
  } while (existsSync(newPath));

  return newPath;
}

async function checkFileOverwrite(
  filePath: string
): Promise<{ proceed: boolean; newPath?: string }> {
  if (!existsSync(filePath)) {
    return { proceed: true }; // File doesn't exist, safe to write
  }

  if (overwriteAll) {
    return { proceed: true }; // User already chose to overwrite all
  }

  if (createNewAll) {
    const newPath = generateUniqueFilename(filePath);
    console.log(`📝 Creating new file: ${basename(newPath)}`);
    return { proceed: true, newPath };
  }

  try {
    const filename = basename(filePath);
    const uniquePath = generateUniqueFilename(filePath);
    const uniqueFilename = basename(uniquePath);

    const { action } = (await prompt({
      type: 'select',
      name: 'action',
      message: `File "${filename}" already exists. What would you like to do?`,
      choices: [
        { name: 'overwrite', message: 'Overwrite this file' },
        { name: 'overwrite-all', message: "Overwrite this and all future files (don't ask again)" },
        { name: 'create-new', message: `Create new file: ${uniqueFilename}` },
        {
          name: 'create-new-all',
          message: "Create new numbered files for all conflicts (don't ask again)"
        },
        { name: 'skip', message: 'Skip this file' },
        { name: 'abort', message: 'Cancel entire operation' }
      ]
    })) as {
      action: 'overwrite' | 'overwrite-all' | 'create-new' | 'create-new-all' | 'skip' | 'abort';
    };

    switch (action) {
      case 'overwrite':
        return { proceed: true };
      case 'overwrite-all':
        overwriteAll = true;
        console.log('✅ Will overwrite all existing files without asking');
        return { proceed: true };
      case 'create-new':
        console.log(`📝 Creating new file: ${uniqueFilename}`);
        return { proceed: true, newPath: uniquePath };
      case 'create-new-all':
        createNewAll = true;
        console.log('✅ Will create new numbered files for all conflicts');
        console.log(`📝 Creating new file: ${uniqueFilename}`);
        return { proceed: true, newPath: uniquePath };
      case 'skip':
        console.log(`⏭️  Skipping ${filename}`);
        return { proceed: false };
      case 'abort':
        console.log('\n🚫 Operation cancelled by user');
        process.exit(0);
        return { proceed: false }; // This won't be reached, but satisfies linter
      default:
        return { proceed: false };
    }
  } catch (_error) {
    // User cancelled with Ctrl+C
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}

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

  // Ensure output directory exists
  const outputDir =
    finalConfig.imageFiles && finalConfig.imageFiles.length > 1
      ? finalConfig.outputPath
      : dirname(finalConfig.outputPath);
  await ensureDirectoryExists(outputDir);

  // Call the API - handle multiple images
  if (finalConfig.imageFiles && finalConfig.imageFiles.length > 1) {
    await processMultipleImages(finalConfig, apiKey);
  } else {
    // Check for file overwrite before processing single image
    const overwriteResult = await checkFileOverwrite(finalConfig.outputPath);
    if (overwriteResult.proceed) {
      // Use new path if provided, otherwise use original
      const actualOutputPath = overwriteResult.newPath || finalConfig.outputPath;
      const configWithActualPath = { ...finalConfig, outputPath: actualOutputPath };
      await removeBackground(configWithActualPath, apiKey);
    } else {
      console.log('📄 Single image processing skipped');
    }
  }
}

async function processMultipleImages(
  config: RemoveBackgroundConfig,
  apiKey: string
): Promise<void> {
  const { imageFiles } = config;
  if (!imageFiles) return;

  console.log(`\n🔄 Processing ${imageFiles.length} images...`);

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    if (!imagePath) continue;

    const imageExt = extname(imagePath);
    const imageBasename = basename(imagePath, imageExt);
    const outputPath = join(config.outputPath, `${imageBasename}_processed.${config.format}`);

    console.log(`\n📸 Processing ${i + 1}/${imageFiles.length}: ${basename(imagePath)}`);

    // Check for file overwrite before processing
    const overwriteResult = await checkFileOverwrite(outputPath);
    if (!overwriteResult.proceed) {
      continue; // Skip this file
    }

    // Use new path if provided, otherwise use original
    const actualOutputPath = overwriteResult.newPath || outputPath;

    const singleConfig: RemoveBackgroundConfig = {
      ...config,
      imageFile: imagePath,
      outputPath: actualOutputPath
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
