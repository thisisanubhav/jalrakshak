> **Historical archive:** This document describes an earlier revision. Its workflow, deployment notes and test counts are not current. See the [current README](../../../README.md) and [field guide](../../field/daily-work.md).

# JalRakshak — software-only project summary

## Problem

Field conductivity observations can lose meaning when repeated readings, device context, calibration metadata, and prior source visits are not captured together. Connectivity constraints can add delayed or duplicate data entry. EC alone cannot identify a contaminant or determine whether water is safe.

## Target user

A trained field worker or researcher recording repeatable measurements. Communities using the source are beneficiaries, while accredited laboratories and official water-quality authorities remain responsible for confirmation and corrective action.

## Existing ecosystem and narrow gap

Jharkhand and Jal Jeevan Mission already use community surveillance, Field Test Kits, laboratories, Jhar-Jal, and WQMIS. JalRakshak does not replace them. Its experimental contribution is an offline companion for measurement repeatability, source-level history, context-compatible comparison, and evidence export. Direct institutional validation of this gap remains pending; see [Round 3 research](../../research/existing-water-quality-system.md) and [Round 4 validation criteria](../../validation/decision-criteria.md).

## Software solution

- Register or select a durable water-source identity.
- Record manual experimental EC and temperature with device/calibration metadata.
- Check duplicate-reading consistency and request a third reading on disagreement.
- Save records in browser IndexedDB without connectivity.
- Compare only scientifically compatible visits against a source-specific historical median using explicit provisional software rules.
- Export CSV or a print-ready investigation record for further review.
- Explore four isolated synthetic scenarios without altering user-entered records.

## Technical architecture

Next.js 16 and React 19 provide an installable bilingual PWA. Domain modules isolate repeatability, comparison, simulation, provenance, CSV, and report preparation. Dexie/IndexedDB stores Screening Demo, Experimental EC, and interactive judge scenarios in separate tables. No account, backend, external API, or physical hardware is required.

## Scientific and validation boundaries

JalRakshak does not test water, detect contaminants, certify potability, replace a laboratory, or submit an official referral. Its repeatability and historical-change values are provisional software assumptions. Synthetic scenarios are clearly labelled and fictional. Direct stakeholder validation is pending, and no achieved social impact is claimed.
