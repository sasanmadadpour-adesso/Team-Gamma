# AI-AGENT-GUIDE — SAP CAP / Fiori / BTP development

> Portable, project-agnostic. Copy into the root of any new CAP sub-project (or reference it from `CLAUDE.md` / `AGENTS.md`).
> **Facts verified 2026-10-16** (capire docs, npm, `capire/skills@b6866e8`). Versions go stale: verify with `cds version` / `npm view <pkg> version`. Refresh procedure: section 9.

---

## 0. Project context (fill in per project)

```yaml
name:            Team-Gamma — 5Energy Sharing im Stadtteil
namespace:       <cds namespace, e.g. myapp>
runtime:         <nodejs | java>            # ESM for Node.js unless legacy CJS
services:        [<ServiceName> → /service/<ServiceName> (odata-v4)]
core-entities:   [<Entity → key associations>]
ui-apps:         [<app/<name> — floorplan>]
inputs:          ["5Energy Sharing im Stadtteil.pdf" (requirements, DE), Dataset_English.xlsx, Datensatz_Deutsch.xlsx]
external:        [<service — kind — mock strategy>]
ai-models:       [<purpose — package — model>]   # only if sap-ai-sdk is used
stages:          [DEV, TEST, PROD]
```

Delete unused keys. Agents: if this block is unfilled, read `package.json`, `db/`, `srv/`, `app/` instead of assuming.

---

## 1. Rules for the agent (read first)

1. **CAP facts come from sources, not memory:** CAP dev MCP server → capire `.md` pages (section 4). Cite the page used.
2. **Skills:** official `capire/skills` is the prime source; adesso skills are thin overlays. **Official wins on conflict.**
3. **New behavior/requirement:** run `framework-first-review` before writing custom code (BTP → CAP → Fiori Elements). Prefer annotations over handlers.
4. **Fiori / UI5 facts:** Fiori MCP + UI5 MCP only. CAP docs are not a Fiori/UI5 reference.
5. **Versions:** never trust release-note tables or memory. Run `cds version`, `npm view`.
6. **Secrets:** never in skill folders, never printed. Project-local, gitignored (e.g. `.sap-cloud-logging/keys/`, `.env*`).
7. **Do not guess** URLs, MCP tool names, or `functionalityId`s.
8. "CAP MCP" can mean three different things. See section 6.1.

---

## 2. Bootstrap a new sub-project

`SKILLS` below = path to the **local** adesso skills checkout (the `sap-cap-ai-skills-main/` folder; no Git access or cloning needed). Only the official skills come from the public GitHub repo.

### 2.1 Install skills

```bash
# Official SAP skills (public, prime source). The CLI asks which agent to install for.
npx skills add https://github.com/capire/skills.git
```

**adesso skills, OpenCode (recommended): one symlink per skill** into the project's skill folder, so they sit next to the official ones:
```bash
SKILLS=/path/to/sap-cap-ai-skills-main
mkdir -p .opencode/skills
for s in "$SKILLS"/skills/*/; do ln -sfn "$s" ".opencode/skills/$(basename "$s")"; done
```
Symlinks follow later edits to the local skills folder automatically. Absolute symlinks break on other machines: if the repo is shared, **copy** instead (`cp -R "$s" .opencode/skills/`) or git-ignore `.opencode/skills/`.

**Alternative (any tool without skill support):** `cd "$SKILLS" && npm run install:opencode -- --project-dir <project>` writes one `AGENTS.md` with all adesso skills inlined (large, always in context). Same pattern: `install:claude` (symlinks `.claude/skills` + `CLAUDE.md` starter), `install:cursor`, `install:codex`. Existing `AGENTS.md`/`CLAUDE.md` are not overwritten without `--force`; re-add project-specific rules afterwards.

Update: `cd "$SKILLS" && npm run sync` (pull + rebuild adapters). Symlinked installs update automatically; copied files need re-copying.

### 2.2 Connect MCP servers

