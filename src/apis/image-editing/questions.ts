import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import enquirer from 'enquirer';
import type { ImageEditingConfig, QuestionConfig } from './types.js';
import { DEFAULT_QUESTION_CONFIG } from './types.js';

const { prompt } = enquirer;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

function getFileType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const typeMap: Record<string, string> = {
    '.jpg': 'JPEG',
    '.jpeg': 'JPEG',
    '.png': 'PNG',
    '.webp': 'WebP',
    '.bmp': 'BMP',
    '.gif': 'GIF',
    '.tiff': 'TIFF'
  };
  return typeMap[ext] || ext.substring(1).toUpperCase();
}

function formatImageChoice(filePath: string): string {
  const filename = basename(filePath);
  const fileType = getFileType(filePath);
  const stats = statSync(filePath);
  const fileSize = formatFileSize(stats.size);

  const nameWidth = 25;
  const typeWidth = 6;

  const paddedName = filename.padEnd(nameWidth);
  const paddedType = fileType.padEnd(typeWidth);

  return `${paddedName} ${paddedType} ${fileSize}`;
}

export async function askImageEditingQuestions(
  config: Partial<ImageEditingConfig> = {},
  questionConfig: QuestionConfig = DEFAULT_QUESTION_CONFIG
): Promise<ImageEditingConfig> {
  const answers: Partial<ImageEditingConfig> = { ...config };

  // Handle multiple image selection (similar to background removal)
  if (!answers.imageFile) {
    const currentDir = process.cwd();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff'];
    const imagesInCurrentDir = readdirSync(currentDir)
      .filter((file) => imageExtensions.includes(extname(file).toLowerCase()))
      .map((file) => join(currentDir, file));

    const imageChoices = [];

    if (imagesInCurrentDir.length > 0) {
      imageChoices.push({
        name: 'SELECT_ALL',
        message: `✅ Select all ${imagesInCurrentDir.length} images`
      });

      imageChoices.push(
        ...imagesInCurrentDir.map((filePath) => ({
          name: filePath,
          message: formatImageChoice(filePath)
        }))
      );
    }

    if (imageChoices.length === 0) {
      const { firstImage } = (await prompt({
        type: 'input',
        name: 'firstImage',
        message: 'Enter first image path:',
        validate: (value: string) => {
          if (value.length === 0) return 'First image path is required';
          if (!existsSync(value)) return 'File does not exist';
          return true;
        }
      })) as { firstImage: string };

      const images = [firstImage];

      while (true) {
        const { nextImage } = (await prompt({
          type: 'input',
          name: 'nextImage',
          message: `Enter next image path (or press Enter to finish - ${images.length} selected):`,
          validate: (value: string) => {
            if (value === '') return true;
            if (!existsSync(value)) return 'File does not exist';
            return true;
          }
        })) as { nextImage: string };

        if (nextImage === '') break;
        images.push(nextImage);
      }

      console.log(`\n📸 Selected ${images.length} image(s)`);
      answers.imageFiles = images;
      answers.imageFile = images[0];
    } else {
      const { selectedImages } = (await prompt({
        type: 'multiselect' as const,
        name: 'selectedImages',
        message: `Select images to process (Found ${imagesInCurrentDir.length} images - Format: Filename Type Size):`,
        choices: imageChoices,
        initial: ['SELECT_ALL']
      } as {
        type: 'multiselect';
        name: string;
        message: string;
        choices: Array<{ name: string; message: string }>;
        initial: string[];
      })) as { selectedImages: string[] };

      let finalImages: string[];
      if (selectedImages.includes('SELECT_ALL')) {
        finalImages = imagesInCurrentDir;
        console.log(`\n✅ Selected all ${finalImages.length} images from current directory`);
      } else {
        finalImages = selectedImages;
        console.log(`\n📸 Selected ${finalImages.length} image(s)`);
      }

      if (finalImages.length === 0) {
        console.log('\n❌ No images selected');
        process.exit(1);
      }

      answers.imageFiles = finalImages;
      answers.imageFile = finalImages[0];
    }
  }

  // Ask core questions
  const coreQuestions = [];

  if (questionConfig.core.includes('outputPath') && !answers.outputPath) {
    coreQuestions.push({
      type: 'input',
      name: 'outputPath',
      message: 'Output directory (where processed images will be saved):',
      initial: './output',
      validate: (value: string) => value.length > 0 || 'Output directory is required'
    });
  }

  if (questionConfig.core.includes('removeBackground') && answers.removeBackground === undefined) {
    coreQuestions.push({
      type: 'confirm',
      name: 'removeBackground',
      message: 'Remove background from images?',
      initial: true
    });
  }

  if (coreQuestions.length > 0) {
    try {
      const coreAnswers = await prompt(coreQuestions);
      Object.assign(answers, coreAnswers);
    } catch (_error) {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }
  }

  // Ask if user wants advanced options
  const { useAdvanced } = (await prompt({
    type: 'confirm',
    name: 'useAdvanced',
    message: 'Configure advanced options?',
    initial: false
  })) as { useAdvanced: boolean };

  if (useAdvanced) {
    await askAdvancedQuestions(answers, questionConfig);
  }

  return answers as ImageEditingConfig;
}

