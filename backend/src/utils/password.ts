import crypto from 'crypto';

// Readable temp password for admin-created accounts — the user is forced through TOTP
// setup on first login regardless, so this only needs to survive being read off a screen
// and typed once.
const WORDS = ['amber', 'cedar', 'delta', 'ember', 'flint', 'grove', 'harbor', 'ivory', 'lumen', 'maple'];

export function generateTempPassword(): string {
  const word = WORDS[crypto.randomInt(WORDS.length)];
  const digits = crypto.randomInt(1000, 9999);
  const suffix = crypto.randomBytes(2).toString('hex');
  return `${word[0].toUpperCase()}${word.slice(1)}-${digits}-${suffix}`;
}
