---
name: framework-first-review
description: >-
  Runs a mandatory 3-layer capability audit (SAP BTP → CAP → Fiori
  Elements) on any requirement BEFORE custom code is written, enforcing
  "use the platform", "closest to the stack wins", and "model behavior
  as CDS actions/functions, not plain JS". TRIGGER when: user pastes a
  user story / acceptance criteria / requirement / Jira ticket / PRD /
  design doc / spike; says "as a user I want", "we need to", "let's
  build", "implement", "add a feature", "new requirement", "custom
  handler", "custom controller", "custom UI", "freestyle app",
  "write a function for"; reviewing a junior-developer plan; reviewing
  a PR that introduces new behavior or a new dependency; user asks
  "how should we build X". Also trigger whenever the instinct is to
  just start coding in Node.js / Java / UI5 instead of checking for
  existing BTP services, CDS features, or Fiori annotations first.
  SKIP: for pure bugfixes, renames, refactors, typo or formatting
  changes, or edits that do not introduce new capabilities.
---

# Framework-First Review

## Why this skill exists

User stories, acceptance criteria, and junior-dev designs rarely speak in the
idioms that CAP, Fiori Elements, and BTP offer. Left unchallenged, they turn
CAP projects into plain Node.js/Java apps that happen to depend on `@sap/cds`,
with custom CRUD, hand-rolled validations, bespoke draft handling, freestyle
UI5 where annotations would suffice, and re-implementations of managed BTP
services (audit log, destinations, workflow, event mesh, identity, job
scheduler, ...). The result is technical debt and deviation from the supported
upgrade path.

> **Platform & framework first — custom code last.** Custom handlers and
> freestyle UI5 are an **escape hatch**, not the default.

## Three complementary principles

All three must hold at the same time. They catch different failure modes.

### Principle 1 — Use the platform, don't rebuild it

If SAP BTP offers a managed service for the capability (audit log, destination,
identity, mail, object store, workflow, event mesh, AI Core, ...), consume it.
Do not re-implement platform-native functionality — it creates technical debt
and deviates from the supported upgrade path.

### Principle 2 — Closest to the stack wins

When **both** the CAP framework **and** a BTP service could satisfy a
requirement, prefer the framework primitive. It is:

- **Simpler** — fewer moving parts, no extra service instance, no binding
- **Transactional** — tied to the CAP request/outbox transaction
- **Airplane-mode capable** — runs in `cds watch` without a cloud binding
- **Cheaper** — no service entitlement consumed
- **On the upgrade path** — maintained with the framework

Canonical examples where the framework wins:

