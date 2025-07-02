import { writeFileSync } from 'node:fs';
import { createFormData, PhotoRoomApiClient } from '../../api-client.js';
import type { RemoveBackgroundConfig, UncertaintyScore } from './types.js';

export async function removeBackground(
  config: RemoveBackgroundConfig,
  apiKey: string
): Promise<void> {
  if (!config.dryRun) {
    console.log('\n🔄 Processing image...');
  }

  const client = new PhotoRoomApiClient({ apiKey });

  // Create form data
  const formData = createFormData(config.imageFile, {
    format: config.format,
    channels: config.channels,
    bgColor: config.bgColor,
    size: config.size,
    crop: config.crop,
    despill: config.despill
  });

  // Make API request
  const response = await client.makeRequest<Buffer>('/v1/segment', formData, config.dryRun);

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
      // Last resort: stringify the error object
      errorMessage = JSON.stringify(response.error);
    }

    // Throw error instead of process.exit to allow batch processing
    throw new Error(errorMessage);
  }

  if (response.data) {
    if (config.dryRun) {
      console.log('\n✅ DRY RUN COMPLETE - No file was written');
      console.log(`   Output would be saved to: ${config.outputPath}`);
    } else {
      // Write the output file
      writeFileSync(config.outputPath, response.data);
      console.log(`\n✅ Image saved to: ${config.outputPath}`);

      // Handle uncertainty score
      const uncertaintyScore = response.headers?.['x-uncertainty-score'];
      if (uncertaintyScore !== undefined) {
        const scoreValue = Array.isArray(uncertaintyScore) ? uncertaintyScore[0] : uncertaintyScore;
        const score = Number.parseFloat(scoreValue || '0');
        const interpretation = interpretUncertaintyScore(score);

        console.log(`\n📊 Uncertainty Score: ${score}`);
        console.log(`   Confidence: ${interpretation.confidence}`);
        console.log(`   ${interpretation.description}`);
      }
    }
  }
}

function interpretUncertaintyScore(score: number): UncertaintyScore {
  if (score === -1) {
    return {
      value: score,
      confidence: 'human-detected',
      description: 'Human detected in image (different processing applied)'
    };
  }

  if (score >= 0 && score <= 0.2) {
    return {
      value: score,
      confidence: 'very-confident',
      description: 'Model is very confident about the cutout accuracy'
    };
  }

  if (score > 0.2 && score <= 0.5) {
    return {
      value: score,
      confidence: 'confident',
      description: 'Model is confident about the cutout'
    };
  }

  if (score > 0.5 && score <= 0.8) {
    return {
      value: score,
      confidence: 'uncertain',
      description: 'Model is uncertain about some parts of the cutout'
    };
  }

  return {
    value: score,
    confidence: 'very-uncertain',
    description: 'Model is very uncertain - manual review recommended'
  };
}
