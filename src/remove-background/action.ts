import {
  type RemoveBackgroundOptions,
  removeBackgroundApi,
  saveProcessedImage
} from '../shared/api-client.js';
import { isDryRunEnabled } from '../shared/debug.js';
import type { ConflictState } from '../shared/file-conflict-handler.js';
import type { ImageProcessResult } from '../shared/image-processor.js';

export async function processRemoveBackground(
  imagePath: string,
  options: RemoveBackgroundOptions,
  conflictState: ConflictState
): Promise<ImageProcessResult> {
  try {
    const results = await removeBackgroundApi([imagePath], options);
    const result = results[0]?.result;

    if (!result) {
      return {
        success: false,
        error: 'No result returned from API'
      };
    }

    if (result.success && result.data) {
      try {
        let outputPath: string | null;

        // In dry-run mode, generate mock output path without saving
        if (isDryRunEnabled()) {
          const extension = options.format || 'png';
          const baseName = imagePath.split('/').pop()?.split('.')[0] || 'image';
          outputPath = `${options.outputDir || '.'}/${baseName}_processed.${extension}`;
        } else {
          outputPath = await saveProcessedImage(imagePath, result.data, options, conflictState);
        }

        if (outputPath === null) {
          return {
            success: false,
            error: 'Operation cancelled by user'
          };
        }

        return {
          success: true,
          outputPath,
          uncertaintyScore: result.uncertaintyScore
        };
      } catch (saveError) {
        return {
          success: false,
          error: `Failed to save processed image: ${saveError}`
        };
      }
    } else {
      const errorResult = result as Extract<typeof result, { success: false }>;
      return {
        success: false,
        error: errorResult.error,
        detail: errorResult.detail,
        type: errorResult.type,
        statusCode: errorResult.statusCode
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
