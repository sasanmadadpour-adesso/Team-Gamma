---
name: cap-annotations
description: >
  Conventions for organizing CDS annotations in SAP CAP projects across db/, srv/ and
  app/. Use whenever annotations are created, moved, reviewed, or refactored: @UI,
  @Common, @restrict, @Capabilities, @mandatory, @assert, @Common.Label,
  @Common.ValueList, @Common.SideEffects, @title. Also for questions like "where do I
  put this annotation", "should this label live in db, srv or app", "how do I structure
  annotations modularly", and whenever new entities or features need annotations written
  directly into the right file. Includes the push-down principle, project structure,
  file mapping, full examples, and a checklist.
license: Proprietary
---

# CAP annotation placement — conventions and best practices

## Core principle

> **Baseline in `cap-developer`.** The declarative-first philosophy and the rule that UI
> annotations live in `app/` come from SAP's official `cap-developer` skill. This skill is the
> **deep placement / push-down reference** — where each annotation category belongs across
> `db/` → `srv/` → `app/`, and when to move one down.

**All annotations are backend artifacts.** They live on the CDS model and travel into
OData `$metadata` regardless of which folder the file sits in. A file under
`app/orders/annotations.cds` is not "frontend code" — it is metadata on the backend
service that the Fiori app happens to consume. The folder structure mirrors the
**typical scope** of an annotation, not its runtime location.

Two rules govern placement:

1. **Default by purpose.** Write annotations in the layer they describe:
   - DB structure and structural constraints → `db/`
   - Service behaviour, authorization, service-bound validation → `srv/`
   - UI layout and UI-only metadata (LineItem, Facets, side effects, value helps) → `app/`

2. **Push down when shared.** If the same annotation would have to be repeated in
   several files at the default layer, move it down to the lowest layer where it
   is still correct for every consumer. Sharing is the reason to push down — never
   convenience or "fits the diagram".

A use case is normally one service plus one Fiori app. When that is the case, every
annotation has exactly one natural home and the defaults are enough. The push-down
rule matters as soon as a service is consumed by more than one UI, a field appears
in more than one service, or labels need to stay consistent across replicated S/4
views and generated types.

| Layer | Default scope | Owns |
|---|---|---|
| `db/`  | Used by every service | Domain structure, global labels, global constraints |
| `srv/` | Used by every UI of this service | Service definition, authorization, service-bound validation |
| `app/` | This Fiori app only | UI layout, value helps, side effects, app-specific labels |

---

## Push-down — when to move an annotation down

The instinct on a new feature is to put everything in `app/`. That is the right
default for a single-app use case. Push down only when sharing forces it.

### Labels

- One service, one app, labels apply to that UI only → `app/{app}/annotations.cds` (inline `Label:` per `@UI.*`) or `app/{app}/annotations/labels.cds`.
- One service consumed by **several apps**, fields share the same name → push down to `srv/annotations/{svc}/labels.cds`. Otherwise the same `@Common.Label` would appear in every app and drift over time.
- A field appears in **several services**, or originates from a replicated/external schema → push down to the DB layer. Two options:
  - `@title` inline in `db/schema.cds` — fine for small to medium projects.
  - **`db/labels.cds` as a dedicated file — recommended for real / bigger projects.** Keeping all `@Common.Label`s in one file makes incomplete labelling immediately visible and avoids the trap of having half the fields labelled inline and half in random app files.

### Validation / constraints

- Rule applies for **every** service that projects this entity → `db/schema.cds` (inline `@mandatory`, `@assert.range`, `@assert.format`) or a dedicated `db/constraints.cds` when there are enough of them to be noisy in the schema.
- Rule needs service context (cross-entity, conditional, depends on navigation) → `srv/annotations/{svc}/constraints.cds`.

### Authorization and capabilities

- Always service-bound. No push-down: `@restrict`, `@Capabilities`, `@odata.draft.enabled` live in `srv/annotations/{svc}/restrictions.cds`.

### Value helps and side effects

- Almost always app-specific (different UIs want different value-list collection paths or different reload semantics). Default location is `app/{app}/annotations/`.
- Push down to `srv/annotations/{svc}/value-helps.cds` only when **every** consumer of the service uses the exact same value help — typically for canonical lookup associations like `currency`, `country`, `language`.

