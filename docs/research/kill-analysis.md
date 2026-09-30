# Kill analysis

## Verdict

The original broad premise does **not** survive. “A new app plus TDS/temperature can screen rural water quality and route suspicious sources” is scientifically weak and substantially duplicates existing government systems. A narrower research proposition survives: quality-controlled longitudinal EC measurement may complement existing surveillance if users and officials confirm a real workflow gap.

| Skeptical objection | Validity and evidence | Does JalRakshak survive? | Required response |
|---|---|---|---|
| **“JJM already provides FTKs.”** | Valid. JJM trains village women, distributes FTKs and defines source/tail-end surveillance ([framework](https://jaljeevanmission.gov.in/sites/default/files/guideline/WQMS-Framework.pdf)). | Only as a complement; FTKs cover more hazard-relevant parameters than V1 EC. | Never claim replacement. Test whether digital QA/history improves the approved FTK/lab path. |
| **“Jharkhand already has an app.”** | Decisive objection to the generic app thesis. Jhar-Jal already covers handpumps, sanitary survey, geolocation and FTK/H2S testing ([listing](https://play.google.com/store/apps/details?id=com.e.jharkhand_drinking_water_dwsd)); WQMIS adds national lab/remedial workflows. | Only if officials identify a concrete unmet need or authorize integration. | Do discovery with Jhar-Jal/WQMIS users before more product code. Avoid parallel identifiers/database. |
| **“TDS cannot detect dangerous contaminants.”** | Valid. EC/TDS is collective ionic content; WHO assigns no health-based TDS value, and EPA says general sensors cannot identify the broad contaminant set ([WHO](https://www.who.int/publications/m/item/chemical-fact-sheets--total-dissolved-solids), [EPA](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P1014GZ4.TXT)). | Only as non-specific anomaly monitoring. | Remove contaminant implications; preserve explicit detection matrix and mandatory confirmation. |
| **“Why not just send samples to labs?”** | Partly valid. Labs are required for identity/compliance. Routine lab sampling of every source at high frequency has logistics/cost/turnaround constraints, but this audit has not quantified them in the pilot area. | Unproven. | Compare cost, turnaround and decisions against “FTK + scheduled lab only.” If EC does not change actions, stop. |
| **“Cheap sensors are inaccurate.”** | Often valid without QA. Systematic review found limited comparison with reference devices and stresses calibration, maintenance and interference ([Pino et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC10181703/)). | Only if paired validation meets preregistered performance. | Pilot against reference meter and lab; fail closed; log calibration and uncertainty. |
| **“Community workers cannot maintain probes.”** | Plausible and unresolved. Official sample found limited skilled manpower, and pH/turbidity have substantial maintenance burdens. | Unknown. | Start with one EC/temperature meter, named technician and competency checks; measure workload/error. Do not offload maintenance invisibly. |
| **“WQMIS already maps results and handles referrals.”** | Valid. WQMIS explicitly includes maps, roles, sample results, alerts and remedial action ([framework](https://jaljeevanmission.gov.in/sites/default/files/guideline/WQMS-Framework.pdf)). | A standalone map/referral product does not survive. | Treat local UI as a field cache/packet; pursue authorized interoperability, not competition. |
| **“Internet connectivity may not be the real bottleneck.”** | Valid challenge. This audit found no comparative Jharkhand evidence ranking connectivity above reagents, skills, transport or follow-up. | Unknown. | Interview workers and observe tasks. Offline-first is a capability, not the gap thesis until proven. |
| **“Who calibrates devices and pays for probes/standards?”** | Fatal if unanswered. Calibration and maintenance are essential ([USGS](https://doi.org/10.3133/tm9A6.3)). | Only with an institutional owner and budget. | Pilot requires named custodian, schedule, consumables/replacement budget and out-of-service procedure. |
| **“What happens after a referral?”** | Existing intended path is lab confirmation, official alerts and remedial action; execution performance is unknown. | App-only referral does not survive. | No “referral complete” metric; track sample receipt, result and disposition with authorized officials. |
| **“Why does this need software?”** | Strong. Paper/FTK/Jhar-Jal may suffice. | Only if SOP enforcement, provenance, offline capture and history measurably reduce errors or delay. | Run a comparative workflow/usability experiment; stop if no operational advantage. |
| **“A normal EC result will falsely reassure people.”** | Scientifically valid and high severity. Microbial/trace hazards can occur without diagnostic EC change. | Only with strict language and training. | Replace `NORMAL_SCREENING` before field use with `NO_EC_ANOMALY_OBSERVED`; never publicize as safety. |
| **“Longitudinal change will generate seasonal false alarms.”** | Valid. WHO requires seasonal timing and risk-based monitoring ([WHO](https://www.who.int/publications/i/item/9789240088740)). | Possibly, if season-aware and validated. | Build pre/post-monsoon baseline, device uncertainty and repeat confirmation before any alert rule. |
| **“Public maps could stigmatize villages.”** | Valid; unconfirmed data may be misunderstood and location data may be sensitive. | Public map does not survive for pilot. | Role-restrict exact locations; no public unconfirmed status map; obtain governance/consent. |

## GO / PIVOT / STOP test

### Strongest evidence for continuing

- Jharkhand’s official assessment documents uneven FTK availability and skilled village manpower.
- JJM already provides a receiving workflow, so a validated measurement-quality complement could be deployable without inventing governance.
- Scientific authorities support conductivity as a cheap, non-specific indicator and support anomaly-triggered follow-up—not contaminant identification.

### Strongest evidence against

- The state/national apps and FTK/lab workflow already cover nearly the entire software feature set.
- EC/temperature cannot detect the contaminants of greatest health concern.
- The dominant operational bottleneck and willingness to maintain hardware are unknown.

### Biggest unresolved assumption

That source-level longitudinal EC data changes a real Jharkhand field or laboratory decision often enough to justify device, calibration, training and integration cost.

### Smallest experiment that can resolve it

Before building hardware integration, conduct 8–12 structured interviews/observations with authorized Jal Sahiyas/FTK users, a DWSD/block coordinator and laboratory staff in one area. Then run a controlled 5–10 source pilot with duplicate EC/temperature readings across at least six visits, paired reference measurements and selected laboratory/FTK checks. Predefine stop criteria for repeatability, maintenance burden, workflow value and false alarms.

## Decision

**PIVOT.** Continue only as an evidence-gated measurement QA and longitudinal anomaly companion to Jhar-Jal/WQMIS. If institutional discovery finds no unmet workflow need, or the meter fails reference/repeatability tests, change the decision to **STOP** rather than adding sensors.

