# AGENTS.md — Team-Gamma

SAP CAP / Fiori / BTP project. Read `AI-AGENT-GUIDE.md` (also loaded via `opencode.json` → `instructions`) for skills, MCP servers, doc lookup and conventions.

## Project inputs

- `5Energy Sharing im Stadtteil.pdf` — requirements / concept (German). Source of truth for the domain.
- `Dataset_English.xlsx`, `Datensatz_Deutsch.xlsx` — datasets (EN/DE variants). Extract structure from them; do not invent columns or rules. Ask if the variants differ.
- Greenfield: no CAP project yet. Follow `AI-AGENT-GUIDE.md` §2.4.

## Skills

Project skills live in `.opencode/skills/` (official SAP `cap-*` skills + adesso overlays). Official skills win on conflict. For any new requirement run `framework-first-review` before writing custom code.

## MCP rules (from `@cap-js/mcp-server`)

- You MUST search for CDS definitions (entities, fields, services incl. HTTP endpoints) with cds-mcp; only if that fails MAY you read `*.cds` files.
- You MUST search CAP docs with cds-mcp EVERY TIME you create or modify CDS models or use CAP APIs or the `cds` CLI. Do NOT propose or make changes without checking first.
- Fiori / UI5 questions: use the `fiori-mcp` and `ui5` servers, never the CAP docs.
- Never guess URLs, MCP tool names or versions. Verify with `cds version` / `npm view`.