**OpenCode — merge into the existing `opencode.json` (keep other keys):**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["AI-AGENT-GUIDE.md"],
  "mcp": {
    "cds-mcp":   { "type": "local", "command": ["npx", "-y", "@cap-js/mcp-server"], "enabled": true },
    "ui5":       { "type": "local", "command": ["npx", "-y", "@ui5/mcp-server"], "enabled": true },
    "fiori-mcp": { "type": "local", "command": ["npx", "--yes", "@sap-ux/fiori-mcp-server@<pinned-version>", "fiori-mcp"], "enabled": true }
  }
}
```
Notes: the `cds-mcp` entry is the format documented by `@cap-js/mcp-server`. The `ui5` / `fiori-mcp` entries follow the same local-stdio pattern (their READMEs show other clients). `instructions` loads this guide as rules (check with your OpenCode version). Pin the Fiori MCP version (<https://www.npmjs.com/package/@sap-ux/fiori-mcp-server>), never `@latest`. Node.js ≥ 20.17 / 22.9.

Add to the project `AGENTS.md` (rules recommended by the `@cap-js/mcp-server` README):
```markdown
- You MUST search for CDS definitions (entities, fields, services incl. HTTP endpoints) with cds-mcp; only if that fails MAY you read *.cds files.
- You MUST search CAP docs with cds-mcp EVERY TIME you create or modify CDS models or use CAP APIs or the `cds` CLI. Do NOT propose or make changes without checking first.
```

**Claude Code alternative — `.mcp.json` in the project root:**
```json
{ "mcpServers": {
  "cds-mcp":   { "type": "stdio", "command": "npx", "args": ["-y", "@cap-js/mcp-server"] },
  "ui5":       { "type": "stdio", "command": "npx", "args": ["-y", "@ui5/mcp-server"] },
  "fiori-mcp": { "type": "stdio", "timeout": 600, "command": "npx", "args": ["--yes", "@sap-ux/fiori-mcp-server@<pinned-version>", "fiori-mcp"] } } }
