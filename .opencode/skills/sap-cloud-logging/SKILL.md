---
name: sap-cloud-logging
description: >-
  Reads and queries SAP BTP Cloud Logging (OpenSearch) application logs of the
  current project from the terminal, using per-stage service keys kept in the
  project's gitignored .sap-cloud-logging/keys/, and sets that folder up for
  the user on first use (fetches keys via cf without showing them). TRIGGER
  when: user asks to "check the logs", investigate a runtime error on a
  deployed stage (DEV, TEST, QA, PROD), search by correlation id / request id
  / trace id, or analyze a ticket that only reproduces after deployment;
  mentions SAP Cloud Logging, OpenSearch, OpenSearch Dashboards,
  logs-cfsyslog, log analysis, or a service key for logs; asks to set up or
  repair Cloud Logging access for a project. SKIP: for the last few minutes of
  a single app (`cf logs <app> --recent`, use cap-cloud-foundry), for writing
  log statements in CAP code (use cap-logging), and for configuring how apps
  ship logs into Cloud Logging.
---

# SAP Cloud Logging

Query the Cloud Foundry application logs a project ships to SAP Cloud Logging (OpenSearch-backed).
Every stage (DEV, TEST, QA, …) has its own Cloud Logging instance and therefore its **own service key**.

The script ships with this skill. Keys and project facts live in the project:

| What | Where | Git |
| --- | --- | --- |
| Query script (shared by all projects) | `<skill-dir>/scripts/query-logs.mjs` | library repo |
| Settings + where each stage's key comes from | `<project>/.sap-cloud-logging/config.json` | committed |
| Project notes (optional) | `<project>/.sap-cloud-logging/README.md` | committed |
| Service keys | `<project>/.sap-cloud-logging/keys/<stage>.json` | **ignored** |

`<skill-dir>` is `~/.claude/skills/sap-cloud-logging` for a global Claude Code install. Cursor, Codex and
other tools run the script from the library clone (`~/sap-cap-ai-skills/skills/sap-cloud-logging`).
Below, `query-logs` stands for `node <skill-dir>/scripts/query-logs.mjs`. **Always run it from inside
the project**, because the working directory decides which project's keys are used.

## 0. First use in a project: set it up for the user

If the project is not set up yet, or a stage has no key, **do the setup yourself**. Don't hand the user
a list of commands. Start every first use with:

```bash
query-logs --status
```

It never fails and never prints secrets. It reports the folder, the gitignore, the Claude Code deny
rule, every stage (key present? can it read logs? where does it come from?) and the cf login, and ends
with concrete `nextSteps`. Work through them, then run `--status` again until `"ready": true`.

1. **Not set up**: run `query-logs --init`.
   - It creates `.sap-cloud-logging/` (`.gitignore` containing `keys/`, `config.json`, `keys/`) at the
     git top level.
   - In Claude Code it also adds the deny rule `Read(./.sap-cloud-logging/keys/**)` to
     `.claude/settings.json`.
   - It never overwrites anything.
2. **A stage has no key, but `config.json` records its source** (a teammate set it up): run
   `query-logs --fetch-key --stage <stage>`. Nothing to ask.
3. **A stage has no key and no source yet**:
   - Look at `cf` in `--status`. If the current target is plausibly the stage's space, confirm with
     the user. Otherwise ask which CF org/space holds that stage (`cf orgs` / `cf spaces` list candidates).
   - Run `query-logs --fetch-key --stage <stage> [--cf-org <org> --cf-space <space>]`.
   - It finds the space's Cloud Logging instance and key via `cf curl` and writes `keys/<stage>.json`
     (mode 600). The credentials never reach the output.
   - It records `api` / `org` / `space` / `instance` / `key` (no secrets) in `config.json`, and makes the
     first fetched stage the default.
   - If it finds several instances or keys, it lists them. Pick by name (`--instance`, `--key-name`)
     or ask the user.
4. **Only these need the user**:
   - Not logged in, or logged in to another API endpoint: ask them to run `! cf login -a <api> --sso`
     (interactive). `--fetch-key` prints the exact command.
   - The instance has no service key: creating one adds credentials on BTP, so **ask first**. Then run
     the `cf target … && cf create-service-key …` command that `--fetch-key` printed, and fetch again.
   - `canReadLogs: false`: see [references/read-access.md](references/read-access.md). Enabling the
     backend API changes the instance (ask first). An internal user is created by the user in the browser.
   - No cf CLI or no CF access: the user pastes the key JSON from the BTP cockpit into
     `keys/<stage>.json` in their editor.
5. **Project notes**: write `.sap-cloud-logging/README.md` with:
   - the CF app names, from `mta.yaml` modules or `cf apps`
   - which stage tickets usually mean (ask)
   - queries that proved useful

   If tickets usually mean a stage other than the first one fetched, set `defaultStage` in `config.json`.
6. **Finish**: tell the user which files to commit: `.sap-cloud-logging/.gitignore`, `config.json`,
   `README.md`, `.claude/settings.json`. Never commit `keys/`. Don't commit without being asked.

After that, any teammate's agent gets their own copy of the keys with `--fetch-key --stage <stage>`,
using their own cf login. Expired keys are refreshed the same way, adding `--force`.