| Capability | Framework primitive (preferred) | Platform service (only if framework doesn't fit) |
|---|---|---|
| Durable async / deferred work with retries & DLQ | **CAP task queue** — `cds.queued(srv).emit(event, data)` / `.send(action, data)`. The framework writes the message into the `cds.outbox.Messages` table **within the current transaction**; a worker picks it up after commit, retries with exponential backoff, keeps exhausted ones as dead letters. | SAP Job Scheduling Service, external queue |
| Scheduled / recurring work ("run every hour", "run after 1h") | **Same task queue** with the scheduling API: `srv.schedule(event, data).after('1h')` / `.every('1h')` / cron. Persistent, transactional, retried, DLQ-backed — no Job Scheduler instance needed. **`schedule` upserts one task per event name** — for per-record deferred work give each task its own name via `.as(...)`. | SAP Job Scheduling Service |
| In-app eventing / pipeline chaining | CDS `event` + `cds.queued(srv).emit(...)` | SAP Cloud Application Event Hub |
| Optimistic validation of inputs | `@mandatory`, `@assert.*` | Business Rules service |
| Role / instance-based authorization | `@requires`, `@restrict`, `$user` predicates | Custom policy service |
| Localization of field labels | `_i18n/` + `{i18n>Key}` | External translation service |
| Multi-tenant extensibility | CAP extensibility + MTX | Custom extension catalog |

> **What the framework does for you here** (and why this replaces Job Scheduler
> for most cases): the persistent queue is enabled by default and CAP
> auto-creates the `cds.outbox.Messages` entity in the DB.
> `cds.queued(srv).emit(event, data)` inserts the message **inside the current
> transaction**, so enqueueing and business data commit atomically. After
> commit, a worker reads the table, dispatches the message to the service's
> event handler, and on success deletes it. On failure the message stays in
> the table with `attempts` incremented; after `maxAttempts` (default 10) it
> remains as a dead-letter entry. A message stuck in `processing` longer than
> the queue `timeout` (default 1h) is picked up again, so delivery is
> **at-least-once** — consumers must be idempotent. All of this is in-app — no
> external service binding required. The queue table is persistent, so pending
> and scheduled work survives app restarts and redeployments. Source:
> [Event Queues in Node.js — capire](https://cap.cloud.sap/docs/node.js/event-queues).

> Use the platform service **only** when the framework primitive doesn't
> apply: cross-app triggers, schedules that operators must pause or change at
> runtime without an app deployment, or requirements outside the app
> boundary. Document the reason in the decision record.

### Principle 3 — Model behavior as CDS actions/functions, not just internal JS

Any non-CRUD operation that represents a **business capability** — "approve
order", "recompute risk score", "cancel subscription", "reset password",
"trigger reconciliation", "sync tenant" — belongs in the CDS service model
as a first-class `action` or `function`, not as a bare TypeScript/JavaScript
function called only from within the app.

```cds
service OrderService {
  entity Orders as projection on db.Orders actions {
    action  approve  (reason : String);                 // bound action
    function isValid ()                returns Boolean; // bound function
  };

  action  rebuildIndex ();                              // unbound action
  function sum  (x : Integer, y : Integer) returns Integer; // unbound function
}
```

Why this matters:

- **Typed, documented interface** — params and return types are part of CSN,
  compiled into OData `$metadata` and OpenAPI; no surprise about the shape
  of the operation.
- **Automatically HTTP-callable once deployed** — `GET
  /service/OrderService/sum(x=1,y=2)`, `POST
  /service/OrderService/Orders(ID=…)/OrderService.approve` with JSON body
  (adesso `@path: '/service/<ServiceName>'`). No extra
  routing code, no custom controller. External systems, tests, and ops
  tooling can call it without the app being rebuilt to expose it.
- **Authorization is declarative** — `@requires` / `@restrict` on the
  action/function is enforced by the runtime; no hand-coded role checks.
- **Fiori Elements wires it automatically** — `UI.DataFieldForAction` binds
  a button (list-row or object-page) directly to the action; confirmation
  dialogs, `@Core.OperationAvailable` gating, and `Common.SideEffects`
  refresh all compose on top.
- **Queueable** — `cds.queued(srv).send('rebuildIndex')` works because
  actions are events; the task queue gives you persistence + retries +
  DLQ for free.
- **Typed programmatic API** — `cds.connect.to('OrderService')` yields
  `srv.approve(...)` / `srv.rebuildIndex()` mirror methods, so other
  services and tests call it without building HTTP requests.
- **Testable as a contract** — HTTP or CQN tests pin the public behavior,
  not a private JS function signature.

The right pattern is still thin handler + `srv/code/<svc>/…` logic module
(see `skills/cap-development`). The rule is that the **interface is CDS**
and the **implementation is JS/TS**:

```javascript
// srv/order-service.js — thin wiring
import cds from '@sap/cds';
import approve from './code/order-service/orders-on-approve.js';
import rebuildIndex from './code/order-service/on-rebuildIndex.js';

export class OrderService extends cds.ApplicationService {
  async init() {
    const { Orders } = this.entities;
    this.on('approve', Orders, req => approve(req, this));
    this.on('rebuildIndex', req => rebuildIndex(req, this));
    return super.init();
  }
}
```

When a bare JS function in `srv/code/utils/…` grows parameters, a return
shape, or a second call site, that is the signal to promote it to a CDS
action/function on the appropriate service.

**Do not** design a business operation as "an exported function that another
handler imports" when you could design it as an unbound action on the
relevant service. Internal helpers (formatting, encoding, small pure
utilities) stay as JS — business operations do not.

## Mandatory rule

**Before** writing or approving code for any non-trivial requirement,
run the three-layer capability audit below and produce a short decision
record. "Non-trivial" = anything beyond a pure bugfix or a renaming.

The three layers, in this order:

1. **BTP layer** — is there a managed SAP BTP service that already does this?
2. **CAP layer** — is there a CDS annotation, generic provider, plugin, or
   out-of-the-box capability that already does this?
3. **Fiori Elements layer** — is there an annotation-driven pattern that
   already does this?

Only after all three layers are deliberately rejected — with reasons — may you
propose a custom implementation.

### Tie-breaker — when more than one layer offers a solution

If both the BTP layer and the CAP layer offer a solution, apply **Principle 2
— Closest to the stack wins**: pick the CAP-framework primitive unless it
demonstrably doesn't fit. Record the reason either way. The most common trap
here is the **CAP task queue** (`cds.queued(srv).emit/send(event, data)` and
`srv.schedule(event, data)`, backed by the persistent `cds.outbox.Messages`
table with retries, DLQ, and scheduling via `.after('1h')` / `.every('1h')`) vs. **SAP Job Scheduling
Service** — framework wins; and **CDS `event` + `cds.queued`** vs. **SAP
Cloud Application Event Hub** for intra-app eventing — framework wins
(Event Hub is for cross-app).

## When to invoke this skill

Invoke **proactively** whenever the user input contains any of:

- a user story, acceptance criterion, requirement, ticket, or Jira/backlog item
- words like "we need to", "let's build", "implement", "add a feature",
  "as a user I want"
- a design proposal, spike result, solution sketch, or architecture idea
- review of a junior-dev plan, PR description, or code change introducing
  new behavior
- the phrases "custom handler", "custom UI", "custom controller",
  "extension", "freestyle app", "new service for …"

Stop the user before implementation starts. Run the audit first.

## Review workflow

Copy this checklist into your working notes and track progress explicitly:

```
Capability Audit:
- [ ] Restate the requirement in one sentence (what / who / why)
- [ ] Layer 1 — BTP service audit
- [ ] Layer 2 — CAP framework audit
- [ ] Layer 3 — Fiori Elements audit
- [ ] Decision record written
- [ ] Custom code only if all three layers deliberately rejected
```

### Step 0 — Restate the requirement

Rewrite the user story in one sentence of the form:

> As `<role>`, I need `<capability>` so that `<outcome>`.

If the user didn't give you a user story, force yourself to infer one. A
vague ticket ("add a checkbox") must be translated into a capability before
audit.

### Step 1 — BTP service audit (don't rebuild the platform)

Ask: **Is this a platform-level concern with a managed SAP BTP service?**

Common rebuild traps (non-exhaustive — see `references/btp-service-catalog.md`
for the full list with trigger phrases):

| Requirement contains… | Likely managed service | Don't custom-build |
|---|---|---|
| "audit trail", "who changed what", "GDPR log" | SAP Audit Log Service + `@cap-js/audit-logging` | a custom audit table + handlers |
| "call an on-prem / external system" | Destination + Connectivity + `cds.connect.to` | hard-coded URLs, custom auth |
| "approve / reject / cancel", "status flow" **inside one app** | CAP status-transition flows: `@flow.status` on the status element + `@from` / `@to` on bound actions (official `cap-developer`; pre-GA) | status checks + `UPDATE` in handlers |
| "long-running approval", "human task", "route to manager", "multi-level approval" | SAP Build Process Automation / Workflow | state machines in CAP handlers |
| "business rule", "decision table" | SAP Business Rules / Decisions | `if/else` chains in JS |
| "scheduled job", "cron", "run nightly", "every N minutes" | **CAP task queue first**: `cds.queued(srv).schedule(event, data).every('1h')` / `.after('1h')` — persistent in `cds.outbox.Messages`, transactional, retried, DLQ-backed. Only use **SAP Job Scheduling Service** when the schedule must be operator-managed outside the app. | `setInterval`, custom scheduler, reaching for Job Scheduler by default |
| "store a file", "attachment", "upload" | `@cap-js/attachments` + Object Store | BLOB columns, custom upload |
| "event-driven integration", "publish/subscribe" | SAP Cloud Application Event Hub | custom webhook tables |
| "single sign-on", "SAML", "login" | SAP Cloud Identity Services (IAS) + xsuaa | custom login flows |
| "feature flag", "A/B toggle" | CAP Feature Toggles + IAS groups | custom env-var branching |
| "credential / secret storage" | SAP Credential Store | env vars / CAP config |
| "notification to user", "push email" | SAP Alert Notification / Mail plugin | custom SMTP code |
| "print output", "label printer" | SAP Print Service | raw IPP/SMB code |

For each item that matches, use the **CDS MCP `search_docs`** tool to confirm
the recommended CAP integration pattern (for example `"cap audit logging
plugin"`, `"cds destinations connectivity"`, `"cap mail plugin"`,
`"cap event hub messaging"`).

### Step 2 — CAP framework audit (use the abstractions you already have)

Ask: **Does CAP already serve this out-of-the-box?**

The big categories CAP already solves declaratively — **almost never write
custom code for these**. The baseline list (generic CRUD/OData, draft,
`@requires`/`@restrict`, `@assert.*`/`@mandatory`, `@readonly`/`@insertonly`,
`managed`, calculated elements, `localized` + `_i18n/`, `@flow.status`
status transitions) is owned by the official **`cap-developer`** skill
(*Declarative First*); remote services by **`cap-add-remote-service`**. On top
of that, check these adesso-relevant categories (details in
`references/capability-catalog.md`):

- **Non-CRUD business operations** — model as CDS `action` / `function`
  (bound or unbound) on the service. Typed params + return, OData HTTP
  endpoint, `@requires`/`@restrict`, `UI.DataFieldForAction` in Fiori, and
  queueable via `cds.queued`. Do **not** expose business operations as
  internal JS functions only (Principle 3).
- **Async processing** (`cds.queued(srv).emit(...)` per item with CDS events,
  `srv.schedule(...)` only for singleton/recurring tasks — not `setTimeout`,
  not `cds.spawn` for business logic that must not get lost)
- **Hierarchies** (`@hierarchy: parent` for recursive trees)
- **Feature toggles** (`cds add toggles` / `cds.context.features`)
- **Extensibility** (CAP extensibility + MTX for customers/tenants)

**Authoritative check**: use **CDS MCP `search_docs`** with targeted queries
(for example `"served out of the box"`, `"fiori drafts"`, `"input validation
@assert"`, `"managed aspects cuid"`, `"cds connect to external service"`,
`"cds.queued outbox"`, `"instance-based authorization"`) before concluding
that something needs custom code.

Also use **CDS MCP `search_model`** to see whether an existing service/entity
already covers this use case — maybe the "new endpoint" is a projection on an
existing one (per `skills/cap-development`: one service per use case, not one
service for all use cases).

### Step 3 — Fiori Elements audit (annotations over code)

Ask: **Does Fiori Elements already render this from OData annotations?**

Common rebuild traps — prefer the annotation, never a custom fragment:

| Requirement contains… | Use this annotation pattern | Don't custom-build |
|---|---|---|
| "list of X with columns" | `UI.LineItem` on the entity | custom table fragment |
| "detail page", "object view" | `UI.HeaderInfo` + `UI.Facets` + `UI.FieldGroup` | custom XML view |
| "filter bar" | `UI.SelectionFields` | custom Smart Filter Bar JS |
| "KPI/header with coloring" | `UI.HeaderInfo` + `UI.DataPoint` + `Criticality` | custom controller logic |
| "value help / F4 dropdown" | `Common.ValueList` (+ value-list entity) | custom `sap.m.Select` |
| "section / group of fields" | `UI.FieldGroup` + `UI.Facets.ReferenceFacet` | custom form |
| "charts inline" | `UI.Chart` | freestyle VizFrame |
| "status with color" | `Criticality` + code list with `@cds.autoexpose` | custom formatters |
| "dependent field / refresh other field" | `Common.SideEffects` | custom change-handler JS |
| "editable with draft / save & resume" | `@odata.draft.enabled` on service entity | custom "save" action |
| "validation error in UI" | `req.error()` + `target` → rendered inline | custom MessageToast JS |
| "custom action button" | `UI.LineItem Inline`/`UI.DataFieldForAction` | `Press` handler on custom button |
| "analytical table", "grouping/drilldown" | `UI.PresentationVariant` + `$apply` | custom analytics code |
| "tree / hierarchy list" | `@hierarchy: parent` + TreeTable config | custom tree control |

**Authoritative check**: use **Fiori MCP `search_docs`** (`"UI.LineItem"`,
`"Common.SideEffects"`, `"UI.Facets"`, `"Criticality"`, `"Common.ValueList"`,
`"@odata.draft.enabled"`), and use the **Fiori MCP 3-step workflow**
(`list_functionality` → `get_functionality_details` → `execute_functionality`)
to discover whether the Fiori tooling can apply the change declaratively. Only
fall back to custom extensions (custom section, custom column, controller
extension) if the MCP reports no supported functionality.

### Step 4 — Decision record

Produce (and keep) a short record. Format:

```markdown
## Capability audit — <feature name>

**Requirement**: <one-sentence user story>

**BTP layer**: <service considered + why accepted/rejected>
**CAP layer**: <annotation/provider/plugin considered + why accepted/rejected>
**Fiori layer**: <annotation/Fiori MCP functionality considered + why accepted/rejected>

**Decision**: <declarative via …> OR <custom code, because …>
**Closest-to-stack check**: <if multiple layers applied, which one was picked and why>
**Evidence**: <CDS MCP / Fiori MCP queries consulted, Capire links>
```

Any decision of "custom code" **must** cite the specific declarative
alternative that was rejected and the concrete reason (e.g. "draft not usable
because this is a system-to-system integration service with no UI" — not
"draft is complicated").

Any decision that picks a **BTP service over a CAP/Fiori primitive** (or
custom code over a CAP/Fiori primitive) **must** justify the choice against
Principle 2. "We always use Job Scheduler" is not a justification; "this
schedule is owned by another team's app and must be paused or re-timed by ops
at runtime without an app deployment" is.

## Hard rules

- **No custom CRUD handlers** for operations CAP already serves. A
  `srv.on('READ', ...)` or `srv.on('CREATE', ...)` that exists only to
  re-implement stock behavior must be deleted.
- **No hand-rolled draft logic** (isDraft flags, shadow rows, "save"
  actions) — use `@odata.draft.enabled`.
- **No hand-rolled audit columns** outside `managed` — use
  `@cap-js/audit-logging` for audit trails, `managed` for who-changed-what.
- **No freestyle UI5 app** when a requirement maps to List Report / Object
  Page / Analytical List Page. If a stakeholder insists on freestyle,
  require a written justification naming the missing Fiori Elements
  capability.
- **No bare JS functions for business operations** — model them as CDS
  `action` / `function` on the appropriate service (Principle 3). JS modules
  in `srv/code/<svc>/…` are the *implementation* behind those actions, not
  the public interface. A handler that imports `./code/utils/approveOrder.js`
  with several parameters and a return object is the trigger to promote
  that function to an `action approve(...)` on the service.
- **No custom scheduler / retry / queue** for async work — use the
  **CAP task queue** (`cds.queued(srv).emit(...)` / `.send(...)` for deferred
  dispatch, `srv.schedule(event, data).after('1h')` / `.every('1h')` for
  delayed or recurring tasks — with a unique `.as(name)` when the task is
  per record, because `schedule` upserts by name). The framework persists the message in
  `cds.outbox.Messages` in the same transaction as the business data and a
  worker picks it up after commit with retries and DLQ. Do **not** reach for
  SAP Job Scheduling Service when the task queue would do — framework-first
  (see Principle 2).
- **No hard-coded external URLs / auth** — use destinations +
  `cds.connect.to`.
- **No custom i18n registry** — use `_i18n/`, `webapp/i18n/`, and
  `localized`/`_texts` as defined in `skills/cap-development`.

## When custom code *is* the right answer

Custom code is legitimate for:

- Genuine business logic specific to this project (pricing rules, domain
  calculations, state transitions not expressible declaratively).
- Integration glue where the external system has no CAP-native adapter.
- UI requirements that concretely exceed Fiori Elements (explicitly cited,
  not assumed).
- Performance-critical hotspots where a generic provider was measured to
  be too slow.

In those cases, follow the coding standards in
`skills/cap-development/references/coding-standards.md`
(thin handler + `srv/code/<service>/…` logic modules + CQL + `cds.log`).

## Sibling skills

- **`skills/cap-development`** — how to implement correctly once the audit
  concludes "custom".
- **`skills/cap-project-scaffold`** — `cds add` for BTP features
  (audit-logging, xsuaa, hana, mta, messaging, destinations, ...). Use it
  instead of hand-rolling BTP integration.
- **`skills/fiori-elements`** — Fiori MCP 3-step workflow and annotation
  patterns.
- **`skills/fiori-generator-cli`** — scaffold Fiori apps with the generator
  rather than freestyle UI5.
- **`skills/cap-websocket`** — managed real-time pattern (plugin +
  SideEffects) instead of custom WebSocket code.
- **`skills/sap-ai-sdk`** — SAP AI SDK instead of custom OpenAI SDK wrappers.

## Reference material

- `references/capability-catalog.md` — CAP and Fiori Elements capabilities
  commonly rebuilt from scratch, with the correct declarative alternative
  and CDS/Fiori MCP lookup hints.
- `references/btp-service-catalog.md` — BTP managed services commonly
  rebuilt from scratch, with trigger phrases, the managed service name,
  and the CAP integration entry point.
