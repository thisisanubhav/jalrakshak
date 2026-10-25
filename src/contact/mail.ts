import nodemailer from 'nodemailer';
import { contactRecipient, contactCategories, validEmail, type ContactInput } from './shared';
export function mailConfiguration() {
  const user=process.env.JALRAKSHAK_GMAIL_USER??'',pass=(process.env.JALRAKSHAK_GMAIL_APP_PASSWORD??'').replace(/\s/g,'');
  return validEmail(user)&&/^[a-zA-Z0-9]{16}$/.test(pass)?{user,pass}:undefined;
}
export function contactMessage(input:ContactInput,reference:string,from:string) {
  return {from:{name:'JalRakshak Contact',address:from},to:contactRecipient,replyTo:{name:input.name,address:input.email},
    subject:`[JalRakshak ${input.category}] ${input.subject}`,
    text:`Reference: ${reference}\nType: ${contactCategories[input.category]}\nName: ${input.name}\nReply email (provided by visitor, unverified): ${input.email}\nSource/visit reference: ${input.source||'Not provided'}\n\n${input.details}\n\nSubmitted with permission to send these details to the JalRakshak operator.`,
    disableFileAccess:true,disableUrlAccess:true};
}
export async function sendContact(input:ContactInput,reference:string) {
  const auth=mailConfiguration();if(!auth)throw new Error('MAIL_NOT_CONFIGURED');
  const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth,connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:20_000,logger:false,debug:false});
  try {
    const result=await transport.sendMail(contactMessage(input,reference,auth.user));
    if(!result.accepted.some(address=>typeof address==='string'&&address.toLowerCase()===contactRecipient))throw new Error('MAIL_NOT_ACCEPTED');
  } finally {transport.close();}
}
