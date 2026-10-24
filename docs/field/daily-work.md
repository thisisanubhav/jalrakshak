# Daily field work

Home keeps the four-destination navigation and adds a task list, ordered as:
requested retests, open investigation follow-ups, then sources without a first
measurement. Within each priority, older work appears first. These are pending
actions derived from records; the app does not invent visit dates or overdue flags.
A linked retest already recorded after the latest request opens review rather than
asking the worker to take another measurement. Closed investigations leave the queue.

Workers see tasks for records currently available in their account's device copy.
Newly created local sources are included before upload. Sync refreshes assignments;
an offline device cannot learn about a reassignment until it reconnects. Opening a
task selects the matching source; requested retests retain the investigation link.
The first five tasks are shown initially, with Show all tasks for the rest.

Source search matches identifier, name, village or district, without case sensitivity.
Village, source type and follow-up status filters combine with the search. They apply
to the source list and map; task counts continue to describe the whole workspace.
Clear source filters restores all sources. Filters do not change saved records and
are reset when changing the training/real-record scope or reopening the workspace.
“No open investigation” describes recorded follow-up, not drinking-water safety.

Supervisors open Dashboard → Investigations for the shared overview. It shows source
assignments per account, open investigations, requested retests, sources without an
active worker (including supervisor-owned and disabled-worker assignments), and the
latest 20 attributed server activity events. The authenticated overview endpoint is
supervisor-only and excludes passwords, session tokens and raw audit details.

Refresh team overview fetches a consistent server snapshot without replacing device
records or drafts. It displays the snapshot time; an unavailable refresh displays an
error and marks any previously displayed snapshot as out of date. Worker changes
appear only after upload. Use Sync now to bring shared records into the local forms.
Manage assignments and accounts opens existing team management.

## Verification

The release browser journey covers: supervisor creates/assigns accounts → authorized
worker records offline → offline reload preserves work → reconnect uploads →
supervisor sees shared activity and requests retest → worker opens linked retest
from Home → supervisor exports CSV and JSON backup → fresh browser restores evidence.
Separate release cases cover search/filter combinations, Hindi empty states,
source-specific task routing, role isolation, conflict recovery, USB/manual entry,
and responsive navigation. Unit checks include task priority/scope isolation and
server overview permissions. All browser checks run through GitHub Actions with
Chromium sandboxing and zero retries.

The app remains localhost-only. This work does not enable other devices to reach the
server; shared-network/HTTPS hosting remains a separate deployment decision.
