import nodemailer from 'nodemailer';
import { mailConfiguration } from '@/contact/mail';
import { publicOrigin } from './origin';

export async function sendOnboardingMail(email: string, token: string, invitation: boolean, recovery = false, recoveryEmail = false) {
  const auth = mailConfiguration(), origin = publicOrigin();
  if (!auth || !origin) throw new Error('Onboarding email is unavailable.');
  const transport = nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth,connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:20_000,logger:false,debug:false});
  try {
    const result = await transport.sendMail({from:{name:'JalRakshak',address:auth.user},to:email,
      subject:recoveryEmail ? 'Verify your JalRakshak recovery email' : recovery ? 'Reset your JalRakshak password' : invitation ? 'Your JalRakshak worker invitation' : 'Verify your email for JalRakshak',
      text:`${recoveryEmail ? 'Verify this recovery email for your existing JalRakshak account. Sign in to the same account to confirm. Your username stays unchanged.' : recovery ? 'Reset the password for your JalRakshak account.' : invitation ? 'You have been invited to join a field team.' : 'Verify your email to create your organisation.'}\n\n${origin.origin}/${recoveryEmail ? 'account' : recovery ? 'recover' : 'signup'}#token=${token}\n\nThis link expires in 30 minutes and works once. If you did not request this, ignore this email.`,disableFileAccess:true,disableUrlAccess:true});
    if (!result.accepted.some(value => typeof value === 'string' && value.toLowerCase() === email.toLowerCase())) throw new Error('Email was not accepted.');
  } finally { transport.close(); }
}
