// Run in your own Terminal. Never paste an app password into chat or shell arguments.
import nodemailer from 'nodemailer';
import process from 'node:process';
import console from 'node:console';
import { createInterface } from 'node:readline/promises';
import { readFile, writeFile, rename, lstat } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
const recipient='sinhaanubhavharsh@gmail.com';
const target=fileURLToPath(new URL('../.env.local',import.meta.url));
function hiddenPassword() {
  return new Promise((resolve,reject)=>{
    if(!process.stdin.isTTY)return reject(new Error('Use an interactive Terminal.'));
    let value='';process.stdout.write('Gmail app password (hidden): ');process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
    function finish(error) {process.stdin.off('data',input);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');if(error)reject(error);else resolve(value.replace(/\s/g,''));}
    function input(chunk) {for(const c of chunk){if(c==='\u0003')return finish(new Error('Cancelled.'));if(c==='\r'||c==='\n')return finish();if(c==='\u007f'||c==='\b')value=value.slice(0,-1);else if(/[a-zA-Z0-9 ]/.test(c))value+=c;}}
    process.stdin.on('data',input);
  });
}
try {
  console.log('Configure JalRakshak contact email. Enable Google 2-Step Verification and create an app password first.');
  console.log('https://myaccount.google.com/apppasswords');
  console.log(`This verifies Gmail and sends one setup test to ${recipient}. The password is saved only in ignored .env.local (owner-only permissions).`);
  const prompt=createInterface({input:process.stdin,output:process.stdout});
  const user=(await prompt.question(`Sending Gmail address [${recipient}]: `)).trim()||recipient;prompt.close();
  if(!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(user)||user.length>254)throw new Error('Enter a valid Gmail or Google Workspace address.');
  const pass=await hiddenPassword();if(!/^[a-zA-Z0-9]{16}$/.test(pass))throw new Error('Use the 16-character Google app password, not your normal password.');
  const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user,pass},connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:20_000,logger:false,debug:false});
  try {await transport.verify();const sent=await transport.sendMail({from:user,to:recipient,subject:'JalRakshak contact form — setup test',text:'Gmail accepted this setup test. JalRakshak contact requests will be sent to this address. Restart the local JalRakshak server after configuration.'});if(!sent.accepted.includes(recipient))throw new Error('Setup test was not accepted.');}
  catch {throw new Error('Gmail verification or test sending failed. Check the address, 2-Step Verification and app password. No configuration was saved.');}
  finally {transport.close();}
  const info=await lstat(target).catch(()=>undefined);if(info?.isSymbolicLink())throw new Error('Refusing to replace a linked environment file.');
  let text=await readFile(target,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
  for(const [key,value] of Object.entries({JALRAKSHAK_GMAIL_USER:user,JALRAKSHAK_GMAIL_APP_PASSWORD:pass})) {
    text=text.split(/\r?\n/).filter(line=>!line.match(new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`))).join('\n').trimEnd()+`\n${key}=${value}\n`;
  }
  const temporary=target+`.${process.pid}.tmp`;await writeFile(temporary,text,{mode:0o600,flag:'wx'});await rename(temporary,target);
  console.log('Configured. Gmail accepted the test email. Check your inbox/spam folder, then restart JalRakshak.');
}catch(error){console.error(error instanceof Error?error.message:'Setup failed.');process.exitCode=1;}
