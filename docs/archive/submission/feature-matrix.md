> **Historical archive:** This document describes an earlier revision. Its workflow, deployment notes and test counts are not current. See the [current README](../../../README.md) and [field guide](../../field/daily-work.md).

# Feature matrix

| Capability | Status | Evidence / boundary |
|---|---|---|
| Interactive four-scenario judge walkthrough | Implemented | Deterministic, isolated, bilingual, offline after initial cache |
| Screening Demo | Demo only | Four simulated parameters and provisional statuses |
| Manual EC workflow | Experimental | Manual entry; no physical sensor connection |
| Duplicate-reading consistency | Experimental | Configurable `max(20 µS/cm, 5%)`; not a validated field tolerance |
| Source history and chart | Implemented | Incompatible records are not connected or analysed |
| Historical EC comparison | Experimental | Median of ≥3 compatible prior visits; provisional dual threshold |
| Offline persistence | Implemented | Browser IndexedDB; clearing site storage may delete data |
| CSV evidence export | Implemented | Stable columns, provenance, calibration metadata, formula hardening |
| Investigation record | Implemented | Client-side print / Save as PDF; not a laboratory certificate |
| English/Hindi primary journeys | Implemented | Technical units remain EC, µS/cm, °C |
| PWA installation and offline shell | Implemented | Supported HTTPS browsers; map tiles are not packaged offline |
| Physical measurement hardware | Not implemented | Explicitly out of software-only scope |
| Contaminant detection / safety certification | Not implemented | Scientifically inappropriate for EC-only software |
| Official Jhar-Jal/WQMIS integration | Planned only | Requires governance, API access, and stakeholder validation |
| Institutional field validation | Pending | Interview package exists; no interviews are fabricated |
