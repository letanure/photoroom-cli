import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface Config {
  apiKey?: string;
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
  async getApiKey(): Promise<string | undefined> {
    // 1. Check environment variable first
    if (process.env.PHOTOROOM_API_KEY) {
      return process.env.PHOTOROOM_API_KEY;
    }

    // 2. Check config file
    const config = this.loadConfig();
    return config.apiKey;
  }

  async setApiKey(apiKey: string): Promise<void> {
    const config = this.loadConfig();
    config.apiKey = apiKey;
    this.saveConfig(config);
  }

  async deleteApiKey(): Promise<void> {
    const config = this.loadConfig();
    delete config.apiKey;
    this.saveConfig(config);
  }

  // General config management
  get(key: keyof Config): string | undefined {
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
}

// Singleton instance
export const configManager = new ConfigManager();
