'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Locale } from '@/field/model';
const LanguageContext=createContext<{locale:Locale;setLocale:(locale:Locale)=>void}>({locale:'en',setLocale:()=>{}});
/** Only call for application-authored UI copy, never field records or user input. */
export function pickLanguage(text:string,locale:Locale):string {
  const match=text.match(/^(.*?)\s*\/\s*([\u0900-\u097f].*)$/s);
  if(!match)return text;
  return (locale==='hi'?match[2]:match[1]).trim();
}
export function UiLanguageProvider({children}:{children:ReactNode}) {
  const [locale,setValue]=useState<Locale>('en');
  useEffect(()=>{try{const value=localStorage.getItem('jalrakshak-language');if(value==='hi')queueMicrotask(()=>setValue(value));}catch{/* Language remains usable without storage. */}},[]);
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  function setLocale(value:Locale){setValue(value);try{localStorage.setItem('jalrakshak-language',value);}catch{/* Keep the selected language in memory. */}}
  return <LanguageContext.Provider value={{locale,setLocale}}>{children}</LanguageContext.Provider>;
}
export function useUiLanguage(){return useContext(LanguageContext);}
export function UiText({text}:{text:string}) {const {locale}=useUiLanguage();return pickLanguage(text,locale);}
export function LanguageSwitch(){const {locale,setLocale}=useUiLanguage();return <button type="button" onClick={()=>setLocale(locale==='en'?'hi':'en')} aria-label={locale==='en'?'Switch to Hindi':'Switch to English'}>{locale==='en'?'हिन्दी':'English'}</button>;}