### Separate files when pushed down

When annotations move to `srv/` or `db/`, keep them in **dedicated files** — not
mixed into `schema.cds` or the service file. The schema file describes structure;
the service file declares the service. Annotations get their own file so that the
core artifacts stay readable.

```
db/
├── schema.cds          ← entities, types, associations, compositions
├── labels.cds          ← @Common.Label for every domain field (when pushed down)
└── constraints.cds     ← @mandatory, @assert.* (when there are many)
```

```
srv/
├── orders-service.cds                       ← service definition only
├── annotations.cds                          ← the ONE top-level annotation file: imports every register.cds
└── annotations/
    └── orders-service/
        ├── register.cds                     ← imports every annotation file of this service
        ├── restrictions.cds                 ← @restrict, @Capabilities
        ├── constraints.cds                  ← service-bound @assert
        ├── labels.cds                       ← @Common.Label shared by every UI of this service
        └── value-helps.cds                  ← value helps shared by every UI of this service
```

> The point is not to maximise the number of files. Create a file only when there
> is content for it. An empty `labels.cds` is noise.

### Wiring — `register.cds` per service, one `srv/annotations.cds`

CAP only loads the `.cds` files that sit **directly** in `db/`, `srv/`, `app/` and
`app/<app>/` (plus everything those files import via `using`). Files in deeper folders —
`srv/annotations/<svc>/*.cds`, `app/<app>/annotations/*.cds` — are **not** loaded on their own.
An annotation file nobody imports is silently ignored: a forgotten `restrictions.cds` means
**no authorization**, without any compiler warning.

adesso wires the service layer in two steps, so there is exactly **one** top-level
annotation file and every service keeps its own list:

1. **`srv/annotations/<svc>/register.cds`** — one per service folder. It imports **every**
   annotation file of that service and nothing else.
2. **`srv/annotations.cds`** — the only annotation file directly in `srv/`, so CAP loads it
   automatically. It imports **only** the `register.cds` files, one line per service.

```cds
// srv/annotations/orders-service/register.cds
using from './restrictions';
using from './constraints';
using from './value-helps';
```

```cds
// srv/annotations.cds
using from './annotations/orders-service/register';
using from './annotations/admin-service/register';
```

The service files stay free of annotation imports. Each annotation file imports the service
it annotates (`using { OrdersService } from '../../orders-service';`).

| Annotation file | Imported by |
|---|---|
| `srv/annotations/{svc}/*.cds` | `srv/annotations/{svc}/register.cds` |
| `srv/annotations/{svc}/register.cds` | `srv/annotations.cds` |
| `app/{app}/annotations/*.cds` | `app/{app}/annotations.cds` |
| `db/labels.cds`, `db/constraints.cds` | nobody — they sit directly in `db/`, which CAP loads anyway |

Rules:

- **New annotation file** → add a `using from './<file>';` line to its service's `register.cds`.
- **New service** → create `srv/annotations/<svc>/register.cds` and add one line to `srv/annotations.cds`.
- `srv/annotations.cds` contains **only** `using from './annotations/<svc>/register';` lines — no
  `annotate` statements, no direct imports of single annotation files.
- Every annotation file belongs to exactly one service folder; no loose files directly in
  `srv/annotations/`.

> The annotations load whenever the `srv/` folder is loaded (`cds watch`, `cds build`,
> `cds compile srv`, `cds.test`). A tool that loads **only** a single service file
> (`cds compile srv/orders-service.cds`) gets the service without its annotations — compile the
> folder, not the file, when you check authorization.

Verify after every new annotation file:

```sh
cds compile srv -2 json | grep -c '"@restrict"'          # > 0 when restrictions.cds is wired
cds compile '*' -2 json | grep -c '"@Common.ValueList'   # value helps from app/<app>/annotations/ (structured annotations are flattened, so match the prefix)
```

---

## Project structure

### Single app (most common)

One service, one Fiori app. Most annotations live at their default layer; the
optional pushed-down files appear only if the project grows.

