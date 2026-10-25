> **Historical archive:** This document describes an earlier revision. Its workflow, deployment notes and test counts are not current. See the [current README](../../../README.md) and [field guide](../../field/daily-work.md).

# Software-only architecture

```mermaid
flowchart TD
  UI[English / Hindi PWA UI] --> MODE{Isolated mode}
  MODE --> SCREEN[Screening Demo]
  MODE --> EC[Experimental EC]
  MODE --> JUDGE[Interactive Judge Demo]
  SCREEN --> SIM[Deterministic simulated provider]
  SIM --> RULES[Provisional screening rules]
  EC --> MANUAL[Manual EC provider]
  MANUAL --> QUALITY[Repeatability engine]
  QUALITY --> HISTORY[Context-compatible history comparison]
  JUDGE --> SNAP[Deterministic synthetic scenario module]
  SNAP --> QUALITY
  RULES --> IDB[(IndexedDB: screening tables)]
  HISTORY --> ECDB[(IndexedDB: EC tables)]
  JUDGE --> DEMODB[(IndexedDB: isolated judge snapshots)]
  ECDB --> EXPORT[CSV export]
  DEMODB --> REPORT[Print-ready investigation report / CSV]
  IDB --> MAP[Map / dashboard / referral demo]
  SW[Versioned service worker] --> UI
```

## Boundaries

- The UI consumes provider contracts; no physical provider is implemented.
- Screening, manual experimental, and synthetic judge records are stored separately.
- History comparison accepts only compatible records with the same explicit origin.
- Map tiles are network-dependent, but local records and fallback lists remain available offline.
- There is no production backend, authentication layer, official integration, or cloud upload.
