import type { RemoveBackgroundOptions } from '../shared/api-client.js';
import { processImages } from '../shared/image-processor.js';
import { askQuestions } from '../shared/question-handler.js';
import { processRemoveBackground } from './action.js';
import { removeBackgroundQuestions } from './questions.js';

export async function removeBackground() {
  try {
    const answers = await askQuestions(removeBackgroundQuestions);

    // Process images using generic processor
    await processImages(
      answers.image_files as string[],
      answers as RemoveBackgroundOptions,
      processRemoveBackground
    );
  } catch (error) {
    console.error('❌ Failed to process remove background request:', error);
  }
}
