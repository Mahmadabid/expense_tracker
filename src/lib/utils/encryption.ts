import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_KEY_LENGTH = 32; // 256 bits

// Get encryption key from environment or generate one for development
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    // For development only - generate a warning
    console.warn('⚠️  WARNING: No ENCRYPTION_KEY found in environment. Using temporary key. DO NOT use in production!');
    
    // Use a consistent temporary key for development
    // In production, this should come from environment variables
    const tempKey = 'dev_encryption_key_do_not_use_in_production_12345678';
    return crypto.createHash('sha256').update(tempKey).digest();
  }
  
  // If key is hex string, convert to buffer
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise hash it to get a 32-byte key
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all in hex)
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedData - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;
  
  // Check if data is already decrypted (backwards compatibility)
  if (!encryptedData.includes(':')) {
    return encryptedData;
  }
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return original data if decryption fails (might be unencrypted legacy data)
    return encryptedData;
  }
}

/**
 * Encrypt an object/JSON data (converts to JSON string, then encrypts)
 * This is the main function to use for bundling sensitive data
 */
export function encryptObject(obj: any): string {
  if (!obj) return '';
  try {
    const jsonString = JSON.stringify(obj);
    return encrypt(jsonString);
  } catch (error) {
    console.error('Object encryption error:', error);
    throw new Error('Failed to encrypt object');
  }
}

/**
 * Decrypt an encrypted JSON object (decrypts string, then parses JSON)
 * Returns the original object
 */
export function decryptObject<T = any>(encryptedData: string): T | null {
  if (!encryptedData) return null;
  try {
    const decrypted = decrypt(encryptedData);
    if (!decrypted) return null;
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error('Object decryption error:', error);
    return null;
  }
}

/**
 * Check if a string is encrypted
 */
export function isEncrypted(data: string): boolean {
  if (!data) return false;
  // Encrypted data has format: iv:authTag:encryptedData
  const parts = data.split(':');
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
}

/**
 * Generate a new encryption key (for setup purposes)
 * Run this once and save the output to your .env file
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(ENCRYPTION_KEY_LENGTH).toString('hex');
}
