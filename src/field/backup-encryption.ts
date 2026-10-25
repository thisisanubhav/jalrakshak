// Versioned, portable encryption for browser downloads. Passwords are never persisted.
export const ENCRYPTED_BACKUP_FORMAT = 'jalrakshak-encrypted-backup';
const iterations = 600_000;
const maxBytes = 50 * 1024 * 1024;
function encode(bytes: Uint8Array) {
  let value = '';
  for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
function decode(value: unknown, limit: number) {
  if (typeof value !== 'string' || value.length > Math.ceil(limit / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Invalid encrypted backup.');
  const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
  if (bytes.length > limit) throw new Error('Invalid encrypted backup.');
  return bytes;
}
async function key(password: string, salt: Uint8Array<ArrayBuffer>) {
  if (password.length < 12 || password.length > 256) throw new Error('Use a backup password of 12–256 characters.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptBackup(plaintext: string, password: string) {
  const bytes = new TextEncoder().encode(plaintext);
  if (bytes.length > maxBytes) throw new Error('Backup exceeds 50 MB.');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(ENCRYPTED_BACKUP_FORMAT)},await key(password,salt),bytes);
  return JSON.stringify({format:ENCRYPTED_BACKUP_FORMAT,version:1,kdf:'PBKDF2-SHA256',iterations,cipher:'AES-256-GCM',salt:encode(salt),iv:encode(iv),ciphertext:encode(new Uint8Array(encrypted))});
}
export async function decryptBackup(value: unknown, password: string) {
  if (!value || typeof value !== 'object') throw new Error('Invalid encrypted backup.');
  const data = value as Record<string,unknown>;
  if (data.format !== ENCRYPTED_BACKUP_FORMAT || data.version !== 1 || data.kdf !== 'PBKDF2-SHA256' || data.iterations !== iterations || data.cipher !== 'AES-256-GCM') throw new Error('Unsupported encrypted backup.');
  const salt=decode(data.salt,16),iv=decode(data.iv,12),ciphertext=decode(data.ciphertext,maxBytes+16);
  if(salt.length!==16||iv.length!==12||ciphertext.length<16)throw new Error('Invalid encrypted backup.');
  try {
    const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(ENCRYPTED_BACKUP_FORMAT)},await key(password,salt),ciphertext);
    return new TextDecoder('utf-8',{fatal:true}).decode(plain);
  } catch { throw new Error('Incorrect backup password or damaged backup.'); }
}
