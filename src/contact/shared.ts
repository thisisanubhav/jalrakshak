export const contactRecipient='sinhaanubhavharsh@gmail.com';
export const contactCategories={issue:'Technical issue / तकनीकी समस्या',grievance:'Grievance / शिकायत',privacy:'Privacy request / गोपनीयता अनुरोध',feedback:'Feedback / सुझाव'} as const;
export type ContactInput={name:string;email:string;category:keyof typeof contactCategories;subject:string;details:string;source:string;consent:true};
export function validEmail(value:string) {return value.length<=254&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(value);}
export function validateContact(value:unknown):ContactInput {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Complete the contact form.');
  const input=value as Record<string,unknown>;
  function text(key:string,min:number,max:number,multiline=false) {
    const raw=input[key];if(typeof raw!=='string')throw new Error('Complete all required fields.');const v=raw.trim();
    const control=[...v].some(c=>{const code=c.charCodeAt(0);return code===127||(code<32&&!(multiline&&[9,10,13].includes(code)));});
    if(v.length<min||v.length>max||control)throw new Error('Check field lengths and remove unsupported characters.');return v;
  }
  const name=text('name',2,100),email=text('email',3,254),subject=text('subject',5,160),details=text('details',20,4000,true),source=text('source',0,100);
  if(!validEmail(email))throw new Error('Enter a valid reply email address.');
  if(typeof input.category!=='string'||!Object.hasOwn(contactCategories,input.category)||input.consent!==true||input.website)throw new Error('Choose a request type and confirm sending your details.');
  return {name,email,category:input.category as ContactInput['category'],subject,details,source,consent:true};
}
