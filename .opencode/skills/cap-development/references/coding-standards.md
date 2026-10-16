# CAP Coding Standards

Authoritative coding standards for SAP CAP projects. Referenced by both Cursor rules/skills and Claude Code (CLAUDE.md).

> **Baseline: official `cap-developer` skill** (`capire/skills`, incl. `references/nodejs.md`).
> Core CDS modeling (built-in aspects, associations vs. compositions, naming), declarative-first
> annotations, the `before` / `on` / `after` handler-phase API, ESM module syntax, explicit
> column lists, round-trip minimization, intrinsic transactions, and sample-data generation are
> owned by SAP's official skill. The sections below are **adesso's project conventions on top of
> that baseline** — kebab-case file layout, one-service-per-use-case, thin handlers delegating to
> `srv/code/`, airplane-mode mocking, three-tier i18n, transactional queues, and pitfalls.
> Where this file shows code, it follows the official rules; if the two ever disagree, the
> official skill wins.

## Project Structure

```
my-cap-project/
├── _i18n/                       # Project-wide i18n (labels + messages)
│   ├── i18n.properties          # Default UI labels (used in annotations)
│   ├── i18n_de.properties       # German UI labels
│   ├── messages.properties      # All error messages (req.reject + @assert/@mandatory messages)
│   └── messages_de.properties   # German backend messages
├── db/                          # Domain models
│   ├── schema.cds               # All entity definitions
│   └── data/                    # Seed CSVs (generated with `cds add data`, then filled)
├── srv/                         # Service layer
│   ├── <service-name>.cds       # Service definition (one service per file, kebab-case)
│   ├── <service-name>.js        # Thin handler file (same base name as the .cds)
│   ├── annotations.cds          # The one top-level annotation file: imports every register.cds
│   ├── annotations/             # Service-layer annotation files — see cap-annotations
│   │   └── <service-name>/      #   register.cds imports every file in this folder
│   ├── external/                # Imported remote APIs (`cds import`)
│   └── code/                    # Implementation logic modules
│       ├── <service-name>/      # One subfolder per service (kebab-case)
│       │   ├── <entity>-on-<action>.js      # Bound action handler
│       │   ├── <entity>-before-<event>.js   # Bound before-event handler
│       │   ├── <entity>-after-<event>.js    # Bound after-event handler
│       │   ├── on-<action>.js               # Unbound action handler
│       │   ├── before-<event>.js            # Unbound before-event handler
│       │   └── after-<event>.js             # Unbound after-event handler
│       └── utils/               # Shared utilities (cross-service)
├── app/                         # Fiori Elements UIs
│   └── <appname>/
│       ├── annotations.cds      # UI annotations for this app (imports annotations/*.cds)
│       ├── annotations/         # value-helps.cds, side-effects.cds, labels.cds
│       ├── webapp/
│       └── ui5.yaml
└── project-context.md           # Project-specific config (models, services, pipeline steps)
```

### File Naming Conventions

| Location | Pattern | Example |
|----------|---------|---------|
| Service CDS | `srv/<service-name>.cds` (kebab-case) | `srv/order-service.cds` |
| Service handler | `srv/<service-name>.js` (same base name) | `srv/order-service.js` |
| Service annotations | `srv/annotations/<service-name>/<topic>.cds` | `srv/annotations/order-service/restrictions.cds` |
| Service annotation register | `srv/annotations/<service-name>/register.cds` | `srv/annotations/order-service/register.cds` |
| Top-level annotation file | `srv/annotations.cds` (exactly one, imports every `register.cds`) | `srv/annotations.cds` |
| Code subfolder | `code/<service-name>/` | `code/order-service/` |
| Bound action handler | `code/<service-name>/<entity>-on-<action>.js` | `code/order-service/orders-on-approve.js` |
| Bound before-event handler | `code/<service-name>/<entity>-before-<event>.js` | `code/order-service/orders-before-create.js` |
| Bound after-event handler | `code/<service-name>/<entity>-after-<event>.js` | `code/order-service/orders-after-read.js` |
| Unbound action handler | `code/<service-name>/on-<action>.js` | `code/sync-service/on-processOrder.js` |
| Unbound before-event handler | `code/<service-name>/before-<event>.js` | `code/sync-service/before-receiveEvent.js` |
| Unbound after-event handler | `code/<service-name>/after-<event>.js` | `code/sync-service/after-updateConfig.js` |
| Shared utilities | `code/utils/<name>.js` | `code/utils/aiClient.js` |

The `.cds` and `.js` base names must match exactly — CAP discovers the implementation by that
convention, so no `@impl` is needed (official `cap-developer`). The CDS **service name** stays
PascalCase (`service OrderService`); only the **file** is kebab-case. For CDS identifier and
`@path` naming see **`cap-cds-naming`**.

> **Migration note — current project state**
> Existing projects installed before this standard was adopted may have a flat `srv/code/` layout where all logic modules sit directly in `srv/code/` with no service subfolder, or PascalCase service files (`OrderService.cds`). Neither follows the standard above and must not be extended.
> - **Do not create new files directly in `srv/code/`** — always use `srv/code/<service-name>/`
> - Existing flat files are legacy; migrate them to `srv/code/<service-name>/` when you touch them
> - When renaming a PascalCase service file to kebab-case, rename the `.cds` and `.js` together and update every `using from` path that points at it
> - A Claude Code `PreToolUse` hook (installed via `npm run install:claude`) enforces the `srv/code/` rule automatically: attempting to write a `.js` file directly into `srv/code/` will be blocked with an explanation of the correct target path

### Why Strict Naming Matters

