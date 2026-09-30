# JalRakshak gap thesis

## Decision: PIVOT

### 1. What exact problem exists?

Jharkhand’s rural water-quality problem is heterogeneous and already institutionally recognized. Official and local evidence shows district/source variation, localized iron/fluoride/mining-related risks, microbial risk, uneven Field Test Kit availability and limited skilled village manpower. In the 2024 JJM sample of 555 Har Ghar Jal villages, reported FTK availability ranged from 0% in sampled Sahibganj villages and 8.6% in Hazaribag to 100% in Khunti, while only 43.4% reported skilled O&M manpower ([JJM Jharkhand assessment](https://jaljeevanmission.gov.in/sites/default/files/2025-12/FHTC_Jharkhand_State%20Report.pdf)).

The unresolved operational problem is not “no data system.” It is whether field measurements can be made repeatably, retained through poor connectivity, interpreted as non-specific change, and handed into the existing confirmation/remedial workflow without loss or scientific overclaim.

### 2. Who experiences it?

Authorized community surveillance workers and sample takers face the field workflow; DWSD/VWSC/laboratory staff face data quality, confirmation and follow-through; communities bear unreliable service and contamination risk. Jal Sahiyas are plausible primary users because Jharkhand programme material documents FTK, H2S, sanitary-survey and Jhar-Jal work, but this must be validated locally rather than generalized ([JJM case study](https://jaljeevanmission.gov.in/sites/default/files/publication_and_reports/101-glimpses-of-women-power.pdf)).

### 3. What existing system addresses it?

JJM already defines village FTK surveillance, five trained women, sanitary inspection, WQMIS upload, mapped laboratories, confirmation, alerts and remedial action ([JJM WQMS Framework](https://jaljeevanmission.gov.in/sites/default/files/guideline/WQMS-Framework.pdf)). Jharkhand already deploys Jhar-Jal for handpump/sanitary surveys, geolocation and FTK/H2S results ([official listing](https://play.google.com/store/apps/details?id=com.e.jharkhand_drinking_water_dwsd)). WQMIS already has mobile geotagging, sample/lab roles and remedial-action records ([WQMIS](https://ejalshakti.gov.in/WQMIS/)).

### 4. Where specifically might it fall short?

Public evidence shows uneven FTK/skilled-person availability. Public product documentation does not establish a robust low-cost-sensor QA workflow—device identity, calibration checks, duplicates, stabilized readings, uncertainty and per-source seasonal baselines—or confirm offline performance. These are candidate gaps. No reviewed evaluation proves that they are priority bottlenecks in the target Jharkhand area.

### 5. What evidence proves the gap?

It proves **capacity variation**, not product-market fit: the 2024 official assessment documents FTK and manpower gaps. USGS/EPA/WHO evidence establishes why calibration, temperature compensation, repetition, seasonal context and confirmation are necessary. No source proves JalRakshak itself closes the operational gap. Interviews and a paired pilot are required.

### 6. What should JalRakshak do differently?

Reposition from “community water-quality screening system” to:

> **An offline field measurement and quality-control companion that helps authorized workers collect repeatable source-level conductivity data, recognize persistent non-specific change, and package evidence into existing FTK/laboratory workflows.**

It should interoperate with—not duplicate—Jhar-Jal/WQMIS. Its distinctive unit is not a coloured map marker; it is a traceable measurement with device/calibration/repeatability/provenance metadata and same-source history.

### 7. Why software plus low-cost sensing?

EC is inexpensive and quick, and temperature-corrected longitudinal change can act as a non-specific anomaly signal. EPA contamination-warning work explicitly uses common parameters to flag change and then sample/analyse, because generic sensors cannot identify contaminants ([EPA sensor evaluation](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P1014GZ4.TXT)). Offline software can enforce SOP steps and retain history. This is appropriate only if a pilot shows adequate repeatability, maintainability and decision value.

### 8. What does JalRakshak intentionally not do?

It does not certify safety; identify arsenic, fluoride, iron, lead, nitrate, pathogens, pesticides or metals; replace FTKs or accredited labs; create an unofficial contamination registry; prescribe remediation; or bypass government roles. Temperature supports compensation, not a safety status. pH and turbidity are deferred until validated instruments and operational value justify their burden.

### 9. How would success be measured?

For a pilot, success requires all of the following:

- ≥90% of planned visits produce complete, provenance-correct records;
- duplicate EC precision and reference-meter bias meet preregistered tolerances agreed with a qualified water-quality partner;
- zero simulated values enter real/pilot datasets and zero unconfirmed records are labelled contamination;
- calibration/check compliance ≥95%; no unresolved instrument-failure record becomes “normal”;
- authorized users can complete the workflow with acceptable time/error burden;
- every persistent anomaly has documented disposition in the existing official workflow;
- no duplicate official source/sample identity is created;
- field interviews demonstrate that this process solves a higher-priority bottleneck than kit/reagent/transport/training investment alone.

Failure to meet measurement performance, maintenance ownership, workflow value or institutional integration criteria means stop the hardware path.

