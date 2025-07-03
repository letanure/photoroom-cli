import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface ApiKeyData {
  name: string;
  type: 'sandbox' | 'live';
  key: string;
  active: boolean;
  createdAt: string;
}

export interface Config {
  apiKeys: Record<string, ApiKeyData>;
  activeKey?: string;
}

const CONFIG_DIR = join(homedir(), '.config', 'photoroom-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const ALGORITHM = 'aes-256-gcm';

// Create a deterministic key from machine info
function getEncryptionKey(): Buffer {
  const machineId = homedir() + process.platform + process.arch;
  return createHash('sha256').update(machineId).digest();
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0] as string, 'hex');
  const authTag = Buffer.from(parts[1] as string, 'hex');
  const encrypted = parts[2] as string;

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

async function ensureConfigDir(): Promise<void> {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { mode: 0o700, recursive: true });
  }
}

async function loadConfig(): Promise<Config> {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data) as Config;

    // Decrypt API keys
    for (const keyData of Object.values(config.apiKeys)) {
      keyData.key = decrypt(keyData.key);
    }

    return config;
  } catch {
    return { apiKeys: {} };
  }
}

async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();

  // Create a copy and encrypt API keys
  const configToSave: Config = {
    ...config,
    apiKeys: {}
  };

  for (const [id, keyData] of Object.entries(config.apiKeys)) {
    configToSave.apiKeys[id] = {
      ...keyData,
      key: encrypt(keyData.key)
    };
  }

  await fs.writeFile(CONFIG_FILE, JSON.stringify(configToSave, null, 2), { mode: 0o600 });
}

export async function addApiKey(
  name: string,
  type: 'sandbox' | 'live',
  key: string,
  activate: boolean
): Promise<string> {
  const config = await loadConfig();
  const id = `${type}-${Date.now()}`;

  config.apiKeys[id] = {
    name,
    type,
    key,
    active: activate,
    createdAt: new Date().toISOString()
  };

  if (activate) {
    // Deactivate ALL other keys (not just same type)
    for (const keyData of Object.values(config.apiKeys)) {
      keyData.active = false;
    }
    config.apiKeys[id].active = true;
    config.activeKey = id;
  }

  await saveConfig(config);
  return id;
}

export async function listApiKeys(): Promise<Record<string, Omit<ApiKeyData, 'key'>>> {
  const config = await loadConfig();
  const result: Record<string, Omit<ApiKeyData, 'key'>> = {};

  for (const [id, keyData] of Object.entries(config.apiKeys)) {
    result[id] = {
      name: keyData.name,
      type: keyData.type,
      active: keyData.active,
      createdAt: keyData.createdAt
    };
  }

  return result;
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const config = await loadConfig();

  if (!config.apiKeys[id]) {
    return false;
  }

  delete config.apiKeys[id];

  if (config.activeKey === id) {
    config.activeKey = undefined;
  }

  await saveConfig(config);
  return true;
}

export async function getActiveApiKey(): Promise<{ id: string; data: ApiKeyData } | null> {
  // Check for environment variable first
  const envKey = process.env.PHOTOROOM_API_KEY;
  if (envKey) {
    return {
      id: 'env',
      data: {
        name: 'Environment Variable',
        type: envKey.startsWith('sandbox_') ? 'sandbox' : 'live',
        key: envKey,
        active: true,
        createdAt: new Date().toISOString()
      }
    };
  }

  const config = await loadConfig();

  if (!config.activeKey || !config.apiKeys[config.activeKey]) {
    return null;
  }

  return {
    id: config.activeKey,
    data: config.apiKeys[config.activeKey] as ApiKeyData
  };
}

export async function setActiveApiKey(id: string): Promise<boolean> {
  const config = await loadConfig();

  if (!config.apiKeys[id]) {
    return false;
  }

  // Deactivate ALL keys
  for (const keyData of Object.values(config.apiKeys)) {
    keyData.active = false;
  }

  config.apiKeys[id].active = true;
  config.activeKey = id;

  await saveConfig(config);
  return true;
}

export async function deactivateApiKey(id: string): Promise<boolean> {
  const config = await loadConfig();

  if (!config.apiKeys[id]) {
    return false;
  }

  config.apiKeys[id].active = false;

  // If this was the active key, clear it
  if (config.activeKey === id) {
    config.activeKey = undefined;
  }

  await saveConfig(config);
  return true;
}
