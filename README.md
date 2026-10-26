<h1 align="center">JalRakshak</h1>
<p align="center"><strong>Field evidence. Connected teams. Clear follow-up.</strong></p>
<p align="center"><sub>OFFLINE CAPTURE &nbsp; / &nbsp; TEAM REVIEW &nbsp; / &nbsp; SOURCE HISTORY</sub></p>

## The problem

A worker reaches a handpump with no signal. Readings are in a notebook, photos on another phone, and the supervisor is waiting for an update. **The evidence exists but the follow up gets lost.**

## The idea

JalRakshak keeps sources, readings, photos and follow ups together. Workers save visits offline in **IndexedDB**, then sync to a **shared database** for supervisor review. Built for teams across India, it supports **worker/supervisor roles and English/Hindi**.

<p align="center">
  <img alt="Worker and supervisor roles" src="https://img.shields.io/badge/Team-worker%20%2B%20supervisor-315B70?style=flat-square" />
  <img alt="Offline ready" src="https://img.shields.io/badge/Offline-ready-287D74?style=flat-square" />
  <img alt="English and Hindi" src="https://img.shields.io/badge/English-हिन्दी-315B70?style=flat-square" />
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/License-MIT-7352A3?style=flat-square" /></a>
</p>

<p align="center">
  <a href="#how-it-works">Workflow</a> ·
  <a href="#inside-the-app">UI snapshots</a> ·
  <a href="#tech-stack">Tech stack</a> ·
  <a href="#esp32-integration">Hardware</a> ·
  <a href="#run-it-locally">Setup</a>
</p>

## How it works

<table>
<tr>
<td width="33%" valign="top"><h3>01 · Find</h3>Assigned sources, map pins, QR labels and scheduled visits.</td>
<td width="34%" valign="top"><h3>02 · Record</h3>Readings, photos and notes. Save offline; sync when online.</td>
<td width="33%" valign="top"><h3>03 · Follow up</h3>Supervisor review, linked retests, trends and reports.</td>
</tr>
</table>

**Optional AI:** voice to notes, source summaries and report drafts with human review. [AI guide →](docs/field/local-ai.md)

> EC tracks changes; it does not identify contaminants or establish drinking-water safety.

## Inside the app

<table>
<tr>
<td width="50%"><a href="docs/media/field-map.jpg"><img src="docs/media/field-map.jpg" alt="JalRakshak source map with fictional pins and follow-up status" width="100%" /></a></td>
<td width="50%"><a href="docs/media/field-history.jpg"><img src="docs/media/field-history.jpg" alt="JalRakshak EC history with reading trends and retest evidence" width="100%" /></a></td>
</tr>
<tr>
<td><strong>Source map</strong><br/>Locations, visit filters and follow up status.</td>
<td><strong>Measurement history</strong><br/>See trends, retests and quality flags.</td>
</tr>
</table>

<sub>Click a snapshot to view full size. Fictional practice records and illustrative locations.</sub>

## Tech stack

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-172B36?style=flat-square&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-172B36?style=flat-square&logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-315B70?style=flat-square&logo=sqlite&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2468A0?style=flat-square&logo=docker&logoColor=white" />
</p>

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16 · React 19 · TypeScript |
| UI | Tailwind CSS 4 · Lucide |
| Backend & database | Node.js · Next.js route handlers · PostgreSQL (hosted) · SQLite (local) |
| Offline | Dexie · IndexedDB · service worker |
| Authentication | Server sessions · scrypt |
| Maps & QR | MapLibre GL · OpenStreetMap · qrcode · jsQR |
| Hardware | Web Serial · ESP32 |
| AI | Ollama · faster-whisper · MediaRecorder |
| Deployment | Docker Compose · Caddy |
| Testing | Vitest · Playwright · GitHub Actions |

## ESP32 integration

**From probe to visit—without retyping.** Connect a compatible ESP32 and EC probe over USB; capture readings with device evidence, then review and save.

| Live view | Reliable capture | Practice mode |
| :---: | :---: | :---: |
| EC · temperature · chart | Fresh-reading checks · device details | Isolated simulator |

[Connect your hardware →](docs/field/esp32-usb.md)

## Run it locally

> **Quick start** · Node.js 22.16+ · npm · Git

```bash
git clone https://github.com/thisisanubhav/jalrakshak.git
cd jalrakshak
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open **http://localhost:3000**. Use the private key in `private-data/setup-key.txt` to create your supervisor account (password: 12+ characters), then add workers through **Manage team**. For development, use `npm run dev`.

Sign in online before fieldwork, use the same browser/address, and save visits before syncing. Keep backups on separate storage. [Setup & recovery →](docs/deployment/team-local.md)

**Hosting:** [Vercel + Neon](docs/deployment/vercel.md) · [Docker server](docs/deployment/docker.md) · [Local AI](docs/field/local-ai.md) · [Docker with AI](docs/deployment/docker-ai.md)

## AI disclosure

AI tools assisted with code, tests, documentation and interface copy. The project owner directed scope and release decisions. [Read the full disclosure →](docs/submission/ai-use-disclosure.md)

<p align="center">
  <a href="docs/field/daily-work.md"><strong>Field guide</strong></a> &nbsp; · &nbsp;
  <a href="docs/field/visit-operations.md"><strong>Visits & reviews</strong></a> &nbsp; · &nbsp;
  <a href="docs/field/monthly-reports.md"><strong>Monthly reports</strong></a>
</p>

---

<p align="center">JalRakshak · <a href="LICENSE">MIT licence</a> · © 2026 thisisanubhav</p>
