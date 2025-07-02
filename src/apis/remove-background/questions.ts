import { basename, extname, join } from 'node:path';
import enquirer from 'enquirer';
import { selectImages } from '../../utils/image-selection.js';
import { getQuestionsToAsk, toEnquirerFormat } from './question-config.js';
import type { RemoveBackgroundConfig } from './types.js';

const { prompt } = enquirer;

/**
 * Pure function to collect user preferences for background removal
 * No side effects, no API calls, just data collection
 */
export async function collectRemoveBackgroundConfig(
  initialConfig: Partial<RemoveBackgroundConfig> = {}
): Promise<RemoveBackgroundConfig> {
  const config: Partial<RemoveBackgroundConfig> = { ...initialConfig };

  // Collect images if not provided
  if (!config.imageFile) {
    const imageSelection = await selectImages();
    config.imageFile = imageSelection.imageFile;
    config.imageFiles = imageSelection.imageFiles;
  }

  // Collect output directory if not provided
  if (!config.outputPath) {
    const { outputPath } = (await prompt({
      type: 'input',
      name: 'outputPath',
      message: 'Output directory (where processed images will be saved):',
      initial: './output',
      validate: (value: string) => value.length > 0 || 'Output directory is required'
    })) as { outputPath: string };
    config.outputPath = outputPath;
  }

  // Get questions that need to be asked
  const questionsToAsk = getQuestionsToAsk(config);

  // Convert to enquirer format and set initial values from config
  const questions = questionsToAsk.map((question) => {
    const enquirerQuestion = toEnquirerFormat(question);

    // Override initial value if already in config
    if (config[question.name as keyof RemoveBackgroundConfig] !== undefined) {
      enquirerQuestion.initial = config[question.name as keyof RemoveBackgroundConfig];
    }

    return enquirerQuestion;
  });

  try {
    // biome-ignore lint/suspicious/noExplicitAny: enquirer type compatibility
    const answers = await prompt(questions as any);
    const finalConfig = { ...config, ...answers } as RemoveBackgroundConfig;

    if (finalConfig.bgColor === '') {
      delete finalConfig.bgColor;
    }

    // For single image, generate filename in the output directory
    if (!finalConfig.imageFiles || finalConfig.imageFiles.length <= 1) {
      const inputFile = finalConfig.imageFile;
      const inputBasename = basename(inputFile, extname(inputFile));
      const outputFilename = `${inputBasename}_processed.${finalConfig.format}`;
      finalConfig.outputPath = join(finalConfig.outputPath, outputFilename);
    }

    return finalConfig;
  } catch (_error) {
    // User cancelled with Ctrl+C
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}
