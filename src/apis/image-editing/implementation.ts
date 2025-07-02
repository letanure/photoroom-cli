import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { PhotoRoomApiClient } from '../../api-client.js';
import { configManager } from '../../config.js';
import { askImageEditingQuestions } from './questions.js';
import type { ImageEditingConfig } from './types.js';

export async function handleImageEditing(options?: {
  dryRun?: boolean;
  apiKey?: string;
}): Promise<void> {
  const config: ImageEditingConfig = await askImageEditingQuestions();

  if (options?.dryRun) {
    console.log('\nDRY RUN MODE - No actual API request will be made');
    console.log('\nImage Editing v2 Configuration:');
    console.log(`Input: ${config.imageFiles?.length || 1} image(s)`);
    console.log(`Output: ${config.outputPath}`);
    console.log(`Remove Background: ${config.removeBackground || false}`);
    if (config['background.prompt'])
      console.log(`Background Prompt: ${config['background.prompt']}`);
    return;
  }

  const apiKey = options?.apiKey || (await configManager.getApiKeyForRequest());

  if (!apiKey) {
    console.log('No API key configured. Please set up an API key first.');
    return;
  }

  const client = new PhotoRoomApiClient({ apiKey });
  const imagesToProcess = config.imageFiles || [config.imageFile];

  console.log(`\nProcessing ${imagesToProcess.length} image(s)...`);

  // Ensure output directory exists
  if (!existsSync(config.outputPath)) {
    mkdirSync(config.outputPath, { recursive: true });
    console.log(`Created output directory: ${config.outputPath}`);
  }

  let successCount = 0;
  let failureCount = 0;
  const errors: Array<{ image: string; error: string }> = [];

  for (let i = 0; i < imagesToProcess.length; i++) {
    const imagePath = imagesToProcess[i];
    if (!imagePath) continue;

    const imageNumber = imagesToProcess.length > 1 ? ` (${i + 1}/${imagesToProcess.length})` : '';

    console.log(`\nProcessing: ${basename(imagePath)}${imageNumber}`);

    // Prepare API options from config
    const apiOptions: Record<string, string | number | boolean | undefined> = {};

    // Copy all defined options to API parameters
    const configEntries = Object.entries(config) as [keyof ImageEditingConfig, unknown][];
    for (const [key, value] of configEntries) {
      if (
        value !== undefined &&
        value !== null &&
        key !== 'imageFile' &&
        key !== 'imageFiles' &&
        key !== 'outputPath'
      ) {
        apiOptions[key] = value as string | number | boolean;
      }
    }

    try {
      const response = await client.editImage(imagePath, apiOptions, false);

      if (response.error) {
        let errorMessage = 'Unknown error';

        // Handle different error response structures
        if (response.error.error?.detail) {
          errorMessage = response.error.error.detail;
        } else if (response.error.error?.message) {
          errorMessage = response.error.error.message;
        } else if (response.error.detail) {
          errorMessage = response.error.detail;
        } else if (response.error.message) {
          errorMessage = response.error.message;
        }

        // Special handling for known error types
        if (errorMessage.includes('API credits exhausted')) {
          console.log(`❌ Failed: ${basename(imagePath)} - Out of API credits`);
          console.log('   Visit https://app.photoroom.com/api-dashboard to purchase more credits');
        } else if (errorMessage.includes('must be boolean')) {
          console.log(`❌ Failed: ${basename(imagePath)} - Invalid parameter format`);
        } else {
          console.log(`❌ Failed: ${basename(imagePath)} - ${errorMessage}`);
        }

        failureCount++;
        errors.push({ image: basename(imagePath), error: errorMessage });
        continue;
      }

      if (response.data) {
        // Generate output filename
        const inputBasename = basename(imagePath, extname(imagePath));
        const outputFormat = config['export.format'] || 'png';
        const outputFilename =
          imagesToProcess.length > 1
            ? `${inputBasename}_edited_${i + 1}.${outputFormat}`
            : `${inputBasename}_edited.${outputFormat}`;
        const outputFilePath = join(config.outputPath, outputFilename);

        // Check if file already exists and handle conflicts
        let finalOutputPath = outputFilePath;
        let counter = 1;
        while (existsSync(finalOutputPath)) {
          const nameWithoutExt = basename(outputFilePath, extname(outputFilePath));
          const ext = extname(outputFilePath);
          finalOutputPath = join(dirname(outputFilePath), `${nameWithoutExt}_${counter}${ext}`);
          counter++;
        }

        writeFileSync(finalOutputPath, response.data);
        console.log(`✅ Success: ${basename(imagePath)} → ${basename(finalOutputPath)}`);
        successCount++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ Failed: ${basename(imagePath)} - ${errorMessage}`);
      failureCount++;
      errors.push({ image: basename(imagePath), error: errorMessage });
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Processing Summary');
  console.log('='.repeat(60));

  if (successCount > 0) {
    console.log(`✅ Successfully processed: ${successCount} image(s)`);
    console.log(`   Output directory: ${config.outputPath}`);
  }

  if (failureCount > 0) {
    console.log(`❌ Failed to process: ${failureCount} image(s)`);

    // Group errors by type
    const creditErrors = errors.filter((e) => e.error.includes('API credits'));
    const otherErrors = errors.filter((e) => !e.error.includes('API credits'));

    if (creditErrors.length > 0) {
      console.log('\n   API Credits Exhausted:');
      creditErrors.forEach((e) => console.log(`   - ${e.image}`));
      console.log('\n   💡 Visit https://app.photoroom.com/api-dashboard to purchase more credits');
    }

    if (otherErrors.length > 0) {
      console.log('\n   Other Errors:');
      otherErrors.forEach((e) => console.log(`   - ${e.image}: ${e.error}`));
    }
  }

  if (successCount === 0 && failureCount > 0) {
    console.log('\n⚠️  No images were successfully processed');
  } else if (successCount === imagesToProcess.length) {
    console.log('\n🎉 All images processed successfully!');
  } else if (successCount > 0 && failureCount > 0) {
    console.log('\n⚠️  Some images failed to process');
  }
}
