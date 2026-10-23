# Software field transformation audit

Audit baseline: f739749, 23 October 2026. Static inspection completed before implementation. Dependency installation and baseline verification are pending; existing features below are implemented in source, not newly runtime-certified by this audit.

| Area | Existing implementation | Decision |
| --- | --- | --- |
| Entry / navigation | Single App Router page, client-state navigation; simulated screening hero | Replace primary entry with manual field tasks; retain original UI under a secondary demos entry |
| Sources | Local registration, source code, village, mandatory coordinates, category, optional photo; shared screening/EC source table | Retain old records; add field-specific source records with district, optional GPS, operator reference and edit support |
| Manual EC | Two/three readings, required temperature and device/probe IDs; calibration metadata; offline saves | Reuse repeatability engine; field mode permits missing temperature and optional IDs, snapshots calibration per visit |
| Quality | Injectable max(20 µS/cm, 5% pair mean) rule; closest agreeing pair of three | Retain; validate all inputs and persist disagreement evidence without changing it to passing |
| History | Median comparison, minimum three visits, same device/source/origin/method, temperature envelope | Retain principles; fix zero baseline and future-visit eligibility; persist rule/result snapshots |
| Follow-up | Screening referral creation only; judge reports are read-only snapshots | Missing real investigation lifecycle, evidence log, retest linkage and closure validation; implement |
| Persistence | Dexie schema v1–5; localStorage drafts; transactions and idempotent saves | Extend with additive tables; preserve all legacy tables; validate restored field records and fail visibly on corruption |
| Offline | Service worker caches shell and requested local assets; map is online-dependent | Retain; cache new primary shell, verify refresh and offline end-to-end |
| Mapping | MapLibre, OSM tiles, local fallback list; simulated screening records | Retain in secondary legacy experience; no offline basemap claim |
| Exports | EC CSV and synthetic judge print/PDF report | Add source-scoped field reports including investigations/events and bilingual labels; harden CSV cells |
| Languages | English/Hindi screening, EC and judge dictionaries | Retain; add full field dictionaries including errors and reports |
| Sensor code | SimulatedSensorProvider presets; BluetoothSensorProvider throws; ESP32 interface only | Keep for compatibility and labelled demos; no physical connection in primary journey |
| Backend | DemoSyncTransport acknowledges locally; unused endpoint env; future Supabase SQL | No real sync exists; primary field mode must say local only, never call demo transport |
| Tests | Domain, provider, storage, translation tests; 16 browser tests | Run baseline; retain regression tests via secondary entry; add field/migration/error/offline/mobile coverage |
| Deployment | Next/Vercel, manifest, CSP/security headers, worker-copy build step | Preserve hosting; no push/deployment authorized |
| Documentation | Research, validation proposals, SOPs, submission scripts and screenshots | Preserve historical artifacts; add explicit current transformation readiness and demo instructions |

## Confirmed static defects and gaps

- Screening reset removes EC sources with no measurements because it ignores recordScope.
- History includes later visits when comparing an older record.
- Zero median can never trigger a change because percentage is undefined.
- EC draft localStorage writes can throw outside error handling.
- Main UI files contain roughly 2,000 and 1,000 lines; new field concerns should be separate components/modules.
- No editable source workflow, timestamp entry, optional temperature, durable investigation events, genuine follow-up report, or operational field demo exists.
- Existing claims of baseline test counts are historical; this checkout initially has no installed dependencies.

## Implementation boundaries

Add a separate field schema alongside legacy stores, rather than reinterpret simulated or experimental records as real observations. Real/manual and synthetic field records have explicit scope and cannot be linked across scopes. Reuse the tested repeatability engine and visual primitives. Reports are local evidence, not laboratory certificates. Missing calibration/temperature can exclude comparisons without making a numerically valid reading invalid. No working experimental functionality will be deleted.