```
my-cap-app/
├── db/
│   ├── schema.cds                            ← entities
│   ├── labels.cds                            ← @Common.Label central labels (bigger projects, optional)
│   └── constraints.cds                       ← global @mandatory / @assert.* (optional)
├── srv/
│   ├── orders-service.cds                    ← service definition only — NO annotate statements
│   ├── annotations.cds                       ← imports every srv/annotations/<svc>/register.cds
│   └── annotations/
│       └── orders-service/
│           ├── register.cds                  ← imports every annotation file of this service
│           ├── restrictions.cds              ← @restrict, @Capabilities, @odata.draft.enabled
│           ├── constraints.cds               ← service-bound @assert (optional)
│           ├── labels.cds                    ← service-shared label overrides (optional, rare)
│           └── value-helps.cds               ← service-shared value helps (optional, rare)
├── app/
│   └── orders/
│       ├── annotations.cds                   ← main UI file: HeaderInfo, LineItem, Facets, FieldGroups + `using from './annotations/…'`
│       └── annotations/
│           ├── labels.cds                    ← app-specific @Common.Label overrides (optional)
│           ├── value-helps.cds               ← @Common.ValueList, @Common.Text
│           └── side-effects.cds              ← @Common.SideEffects
└── _i18n/
    └── i18n.properties
```

### Multi-app

Several Fiori apps over one or more services. Push-down matters more here because
shared fields would otherwise be annotated several times.

```
my-cap-app/
├── db/
│   ├── schema.cds
│   ├── labels.cds                            ← shared by every service (recommended)
│   └── constraints.cds                       ← shared by every service (optional)
├── srv/
│   ├── admin-service.cds
│   ├── catalog-service.cds
│   ├── annotations.cds                       ← imports both register.cds files
│   └── annotations/
│       ├── admin-service/
│       │   ├── register.cds
│       │   ├── restrictions.cds
│       │   ├── constraints.cds
│       │   └── value-helps.cds               ← only when every admin app shares them
│       └── catalog-service/
│           ├── register.cds
│           ├── restrictions.cds
│           └── constraints.cds
├── app/
│   ├── admin/
│   │   ├── annotations.cds                   ← admin UI layout
│   │   └── annotations/
│   │       ├── value-helps.cds
│   │       └── side-effects.cds
│   └── catalog/
│       ├── annotations.cds
│       └── annotations/
│           ├── value-helps.cds
│           └── side-effects.cds
```

> CAP automatically loads the `.cds` files directly in `srv/` and `app/<app>/` (e.g.
> `srv/annotations.cds`, `app/admin/annotations.cds`) — but **not** the files in
> `srv/annotations/<svc>/` or `app/<app>/annotations/`. Those are wired as described in
> *Wiring* above. Each annotation file also declares its own `using` import for the service or
> schema it annotates.

---

## Layer 1 — `db/`

### `db/schema.cds`

Entity structure, types, associations, compositions. Add inline `@title` labels
when you keep labels in the schema (small projects):

```cds
// db/schema.cds
namespace com.example;
using { managed, cuid } from '@sap/cds/common';

entity Orders : cuid, managed {
  @title: '{i18n>OrderNo}'
  orderNo  : String(20);

  @title: '{i18n>Customer}'
  customer : Association to Customers;

  status   : String(20);
  items    : Composition of many OrderItems on items.order = $self;
}
```

Global constraints (`@mandatory`, `@assert.range`, `@assert.format`) belong here
too when the rule is identical for every service. Constraint messages must be
i18n references (`{i18n>msg_...}`), never plain text:

```cds
  @title: '{i18n>Code}'
  @assert.format: '^[A-Z0-9_]+$'
  @assert.format.message: '{i18n>msg_code_validation_pattern}'
  code   : String(60);
```

**Do not put here:** `@UI.*`, `@restrict`, service-bound or cross-entity constraints.

### `db/labels.cds` (recommended for bigger projects)

Dedicated label file using `@Common.Label`. Same effect as inline `@title`,
better suited to projects with many entities or replicated/external schemas.

