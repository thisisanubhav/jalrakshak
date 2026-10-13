# JalRakshak — final three-minute demonstration script

This script uses only synthetic demonstration data. Keep the browser at <https://jalrakshak-jharkhand.vercel.app>, start from Home, and do not imply that a physical sensor, laboratory, government integration, or field pilot is present.

## 0:00–0:20 — Problem and context

**On screen:** Home, then point to **Explore Interactive Demo**.

**Narration:**

“A field conductivity value is only useful when we know whether the reading repeated, which source and device it came from, and how it compares with compatible visits. JalRakshak is an offline-first measurement-quality and source-history companion. It does not determine whether water is safe.”

Select **Explore Interactive Demo** and briefly point to the synthetic-data notice.

## 0:20–0:40 — What JalRakshak does

**On screen:** Four scenario cards.

**Narration:**

“These four deterministic examples show the decisions the software can and cannot support. The data is fictional and isolated from manually entered experimental records. Everything remains on this browser unless the user exports it.”

## 0:40–1:10 — Repeatability and disagreement

Open **Measurement Disagreement**.

**Narration:**

“Here, Reading 1 is 610 and Reading 2 is 830 microSiemens per centimetre. They disagree under the current provisional repeatability rule, so JalRakshak asks for a third reading and withholds any source-level conclusion. Repeatability is not proof of accuracy—it is a quality check before interpretation.”

Point to **Third reading required** and **No source-level conclusion**.

## 1:10–1:50 — Source history and EC change

Return to scenarios and open **EC Change Observed**. Scroll to the comparison and chart.

**Narration:**

“JalRakshak compares only context-compatible visits. Comparable points form the trend; excluded visits remain inspectable but are not silently connected. Here, the current 1,020 microSiemens per centimetre value is shown against the source’s historical median, with the absolute and percentage change.”

Point to the provisional-rule disclosure.

“This says ‘EC change observed,’ not ‘contamination detected.’ Conductivity alone cannot identify the cause or establish drinking-water safety. The result calls for measurement verification and the approved confirmation workflow.”

Briefly mention **Insufficient History**: one visit produces **Baseline not established**, never a normal classification.

## 1:50–2:20 — Offline workflow

**On screen:** Offline/local-storage indicator or switch the browser offline after the scenario is loaded.

**Narration:**

“The source snapshot, history, and evidence tools work after connectivity is lost. IndexedDB keeps the record through refresh, while the service worker keeps the application shell available. The app does not upload these records to a government system or production database.”

Refresh once while offline if demo conditions permit, then reconnect.

## 2:20–2:40 — Evidence export

Select **Generate investigation report**.

**Narration:**

“The investigation record is created from the stored source and visits. It preserves raw readings, representative EC, temperature, device and probe, calibration metadata state, comparison eligibility, and `SYNTHETIC_DEMO` provenance. It can be printed or saved as PDF, and CSV export is also available offline.”

Point to the scientific limitation and **Print / Save as PDF**.

## 2:40–3:00 — Limitations and next validation gate

**Narration:**

“JalRakshak is a software-only experimental prototype. It has no physical sensor, does not detect specific contaminants, does not certify water safety, and does not replace Jhar-Jal, WQMIS, or accredited laboratories. The next gate is direct validation with field and laboratory stakeholders before any hardware or operational deployment.”

End on the public URL or the scenario landing screen.

## Recording checklist

- Keep `SYNTHETIC DEMONSTRATION DATA` visible when discussing readings.
- Do not say “safe,” “unsafe,” “contaminated,” or “sensor reading.”
- Use “manually entered experimental measurement” or “synthetic scenario.”
- Hide browser bookmarks, notifications, accounts, and unrelated tabs.
- Record at 1080p or higher, with browser zoom at 100%.
- Keep the final cut at or below three minutes.
