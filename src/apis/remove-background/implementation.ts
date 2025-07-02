import { basename } from 'node:path';
import enquirer from 'enquirer';
import { getApiKey } from '../../api-key-manager.js';
import { type ControllerOptions, type ProcessingSummary, processImages } from './controller.js';
import { collectRemoveBackgroundConfig } from './questions.js';
import type { RemoveBackgroundConfig } from './types.js';

const { prompt } = enquirer;

interface HandleRemoveBackgroundOptions {
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

/**
 * Main handler for background removal process
 * Orchestrates questions, processing, and result reporting
 */
export async function handleRemoveBackground(
  options: HandleRemoveBackgroundOptions = {}
): Promise<void> {
  try {
    // Get API key (skip if dry run)
    const apiKey = options.dryRun ? 'dry-run-key' : options.apiKey || (await getApiKey(options));

    if (options.dryRun) {
      console.log('\n⚠️ DRY RUN MODE - No actual API requests will be made\n');
    }

    // Collect configuration from user or CLI options
    const initialConfig: Partial<RemoveBackgroundConfig> = {
      ...(options.input && { imageFile: options.input }),
      ...(options.output && { outputPath: options.output }),
      ...(options.format && { format: options.format }),
      ...(options.channels && { channels: options.channels }),
      ...(options.bgColor && { bgColor: options.bgColor }),
      ...(options.size && { size: options.size }),
      ...(options.crop !== undefined && { crop: options.crop }),
      ...(options.despill !== undefined && { despill: options.despill })
    };

    const config = await collectRemoveBackgroundConfig(initialConfig);

    // Show configuration summary
    console.log('\n🎨 Remove Background Configuration:');
    const configTable = {
      Input: config.imageFiles?.length ? `${config.imageFiles.length} images` : config.imageFile,
      Output: config.outputPath,
      Format: config.format,
      Channels: config.channels,
      ...(config.bgColor && { 'Background Color': config.bgColor }),
      Size: config.size,
      Crop: config.crop,
      Despill: config.despill
    };
    console.table(configTable);

    // Set up controller options
    const controllerOptions: ControllerOptions = {
      apiKey,
      dryRun: options.dryRun,
      onProgress: (current, total, imageName) => {
        console.log(`\n📸 Processing ${current}/${total}: ${imageName}`);
      },
      onImageComplete: (result, imageName) => {
        if (result.success) {
          console.log(`✅ Success: ${imageName}`);
          if (result.metadata?.uncertaintyScore !== undefined) {
            console.log(
              `   Confidence: ${result.metadata.confidence} (score: ${result.metadata.uncertaintyScore})`
            );
            console.log(`   ${result.metadata.description}`);
          }
        } else {
          console.log(`❌ Failed: ${imageName} - ${result.error}`);
        }
      },
      onFileConflict: async (outputPath) => {
        const filename = basename(outputPath);
        const { action } = (await prompt({
          type: 'select',
          name: 'action',
          message: `File "${filename}" already exists. What would you like to do?`,
          choices: [
            { name: 'overwrite', message: 'Overwrite existing file' },
            { name: 'rename', message: 'Create new file with number suffix' },
            { name: 'skip', message: 'Skip this image' }
          ]
        })) as { action: 'overwrite' | 'rename' | 'skip' };
        return action;
      }
    };

    // Process images
    console.log(`\n🔄 Processing ${config.imageFiles?.length || 1} image(s)...`);
    const summary = await processImages(config, controllerOptions);

    // Display final summary
    displayProcessingSummary(summary, config.outputPath, options.dryRun);
  } catch (error) {
    console.error('\n❌ An error occurred:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Display the final processing summary
 */
function displayProcessingSummary(
  summary: ProcessingSummary,
  outputPath: string,
  dryRun?: boolean
): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Processing Summary');
  console.log('='.repeat(60));

  if (summary.successful > 0) {
    console.log(`✅ Successfully processed: ${summary.successful} image(s)`);
    if (!dryRun) {
      console.log(`   Output directory: ${outputPath}`);
    } else {
      console.log('   [DRY RUN] No files were actually created');
    }
  }

  if (summary.failed > 0) {
    console.log(`❌ Failed to process: ${summary.failed} image(s)`);

    // Group errors by type
    const creditErrors = summary.results.filter(
      (r) => r.status === 'failed' && r.error?.includes('API credits')
    );
    const otherErrors = summary.results.filter(
      (r) => r.status === 'failed' && !r.error?.includes('API credits')
    );

    if (creditErrors.length > 0) {
      console.log('\n   API Credits Exhausted:');
      creditErrors.forEach((r) => console.log(`   - ${r.image}`));
      console.log('\n   💡 Visit https://app.photoroom.com/api-dashboard to purchase more credits');
    }

    if (otherErrors.length > 0) {
      console.log('\n   Other Errors:');
      otherErrors.forEach((r) => console.log(`   - ${r.image}: ${r.error}`));
    }
  }

  const skipped = summary.results.filter((r) => r.status === 'skipped').length;
  if (skipped > 0) {
    console.log(`⏭️  Skipped: ${skipped} image(s)`);
  }

  if (summary.successful === 0 && summary.failed > 0) {
    console.log('\n⚠️  No images were successfully processed');
  } else if (summary.successful === summary.total) {
    console.log('\n🎉 All images processed successfully!');
  } else if (summary.successful > 0 && summary.failed > 0) {
    console.log('\n⚠️  Some images failed to process');
  }
}