```cds
// db/labels.cds
using { com.example as eam } from './schema';

// Centralised default @Common.Label annotations for every domain field.
// Apps and service projections may override per context (LineItem header,
// header-info title, value-help dialog) by setting their own @Common.Label —
// CAP picks the more specific annotation.

// ── eam.Orders ─────────────────────────────────────────────────────────────
annotate eam.Orders with {
  orderNo  @Common.Label: '{i18n>OrderNo}';
  customer @Common.Label: '{i18n>Customer}';
  status   @Common.Label: '{i18n>Status}';
};

// ── eam.Customers ──────────────────────────────────────────────────────────
annotate eam.Customers with {
  name    @Common.Label: '{i18n>CustomerName}';
  country @Common.Label: '{i18n>Country}';
};
```

> Pick one of `@title` inline **or** `db/labels.cds`, not both for the same field —
> two definitions on the same element will trigger `anno-duplicate-unrelated-layer`.

### `db/constraints.cds` (optional)

Use when global constraints accumulate enough that the schema file becomes hard
to scan. Same semantics as inline `@mandatory` / `@assert.*` — just lifted out.

```cds
// db/constraints.cds
using { com.example as eam } from './schema';

annotate eam.Orders with {
  status @mandatory;
  code   @assert.format: '^[A-Z0-9_]+$' @assert.format.message: '{i18n>msg_code_validation_pattern}';
};
```

---

## Layer 2 — `srv/` (service layer)

### Keep the service file clean

The `.cds` file that defines the service contains the service declaration (with its
service-level `@path` / `@requires`) and the projections — no `annotate` statements and no
imports of annotation files. Its annotations are collected in
`srv/annotations/orders-service/register.cds` (see *Wiring*).

```cds
// srv/orders-service.cds
using { com.example as db } from '../db/schema';

@path: '/service/OrdersService'
service OrdersService {
  entity Orders    as projection on db.Orders;
  entity Customers as projection on db.Customers;
}
```

`@path: '/service/<ServiceName>'` is the adesso standard (see **`cap-cds-naming`**).

### `srv/annotations/{svc}/restrictions.cds`

Authorization, draft handling, OData capabilities. Always service-bound — no
push-down applies.

```cds
// srv/annotations/orders-service/restrictions.cds
using { OrdersService } from '../../orders-service';

// Draft is an entity annotation — on the service itself it has no effect
annotate OrdersService.Orders with @odata.draft.enabled;

annotate OrdersService.Orders with @(
  restrict: [
    { grant: ['READ'],         to: 'Viewer' },
    { grant: ['READ','WRITE'], to: 'Editor' },
    { grant: ['*'],            to: 'Admin'  },
  ],
  Capabilities: {
    InsertRestrictions.Insertable: true,
    UpdateRestrictions.Updatable: true,
    DeleteRestrictions.Deletable: false,
  }
);
```

### `srv/annotations/{svc}/constraints.cds`

Service-bound validation: cross-entity checks, conditional logic, anything that
needs the service projection (navigation, role context). Messages as
`{i18n>msg_...}`.

```cds
// srv/annotations/orders-service/constraints.cds
using { OrdersService } from '../../orders-service';

annotate OrdersService.Orders with {
  customer @assert: (case
    when not exists customer then '{i18n>msg_customer_not_found}'
  end);

  beginDate @assert: (case
    when beginDate > endDate then '{i18n>msg_begin_after_end}'
  end);
}
```

> If the schema covers all constraints, omit this file.

### `srv/annotations/{svc}/labels.cds` (rare)

Only when **every** UI of this service agrees on a label that differs from the DB
layer. Manages `@Common.Label` only.

```cds
// srv/annotations/orders-service/labels.cds
using { OrdersService as service } from '../../orders-service';

// In the orders service, "customer" is always referred to as "Bill-to Party"
annotate service.Orders with {
  customer @Common.Label: '{i18n>BillToParty}';
};
```

### `srv/annotations/{svc}/value-helps.cds` (rare)

Only when every consumer of the service uses the same value help — typically for
canonical lookups (`currency`, `country`, `language`).

---

## Layer 3 — `app/` (UI / Fiori layer)

### `app/{app}/annotations.cds` — UI layout

The main file for `@UI.*` annotations: `HeaderInfo`, `SelectionFields`, `LineItem`,
`Facets`, `FieldGroup`. Matches the Capire documentation style.

