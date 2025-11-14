// Password Generator utility

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'il1Lo0O';

export function generatePassword(options = {}) {
  const {
    length = 16,
    includeLowercase = true,
    includeUppercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeAmbiguous = false,
  } = options;

  let charset = '';
  if (includeLowercase) charset += LOWERCASE;
  if (includeUppercase) charset += UPPERCASE;
  if (includeNumbers) charset += NUMBERS;
  if (includeSymbols) charset += SYMBOLS;

  if (excludeAmbiguous) {
    charset = charset.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
  }

  if (charset.length === 0) {
    charset = LOWERCASE + UPPERCASE + NUMBERS;
  }

  let password = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}

export function generatePassphrase(wordCount = 4) {
  const words = [
    'correct', 'horse', 'battery', 'staple', 'monkey', 'puzzle', 'wallet', 'planet',
    'forest', 'ocean', 'mountain', 'river', 'castle', 'dragon', 'wizard', 'knight',
    'phoenix', 'thunder', 'crystal', 'shadow', 'light', 'storm', 'galaxy', 'comet',
    'nebula', 'quantum', 'cosmic', 'stellar', 'lunar', 'solar', 'meteor', 'aurora',
    'zenith', 'horizon', 'compass', 'anchor', 'bridge', 'harbor', 'lighthouse', 'voyage'
  ];

  const selected = [];
  const array = new Uint32Array(wordCount);
  crypto.getRandomValues(array);

  for (let i = 0; i < wordCount; i++) {
    selected.push(words[array[i] % words.length]);
  }

  return selected.join('-');
}

export function calculatePasswordStrength(password) {
  if (!password) return 0;

  let strength = 0;
  const length = password.length;

  // Length contribution
  if (length >= 8) strength += 1;
  if (length >= 12) strength += 1;
  if (length >= 16) strength += 1;

  // Character variety
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

  // Penalty for common patterns
  if (/^(123|abc|qwerty|password)/i.test(password)) strength -= 2;
  if (/([a-z])\1{2,}/i.test(password)) strength -= 1;

  return Math.max(0, Math.min(5, strength));
}