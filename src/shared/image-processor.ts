export interface ImageProcessResult {
  success: boolean;
  outputPath?: string;
  uncertaintyScore?: number;
  error?: string;
  [key: string]: unknown; // Allow additional properties
}

export type ImageProcessor<T> = (imagePath: string, options: T) => Promise<ImageProcessResult>;

export async function processImages<T>(
  imagePaths: string[],
  options: T,
  processor: ImageProcessor<T>
): Promise<{ successCount: number; totalCount: number }> {
  console.log(`\n🚀 Processing ${imagePaths.length} image(s)...`);

  let successCount = 0;

  for (const imagePath of imagePaths) {
    const result = await processor(imagePath, options);

    if (result.success && result.outputPath) {
      let message = `✅ ${imagePath} → ${result.outputPath}`;

      // Show uncertainty score if available
      if (result.uncertaintyScore !== undefined) {
        if (result.uncertaintyScore === -1) {
          message += ' (human detected)';
        } else {
          const confidence = ((1 - result.uncertaintyScore) * 100).toFixed(0);
          message += ` (${confidence}% confidence)`;
        }
      }

      console.log(message);
      successCount++;
    } else {
      console.log('\n❌ Error processing image');
      console.log(`   File: ${imagePath}`);
      if ('statusCode' in result && result.statusCode) {
        console.log(`   Code: ${result.statusCode}`);
      }
      if ('type' in result && result.type) {
        console.log(`   Type: ${result.type}`);
      }
      console.log(`   Error: ${result.error}`);

      // Check for 403 Forbidden errors
      if ('statusCode' in result && result.statusCode === 403) {
        console.log('\n⚠️  This might be an API key issue. Please check:');
        console.log('   - Your API key is valid and active');
        console.log("   - You're using the correct key type (sandbox/live)");
        console.log('   - Your account has the necessary permissions');
      }
    }
  }

  console.log(`\n📊 Completed: ${successCount}/${imagePaths.length} images processed successfully`);

  return { successCount, totalCount: imagePaths.length };
}
