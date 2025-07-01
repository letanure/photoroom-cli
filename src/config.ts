import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface NamedApiKey {
  name: string;
  key: string;
  type: 'live' | 'sandbox';
}

interface Config {
  apiKey?: string; // Legacy single API key (kept for backwards compatibility)
  apiKeys?: {
    live?: string;
    sandbox?: string;
  };
  namedApiKeys?: NamedApiKey[]; // New named API keys structure
  activeApiKey?: string; // Name of the active API key
  activeEnvironment?: 'live' | 'sandbox'; // Legacy, keep for backwards compatibility
  defaultFormat?: 'png' | 'jpg' | 'webp';
  defaultSize?: 'preview' | 'medium' | 'hd' | 'full';
  defaultOutputPath?: string;
}

export class ConfigManager {
  private configPath: string;
  private configFile: string;

  constructor() {
    this.configPath = this.getConfigPath();
    this.configFile = join(this.configPath, 'config.json');
  }

  private getConfigPath(): string {
    const home = homedir();

    if (process.platform === 'win32') {
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'photoroom-cli');
    }

    // macOS and Linux follow XDG spec
    return join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'photoroom-cli');
  }

  private ensureConfigDir(): void {
    if (!existsSync(this.configPath)) {
      mkdirSync(this.configPath, { recursive: true });
    }
  }

  private loadConfig(): Config {
    if (!existsSync(this.configFile)) {
      return {};
    }

    try {
      const content = readFileSync(this.configFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading config file:', error);
      return {};
    }
  }

  private saveConfig(config: Config): void {
    this.ensureConfigDir();

    try {
      writeFileSync(this.configFile, JSON.stringify(config, null, 2));
      // Set restrictive permissions (owner read/write only)
      if (process.platform !== 'win32') {
        chmodSync(this.configFile, 0o600);
      }
    } catch (error) {
      console.error('Error saving config file:', error);
      throw error;
    }
  }

  // API Key Management
  async getApiKey(environment?: 'live' | 'sandbox'): Promise<string | undefined> {
    // 1. Check environment variable first
    if (process.env.PHOTOROOM_API_KEY) {
      return process.env.PHOTOROOM_API_KEY;
    }

    const config = this.loadConfig();

    // 2. If specific environment requested, return that
    if (environment && config.apiKeys?.[environment]) {
      return config.apiKeys[environment];
    }

    // 3. Use active environment if set
    if (config.activeEnvironment && config.apiKeys?.[config.activeEnvironment]) {
      return config.apiKeys[config.activeEnvironment];
    }

    // 4. Fallback to legacy single API key
    if (config.apiKey) {
      return config.apiKey;
    }

    // 5. Try live first, then sandbox
    if (config.apiKeys?.live) {
      return config.apiKeys.live;
    }

    return config.apiKeys?.sandbox;
  }

  async setApiKey(apiKey: string, environment: 'live' | 'sandbox' = 'live'): Promise<void> {
    const config = this.loadConfig();

    // Initialize apiKeys object if it doesn't exist
    if (!config.apiKeys) {
      config.apiKeys = {};
    }

    config.apiKeys[environment] = apiKey;

    // Set as active environment if none is set
    if (!config.activeEnvironment) {
      config.activeEnvironment = environment;
    }

    this.saveConfig(config);
  }

  async deleteApiKey(environment?: 'live' | 'sandbox'): Promise<void> {
    const config = this.loadConfig();

    if (environment && config.apiKeys) {
      delete config.apiKeys[environment];

      // If we deleted the active environment, switch to the other one or clear
      if (config.activeEnvironment === environment) {
        const otherEnv = environment === 'live' ? 'sandbox' : 'live';
        if (config.apiKeys[otherEnv]) {
          config.activeEnvironment = otherEnv;
        } else {
          delete config.activeEnvironment;
        }
      }
    } else {
      // Delete legacy single API key
      delete config.apiKey;
      delete config.apiKeys;
      delete config.activeEnvironment;
    }

    this.saveConfig(config);
  }

  getActiveEnvironment(): 'live' | 'sandbox' | undefined {
    const config = this.loadConfig();
    return config.activeEnvironment;
  }

  setActiveEnvironment(environment: 'live' | 'sandbox'): void {
    const config = this.loadConfig();
    config.activeEnvironment = environment;
    this.saveConfig(config);
  }

  getApiKeys(): { live?: string; sandbox?: string } {
    const config = this.loadConfig();
    return config.apiKeys || {};
  }

  // General config management
  get(key: keyof Config): Config[keyof Config] {
    const config = this.loadConfig();
    return config[key];
  }

  set(key: keyof Config, value: string): void {
    const config = this.loadConfig();
    if (key === 'apiKey') {
      config.apiKey = value;
    } else if (key === 'defaultFormat') {
      config.defaultFormat = value as 'png' | 'jpg' | 'webp';
    } else if (key === 'defaultSize') {
      config.defaultSize = value as 'preview' | 'medium' | 'hd' | 'full';
    } else if (key === 'defaultOutputPath') {
      config.defaultOutputPath = value;
    }
    this.saveConfig(config);
  }

  getAll(): Config {
    return this.loadConfig();
  }

  reset(): void {
    if (existsSync(this.configFile)) {
      unlinkSync(this.configFile);
    }
  }

  getConfigFilePath(): string {
    return this.configFile;
  }

  // Check if this is first run (no config exists)
  isFirstRun(): boolean {
    return !existsSync(this.configFile);
  }

  // Named API Keys management
  getNamedApiKeys(): NamedApiKey[] {
    const config = this.loadConfig();
    return config.namedApiKeys || [];
  }

  addNamedApiKey(name: string, key: string, type: 'live' | 'sandbox'): void {
    const config = this.loadConfig();
    if (!config.namedApiKeys) {
      config.namedApiKeys = [];
    }

    // Remove existing key with same name if it exists
    config.namedApiKeys = config.namedApiKeys.filter((k) => k.name !== name);

    // Add the new key
    config.namedApiKeys.push({ name, key, type });

    this.saveConfig(config);
  }

  removeNamedApiKey(name: string): void {
    const config = this.loadConfig();
    if (config.namedApiKeys) {
      config.namedApiKeys = config.namedApiKeys.filter((k) => k.name !== name);

      // If this was the active key, clear the active key
      if (config.activeApiKey === name) {
        delete config.activeApiKey;
      }

      this.saveConfig(config);
    }
  }

  getActiveApiKeyName(): string | undefined {
    const config = this.loadConfig();
    return config.activeApiKey;
  }

  setActiveApiKey(name: string): void {
    const config = this.loadConfig();
    const namedKeys = config.namedApiKeys || [];

    // Verify the key exists
    if (namedKeys.find((k) => k.name === name)) {
      config.activeApiKey = name;
      this.saveConfig(config);
    }
  }

  getActiveApiKeyDetails(): NamedApiKey | undefined {
    const config = this.loadConfig();
    const namedKeys = config.namedApiKeys || [];

    if (config.activeApiKey) {
      return namedKeys.find((k) => k.name === config.activeApiKey);
    }

    return undefined;
  }

  suggestApiKeyName(type: 'live' | 'sandbox'): string {
    const namedKeys = this.getNamedApiKeys();
    const existingNames = namedKeys.map((k) => k.name.toLowerCase());

    let counter = 1;
    let suggested: string;

    do {
      suggested = `${type}-${counter}`;
      counter++;
    } while (existingNames.includes(suggested.toLowerCase()));

    return suggested;
  }

  // Enhanced getApiKey that works with named keys
  async getApiKeyForRequest(): Promise<string | undefined> {
    // 1. Check environment variable first
    if (process.env.PHOTOROOM_API_KEY) {
      return process.env.PHOTOROOM_API_KEY;
    }

    // 2. Check active named API key
    const activeKey = this.getActiveApiKeyDetails();
    if (activeKey) {
      return activeKey.key;
    }

    // 3. Fallback to legacy system
    const config = this.loadConfig();

    // Use active environment if set
    if (config.activeEnvironment && config.apiKeys?.[config.activeEnvironment]) {
      return config.apiKeys[config.activeEnvironment];
    }

    // Fallback to legacy single API key
    if (config.apiKey) {
      return config.apiKey;
    }

    // Try live first, then sandbox
    if (config.apiKeys?.live) {
      return config.apiKeys.live;
    }

    return config.apiKeys?.sandbox;
  }
}

// Singleton instance
export const configManager = new ConfigManager();
