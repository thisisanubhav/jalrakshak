export function AiProcessingNotice({ hi }: { hi: boolean }) {
  return <p>{hi
    ? 'AI अनुरोध ऑडियो या चुना टेक्स्ट निर्धारित सेवा को भेजते हैं—होस्टेड Groq चालू होने पर Groq को, अन्यथा स्थानीय सेवा को। फ़ोटो नहीं भेजे जाते।'
    : 'AI requests send audio or selected text to Groq when hosted AI is enabled, otherwise to your local service. Photos are not sent.'} <a href="/privacy">{hi ? 'गोपनीयता' : 'Privacy'}</a></p>;
}
