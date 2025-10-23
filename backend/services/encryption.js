const crypto = require('crypto');

/**
 * HIPAA-Compliant Encryption Service
 * Uses AES-256-GCM for encrypting Protected Health Information (PHI)
 * 
 * HIPAA Requirements:
 * - AES-256 encryption for data at rest
 * - Authenticated encryption (GCM mode provides authentication)
 * - Secure key management
 * - Separate initialization vectors (IV) for each encryption
 */
class EncryptionService {
  constructor() {
    // AES-256-GCM (Galois/Counter Mode) provides both encryption and authentication
    this.algorithm = 'aes-256-gcm';
    
    // Get encryption key from environment variable
    // In production, this should be managed by a Key Management Service (AWS KMS, HashiCorp Vault)
    const keyHex = process.env.ENCRYPTION_KEY;
    
    if (!keyHex) {
      console.error('CRITICAL: ENCRYPTION_KEY not set in environment variables!');
      console.error('Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"');
      throw new Error('ENCRYPTION_KEY environment variable is required for HIPAA compliance');
    }
    
    if (keyHex.length !== 64) { // 32 bytes = 64 hex characters
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters) for AES-256');
    }
    
    this.key = Buffer.from(keyHex, 'hex');
    this.ivLength = 16; // 128 bits for GCM mode
  }

  /**
   * Encrypt PHI data
   * 
   * @param {string|null} plaintext - The plain text to encrypt
   * @returns {string|null} - Encrypted data in format: iv:authTag:ciphertext (all hex-encoded)
   * 
   * Returns null if input is null/empty to handle optional fields
   * 
   * Example output: "a1b2c3d4e5f6....:f1e2d3c4b5a6....:9876543210abcdef...."
   *                  ^IV (32 chars) ^Auth Tag (32)   ^Encrypted data
   */
  encrypt(plaintext) {
    if (!plaintext || plaintext === '') {
      return null;
    }
    
    try {
      // Generate a random IV for each encryption (NEVER reuse IVs!)
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag (GCM provides this for integrity verification)
      const authTag = cipher.getAuthTag();
      
      // Return in format: iv:authTag:encrypted
      // This ensures we can decrypt later and verify data hasn't been tampered with
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt PHI data - this is a HIPAA compliance failure');
    }
  }

  /**
   * Decrypt PHI data
   * 
   * @param {string|null} encryptedData - Encrypted data in format: iv:authTag:ciphertext
   * @returns {string|null} - Decrypted plain text
   * 
   * Returns null if input is null/empty
   * Throws error if data has been tampered with (auth tag verification fails)
   */
  decrypt(encryptedData) {
    if (!encryptedData || encryptedData === '') {
      return null;
    }
    
    try {
      // Split the encrypted data into its components
      const parts = encryptedData.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format - expected iv:authTag:ciphertext');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      // Set the authentication tag (GCM will verify data integrity)
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8'); // This will throw if auth tag doesn't match!
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      
      // If auth tag verification fails, data was tampered with - this is a security incident!
      if (error.message && error.message.includes('Unsupported state or unable to authenticate data')) {
        console.error('SECURITY ALERT: PHI data integrity check failed - possible tampering detected!');
        throw new Error('PHI data integrity verification failed - this is a potential HIPAA breach');
      }
      
      throw new Error('Failed to decrypt PHI data');
    }
  }

  /**
   * Create a one-way hash for searching/indexing PHI
   * Used for fields like email, SSN where we need to search but not decrypt
   * 
   * @param {string} data - Data to hash
   * @returns {string} - SHA-256 hash (hex-encoded)
   * 
   * Example: Used to create email_hash for searching users without decrypting email
   */
  hash(data) {
    if (!data) {
      return null;
    }
    
    return crypto.createHash('sha256').update(data.toLowerCase()).digest('hex');
  }

  /**
   * Generate a secure random token (for reset tokens, session IDs, etc.)
   * 
   * @param {number} length - Number of bytes (default: 32 bytes = 256 bits)
   * @returns {string} - Random token (hex-encoded)
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validate that an encryption key is properly formatted
   * 
   * @param {string} keyHex - Hex-encoded encryption key
   * @returns {boolean} - True if valid
   */
  static validateKey(keyHex) {
    if (!keyHex || typeof keyHex !== 'string') {
      return false;
    }
    
    // Must be exactly 64 hex characters (32 bytes for AES-256)
    if (keyHex.length !== 64) {
      return false;
    }
    
    // Must be valid hexadecimal
    if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      return false;
    }
    
    return true;
  }

  /**
   * Generate a new encryption key (for key rotation)
   * 
   * @returns {string} - New 256-bit key (hex-encoded)
   */
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Export singleton instance
module.exports = new EncryptionService();

// Also export class for testing/key generation
module.exports.EncryptionService = EncryptionService;
