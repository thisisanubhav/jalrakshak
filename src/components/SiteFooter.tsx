import { ShieldCheck, FileText, MessageSquareText } from 'lucide-react';
export function SiteFooter() {
  return <footer className="site-footer no-print" aria-label="JalRakshak information">
    <nav aria-label="Privacy and use links" className="site-footer-links">
      <a href="/privacy" aria-label="Privacy & data use / गोपनीयता"><ShieldCheck size={18} aria-hidden="true"/><span>Privacy<small>गोपनीयता</small></span></a>
      <a href="/terms" aria-label="Use & limitations / उपयोग की सीमाएँ"><FileText size={18} aria-hidden="true"/><span>Use & terms<small>उपयोग की शर्तें</small></span></a>
      <a href="/contact" aria-label="Contact Us / संपर्क करें"><MessageSquareText size={18} aria-hidden="true"/><span>Contact Us<small>संपर्क करें</small></span></a>
    </nav>
    <p>© 2026 Anubhav Harsh Sinha · JalRakshak.<br/>All rights reserved, except as granted under the MIT licence.</p>
  </footer>;
}
