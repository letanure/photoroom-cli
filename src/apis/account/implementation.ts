import { PhotoRoomApiClient } from '../../api-client.js';
import { configManager } from '../../config.js';

export async function handleAccount(options?: {
  dryRun?: boolean;
  apiKey?: string;
}): Promise<void> {
  if (options?.dryRun) {
    console.log('\nDRY RUN MODE - No actual API request will be made');
    console.log('\nAccount Details');
    console.log('===============');
    console.log('Available Credits: 100 (placeholder)');
    console.log('Subscription Credits: 100 (placeholder)');
    return;
  }

  const apiKey = options?.apiKey || (await configManager.getApiKeyForRequest());

  if (!apiKey) {
    console.log('No API key configured. Please set up an API key first.');
    return;
  }

  const client = new PhotoRoomApiClient({ apiKey });
  const response = await client.getAccountDetails();

  if (response.error) {
    console.log(`Error: ${response.error.detail}`);
    return;
  }

  if (response.data) {
    const { credits } = response.data;
    console.log('\nAccount Details');
    console.log('===============');
    console.log(`Available Credits: ${credits.available}`);
    console.log(`Subscription Credits: ${credits.subscription}`);
  }
}
