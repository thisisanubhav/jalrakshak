# Duplication and gap analysis

## Relevant systems and products

| System | Who uses it / status | What it does or measures | Offline | Mapping/history/referral | Evidence and limitation |
|---|---|---|---|---|---|
| **JJM WQMIS** | National/state/district officials, FTK users, sample collectors, laboratories, public; deployed government system | Sample registration, parameter results, sanitary survey, lab locator, dashboards, remedial action | Not established by public documentation reviewed | Geotagged sample registration and maps; FTK-to-lab/remedial workflow already designed | [Portal](https://ejalshakti.gov.in/WQMIS/), [manual](https://ejalshakti.gov.in/WQMIS/Home/DownloadUserManualPDF). Actual Jharkhand usability/completeness not independently evaluated here. |
| **Jhar-Jal** | Jharkhand DWSD/JSAC; 10K+ Play Store downloads at access | Handpump and sanitary survey, discharge, beneficiaries, FTK/H2S water testing, geolocated monitoring | Not established by listing | Geolocation; history/referral detail not publicly established | [Official app listing](https://play.google.com/store/apps/details?id=com.e.jharkhand_drinking_water_dwsd). Direct overlap with most JalRakshak MVP screens. |
| **Community FTKs / H2S vials** | Jal Sahiyas/other trained village women, VWSCs; existing JJM programme | Typically pH, alkalinity, hardness, chloride, nitrate, fluoride, iron, residual chlorine and H2S; kits vary | Yes, inherently field/offline; later data upload may not be | Results intended for WQMIS and lab confirmation | [JJM framework](https://jaljeevanmission.gov.in/sites/default/files/guideline/WQMS-Framework.pdf). Reagent availability, user interpretation and quality control can vary. |
| **Laboratory network** | Public/sample collectors/DWSD; state/district/block/sub-divisional labs | Parameter-specific chemical and bacteriological tests | Physical workflow independent of live app at collection | WQMIS registration/results/remedial action | [JJM framework](https://jaljeevanmission.gov.in/sites/default/files/guideline/WQMS-Framework.pdf). Turnaround and access in pilot area unknown. |
| **Generic low-cost IoT prototypes** | Research prototypes, usually investigators | Commonly pH, turbidity, EC/TDS, temperature with cloud/mobile views | Often cloud-dependent; some add local storage | Often charts/maps; rarely accredited lab workflow | Systematic review finds limited reference validation and major QA needs ([Pino et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10181703/)). Deployment evidence is weaker than prototype count. |
| **Commercial multiparameter meters/kits** | Utilities, labs, trained technicians | Device-dependent calibrated field parameters | Usually yes for measurement | Usually device logging/export, not Jharkhand governance | Can solve measurement acquisition but not necessarily source workflow; costs/calibration/support need local quotes and validation. |

## What already exists

- A Jharkhand-specific mobile app with source/handpump survey, geolocation, sanitary survey and FTK/H2S capture.
- A national WQMIS with mobile geotagging, roles, sample and laboratory workflow, public reporting and remedial-action concepts.
- A community workforce model involving trained women and Jal Sahiyas.
- FTKs that test more hazard-relevant parameters than EC/temperature alone.
- Government laboratories and an intended confirmation/escalation path.
- Numerous research prototypes combining the same four headline sensors used in JalRakshak’s demo.

Therefore “offline water testing app with pH/TDS/turbidity/temperature, map and referral” is **not differentiated by feature list**.

## What may actually be missing

Evidence supports four candidate gaps, but only the first two have direct Jharkhand indicators and none has yet been validated through user interviews:

1. **Uneven village capability and kit availability.** The 2024 sampled-village assessment reported only 43.4% skilled O&M manpower and very uneven FTK availability ([JJM Jharkhand report](https://jaljeevanmission.gov.in/sites/default/files/2025-12/FHTC_Jharkhand_State%20Report.pdf)). Software alone cannot fix missing kits, reagents or skills.
2. **Measurement quality and traceability.** Existing public manuals describe result entry but this review did not find evidence of device-level calibration logs, duplicate readings, uncertainty, sensor health and field QA tailored to low-cost digital probes. This is a candidate complement, not a proven omission.
3. **Longitudinal, source-specific anomaly support.** WQMIS holds repeated sample data, but public documentation reviewed does not show a field-worker experience for establishing a source/season baseline and flagging persistent change. EPA evidence supports anomaly detection as a trigger—not identification—when baselines and sensor QA are adequate ([EPA](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P1014GZ4.TXT)). Whether WQMIS/Jhar-Jal already provides sufficient history must be verified with authorized users.
4. **Offline continuity and referral packaging.** JalRakshak’s offline-first implementation may help intermittent-connectivity work, but this audit found no comparative evidence that connectivity is the dominant bottleneck or that official apps fail offline. This remains a hypothesis.

## What JalRakshak should build

Only after field validation:

- a **measurement QA companion** for approved workers, not a parallel government database;
- raw EC and temperature with compensation/calibration metadata;
- duplicate/stabilized-reading workflow and explicit invalid-measurement states;
- same-source, season-aware history and transparent anomaly flags;
- export/referral packet designed with the receiving DWSD laboratory/WQMIS workflow;
- offline queue with provenance separation and auditable sync.

## What JalRakshak should not build

- another generic water-quality map;
- an “AI potability score” or multi-sensor water quality index;
- absolute safe/unsafe classification from EC, pH, turbidity and temperature;
- a replacement for FTKs, H2S/bacteriological methods, accredited labs, WQMIS or Jhar-Jal;
- an unofficial public contamination map based on unconfirmed field readings;
- hardware expansion before repeatability, maintenance ownership and workflow value are proven.

## Differentiation verdict

**As currently framed, JalRakshak substantially duplicates Jhar-Jal/WQMIS and common IoT prototypes.** A defensible differentiation exists only if a pilot proves that calibrated, offline, longitudinal measurement capture improves the reliability or speed of the existing community-to-laboratory process. That is a narrow workflow/quality-control thesis, not a new contaminant-detection platform.