```

### 2.3 Typical project layout (adesso conventions)

```
db/schema.cds                         domain model (namespace)
srv/<svc-name>.cds                    service def, kebab-case, @path: '/service/<ServiceName>'
srv/<svc-name>.js                     thin handler registration (ESM)
srv/code/<svc-name>/*.js              handler logic modules (logging via cds.log LOGGER)
srv/annotations.cds                   imports every srv/annotations/<svc>/register.cds
srv/annotations/<svc>/register.cds    imports that service's annotation files
app/<app>/annotations.cds             UI annotations (imports its subfolder files)
app/<app>/webapp/{manifest.json,i18n/}
_i18n/{i18n,messages}.properties      labels / constraint+error messages
db/data/*.csv                         sample data (cds add data --records <n> --keys-only)
mta.yaml, xs-security.json            only when deployment is requested
```

Check a bootstrapped project: `cds compile srv` runs clean, `cds watch` starts, MCP servers connect (`/mcp` in Claude Code).

### 2.4 Greenfield start (repo has no `db/`, `srv/`, or `@sap/cds` yet)

1. **Inspect inputs** (PDF specs, `.xlsx` datasets, README). Extract text/tables with tools; do not invent entities, columns, or business rules. Ask when the source is ambiguous (e.g. DE/EN dataset variants differ).
2. Run `framework-first-review` on the extracted requirements.
3. Initialize per official `cap-developer` / adesso `cap-project-scaffold` (`cds init`, `cds add <feature>` only as needed). Runtime choice can wait until code is needed.
4. Model in `db/schema.cds`, expose via services (section 2.3 layout), annotate, then add Fiori apps (`fiori-generator-cli`).
5. Spreadsheet data → sample data: export each sheet to `db/data/<namespace>-<Entity>.csv` (or `cds add data --records <n> --keys-only` for synthetic data). Keep source files untouched.

---

## 3. Skills

### 3.1 Official — <https://github.com/capire/skills>

| Skill | Owns |
|---|---|
| `cap-developer` | Init, CDS modeling, declarative annotations, handlers, Node.js/Java rules, sample data. Router: `SKILL.md` → `references/{cds-modeling,declarative,custom-logic,sample-data,nodejs,java}.md` |
| `cap-add-remote-service` | External/remote OData (Calesi pattern) |
| `cap-upgrade` | CDS version upgrades |
| `cap-trivia` | CAP quiz via MCP docs search |

Official rules: ESM only (never convert to CJS) · explicit column lists, no `SELECT *` · single `UPDATE` + row-count check · `this.entities`, no string entity names in handler registration · `cds add <feature>` only when needed, never `cds add sample` · declarative before handlers · `@assert.range` + status flows (`@flow.status`, `@from`/`@to`).

### 3.2 adesso overlay

| Skill | Purpose | Defers to |
|---|---|---|
| `framework-first-review` | 3-layer capability audit before custom code | — |
| `cap-development` | kebab-case layout, thin handlers → `srv/code/<svc>/`, airplane-mode mocks, 3-tier i18n | `cap-developer`, `cap-add-remote-service` |
| `cap-project-scaffold` | adesso BTP defaults (MTA/HANA/XSUAA) on `cds init`/`add` | `cap-developer` |
| `cap-cds-naming` | Naming standard, `@path`, i18n keys | `cap-developer` |
| `cap-annotations` | Annotation placement/push-down, `register.cds` wiring | `cap-developer` |
| `cap-logging` | `cds.log` facade, module `LOGGER` | — |
| `cap-websocket` | Real-time push (`@cap-js-community/websocket` + SideEffects) | — |
| `cap-fiori-drafts` | Draft lifecycle, `Entity.drafts`, `IsActiveEntity`, SideEffects | — |
| `cap-cloud-foundry` | Deployed app inspection via `cf` | — |
| `sap-cloud-logging` | BTP Cloud Logging per stage | — |
| `fiori-elements` | Annotation-driven Fiori Elements, manifest, Fiori MCP chain | — |
| `fiori-generator-cli` | Scaffold apps with `@sap/generator-fiori` | — |
| `sap-ai-sdk` | `@sap-ai-sdk/orchestration` (LLM), `@sap-ai-sdk/rpt` | — |

### 3.3 Routing

| Task signal | Load |
|---|---|
| New requirement / user story / "let's build X" | `framework-first-review` **first** |
| `db/**`, `srv/**`, `.cds`, CQL, handlers | `cap-development` + `cap-developer` |
| Naming service/entity/file/i18n key | `cap-cds-naming` |
| Annotation placement, `@restrict`, `@UI.*` in CDS | `cap-annotations` |
| Draft entity, `IsActiveEntity`, draft actions | `cap-fiori-drafts` |
| `app/**`, `manifest.json`, UI annotations | `fiori-elements` |
| New Fiori app | `fiori-generator-cli` |
| Live refresh / progress push | `cap-websocket` |
| Logging in `srv/code/**` | `cap-logging` |
| `mta.yaml`, `cf`, `VCAP_SERVICES`, deployed-only bug | `cap-cloud-foundry` |
| Logs of a deployed stage | `sap-cloud-logging` |
| LLM / prompt / orchestration | `sap-ai-sdk` |
| External OData service | `cap-add-remote-service` |
| CDS upgrade | `cap-upgrade` |

Load `SKILL.md` first; `references/*.md` only on demand. Never load all skills.

### 3.4 adesso conventions (override generic samples)

| Topic | Rule |
|---|---|
| Files | kebab-case `srv/order-service.cds` + `.js` |
| Handlers | thin `srv/<svc>.js` → `srv/code/<svc>/` |
| Service path | `@path: '/service/<ServiceName>'` on every service; one service per use case |
| Annotations | `register.cds` per service + one `srv/annotations.cds` (files are **not loaded** unless imported) |
| i18n | labels `i18n.properties`; constraint/error messages `messages.properties`; pass message keys to `req.reject` |
| Modules | ESM. Legacy CJS projects stay CJS. Never mix. |
| Mocks | Airplane-mode: REST mocks, SDK stub fallbacks |
| Queues | `cds.queued(srv)` `.emit()`/`.send()` per item; `.schedule()` only for singleton/recurring (it upserts one task per event name) |
| Draft | `@odata.draft.enabled` per entity (service-level annotate has no effect). Active (`Books`) and draft (`Books.drafts`) are separate; no manual `IsActiveEntity` filter on active reads |

---

## 4. Reading official CAP documentation (September 2026 release and later)

### 4.1 Lookup order

| # | Source | How | Use when |
|---|---|---|---|
| 1 | CAP dev MCP server | `search_docs`, `search_model` (tool prefix depends on client config, e.g. `cds-mcp_search_docs`, `mcp__cap__search_docs`) | First choice |
| 2 | Index | <https://cap.cloud.sap/docs/llms.txt> (~36 KB, one line per page) | Locate topic |
| 3 | Sitemap | <https://cap.cloud.sap/docs/sitemap.md> | Browse structure |
| 4 | Single page | `https://cap.cloud.sap/docs/<path>.md` or `Accept: text/markdown` | Read one page (cheap) |
| 5 | Full text | <https://cap.cloud.sap/docs/llms-full.txt> (~3.5 MB) | Cross-topic grep only. **Never load whole into context**: download, then `grep -n`. |
| 6 | Local model | `cds compile srv --to edmx` | Verify effective model |

Follow links from `llms.txt`/`sitemap.md`; **never guess URLs**. Pages flagged `_(archived)_` in `llms.txt` are historic and excluded from `llms-full.txt`: do not take advice from them.

```bash
curl -sL https://cap.cloud.sap/docs/guides/ai/cap-mcp.md
curl -sL https://cap.cloud.sap/docs/llms-full.txt -o "$SCRATCH/capire-full.txt" && grep -niE "pattern" "$SCRATCH/capire-full.txt"
```

### 4.2 September 2026 release

Notes: <https://cap.cloud.sap/docs/releases/2026/sep26.md> · schedule: <https://cap.cloud.sap/docs/releases/schedule> (yearly major, monthly minor, patches).
Stated minimums: `@sap/cds` 10.1.1+, `@sap/cds-dk` 10.1.2+, `@sap/cds-compiler` 7.1.0+, `@sap/cds-mtxs` 4.1.0+, CAP Java 5.1.0+. *(On 2026-10-16 npm showed `cds-dk` 10.1.0. Run `cds version`.)*

| Area | Change |
|---|---|
| Native AI | New docs section <https://cap.cloud.sap/docs/guides/ai/>. **XTravels** sample (MCP services + CAP-level agents): <https://cap.cloud.sap/docs/guides/ai/xtravels-sample> |
| CAP-level agents (Gamma) | `@agent` on a service → ReAct loop in the CAP server, served via **A2A** (default 0.3.0). Optional `AGENTS.md` + `skills/<name>/SKILL.md` next to the service. Node.js mature; Java Alpha. <https://cap.cloud.sap/docs/guides/ai/cap-agents> |
| MCP adapter **GA** | `@cap-js/mcp` / Java `cds-adapter-mcp`. Tools `describe`, `query` (CQL), `call` (was `call_action`). `.drafts`/`.texts`/CodeList no longer exposed. <https://cap.cloud.sap/docs/guides/ai/cap-mcp> |
| Embeddings (Node.js) | `Vector` type + `vector_embedding()`; SQLite local dev needs `@cap-js/ai` + ONNX packages. <https://cap.cloud.sap/docs/guides/ai/embeddings> |
| CDS language | Boolean expressions in view columns auto-wrapped in `CASE WHEN` on HANA · `extend … with where` combines with `AND` · `key` allowed in nested inline projections |
| Runtimes | Ranked fuzzy search on HANA (automatic) · Node.js destinations without Cloud SDK (Beta) |
| Joule | <https://cap.cloud.sap/docs/guides/ai/joule-integration> (*UnderConstruction*) |

Runtime behavior verified on CDS 10.0.6: `cds.requires.queue` default on · `maxAttempts` 10 · `cds.flush()` · default Node.js path `/odata/v4/<name>` (overridden by `@path`).

---

## 5. Source-of-truth matrix

| Question | Use | Never |
|---|---|---|
| CAP API / CDS syntax / runtime | CAP dev MCP → capire `.md` | Memory, blogs, archived notes |
| Effective CDS model | `search_model`, `cds compile` | Guessing |
| Fiori Elements annotations / manifest / floorplans | Fiori MCP, `fiori-elements` skill | CAP docs |
| SAPUI5 API / freestyle | UI5 MCP `get_api_reference` | CAP docs |
| Conventions | adesso skills | — |
| Baseline CAP mechanics | official `capire/skills` | adesso skill that contradicts it |
| Deployed runtime state | `cf`, `sap-cloud-logging` | Guessing from code |
| Versions | `cds version`, `npm view` | Release-note tables |

---

## 6. SAP MCP servers

### 6.1 Three things called "CAP MCP"

| | Dev MCP server | MCP adapter (runtime) | CAP-level agent |
|---|---|---|---|
| Package | [`@cap-js/mcp-server`](https://github.com/cap-js/mcp-server) (0.0.8) | [`@cap-js/mcp`](https://github.com/cap-js/mcp) (1.5.0) / Java `cds-adapter-mcp` | CAP agent plugins (Node.js / Java) |
| Purpose | AI-assisted **development** | Expose **your** services to AI clients | Turn a service into an agent |
| Enable | `npx -y @cap-js/mcp-server` in MCP client | `npm add @cap-js/mcp` + `annotate Svc with @mcp;` | `@agent service …` |
| Interface | stdio; tools `search_model`, `search_docs` | `/mcp/<service>`; tools `describe`, `query`, `call` | A2A |
| Status | usable | **GA** | Gamma (Java Alpha) |

> **SAP API Policy:** the adapter is only for *custom* CAP application services. It is **not** an SAP-endorsed path to agentic access of SAP Application APIs (§2.2.2, <https://help.sap.com/doc/sap-api-policy>). Returned data can steer agents (prompt injection): connect only trusted MCP agents.

### 6.2 Development servers

| Server | Key tools | Source |
|---|---|---|
| CAP dev | `search_docs`, `search_model` | [`@cap-js/mcp-server`](https://github.com/cap-js/mcp-server) |
| Fiori | `list_fiori_apps`, `list_functionality`, `get_functionality_details`, `execute_functionality`, `generate_fiori_app_cap`, `generate_fiori_app_odata`, `download_odata_service_metadata`, `list_sap_systems`, `search_docs` | [`@sap-ux/fiori-mcp-server`](https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-mcp-server) (1.15.12) |
| UI5 | `get_api_reference`, `get_guidelines`, `get_project_info`, `get_version_info`, `run_ui5_linter`, `run_manifest_validation`, `create_ui5_app`, `create_integration_card`, `get_integration_cards_guidelines`, `get_typescript_conversion_guidelines` | [`@ui5/mcp-server`](https://github.com/UI5/mcp-server) (0.3.2) |

SAP recommends running **Fiori + CAP + UI5** together. Optional adesso-internal docs server (`adesso-sap-docs`: `search`, `fetch`, `sap_search_objects`, `abap_feature_matrix`, `sap_community_search`, `sap_discovery_center_search`, `ui5_version_diff`) if configured. Check the connected tool list; never assume.

### 6.3 Fiori MCP protocol (mandatory)

1. Call `tools/list` first each session; read each tool's `inputSchema`.
2. Pass **only** schema properties. No wrappers or extras.
3. **Modify an existing app, in order:** `list_functionality` (absolute app path) → `get_functionality_details` (functionalityId) → `execute_functionality`. Never guess a `functionalityId`.
4. **Generate:** `generate_fiori_app_cap` (CAP) or `generate_fiori_app_odata` (non-CAP; required `floorplan`, `project`; optional `service`, `entityConfig`).
5. SAP system/service URL involved → `download_odata_service_metadata` first; pass **all** returned fields to the generator (system connections need the *Connection Manager for SAP Systems* VS Code extension).

---

## 7. Links

| What | URL |
|---|---|
| capire docs | <https://cap.cloud.sap/docs/> |
| `llms.txt` · `llms-full.txt` · `sitemap.md` | <https://cap.cloud.sap/docs/llms.txt> · <https://cap.cloud.sap/docs/llms-full.txt> · <https://cap.cloud.sap/docs/sitemap.md> |
| Release notes Sep 2026 | <https://cap.cloud.sap/docs/releases/2026/sep26.md> |
| Native AI guides | <https://cap.cloud.sap/docs/guides/ai/> |
| Official skills | <https://github.com/capire/skills> |
| CAP dev MCP server · MCP adapter · `@cap-js/ai` | <https://github.com/cap-js/mcp-server> · <https://github.com/cap-js/mcp> · <https://github.com/cap-js/ai> |
| Fiori MCP · UI5 MCP | <https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-mcp-server> · <https://github.com/UI5/mcp-server> |
| Agent Skills standard | <https://agentskills.io> |

---

## 8. Agent checklist

- [ ] Section 0 filled, or project inspected (`package.json`, `db/`, `srv/`, `app/`).
- [ ] Route to skills (3.3). `SKILL.md` first.
- [ ] New behavior → `framework-first-review` first.
- [ ] CAP fact → dev MCP → `.md` page. Versions verified live.
- [ ] Fiori/UI5 fact → Fiori/UI5 MCP.
- [ ] adesso conventions (3.4); official wins on conflict.
- [ ] No secrets in repo or output.
- [ ] Final answer names the source for each claim.

---

## 9. Keeping this file current

Re-verify when `capire/skills` or a CAP release moves:
1. Read the newest page under <https://cap.cloud.sap/docs/releases/> (list in `llms.txt` under *Releases*); update 4.2.
2. `npm view` each package named in section 6; update versions.
3. `git -C <capire-skills-clone> log` since baseline `b6866e8` (2026-10-09; router refactor of `cap-developer`). Update rules in 3.1.
4. Compare with the adesso repo's `docs/official-sap-skills-dedup.md` (baseline `00dc7aa`) and update the verified date at the top.

Known gap: adesso skills do not yet cover Sep 2026 features (`@mcp`, `@agent`, A2A, `@cap-js/ai`). Use the official docs (section 4) for those.
