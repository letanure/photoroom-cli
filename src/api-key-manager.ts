import { handleApiKeyManagement } from './commands/api-keys.js';
import { configManager } from './config.js';

export async function getApiKey(options?: { apiKey?: string }): Promise<string> {
  // 1. Check command line flag first
  if (options?.apiKey) {
    return options.apiKey;
  }

  // 2. Check environment variable
  if (process.env.PHOTOROOM_API_KEY) {
    return process.env.PHOTOROOM_API_KEY;
  }

  // 3. Check config file (both named and legacy keys)
  const configApiKey = await configManager.getApiKeyForRequest();
  if (configApiKey) {
    return configApiKey;
  }

  // 4. First run experience - redirect to API key management
  return await handleFirstRun();
}

async function handleFirstRun(): Promise<string> {
  try {
    console.log('\nWelcome to PhotoRoom CLI!');
    console.log("\nNo API key found. Let's set one up using the API key management interface.\n");

    console.log('You can choose between:');
    console.log('  • Sandbox keys (free for testing)');
    console.log('  • Live keys (for production use)');
    console.log('');

    // Launch the API key management interface
    await handleApiKeyManagement();

    // After management, try to get an API key again
    const configApiKey = await configManager.getApiKeyForRequest();
    if (configApiKey) {
      console.log('\nAPI key setup complete! You can now use PhotoRoom CLI.\n');
      return configApiKey;
    }
    // User didn't set up a key, exit gracefully
    console.log('\nNo API key was configured. PhotoRoom CLI requires an API key to function.');
    console.log("Run the command again when you're ready to set up your API key.");
    process.exit(1);
  } catch (_error) {
    // User cancelled with Ctrl+C
    console.log('\nGoodbye!');
    process.exit(0);
  }
}
