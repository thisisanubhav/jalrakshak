import type { ECAgreementStatus } from "@/ec/types";
import type { Locale } from "@/i18n/translations";

const copy: Record<Locale, Record<ECAgreementStatus, { label: string; body: string }>> = {
  en: {
    REPEATABLE: {
      label: "Measurements repeatable",
      body: "Repeated readings agree within the current experimental tolerance. This shows consistency, not accuracy or water safety.",
    },
    DISAGREEMENT: {
      label: "Measurement disagreement",
      body: "These readings differ too much to support a reliable measurement. Take a third reading before interpreting source-level change.",
    },
    INSUFFICIENT_DATA: {
      label: "Insufficient measurement data",
      body: "At least two valid readings are required before repeatability can be assessed.",
    },
    INVALID: {
      label: "Invalid measurement",
      body: "One or more readings are missing or invalid. No history comparison is produced.",
    },
  },
  hi: {
    REPEATABLE: {
      label: "माप दोहराव योग्य हैं",
      body: "दोहराए गए माप वर्तमान प्रायोगिक सीमा में सहमत हैं। यह केवल संगति दिखाता है, सटीकता या जल-सुरक्षा नहीं।",
    },
    DISAGREEMENT: {
      label: "मापों में असहमति",
      body: "इन मापों में अंतर बहुत अधिक है। स्रोत में बदलाव समझने से पहले तीसरा माप लें।",
    },
    INSUFFICIENT_DATA: {
      label: "माप डेटा अपर्याप्त है",
      body: "दोहराव जाँचने के लिए कम-से-कम दो सही माप आवश्यक हैं।",
    },
    INVALID: {
      label: "माप अमान्य है",
      body: "एक या अधिक माप गायब या अमान्य हैं। इतिहास से तुलना नहीं की गई।",
    },
  },
};

export function getMeasurementQualityCopy(
  locale: Locale,
  status: ECAgreementStatus,
) {
  return copy[locale][status];
}
