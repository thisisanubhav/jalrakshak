import nodemailer from 'nodemailer';
import { mailConfiguration } from '@/contact/mail';
import { publicOrigin } from './origin';

export async function sendOnboardingMail(email: string, token: string, invitation: boolean) {
  const auth = mailConfiguration(), origin = publicOrigin();
  if (!auth || !origin) throw new Error('Onboarding email is unavailable.');
  const transport = nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth,connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:20_000,logger:false,debug:false});
  try {
    const result = await transport.sendMail({from:{name:'JalRakshak',address:auth.user},to:email,
      subject:invitation ? 'Your JalRakshak worker invitation' : 'Verify your email for JalRakshak',
      text:`${invitation ? 'You have been invited to join a field team.' : 'Verify your email to create your organisation.'}\n\n${origin.origin}/signup#token=${token}\n\nThis link expires in 30 minutes and works once. If you did not request this, ignore this email.`,disableFileAccess:true,disableUrlAccess:true});
    if (!result.accepted.some(value => typeof value === 'string' && value.toLowerCase() === email.toLowerCase())) throw new Error('Email was not accepted.');
  } finally { transport.close(); }
}
