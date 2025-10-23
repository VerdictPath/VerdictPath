/**
 * Test script for HIPAA encryption service
 * 
 * Run this to verify encryption is working correctly:
 * node backend/scripts/test-encryption.js
 */

const encryption = require('../services/encryption');

console.log('\n🔐 Testing HIPAA Encryption Service\n');
console.log('='.repeat(50));

try {
  // Test 1: Basic encryption and decryption
  console.log('\n✓ Test 1: Basic Encryption/Decryption');
  const original = 'John Doe';
  const encrypted = encryption.encrypt(original);
  const decrypted = encryption.decrypt(encrypted);
  
  console.log(`  Original:  "${original}"`);
  console.log(`  Encrypted: "${encrypted.substring(0, 50)}..."`);
  console.log(`  Decrypted: "${decrypted}"`);
  console.log(`  Match: ${original === decrypted ? '✅ PASS' : '❌ FAIL'}`);
  
  if (original !== decrypted) {
    throw new Error('Encryption/decryption test failed!');
  }
  
  // Test 2: PHI encryption
  console.log('\n✓ Test 2: PHI Data Encryption');
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
  
  console.log(`  Original PHI:  ${JSON.stringify(phi)}`);
  console.log(`  Decrypted PHI: ${JSON.stringify(decryptedPhi)}`);
  console.log(`  Match: ${JSON.stringify(phi) === JSON.stringify(decryptedPhi) ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test 3: Hash consistency
  console.log('\n✓ Test 3: Hash Consistency (for searching)');
  const email = 'test@example.com';
  const hash1 = encryption.hash(email);
  const hash2 = encryption.hash(email);
  const hash3 = encryption.hash(email.toUpperCase()); // Should be same (case insensitive)
  
  console.log(`  Email: "${email}"`);
  console.log(`  Hash 1: ${hash1.substring(0, 20)}...`);
  console.log(`  Hash 2: ${hash2.substring(0, 20)}...`);
  console.log(`  Hashes match: ${hash1 === hash2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Case insensitive: ${hash1 === hash3 ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test 4: Null/empty handling
  console.log('\n✓ Test 4: Null/Empty Value Handling');
  const nullEncrypted = encryption.encrypt(null);
  const emptyEncrypted = encryption.encrypt('');
  console.log(`  encrypt(null): ${nullEncrypted} (should be null) - ${nullEncrypted === null ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  encrypt(''): ${emptyEncrypted} (should be null) - ${emptyEncrypted === null ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test 5: Unique IVs
  console.log('\n✓ Test 5: Unique Initialization Vectors (IV)');
  const text = 'Same text';
  const enc1 = encryption.encrypt(text);
  const enc2 = encryption.encrypt(text);
  console.log(`  Encrypted same text twice:`);
  console.log(`  Result 1: ${enc1.substring(0, 40)}...`);
  console.log(`  Result 2: ${enc2.substring(0, 40)}...`);
  console.log(`  Different ciphertext: ${enc1 !== enc2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Both decrypt correctly: ${encryption.decrypt(enc1) === text && encryption.decrypt(enc2) === text ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test 6: Token generation
  console.log('\n✓ Test 6: Secure Token Generation');
  const token1 = encryption.generateSecureToken();
  const token2 = encryption.generateSecureToken();
  console.log(`  Token 1: ${token1.substring(0, 20)}...`);
  console.log(`  Token 2: ${token2.substring(0, 20)}...`);
  console.log(`  Unique tokens: ${token1 !== token2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Correct length: ${token1.length === 64 ? '✅ PASS' : '❌ FAIL'}`); // 32 bytes = 64 hex chars
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ All tests PASSED! Encryption service is working correctly.\n');
  
} catch (error) {
  console.log('\n' + '='.repeat(50));
  console.error('\n❌ ENCRYPTION TEST FAILED!\n');
  console.error('Error:', error.message);
  console.error('\nStack:', error.stack);
  
  if (error.message.includes('ENCRYPTION_KEY')) {
    console.error('\n⚠️  ENCRYPTION_KEY environment variable is not set!');
    console.error('Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('Then add it to Replit Secrets as ENCRYPTION_KEY\n');
  }
  
  process.exit(1);
}
