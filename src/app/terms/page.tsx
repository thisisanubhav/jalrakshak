
import { UiText } from '@/components/UiLanguage';
export const metadata={title:'Use & limitations | JalRakshak'};
export default function TermsPage() {
  return <main className="field-main"><article className="field-card">
    <a href="/"><UiText text={"← JalRakshak Home / होम"}/></a>
    <h1><UiText text={"Use & limitations / उपयोग और सीमाएँ"}/></h1>
    <p><strong>Draft for review — 25 October 2026.</strong> These product-use rules are not a final legal agreement. No acceptance is recorded or inferred from continued use. Liability, dispute-resolution and applicable-law provisions require legal review before a public launch.</p>
    <h2>Purpose</h2><p>JalRakshak supports field measurements, records and follow-up. Electrical conductivity does not identify contaminants or certify drinking-water safety. Arrange appropriate testing and follow local authority guidance. The app does not contact laboratories or authorities for you.</p>
    <h2>Accounts and authorised use</h2><p>Use only your assigned account and records. Keep credentials private. Do not attempt to bypass permissions, alter another worker’s evidence, overload the service or upload unlawful content. Supervisors can disable accounts; previously downloaded copies may remain on devices.</p>
    <h2>Your records and uploads</h2><p>Upload only material you are authorised to use. Avoid unnecessary personal information, faces and private documents. You retain any ownership rights you have in your content; using the app does not transfer those rights to its operator. The app stores, synchronises, displays and backs up content to deliver its field-work features. Report disputed uploads to the contact below.</p>
    <h2>Review and backup</h2><p>Check measurements, timestamps, source selection and AI drafts before saving. AI assistance can be wrong; it cannot approve a visit or assess water safety. Keep verified backups outside the working device. Offline edits are not shared until sync succeeds. Availability, data recovery and measurement accuracy are not guaranteed by the software.</p>
    <h2>Changes and privacy</h2><p>Significant changes should be explained before use. See the <a href="/privacy">Privacy & data use notice</a> for actual storage, sharing, retention and deletion limits. This draft does not waive statutory rights or claim blanket immunity from liability.</p>
    <h2>Contact</h2><p>Anubhav Harsh Sinha, India — <a href="/contact"><UiText text={"Contact Us / संपर्क करें"}/></a>.</p>
    <h2>हिन्दी सारांश</h2><p>यह समीक्षा के लिए मसौदा है, अंतिम कानूनी अनुबंध नहीं। केवल अधिकृत खाते और सामग्री का उपयोग करें। माप और AI मसौदे जाँचें, बैकअप रखें और पानी की सुरक्षा के लिए उचित परीक्षण कराएँ। रिकॉर्ड का स्वामित्व केवल ऐप उपयोग करने से नहीं बदलता। गोपनीयता या सामग्री संबंधी प्रश्न संपर्क फ़ॉर्म से भेजें।</p>
  </article></main>;
}
