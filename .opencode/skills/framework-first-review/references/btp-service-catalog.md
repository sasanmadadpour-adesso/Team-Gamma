# BTP Managed-Service Catalog

Catalog of SAP BTP managed services that are **commonly rebuilt from scratch**
inside CAP apps. Use this during Layer 1 of the capability audit (see
`SKILL.md`).

> **Use the Platform — Don't Rebuild It.** If a capability exists as a managed
> BTP service, consume it. Custom implementations of platform-native
> functionality introduce technical debt and deviation from the supported
> upgrade path.

For each entry: **trigger phrases** in the user story / ticket, the **managed
service** to consume, and the **CAP integration entry point** (CDS MCP
`search_docs` query, `cds add` facet, or plugin).

## Before you pick a BTP service — is CAP closer to the stack?

Principle 2 of the audit (see `SKILL.md`) says: **when both the framework and
a BTP service could do it, the framework wins.** The BTP service is only the
right answer when the framework primitive doesn't fit.

Cases where CAP has a first-class, framework-native primitive that **replaces**
a commonly-chosen BTP service:

| Requirement | Don't reach for… | Use this CAP-native primitive instead |
|---|---|---|
| "Durable async / deferred work with retries" | External queue / Job Scheduler | **CAP task queue** — `cds.queued(srv).send/emit(event, data)`. Writes to `cds.outbox.Messages` in the current transaction; worker dispatches after commit; retries with backoff; DLQ on exhaustion. |
| "Scheduled / recurring job", "cron", "every N minutes", "run after 1h" | SAP Job Scheduling Service (by default) | **Same CAP task queue** with the scheduling API: `srv.schedule(event, data).after('1h')` / `.every('1h')` / cron. Persistent, transactional, retried, DLQ-backed — no external service needed. `schedule` upserts one task per name — per-record tasks need a unique `.as(name)`. |
| "Chain async pipeline steps" | Workflow / Process Automation | CDS `event` declarations + `cds.queued(srv).send(nextEvent, ...)` chaining |
| "Publish domain events inside one app" | SAP Cloud Application Event Hub | CDS `event` + `cds.queued` |
| "Feature flag / opt-in" | External flag service | `cds.context.features` + feature vector provider |
| "Multi-tenant extension fields" | External extension catalog | CAP extensibility (`cds.extensions`) + MTX |
| "Who created / modified a row" | Custom audit table | `managed` aspect (`createdAt/By`, `modifiedAt/By`) |

