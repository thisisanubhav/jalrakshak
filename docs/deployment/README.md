# JalRakshak deployment runbook

## Hosting and deployment model

JalRakshak is hosted on Vercel's Hobby plan as a native Next.js 16 application.
The App Router page is prerendered as static content, while Vercel retains the
Next.js runtime so response headers, framework behavior, and future compatible
changes continue to work. The project deliberately does not force
`output: "export"`: static export would remove `next.config.ts` header support
and offers no practical benefit for this deployment.

- Production URL: <https://jalrakshak-jharkhand.vercel.app>
- Framework: Next.js, auto-detected by Vercel
- Node.js: 24.x on Vercel
- Build command: `npm run build`
- Output: Next.js default
- Database/backend: none
- Required production environment variables: none

IndexedDB in the user's browser is the application's source of truth. The
Screening Demo sync adapter only simulates acknowledgement; it does not upload
records. Experimental EC visits remain local until the user exports CSV.

## Preview workflow

1. Authenticate without exposing tokens: `vercel whoami`.
2. Run the complete local verification suite.
3. Create a preview: `vercel`.
4. Inspect the deployment: `vercel inspect <preview-url> --logs`.
5. Run browser tests against it:

   ```bash
   PLAYWRIGHT_BASE_URL=https://preview.example.vercel.app npm run test:e2e:ci
   ```

6. Check headers with `curl -I <preview-url>` and test the actual page in a
   browser. Preview deployments are public for judge QA, so they must never
   contain private pilot data or credentials.

## Production workflow

Promote only the preview artifact that passed browser, offline, responsive, and
header QA:

```bash
vercel promote <preview-url> --yes
```

After the promotion reports `Ready`, verify the stable production URL rather
than relying on the CLI result. Re-run the deployed Playwright suite and inspect
the browser console. Updating README's public URL is allowed only after this
verification succeeds.

## Security headers

`next.config.ts` applies the following to all paths:

- Content Security Policy limited to the same origin plus OpenStreetMap's tile
  host; workers permit same-origin and blob workers for PWA/MapLibre behavior.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Permissions Policy allowing same-origin camera/geolocation and denying the
  microphone
- Next.js `X-Powered-By` identification disabled

The static CSP uses `unsafe-inline` for scripts/styles because Next.js emits
inline bootstrap data and MapLibre applies inline presentation. It does not use
`unsafe-eval` in production. A nonce-based CSP was intentionally not chosen:
Next.js 16 requires dynamic rendering for per-request nonces, which would remove
static prerendering and add server/runtime cost to this backend-free demo.

Vercel supplies HTTPS and HSTS. Map tiles require
`https://tile.openstreetmap.org`; tile failures fall back to the locally stored
source list rather than blocking the field workflow.

## PWA and service-worker behavior

`public/manifest.webmanifest` provides the name, start URL, `/` scope,
standalone display mode, theme metadata, and 192/512 px icons. The service
worker remains at the stable URL `/sw-v2.js`; its internal cache name is
versioned. Keeping the script URL stable lets an already installed application
discover new deployments.

The service worker uses:

- network-first navigation, with the cached `/` shell as the offline fallback;
- cache-first same-origin scripts, styles, workers, images, and fonts;
- network-only cross-origin map tiles so an unavailable tile cannot be replaced
  with invalid application HTML;
- cache cleanup during activation; and
- `skipWaiting()` plus `clients.claim()`.

When an existing controlled page detects an activated update, it displays a
reload action. It never reloads automatically, so there is no reload loop. The
cache update does not delete or migrate IndexedDB records.

### Install from a supported browser

1. Open the production HTTPS URL.
2. In Android Chrome, use **Install app** or **Add to Home screen**.
3. Launch JalRakshak from the installed icon.
4. Open it once while online before relying on the offline shell.

Browser and operating-system install prompts vary. iOS support depends on the
Safari version and its Add to Home Screen behavior.

## Local-data and privacy limitations

- Records are stored only in the current browser profile/device.
- Clearing site data, using private browsing, or losing the device may delete
  all records.
- There is no encrypted remote backup or cross-device synchronization.
- Records are not automatically shared with JJM, WQMIS, Jhar-Jal, a government
  department, or a laboratory.
- Users must not enter personal information in the public demo.
- Coordinates and photographs can reveal sensitive source/location details.
- CSV export is the only extraction path for Experimental EC records.

The application states these limitations in both English and Hindi. It does not
claim browser storage is encrypted or backed up.

## Offline and update QA

Production QA must cover:

1. open online and wait for the service worker;
2. go offline;
3. register/select a source, record and save a measurement;
4. refresh and confirm the result/history remains available;
5. reconnect and confirm no duplicate record appears; and
6. deploy a new cache version, reload, and confirm IndexedDB records survive.

Round 7 verified a version-A to version-B update using a persistent browser
profile: cache `jalrakshak-shell-v2` was replaced by
`jalrakshak-shell-v3`, while one source, one device, and one EC measurement
remained present.

## Rollback

List deployments and identify the last verified production deployment:

```bash
vercel ls jalrakshak
vercel inspect <deployment-url>
```

Then roll back deliberately:

```bash
vercel rollback <verified-deployment-url> --yes
```

Verify the stable production URL after rollback. A code rollback does not roll
back or delete IndexedDB, but schema compatibility must be checked before
shipping any future database migration.

## Known limitations

- There is no authenticated production sync or remote backup.
- Map tiles are not packaged for offline use.
- Direct stakeholder validation remains pending.
- All Screening Demo values are synthetic; Experimental EC values are manual.
- PWA installation UI varies by browser and platform.
- The CSP still permits inline scripts/styles for framework compatibility.
- Vercel preview/deployment URLs are public for QA; only synthetic data belongs
  in this project.

