import {
  type RemoveBackgroundOptions,
  removeBackgroundApi,
  saveProcessedImage
} from '../shared/api-client.js';
import type { ImageProcessResult } from '../shared/image-processor.js';

export async function processRemoveBackground(
  imagePath: string,
  options: RemoveBackgroundOptions
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
        const outputPath = await saveProcessedImage(imagePath, result.data, options);
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
