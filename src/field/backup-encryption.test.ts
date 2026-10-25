import { expect, it } from 'vitest';
import { encryptBackup, decryptBackup } from './backup-encryption';
const password='private-backup-password';
it('round trips Unicode field data with fresh encryption each time',async()=>{
  const plain=JSON.stringify({notes:'पानी का स्रोत',photos:['private evidence']});
  const first=await encryptBackup(plain,password),second=await encryptBackup(plain,password);
  expect(first).not.toBe(second);expect(first).not.toContain('private evidence');
  expect(await decryptBackup(JSON.parse(first),password)).toBe(plain);
});
it('rejects a wrong password and tampered ciphertext without returning plaintext',async()=>{
  const data=JSON.parse(await encryptBackup('private evidence',password));
  await expect(decryptBackup(data,'different-long-password')).rejects.toThrow('Incorrect');
  const bytes=Uint8Array.from(atob(data.ciphertext),(c:string)=>c.charCodeAt(0));bytes[0]^=1;
  data.ciphertext=btoa(String.fromCharCode(...bytes));
  await expect(decryptBackup(data,password)).rejects.toThrow('Incorrect');
});
it('rejects weak passwords and untrusted encryption parameters before deriving a key',async()=>{
  await expect(encryptBackup('private','short')).rejects.toThrow('12–256');
  const data=JSON.parse(await encryptBackup('private',password));
  await expect(decryptBackup({...data,iterations:999999999},password)).rejects.toThrow('Unsupported');
  await expect(decryptBackup({...data,iv:'AA=='},password)).rejects.toThrow('Invalid');
});
