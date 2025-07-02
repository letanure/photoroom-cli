import enquirer from 'enquirer';

export interface QuestionChoice {
  message: string; // Display text
  name: string; // Internal identifier
  value: string; // Return value
}

export interface SelectQuestion<T extends readonly string[] = readonly string[]> {
  type: 'select';
  name: string;
  label: string;
  hint?: string;
  choices: Array<QuestionChoice & { value: T[number] }>;
  default?: T[number];
  subquestions?: Partial<Record<T[number], Question[]>>;
}

export interface InputQuestion {
  type: 'input';
  name: string;
  label: string;
  hint?: string;
  default?: string;
}

export interface ConfirmQuestion {
  type: 'confirm';
  name: string;
  label: string;
  hint?: string;
  default?: boolean;
}

export type Question = SelectQuestion | InputQuestion | ConfirmQuestion;

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
            value: choice.value
          })) || [],
        ...(question.hint && { hint: question.hint }),
        ...(question.default && { initial: question.default })
      };
    } else {
      promptConfig = {
        type: question.type,
        name: question.name,
        message: question.label,
        ...(question.hint && { hint: question.hint }),
        ...(question.default && { initial: question.default })
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
