import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { sameOrigin } from '@/team/origin';
import { requestLimits } from '@/team/request-limits';
import { TeamError } from '@/team/server';
import { validateContact } from '@/contact/shared';
import { mailConfiguration, sendContact } from '@/contact/mail';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function GET(){return reply({available:!!mailConfiguration()});}
export async function POST(request:NextRequest) {
  if(!sameOrigin(request))return reply({error:'Request origin rejected.'},403);
  try {requestLimits.check('contact',5);}catch(error){return reply({error:'Too many requests. Try again in one minute.'},error instanceof TeamError?error.status:429);}
  if(!mailConfiguration())return reply({error:'Automatic email is not configured. Use the email link below.'},503);
  let input;
  try {
    const reader=request.body?.getReader();if(!reader)return reply({error:'Complete the contact form.'},400);
    const chunks:Uint8Array[]=[];let bytes=0;
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>24_000){await reader.cancel();return reply({error:'Message is too large.'},413);}chunks.push(value);}
    input=validateContact(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  }catch {return reply({error:'Check the required fields, reply email, message length and consent.'},400);}
  const reference=randomUUID();
  try {await sendContact(input,reference);return reply({accepted:true,reference});}
  catch {return reply({error:'Email could not be confirmed. Your text is still here. Check before retrying, or use your email app.'},502);}
}
