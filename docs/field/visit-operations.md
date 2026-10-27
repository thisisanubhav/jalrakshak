# Visits, evidence and review

## Bulk source import

On Home, supervisors expand **Import sources from CSV**. The personal archive can
also import sources; worker accounts keep individual source registration. Download
the template, fill one source per row, then upload it. Required columns are `code`,
`name`, `village`, `district`, `category`, `operator`; optional columns are
`state`, `latitude`, `longitude`, `location`. When state is supplied, it must
match the supported state directory and the district must belong to that state.
The downloaded template includes state. Use HANDPUMP, WELL, TAP, BOREWELL or OTHER for
category. Supply both coordinates or neither. Quoted commas, escaped quotes and
multiline cells are supported. Limit each file to 500 sources and 1 MB.

Review the source preview. Errors identify the CSV record and reason. Edit CSV
content and preview again, or correct the spreadsheet and upload it again. Nothing
saves until **Confirm source import**. Every row must be valid; existing codes and
duplicates within the file are rejected ignoring case and surrounding spaces.
Imports never overwrite sources or create readings. The complete batch saves in
one device transaction, with duplicates rechecked at confirmation. It works
offline and persists after refresh. Sync before assigning imported sources through
Manage team. Importing does not assign sources to workers automatically.

## Daily visits

A supervisor opens a source card on Home and expands **Visit schedule** to assign
a calendar date and instructions. The date is shared with the source's assigned
worker on sync. Home separates Today, Overdue, Upcoming and Completed visits.
Dates follow the device's local calendar. Open **Record this visit** from the
schedule to link the saved visit to that task. A general unscheduled measurement
does not silently complete a scheduled task. Rescheduling creates a new task ID;
old visits retain their original link. Workers cannot change dates through sync.
The personal archive can manage its own dates without a team account.

Choose **Repeat visit** → Weekly or Monthly to create a recurring series. An
optional **Last due date** ends the series inclusively. Monthly dates retain the
original day: a January 31 schedule is due February 28 (29 in leap years), then
March 31. Completing a linked occurrence reveals the next one without changing
the supervisor's plan. This calculation works offline and after sync or restore.
An overdue occurrence stays overdue until recorded; the app does not silently
skip missed dates. The Completed group includes one-time visits and recurring
series whose last occurrence was completed. Indefinite series always have a next
occurrence. Saving a changed date/repeat rule starts a new series; removing the
plan stops new tasks but keeps previous visit evidence.

## Visit photos

Record Measurement accepts up to three JPEG, PNG or WebP photos (10 MB maximum
input each). It resizes and re-encodes them locally, removing original EXIF data,
and limits each stored image to 400,000 data-URL characters. Add captions and the
visit's field notes. Photo drafts use account-specific IndexedDB and survive
an offline refresh; text drafts use the existing account-specific draft storage.
Saving retains the photos as immutable visit evidence. They appear in History and
printed reports and travel in team sync and JSON backup/restore. CSV includes
photo IDs and captions, not image bytes. Avoid photographing faces or documents.
A failed image/storage operation is shown and never reported as a successful save.

## Supervisor review

Dashboard > Investigations includes **Visit review queue**. New saved visits start
as Submitted for review. Supervisors can mark Needs corrections or Reviewed and
must supply a note. Review events are append-only and the server checks the
signed-in supervisor's attribution. Worker accounts cannot write review decisions.
The queue uses the device's current records: sync to receive submissions or share
decisions. Review is an administrative check, not a drinking-water safety result.

Workers open Needs corrections and choose Record corrected visit. The replacement
is a new immutable visit linked to the original. The original remains visible with
its correction request and shows Replacement visit submitted. The new visit enters
the Submitted group for its own review. Review history is preserved in JSON and CSV
backups/reports. Existing source-edit conflict handling also protects schedules and
review evidence; refresh stale source edits before retrying.

## QR labels

Expand Source QR label on a source card and download its SVG for printing. QR data
contains only a stable JalRakshak source ID, not a URL, precise location or account
credentials. Use Scan source QR in the app to scan with a camera, select a QR image,
or enter the printed source identifier. Generation and decoding work offline.
The source must already exist in the signed-in account's device copy. Unknown or
unassigned sources are not loaded through the scanner, and external URLs are never
followed. Camera access is requested only after Start camera; closing the scanner,
leaving Home or pressing Stop camera releases the stream. Camera denial has image
and manual fallbacks. A camera requires localhost or a secure HTTPS deployment.

## Trends

History plots readings by measurement timestamp, with date-range controls and an
accessible table. Circles show repeatable values; crosses show the actual individual
readings from disagreement visits rather than inventing a representative value.
Purple rings identify linked retests. Amber flags visits excluded from trusted
comparison. Lines only join adjacent eligible visits. The table retains timestamps,
raw readings, retest/correction markers and exclusion reasons. EC trends do not
identify contaminants or establish drinking-water safety.

## Scope and verification

The hosted app uses Vercel and Neon PostgreSQL, allowing workers to sync from
different devices over HTTPS. Local installations need a shared reachable HTTPS
server for use across devices. See the [deployment guide](../deployment/README.md). Hardware acceptance is separate. Sync and JSON backup keep
the existing 50 MB payload limit; repeated photo visits increase storage use. Keep
external backup copies before clearing browser data.

Unit coverage checks calendar boundaries, invalid photos, correction chains,
review permissions and immutability, real QR encode/decode, and complete evidence
backup recovery. Release browser cases exercise scheduled photo visits with an
offline reload and restore, offline QR image scanning, and supervisor/worker
correction handoff. No PR is required for the manual validation workflow. Vercel
Git-triggered deployments remain disabled in `vercel.json`; hosted releases are
deployed explicitly after review and verification.
