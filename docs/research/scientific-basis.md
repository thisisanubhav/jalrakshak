# Scientific basis and screening-logic audit

## Bottom line

TDS/conductivity plus temperature is **not a drinking-water safety test**. It can be a useful, low-cost measurement of ionic change when collected repeatably at the same source, corrected to a reference temperature, and interpreted against that source’s own history. Its defensible role is **non-specific anomaly screening followed by repeat measurement and, where warranted, the existing FTK/laboratory pathway**.

The likely first prototype is justified only as a field-method experiment: can trained workers obtain sufficiently repeatable specific-conductance measurements to detect meaningful source-level change? It is not yet justified as a classifier of “normal water” versus “contamination.”

## What EC and TDS actually measure

Electrical conductivity (EC) is the capacity of water to conduct current due to mobile ions. “Specific conductance” is conductivity normalized/reported at 25°C. EC is therefore an indirect measure of the collective concentration and mobility of dissolved ions, not a chemical inventory. The relation between EC and gravimetric TDS depends on the ionic mixture and is best established for the individual site or water type ([USGS, 2019](https://doi.org/10.3133/tm9A6.3)).

TDS is the combined mass of dissolved inorganic salts—principally calcium, magnesium, potassium, sodium, bicarbonate, chloride and sulfate—plus small amounts of dissolved organic matter. WHO has not set a health-based TDS guideline because reliable evidence of health effects at levels found in drinking water is unavailable; high TDS is principally an acceptability/mineralization signal ([WHO, 2022](https://www.who.int/publications/m/item/chemical-fact-sheets--total-dissolved-solids)).

A cheap “TDS meter” normally measures EC and applies a conversion factor. JalRakshak must store the **raw EC in µS/cm, reference temperature, compensation method and device factor**. A displayed TDS estimate in mg/L must be labelled “EC-derived estimate,” never presented as a direct laboratory TDS determination.

## What elevated or changing EC can mean

A change can reflect different proportions or amounts of dissolved ions from geology, salinity, mixing, runoff, sewage, fertilizer, mine drainage or treatment/distribution conditions. It does not reveal which cause applies. US EPA reached the same general conclusion for contamination-warning sensors: broad water-quality sensors cannot identify and quantify the many possible contaminants, but unusual changes can trigger targeted sampling and analysis ([EPA sensor evaluation](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P1014GZ4.TXT)).

This makes a source-specific time series more defensible than an absolute health claim. Even then, an anomaly is a **change requiring investigation**, not proof of contamination.

## What EC/TDS cannot detect or rule out

EC/TDS cannot specifically identify arsenic, lead, iron, fluoride, nitrate, mercury, pesticides, pathogens or bacteria. Some ionic contaminants may influence total conductivity at sufficiently large concentrations, but the signal is non-unique and can be masked by benign major ions. Microorganisms and many trace contaminants can be hazardous at concentrations far below any reliably interpretable change in bulk conductivity. A normal-looking EC/TDS result therefore cannot rule them out.

This is particularly important in Jharkhand: localized studies identify parameter-specific risks—iron/TDS in one Koderma block ([Singh et al., 2022](https://doi.org/10.1007/s13201-022-01587-6)), metals in mining-affected East Singhbhum ([Singh et al., 2018](https://doi.org/10.1016/j.chemosphere.2018.04.060)), and older microbial findings around Ranchi ([Kerketta et al., 2015](https://microbiologyjournal.org/bacteriological-analysis-of-drinking-water-from-different-sources-in-and-around-ranchi-jharkhand/)). None of those hazards can be characterized by TDS alone.

## Temperature: supporting measurement, not a safety parameter

Conductivity changes with temperature. USGS reports that EC commonly changes about 0.5–3% per °C depending on ionic composition, and field meters usually normalize to 25°C using a compensation model ([USGS, 2019](https://doi.org/10.3133/tm9A6.3)). Temperature is therefore necessary for:

- temperature compensation and reproducibility;
- detecting whether the probe/sample has stabilized;
- documenting unusual sampling conditions.

Temperature alone is not a general drinking-water safety classification in IS 10500 and should not be a prominent independent `RETEST` or `LAB_REFERRAL` trigger. It may be displayed as measurement context, not as evidence that drinking water is safe or hazardous.

## Measurement quality requirements

Before a reading can enter screening logic, V1 must record and enforce:

1. Device ID, firmware/provider and operator.
2. Calibration/check standard lot, value, date, expiry and outcome.
3. Raw EC, water temperature, compensated EC at 25°C, compensation algorithm/factor and any derived TDS factor.
4. Source, sample point, method (direct/container), flush/rinse notes, date/time and season/rain context.
5. At least two stabilized readings; a third when the first two disagree beyond a pilot-validated tolerance.
6. Probe-cleaning state, sensor error and out-of-range state.
7. Data origin (`SENSOR`, `SIMULATED`, `LAB_CONFIRMED`) without mixing them.

USGS field guidance requires calibration/checks, correct immersion, removal of bubbles, equilibration, rinsing and recorded QA information ([specific-conductance method](https://doi.org/10.3133/tm9A6.3)). A systematic review found that relatively few low-cost-sensor papers compare against reference instruments and emphasizes calibration, maintenance, handling, fouling and environmental interference ([Pino et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10181703/)). The pilot must therefore estimate repeatability and bias against a reference meter/laboratory rather than trusting a component datasheet.

## pH roadmap

**Recommendation: V2, not V1 hardware.** pH materially broadens field context and is already present in FTKs and the JJM ecosystem, but glass-electrode pH measurement creates a substantial care burden. Electrodes require buffer calibration, appropriate storage solution, cleaning, stable temperature and replacement. USGS requires performance checks before field trips and at field sites and describes careful electrode storage/maintenance ([USGS pH method](https://pubs.usgs.gov/tm/09/a6.4/tm9a6.4.pdf)).

Add pH only after a pilot shows that intended users can maintain calibration and the result adds a decision that existing FTK pH does not already provide. A cheap analog module is not enough.

## Turbidity roadmap

**Recommendation: not yet; evaluate a validated handheld method after EC pilot.** Turbidity is operationally relevant to treatment, disinfection and acceptability, but is not organism-specific ([WHO turbidity review](https://www.who.int/publications/i/item/WHO-FWC-WSH-17.01)). Common low-cost optical modules can have ambient-light interference, weak resolution in the low-NTU range, waterproofing problems and fouling ([Kelley et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9209475/)).

A future turbidity channel should use a closed optical geometry, traceable standards, blank/check procedures and comparison with a reference turbidimeter. Until then, sanitary inspection and an approved FTK/lab test are preferable to an unvalidated sensor value.

## Audit of current provisional rules

Current file: `src/domain/screening-config.ts`.

| Current rule | Comparison with authoritative material | Finding |
|---|---|---|
| pH retest outside 6.5–8.5 | Matches the IS 10500 acceptable range; standard says no relaxation | Numerically recognizable, but a cheap field sensor has not been validated and a compliance boundary is not automatically a three-state workflow. |
| pH referral outside 5.5–9.5 | No supporting value identified in the reviewed authorities | Demo-only and scientifically unsupported. |
| TDS retest above 500 mg/L | Matches the 2012 IS 10500 acceptable value | Must not imply health risk; if sensor-derived, it is an EC estimate. |
| TDS referral above 1,200 mg/L | IS 10500’s cited permissible-in-absence-of-alternate-source value is 2,000 mg/L, not 1,200 | 1,200 is an unsupported demo heuristic. |
| Turbidity retest above 5 NTU | IS 10500 acceptable is 1 NTU and permissible in absence of alternate source is 5 NTU | Current “normal” band conflates acceptable and permissible concepts. |
| Turbidity referral above 10 NTU | No supporting value identified for this decision | Unsupported demo heuristic. |
| Temperature retest/referral bands | No IS 10500 drinking-water limit identified | Remove from future safety/status logic; use for compensation/QA. |

The BIS document distinguishes acceptable values from permissible values in the absence of an alternate source; those are regulatory/service concepts, not labels for `NORMAL_SCREENING`, `RETEST` and `LAB_REFERRAL` ([IS 10500:2012](https://www.bis.gov.in/other/DrinWatIS10500.pdf)). The current rules should remain visibly `DEMO / PROVISIONAL` and must not be used in a field pilot.

## Recommended decision model

```text
Identify source and sampling point
  ↓
Calibration/check valid and sensor healthy?
  ├─ no → INVALID MEASUREMENT; do not classify water
  └─ yes
       ↓
Collect two stabilized, compensated readings
  ↓
Readings agree within pilot-validated tolerance?
  ├─ no → repeat after cleaning/rinsing; unresolved → instrument review
  └─ yes
       ↓
Is a source-and-season baseline mature?
  ├─ no → BASELINE BUILDING; record only; use sanitary inspection/FTK protocol
  └─ yes
       ↓
Transparent anomaly rule exceeded?
  ├─ no → NO EC ANOMALY OBSERVED (not “safe”)
  └─ yes → repeat visit/check device → if persistent, route to existing FTK/lab workflow
```

Absolute BIS values may be displayed as contextual reference only after governance review and only with the exact parameter/method. They should not be transformed into “unsafe” language.

## Historical baseline model

Longitudinal monitoring is scientifically plausible as an early-warning approach. EPA systems use changes in non-specific parameters such as conductivity and pH to flag anomalies for further sampling, explicitly because sensors cannot identify the contaminant ([EPA, 2019](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P1014GZ4.TXT)). WHO advises that monitoring frequency account for stability and seasonal variation, including rainy-season effects ([WHO, 2024](https://www.who.int/publications/i/item/9789240088740)).

No universal “minimum baseline” was found that can be transferred to Jharkhand handpumps. Proposed pilot rule—not a validated standard:

- obtain **at least 6 visits spanning both pre-monsoon and monsoon/post-monsoon conditions**, each with duplicate stabilized readings;
- calculate median and median absolute deviation separately by relevant season if variation warrants it;
- do not alarm until repeatability and device bias are known;
- initially flag only large, persistent changes using a preregistered rule (for example both an absolute change above device uncertainty and a robust relative deviation from baseline);
- require a same-visit repeat and an independent follow-up before referral unless sanitary inspection or an approved FTK identifies an immediate concern;
- validate every candidate rule against paired reference/laboratory measurements and track false positives/negatives.

The “six visits” is a pilot design choice to estimate variability, not a scientific threshold. Seasonal stratification and uncertainty matter more than a magic sample count.

