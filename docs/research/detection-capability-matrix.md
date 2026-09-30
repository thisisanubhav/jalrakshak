# Detection capability matrix

This matrix is the product’s scientific guardrail. “Cheap field method?” means a method may exist; it does **not** mean a low-cost electronic sensor is validated, selective, or suitable for JalRakshak. Applicable Indian protocols and qualified oversight remain necessary.

| Parameter / hazard | Cheap field method? | JalRakshak V1 | Confirmation required? | Scientific boundary |
|---|---|---:|---:|---|
| Electrical conductivity (EC) / specific conductance | Yes, electrode meter | **Measure** raw EC and temperature-compensated EC after QA | Reference comparison for pilot; lab if an anomaly prompts investigation | Collective ionic signal; cannot identify the ion or cause. |
| EC-derived TDS estimate | Yes, derived from EC | **Optional derived display**, labelled estimate and factor | Gravimetric/approved method for compliance | Conversion is water-composition dependent; not direct TDS. |
| Temperature | Yes | **Measure as QA/compensation context** | Usually no separate referral from V1 | Affects EC and stabilization; not a general potability result. |
| pH | Yes: indicator/FTK or electrode | **Not in first hardware V1**; use approved existing FTK workflow where required | Lab/reference method when decisions require it | Useful acidity/alkalinity parameter, but electrodes need buffer calibration, storage and care. |
| Turbidity | Field turbidimeters exist; common cheap modules are problematic | **Not in first hardware V1** | Reference turbidimeter/lab when decisions require it | Measures optical scattering, not organisms or chemical identity; affected by optics, bubbles, colour/fouling. |
| Iron | Colorimetric FTK exists | **Must not claim detection** | Existing approved FTK followed by lab per programme protocol | Iron may affect colour/turbidity/EC, but those are not selective iron measurements. |
| Fluoride | Colorimetric/ion-selective field methods exist with constraints | **Must not claim detection** | Approved FTK screening and laboratory confirmation | Conductivity cannot isolate fluoride; Jharkhand occurrence is localized and disputed by scale/source. |
| Arsenic | Specialized field kits exist, with handling/QA constraints | **Must not claim detection** | Laboratory confirmation required | Hazardous trace concentration is not inferable from TDS/EC. |
| Lead | Portable analytical methods exist but not a generic EC probe | **Must not claim detection** | Accredited laboratory | Trace lead cannot be inferred from bulk conductivity. |
| Cadmium/chromium/mercury/other heavy metals | Specialized instruments/kits, generally not simple community sensors | **Must not claim detection** | Accredited laboratory | Metal-specific analysis is necessary; mining proximity is not a measurement. |
| Nitrate | Colorimetric FTK/strips exist | **Must not claim detection** | Approved method/laboratory confirmation | Ionic but non-specific; EC cannot separate nitrate from benign salts. |
| Salinity | EC can estimate broad salinity/mineralization | **Screen non-specific ionic change only** | Parameter-specific analysis where action depends on composition | EC may be useful, but factor and water type matter. |
| Total coliform / E. coli | Presence/absence field kits such as H2S are used operationally; not instant electronic sensors | **Must not claim detection or absence** | Approved bacteriological method/laboratory | Microbial safety is a critical blind spot; normal EC does not rule it out. |
| Pathogens / bacteria / viruses / protozoa | Organism-specific or indicator methods required | **Must not claim detection or absence** | Laboratory/approved microbiological testing | Turbidity and temperature are not pathogen tests. |
| Pesticides / organic micropollutants | Not with a generic low-cost probe | **Must not claim detection** | Accredited laboratory with compound-specific methods | Many are not reliably reflected in EC and occur at trace levels. |
| Residual free chlorine (treated supplies) | Yes, DPD field method/sensor | **Not V1 hardware**; existing FTK may cover it | Follow JJM operating protocol | Operational control parameter for chlorinated supplies, not applicable to every source. |
| Hardness / alkalinity / chloride | FTK titration/colorimetry exists | **Not V1 hardware** | Approved method as needed | May contribute to EC; cannot be separated by EC alone. |
| Visible colour, odour, sanitary risk | Observation/checklist | **Record sanitary inspection and observations** | Investigation/targeted testing | Observations can trigger action but cannot certify water.

## Non-negotiable claims policy

JalRakshak V1 may say:

- “A repeatable change in conductivity was observed.”
- “Repeat the measurement and follow the approved FTK/laboratory workflow.”
- “No conductivity anomaly was observed under this provisional method.”

It must not say:

- “safe,” “unsafe,” “drinkable,” “potable,” “contaminated” or “toxic” based on its sensor;
- “arsenic/fluoride/iron/lead/bacteria detected” from EC/TDS, pH, turbidity or temperature;
- “no contamination” or “water meets IS 10500” from the V1 channels.

The basis is straightforward: WHO treats TDS mainly as an acceptability parameter rather than assigning a health-based value ([WHO TDS fact sheet](https://www.who.int/publications/m/item/chemical-fact-sheets--total-dissolved-solids)); USGS defines EC as a collective ionic measurement with site-dependent TDS relation ([USGS](https://doi.org/10.3133/tm9A6.3)); and EPA found that general sensors cannot identify and quantify the broad universe of possible contaminants ([EPA](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P1014GZ4.TXT)).

## Provenance separation

Every datum must retain one origin and one method:

- `SIMULATED`: software demonstration only; excluded from pilot analysis.
- `SENSOR`: field device value plus device/calibration/QA metadata; never relabelled as laboratory data.
- `PUBLIC_DATA`: imported government/open dataset with source/version; never blended into sensor history as if locally measured.
- `LAB_CONFIRMED`: result from identified laboratory, method, sample ID and report; never inferred from a referral.

A single screening visit may contain different origins by parameter, but the UI and exports must show them per measurement. Missing hardware channels remain `NOT_CONNECTED`; they must never be filled with simulated values in a real visit.

