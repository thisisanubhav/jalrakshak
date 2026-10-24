# Visits, evidence and review

## Daily visits

A supervisor opens a source card on Home and expands **Visit schedule** to assign
a calendar date and instructions. The date is shared with the source's assigned
worker on sync. Home separates Today, Overdue, Upcoming and Completed visits.
Dates follow the device's local calendar. Open **Record this visit** from the
schedule to link the saved visit to that task. A general unscheduled measurement
does not silently complete a scheduled task. Rescheduling creates a new task ID;
old visits retain their original link. Workers cannot change dates through sync.
The personal archive can manage its own dates without a team account.

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

The app remains localhost-only; multiple physical devices still need a shared
reachable HTTPS server. Hardware acceptance is separate. Sync and JSON backup keep
the existing 50 MB payload limit; repeated photo visits increase storage use. Keep
external backup copies before clearing browser data.

Unit coverage checks calendar boundaries, invalid photos, correction chains,
review permissions and immutability, real QR encode/decode, and complete evidence
backup recovery. Release browser cases exercise scheduled photo visits with an
offline reload and restore, offline QR image scanning, and supervisor/worker
correction handoff. No PR is required for the manual validation workflow. Vercel
Git deployments are disabled in vercel.json while localhost is the chosen target.
