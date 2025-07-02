import { addApiKey, listApiKeys } from '../../shared/config-manager.js';
import { askQuestions } from '../../shared/question-handler.js';
import { addNewApiKeyQuestions } from './questions.js';

async function suggestApiKeyName(type: 'sandbox' | 'live'): Promise<string> {
  const keys = await listApiKeys();
  const existingNames = Object.values(keys)
    .filter((key) => key.type === type)
    .map((key) => key.name);

  let counter = 1;
  let suggestedName: string;

  do {
    suggestedName = `${type === 'sandbox' ? 'Sandbox' : 'Live'} Key ${counter}`;
    counter++;
  } while (existingNames.includes(suggestedName));

  return suggestedName;
}

async function updateQuestionsWithDynamicDefaults() {
  const sandboxSuggestion = await suggestApiKeyName('sandbox');
  const liveSuggestion = await suggestApiKeyName('live');

  // Update the questions with dynamic defaults
  const updatedQuestions = [...addNewApiKeyQuestions];
  if (updatedQuestions[0]?.subquestions) {
    if (updatedQuestions[0].subquestions.sandbox?.[0]) {
      updatedQuestions[0].subquestions.sandbox[0].default = sandboxSuggestion;
    }
    if (updatedQuestions[0].subquestions.live?.[0]) {
      updatedQuestions[0].subquestions.live[0].default = liveSuggestion;
    }
  }

  return updatedQuestions;
}

export async function addNewApiKey() {
  try {
    const questionsWithDefaults = await updateQuestionsWithDynamicDefaults();
    const answers = await askQuestions(questionsWithDefaults);

    await addApiKey(
      answers.apiKeyName as string,
      answers.apiKeyType as 'sandbox' | 'live',
      `sk_${Math.random().toString(36).substring(2, 15)}`, // Simulated API key
      answers.activateNow as boolean
    );
  } catch (error) {
    console.error('❌ Failed to create API key:', error);
  }
}
