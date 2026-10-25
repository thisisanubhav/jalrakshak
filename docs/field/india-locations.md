# India-wide source locations

New source registration uses native State / Union Territory and dependent District dropdowns, styled like the other form fields. Reopen either dropdown to choose a different value; desktop keyboards also support jumping by typing. Changing state clears district. Village / Town stays free text. Labels are English/Hindi; place names use the official directory's English spelling.

The app bundles the [National Portal of India district directory](https://www.india.gov.in/directory/web-directory/districts), sourced there from IGOD. Retrieved 25 October 2026: 36 states/UTs, 784 district website entries. It works offline after loading the updated app online. This is a dated website-directory snapshot, not a live administrative-boundary register; new districts or renamed districts may lag. Do not substitute a different district when an entry is missing. Refresh and review the dataset first.

Run `node scripts/update-india-locations.mjs` to fetch a new snapshot through the portal's public directory endpoint. Review its diff against the official source, update the snapshot assertions/documentation, and test import, sync, and restore. Never remove an older district spelling without a migration plan for saved records.

Existing sources retain their district text and display “Not specified” for state. Editing other fields does not require mapping that location. Selecting a state requires a matching listed district. No location is inferred from village, district, or GPS. Existing saved drafts accept the added state field without losing prior values.

CSV imports accept an optional `state` column. When provided, state and district must be a valid pair; matching ignores case and surrounding whitespace, and stores official spellings. Old CSVs without state still import as unspecified. The template includes state. Import previews, source details, field CSVs, monthly report filters/exports, and monthly AI evidence selection include state. JSON backups and team sync preserve state; old backups remain readable.

Source filters include state, district, and unspecified-state records. Monthly reports use the same state/district restrictions for local totals and server AI drafts. Sync before generating a shared report.
