import { askQuestions } from '../shared/question-handler.js';
import { removeBackgroundQuestions } from './questions.js';

export async function removeBackground() {
  try {
    const answers = await askQuestions(removeBackgroundQuestions);

    console.log('\n📋 Configuration:');
    console.log('Selected images:', answers.image_file);
    console.log('Format:', answers.format || 'png');
    console.log(
      'Size:',
      answers.size === 'custom' ? answers.customSize : answers.size || 'original'
    );
    console.log('Crop:', answers.crop ? 'Yes' : 'No');
    console.log('Background color:', answers.bg_color || 'transparent');
    console.log('Channels:', answers.channels || 'alpha');

    // TODO: Implement actual API call to PhotoRoom
    console.log('\n⚠️  API integration pending - configuration captured successfully');
  } catch (error) {
    console.error('❌ Failed to process remove background request:', error);
  }
}
