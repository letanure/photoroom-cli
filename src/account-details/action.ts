import {
  type AccountErrorResponse,
  type AccountResponse,
  getAccountDetails
} from '../shared/api-client.js';

export async function showAccountDetails(): Promise<void> {
  try {
    const result = await getAccountDetails();

    if ('credits' in result) {
      const accountData = result as AccountResponse;
      console.log('\n📊 Account Details');
      console.table({
        'Available Credits': accountData.credits.available,
        'Subscription Credits': accountData.credits.subscription
      });
    } else {
      const errorData = result as AccountErrorResponse;
      console.log('\n❌ Error fetching account details');
      console.log(`   Error: ${errorData.error.message}`);
    }
  } catch (error) {
    console.log('\n❌ Error fetching account details');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    if (error instanceof Error && error.message.includes('No active API key')) {
      console.log('\n💡 Please add and activate an API key first using "Manage API Keys"');
    }
  }
}
