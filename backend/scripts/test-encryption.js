/**
 * Test script for HIPAA encryption service
 * 
 * Run this to verify encryption is working correctly:
 * node backend/scripts/test-encryption.js
 */

const encryption = require('../services/encryption');


try {
  // Test 1: Basic encryption and decryption
  const original = 'John Doe';
  const encrypted = encryption.encrypt(original);
  const decrypted = encryption.decrypt(encrypted);
  
  
  if (original !== decrypted) {
    throw new Error('Encryption/decryption test failed!');
  }
  
  // Test 2: PHI encryption
  const phi = {
    firstName: 'Jane',
    lastName: 'Smith',
    ssn: '123-45-6789',
    dob: '1990-01-15'
  };
  
  const encryptedPhi = {
    firstName: encryption.encrypt(phi.firstName),
    lastName: encryption.encrypt(phi.lastName),
    ssn: encryption.encrypt(phi.ssn),
    dob: encryption.encrypt(phi.dob)
  };
  
  const decryptedPhi = {
    firstName: encryption.decrypt(encryptedPhi.firstName),
    lastName: encryption.decrypt(encryptedPhi.lastName),
    ssn: encryption.decrypt(encryptedPhi.ssn),
    dob: encryption.decrypt(encryptedPhi.dob)
  };
  
  
  // Test 3: Hash consistency
  const email = 'test@example.com';
  const hash1 = encryption.hash(email);
  const hash2 = encryption.hash(email);
  const hash3 = encryption.hash(email.toUpperCase()); // Should be same (case insensitive)
  
  
  // Test 4: Null/empty handling
  const nullEncrypted = encryption.encrypt(null);
  const emptyEncrypted = encryption.encrypt('');
  
  // Test 5: Unique IVs
  const text = 'Same text';
  const enc1 = encryption.encrypt(text);
  const enc2 = encryption.encrypt(text);
  
  // Test 6: Token generation
  const token1 = encryption.generateSecureToken();
  const token2 = encryption.generateSecureToken();
  
  
} catch (error) {
  
  if (error.message.includes('ENCRYPTION_KEY')) {
  }
  
  process.exit(1);
}
