import enquirer from 'enquirer';
import { findImages, formatImageChoice } from './image-selector.js';

export interface QuestionChoice {
  message: string; // Display text
  name: string; // Internal identifier
  value: string; // Return value
  hint?: string; // Optional hint
  disabled?: boolean | string; // Whether the choice is disabled
}

export interface SelectQuestion<T extends readonly string[] = readonly string[]> {
  type: 'select';
  name: string;
  label: string;
  hint?: string;
  choices: Array<QuestionChoice & { value: T[number] }>;
  default?: T[number];
  required?: boolean;
  subquestions?: Partial<Record<T[number], Question[]>>;
}

export interface InputQuestion {
  type: 'input';
  name: string;
  label: string;
  hint?: string;
  default?: string;
  required?: boolean;
  validate?: (value: string) => boolean | string;
}

export interface ConfirmQuestion {
  type: 'confirm';
  name: string;
  label: string;
  hint?: string;
  default?: boolean;
  required?: boolean;
}

export interface SelectImagesQuestion {
  type: 'select-images';
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  validate?: (value: string[]) => boolean | string;
}

export type Question = SelectQuestion | InputQuestion | ConfirmQuestion | SelectImagesQuestion;

export interface QuestionResults {
  [key: string]: unknown;
}

export async function askQuestions(questions: Question[]): Promise<QuestionResults> {
  const results: QuestionResults = {};

  for (const question of questions) {
    const answer = await askSingleQuestion(question);
    results[question.name] = answer;
    // Check for subquestions
    if (
      question.type === 'select' &&
      question.subquestions &&
      typeof answer === 'string' &&
      question.subquestions[answer]
    ) {
      const subResults = await askQuestions(question.subquestions[answer]);
      Object.assign(results, subResults);
    }

    // Handle validation for input questions that bypassed single question validation
    if (question.type === 'input' && question.validate && typeof answer === 'string') {
      const validation = question.validate(answer);
      if (validation !== true) {
        console.log(`\n❌ ${validation}`);
        // Re-ask the question
        const retryAnswer = await askSingleQuestion(question);
        results[question.name] = retryAnswer;
      }
    }
  }

  return results;
}

async function askSingleQuestion(question: Question): Promise<unknown> {
  try {
    let promptConfig: Record<string, unknown>;

    if (question.type === 'select') {
      promptConfig = {
        type: 'select',
        name: question.name,
        message: question.label,
        choices:
          question.choices?.map((choice) => ({
            message: choice.message,
            name: choice.name,
            value: choice.value,
            ...(choice.hint && { hint: choice.hint }),
            ...(choice.disabled !== undefined && { disabled: choice.disabled })
          })) || [],
        ...(question.hint && { hint: question.hint }),
        ...(question.default && { initial: question.default })
      };
    } else if (question.type === 'select-images') {
      const selectedImages = await handleImageSelection(question);
      if (question.required && selectedImages.length === 0) {
        console.log('\n❌ At least one image is required.');
        return await askSingleQuestion(question);
      }
      return selectedImages;
    } else {
      promptConfig = {
        type: question.type,
        name: question.name,
        message: question.label,
        ...(question.hint && { hint: question.hint }),
        ...(question.default && { initial: question.default }),
        ...(question.type === 'input' &&
          question.validate && {
            validate: question.validate
          })
      };
    }

    const result = await enquirer.prompt(
      promptConfig as unknown as Parameters<typeof enquirer.prompt>[0]
    );
    return (result as Record<string, unknown>)[question.name];
  } catch (_error) {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}

async function handleImageSelection(question: SelectImagesQuestion): Promise<string[]> {
  const images = await findImages();

  if (images.length === 0) {
    console.log('\n❌ No images found in the current directory.');
    console.log('Supported formats: .jpg, .jpeg, .png, .webp, .bmp, .tiff, .gif');
    return [];
  }

  // Images will be shown in the selection prompt

  const validImages = images.filter((img) => img.isValid);
  if (validImages.length === 0) {
    console.log('\n❌ No valid images found (all exceed size/resolution limits).');
    return [];
  }

  // Create choices for valid images
  const choices = [
    { message: 'All valid images', name: 'all', value: 'all' },
    ...validImages.map((image, index) => ({
      message: formatImageChoice(image),
      name: `image-${index}`,
      value: image.path
    }))
  ];

  const promptConfig = {
    type: 'multiselect',
    name: 'selectedImages',
    message: question.label,
    choices,
    ...(question.hint && { hint: question.hint }),
    limit: 10 // Limit visible choices to avoid overwhelming display
  };

  const result = await enquirer.prompt(promptConfig);
  const selected = (result as { selectedImages: string[] }).selectedImages;

  // If 'all' is selected, return all valid image paths
  if (selected.includes('all')) {
    return validImages.map((img) => img.path);
  }

  return selected;
}
