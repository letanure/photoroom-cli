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
        const errorMessage = response.error.detail || response.error.message || 'Unknown error';
        console.log(`Error processing ${basename(imagePath)}: ${errorMessage}`);
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
        console.log(`✅ Saved: ${finalOutputPath}`);
      }
    } catch (error) {
      console.log(
        `Error processing ${basename(imagePath)}: ${error instanceof Error ? error.message : error}`
      );
      console.log('Full error:', error);
    }
  }

  console.log(`\n🎉 Processing complete! Check output directory: ${config.outputPath}`);
}
