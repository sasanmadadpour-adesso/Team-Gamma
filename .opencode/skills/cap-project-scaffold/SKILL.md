---
name: cap-project-scaffold
description: >-
  Creates or extends SAP CAP projects using the official CDS CLI
  (cds init, cds add). TRIGGER when: user asks to "start a CAP project",
  "scaffold", "bootstrap", "init a project", "set up CAP"; mentions
  cds init, cds add, cds add hana / sqlite / postgres, cds add xsuaa,
  cds add mta, cds add destination, cds add messaging, cds add
  approuter, cds add handler, cds add data, cds add tiny-sample,
  cds add tenant-db, cds add toggles; project is missing
  package.json / mta.yaml / xs-security.json or they need to be
  generated; adding BTP deployment artifacts. SKIP: for edits to an
  already-scaffolded tree (use cap-development), for creating a Fiori
  UI app (use fiori-generator-cli), and for inspecting a deployed
  project on CF (use cap-cloud-foundry).
---

# CAP project scaffolding (adesso overlay)

## Use the official `cap-developer` skill for the mechanics

The **`cds init` / `cds add` workflow is owned by SAP's official `cap-developer` skill**
(installed via `npx skills add https://github.com/capire/skills.git`) — runtime flags,
feature names, incremental feature-adding (only when needed), `cds add data --keys-only`, never
running `cds add sample`, and the current CLI options. **Defer to it** rather than restating command syntax here (feature names
change with the CDS distribution — always prefer `cds init --help` / `cds add --help`).

## Mandatory rule

**Never** greenfield a CAP project by hand-assembling `package.json`, `mta.yaml`,
`xs-security.json`, service folders, or boilerplate config from memory. Use `cds init` for new
projects and `cds add` for features — per `cap-developer`.

## adesso deltas

- **BTP deployment target defaults.** adesso projects deploy to Cloud Foundry via MTA. Per
  `cap-developer`, add deployment facets **only when deployment is requested** — then use the
  adesso standard stack in one go: `cds add mta,hana,xsuaa`. Until then the project runs
  locally on in-memory SQLite and mocked auth (airplane mode). Add `destination` when the app
  starts consuming an external service (see the official **`cap-add-remote-service`** skill and
  `cap-development/references/external-service-consumption.md` for the profile-scoped
  destination config).
- **Never run `cds add sample`** (official rule) — not even on request; offer
  `cds add tiny-sample` if the user wants a minimal starter model.
- **Hand-offs after scaffolding:**
  - Backend edits (handlers, CDS models) → **`cap-development`**.
  - Fiori/UI apps → **`fiori-generator-cli`** (Yeoman / Application Generator), never hand-built
    UI5 trees.
  - Verifying a deployed project's bindings / `VCAP_SERVICES` → **`cap-cloud-foundry`**.
- After scaffolding, run **`cds watch`** to confirm the project boots.
