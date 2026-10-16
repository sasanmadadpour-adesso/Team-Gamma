# CAP + Fiori Elements Capability Catalog

Catalog of capabilities that CAP and Fiori Elements already provide **out of
the box** — and that are the single most common source of custom-code
technical debt when rebuilt from scratch. Use this list during the capability
audit (see `SKILL.md`). The right-hand column tells you what to type into the
CDS MCP or Fiori MCP `search_docs` tool to find the authoritative Capire /
Fiori documentation.

> Rule of thumb: if a requirement fits a row in this table, the correct
> implementation is the **declarative pattern** in column 2. Custom code is
> wrong unless you can name a concrete reason why the declarative pattern
> doesn't apply.

## CAP framework — service-level operations (actions & functions)

Reference: [Custom Actions and Functions — capire](https://cap.cloud.sap/docs/guides/services/custom-actions).

Business operations that are not CRUD — "approve", "cancel", "recompute",
"sync", "reset", "rebuild", "validate" — should be modeled as CDS `action` /
`function` on the service. This is **Principle 3** of the audit: the public
interface is CDS, the implementation is JS/TS in `srv/code/<svc>/…`.

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| Entity-specific operation ("approve this order") | **bound action** in `entity X { … } actions { action approve(reason : String); }` — available as `POST .../Service/X(ID)/Service.approve` | `"bound action entity actions cds"` |
| Entity-specific read computation ("is valid?") | **bound function** — available as `GET .../Service/X(ID)/Service.isValid()` | `"bound function entity cds"` |
| Operation on the *collection* | bound action `action customCreate (in : many $self, x : String) returns X;` | `"bound action collection many $self"` |
| Service-wide operation ("rebuild search index") | **unbound action** at service scope — available as `POST .../Service/rebuildIndex` | `"unbound action service"` |
| Pure read-only computation on service scope | **unbound function** — available as `GET .../Service/sum(x=1,y=2)` | `"unbound function service"` |
| Typed parameters and return | declared in CDS; propagate to CSN, OData `$metadata`, OpenAPI | `"action parameters return types csn"` |
| Mandatory parameter | `action discard(reason : String not null);` | `"action not null mandatory parameter"` |
| Authorize the action | `@requires: 'role'` / `@restrict` on the action (instance-based supported for bound actions) | `"@restrict action function authorization"` |
| Bind action to a button in Fiori Elements | `UI.DataFieldForAction` referencing the qualified action name | `"UI.DataFieldForAction bound action"` |
| Gate action availability per row | `@Core.OperationAvailable` on the action | `"@Core.OperationAvailable"` |
| Call the action from another service / tests | Typed generated API: `srv.approve('Orders', ID, { reason })`; or CQN / HTTP | `"typed service api connect to actions"` |
| Queue the action for async processing | `cds.queued(srv).send('rebuildIndex', data)` — actions dispatched as queue messages | `"cds.queued send event action"` |
| Reuse actions across entities | Define in an aspect: `aspect TravelActions { actions { action rejectTravel(); } }` then `extend X with TravelActions;` | `"actions functions in aspects extend"` |

Don't expose a business operation as an internal JS function that only the
handler imports. If the function has a non-trivial signature (parameters,
a structured return value) or a second caller, promote it to a CDS
`action`/`function` and keep the JS as the thin implementation behind a
`this.on('actionName', …)` registration (per the handler pattern in
`skills/cap-development`).

Typical telltale of "should be an action":

```js
// Smell — business operation hidden as internal util
import approveOrder from './code/utils/approveOrder.js';
// … inside init(), with const { Orders } = this.entities
this.before('UPDATE', Orders, async req => {
  if (req.data.status_code === 'approved') {
    await approveOrder(req.data.ID, req.user, { reason: req.data.reason });
  }
});
```

Correct — the operation is promoted to a first-class action, the handler is
thin, and the operation is now callable over HTTP and from Fiori actions,
queueable, and authorizable independently of the `UPDATE`:

```cds
// srv/order-service.cds
service OrderService {
  entity Orders as projection on db.Orders actions {
    @requires: 'OrderApprover'
    action approve(reason : String) returns Orders;
  };
}
```

```js
// srv/order-service.js
import cds from '@sap/cds';
import approve from './code/order-service/orders-on-approve.js';

export class OrderService extends cds.ApplicationService {
  async init() {
    const { Orders } = this.entities;
    this.on('approve', Orders, req => approve(req, this));
    return super.init();
  }
}
```

## CAP framework — generic service providers

Reference: [Generic Service Providers — Served Out-of-the-Box](https://cap.cloud.sap/docs/guides/services/served-ootb).

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| Read/List with filter, sort, paging | Generic READ handler + OData `$filter` / `$orderby` / `$top` / `$skip` — nothing to implement | `"served out of the box pagination sorting"` |
| Expand related data in one call | OData `$expand` or CQL with explicit columns: `.columns(o => { o.ID, o.title, o.items(i => { i.ID, i.quantity }) })` | `"cql select expand associations"` |
| Free-text search on entity | `@cds.search` annotation (choose which fields) | `"cds search annotation"` |
| Deep insert (parent + children in one POST) | Composition + generic CREATE on parent | `"deep insert composition"` |
| Server-driven pagination (max 1000 rows, `@odata.nextLink`) | Built-in; tune with `@cds.query.limit` | `"@cds.query.limit pagination"` |
| Default sort order on a list | `entity X as projection on db.X order by field asc;` | `"implicit sorting order by"` |
| Hierarchy / tree table | `@hierarchy: parent` + TreeTable manifest config | `"hierarchical tree views @hierarchy"` |

## CAP framework — drafts

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| "Save & resume later", "draft before publish", "work-in-progress rows" | `@odata.draft.enabled` on the **service** entity (adesso: in `srv/annotations/<service-name>/restrictions.cds`) | `"fiori draft @odata.draft.enabled"` |
| Hide a field only while editing a draft | `@UI.Hidden: (not $draft.IsActiveEntity)` | `"IsActiveEntity expression annotation"` |
| Validate before activation | `before SAVE` / `before CREATE` handler | `"fiori drafts activating"` |
| Extra persistence/annotations on draft rows | `annotate Service.Entity.drafts with …` | `"annotating draft entities"` |

**Never**: add your own `isDraft`, `status = 'draft'`, or shadow-table
approaches. They do not integrate with the Fiori Elements draft UX (discard,
unsaved-changes dialog, collaborative locking).

## CAP framework — input validation

Reference: [Declarative Constraints](https://cap.cloud.sap/docs/guides/services/constraints).

The baseline table (`@mandatory`, `@assert.range`, `@assert.format`, `@assert.target`,
`@assert: (case …)`, `@readonly`, `@insertonly`) is in the official **`cap-developer`** skill
(*Declarative First*). Additional lookups:

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| Unique key other than the primary key | `@assert.unique.<name>: [field1, field2]` on the **db** entity (becomes a DB unique constraint) | `"@assert.unique"` |
| Referential integrity at DB level | `cds.env.features.assert_integrity = 'db'` | `"@assert.integrity database constraints"` |

Messages for all of these go into `_i18n/messages.properties` (see **`cap-annotations`**).

**Never**: re-implement these as `before CREATE` handlers with `if
(!req.data.foo) req.reject(...)`.

## CAP framework — managed aspects

`cuid` / `managed` are baseline (**`cap-developer`**). Additional lookups:

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| Currency / Country / Language code list | `using { Currency, Country, Language } from '@sap/cds/common';` | `"@sap/cds/common Currency Country"` |
| Status / type code list | Extend `sap.common.CodeList` with `@cds.autoexpose` | `"sap.common.CodeList autoexpose"` |

**Never**: add `createdAt/By` columns manually; never set them from handler
code (exception: data migration).

## CAP framework — authorization

Reference: [Authorization & Access Control](https://cap.cloud.sap/docs/guides/security/authorization).

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| "Only logged-in users" | `@requires: 'authenticated-user'` on service | `"@requires authenticated-user"` |
| Role-based access on a service / entity | `@requires: 'RoleName'` + `@restrict` | `"@restrict grant roles"` |
| "User can only see their own rows" | `@restrict: [{ grant: 'READ', where: 'createdBy = $user' }]` | `"instance-based authorization exists"` |
| Tenant isolation | Multitenancy (MTX) — separate DB containers per tenant, not row predicates | `"multitenancy mtx tenant isolation"` |
| Read-only / insert-only entity | `@readonly` / `@insertonly`; fine-grained: `@Capabilities.DeleteRestrictions.Deletable: false` | `"@readonly @insertonly capabilities"` |
| Per-action restriction | `@restrict` on the action (entity or bound) | `"instance-based restrictions bound actions"` |

**Never**: implement authorization in JS by reading `req.user.is('admin')` as
the only gate — use `@requires` so it's part of the metadata (and gets
enforced consistently by the runtime).

## CAP framework — async processing

The framework-native primitive for all of this is the **CAP task queue**
(`cds.queued(srv)`, docs also refer to it as the *outbox*). It is enabled by
default, auto-creates the `cds.outbox.Messages` DB entity and, when you call
`cds.queued(srv).emit(event, data)` / `.send(...)` / `srv.schedule(...)`, writes
the task row **inside the current transaction**. A worker picks it up after
commit, dispatches it to the service's event handler, retries with
exponential backoff on failure (`maxAttempts` default 10), and leaves
exhausted messages in the table as the dead-letter queue. Messages stuck in
`processing` beyond the queue `timeout` (default 1h) are picked up again, so
delivery is **at-least-once** — consumers must be idempotent.
Source: [Event Queues in Node.js — capire](https://cap.cloud.sap/docs/node.js/event-queues).

> **`emit` / `send` insert, `schedule` upserts.** Every `emit` / `send` creates a new
> queue entry. `schedule()` keeps **one task per event name** (or per `.as(name)`), so a
> second `schedule('X', …)` replaces the first. Use `schedule` for singleton and recurring
> tasks; for per-record deferred work give each task a unique name with `.as(...)`.

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| "Run this in the background after save" | CDS `event` + `cds.queued(srv).emit(event, data)` — written to `cds.outbox.Messages` in the same tx, dispatched after commit | `"cds.queued event queue"` |
| Retry on transient failure | Built into the task queue (`maxAttempts`, exponential backoff) | `"outbox maxAttempts retry"` |
| Long pipeline with steps | Chain events: each consumer calls `cds.queued(srv).emit(nextEvent, ...)` | `"cap pipeline events outbox"` |
| Dead-letter queue management | Expose `cds.outbox.Messages` as a read-only projection with `revive` / `delete` bound actions (see the Capire *Managing the Dead Letter Queue* sample) | `"outbox dead letter queue revive"` |
| "Run after 1 hour", "defer by N minutes" | `srv.schedule(event, data).after('1h')` — same persistent queue; per record add `.as('remind-' + ID)` so tasks don't overwrite each other | `"event queues scheduling after"` |
| "Cron / run every hour / every N minutes" | `srv.schedule(event, data).every('1h')` (or a 5-field cron string) — re-schedules itself after each processing | `"event queues scheduling every cron"` |
| "Cron / scheduled job" (Java) | CAP Java transactional outbox (same concept) + optimized task scheduler (`cds.taskScheduler.enabled: true`) | `"cap java transactional outbox task scheduler"` |
| Trigger processing immediately (e.g. after reviving a dead letter) | `await cds.flush()` — the background runner picks up pending messages on its own otherwise | `"event queues manual processing flush"` |
| Success / failure callbacks (Alpha) | `srv.after('event/#succeeded', …)` / `srv.after('event/#failed', …)` | `"event queues callbacks succeeded failed"` |
| Disable the queue for a specific service (immediate emit) | `"outboxed": false` in service config | `"outboxed immediate emit"` |
| Publish domain events **between apps** (cross-app integration) | `cds.queued` over a messaging service (`kind: enterprise-messaging` / Event Hub) | `"cap messaging enterprise-messaging"` |

**Never**: `setInterval`, `setTimeout`, or `Promise.all().catch(() => {})` for
business-critical async work. Never reach for **SAP Job Scheduling Service**
when the CAP task queue would solve it — the framework primitive is closer to
the stack (in-app, transactional, persistent via DB, retried, DLQ-backed, no
extra service binding, works in airplane mode because it's just a DB table).
Job Scheduler is reserved for schedules that must be operator-controlled
outside the app (pause/resume without a redeploy, cross-app triggers,
schedules that must remain visible to non-developer ops tooling).

**Do not confuse with `cds.spawn`.** `cds.spawn({ every, after }, fn)` is a
different primitive (in-process background job, own root transaction, no
persistence, no retries, no DLQ, no cross-instance coordination). It is not
the answer to "run this every hour durably" — use the task queue for that.
`cds.spawn` is appropriate for in-process detached work that does not need
persistence (e.g. draining an in-memory buffer, health probes).

Task-queue skeleton (Node.js):

```js
// srv/order-service.js
import cds from '@sap/cds';
import reconcile from './code/order-service/on-reconcileOrders.js';

export class OrderService extends cds.ApplicationService {
  async init() {
    this.on('ReconcileOrders', msg => reconcile(msg, this));
    await this.schedule('ReconcileOrders', {}).every('1h');
    return super.init();
  }
}
```

The task is written to `cds.outbox.Messages` on startup and re-scheduled
automatically after each processing. Because `schedule` upserts by task name,
running the registration on every startup (and on every app instance) keeps
exactly one task. Pending tasks survive restarts; abandoned `processing`
entries are reclaimed after the queue `timeout`.

## CAP framework — localization / i18n

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| Translatable field labels | `_i18n/i18n.properties` + `{i18n>Key}` in CDS annotations | `"i18n labels annotations"` |
| Translatable error messages | `_i18n/messages.properties` + pass the key to `req.reject` / `req.error` (CAP localizes it) | `"localized messages req.reject"` |
| Translatable *data* (status names, code list) | `localized String` + `<Entity>_texts_<lang>.csv` | `"localized String _texts csv"` |
| Frontend UI strings | `app/<appname>/webapp/i18n/i18n.properties` | `"fiori elements i18n resource bundle"` |

**Never**: bake user-facing English strings into code or CDS annotations. Translatable *data* belongs in `localized` fields with `_texts` CSVs.

## CAP framework — external service consumption

Owned by the official **`cap-add-remote-service`** skill: `cds import` / npm-package
import, `cds.requires` config, consumption views, delegation vs. replication, outboxed writes,
Cloud SDK packages, in-process mocking. adesso deltas (profile-scoped destinations, BTP
Destination wiring, the S/4HANA "no API for what I need" decision) are in
`cap-development/references/external-service-consumption.md`. REST services (`kind: "rest"`)
need a custom mock — see `cap-development/references/coding-standards.md` → *Service Mocking &
Airplane Mode*. Principal propagation and on-prem access go through BTP Destination +
Connectivity (`"principal propagation destination"`).

**Never**: `fetch('https://hard-coded-url/...')` with hand-assembled auth
headers.

## CAP framework — extensibility

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| "Customers want to add fields" (SaaS) | CAP extensibility (`cds add extensibility`, MTX) | `"cap extensibility customers"` |
| Feature flags (A/B, opt-in) | `cds add toggles` + `cds.context.features` | `"feature toggles cap"` |
| Multi-tenant isolation | `mtx` / streamlined MTX | `"multitenancy mtx"` |

## Fiori Elements — List Report / Object Page / ALP

Reference: [Serving SAP Fiori UIs — capire](https://cap.cloud.sap/docs/guides/uis/fiori).

| Requirement | Declarative annotation | MCP lookup hint |
|---|---|---|
| Table columns on a list page | `UI.LineItem: [{ $Type: 'UI.DataField', Value: field, Label: '{i18n>…}' }, …]` | `"UI.LineItem annotation"` |
| Object page header (title, subtitle, image) | `UI.HeaderInfo` | `"UI.HeaderInfo title description"` |
| Header KPIs / data points | `UI.DataPoint` + `UI.HeaderFacets` | `"UI.DataPoint UI.HeaderFacets"` |
| Tabs / sections on object page | `UI.Facets` + `UI.ReferenceFacet` | `"UI.Facets ReferenceFacet"` |
| Field group on object page | `UI.FieldGroup` | `"UI.FieldGroup"` |
| Filter bar fields | `UI.SelectionFields` | `"UI.SelectionFields filter bar"` |
| Sortable presentation variants, default variant | `UI.PresentationVariant`, `UI.SelectionPresentationVariant` | `"UI.PresentationVariant"` |
| Value help (F4) | `Common.ValueList` + value-list entity | `"Common.ValueList annotation"` |
| Semantic key in URL | `Common.SemanticKey` | `"Common.SemanticKey"` |
| Human-readable text for code fields | `Common.Text` + `Common.TextArrangement` | `"Common.Text TextArrangement"` |
| Status with color / icon | `Common.Criticality` (or path to a criticality field) | `"criticality color coding"` |
| Refresh one field when another changes | `Common.SideEffects` | `"side effects annotation"` |
| Trigger UI refresh from backend | `Common.SideEffects` + push via `@cap-js-community/websocket` | `"cap-js websocket side effects"` |
| Action button on list row / object page | `UI.DataFieldForAction` / `UI.DataFieldForIntentBasedNavigation` | `"UI.DataFieldForAction bound action"` |
| Confirmation dialog for action | `@Common.IsActionCritical: true` on the action | `"IsActionCritical confirmation dialog"` |
| Inline creation in a list | `UI.LineItem` with `@UI.CreateHidden: false` + draft | `"inline creation list report"` |
| Chart on object page | `UI.Chart` + `UI.PresentationVariant` | `"UI.Chart object page"` |
| Tree table | `@hierarchy: parent` + `hierarchyQualifier` | `"tree table hierarchy fiori"` |
| Analytical List Page (KPI + chart + table) | ALP template + `Aggregation.ApplySupported` | `"analytical list page"` |

## Fiori Elements — messages, navigation, lifecycle

| Requirement | Declarative pattern | MCP lookup hint |
|---|---|---|
| Show error/warning inline on a field | `req.error(400, msg, 'fieldName')` — rendered by FE | `"req.error target field fiori"` |
| Navigate from list to another app | Intent-based navigation + cross-app tile | `"cross application navigation semanticObject"` |
| Disable action depending on row state | `@Core.OperationAvailable` | `"@Core.OperationAvailable"` |
| Determine / recalculate fields on change | `Common.SideEffects` `TargetProperties` / `TargetEntities` | `"side effects TargetProperties"` |
| Require field combinations (dynamic mandatory) | `@Common.FieldControl` binding | `"Common.FieldControl dynamic mandatory"` |

## Using the CDS MCP and Fiori MCP during review

Always prefer **primary sources** over memory. The MCPs return authoritative
Capire/Fiori docs.

- **CDS MCP `search_docs`** — use for CAP/CDS syntax, annotations, Node.js/Java
  runtime APIs, authorization, drafts, outbox, external services, i18n.
- **CDS MCP `search_model`** — check whether an existing service or entity
  already covers the requirement (avoid creating a parallel service).
- **Fiori MCP `search_docs`** — use for UI annotations, manifest config, Fiori
  Elements feature names.
- **Fiori MCP `list_functionality` → `get_functionality_details` →
  `execute_functionality`** — apply the change declaratively via the Fiori
  tooling instead of hand-editing annotations/manifest.

If, after using these tools, no declarative capability matches, **write this
in the decision record** (which queries you ran, what they returned) — this
becomes the justification for custom code.
