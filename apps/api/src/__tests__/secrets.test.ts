import { describe, it, expect } from 'vitest';
import {
  createSecretStore,
  createInMemorySecretStore,
  generateMasterKey,
} from '../services/secrets.js';

describe('Secrets Manager', () => {
  describe('createSecretStore', () => {
    it('should store and retrieve secrets', () => {
      const store = createSecretStore();
      
      store.set('API_KEY', 'secret123');
      expect(store.get('API_KEY')).toBe('secret123');
    });

    it('should check if key exists', () => {
      const store = createSecretStore();
      
      store.set('EXISTS', 'value');
      expect(store.has('EXISTS')).toBe(true);
      expect(store.has('NOT_EXISTS')).toBe(false);
    });

    it('should delete secrets', () => {
      const store = createSecretStore();
      
      store.set('TO_DELETE', 'value');
      expect(store.delete('TO_DELETE')).toBe(true);
      expect(store.get('TO_DELETE')).toBeUndefined();
    });

    it('should clear all secrets', () => {
      const store = createSecretStore();
      
      store.set('KEY1', 'value1');
      store.set('KEY2', 'value2');
      store.clear();
      
      expect(store.keys()).toEqual([]);
    });

    it('should list all keys', () => {
      const store = createSecretStore();
      
      store.set('A', '1');
      store.set('B', '2');
      store.set('C', '3');
      
      expect(store.keys().sort()).toEqual(['A', 'B', 'C']);
    });

    it('should export and import encrypted secrets', () => {
      const store = createSecretStore();
      const masterKey = 'test-master-key-12345';
      
      store.set('SECRET_1', 'value1');
      store.set('SECRET_2', 'value2');
      
      const encrypted = store.exportEncrypted(masterKey);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toContain('value1');
      expect(encrypted).not.toContain('value2');
      
      const newStore = createSecretStore();
      newStore.importEncrypted(encrypted, masterKey);
      
      expect(newStore.get('SECRET_1')).toBe('value1');
      expect(newStore.get('SECRET_2')).toBe('value2');
    });

    it('should fail import with wrong master key', () => {
      const store = createSecretStore();
      const masterKey = 'correct-key';
      const wrongKey = 'wrong-key';
      
      store.set('SECRET', 'value');
      const encrypted = store.exportEncrypted(masterKey);
      
      const newStore = createSecretStore();
      expect(() => newStore.importEncrypted(encrypted, wrongKey)).toThrow();
    });

    it('should getAll return redacted values', () => {
      const store = createInMemorySecretStore();
      
      store.set('KEY1', 'value1');
      store.set('KEY2', 'value2');
      
      const all = store.getAll();
      expect(all.KEY1).toBe('***REDACTED***');
      expect(all.KEY2).toBe('***REDACTED***');
    });
  });

  describe('createInMemorySecretStore', () => {
    it('should work as basic store', () => {
      const store = createInMemorySecretStore();
      
      store.set('KEY', 'VALUE');
      expect(store.get('KEY')).toBe('VALUE');
    });

    it('should throw on export/import', () => {
      const store = createInMemorySecretStore();
      
      expect(() => store.exportEncrypted('key')).toThrow('Not supported');
      expect(() => store.importEncrypted('data', 'key')).toThrow('Not supported');
    });
  });

  describe('generateMasterKey', () => {
    it('should generate valid base64 key', () => {
      const key = generateMasterKey();
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(20);
      
      const decoded = Buffer.from(key, 'base64');
      expect(decoded.length).toBe(32);
    });

    it('should generate unique keys', () => {
      const key1 = generateMasterKey();
      const key2 = generateMasterKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('security features', () => {
    it('should encrypt with different IVs each time', () => {
      const store = createSecretStore();
      const masterKey = 'master-key';
      
      store.set('SAME_VALUE', 'sensitive-data');
      
      const export1 = store.exportEncrypted(masterKey);
      const export2 = store.exportEncrypted(masterKey);
      
      expect(export1).not.toBe(export2);
      
      const newStore1 = createSecretStore();
      const newStore2 = createSecretStore();
      
      newStore1.importEncrypted(export1, masterKey);
      newStore2.importEncrypted(export2, masterKey);
      
      expect(newStore1.get('SAME_VALUE')).toBe('sensitive-data');
      expect(newStore2.get('SAME_VALUE')).toBe('sensitive-data');
    });

    it('should handle special characters in values', () => {
      const store = createSecretStore();
      const masterKey = 'master-key';
      
      const specialValues = [
        '{"key": "value", "special": "🔥🎉"}',
        'Hello\nWorld\r\nTest',
        'Spaces   Multiple',
        'Unicode: äöüß 中文 日本語',
      ];
      
      specialValues.forEach((value, i) => {
        store.set(`KEY_${i}`, value);
        const encrypted = store.exportEncrypted(masterKey);
        
        const newStore = createSecretStore();
        newStore.importEncrypted(encrypted, masterKey);
        
        expect(newStore.get(`KEY_${i}`)).toBe(value);
      });
    });
  });
});