```cds
// app/orders/annotations.cds
using { OrdersService } from '../../srv/orders-service';
using from './annotations/value-helps';
using from './annotations/side-effects';

annotate OrdersService.Orders with @(
  UI: {
    HeaderInfo: {
      TypeName:       '{i18n>Order}',
      TypeNamePlural: '{i18n>Orders}',
      Title:          { Value: orderNo },
      Description:    { Value: customer.name },
    },
    SelectionFields: [ orderNo, status, customer_ID ],
    LineItem: [
      { Value: orderNo,       Label: '{i18n>OrderNo}'   },
      { Value: customer.name, Label: '{i18n>Customer}'  },
      { Value: status,        Label: '{i18n>Status}'    },
      { Value: createdAt,     Label: '{i18n>CreatedAt}' },
    ],
    Facets: [
      {
        $Type:  'UI.ReferenceFacet',
        Label:  '{i18n>GeneralData}',
        Target: '@UI.FieldGroup#General',
      },
    ],
    FieldGroup #General: {
      Label: '{i18n>GeneralData}',
      Data: [
        { Value: orderNo     },
        { Value: status      },
        { Value: customer_ID },
        { Value: createdAt   },
        { Value: modifiedAt  },
      ],
    },
  }
);
```

### `app/{app}/annotations/value-helps.cds`

```cds
// app/orders/annotations/value-helps.cds
using { OrdersService } from '../../../srv/orders-service';

annotate OrdersService.Orders with {
  customer @(Common: {
    Text:            customer.name,
    TextArrangement: #TextOnly,
    ValueList: {
      CollectionPath: 'Customers',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',
          LocalDataProperty: customer_ID,
          ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name' },
      ],
    },
  });
}
```

### `app/{app}/annotations/side-effects.cds`

```cds
// app/orders/annotations/side-effects.cds
using { OrdersService } from '../../../srv/orders-service';

// Foreign key changes → reload related entity
annotate OrdersService.Orders with @(Common: {
  SideEffects #CustomerChanged: {
    SourceProperties: [ customer_ID ],
    TargetEntities:   [ customer ],
  },
});

// Structural change in items → reload computed field
annotate OrdersService.Orders with @(Common: {
  SideEffects #ItemsChanged: {
    SourceEntities:   [ items ],
    TargetProperties: [ 'totalAmount' ],
  },
});
```

### `app/{app}/annotations/labels.cds` (optional)

Only when this app needs different labels than the rest of the project. Skip the
file if all labels already match the DB or service layer.

---

## What goes where — quick reference

