import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

interface EncryptedValue {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
  version: number;
}

export interface SecretStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  keys(): string[];
  getAll(): Record<string, string>;
  exportEncrypted(masterKey: string): string;
  importEncrypted(encrypted: string, masterKey: string): void;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

export function createSecretStore(): SecretStore {
  const store = new Map<string, string>();

  function encrypt(plaintext: string, key: Buffer): EncryptedValue {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      salt: '',
      version: 1,
    };
  }

  function decrypt(encrypted: EncryptedValue, key: Buffer): string {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  }

  const secretStore: SecretStore = {
    get(key: string): string | undefined {
      return store.get(key);
    },

    set(key: string, value: string): void {
      store.set(key, value);
    },

    has(key: string): boolean {
      return store.has(key);
    },

    delete(key: string): boolean {
      return store.delete(key);
    },

    clear(): void {
      store.clear();
    },

    keys(): string[] {
      return Array.from(store.keys());
    },

    getAll(): Record<string, string> {
      return Object.fromEntries(store);
    },

    exportEncrypted(masterKey: string): string {
      const salt = randomBytes(SALT_LENGTH);
      const key = deriveKey(masterKey, salt);
      
      const data: Record<string, EncryptedValue> = {};
      
      for (const [k, v] of store.entries()) {
        const encrypted = encrypt(v, key);
        encrypted.salt = salt.toString('hex');
        data[k] = encrypted;
      }
      
      return JSON.stringify(data);
    },

    importEncrypted(encrypted: string, masterKey: string): void {
      try {
        const data = JSON.parse(encrypted) as Record<string, EncryptedValue>;
        
        for (const [key, value] of Object.entries(data)) {
          const salt = Buffer.from(value.salt, 'hex');
          const derivedKey = deriveKey(masterKey, salt);
          const decrypted = decrypt(value, derivedKey);
          store.set(key, decrypted);
        }
      } catch (error) {
        throw new Error('Failed to decrypt secrets: invalid master key or corrupted data');
      }
    },
  };

  return secretStore;
}

export function createInMemorySecretStore(): SecretStore {
  const store = new Map<string, string>();
  
  return {
    get(key: string): string | undefined {
      return store.get(key);
    },
    set(key: string, value: string): void {
      store.set(key, value);
    },
    has(key: string): boolean {
      return store.has(key);
    },
    delete(key: string): boolean {
      return store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    keys(): string[] {
      return Array.from(store.keys());
    },
    getAll(): Record<string, string> {
      const result: Record<string, string> = {};
      for (const [k] of store) {
        result[k] = '***REDACTED***';
      }
      return result;
    },
    exportEncrypted(_masterKey: string): string {
      throw new Error('Not supported in memory store');
    },
    importEncrypted(_encrypted: string, _masterKey: string): void {
      throw new Error('Not supported in memory store');
    },
  };
}

export function createFileSecretStore(filePath: string, masterKey: string): SecretStore {
  const fs = require('fs') as typeof import('fs');
  
  let store: SecretStore;
  
  if (fs.existsSync(filePath)) {
    const encrypted = fs.readFileSync(filePath, 'utf8');
    store = createSecretStore();
    store.importEncrypted(encrypted, masterKey);
  } else {
    store = createSecretStore();
  }
  
  const originalSet = store.set.bind(store);
  store.set = (key: string, value: string) => {
    originalSet(key, value);
    saveToFile(store, filePath, masterKey);
  };
  
  const originalDelete = store.delete.bind(store);
  store.delete = (key: string) => {
    const result = originalDelete(key);
    saveToFile(store, filePath, masterKey);
    return result;
  };
  
  const originalClear = store.clear.bind(store);
  store.clear = () => {
    originalClear();
    saveToFile(store, filePath, masterKey);
  };
  
  return store;
}

function saveToFile(store: SecretStore, filePath: string, masterKey: string): void {
  try {
    const fs = require('fs') as typeof import('fs');
    const encrypted = store.exportEncrypted(masterKey);
    fs.writeFileSync(filePath, encrypted, { mode: 0o600 });
  } catch (error) {
    console.error('Failed to save secrets to file:', error);
  }
}

export function generateMasterKey(): string {
  return randomBytes(32).toString('base64');
}
