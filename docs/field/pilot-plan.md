# Smallest credible Jharkhand field pilot

## Decision gate

This pilot is proposed because the research recommendation is **PIVOT**. It must not begin until local DWSD/VWSC/laboratory authorization, qualified scientific review, data governance, equipment validation and user consent/participation arrangements are complete.

## Questions

1. Is there a workflow gap that Jhar-Jal/WQMIS and current FTKs do not meet?
2. Can intended users collect repeatable, temperature-compensated EC readings with acceptable burden?
3. Does same-source history identify persistent changes that lead to useful, non-duplicative official follow-up?
4. Is the benefit greater than investing the same effort in FTK availability, training, reagent supply or sample transport?

## Phase 0 — institutional discovery (before hardware field use)

Conduct 8–12 interviews/task observations:

- 4–6 authorized Jal Sahiyas/FTK users or sample takers;
- 1–2 VWSC/Panchayat representatives;
- block/district DWSD WQMS coordinator;
- receiving laboratory technician/in-charge;
- Jhar-Jal/WQMIS support or data owner if available.

Map the real current workflow, app usage, connectivity, source identity, test frequency, reagent availability, sample transport, result return and remedial action. If stakeholders identify no unmet problem that this approach can solve, **stop before hardware integration**.

## Phase 1 — bench/reference validation

- Select one EC/temperature meter only after reviewing range, resolution, compensation, calibration and service support.
- Compare at least three candidate units (if affordable) against a traceable/reference meter across standards bracketing expected water.
- Evaluate within-device repeatability, between-device variation, temperature compensation, carryover, stabilization, battery behaviour and operator effects.
- Pre-register acceptance tolerances with a qualified water-quality partner; do not derive convenient limits after seeing results.
- Test the data schema and offline records with synthetic/non-private source IDs.

Failure to meet agreed repeatability/bias or practical maintenance criteria means **stop or change the instrument**, not adjust the software status colours.

## Phase 2 — field feasibility

### Area and sources

- One consenting Gram Panchayat/local programme area selected with DWSD.
- **5–10 existing monitored sources**, preferably a planned mix such as handpump/borewell and delivery tap, without claiming representativeness.
- Include only sources for which a durable official/local ID and responsible authority are known.
- Do not publish precise coordinates or unconfirmed statuses.

### Schedule

- At least **6 visits per source**, including more than one hydrological condition where the calendar permits (pre-monsoon and monsoon/post-monsoon).
- At each visit: sanitary inspection, two independent stabilized EC/temperature measurements, third on disagreement, approved FTK activity if due, and reference-meter duplicate on a randomized subset.
- One initial and one closing laboratory panel per source if authorized/feasible, plus targeted confirmation for persistent anomalies or official-protocol triggers. The laboratory selects parameters based on local risk and source type.

Six visits is a feasibility design choice, not a universal baseline standard. WHO recommends accounting for parameter stability and season ([WHO, 2024](https://www.who.int/publications/i/item/9789240088740)).

### Minimum fields

- official/local source ID, type and controlled coordinates;
- visit/sample UUID, worker and supervisor;
- date/time, season/recent rainfall, source events and sample point;
- approved sanitary inspection;
- device/probe ID and software/firmware;
- check-standard lot/value/expiry, pre/post result;
- raw EC, temperature, compensated EC at 25°C, compensation and TDS factors;
- duplicate/third readings, stabilization time, errors and disposition;
- FTK parameter/result, kit lot/expiry and origin when part of approved schedule;
- official confirmation sample ID, custody and lab report link;
- offline/sync audit and duplicate reconciliation.

## Data classes: never mix

| Class | Allowed use | Storage/display rule |
|---|---|---|
| `SIMULATED` | Training/demo only | Separate database/export; excluded from pilot analysis. |
| `SENSOR` | Pilot meter measurements | Per-measurement device/calibration/QA metadata mandatory. |
| `PUBLIC_DATA` | Context from WQMIS/CGWB/open reports | Preserve source URL, retrieval date, geographic/time granularity and licence; do not assign to a source unless source IDs truly match. |
| `LAB_CONFIRMED` | Received lab report | Laboratory, method/scope, sample ID, dates and report required; referral alone cannot create it. |

## Permissions, consent and privacy

- Written institutional authorization from the responsible DWSD/local body and laboratory.
- Explain study purpose, limitations and data use to workers and relevant source custodians/community representatives in appropriate language.
- Obtain consent for worker interviews/usability recording; do not imply that public-source testing confers individual medical diagnosis.
- Minimize personal data. Use role codes rather than public names; encrypt access-controlled pilot data; define retention/deletion.
- No faces, private household photos or exact public coordinates unless specifically necessary and authorized.
- Register adverse events, complaints and correction requests.

## Calibration and quality assurance

- Named technical custodian and backup instrument.
- Pre-visit and post-day checks with recorded standards; scheduled calibration per device and quality plan.
- Random 10–20% supervisor-observed repeat visits and reference-meter comparisons.
- Blind duplicate/known-standard checks where feasible.
- Immutable audit trail; no deletion of failed readings—mark invalid with reason.
- Versioned SOP and anomaly rule; changes require documented approval.

USGS emphasizes traceable calibration, cleaning, full immersion, equilibration and reporting for specific conductance ([USGS, 2019](https://doi.org/10.3133/tm9A6.3)); low-cost-sensor literature shows reference validation is often missing ([Pino et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10181703/)).

## Analysis

Primary outcomes:

- within-visit duplicate difference and coefficient of variation;
- bias/agreement against reference meter;
- calibration/check pass and drift rate;
- complete valid record rate;
- median visit time and worker error/support rate;
- offline persistence/sync reconciliation and duplicate rate;
- proportion of anomaly flags that persist on repeat and lead to an authorized action;
- time from official confirmation request to sample receipt/result/disposition.

Exploratory only:

- source-level median/MAD by season;
- candidate absolute-plus-relative anomaly rules;
- relationship of EC changes to lab/FTK parameters.

Do not optimize a rule on this tiny sample and claim predictive performance. Report false alarms and missed lab findings, especially lab findings with no EC anomaly.

## Success / stop criteria

Proceed to a larger pilot only if:

- stakeholders confirm a non-duplicative use case;
- ≥90% planned visits yield complete records;
- ≥95% required calibration/check events are compliant;
- reference agreement/repeatability meet preregistered criteria;
- no demo/public/lab provenance mixing occurs;
- no failed/missing reading is classified reassuringly;
- users can perform the procedure with acceptable measured burden;
- the official receiving workflow accepts and acts on the packet;
- value is demonstrably incremental to current FTK/Jhar-Jal/WQMIS work.

Stop or redesign if any critical scientific, safety, governance or maintenance criterion fails; if EC anomalies do not relate to useful follow-up; or if existing systems already meet the need more simply.

## Scale and resourcing

This is 30–60 source-visits, not a deployment. Budget lines must include worker time, training, standards, reference access, probe replacement, travel, lab tests, PPE, data stewardship and contingency. Hardware price alone is not the cost of monitoring.