async function askAdvancedQuestions(
  answers: Partial<ImageEditingConfig>,
  questionConfig: QuestionConfig
): Promise<void> {
  const { category } = (await prompt({
    type: 'select',
    name: 'category',
    message: 'Select advanced options category:',
    choices: [
      { name: 'background', message: 'Background Options' },
      { name: 'layout', message: 'Layout & Sizing' },
      { name: 'spacing', message: 'Margins & Padding' },
      { name: 'effects', message: 'Effects & Processing' }
    ]
  })) as { category: keyof QuestionConfig['advanced'] };

  const questions = getQuestionsForCategory(category, questionConfig, answers);

  if (questions.length > 0) {
    try {
      const advancedAnswers = await prompt(questions);
      Object.assign(answers, advancedAnswers);
    } catch (_error) {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }
  }

  const { continueAdvanced } = (await prompt({
    type: 'confirm',
    name: 'continueAdvanced',
    message: 'Configure more advanced options?',
    initial: false
  })) as { continueAdvanced: boolean };

  if (continueAdvanced) {
    await askAdvancedQuestions(answers, questionConfig);
  }
}

interface QuestionDefinition {
  type: string;
  name: string;
  message: string;
  choices?: Array<{ name: string; message: string }>;
  initial?: string | number | boolean;
  hint?: string;
}

function getQuestionsForCategory(
  category: keyof QuestionConfig['advanced'],
  questionConfig: QuestionConfig,
  answers: Partial<ImageEditingConfig>
): QuestionDefinition[] {
  const questions = [];
  const categoryQuestions = questionConfig.advanced[category];

  for (const questionKey of categoryQuestions) {
    switch (questionKey) {
      case 'background.prompt':
        if (!answers['background.prompt']) {
          questions.push({
            type: 'input',
            name: 'background.prompt',
            message: 'Background prompt (describe the background you want):',
            hint: 'E.g., "modern office", "tropical beach", "solid white"'
          });
        }
        break;
      case 'background.color':
        if (!answers['background.color']) {
          questions.push({
            type: 'input',
            name: 'background.color',
            message: 'Background color (hex code or color name):',
            hint: 'E.g., "#FF0000", "red", "transparent"'
          });
        }
        break;
      case 'background.negativePrompt':
        if (!answers['background.negativePrompt']) {
          questions.push({
            type: 'input',
            name: 'background.negativePrompt',
            message: 'Background negative prompt (what to avoid):',
            hint: 'E.g., "blurry", "dark", "cluttered"'
          });
        }
        break;
      case 'outputSize':
        if (!answers.outputSize) {
          questions.push({
            type: 'select',
            name: 'outputSize',
            message: 'Output size:',
            choices: [
              { name: 'original', message: 'Original size' },
              { name: 'small', message: 'Small (512px)' },
              { name: 'medium', message: 'Medium (1024px)' },
              { name: 'large', message: 'Large (2048px)' }
            ],
            initial: 'original'
          });
        }
        break;
      case 'scaling':
        if (!answers.scaling) {
          questions.push({
            type: 'select',
            name: 'scaling',
            message: 'Scaling mode:',
            choices: [
              { name: 'fit', message: 'Fit (maintain aspect ratio)' },
              { name: 'fill', message: 'Fill (may crop)' },
              { name: 'stretch', message: 'Stretch (may distort)' }
            ],
            initial: 'fit'
          });
        }
        break;
      case 'margin':
        if (answers.margin === undefined) {
          questions.push({
            type: 'number',
            name: 'margin',
            message: 'Margin (pixels):',
            initial: 0
          });
        }
        break;
      case 'padding':
        if (answers.padding === undefined) {
          questions.push({
            type: 'number',
            name: 'padding',
            message: 'Padding (pixels):',
            initial: 0
          });
        }
        break;
    }
  }

  return questions;
}
