import {
  type ImageEditingOptions,
  imageEditingApi,
  saveProcessedImageEditing
} from '../shared/api-client.js';
import { isDryRunEnabled } from '../shared/debug.js';
import type { ConflictState } from '../shared/file-conflict-handler.js';
import type { ImageProcessResult } from '../shared/image-processor.js';

export async function processImageEditing(
  imagePath: string,
  options: ImageEditingOptions,
  conflictState: ConflictState
): Promise<ImageProcessResult> {
  try {
    const results = await imageEditingApi([imagePath], options);
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
          const extension = options.export?.format || 'png';
          const baseName = imagePath.split('/').pop()?.split('.')[0] || 'image';
          outputPath = `${options.outputDir || 'output'}/${baseName}_edited.${extension}`;
        } else {
          outputPath = await saveProcessedImageEditing(
            imagePath,
            result.data,
            options,
            conflictState
          );
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
          uncertaintyScore: result.uncertaintyScore,
          aiBackgroundSeed: result.aiBackgroundSeed,
          editFurtherUrl: result.editFurtherUrl,
          textsDetected: result.textsDetected,
          unsupportedAttributes: result.unsupportedAttributes
        };
      } catch (saveError) {
        return {
          success: false,
          error: `Failed to save processed image: ${saveError}`
        };
      }
    }

    const errorResult = result as Extract<typeof result, { success: false }>;
    return {
      success: false,
      error: errorResult.error,
      detail: errorResult.detail,
      type: errorResult.type,
      statusCode: errorResult.statusCode
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
