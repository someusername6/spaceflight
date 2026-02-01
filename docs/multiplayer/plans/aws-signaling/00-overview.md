# AWS Signaling Server Implementation Plan

## Overview

This directory contains sequential implementation plans for the AWS signaling server. Each phase is designed to be completed in a single session and builds on the previous phases.

**Reference Document:** `../aws-signaling-server.md` contains the full architecture, rationale, and detailed specifications.

**Deployment Target:** https://sunlitgrove.itch.io/spaceflight (uses `*` for CORS since itch.io serves games from `*.itch.zone` iframe domains)

## Phases

| Phase | Name | Description | Depends On |
|-------|------|-------------|------------|
| 01 | Project Setup | Directory structure, package.json, tsconfig, types | - |
| 02 | Storage Layer | DynamoDB storage adapter + unit tests | 01 |
| 03 | Rate Limiter | DynamoDB-backed rate limiter + unit tests | 01 |
| 04 | Router & Handler | Lambda entry point, routing logic + unit tests | 01 |
| 05 | Port Handlers | All API handlers ported from local server | 01-04 |
| 06 | Auto-Disable | CloudWatch alarm, EventBridge, disable Lambda | 01 |
| 07 | SAM Template | Complete infrastructure as code | 01-06 |
| 08 | Testing & Deploy | Integration tests, deployment, verification | 01-07 |

## Execution Order

Phases 02, 03, 04, and 06 can be done in parallel after Phase 01.
Phase 05 requires 02, 03, and 04.
Phase 07 requires all previous phases.
Phase 08 is final.

```
01 ──┬── 02 ──┐
     ├── 03 ──┼── 05 ──┬── 07 ── 08
     ├── 04 ──┘        │
     └── 06 ───────────┘
```

## Session Guidelines

- Each phase includes acceptance criteria
- Run unit tests before marking phase complete
- Commit after each phase with descriptive message
- Reference the main plan document for detailed specifications
