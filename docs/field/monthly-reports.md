# Monthly reports

Open **Dashboard → Reports → Monthly reports**. Choose a month and optional
village, source, or source-operator reference. CSV contains summary counts,
scheduled occurrences, individual readings and review states, operator totals,
and sources without a visit. Print uses the same selection; choose Save as PDF in
the browser print dialog. CSV is an evidence export, not a restorable backup.

Reports work offline on the records available to the current account and scope.
Sync first for the latest team data. Workers see their downloaded sources;
supervisors see their downloaded team records. Unsynced device records are included.
Operator references are entered by users, not verified account identities. The
operator filter uses the source's operator reference; activity totals use each
visit's recorded operator. These may differ after a handover.

Visit inclusion uses measurement dates in the device's local calendar. Reviews and
pending retests use their last event through the selected month end (or today).
Quality flags and unusual readings use the saved measurement evaluations; they
do not certify water safety. Readings and differences from preceding comparable
visits provide the month's trend evidence.

Scheduled totals enumerate one-time, weekly and monthly dates in the month, with
month-end clamping and inclusive end dates. Only linked saved visits complete a
scheduled occurrence. Missing past occurrences are overdue; today/future dates
remain due/upcoming. Totals are based on **current source plans and metadata**:
replaced or removed plans cannot be reconstructed, and this is not an immutable
historical attendance ledger. Coverage refers to the current filtered source list.

Empty selections show zero visits and retain the applicable source coverage.
CSV cells are quoted and formula-like text is neutralized for spreadsheet safety.