| Annotation | Default location | Push down to … when |
|---|---|---|
| `@title` (global field label) | `db/schema.cds` | — (it's already at the lowest layer) |
| `@Common.Label` (centralised labels for many entities) | `db/labels.cds` | — |
| `@mandatory`, `@assert.range`, `@assert.format` (global) | `db/schema.cds` or `db/constraints.cds` | — |
| `@assert` (cross-entity, conditional, service-bound) | `srv/annotations/{svc}/constraints.cds` | `db/` if applicable to every service |
| `@restrict`, `@Capabilities`, `@readonly`, `@odata.draft.enabled` | `srv/annotations/{svc}/restrictions.cds` | — (always service-bound) |
| `@Common.Label` (service-wide override) | `srv/annotations/{svc}/labels.cds` | `db/` when shared by every service |
| `@Common.ValueList` (service-wide) | `srv/annotations/{svc}/value-helps.cds` | — (rare; usually stays in `app/`) |
| `@UI.*` (HeaderInfo, LineItem, Facets, FieldGroup, SelectionFields) | `app/{app}/annotations.cds` | — (UI is the natural scope) |
| `@Common.Label` (app-only override) | `app/{app}/annotations/labels.cds` | `srv/` or `db/` if shared |
| `@Common.ValueList`, `@Common.Text`, `@Common.TextArrangement` | `app/{app}/annotations/value-helps.cds` | `srv/` if every app uses the same value help |
| `@Common.SideEffects` | `app/{app}/annotations/side-effects.cds` | — |

---

## Multilingual labels and i18n

> Full reference with examples and translation files: `references/i18n.md`

### Ground rules

- Every visible string is an `{i18n>Key}` — no hard-coded text in `@title`,
  `@Common.Label`, `@UI.*`, or `@assert.*.message`.
- Labels follow push-down: defined as close to the entity as possible, overridden
  only where needed.
- **All error messages go into `messages.properties`** — annotation constraint
  messages (`@assert: (case …)`, `@assert.*.message`, `@mandatory.message`) as well as
  runtime errors raised via `req.reject('KEY')`. CAP resolves validation messages from the
  messages bundle; a key that only exists in `i18n.properties` shows up as raw
  `{i18n>msg_…}` text in the UI.

### Two bundles — strict separation

| Bundle | Content | Syntax |
|---|---|---|
| `_i18n/i18n.properties` | Labels + UI texts | `{i18n>Key}` |
| `_i18n/messages.properties` | Annotation constraint messages + `req.reject()` runtime errors | `'{i18n>msg_...}'` / `'UPPER_SNAKE_CASE'` |

### Key conventions

- Labels: `FieldName` / `EntityName` → `OrderNo`, `Customer`
- Annotation messages: `msg_<description>` → `msg_code_validation_pattern`
- `req.reject()` messages: `UPPER_SNAKE_CASE` → `ORDER_EXCEEDS_STOCK`

Group keys in each `.properties` file with origin comments — `# ── db/schema ───`,
`# ── srv/orders-service ───`, `# ── app/orders ───` — so any key's source is
visible at a glance.

---

## Checklist — new entity or new feature

### `db/`

- [ ] Every field has a label, either via `@title` in `db/schema.cds` or via `db/labels.cds`?
- [ ] Global constraints (`@mandatory`, `@assert.*`) defined here when the rule is universal?
- [ ] All `@assert.*.message` values are `{i18n>msg_...}` — no plain text?

### `srv/{service}.cds`

- [ ] Service file contains only the projection — no `annotate` statements, no annotation imports?

### `srv/annotations/{service}/`

- [ ] `register.cds` exists and has a `using from './<file>';` line for **every** other file in the folder?
- [ ] `srv/annotations.cds` has a `using from './annotations/{service}/register';` line for this service?

- [ ] `restrictions.cds`: `@restrict`, `@Capabilities`, `@odata.draft.enabled` if applicable?
- [ ] `constraints.cds`: only the service-bound checks — not duplicating schema constraints?
- [ ] `labels.cds` / `value-helps.cds`: created **only** when actually shared across UIs?

### `app/{app}/`

- [ ] `annotations.cds`: `HeaderInfo`, `LineItem`, `Facets`, `FieldGroup` filled in?
- [ ] `annotations/value-helps.cds`: value help for every association / foreign-key field?
- [ ] `annotations/side-effects.cds`: side effects for dependent fields and computed values?
- [ ] `annotations/labels.cds`: only present when the app genuinely deviates from the lower layers?
- [ ] Every file in `annotations/` has its own `using` import for the service?
- [ ] `annotations.cds` imports every file in `app/{app}/annotations/` (`using from './annotations/…'`)?
- [ ] `cds compile '*' -2 json` shows the new annotations (e.g. `grep -c '"@restrict"'`)?

### i18n

- [ ] All labels and messages reference `{i18n>...}` — none hard-coded?
- [ ] `{i18n>msg_...}` constraint-message keys live in `_i18n/messages.properties` for every language?
- [ ] `req.reject()` keys live in `_i18n/messages.properties` for every language?
- [ ] Keys tagged with origin comments in the properties files?

---

## Common mistakes

### Annotation file or service not registered

```cds
// srv/annotations/orders-service/restrictions.cds exists,
// but srv/annotations/orders-service/register.cds has no `using from './restrictions';`
// — or srv/annotations.cds has no `using from './annotations/orders-service/register';`
```

CAP never loads the file — the `@restrict` rules are silently missing and every
authenticated user gets full access. Add the missing line to `register.cds` /
`srv/annotations.cds` (for `app/{app}/annotations/*.cds`: to `app/{app}/annotations.cds`) and
verify with `cds compile srv -2 json | grep '"@restrict"'`.

### Annotation imports in the service file or single files in `srv/annotations.cds`

```cds
// srv/orders-service.cds
using from './annotations/orders-service/restrictions';      // wrong place

// srv/annotations.cds
using from './annotations/orders-service/restrictions';      // bypasses register.cds
using from './annotations/logging-service-auth';             // loose file outside a service folder
```

Move the file into its service folder, import it from that folder's `register.cds`, and keep
`srv/annotations.cds` to one `…/register` line per service.

### `@odata.draft.enabled` on the service instead of the entity

```cds
annotate OrdersService with @odata.draft.enabled;          // no effect
annotate OrdersService.Orders with @odata.draft.enabled;   // correct
```

### UI annotations in `srv/`

Move to `app/{app}/annotations.cds`.

### `@restrict` in `db/`

Move to `srv/annotations/{service}/restrictions.cds`. Authorization is always
service-bound.

### Global label missing from the lowest layer

```cds
// db/schema.cds — label missing; every app repeats it, drift sets in
entity Orders {
  orderNo : String(20);   // no @title and no entry in db/labels.cds
}
```

Add `@title` in the schema or `@Common.Label` in `db/labels.cds`. One definition
serves every service and every app.

### Same label defined inline and in `db/labels.cds`

Defining a label twice on the same element triggers
`anno-duplicate-unrelated-layer`. Pick one. For bigger projects, prefer
`db/labels.cds` and drop the inline `@title`.

### `@Common.Label` in `app/{app}/labels.cds` that matches the DB label

```cds
// app/orders/annotations/labels.cds — redundant if db already labels it the same
annotate service.Orders with {
    orderNo @Common.Label: '{i18n>OrderNo}';
};
```

Omit. `app/{app}/annotations/labels.cds` exists only for genuine deviations.

### `@Common.Label` mixed into `annotations.cds`

```cds
// app/orders/annotations.cds
annotate OrdersService.Orders with @(UI: { LineItem: [...] });
annotate OrdersService.Orders with { orderNo @Common.Label: '{i18n>OrderNo}'; };
```

Move to the appropriate `labels.cds` file (db / srv / app, whichever fits the scope).

### Value helps in `annotations.cds` next to `LineItem`

```cds
annotate OrdersService.Orders with @(UI: { LineItem: [...] });
annotate OrdersService.Orders with { customer @Common.ValueList: {...}; };
```

Move to `app/{app}/annotations/value-helps.cds`.

### Global constraint duplicated in `srv/`

```cds
// Redundant when the rule applies to every service
annotate OrdersService.Orders with { status @mandatory; };
```

Put `@mandatory` on the entity element in `db/schema.cds` (or
`db/constraints.cds`).

### Plain-text `@assert.*.message`

```cds
@assert.format.message: 'Only uppercase letters allowed'      // plain text
@assert.format.message: '{i18n>msg_code_validation_pattern}'  // correct
```

### Error message key in `i18n.properties`

```properties
# _i18n/i18n.properties
ORDER_EXCEEDS_STOCK=Order quantity exceeds stock                    // wrong bundle
msg_code_validation_pattern=Only uppercase letters allowed          // wrong bundle
```

Move both to `_i18n/messages.properties`. `i18n.properties` is for labels and UI texts;
every error message — `req.reject('KEY')` as well as `@assert…` / `@mandatory` messages —
is resolved from `messages.properties`.

### Hard-coded UI label

```cds
{ Value: orderNo, Label: 'Order number' }
```

Use `{ Value: orderNo, Label: '{i18n>OrderNo}' }`.

### Service definition and annotations in the same file

Keep `srv/{service}.cds` for the projection only; annotations belong in
`srv/annotations/{service}/`, registered in that folder's `register.cds`.

### i18n files inside app subfolders

```text
app/orders/_i18n/i18n.properties   // wrong location
```

A single `_i18n/` at the project root, grouped by origin comments.

### `anno-duplicate-unrelated-layer`

Two files annotate the same artifact with the same annotation without a `using`
relationship between them. Either one file imports the other, or move the
annotation into the combining layer — usually by pushing it down to `srv/` or
`db/`.