`query-logs --init` remains available for setting up a project by hand.

## 1. Before each query

1. Read `.sap-cloud-logging/README.md` if it exists (app names, stage conventions, known queries).
2. Pick the stage. Use the one the user or ticket names. Otherwise the script uses `defaultStage`, or
   the only key present. If several keys exist and there is no default, ask.
3. If a query fails on setup (no folder, missing key, auth error), go back to § 0 instead of asking the
   user to fix it.

## 2. Query logs

| Flag | Meaning | Default |
| --- | --- | --- |
| `--stage <name>` | Loads `.sap-cloud-logging/keys/<name>.json` | `defaultStage`, else the only key |
| `--key <path>` | Explicit key file (overrides `--stage`) | — |
| `--cf-app-logs` | Mirror the Application Logs panel of SAP's "CF Requests and Logs" dashboard | — |
| `--cf-errors` / `--errors` | Latest CF/application error logs | — |
| `--index <pattern>` | OpenSearch index | `logs-cfsyslog-*` with CF helpers, else `defaultIndex` or `logs-json-*` |
| `--query <lucene>` | Lucene query string, e.g. `level:error AND msg:*timeout*` | match all |
| `--app` / `--space` / `--org <name>` | Restrict hits to a CF app/component, space or org | — |
| `--last <dur>` | Relative window: `30m`, `2h`, `1d` | `1h` |
| `--from` / `--to` | Absolute ISO timestamps (override `--last`) | — |
| `--size <n>` | Max documents | `50` |
| `--fields a,b,c` | Print only these `_source` fields as JSON | pretty line |
| `--time-field <name>` | Timestamp field | `@timestamp` |
| `--json` | Full raw OpenSearch response | — |
| `--dsl` | Read a raw Query DSL body from stdin | — |
| `--endpoint backend\|dashboards` | Force the access path | auto |
| `--asc` | Oldest first | newest first |
| `--info` | Non-secret capabilities and endpoints of one key | — |

Setup commands: `--status`, `--init`, and `--fetch-key --stage <s>` with optional `--cf-org`,
`--cf-space`, `--instance`, `--key-name`, `--force` (§ 0). `CLS_KEY_FILE=<path>` works instead of
`--key`, and `CLS_DEFAULT_STAGE=<stage>` overrides `defaultStage`.

```bash
query-logs --cf-errors --last 6h                                   # latest errors, default stage
query-logs --stage test --cf-app-logs --app <cf-app> --last 15m    # one app, like the SAP dashboard
query-logs --stage qa --query 'correlation_id:"abc-123"' --last 1d --json
query-logs --stage dev --query 'msg:*timeout*' --fields "@timestamp,level,msg,logger"
query-logs --stage dev --dsl <<'JSON'
{ "size": 0, "aggs": { "by_level": { "terms": { "field": "level" } } } }
JSON
```

## 3. Investigating a ticket

1. Read the ticket and its latest comments. Determine the stage from the text, URLs, screenshots or
   route host names (`…-test-…`, `…-dev-…`). If none is named, apply the rule in
   `.sap-cloud-logging/README.md`, else ask.
2. Start broad: `query-logs --cf-errors --last 24h --size 50`.
3. Narrow by clues from the ticket: correlation/request/trace ids, screenshot timestamps, URL paths,
   object ids, user ids, error text from a backend system.

```bash
query-logs --cf-app-logs --last 24h \
  --query 'correlation_id:"<id>" OR request_id:"<id>" OR msg:*<keyword>*'
```

## 4. Indexes

- `logs-cfsyslog-*`: Cloud Foundry application and request logs, used by `--cf-app-logs` and
  `--cf-errors`. SAP's "CF Requests and Logs" dashboard queries it with `(type: log OR type: trace)`
  and excludes `source_type: RTR`.
- `logs-json-*`: JSON ingestion. It can be empty even when CF logs exist.
- `logs-otel-v1-*`: OpenTelemetry logs and traces, if OTLP ingestion is enabled.
- `logs-*`: broad fallback for other naming schemes.

To discover fields, inspect one document: `--size 1 --json`.

## Keeping the skill sharp

- **Generic** (new flag, index, query pattern, bug fix): change `scripts/query-logs.mjs` and this file
  in the library repo, then open a merge request. The skill folder is shared by every project.
- **Project-specific** (app names, stage conventions, integration queries): put it in
  `<project>/.sap-cloud-logging/README.md` and commit it with the project.

## Guardrails

- The script never prints credentials, and redacts key secrets even inside error messages. Never
  `cat`, `grep` or open key files. Use `--status` / `--info` to learn what a key can do.
- Never ask for keys or passwords in the chat. Never run `cf service-key` yourself, because it prints
  the secrets. `--fetch-key` reads keys without showing them.
- Ask before anything that changes BTP: `cf create-service-key`, `cf update-service`.
- Keys expire (mTLS keys after about 180 days). On sudden auth errors, re-fetch with `--force`.
- Read-only towards OpenSearch: only `_search` requests are sent.
- Log documents can contain personal or business data. Quote only what the diagnosis needs, and never
  commit log output.
