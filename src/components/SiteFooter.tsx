'use client';
import { ShieldCheck, FileText, MessageSquareText } from 'lucide-react';
import { LanguageSwitch, useUiLanguage } from './UiLanguage';
export function SiteFooter() {
  const {locale}=useUiLanguage();const hi=locale==='hi';
  return <footer className="site-footer no-print" aria-label={hi?'जलरक्षक जानकारी':'JalRakshak information'}>
    <nav aria-label={hi?'गोपनीयता और उपयोग लिंक':'Privacy and use links'} className="site-footer-links">
      <a href="/privacy"><ShieldCheck size={18} aria-hidden="true"/><span>{hi?'गोपनीयता':'Privacy'}</span></a>
      <a href="/terms"><FileText size={18} aria-hidden="true"/><span>{hi?'उपयोग की शर्तें':'Use & terms'}</span></a>
      <a href="/contact"><MessageSquareText size={18} aria-hidden="true"/><span>{hi?'संपर्क करें':'Contact Us'}</span></a>
      <LanguageSwitch />
    </nav>
    <p>© 2026 JalRakshak.<br/>{hi?'MIT लाइसेंस में दी गई अनुमति को छोड़कर सभी अधिकार सुरक्षित।':'All rights reserved, except as granted under the MIT licence.'}</p>
  </footer>;
}