Logic modules that don't follow the `<entity>-<phase>-<event>` / `<phase>-<event>` convention are **discouraged**. When developers create their own organizational structures (e.g. `helpers/orderProcessing.js`, `lib/validations.js`, `shared/businessLogic.js`), these ad-hoc patterns are rarely consistent across a team and quickly become opaque to other developers. The strict naming convention ensures that anyone can find the logic for a given CDS event by filename alone — no need to trace imports through custom abstractions.

Each service subfolder under `code/` contains only the logic modules for that service. This mirrors the service boundary: `code/order-service/orders-on-approve.js` is unambiguously the `approve` action handler on `Orders` in `OrderService`. Keep `code/utils/` small and limited to genuinely reusable, stateless helpers shared across multiple services (e.g. formatting, encoding, SDK wrappers). Service-specific helpers that are not event handlers belong in the service subfolder without the `<entity>-<phase>-<event>` prefix (e.g. `code/order-service/orderClient.js`). If a utility grows large or contains domain logic, it belongs in a properly named handler module instead.

**Large `utils/` folders are a code smell.** They tend to accumulate over time without clear ownership or boundaries, eventually becoming a dumping ground for logic that belongs elsewhere. Beyond the clutter, they actively hurt knowledge transfer between projects: every project ends up with a differently shaped `utils/` tree, so a developer switching from one CAP project to another must re-learn where things live rather than relying on a consistent, predictable structure. They also make it harder to understand the cost of a change — when many unrelated handlers import from a shared utility, the blast radius of a modification is unclear. Finally, large shared utility modules are rarely tested in isolation, so bugs in them silently affect multiple handlers at once. If you find `utils/` growing, treat it as a signal that logic needs to be moved into properly named handler modules or into the service subfolder it actually belongs to.

## Module System: ESM

> **Baseline in `cap-developer` → `references/nodejs.md`.** New CAP Node.js projects are ES
> modules (`cds init` writes `"type": "module"`): `import` / `export`, never `require`, and
> `import.meta.dirname` instead of `__dirname`.

All code in these skills is written as ESM. adesso deltas:

- **Relative imports carry the file extension** — `import approve from './code/order-service/orders-on-approve.js'`.
- **Logic modules export one default function** (`export default async function approve (req, srv) { … }`); the service handler file exports the service class.
- **Legacy CommonJS projects** (no `"type": "module"`, existing `require` / `module.exports`): keep CommonJS for the whole project and write new files in the same style — never mix module systems inside one project. A migration to ESM is a deliberate, project-wide change, not something to do file by file. The opposite direction is forbidden: never convert an ESM project to CommonJS or remove `"type": "module"` to work around an import error (official rule).

## CDS Modeling

> **Baseline in `cap-developer`.** Built-in aspects (`cuid`, `managed`, `temporal` from
> `@sap/cds/common`), associations vs. compositions, `localized String`, code lists
> (`sap.common.CodeList`), PascalCase entities / camelCase elements, and the `extend`
> extensibility mechanism are all covered by the official `cap-developer` skill — use it
> for the base modeling patterns and syntax. This section only records adesso deltas.
> For naming specifics (slugification, reserved words, `@path`) see **`cap-cds-naming`**.

### adesso deltas

- **Annotation placement is a first-class concern** — keep UI annotations (`@UI.*`) out of
  `db/schema.cds`; follow the layer/push-down rules in **`cap-annotations`**. Data-validation
  annotations (`@assert.range`, `@assert.unique`, `@mandatory`) and `@readonly` belong on the
  model per those rules, not enforced in handler code.
- **User-facing labels are i18n keys, never literals** — `@title: '{i18n>Key}'` /
  `@Common.Label`, resolved through the three-tier i18n setup below (*Internationalization*).
- **Prefer declarative model behavior over handler code** (validation, authorization, audit) —
  see **`framework-first-review`** before writing a handler for something the model can express.

## Service Definitions

> **Baseline in `cap-developer`.** Projections instead of exposing db entities, trimming with
> `excluding`, `@readonly`, `@restrict` / `@requires`, and avoiding two projections on the same
> entity within one service are official rules. adesso adds file layout and annotation placement.

Service CDS files live in `srv/<service-name>.cds`. They contain the service declaration and
its projections; service-level `@path` and `@requires` sit inline on the declaration. Entity-level
annotations (`@restrict`, `@readonly`, `@odata.draft.enabled`, `@Capabilities`) live in
`srv/annotations/<service-name>/restrictions.cds`. Every annotation file of a service is listed in
that folder's `register.cds`, and `srv/annotations.cds` imports all `register.cds` files — the
service file itself imports no annotations (see **`cap-annotations`** → *Wiring*):

```cds
// srv/order-service.cds
using { myapp as db } from '../db/schema';

@path: '/service/OrderService'
@requires: 'authenticated-user'
service OrderService {
  entity Orders    as projection on db.Orders actions {
    action approve();
  };
  entity LineItems as projection on db.LineItems;
}
```

```cds
// srv/annotations/order-service/restrictions.cds
using { OrderService } from '../../order-service';

annotate OrderService.Orders with @odata.draft.enabled;
annotate OrderService.LineItems with @readonly;
```

```cds
// srv/annotations/order-service/register.cds — every annotation file of OrderService
using from './restrictions';
```

```cds
// srv/annotations.cds — one register line per service
using from './annotations/order-service/register';
```

**`@path` (adesso standard):** every service sets `@path: '/service/<ServiceName>'`. An absolute
path means the service is served on **one protocol only** — if a service must also be served via a
second protocol (e.g. `@protocol: ['odata', 'rest']`), it needs a relative path instead; document
that exception in `project-context.md`.

## Service Design: One Service Per Use Case

