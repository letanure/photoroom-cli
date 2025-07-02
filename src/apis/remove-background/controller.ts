import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { type ProcessResult, processImage, simulateProcessing } from './processor.js';
import type { RemoveBackgroundConfig } from './types.js';

export interface ProcessingSummary {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    image: string;
    status: 'success' | 'failed' | 'skipped';
    outputPath?: string;
    error?: string;
    metadata?: ProcessResult['metadata'];
  }>;
}

export interface ControllerOptions {
  apiKey: string;
  dryRun?: boolean;
  onProgress?: (current: number, total: number, imageName: string) => void;
  onImageComplete?: (result: ProcessResult, imageName: string) => void;
  onFileConflict?: (outputPath: string) => Promise<'overwrite' | 'skip' | 'rename'>;
}

/**
 * Controller that orchestrates the processing of multiple images
 * Handles file conflicts, progress tracking, and result aggregation
 */
export async function processImages(
  config: RemoveBackgroundConfig,
  options: ControllerOptions
): Promise<ProcessingSummary> {
  const imagesToProcess = config.imageFiles || [config.imageFile];
  const summary: ProcessingSummary = {
    total: imagesToProcess.length,
    successful: 0,
    failed: 0,
    results: []
  };

  // Ensure output directory exists
  const outputDir = dirname(config.outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < imagesToProcess.length; i++) {
    const imagePath = imagesToProcess[i];
    if (!imagePath) continue;

    const imageName = basename(imagePath);
    options.onProgress?.(i + 1, imagesToProcess.length, imageName);

    // Generate output path
    const imageExt = extname(imagePath);
    const imageBasename = basename(imagePath, imageExt);
    let outputPath = join(outputDir, `${imageBasename}_processed.${config.format}`);

    // Handle file conflicts
    if (existsSync(outputPath) && options.onFileConflict) {
      const action = await options.onFileConflict(outputPath);

      if (action === 'skip') {
        summary.results.push({
          image: imageName,
          status: 'skipped'
        });
        continue;
      }
      if (action === 'rename') {
        let counter = 1;
        const nameWithoutExt = `${imageBasename}_processed`;
        while (existsSync(join(outputDir, `${nameWithoutExt}_${counter}.${config.format}`))) {
          counter++;
        }
        outputPath = join(outputDir, `${nameWithoutExt}_${counter}.${config.format}`);
      }
      // 'overwrite' action doesn't need special handling
    }

    // Process the image
    let result: ProcessResult;

    if (options.dryRun) {
      result = simulateProcessing(imagePath, config);
    } else {
      result = await processImage(imagePath, config, options.apiKey);
    }

    // Notify about completion
    options.onImageComplete?.(result, imageName);

    if (result.success && result.data) {
      if (!options.dryRun) {
        try {
          writeFileSync(outputPath, result.data);
        } catch (error) {
          result = {
            success: false,
            error: `Failed to write file: ${error instanceof Error ? error.message : error}`
          };
        }
      }

      if (result.success) {
        summary.successful++;
        summary.results.push({
          image: imageName,
          status: 'success',
          outputPath: options.dryRun ? `[DRY RUN] ${outputPath}` : outputPath,
          metadata: result.metadata
        });
      } else {
        summary.failed++;
        summary.results.push({
          image: imageName,
          status: 'failed',
          error: result.error
        });
      }
    } else {
      summary.failed++;
      summary.results.push({
        image: imageName,
        status: 'failed',
        error: result.error
      });
    }
  }

  return summary;
}
