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
    console.error('\n❌ Error:', response.error.detail);
    console.error(`Status: ${response.error.status_code}`);
    console.error(`Type: ${response.error.type}`);

    if (response.error.status_code === 403) {
      console.error('\n💡 Tip: Check your API key and plan limits');
    }

    process.exit(1);
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
        const score = Number.parseFloat(uncertaintyScore);
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
