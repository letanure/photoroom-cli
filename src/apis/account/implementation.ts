import { askAccountQuestions } from './questions.js';
import type { AccountConfig } from './types.js';

export async function handleAccount(): Promise<void> {
  const config: AccountConfig = await askAccountQuestions();

  console.log('\n👤 Account Details:');

  if (config.showDetails) {
    console.log('📋 Account Information:');
    console.log('  • Email: user@example.com (placeholder)');
    console.log('  • Plan: Basic Plan');
    console.log('  • Status: Active');
    console.log('  • Member since: January 2024');
  }

  if (config.includeUsage) {
    console.log('\n📊 Usage Statistics:');
    console.log('  • API calls this month: 150/1000');
    console.log('  • Images processed: 45');
    console.log('  • Credits remaining: 850');
  }

  console.log('\n⚠️  Account API is not implemented yet - showing placeholder data');
}
