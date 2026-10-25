<h1 align="center">JalRakshak</h1>

## A visit should not end in a forgotten notebook

A worker reaches a handpump with no signal. Readings are in a notebook, photos on another phone, and the supervisor is waiting for an update. **The evidence exists—but the follow-up gets lost.**

## From a reading to the next visit

JalRakshak keeps sources, readings, photos and follow-ups together. Workers save visits offline in **IndexedDB**, then sync to **SQLite** for supervisor review. Built for teams across India, it supports **worker/supervisor roles and English/Hindi**.

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-172B36?style=flat-square&logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Offline ready" src="https://img.shields.io/badge/Offline-ready-287D74?style=flat-square" />
  <img alt="English and Hindi" src="https://img.shields.io/badge/English-हिन्दी-315B70?style=flat-square" />
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/License-MIT-7352A3?style=flat-square" /></a>
</p>

<p align="center">
  <a href="#how-it-works">Workflow</a> ·
  <a href="#inside-the-app">UI snapshots</a> ·
  <a href="#tech-stack">Tech stack</a> ·
  <a href="#bonus-esp32-integration">Hardware bonus</a> ·
  <a href="#run-it-locally">Setup</a>
</p>

## How it works

**Assign → Record offline → Save & sync → Review → Follow up**

Supervisors assign sources and visits. Workers find them by map or QR, capture readings and photos, then sync. Supervisors review the evidence, request retests and track progress through trends and reports.

**Optional AI:** voice-to-notes, source summaries and report drafts—with human review. [AI guide →](docs/field/local-ai.md)

> EC tracks changes; it does not identify contaminants or establish drinking-water safety.

## Inside the app

**Source map** — locations, visit filters and follow-up status.

![JalRakshak map with fictional source pins and follow-up status](docs/media/field-map.jpg)

**Measurement history** — reading trends, retests and quality flags.

![JalRakshak EC trends and retest evidence](docs/media/field-history.jpg)

*Screenshots use fictional practice records and illustrative locations.*

**[Watch the walkthrough →](docs/media/field-walkthrough.mp4)** · Synthetic records; earlier UI layout.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16 · React 19 · TypeScript |
| UI | Tailwind CSS 4 · Lucide |
| Backend & database | Node.js · Next.js route handlers · SQLite |
| Offline | Dexie · IndexedDB · service worker |
| Authentication | Server sessions · scrypt |
| Maps & QR | MapLibre GL · OpenStreetMap · qrcode · jsQR |
| Hardware | Web Serial · ESP32 |
| AI | Ollama · faster-whisper · MediaRecorder |
| Deployment | Docker Compose · Caddy |
| Testing | Vitest · Playwright · GitHub Actions |

## Bonus: ESP32 integration

**Capture instrument readings without retyping.** Connect a compatible ESP32 and EC probe over USB to see live readings, temperature and device status. Fresh-reading checks and saved device details help keep each capture traceable. A practice simulator lets you explore the workflow before connecting hardware.

**Connect → Capture → Review & save.** [Hardware setup →](docs/field/esp32-usb.md)

## Run it locally

Requires **Node.js 22.16+**, npm and Git.

```bash
git clone https://github.com/thisisanubhav/jalrakshak.git
cd jalrakshak
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open **http://localhost:3000**. Use the private key in `private-data/setup-key.txt` to create your supervisor account (password: 12+ characters), then add workers through **Manage team**. For development, use `npm run dev`.

Sign in online before fieldwork, use the same browser/address, and save visits before syncing. Keep backups on separate storage. [Setup & recovery →](docs/deployment/team-local.md)

**Optional setup:** [Docker server](docs/deployment/docker.md) · [Local AI](docs/field/local-ai.md) · [Docker with AI](docs/deployment/docker-ai.md)

## Guides

[Field workflow](docs/field/daily-work.md) · [Visits & reviews](docs/field/visit-operations.md) · [Monthly reports](docs/field/monthly-reports.md)

---

<p align="center">JalRakshak · <a href="LICENSE">MIT licence</a> · © 2026 thisisanubhav</p>