> **Capire principle:** *"Services are best designed with a specific use case in mind."* — [Bookshop sample, Use Case-Specific Services](https://cap.cloud.sap/docs/get-started/bookshop)

A service is a **facade** shaped for one consumer or one purpose. Domain entities live in `db/schema.cds`; services are projections on top of them — each projection exposing only what its use case needs, with exactly the access patterns, fields, and annotations that use case requires.

### Why This Matters for Fiori Elements UIs

Fiori Elements renders its UI entirely from OData annotations (`@UI.LineItem`, `@UI.FieldGroup`, `@UI.Facets`, draft enablement, `@readonly`, etc.). Those annotations live on a **service entity**. If two Fiori apps share one service and one set of entities, they are forced to share the same annotations — and therefore produce the same UI behaviour.

**Wrong — one service for two different Fiori apps:**
```cds
// ❌ Both List Report and Admin app are forced to share the same annotations
service OrderService {
  entity Orders as projection on db.Orders;
}
```

**Correct — one service per Fiori use case:**
```cds
// ✅ srv/processing-service.cds  — for the processor's List Report + Object Page
service ProcessingService {
  entity Orders as projection on db.Orders
    excluding { internalCost, vendorMargin };
}

// ✅ srv/admin-service.cds  — for the admin back-office UI
service AdminService {
  entity Orders as projection on db.Orders; // full fields
  entity Vendors as projection on db.Vendors;
}
```

Each app's `app/<appname>/annotations.cds` then annotates its own service entity independently, so changes to one app's UI do not ripple into the other. Draft enablement for `ProcessingService.Orders` goes into `srv/annotations/processing-service/restrictions.cds`.

### Use Case Archetypes

| Use Case | When to create a separate service | Naming hint |
|---|---|---|
| **Fiori UI (end user)** | One service per Fiori app / per distinct UI role | `ProcessingService`, `ApprovalService` |
| **Fiori UI (admin / back-office)** | Different field set, no draft, different auth | `AdminService` |
| **External API / integration** | System-to-system consumers need a stable, versioned contract, often different auth (`@requires: 'system-user'`) and no draft overhead | `IntegrationService`, `ApiService` |
| **Background / queue processing** | Internal async event handling that should never be called directly from a UI | `ProcessingPipelineService` |
| **Monitoring / ops** | Read-only exposure of queues, logs, status for ops tooling | `TaskQueueService` |

### The "Same Entity, Different Projections" Pattern

The same domain entity appears in multiple services under different projections. This is intentional — it is not duplication:

```cds
// db/schema.cds
entity Orders : cuid, managed {
  title        : String(255);
  status       : Association to OrderStatuses;
  internalCost : Decimal(15,2); // internal field — must not leak to end users
  lineItems    : Composition of many LineItems on lineItems.order = $self;
}

// srv/processing-service.cds — end-user UI (no internalCost)
service ProcessingService {
  entity Orders as projection on db.Orders
    excluding { internalCost };
  entity LineItems as projection on db.LineItems;
}

// srv/admin-service.cds — admin UI (all fields, no draft)
service AdminService {
  entity Orders  as projection on db.Orders;
  entity Vendors as projection on db.Vendors;
}

// srv/integration-service.cds — system-to-system (read-only, no draft, versioned fields)
@requires: 'IntegrationUser'
service IntegrationService {
  @readonly entity Orders as projection on db.Orders {
    ID, title, status.code as statusCode, createdAt
  };
}
```

(Each service lives in its own file — one service per `.cds` file.)

### What NOT to Do

- **Do not create one `AppService` or `MainService`** that exposes everything. All Fiori apps pointing at the same service will share annotations and therefore behave identically — which is usually wrong and always constraining.
- **Do not add Fiori UI entities to an integration service.** Draft, `@odata.draft.enabled`, and UI annotations pollute the contract for machine consumers and increase payload size.
- **Do not add integration endpoints to a Fiori service.** It couples the UI release cycle to the API consumer contract.

### Authorization Follows the Service Boundary

Each service gets its own `@requires` or `@restrict` declarations. This is a natural fit: UI services require an end-user role; integration services require a technical/system role; admin services require an admin role. Mixing use cases in one service forces awkward entity-level overrides.

```cds
@requires: 'ProcessingUser'
service ProcessingService { ... }

@requires: 'AdminUser'
service AdminService { ... }

@requires: 'IntegrationUser'
service IntegrationService { ... }
```

## Handler Pattern

Handler files in `srv/*.js` are **thin wiring only**. They register event handlers and delegate to logic modules in `srv/code/`.

```javascript
// srv/order-service.js
import cds from '@sap/cds';
import approve from './code/order-service/orders-on-approve.js';
import beforeCreate from './code/order-service/orders-before-create.js';
import afterRead from './code/order-service/orders-after-read.js';
import getClientId from './code/order-service/on-getClientId.js';

export class OrderService extends cds.ApplicationService {
  async init() {
    const { Orders } = this.entities;

    this.on('approve', Orders, req => approve(req, this));
    this.before('CREATE', Orders, req => beforeCreate(req, this));
    this.after('READ', Orders, (results, req) => afterRead(results, req, this));
    this.on('getClientId', req => getClientId(req, this));

    return super.init();
  }
}
```

### Rules

- Handler file must `extend cds.ApplicationService`
- Call `return super.init()` at the end
- **Never** put business logic directly in the handler file
- Imports at module level; entities destructured from `this.entities` inside `init()` — never string entity names in registrations (official rule)
- Pass the service instance (`this`) into logic modules so they use `srv.entities` instead of `cds.entities` / string names
- One handler file per service, matching the CDS file name

### Handler Phase Semantics: `before` / `on` / `after`

> Base semantics of the three phases (`before`/`after` run in parallel; `on` is a sequential
> interceptor chain where only the first matching handler runs unless it calls `next()`) are
> covered by the official `cap-developer` skill.

**adesso practical rule:** register at most **one `on` handler per event per entity/action**.
If a second `on` handler seems necessary for the same target, that logic belongs inside the
first handler — not a second, silently-unreachable registration.

### `srv.emit()` vs. `srv.send()` / `.on()`

- **`srv.send(request)`** — synchronous request/response, dispatched through the `on` interceptor chain above; a handler can `return` a result.
- **`srv.emit(event)`** — asynchronous, fire-and-forget message. **All** registered handlers for that event fire (like `before`/`after`, not `on`'s single-winner chain) — there is no result to return.

Use `emit` for pub/sub-style notifications where several independent listeners should all react to the same occurrence (e.g. audit logging + cache invalidation + notification, all listening to the same event). Use `cds.queued(srv).emit()` (see *Transactional Event Queues* below) when the async work must be transactional and retried — plain `emit` has no persistence or retry guarantee.

## Implementation Logic

Logic modules in `srv/code/<service-name>/` contain the actual business logic. Each file has a single default export that receives the request (or message) and the service instance.

```javascript
// srv/code/order-service/orders-on-approve.js
import cds from '@sap/cds';
const LOGGER = cds.log('orders-on-approve');

export default async function approve(req, srv) {
  // One round-trip: the status check is part of the UPDATE (official cap-developer rule)
  const affected = await UPDATE(req.subject)
    .where({ status_code: 'submitted' })
    .with({ status_code: 'approved' });
  if (!affected) return req.reject(409, 'ORDER_NOT_APPROVABLE');

  LOGGER.info('Order approved', { target: srv.name });
}
```

### CQL — Always Use It

**Never** write raw SQL. Always use CDS Query Language (CQL) via `cds.ql` — the query API itself (`SELECT` / `INSERT` / `UPDATE` / `DELETE`, explicit column lists, single-round-trip updates) is covered by the official `cap-developer` skill and Capire. adesso deltas:

- Query the **service** entities you received (`srv.entities`, `req.subject`), not db entities via `cds.entities` or string names such as `'myapp.Orders'`.
- Always pass an explicit column list (`.columns(...)`) — never rely on the implicit `*` or `c('*')`.

### Native CQL Syntax in `.cds` Views and Projections

The JS query builder (`SELECT.from(...).columns(...)`) is for **handler code**. Inside `.cds` files (service projections, views), CQL has its own native syntax with two features that don't exist in plain SQL:

**Postfix (nested) projections** — shape associations into nested result structures instead of flat joins:

```cds
entity AuthorsWithBooks as projection on db.Authors {
  ID, name,
  books { ID, title }        // nested -- books comes back as an array of {ID, title}
}
```

**Infix filters** — filter an association's target set inline, without a separate `WHERE`:

```cds
entity MysteryAuthors as projection on db.Authors {
  ID, name,
  books[genre = 'Mystery'] { ID, title }   // only Mystery books, nested under books
}
```

Both compose: infix filters can include ordering (`books[where ID > 251 order by title desc]`), and nested projections can chain arbitrarily deep along associations. Use these in `db/schema.cds` views and `srv/*.cds` projections when a filtered or reshaped association should be part of the entity's shape itself — reach for the JS query builder only in handler code where the shape is decided per-request.

### Use `req.subject` Instead of Manual ID Extraction

In CAP event handlers, `req.subject` is a pre-built CQN reference to the targeted entity instance (active or draft). Use it to read or update the target instead of extracting IDs from `req.params` / `req.data` and building a separate `where` clause. Read raw key values from `req.params` only when you need the value itself (e.g. as an event payload).

```javascript
// BAD — manual ID extraction + string entity name + implicit SELECT *
const id = req.params?.[0]?.ID ?? req.data?.ID;
const order = await SELECT.one.from('myapp.Orders').where({ ID: id });

// GOOD — req.subject already encodes the target; explicit columns
const order = await SELECT.one.from(req.subject).columns('ID', 'title', 'status_code');
```

### Expand Associations Instead of Multiple SELECTs

When you need data from an associated entity, use CQL column expansion (`.columns` with nested callback) to fetch it in one query. Never do a second SELECT to resolve an association.

```javascript
// BAD — two queries to get order + its status
const order = await SELECT.one.from(req.subject).columns('status_code');
const status = await SELECT.one.from(OrderStatuses).columns('name').where({ code: order.status_code });

// GOOD — single query with expanded association
const order = await SELECT.one.from(req.subject).columns(o => {
  o.ID, o.status(s => { s.code, s.name });
});
// order.status.name is now available directly
```

The same pattern works for compositions:

```javascript
const order = await SELECT.one.from(req.subject).columns(o => {
  o.ID, o.title, o.lineItems(li => { li.ID, li.product, li.quantity });
});
```

### External Service Access

Calling remote services (`cds.connect.to`, consumption views, delegation, replication, outboxed writes) is owned by the official **`cap-add-remote-service`** skill. The adesso deltas (airplane-mode config, destinations, S/4 "no API" decision) are in `references/external-service-consumption.md`.

### Error Handling

> **Baseline in `cap-developer`.** `req.reject(code, message)` for fatal errors (never throw raw
> errors in request handlers) and `req.error(...)` to collect several errors are official rules.

adesso deltas:

- **Messages are i18n keys**, never literal text: `UPPER_SNAKE_CASE` keys in `_i18n/messages.properties` (see *Internationalization*). CAP localizes the key for the request's locale automatically — pass the key and its arguments directly:

```javascript
// _i18n/messages.properties:
// ORDER_NOT_FOUND=Order with ID {orderId} not found

return req.reject(404, 'ORDER_NOT_FOUND', { orderId: ID });   // fatal — stops the request
req.error(400, 'INVALID_FILE_TYPE', 'fileName');               // collected — request continues to phase end
req.warn(200, 'ORDER_AMOUNT_HIGH');                            // non-blocking warning
```

- **Queued event consumers** (`msg`, not `req`) have no client to reject to: log and **rethrow** on failure so the event queue retries the message (see *Transactional Event Queues*).

## Logging

Use CAP's `cds.log` facade for all logging. **Never** use `console.log` / `console.error` directly.

### Module-Level Logger

Every logic module must create a `LOGGER` constant at the top. The logger name matches the file name (without extension):

```javascript
// srv/code/order-service/on-processOrder.js
import cds from '@sap/cds';
const LOGGER = cds.log('on-processOrder');

export default async function processOrder(msg, srv) {
  const { ID } = msg.data;
  LOGGER.info('Starting order processing', { orderId: ID });

  try {
    // ... business logic ...
    LOGGER.debug('External response received', { tokens: tokenUsage.total_tokens });
    LOGGER.info('Order processing complete', { orderId: ID });
  } catch (error) {
    LOGGER.error('Processing step failed', error, { orderId: ID });
    throw error; // rethrow so the event queue retries
  }
}
```

### Log Level Guidelines

| Level | Use for | Example |
|-------|---------|---------|
| `LOGGER.error()` | Failures that prevent the step from completing | `LOGGER.error('LLM call failed', error)` |
| `LOGGER.warn()` | Recoverable issues, fallbacks, retries | `LOGGER.warn('AI call failed, using stub', error)` |
| `LOGGER.info()` | Key milestones, status transitions | `LOGGER.info('Order processing complete', { orderId })` |
| `LOGGER.debug()` | Detailed data for troubleshooting | `LOGGER.debug('Request payload', { payload })` |

### Enabling Debug Output

```bash
DEBUG=on-processOrder cds watch                     # single module
DEBUG=on-processOrder,on-validateOrder cds watch    # multiple modules
DEBUG=all cds watch                                 # everything
```

### Rules

- **Always** create a module-level `const LOGGER = cds.log('<module-name>')` -- never inline `cds.log()` calls
- **Never** use `console.log`, `console.error`, or `console.warn` -- always use `LOGGER`
- Logger name = file name without extension (e.g., `on-processOrder.js` -> `cds.log('on-processOrder')`)
- Include context data (entity ID, key) as a second argument object for traceability
- Use `LOGGER.info()` at the start and end of each processing step for monitoring

## Service Mocking & Airplane Mode

> **The app must always run locally without any remote services.** This is CAP's "airplane mode" design principle.

CAP uses profile-based service resolution. In the development profile (default for `cds watch`), all remote services are replaced by local mocks. The mocking mechanism depends on the **type of external dependency**:

### Three Categories of External Dependencies

| Category | Example | How CAP mocks it | What you need to do |
|----------|---------|-------------------|---------------------|
| **1. OData / CAP remote services** (`kind: "odata"`, `"odata-v2"`, `"hcql"`) | `srv/external/API_BUSINESS_PARTNER.cds` | **Auto-mocked in-process** -- no config needed | Follow the official **`cap-add-remote-service`** skill; add mock data in `srv/external/data/` |
| **2. REST external services** (`kind: "rest"`) | `srv/external/notification-service.cds` | **Not auto-mocked** -- CAP cannot generically serve REST APIs | Provide a **custom mock implementation** next to the `.cds` file |
| **3. Libraries / SDKs** (no CDS model) | `@sap-ai-sdk/orchestration`, `@sap-ai-sdk/rpt` | **Not known to CAP** -- the SDK talks to AI Core directly, bypassing `cds.connect.to()` | Use **try/catch stub fallback** in every calling function |

### Category 1: OData / CAP Remote Services (Auto-Mocked)

Owned by the official **`cap-add-remote-service`** skill (import, consumption views, in-process mocking, `cds mock`, `~/.cds-services.json` pitfalls). Nothing adesso-specific to add here — do **not** write custom mock code for these services.

### Category 2: REST External Services (Custom Mock Required)

REST services have a `.cds` file with `@protocol: 'rest'` but CAP cannot generically serve REST APIs. You must provide a `.js` file next to the `.cds` file that implements mock handlers:

```cds
// srv/external/notification-service.cds
@cds.external: true
@protocol: 'rest'
service NotificationService {};
```

```javascript
// srv/external/notification-service.js -- custom mock implementation
import cds from '@sap/cds';
const LOGGER = cds.log('notification-service-mock');

export class NotificationService extends cds.Service {
  async init() {
    this.on('*', async () => {
      LOGGER.info('Mock notification request');
      return { status: 'sent', messageId: 'mock-001' };
    });
    return super.init();
  }
}
```

```json
// package.json
"NotificationService": {
  "kind": "rest",
  "model": "srv/external/notification-service"
}
```

### Category 3: Libraries / SDKs (Try/Catch Stub Fallback)

Libraries like `@sap-ai-sdk/orchestration` and `@sap-ai-sdk/rpt` are not CDS external services. They connect directly to SAP AI Core via service bindings, bypassing `cds.connect.to()`. CAP has no way to mock them automatically.

For these, wrap every call in try/catch and fall back to a deterministic stub:

```javascript
// srv/code/order-service/on-processOrder.js
import cds from '@sap/cds';
import { OrchestrationClient } from '@sap-ai-sdk/orchestration';
const LOGGER = cds.log('on-processOrder');

export default async function processOrder(msg, srv) {
  const { Orders } = srv.entities;
  const order = await SELECT.one.from(Orders, msg.data.ID).columns('ID', 'type_code', 'totalAmount');
  const messages = [{ role: 'user', content: `Classify order ${order.ID}` }];
  let result;

  try {
    const client = new OrchestrationClient({
      promptTemplating: { model: { name: 'anthropic--claude-4.6-opus' } }
    });
    const response = await client.chatCompletion({ messages });
    result = JSON.parse(response.getContent());
  } catch (remoteErr) {
    LOGGER.warn('AI call failed, using stub', { reason: remoteErr.message });
    result = {
      category: order.type_code || 'general',
      amount: Number(order.totalAmount) || 0,
      description: 'Stub extraction — AI Core not configured'
    };
  }

  // Continue with result -- works identically with real or stub data
}
```

### Rules

- **Stub output must match the exact same schema** as the real service response
- **Stubs must be deterministic** -- same input always produces same output, no `Math.random()`
- **Stubs must allow the pipeline to continue** to the next step -- never produce blocking data
- **Always `LOGGER.warn()`** explaining the fallback -- never silently swallow errors
- **Never check `process.env.NODE_ENV` or profile names** -- just try the real call and catch failure
- **Stubs are permanent production code** -- they enable airplane mode, they are not "test mocks" to be removed later
- **OData / CAP remote services** are auto-mocked in-process -- do not write custom mock code for them
- **REST external services** (`kind: "rest"`) need a custom `.js` mock implementation in `srv/external/`
- **SDK/library calls** (`@sap-ai-sdk/orchestration`, `@sap-ai-sdk/rpt`) need try/catch stubs in the calling logic module

### Profile Summary

| Profile | Command | Remote Services | Stubs/Mocks Active? |
|---------|---------|-----------------|---------------------|
| development | `cds watch` | none connected | yes -- OData auto-mocked, REST custom-mocked, SDK stubs used |
| hybrid | `cds watch --profile hybrid` | bound services real (e.g. AI Core) | only for unbound services |
| production | Cloud Foundry | all real | stubs only on transient failures |

For full details on profiles, hybrid testing, and deployment, see `references/development-runtime.md`.

## Internationalization (i18n)

**Never hardcode UI labels or user-facing messages.** All text must go through i18n.

### The Fundamental Split: Backend vs. Frontend i18n

There are **two completely separate i18n systems** in a CAP + Fiori project. They serve different consumers, use different syntax, and must not be mixed:

| | Backend i18n | Frontend i18n |
|---|---|---|
| **Location** | `_i18n/` in CAP project root | `app/<appname>/webapp/i18n/` |
| **Who loads it** | CAP server at startup | UI5 runtime in the browser |
| **How labels are delivered** | Compiled into OData `$metadata` (`@Common.Label`) | Loaded as a UI5 resource bundle |
| **Reference syntax** | `{i18n>Key}` in CDS annotations | `{{appTitle}}` in `manifest.json`; `i18n>Key` binding in XML views; `this.getModel("i18n").getResourceBundle().getText("key")` in controllers |
| **Scope** | All Fiori apps consuming this service see these labels automatically via OData metadata | Only the specific app that owns the `webapp/` folder |

#### Backend i18n: `_i18n/`

CAP automatically discovers `_i18n/` in the project root — no explicit import needed.

| File | Purpose | Key style |
|------|---------|-----------|
| `_i18n/i18n.properties` | Field/entity labels referenced in CDS annotations | PascalCase (`OrderTitle`, `TotalAmount`) |
| `_i18n/i18n_de.properties` | German translations of the above | Same keys |
| `_i18n/messages.properties` | All error/notification messages: `req.reject` / `req.error` keys **and** annotation constraint messages (`@assert…`, `@mandatory.message`) — CAP resolves both from this bundle | UPPER_SNAKE_CASE (`ORDER_NOT_FOUND`); `msg_<description>` for annotation messages (see `cap-annotations`) |
| `_i18n/messages_de.properties` | German translations of messages | Same keys |

These keys are embedded in OData metadata when CDS compiles annotations. The Fiori Elements shell reads `$metadata` and renders the translated labels automatically — without any extra frontend code.

#### Frontend i18n: `app/<appname>/webapp/i18n/`

These files are loaded exclusively by the UI5 runtime. They are **not served via OData** and are invisible to the CAP backend.

| What goes here | Examples |
|---|---|
| App title and description (referenced in `manifest.json`) | `appTitle=Attachment Analytics` |
| Navigation target titles | `navTargetTitle=Open Analytics` |
| Labels in custom Fiori Elements extensions (custom fragments, XML views, custom sections) | `filterPlaceholder=Search orders...` |
| Strings in freestyle UI5 controllers | Any text rendered directly by custom JS/TS code |

```properties
# app/my-app/webapp/i18n/i18n.properties

#XTIT: Application name shown in shell header
appTitle=Order Processing

#YDES: Short description shown in SAP Fiori Launchpad tile
appDescription=Process and monitor incoming orders
```

```json
// app/my-app/webapp/manifest.json — references via {{...}} syntax
{
  "sap.app": {
    "title": "{{appTitle}}",
    "description": "{{appDescription}}"
  }
}
```

```xml
<!-- Custom fragment — references via i18n model binding -->
<Button text="{i18n>filterPlaceholder}" />
```

### i18n in CDS Annotations (Backend)

Use `{i18n>Key}` syntax for all labels in annotations. **Never** use hardcoded strings.

```cds
// WRONG -- hardcoded label, not translatable
{ Value: title, Label: 'Order Title' }

// CORRECT -- resolves to _i18n/i18n.properties key at metadata generation time
{ Value: title, Label: '{i18n>OrderTitle}' }
```

The same applies to `@title` in domain models:

```cds
// WRONG
@title: 'Order Title'
title : String(255);

// CORRECT
@title: '{i18n>OrderTitle}'
title : String(255);
```

### Backend i18n Properties File Format

```properties
#XFLD,120: Label for the order title field
OrderTitle=Order Title

#XFLD,120: Label for the total amount field
TotalAmount=Total Amount

#XFLD,120: Singular entity type name (used in SAP standard headers)
Order=Order

#XFLD,120: Plural entity type name
Orders=Orders
```

Use SAP comment style `#XFLD` (field label), `#XTIT` (title), `#XMSG` (message), `#YMSG` (message with placeholders) for translation tooling. The optional `,<maxLength>` after the tag helps translators respect UI constraints.

### i18n in Backend Code (Error Messages)

Pass message **keys** to `req.reject` / `req.error` / `req.warn` / `req.info`. CAP looks them up in `_i18n/messages*.properties` for the request's locale and fills in the arguments:

```javascript
// In _i18n/messages.properties:
// ORDER_NOT_FOUND=Order with ID {orderId} not found
// INVALID_FILE_TYPE=Invalid file type. Only {allowedTypes} files are supported.

req.reject(404, 'ORDER_NOT_FOUND', { orderId: ID });
req.error(400, 'INVALID_FILE_TYPE', { allowedTypes: 'PDF, JPG, PNG' });
```

Use `cds.i18n.messages.at(key, locale, args)` only where there is no request to attach the message to (e.g. composing a notification text in a queued consumer).

### Database-Level Translations: `localized` + `_texts` Tables

This is the third tier, completely separate from both `_i18n/` and `webapp/i18n/`. Use it for **translatable data values** — not labels, not messages, but the actual content stored in the database (status names, code list descriptions, configuration labels, etc.).

#### How it works

When a CDS entity field is declared as `localized String`, CAP automatically:
1. Creates a shadow `_texts` table in the database (e.g., `AttachmentEDIStatus_texts`)
2. Stores the default (English) value in the base table
3. Stores locale-specific values in the `_texts` table with a `locale` column
4. Serves the correct translation automatically based on the request's `Accept-Language` header — no extra code needed

```cds
// db/schema.cds
aspect status {
  key ID   : String;
  name     : localized String;   // <-- CAP generates a _texts table for this
  criticality : Integer;
}

entity AttachmentEDIStatus : status {};
entity AttachmentProcessingStatus : status {};
```

#### Seed data: base file + one texts file per locale

> **Baseline in `cap-developer` → Sample Data.** Generate data files with the CLI, never by hand:
> `cds add data --records <n> --keys-only` lets the CLI own UUIDs and foreign keys; you only fill
> in the content columns. The official skill lists the gotchas (`--keys-only` needs `--records`
> and an up-to-date `@sap/cds-dk`).

For **code lists** whose keys *are* the domain codes (`initial`, `sent`, …), generate header-only
skeletons with `cds add data --filter <Entity>` and fill in the codes and texts. The CLI creates a
base file and a `.texts.csv` file. adesso convention: split the translations into **one file per
locale** — copy the generated texts header into `<Namespace>-<Entity>_texts_<locale>.csv` and
delete the generic texts file. CAP loads the per-locale files the same way as the single file.

**1. Base CSV** — default (English) values, same columns as the entity:

```csv
// db/data/mail2edi-AttachmentEDIStatus.csv
ID,name,criticality
initial,Initial,0
triggered,Triggered,2
sent,Sent to TPM,2
```

**2. Locale CSV files** — one per language, named `<Namespace>-<Entity>_texts_<locale>.csv`:

```csv
// db/data/mail2edi-AttachmentEDIStatus_texts_de.csv
locale,ID,name
de,initial,Initial
de,triggered,Ausgelöst
de,sent,An TPM gesendet
```

```csv
// db/data/mail2edi-AttachmentEDIStatus_texts_fr.csv
locale,ID,name
fr,initial,Initial
fr,triggered,Déclenché
fr,sent,Envoyé à TPM
```

The `locale` column must match the BCP 47 language tag (e.g. `de`, `fr`, `cs`, `pl`). The `ID` column is the foreign key back to the base table.

#### When to use `localized`

Use `localized String` for fields whose **values** need to vary by language — typically:
- Code list / status entity names (`name`, `description`, `label`)
- Configuration option labels
- Any user-facing text that is **data**, not metadata

Do **not** use `localized` for technical identifiers, codes, or fields that will never be translated.

#### What `localized` does NOT cover

`localized` translates data values in the database. It does **not** translate:
- Field labels (column headers, form field names) → those are `_i18n/i18n.properties` via `{i18n>Key}`
- Error messages (runtime and annotation constraint messages) → those are `_i18n/messages.properties`
- App UI strings → those are `app/.../webapp/i18n/i18n.properties`

### Decision: Which i18n Mechanism?

```
Is this a field/column label shown in the UI header or form?
  → _i18n/i18n.properties  (backend, compiled into OData metadata as @Common.Label)

Is this an error or notification message from req.reject / req.error / req.warn,
or a constraint message in @assert / @assert.*.message / @mandatory.message?
  → _i18n/messages.properties  (backend, sent in OData error responses)

Is this the app title / description in manifest.json, or text in a Fiori extension / XML fragment / controller?
  → app/<appname>/webapp/i18n/i18n.properties  (frontend, UI5 resource bundle)

Is this the actual content of a database record that needs to vary by language?
  (status names, code list descriptions, configuration labels)
  → localized String in db/schema.cds + _texts CSV files in db/data/
```

### Rules

- **Never** hardcode labels in CDS annotations — always use `{i18n>Key}`
- **Never** hardcode user-facing messages in backend code — always pass a `messages.properties` key to `req.reject` / `req.error` / `req.warn` / `req.info`
- **Never** put OData field labels in `webapp/i18n/` — they won't be picked up by Fiori Elements; they must be in `_i18n/`
- **Never** put app title/description or extension strings in `_i18n/` — they are frontend concerns
- **Always** use `localized String` for translatable data values in code lists and status entities — never store hardcoded English text
- **Always** provide a base CSV (default locale) **and** a `_texts_<locale>.csv` for every supported language when seeding localized entities
- **Always** add new keys to the default file **and all locale variants** simultaneously

## Transactional Event Queues

All asynchronous backend processing **must** use CAP's transactional event queues (`cds.queued`). This ensures atomicity (events are committed with the business data), resilience (automatic retry), and recoverability (dead letter queue).

The persistent queue is **enabled by default** — CAP adds the `cds.outbox.Messages` table automatically. Configure `cds.requires.queue` in `package.json` only to tune it (e.g. `maxAttempts`, default `10`). See [Event Queues in Node.js — capire](https://cap.cloud.sap/docs/node.js/event-queues).

### Defining Events in CDS

Each async processing step is modeled as a CDS `event` on the service:

```cds
service OrderService {
  // ... entities ...

  // Async pipeline events (processed via transactional event queues)
  event ProcessOrder  { ID : UUID };
  event ValidateOrder { ID : UUID };
  event FinalizeOrder { ID : UUID };
}
```

### Producer: Queueing Events

Use `cds.queued(srv).emit()` to enqueue an event within the current transaction. The event is only dispatched after the transaction commits successfully. Every call creates its own queue entry.

```javascript
// srv/code/order-service/orders-on-submit.js (the producer)
import cds from '@sap/cds';

export default async function submit(req, srv) {
  const affected = await UPDATE(req.subject)
    .where({ status_code: 'new' })
    .with({ status_code: 'processing' });
  if (!affected) return req.reject(409, 'ORDER_NOT_SUBMITTABLE');

  const [{ ID }] = req.params;
  await cds.queued(srv).emit('ProcessOrder', { ID });
}
```

> **`emit` / `send` vs. `schedule`.** `cds.queued(srv).emit()` (events) and `.send()` (actions)
> insert a **new** queue entry per call. `srv.schedule()` **upserts a single task per event name**
> — a second `schedule('ProcessOrder', …)` overwrites the first, so per-record work scheduled this
> way silently drops records. Use `schedule()` only for singleton or recurring tasks
> (`.after('1h')`, `.every('10m')`, `.as('<task-name>')`), e.g. a nightly reconciliation.

### Consumer: Handling Queued Events

Register an `on` handler for the event in the service handler. The handler receives a `msg` object (not `req`) with `msg.data` containing the event payload.

```javascript
// In srv/order-service.js (handler registration)
import processOrder from './code/order-service/on-processOrder.js';
// … inside init():
this.on('ProcessOrder', msg => processOrder(msg, this));
```

```javascript
// In srv/code/order-service/on-processOrder.js (consumer logic)
import cds from '@sap/cds';

export default async function processOrder(msg, srv) {
  const { ID } = msg.data;
  const { Orders } = srv.entities;

  // ... do the actual work (LLM calls, data processing) ...

  await UPDATE(Orders, ID).with({ status_code: 'processed' });

  // Chain to next step by queueing the next event
  await cds.queued(srv).emit('ValidateOrder', { ID });
}
```

### Chaining Pipeline Steps

Each step queues the next step at the end of its logic. This creates a reliable async pipeline where each step runs in its own transaction:

```
User action (submit)
  └── tx1: update status → queue ProcessOrder
        └── tx2: run processing → queue ValidateOrder
              └── tx3: run validation → queue FinalizeOrder
                    └── tx4: run finalization → done
```

If any step fails, CAP retries it automatically. If it exceeds `maxAttempts`, it stays in `cds.outbox.Messages` as a dead letter for manual intervention.

### Monitoring: Exposing the Queue

Expose the queue entries for monitoring in a TaskQueueService. Importing the outbox model is only needed for this projection. The queue contains sensitive payloads — restrict access to ops/technical users:

```cds
// srv/task-queue-service.cds
using from '@sap/cds/srv/outbox';

@path: '/service/TaskQueueService'
@requires: 'internal-user'
service TaskQueueService {
  @readonly
  entity QueuedMessages as projection on cds.outbox.Messages;
}
```

### Rules

- **Always** use `cds.queued(srv).emit()` (events) or `.send()` (actions) for per-item async work -- never `setTimeout` or `setImmediate` for business logic, and never `schedule()` for per-record work
- Use `srv.schedule()` only for singleton or recurring tasks (`.after` / `.every` / `.as`)
- **Always** define async steps as CDS `event` declarations on the service
- **Always** chain steps by queueing the next event at the end of the current step's logic
- Event handler functions receive `msg` (message), not `req` (request) -- access payload via `msg.data`
- Each queued event runs in its **own transaction**; delivery is at-least-once -- keep steps independent and idempotent
- **Rethrow** errors in consumers so the queue retries -- a swallowed error marks the message as done
- Update the entity status **before** queueing the event so the UI reflects the processing state

## Common Pitfalls

### Draft Semantics
- Draft entities have separate active and draft data: `SELECT.from(Orders)` reads active data, `SELECT.from(Orders.drafts)` reads drafts; prefer `req.subject`, which resolves to the right one
- `SAVE` (draft activation) triggers the full `before CREATE/UPDATE` chain
- Full draft mechanics: **`cap-fiori-drafts`**

### Managed Fields
- Never set `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy` from client payloads -- CAP fills them via the `managed` aspect and ignores client-provided values
- If you must set them (rare, e.g. data migration), set them in custom handler code or seed CSVs -- both are allowed by CAP

### External Service Contracts
- External service models live in `srv/external/`
- Never rename entities in external CDS models -- they must match the remote API; rename in a consumption view instead (official **`cap-add-remote-service`**)

### Annotation Placement
- Which annotation goes into which file (`db/`, `srv/annotations/<service-name>/`, `app/<app>/`) and how the files are imported: **`cap-annotations`**
