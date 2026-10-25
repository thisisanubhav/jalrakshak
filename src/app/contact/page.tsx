
import { UiText } from '@/components/UiLanguage';
import { ContactForm } from '@/components/ContactForm';
import { MessageSquareText } from 'lucide-react';
export const metadata={title:'Contact Us | JalRakshak'};
export default function ContactPage() {
  return <main className="contact-page">
    <a href="/"><UiText text={"← JalRakshak Home / होम"}/></a>
    <h1><MessageSquareText size={28} aria-hidden="true"/> <UiText text={"Contact Us / संपर्क करें"}/></h1>
    <p><UiText text={"Report an issue, raise a grievance, or request help with your data. / समस्या, शिकायत या डेटा संबंधी सहायता के लिए लिखें।"}/></p>
    <ContactForm />
  </main>;
}
