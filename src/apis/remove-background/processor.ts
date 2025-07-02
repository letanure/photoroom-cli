import { createFormData, PhotoRoomApiClient } from '../../api-client.js';
import type { RemoveBackgroundConfig } from './types.js';

export interface ProcessResult {
  success: boolean;
  data?: Buffer;
  error?: string;
  metadata?: {
    uncertaintyScore?: number;
    confidence?: string;
    description?: string;
  };
}

/**
 * Pure function to process a single image
 * No logging, no side effects, just processes and returns result
 */
export async function processImage(
  imagePath: string,
  config: RemoveBackgroundConfig,
  apiKey: string
): Promise<ProcessResult> {
  try {
    const client = new PhotoRoomApiClient({ apiKey });

    // Create form data for API request
    const formData = createFormData(imagePath, {
      format: config.format,
      channels: config.channels,
      bgColor: config.bgColor,
      size: config.size,
      crop: config.crop,
      despill: config.despill
    });

    // Make API request
    const response = await client.makeRequest<Buffer>('/v1/segment', formData, false);

    if (response.error) {
      let errorMessage = 'Unknown error';

      // Try multiple ways to extract the error message
      if (response.error.error?.detail) {
        errorMessage = response.error.error.detail;
      } else if (response.error.error?.message) {
        errorMessage = response.error.error.message;
      } else if (response.error.detail) {
        errorMessage = response.error.detail;
      } else if (response.error.message) {
        errorMessage = response.error.message;
      } else if (typeof response.error === 'string') {
        errorMessage = response.error;
      } else {
        errorMessage = JSON.stringify(response.error);
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    if (response.data) {
      // Handle uncertainty score
      const uncertaintyScore = response.headers?.['x-uncertainty-score'];
      let metadata: ProcessResult['metadata'];

      if (uncertaintyScore !== undefined) {
        const scoreValue = Array.isArray(uncertaintyScore) ? uncertaintyScore[0] : uncertaintyScore;
        const score = Number.parseFloat(scoreValue || '0');
        const interpretation = interpretUncertaintyScore(score);

        metadata = {
          uncertaintyScore: score,
          confidence: interpretation.confidence,
          description: interpretation.description
        };
      }

      return {
        success: true,
        data: response.data,
        metadata
      };
    }

    return {
      success: false,
      error: 'No data received from API'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Dry run simulation - returns what would happen without making API call
 */
export function simulateProcessing(
  _imagePath: string,
  _config: RemoveBackgroundConfig
): ProcessResult {
  return {
    success: true,
    data: Buffer.from('DRY RUN - No actual processing'),
    metadata: {
      uncertaintyScore: 0.5,
      confidence: 'simulated',
      description: 'This is a dry run simulation'
    }
  };
}

interface UncertaintyScore {
  value: number;
  confidence: string;
  description: string;
}

function interpretUncertaintyScore(score: number): UncertaintyScore {
  if (score === -1) {
    return {
      value: score,
      confidence: 'human-detected',
      description: 'Human detected in image (different processing applied)'
    };
  }
  if (score <= 0.3) {
    return {
      value: score,
      confidence: 'very-high',
      description: 'Model is very confident about the cutout accuracy'
    };
  }
  if (score <= 0.5) {
    return {
      value: score,
      confidence: 'high',
      description: 'Model is confident about the cutout accuracy'
    };
  }
  if (score <= 0.7) {
    return {
      value: score,
      confidence: 'medium',
      description: 'Model has moderate confidence about the cutout'
    };
  }
  return {
    value: score,
    confidence: 'low',
    description: 'Model is unsure about the cutout (complex objects/backgrounds)'
  };
}
