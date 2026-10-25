
import { UiText } from '@/components/UiLanguage';
export const metadata={title:'Privacy & data use | JalRakshak'};
export default function PrivacyPage() {
  return <main className="field-main"><article className="field-card">
    <a href="/"><UiText text={"← JalRakshak Home / होम"}/></a>
    <h1><UiText text={"Privacy & data use / गोपनीयता और डेटा उपयोग"}/></h1>
    <p>Updated 25 October 2026. This notice describes this JalRakshak build. It is not a certification of legal compliance.</p>
    <h2>Operator and contact</h2>
    <p>Anubhav Harsh Sinha, India. For privacy questions, access, correction, deletion or security concerns: <a href="/contact"><UiText text={"Contact Us / संपर्क करें"}/></a>. Include your username and request; never send passwords, identity documents or full backup files.</p>
    <h2>Information used</h2>
    <p>Accounts store your name, username, role, active status and a salted password hash. The server also keeps expiring sessions, failed-login counters and an audit trail of account, assignment and sync actions.</p>
    <p>Field records include source identifiers, location text and optional coordinates, measurements, instrument details, operator references, timestamps, visit schedules, reviews, investigation history, notes and optional photos. Use operator codes and avoid faces, personal documents and unnecessary personal details in uploads.</p>
    <h2>Where records go</h2>
    <p>Your browser stores offline records, photos, drafts, preferences and recovery copies. Team sync sends saved field records to the configured JalRakshak server. Workers can access assigned sources; supervisors can access all team records and manage accounts. Server operators can access the database and backups. Personal/practice workspace records are separate from team sync.</p>
    <p>Microphone, camera and location features require browser permission when used. Source coordinates describe the source; this app does not continuously track your location. QR scanning runs on your device.</p>
    <h2>Voice and AI</h2>
    <p>Voice recordings and drafts stay in this browser until you choose Transcribe. Transcription sends audio to the configured private speech service through JalRakshak. Drafts and summaries send text evidence to the private model service. The supplied Docker configuration isolates both services from the public internet. The speech adapter processes audio in memory and does not intentionally retain recordings or transcripts on the server.</p>
    <p>Voice drafts are excluded from field backups and team sync. They are removed after a successful visit save, or when you remove the account’s device data. Unsaved drafts otherwise remain locally. Text you apply to a saved visit becomes part of that record. AI output needs human review and does not establish water safety.</p>
    <h2>Contact requests and grievances</h2>
    <p>The <a href="/contact">Contact Us form</a> collects your name, reply email, request category, subject, optional source/visit reference and message. With your confirmation, the configured Gmail account sends these details to the operator’s support mailbox to handle your request. Google processes the email; copies can remain in sending and receiving mailboxes. No separate contact database is kept by this app, and unsubmitted text is not persisted after leaving the page. A mailbox retention period has not yet been fixed. Do not send passwords, identity documents or full backups.</p>
    <p>If automatic sending is unavailable, “Open in email app” prepares a draft in your own email app. You must send it yourself; your email provider then processes it. Acceptance by the sending service is not a guarantee of inbox delivery.</p>
    <h2>Maps and external services</h2>
    <p>Opening the map contacts OpenStreetMap’s tile service. Its providers receive your IP address, browser request information and tile coordinates indicating the viewed map area. Source labels and measurement records are not deliberately sent as tile data. Read the <a href="https://osmfoundation.org/wiki/Privacy_Policy" rel="noreferrer">OpenStreetMap Foundation privacy policy</a>. Maps may be unavailable offline.</p>
    <p>No advertising pixels or analytics SDKs are included in the reviewed app. Model installation downloads use external registries; installation is separate from processing your recordings. A future hosting provider may process network metadata; that deployment must update this notice before launch.</p>
    <h2>Cookies and browser storage</h2>
    <p>A first-party session cookie supports sign-in for up to 12 hours. IndexedDB, local storage and the service worker support requested offline features and preferences. There is no optional tracking consent banner because this build does not include optional analytics or advertising tracking. Adding such services requires a fresh assessment and notice.</p>
    <h2>Retention and your choices</h2>
    <p>A retention period for field records and inactive accounts has not yet been selected. Automatic deletion is disabled: records and accounts remain until an operator handles a reviewed request. Disabling an account is not deletion. Normal sync prevents record deletion to protect evidence. Contact the operator to request access, correction or deletion; requests require appropriate identity checks and review of applicable retention obligations.</p>
    <p>The supplied server backup task retains the newest 30 verified copies, not a guaranteed number of days. These copies are on the same storage by default. Downloaded backups remain wherever you save them. Browser drafts and recovery copies have no automatic expiry.</p>
    <p>Signing out retains local records. After signing out, use “Remove this account’s device data” to delete that account’s browser copy, including unsynced work. This does not delete server records, other devices, other accounts or downloaded files. Remote account disabling cannot erase a disconnected device.</p>
    <h2>Security limits</h2>
    <p>Passwords are hashed, and the hosted Docker setup supports HTTPS and role checks. Browser data and SQLite files are not encrypted by this app. Plain JSON downloads are unencrypted; password-encrypted field downloads are optional. Backup passwords cannot be recovered. Use a trusted, locked device and protected storage; do not share a browser profile between untrusted people.</p>
    <h2>हिन्दी सारांश</h2>
    <p>डेटा ऑफ़लाइन ब्राउज़र में रहता है; सिंक करने पर साझा सर्वर तक जाता है। कर्मचारी अपने आवंटित स्रोत और पर्यवेक्षक सभी टीम रिकॉर्ड देख सकते हैं। वॉइस से टेक्स्ट बनाने पर रिकॉर्डिंग निजी सेवा तक जाती है। मानचित्र OpenStreetMap से जुड़ता है। डेटा रखने की अवधि अभी तय नहीं है, इसलिए स्वतः हटाना बंद है। लॉगआउट से डेटा नहीं मिटता; उसके बाद डिवाइस डेटा हटाने का विकल्प उपलब्ध है। जानकारी, सुधार या हटाने के अनुरोध के लिए संपर्क फ़ॉर्म का उपयोग करें। पासवर्ड या निजी दस्तावेज़ न भेजें।</p>
  </article></main>;
}
