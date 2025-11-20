const crypto = require('crypto');

function generateSecurePassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  const requiredChars = [
    lowercase[crypto.randomInt(0, lowercase.length)],
    uppercase[crypto.randomInt(0, uppercase.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    symbols[crypto.randomInt(0, symbols.length)]
  ];
  
  const password = requiredChars.concat(
    Array.from({ length: length - 4 }, () => 
      allChars[crypto.randomInt(0, allChars.length)]
    )
  );
  
  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  return password.join('');
}

function generateNumericPin(length = 6) {
  const numbers = '0123456789';
  return Array.from({ length }, () => 
    numbers[crypto.randomInt(0, numbers.length)]
  ).join('');
}

function getPasswordExpiryDate(hoursValid = 72) {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + hoursValid);
  return expiryDate;
}

module.exports = {
  generateSecurePassword,
  generateNumericPin,
  getPasswordExpiryDate
};
