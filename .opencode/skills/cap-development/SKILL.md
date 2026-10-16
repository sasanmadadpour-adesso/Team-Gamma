---
name: cap-development
description: >-
  Builds and modifies the SAP CAP backend (CDS models, services, event
  handlers, CQL) following the repo's coding standards, using CDS MCP
  tools. TRIGGER when: editing or creating any file under db/**, srv/**,
  srv/code/**; editing db/schema.cds, srv/*.cds, srv/*.js, srv/*.ts;
  writing CQL (SELECT / INSERT / UPDATE / DELETE, expand, where,
  columns); registering event handlers (on / before / after CREATE /
  READ / UPDATE / DELETE / actions / functions); using cds.queued /
  cds.outbox / cds.connect.to / cds.entities / cds.log; user mentions
  CAP, CDS, CQL, @sap/cds, entity, service, projection, association,
  composition, draft, managed, cuid, @odata.draft.enabled,
  @requires, @restrict, req.reject, req.subject, req.data, handler.
  SKIP: for new project scaffolding (use cap-project-scaffold), Fiori /
  UI annotations or manifest.json edits (use fiori-elements), remote /
  external OData service integration (use the official
  cap-add-remote-service skill), and runtime inspection of deployed
  apps (use cap-cloud-foundry).
---

# CAP Development

## Relationship to the official `cap-developer` skill

This skill is an **adesso overlay** on top of SAP's official **`cap-developer`** skill
(installed via `npx skills add https://github.com/capire/skills.git`). The official skill
owns the **baseline**: `cds init` / `cds add`, core CDS modeling (built-in aspects `cuid` /
`managed` / `temporal`, compositions vs. associations, PascalCase entities / camelCase
elements, projections-not-entities), declarative-first annotations, the `before` / `on` /
`after` handler-phase API, and the Node.js rules in its `references/nodejs.md` (ESM modules,
explicit column lists, single-round-trip updates, `req.reject` / `req.error`, intrinsic
transactions, `cds add data --keys-only` for sample data).

**This skill adds only adesso's project conventions on top of that baseline:**
kebab-case service files, thin handlers delegating to `srv/code/` modules,
one-service-per-use-case, airplane-mode mocking, three-tier i18n, and transactional event
queues. Both skills co-fire on CDS / handler edits — defer to `cap-developer` for base
mechanics, apply the conventions below. If the two ever disagree, `cap-developer` wins.

Related official/local skills to defer to:
- **Remote / external OData service integration** → official **`cap-add-remote-service`**
  (the Calesi pattern). Only the adesso deltas live in `references/external-service-consumption.md`.
- **CDS upgrades** → official **`cap-upgrade`**.

## Reference Material

For detailed guidance, read the files in this skill's `references/` directory:
- `references/coding-standards.md` — project structure and file naming, ESM conventions, service design, handler delegation, CQL deltas, logging, mocking, i18n, event queues, common pitfalls
- `references/development-runtime.md` — profiles, airplane mode philosophy, hybrid/integration testing, deployment
- `references/external-service-consumption.md` — **adesso deltas only** for external OData services (airplane-mode profile config, BTP Destination wiring cross-links, S/4HANA "no API" decision). The full import/configure/call workflow is in the official **`cap-add-remote-service`** skill.

## New projects and CLI features

To **create** a CAP project or **add** deployment/auth/DB/messaging facets via the toolkit, follow **`skills/cap-project-scaffold/SKILL.md`** (`cds init`, `cds add`). Do not invent full project skeletons by hand.

## Standards

Read `references/coding-standards.md` for all coding standards including:
- Project structure and file naming (kebab-case `srv/<service-name>.cds` + `.js`, `srv/code/<service-name>/`)
- ESM conventions (and the rule for legacy CommonJS projects)
- Service design: one service per use case (Fiori UIs, integration, admin, background processing)
- Service definitions: inline `@path: '/service/<ServiceName>'` + `@requires`, entity annotations in `srv/annotations/<service-name>/`
- Handler delegation pattern (thin handlers -> srv/code/ modules, entities from `this.entities`)
- CQL deltas (service entities, explicit columns, `req.subject`, native CQL in `.cds`)
- Service mocking & airplane mode (REST mocks, try/catch stub fallbacks for SDK calls)
- i18n: three tiers — backend `_i18n/` (OData metadata labels + error message keys), frontend `app/*/webapp/i18n/` (UI5 resource bundle), and database-level `localized` + `_texts` CSV files (translatable data values)
- Logging (`cds.log` facade, module-level LOGGER)
- Transactional event queues (`cds.queued(srv).emit()` per item; `schedule()` only for singleton/recurring tasks)
- Common pitfalls (drafts, managed fields, external contracts)

For the full draft mechanics across CAP runtime, OData V4, and Fiori Elements (lifecycle events, `Entity.drafts` handler targets, `IsActiveEntity` URL keys, `$draft.IsActiveEntity` expressions, SideEffects), see **`skills/cap-fiori-drafts/SKILL.md`**.

Read `references/development-runtime.md` for profiles, airplane mode philosophy, hybrid/integration testing, and deployment.

## CDS MCP Tools

Two MCP tools are available for CAP development:

### search_docs

Search CAP documentation for API questions, annotation syntax, or best practices.

**When to use**: unsure about a CAP API, CDS syntax, annotation, or Node.js runtime feature.

```
Tool: search_docs
Parameters:
  query: "your question about CAP"   (required)
  maxResults: 10                      (optional, default 10)
```

Examples:
- `query: "how to register before handler for CREATE event Node.js"`
- `query: "odata draft enabled annotation"`
- `query: "cds.connect.to external service REST"`
- `query: "CQL SELECT with expand associations"`
- `query: "@requires annotation authorization"`

### search_model

Inspect the CDS model of this project -- entities, elements, annotations, endpoints.

**When to use**: need to understand existing entities, check field types, find HTTP endpoints, or see annotations.

```
Tool: search_model
Parameters:
  projectPath: "{{PROJECT_PATH}}"  (required)
  name: "Orders"              (optional, fuzzy search for definition name)
  kind: "entity"              (optional: service, entity, action, type, etc.)
  topN: 5                     (optional, default 1)
  namesOnly: false            (optional, set true for overview of all definitions)
```

Examples:
- Get overview of all definitions: `namesOnly: true, topN: 50`
- Find entity by name: `name: "Orders", kind: "entity"`
- Find all actions: `kind: "action", topN: 10`
- Inspect a specific service: `name: "OrderService", kind: "service"`

## Workflow

1. **Before creating/modifying CDS models**: use `search_model` to understand existing definitions
2. **Before writing handlers**: use `search_model` to check entity structure and annotations
3. **When unsure about syntax**: use `search_docs` to find correct CAP API usage
4. **After changes**: verify with `cds watch` that the service boots correctly