**What the CAP task queue gives you that Job Scheduler would otherwise
provide**: durability (row in `cds.outbox.Messages`), transactional enqueue
(message and business data commit together), worker-based dispatch after
commit, retry with exponential backoff up to `maxAttempts` (default 10),
dead-letter queue (exhausted messages stay in the table), at-least-once
delivery (abandoned `processing` entries are reclaimed after the queue
`timeout`, so consumers must be idempotent), `.after('1h')` / `.every('1h')`
scheduling, persistence across app restarts and redeployments, and
success/failure callbacks (`srv.after('event/#succeeded' | '#failed', …)`,
Alpha). Docs:
[Event Queues in Node.js — capire](https://cap.cloud.sap/docs/node.js/event-queues).

Use the BTP service only when the framework primitive demonstrably doesn't
fit — e.g. Job Scheduling Service is appropriate when the schedule must be
operator-paused or re-timed at runtime without a redeploy, or triggered from
outside the app. Record the reason in the decision record.

> **Do not confuse with `cds.spawn`.** `cds.spawn({ every, after }, fn)` is a
> different primitive (in-process detached job, no persistence, no retry, no
> DLQ) and is **not** the correct replacement for Job Scheduler. Use
> `srv.schedule(...)` (recurring / delayed) or `cds.queued(srv).emit(...)` (per item).

## Identity, authentication, authorization

| Trigger phrase | Managed service | CAP integration |
|---|---|---|
| "login", "SSO", "SAML", "corporate identity" | SAP Cloud Identity Services (IAS) + xsuaa | `cds add xsuaa` (classic BTP) or IAS-only setup; MCP: `"cap xsuaa authentication"`, `"cap identity services ias"` |
| "roles", "scopes", "permissions" | xs-security.json / IAS groups | `cds add xsuaa`; declare via `@requires` / `@restrict` |
| "technical user / system-to-system" | IAS `systemUser` flow / xsuaa client-credentials | MCP: `"outbound authentication system user"` |
| "call an app on another tenant/subaccount" | Approuter + IAS app-to-app / principal propagation | MCP: `"approuter principal propagation"` |

**Never**: build a custom login page, session cookie, JWT issuer, or role
registry.

## Connectivity — reaching external / on-prem systems

| Trigger phrase | Managed service | CAP integration |
|---|---|---|
| "call an external REST / OData API" | Destination service | `cds add destination`; the consumption workflow is owned by the official **`cap-add-remote-service`** skill; adesso deltas in `cap-development/references/external-service-consumption.md` |
| "call an on-prem / SAP system" | Destination + Cloud Connector + Connectivity service | MCP: `"cap destinations connectivity"` |
| "propagate the end-user to the backend" | Destination with `Authentication: PrincipalPropagation` | MCP: `"principal propagation destination"` |
| "one central place for URLs and credentials" | Destination service (do **not** use env vars) | MCP: `"destinations cap environment"` |

**Never**: hard-code URLs, client IDs, or secrets. Never roll your own
destination-lookup code — the `@sap-cloud-sdk/connectivity` / CAP destination
resolver already does it.

## Data — persistence, messaging, cache, storage

| Trigger phrase | Managed service | CAP integration |
|---|---|---|
| "HANA", "production DB" | SAP HANA Cloud | `cds add hana,mta` |
| "Postgres" | SAP BTP Postgres | `cds add postgres` |
| "cache", "session store", "rate-limit counter" | SAP BTP Redis (hyperscaler) | `cds add redis` |
| "publish/subscribe events" **between apps** | SAP Cloud Application Event Hub (Advanced Event Mesh / AEM) | MCP: `"cap event hub messaging"`, `"cap messaging enterprise-messaging"` |
| "publish/subscribe events" **inside one app** / pipeline | **Framework-first**: CDS `event` + `cds.queued(srv).emit(...)` (transactional event queue). Don't provision Event Hub for intra-app eventing. | MCP: `"cds.queued outbox transactional event queues"` |
| "receive webhook from another SAP app" | Event Hub subscription + CAP inbound messaging | MCP: `"cap inbound messaging webhook"` |
| "file upload", "attachment", "document" | Object Store (S3/Azure) + `@cap-js/attachments` plugin | MCP: `"cap attachments plugin object store"` |
| "document management / records" | SAP Document Management Service | MCP: `"sap document management integration"` (custom REST via destination) |
| "shared file between instances" | Object Store — never local disk | MCP: `"object store cap"` |

**Never**: local disk for uploads, in-memory caches for multi-instance apps,
custom Kafka/RabbitMQ clients from scratch.

## Process automation, rules, workflow

| Trigger phrase | Managed service | CAP integration |
|---|---|---|
| "approve / reject / cancel" as a simple status transition **inside one app** | — (framework-first) | CAP status-transition flows: `@flow.status` + `@from` / `@to` on bound actions (official `cap-developer`; pre-GA). MCP: `"status transition flows @flow.status"` |
| "approval step", "4-eyes", "route to manager", "human task", "inbox" | SAP Build Process Automation (SPA) / Workflow Management | Consume via destination + Workflow REST API; trigger from CAP handler |
| "business rule", "decision table", "if-this-then-that driven by business" | SAP Build Process Automation — Business Rules | Call decision service via destination |
| "scheduled job", "cron", "nightly run", "every hour" | **First try**: CAP task queue — `srv.schedule(event, data).every('1h')` / `.after('1h')` (Node.js) / CAP Java transactional outbox. Persistent in `cds.outbox.Messages`, transactional, retried, DLQ-backed, survives restarts. **Only** use SAP Job Scheduling Service when the schedule must be operator-paused or re-timed without a redeploy, or triggered from outside the app. | MCP: `"cds.queued schedule every after"`, `"cap java transactional outbox"`, `"cap job scheduler"` |
| "long-running orchestration with retries" | Build Process Automation / Workflow — **only** if the orchestration crosses apps, has human tasks, or needs operator-controlled pause/resume. Inside one app, prefer CDS `event` + `cds.queued` chaining. | Do **not** build a state machine in CAP handlers |
| "low-code form to capture exception" | SAP Build Apps / Forms by Mendix | Expose CAP OData as backend |

**Never**: implement a multi-step / human-task approval workflow as status fields + handlers.
A simple in-app status transition (approve / reject on one entity) is **not** a workflow — model
it declaratively with `@flow.status` + `@from` / `@to` instead of handler code. Never
build your own cron with `setInterval` / `setTimeout` — use the **CAP task
queue** (`cds.queued(srv).schedule(event, data).every('1h')` /
`.after('1h')`). Never reach for SAP Job Scheduling Service by default; it's
a specific-purpose tool, not the general answer to "I need it to run
periodically."

## Observability, governance, DPP

| Trigger phrase | Managed service | CAP integration |
|---|---|---|
| "audit trail", "who read what", "who changed what", "GDPR / DPP compliance" | SAP Audit Log Service | `@cap-js/audit-logging` plugin + `@PersonalData.*` annotations. MCP: `"audit logging plugin @cap-js"` |
| "personal data flagging" | `@PersonalData`, `@PersonalData.IsPotentiallyPersonal`, `@PersonalData.FieldSemantics` | MCP: `"personal data annotations PersonalData"` |
| "data retention / deletion" | SAP Data Retention Manager + DPP plugin | MCP: `"data privacy retention manager"` |
| "alerts / ops notification" | SAP Alert Notification Service | Call via destination; use it instead of sending emails from CAP |
| "application logs", "structured logs" | Cloud Foundry Application Logging / Kyma Logs | Use `cds.log` — the platform collects stdout |
| "metrics / APM" | SAP Cloud ALM / Dynatrace / Cloud Logging | Don't build dashboards — use provided ones |

**Never**: hand-craft an audit table + trigger-like handlers. Never `console.log`
manually — `cds.log` goes to the platform log pipeline.

## Credentials, keys, secrets

| Trigger phrase | Managed service | CAP integration |
|---|---|---|
| "store API key / token securely" | SAP Credential Store service | Access via destination/binding; never env-var secrets in prod |
| "encrypt field at rest beyond DB" | Data Custodian / customer-managed keys | Configure on HANA, don't re-implement in CAP |
| "share credentials between apps" | Service binding via MTA / Kyma `ServiceBinding` | `cds.env.requires[...]` resolves them automatically |

## Communication — notifications, mail, print

| Trigger phrase | Managed service | CAP integration |
|---|---|---|
| "send email" | Mail plugin / SMTP destination | `@cap-js-community/mail` or destination; never custom nodemailer from scratch |
| "push alert to Teams / Slack / PagerDuty" | SAP Alert Notification Service | Configure receivers in ANS; publish from CAP |
| "print label / document to a physical printer" | SAP Print Service | Call via destination |

## AI

| Trigger phrase | Managed service | CAP integration |
|---|---|---|
| "LLM", "GPT", "Claude", "chat completion" | SAP AI Core + Generative AI Hub | `@sap-ai-sdk/orchestration` (`OrchestrationClient`). See `skills/sap-ai-sdk` |
| "document understanding / RPT" | SAP AI Core RPT | `@sap-ai-sdk/rpt` (`RptClient`). See `skills/sap-ai-sdk` |
| "embeddings / vector search" | AI Core + HANA Vector Engine | `OrchestrationEmbeddingClient` from `@sap-ai-sdk/orchestration` (per **`sap-ai-sdk`** — no `foundation-models`) + HANA `REAL_VECTOR` type |

**Never**: instantiate `openai` / `@anthropic-ai/sdk` directly in a CAP app —
you lose BTP routing, auth, quota, and audit.

## Frontend hosting

| Trigger phrase | Managed service | CAP integration |
|---|---|---|
| "host the UI5 app", "versioning of frontend" | HTML5 Application Repository + Approuter | Standard MTA build via `cds add mta,html5-repo,approuter` |
| "launchpad / Fiori launchpad site" | SAP Build Work Zone | Deploy UI5 module as Work Zone content |
| "navigation / tiles" | Work Zone / Fiori Launchpad | Configure via Work Zone, not custom dashboards |

**Never**: host the UI5 app from the CAP `srv` module as static files in
production.

## How to consume a BTP service from CAP

General pattern — do this instead of custom code:

1. **Add the facet** with the CLI where available:
   `cds add xsuaa,hana,mta,destination,html5-repo,approuter,audit-logging,...` — only the facets
   you need, and only once deployment is requested (official `cap-developer`).
   See `skills/cap-project-scaffold` and `cds add --help` for the full list.
2. **Verify the `cds.requires` entry** `cds add` wrote to `package.json` (`kind: …`) —
   don't hand-write it; the CAP runtime resolves it via VCAP bindings and
   provides airplane-mode defaults.
3. **Consume via CAP** — `cds.connect.to(...)`, `cds.queued(...)`, plugin
   annotations, or `@sap-ai-sdk/...` — not via raw HTTP.
4. **Bind the service instance** in `mta.yaml` / Kyma `ServiceBinding` so the
   platform injects credentials. Never paste credentials into config.
5. **Verify authoritative docs** with the CDS MCP `search_docs` — the
   CAP docs describe the supported integration for each BTP service; start
   there before inventing your own client.

## Red flags in requirements / code review

If you see any of these in a user story, PR, or design — stop and run the
audit:

- "Let's create a table to track who edited what" → **Audit Log Service**
- "We'll have a status field `pending_approval` and a button" → **`@flow.status` + `@from` / `@to`** for a simple in-app transition; **Workflow** once it needs routing, human-task inboxes or several approval levels
- "We'll schedule it with cron / `setInterval`" → **CAP task queue first** (`cds.queued(srv).schedule(event).every('1h')`); Job Scheduler only if it must be operator-controlled outside the app
- "Let's bind the Job Scheduler for this nightly reconciliation" → first prove `cds.queued(...).schedule(...).every(...)` can't do it; framework-closer is the default
- "We'll save uploads to `./uploads/`" → **Object Store + attachments plugin**
- "We'll send email from nodemailer" → **Mail destination / plugin**
- "We'll cache results in a module-level `Map`" (multi-instance) → **Redis**
- "We'll put the client secret in an env var" → **Credential Store / binding**
- "We'll call OpenAI directly" → **SAP AI SDK via AI Core**
- "We'll build a Teams webhook" → **Alert Notification Service**
- "We'll deploy the UI5 app with the CAP server" → **HTML5 App Repo +
  Approuter**
- "We need to call our backend via a public URL and whitelist IPs" →
  **Destination + Cloud Connector**
