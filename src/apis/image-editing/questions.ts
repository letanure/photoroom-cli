import enquirer from 'enquirer';
import { selectImages } from '../../utils/image-selection.js';
import {
  getQuestion,
  QUESTION_DEFINITIONS,
  type QuestionDefinition
} from './question-definitions.js';
import type { ImageEditingConfig, QuestionConfig } from './types.js';
import { DEFAULT_QUESTION_CONFIG } from './types.js';

const { prompt } = enquirer;

interface EnquirerQuestion {
  type: string;
  name: string;
  message: string;
  initial?: string | number | boolean;
  hint?: string;
  validate?: (value: unknown) => boolean | string;
  choices?: Array<{ name: string; message: string }>;
}

function convertToEnquirerQuestion(def: QuestionDefinition): EnquirerQuestion {
  const question: EnquirerQuestion = {
    type: def.type,
    name: def.name,
    message: def.label
  };

  if (def.defaultValue !== undefined) {
    question.initial = def.defaultValue;
  }

  if (def.hint && def.type === 'input') {
    question.hint = def.hint;
  }

  if (def.validate) {
    question.validate = def.validate;
  }

  if (def.choices) {
    question.choices = def.choices.map((choice) => ({
      name: choice.value,
      message: choice.label + (choice.hint ? ` - ${choice.hint}` : '')
    }));
  }

  return question;
}

export async function askImageEditingQuestions(
  config: Partial<ImageEditingConfig> = {},
  questionConfig: QuestionConfig = DEFAULT_QUESTION_CONFIG
): Promise<ImageEditingConfig> {
  const answers: Partial<ImageEditingConfig> = { ...config };

  // Handle multiple image selection
  if (!answers.imageFile) {
    const imageSelection = await selectImages();
    answers.imageFile = imageSelection.imageFile;
    answers.imageFiles = imageSelection.imageFiles;
  }

  // Always ask for output path if not provided
  if (!answers.outputPath) {
    try {
      const pathAnswer = await prompt({
        type: 'input',
        name: 'outputPath',
        message: 'Output directory (where processed images will be saved):',
        initial: './output',
        validate: (value: string) => value.length > 0 || 'Output directory is required'
      });
      answers.outputPath = (pathAnswer as { outputPath: string }).outputPath;
    } catch (_error) {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }
  }

  // Ask core questions from config
  const coreQuestions = [];
  for (const questionName of questionConfig.core) {
    const questionDef = getQuestion(questionName);
    if (questionDef && answers[questionName as keyof ImageEditingConfig] === undefined) {
      coreQuestions.push(convertToEnquirerQuestion(questionDef));
    }
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
  // Get all available groups from question definitions
  const availableGroups = [...new Set(QUESTION_DEFINITIONS.map((q) => q.group))].filter(
    (g) => g !== 'core'
  );

  const groupLabels: Record<string, string> = {
    background: 'Background Options',
    layout: 'Layout & Sizing',
    spacing: 'Margins & Padding',
    effects: 'Effects & Processing',
    export: 'Export Settings',
    specific: 'Specific options from config'
  };

  const { category } = (await prompt({
    type: 'select',
    name: 'category',
    message: 'Select advanced options category:',
    choices: [
      ...availableGroups.map((g) => ({ name: g, message: groupLabels[g] || g })),
      { name: 'specific', message: groupLabels.specific }
    ]
  })) as { category: string };

  const questions: EnquirerQuestion[] = [];

  if (category === 'specific') {
    // Ask specific questions from advanced config
    for (const questionName of questionConfig.advanced) {
      const questionDef = getQuestion(questionName);
      if (questionDef && answers[questionName as keyof ImageEditingConfig] === undefined) {
        questions.push(convertToEnquirerQuestion(questionDef));
      }
    }
  } else {
    // Get all questions from the selected category
    const categoryQuestions = QUESTION_DEFINITIONS.filter((q) => q.group === category);
    for (const questionDef of categoryQuestions) {
      if (answers[questionDef.name as keyof ImageEditingConfig] === undefined) {
        questions.push(convertToEnquirerQuestion(questionDef));
      }
    }
  }

  if (questions.length > 0) {
    try {
      const advancedAnswers = await prompt(questions);
      Object.assign(answers, advancedAnswers);
    } catch (_error) {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }
  } else {
    console.log('All options in this category are already configured.');
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
