import enquirer from 'enquirer';
import { configManager } from './config.js';

const { prompt } = enquirer;

export async function getApiKey(options?: { apiKey?: string }): Promise<string> {
  // 1. Check command line flag first
  if (options?.apiKey) {
    return options.apiKey;
  }

  // 2. Check environment variable
  if (process.env.PHOTOROOM_API_KEY) {
    return process.env.PHOTOROOM_API_KEY;
  }

  // 3. Check config file
  const configApiKey = await configManager.getApiKey();
  if (configApiKey) {
    return configApiKey;
  }

  // 4. First run experience - prompt and save
  return await promptAndSaveApiKey();
}

async function promptAndSaveApiKey(): Promise<string> {
  try {
    console.log('\n🔑 Welcome to PhotoRoom CLI!');
    console.log("No API key found. Let's set one up:\n");

    const { apiKey } = (await prompt({
      type: 'password',
      name: 'apiKey',
      message: 'Enter your PhotoRoom API key:',
      validate: (value: string) => value.length > 0 || 'API key is required'
    })) as { apiKey: string };

    const { save } = (await prompt({
      type: 'confirm',
      name: 'save',
      message: 'Save this key for future use?',
      initial: true
    })) as { save: boolean };

    if (save) {
      await configManager.setApiKey(apiKey);
      console.log('\n✅ API key saved successfully!');
      console.log(`📍 Config location: ${configManager.getConfigFilePath()}`);
      console.log(
        '💡 You can change it anytime with: photoroom-cli config set api-key <new-key>\n'
      );
    }

    return apiKey;
  } catch (_error) {
    // User cancelled with Ctrl+C
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}
