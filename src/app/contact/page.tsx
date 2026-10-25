import { ContactForm } from '@/components/ContactForm';
import { MessageSquareText } from 'lucide-react';
export const metadata={title:'Contact Us | JalRakshak'};
export default function ContactPage() {
  return <main className="contact-page">
    <a href="/">← JalRakshak Home / होम</a>
    <h1><MessageSquareText size={28} aria-hidden="true"/> Contact Us / संपर्क करें</h1>
    <p>Report an issue, raise a grievance, or request help with your data. / समस्या, शिकायत या डेटा संबंधी सहायता के लिए लिखें।</p>
    <p>To: Anubhav Harsh Sinha · <a href="mailto:sinhaanubhavharsh@gmail.com">sinhaanubhavharsh@gmail.com</a></p>
    <p>Don’t include passwords, identity documents or full backups. This form is not monitored for emergencies. / पासवर्ड, पहचान दस्तावेज़ या पूरा बैकअप न भेजें। यह आपातकालीन सेवा नहीं है।</p>
    <ContactForm />
    <p><small>Details are used to respond to your request and sent through Gmail when configured. No separate contact database is kept by this app. Email copies remain in the mailboxes; retention is not yet fixed. Unsubmitted text is not saved after leaving this page. <a href="/privacy">Privacy notice / गोपनीयता सूचना</a></small></p>
  </main>;
}
