import {afterEach,expect,it,vi} from 'vitest';
import {validateContact,contactRecipient} from './shared';
import {contactMessage,mailConfiguration,sendContact} from './mail';
import nodemailer from 'nodemailer';
vi.mock('nodemailer',()=>({default:{createTransport:vi.fn()}}));
const valid={name:'Test worker',email:'worker@example.com',category:'grievance',subject:'Visit review problem',details:'Please help investigate this visit review problem.',source:'HP02',consent:true,website:''};
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
it('validates request details and rejects header injection, missing consent and oversized messages',()=>{
  expect(validateContact(valid).category).toBe('grievance');
  for(const input of [{...valid,email:'bad\r\nBcc: other@example.com'},{...valid,subject:'Hello\nBcc:other@example.com'},{...valid,consent:false},{...valid,category:'__proto__'},{...valid,website:'spam'},{...valid,details:'x'.repeat(4001)}])expect(()=>validateContact(input)).toThrow();
});
it('keeps the recipient fixed and treats visitor text as plaintext only',()=>{
  const input=validateContact({...valid,details:'<script>untrusted text</script> remains plain text'});
  const message=contactMessage(input,'reference','sender@gmail.com');expect(message.to).toBe(contactRecipient);expect(message.replyTo.address).toBe(valid.email);expect(message).not.toHaveProperty('html');expect(message.disableFileAccess).toBe(true);expect(message.disableUrlAccess).toBe(true);
});
it('does not claim sending when Gmail settings are missing',async()=>{
  vi.stubEnv('JALRAKSHAK_GMAIL_USER','');vi.stubEnv('JALRAKSHAK_GMAIL_APP_PASSWORD','');expect(mailConfiguration()).toBeUndefined();await expect(sendContact(validateContact(valid),'r')).rejects.toThrow('MAIL_NOT_CONFIGURED');
});
it('requires SMTP recipient acceptance and closes the transport on success and failure',async()=>{
  vi.stubEnv('JALRAKSHAK_GMAIL_USER','sender@gmail.com');vi.stubEnv('JALRAKSHAK_GMAIL_APP_PASSWORD','abcdefghijklmnop');
  const close=vi.fn(),sendMail=vi.fn().mockResolvedValue({accepted:[contactRecipient]});
  vi.mocked(nodemailer.createTransport).mockReturnValue({sendMail,close} as unknown as ReturnType<typeof nodemailer.createTransport>);
  await sendContact(validateContact(valid),'r');expect(close).toHaveBeenCalledOnce();expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({host:'smtp.gmail.com',port:465,secure:true,debug:false}));
  sendMail.mockResolvedValue({accepted:[]});await expect(sendContact(validateContact(valid),'r2')).rejects.toThrow('MAIL_NOT_ACCEPTED');expect(close).toHaveBeenCalledTimes(2);
});
