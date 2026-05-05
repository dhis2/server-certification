# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains tools and artifacts for the **DHIS2 Server Certification Program (DSCP)** — a quality assurance initiative by the HISP Centre at the University of Oslo. It enables DHIS2 server implementations to be assessed and certified against security and deployment controls aligned with industry best practices (CIS v8).

## Environment Setup

Install the required CLI tools before running any build commands:

```bash
# yq (Python-based YAML processor, wraps jq) and jq
sudo apt install yq jq

# mustache templating CLI (requires Node.js/npm)
npm install -g mustache
```

## Build Commands

Dependencies: `yq`, `jq`, and `mustache` must be installed (see Environment Setup above).

```bash
make            # Build all outputs (json + html)
make json       # Convert YAML controls to JSON → generated/dhis2-certification-v1.json
make html       # Render controls to HTML via Mustache → generated/dhis2-certification-v1.html
make clean      # Remove all files in generated/
```

## Architecture

### Source of Truth

`controls/dhis2-certification-v1.yml` is the **normative source** for all control definitions. Always edit this file when authoring or modifying controls. All other formats are derived.

### Build Pipeline

```
controls/dhis2-certification-v1.yml  (hand-edited YAML)
        |
        ├─ make json ──→ generated/dhis2-certification-v1.json
        └─ make html ──→ generated/dhis2-certification-v1.html
                         (via scripts/dscp.mustache)
```

The assessment form HTML is generated separately using `scripts/dscp_assessment.mustache` and `style/dscp_assessment.css`.

### Control Structure

Controls are organized into 8 weighted domains (PostgreSQL, Reverse Proxy, OS Security, DHIS2 Application, Tomcat, Network Security, Backup & Recovery, Governance). Each control has:
- An ID (e.g. `DB-01`, `OS-05`)
- Verification method (concrete steps for assessors)
- CIS v8 mapping
- Control type (`technical` or `organisational`)
- Control group (`DSCP1` baseline)

### Assessment Workflow

1. Assessors use the rendered assessment form (from `dscp_assessment.mustache`) to score controls on a 0–5 scale
2. Results are recorded as YAML (see `assessment/nigeria_emis.yml` for a real example)
3. Scores feed into certification decisions using Implementation Group thresholds (IG1: ≥95%, IG2: ≥90%, IG3: ≥85%)

### Key Files

| File | Purpose |
|------|---------|
| `controls/dhis2-certification-v1.yml` | Primary control definitions (edit this) |
| `controls/controls.schema.json` | JSON Schema for validating control structure |
| `scripts/dscp.mustache` | HTML template for controls reference |
| `scripts/dscp_assessment.mustache` | HTML template for interactive assessment forms |
| `style/dscp.css` / `style/dscp_assessment.css` | DHIS2-branded styling |
| `assessment/nigeria_emis.yml` | Example of a completed assessment |
| `method.md` | Full assessment methodology and scoring rules |
