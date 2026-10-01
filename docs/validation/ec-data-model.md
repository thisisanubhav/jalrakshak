# Future EC validation data model

Design only; not implemented. The model prioritizes immutable raw observations, quality-control lineage and strict provenance separation.

## Entities

### Source

| Field | Purpose |
|---|---|
| `source_id` | Internal UUID mapped to an approved durable external source identifier. |
| `official_source_id` | Jhar-Jal/WQMIS/local ID where authorized; nullable, never guessed. |
| `sampling_point_id` | Distinguishes source outlet, treatment outlet, storage and tail-end point. |
| `source_type` | Controlled vocabulary. |
| `location` | Access-controlled coordinates with accuracy/provenance. |
| `identity_status` | `CONFIRMED`, `NEEDS_REVIEW`, `DUPLICATE_CANDIDATE`. |

### Device / probe

| Field | Purpose |
|---|---|
| `device_id`, `probe_id` | Stable asset identifiers. |
| `model`, `serial`, `firmware` | Traceability. |
| `unit`, `range`, `resolution` | Interpretation and compatibility. |
| `compensation_method`, `compensation_coefficient` | Reproduce compensated EC. |
| `assigned_custodian_role` | Ownership without storing unnecessary personal identity. |
| `service_status` | `ACTIVE`, `QUARANTINED`, `OUT_OF_SERVICE`, `RETIRED`. |

### Calibration/check event

| Field | Purpose |
|---|---|
| `calibration_id` | UUID referenced by visits/readings. |
| `device_id`, `probe_id` | Instrument lineage. |
| `event_type` | `CALIBRATION`, `PRE_CHECK`, `POST_CHECK`, `SERVICE_CHECK`. |
| `standard_value_us_cm`, `standard_temperature_c` | Reference condition. |
| `standard_lot`, `standard_expires_at` | Standard traceability. |
| `observed_value_us_cm`, `tolerance_rule_version` | Check result. |
| `status` | `PASS`, `FAIL`, `INVALID`. |
| `performed_at`, `operator_role` | Audit context. |

### Visit

| Field | Purpose |
|---|---|
| `visit_id`, `source_id`, `sampling_point_id` | Immutable identity. |
| `operator_role` | Role, not personal details in export. |
| `device_id`, `probe_id`, `calibration_id` | QA linkage. |
| `measured_at` | Actual capture time with timezone. |
| `season_context`, `recent_rainfall_context` | Interpretation. |
| `flush_method`, `flush_duration_or_count` | Source conditioning. |
| `sanitary_inspection_id`, `source_event_notes` | Non-sensor context. |
| `offline_created_at`, `synced_at` | Offline/sync audit. |
| `workflow_version`, `protocol_version` | Reproducibility. |

### EC reading

| Field | Purpose |
|---|---|
| `reading_id`, `visit_id` | Immutable reading identity. |
| `reading_sequence` | 1, 2 or optional 3. |
| `raw_ec_us_cm` | Raw instrument EC. |
| `temperature_c` | Simultaneous water temperature. |
| `compensated_ec_25_us_cm` | Device/algorithm output at 25°C. |
| `stabilization_time_s` | Time until protocol stability. |
| `stability_evidence` | Optional compact series/statistic, never fabricated. |
| `data_origin` | Strict enum below. |
| `captured_at` | Reading timestamp. |

### Measurement assessment

| Field | Purpose |
|---|---|
| `visit_id` | One assessment per version. |
| `agreement_status` | `AGREES`, `DISAGREES`, `NOT_EVALUATED`. |
| `measurement_quality` | Protocol states such as `VALID_BASELINE_CANDIDATE` or `INVALID_UNSTABLE`. |
| `quality_rule_version` | Exact experimental rule. |
| `historical_comparability` | `COMPARABLE`, `CONTEXT_DIFFERENT`, `INSUFFICIENT_HISTORY`. |
| `descriptive_change` | Nullable descriptive output; not a contaminant status. |
| `review_status`, `reviewer_role` | Supervisor disposition. |

### Official confirmation link

| Field | Purpose |
|---|---|
| `visit_id` | Field context. |
| `official_sample_id` | Identifier from authorized system. |
| `receiving_laboratory_id` | Mapped lab. |
| `requested_by_role`, `requested_at`, `received_at` | Chain of workflow. |
| `lab_report_reference` | Controlled link/reference, not copied interpretation. |
| `lab_status` | Separate from sensor assessment. |

## Provenance enum

- `SIMULATED`: demo/training; excluded from all real baselines and pilot decisions.
- `REAL_SENSOR`: field device reading with device/calibration lineage.
- `PUBLIC_DATA`: external dataset with publisher, URL/version, geographic/time resolution and licence.
- `LAB_CONFIRMED`: parameter-specific laboratory result with sample, lab and method/report lineage.

These origins may appear in one source view but never in one numeric baseline. `LAB_CONFIRMED` is not assigned because a request was created.

## Integrity rules

- Raw readings are append-only; corrections create a versioned assessment.
- Unique IDs make offline replay idempotent.
- A visit cannot be `VALID_*` without passing calibration/check linkage and required readings.
- A failed post-check can quarantine a range of visits without deleting them.
- Source deduplication is a reviewable merge/mapping action, not coordinate proximity alone.
- Comparison queries require compatible source, sampling point, origin, unit, method and quality state.
- Exact private coordinates and identities are excluded from public/demo exports.

