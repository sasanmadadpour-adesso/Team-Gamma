# Draft Handling Guide — CAP + Fiori Elements + OData V4 + UI5

This is the deep reference for the **`cap-fiori-drafts`** skill. Use the SKILL.md as the entry point; come here for any non-trivial draft question. The guide is intentionally broad — it covers modeling, runtime, OData contract, UI, and extension code. Cite Capire and SAP Fiori docs verbatim where exact wording matters; do not invent API behavior.

Sections (in order):

1. The draft mental model
2. Enabling drafts — `@odata.draft.enabled`
3. Generated draft semantics
4. Lifecycle events
5. Handler registration matrix (CAP Node.js)
6. Validation placement
7. Custom bound actions on draft-enabled entities
8. Draft-aware CQL
9. OData URLs in detail
10. Media streams and object-specific resources on drafts
11. Fiori Elements draft UX
12. UI annotation expressions using `$draft.IsActiveEntity`
13. `Common.SideEffects` for draft refresh and persistent messages
14. UI5 / extension code — preserving the draft binding context
15. Troubleshooting playbook
16. Anti-patterns
17. Verification checklist

---

## 1. The draft mental model

A draft-enabled entity is **two sibling entities sharing one composite key**. CAP serves both through the same service projection; Fiori clients switch between them through OData requests. The lifecycle is:

```
            ┌───────────────────────────── DISCARD ─────┐
            │                                           ▼
   ┌─────────────┐    EDIT    ┌─────────────┐  SAVE    ┌──────────┐
   │   ACTIVE    │ ─────────▶ │   DRAFT     │ ───────▶ │  ACTIVE  │
   │  (existing) │            │ (.drafts)   │          │ (updated)│
   └─────────────┘            └─────────────┘          └──────────┘
                                ▲      ▲
                              NEW    PATCH (n×)
```

Three flows in one diagram:
- `NEW` creates a new draft for a row that has no active counterpart yet. `SAVE` activates it as a `CREATE` on the active entity.
- `EDIT` creates a draft from an existing active row. `SAVE` activates it as an `UPDATE` on the active entity.
- `PATCH` mutates the draft as the user types. `DISCARD` throws it away.

Two consequences:
- **Handler targets diverge.** `EDIT` is registered on the **active** entity (it is the act of converting active → draft). `NEW`, `PATCH`, `SAVE`, `DISCARD` are registered on the **draft** sibling.
- **Validation has two phases.** During `PATCH`, the draft is saved even with invalid data (so the user does not lose progress). On `SAVE` (activation), every constraint on the active entity is enforced.

---

## 2. Enabling drafts — `@odata.draft.enabled`

> "All you need to do to serve an entity with draft support enabled is to annotate it with `@odata.draft.enabled`." — Capire, *Serving SAP Fiori UIs > Fiori Draft Support*

Apply the annotation to the **service-exposed entity** (the projection), not to the underlying db model:

adesso convention (see **`cap-annotations`**): the draft annotation lives with the other
entity-level service annotations in `srv/annotations/<service-name>/restrictions.cds`,
registered in that folder's `register.cds`, which `srv/annotations.cds` imports:

```cds
// srv/admin-service.cds
using { my.bookshop as db } from '../db/schema';

service AdminService {
  entity Books as projection on db.Books;
}
```

```cds
// srv/annotations/admin-service/restrictions.cds
using { AdminService } from '../../admin-service';

annotate AdminService.Books with @odata.draft.enabled;
```

**Never** add `@odata.draft.enabled` to the db model — drafts are a service-projection concern.
**Never** annotate the service itself (`annotate AdminService with @odata.draft.enabled`) —
that has no effect; the annotation must target the entity. And make sure the annotation file
is registered: a `restrictions.cds` missing from `register.cds` (or a `register.cds` missing
from `srv/annotations.cds`) silently leaves the entity without draft.

What CAP generates behind the scenes:

```cds
// generated automatically — do not write this by hand
entity AdminService.Books.drafts : AdminService.Books { ... }
```

Plus a complete set of draft-specific OData actions (`draftNew`, `draftEdit`, `draftActivate`, `draftPrepare`), a separate persistence table for draft rows, and side-effect annotations for persistent messages.

### Compositions

Compositions of a draft-enabled entity are themselves draft-managed. The whole composition tree is editable as one draft. **Never** mark a child of a composition with its own `@odata.draft.enabled`.

### Localized data

For localized entities, add `@fiori.draft.enabled` (note: `@fiori`, not `@odata`) on the **base entity**:

```cds
annotate sap.capire.bookshop.Books with @fiori.draft.enabled;
```

This is required because the generated `.texts` entity does not have a single UUID primary key. The annotation adds a technical `ID_texts` key element so drafts work for translations.

---

## 3. Generated draft semantics

When a service exposes `@odata.draft.enabled` entities, CAP automatically calculates these properties on every read:

| Property | Type | Meaning |
|---|---|---|
| `IsActiveEntity` | `Boolean` (key) | `true` for active rows, `false` for draft rows. Always part of the composite key. |
| `HasActiveEntity` | `Boolean` | On a draft row: `true` if a saved active counterpart still exists (i.e., this is an `EDIT` draft, not a `NEW` draft). |
| `HasDraftEntity` | `Boolean` | On an active row: `true` if any user currently holds a draft based on this active row. |
| `SiblingEntity` | navigation | Single-valued navigation from active → its draft (or draft → its active). |
| `DraftAdministrativeData` | composition | Hidden draft metadata: `InProcessByUser`, `CreatedByUser`, `CreationDateTime`, `LastChangedByUser`, `LastChangeDateTime`, `DraftIsCreatedByMe`, `DraftIsProcessedByMe`, `DraftMessages` (persistent validation messages). |

> "When reading draft-enabled entities, data from the active entity and the drafts is merged into a joint result. As part of this, draft-specific elements like `IsActiveEntity`, `HasActiveEntity` or `HasDraftEntity` are calculated." — Capire, *CAP Java > Fiori Drafts > Reading Drafts*
>
> This describes **OData `READ` requests** (and the CAP Java runtime). In CAP Node.js custom code, `SELECT.from(Books)` and `SELECT.from(Books.drafts)` read the active and draft tables separately — see §8.

Sample OData payload for a row that has both active and draft state:

```json
{
  "ID": "a11fb6f1-…",
  "IsActiveEntity": true,
  "HasActiveEntity": false,
  "HasDraftEntity": true,
  "DraftAdministrativeData": {
    "DraftIsCreatedByMe": true,
    "InProcessByUser": "soeren@…"
  }
}
```

**Never** try to write to these properties from your own code — they are projected/calculated by CAP. **Never** filter on them manually in your CDS model (`@odata.draft.enabled` enforces specific filter scenarios at runtime).

---

## 4. Lifecycle events

CAP fires draft-specific events in addition to standard CRUD events. The canonical list, with the entity target each event uses:

| Event | Target | Triggered when |
|---|---|---|
| `NEW` | `Entity.drafts` | User creates a new draft (no active counterpart yet) |
| `EDIT` | `Entity` (active) | User starts editing an existing active row |
| `PATCH` / `UPDATE` | `Entity.drafts` | User edits any field of the draft (`PATCH` is the alias) |
| `SAVE` | `Entity.drafts` | User activates the draft — also triggers `CREATE` or `UPDATE` on the active entity |
| `DISCARD` / `CANCEL` | `Entity.drafts` | User discards the draft — active row is untouched |
| `READ` | `Entity` *and* `Entity.drafts` | Fiori filter "Editing Status: All" triggers two separate READs which CAP merges |

> "The `SAVE` event on draft entities is a distinct event that is only triggered when **activating** a draft." — Capire, *CAP Node.js > Fiori Support*

OData mapping (Node.js v10+ / Java v5+):

```http
POST   /Books/draftNew                                //> NEW
POST   /Books(ID,IsActiveEntity=true)/draftEdit       //> EDIT
GET    /Books(ID,IsActiveEntity=false)                //> READ on .drafts
PATCH  /Books(ID,IsActiveEntity=false) {...}          //> PATCH
POST   /Books(ID,IsActiveEntity=false)/draftActivate  //> SAVE
DELETE /Books(ID,IsActiveEntity=false)                //> DISCARD
```

---

## 5. Handler registration matrix (CAP Node.js)

This is the single most important table in this guide. Get the target wrong and the handler silently never fires.

| Event | `Entity` (active) | `Entity.drafts` | `[Entity, Entity.drafts]` |
|---|---|---|---|
| `NEW` | ❌ | ✅ register here | — |
| `EDIT` | ✅ register here | ❌ | — |
| `PATCH` / `UPDATE` | ❌ (would fire only on direct active updates) | ✅ register here | — |
| `SAVE` | ❌ | ✅ register here | — |
| `DISCARD` / `CANCEL` | ❌ | ✅ register here | — |
| `CREATE` (post-activation) | ✅ | — | — |
| `UPDATE` (post-activation) | ✅ | — | — |
| Custom bound action | ✅ if active-only logic | ✅ if draft-only logic | ✅ if same logic everywhere |
| `READ` | ✅ for active reads | ✅ for draft reads (e.g. "Editing Status: All") | ✅ if same logic everywhere |

Reference implementation, taken from the Capire pattern:

```javascript
// srv/admin-service.js
import cds from '@sap/cds'

export class AdminService extends cds.ApplicationService { init() {
  const { Books } = this.entities

  // NEW — draft target
  this.before('NEW', Books.drafts, req => {
    req.data.ID ??= cds.utils.uuid()
    req.data.status = 'NEW'
  })

  // EDIT — active target (the act of converting active -> draft)
  this.before('EDIT', Books, req => {
    // enrich the initial draft snapshot
  })

  // PATCH — draft target; incremental validation only
  this.before('PATCH', Books.drafts, req => {
    if (req.data.price < 0) req.reject(400, 'Price must be non-negative')
  })

  // SAVE — draft target; full pre-activation checks
  this.before('SAVE', Books.drafts, async req => {
    // expensive / cross-field validation
  })

  // DISCARD — draft target
  this.before('DISCARD', Books.drafts, req => {
    // cleanup uploaded attachments, etc.
  })

  // ALSO validate on active CRUD — direct updates can bypass the draft flow
  this.before(['CREATE', 'UPDATE'], Books, req => {
    // belt-and-braces validation
  })

  return super.init()
}}
```

> "Validations on draft entities are not sufficient, as active entities can be updated directly, bypassing drafts. Thus, make sure to always perform all necessary validations on active entities, not only on drafts." — Capire, *Serving SAP Fiori UIs > Draft Input Validation*

For `READ` handlers, the resolved target tells you which side fired:

```javascript
this.on('READ', Books.drafts, (req, next) => {
  assert.equal(req.target.name, 'AdminService.Books.drafts')
  return next()
})
```

For most modification logic, prefer `req.subject` over hard-coding `Books` vs `Books.drafts` — it resolves to the correct sibling automatically:

```javascript
this.on('approveBook', req => UPDATE(req.subject).with({ status: 'A' }))
```

---

## 6. Validation placement

Two phases, two rules:

### Phase 1: during draft editing (`PATCH`)

> "During draft phase, i.e., on `PATCH` requests to draft data, all `@assert`s are validated, and respective error messages are returned to the client. Yet, in contrast to active entities, the draft is still created/updated, even with invalid data, so that users can correct it later on without losing their progress." — Capire, *Draft Input Validation*

- **Prefer** declarative validators on the entity / element: `@mandatory`, `@assert.range`, `@assert.format`, `@assert.unique.<name>`, `@assert.target`.
- **Keep** custom `before PATCH` handlers lightweight and incremental — never run a heavyweight cross-table check on every keystroke.
- Messages set with `req.message(...)` flow through `DraftAdministrativeData.DraftMessages` and survive page refreshes (see §13).

### Phase 2: on activation (`SAVE` + active `CREATE`/`UPDATE`)

- The `SAVE` handler is the right place for "this draft is now leaving the workshop" checks.
- **Always** mirror non-trivial validation in `before CREATE` / `before UPDATE` on the active entity — direct active updates bypass `SAVE`.
- A failed `SAVE` rolls back transactionally: draft data is restored, no half-saved active row.

### Anti-pattern

```javascript
// ❌ Heavy validation on every keystroke
this.before('PATCH', Books.drafts, async req => {
  const conflicts = await SELECT.from(Books).columns('ID').where({ title: req.data.title })
  if (conflicts.length) req.reject(...)   // runs every PATCH — terrible UX
})

// ✅ Run uniqueness checks at activation, or use @assert.unique declaratively
annotate AdminService.Books with @assert.unique.byTitle: [title];
```

---

## 7. Custom bound actions on draft-enabled entities

> "Custom bound actions and functions defined for draft-enabled entities are also inherited by the draft entities." — Capire, *Custom Actions*

Three registration shapes:

```javascript
// (a) Same logic for active and draft
this.on('approveBook', [Books, Books.drafts], req =>
  UPDATE(req.subject).with({ status: 'A' })
)

// (b) Active-only — action makes no sense on a draft
this.on('publishBook', Books, /* ... */)

// (c) Different logic per target
this.on('reset', Books,        /* hard reset on active row */)
this.on('reset', Books.drafts, /* discard draft only */)
```

For an action to appear in the UI while editing a draft, expose it through Fiori annotations on the entity (it inherits to `.drafts` automatically):

```cds
annotate AdminService.Books with @UI.LineItem : [
  ...,
  {
    $Type        : 'UI.DataFieldForAction',
    Action       : 'AdminService.approveBook',
    Label        : '{i18n>Approve}',
    Criticality  : #Positive
  }
];
```

Useful per-action annotations:

| Annotation | Effect |
|---|---|
| `@Common.IsActionCritical: true` | UI shows a confirmation dialog before invoking |
| `@Core.OperationAvailable: <path>` | Path-based expression controls button enablement (e.g. on draft state) |
| `@Common.SideEffects: { TargetProperties: […], TargetEntities: […] }` | Declarative refresh after invocation |
| `@cds.odata.bindingparameter.collection: true` | Action is bound to the collection rather than a single instance |
| `@Common.DraftRoot.NewAction: '<actionName>'` | Override `draftNew` with a custom action (use sparingly — defeats the standard create flow) |

### Overriding `draftNew`

> "By default SAP Fiori triggers a POST request with an empty body to the entity collection to create a new draft. This behavior can be overridden by implementing a custom action, which SAP Fiori will trigger instead." — Capire, *CAP Java > Overriding SAP Fiori's Draft Creation Behaviour*

Only override when you need custom prefill logic that cannot be expressed in a `before NEW` handler.

---

## 8. Draft-aware CQL

The `.drafts` shortcut on any service entity points at the draft sibling:

```javascript
const { Books } = this.entities

// Active data only
const active = await SELECT.one.from(Books, id).columns('ID', 'title')

// Draft data only (if a draft exists)
const draft = await SELECT.one.from(Books.drafts, id).columns('ID', 'title')
```

Active and draft data live in **separate tables**: `SELECT.from(Books)` reads active data
only, `SELECT.from(Books.drafts)` reads drafts only — there is no merged result in custom
code. (The Fiori Elements filter "Editing Status: All" triggers two separate `READ` events
that CAP combines behind the scenes.) Do **not** filter on `IsActiveEntity` yourself — manual
filtering on draft-related properties is not supported; pick the entity (`Books` vs.
`Books.drafts`) instead.

### Updating drafts

Target the draft entity explicitly, or use `req.subject` inside a handler:

```javascript
await UPDATE(Books.drafts, id).with({ title: 'New' })   // ✅ updates the draft
await UPDATE(Books, id).with({ title: 'New' })          // updates the ACTIVE row
```

### `req.subject`

In custom action handlers, `req.subject` resolves to the correct sibling based on the inbound URL:

```javascript
this.on('approveBook', req => UPDATE(req.subject).with({ status: 'A' }))
```

This is the cleanest way to write actions that work for both active and draft.

---

## 9. OData URLs in detail

Active vs. draft is **always** distinguished by the composite key. Memorize:

```http
// ----- ACTIVE -----                              // ----- DRAFT -----
GET    /Books(ID=x,IsActiveEntity=true)            GET    /Books(ID=x,IsActiveEntity=false)
PATCH  /Books(ID=x,IsActiveEntity=true) {...}      PATCH  /Books(ID=x,IsActiveEntity=false) {...}
DELETE /Books(ID=x,IsActiveEntity=true)            DELETE /Books(ID=x,IsActiveEntity=false)   //> DISCARD
```

Draft-specific actions:

```http
POST   /Books/draftNew                            #> NEW (unbound on collection)
POST   /Books(ID=x,IsActiveEntity=true)/draftEdit  #> EDIT
POST   /Books(ID=x,IsActiveEntity=false)/draftActivate  #> SAVE
POST   /Books(ID=x,IsActiveEntity=false)/draftPrepare   #> server-side hook before activation (rarely needed)
```

### Draft-agnostic requests (CAP Node.js v10+)

Clients that ignore `IsActiveEntity` are treated as targeting active data:

```http
GET    /Books(ID=x)        #> assumes IsActiveEntity=true
PATCH  /Books(ID=x) {...}  #> direct active UPDATE (still blocked if a draft locks the row)
```

Disable with `cds.fiori.bypass_draft: false` if you need strict semantics.

### Bound action invocation

When invoking an action against a draft, the action URL must include the full composite key:

```http
POST /odata/v4/AdminService/Books(ID=x,IsActiveEntity=false)/AdminService.approveBook
Content-Type: application/json

{}
```

If your action URL is missing `IsActiveEntity`, OData V4 will reject it with **400 Bad Request** (key not unique) or **404 Not Found** depending on the client. This is the #1 cause of "action not found" failures from controller-extension code (see §15).

---

## 10. Media streams and object-specific resources on drafts

Media properties (`@Core.MediaType`, optional `@Core.ContentDisposition`) live on stream elements:

```cds
entity Books : cuid {
  content      : LargeBinary @Core.MediaType: contentType;
  contentType  : String      @Core.IsMediaType: true;
}
```

A media URL is built from the **full key including `IsActiveEntity`**:

```http
GET /Books(ID=x,IsActiveEntity=false)/content   #> stream the draft's content
GET /Books(ID=x,IsActiveEntity=true)/content    #> stream the active content
```

Two consequences:

1. **Uploading media to a draft writes to the draft row only.** The active stream stays untouched until `SAVE`. Activate the draft to persist the upload to the active row.
2. **A media URL hardcoded with `IsActiveEntity=true` will not see the in-progress upload.** This is the classic symptom: "I uploaded a PDF in the draft and the preview still shows the old one." The preview component is pointing at the active stream.

Fix in two parts:

- **In annotations**, point the preview field at the binding's own row, not a hardcoded URL. Fiori Elements does this automatically when the field is annotated `@Core.MediaType` and bound through the standard binding context.
- **In extension code**, build any explicit URL from `oContext.getPath()` (which already includes `IsActiveEntity=false` when in draft) — never concatenate from `ID` alone.
- After upload, declare a `Common.SideEffects` whose `TargetProperties` include the stream property so the preview rebinds:

```cds
annotate AdminService.Books with @Common.SideEffects #afterUpload : {
  SourceProperties : [ 'content' ],
  TargetProperties : [ 'content', 'contentType' ]
};
```

---

## 11. Fiori Elements draft UX

Out of the box, with `@odata.draft.enabled` plus `UI.LineItem` / `UI.HeaderInfo` / `Common.SemanticKey` annotations, Fiori Elements:

- Renders a **draft indicator column** in the List Report showing `Draft`, `Unsaved Changes`, or `Locked by Another User` on rows that have a draft.
- Switches the Object Page header to "Editing" mode when navigated to a draft.
- Shows an **Edit** button on active rows that runs `draftEdit`; a **Create** button at the table level that runs `draftNew`.
- Surfaces persistent validation messages from `DraftAdministrativeData.DraftMessages` in the message strip — they survive refreshes.
- Pops the "**You have unsaved changes**" dialog if the user tries to navigate away from an active draft.

You generally do not configure any of this manually — declaring the entity as draft-enabled is enough. Where it goes wrong is when *custom* UI code (controller extensions, fragments) bypasses the binding context — see §14.

### Lock state

While a draft is held by user A, other users see the row as "Locked by Another User" and cannot create their own draft. The lock auto-releases after 15 minutes (Node.js default — `cds.fiori.draft_lock_timeout`, Java default — `cds.drafts.cancellationTimeout`). After the timeout, any user can claim the row, which discards the stale draft.

---

## 12. UI annotation expressions using `$draft.IsActiveEntity`

In CDS annotation expressions, the prefix `$draft.` lets you branch on the draft state of the row being rendered:

```cds
annotate AdminService.Books with @UI : {
  // Hide a derived field during edit; show it on the activated row only
  Identification : [{
    $Type           : 'UI.DataField',
    Value           : totalRevenue,
    ![@UI.Hidden]   : (not $draft.IsActiveEntity)
  }],

  // Mark an action button as "unavailable" while in draft
  LineItem : [{
    $Type                    : 'UI.DataFieldForAction',
    Action                   : 'AdminService.publish',
    ![@Core.OperationAvailable]: $draft.IsActiveEntity
  }]
};
```

Real-world snippet from `SAP-samples/fiori-elements-feature-showcase`:

```cds
@UI.Hidden: (not $draft.IsActiveEntity)
```

The `$draft` prefix evaluates to the *current row's* `IsActiveEntity`. Use it in `@UI.Hidden`, `@UI.HiddenFilter`, `@Core.OperationAvailable`, criticality paths, and similar expression annotations.

**Never** write JavaScript controller logic that toggles visibility based on `IsActiveEntity` — annotations are the platform-native mechanism.

---

## 13. `Common.SideEffects` for draft refresh and persistent messages

SideEffects declares *what changes and what to refresh*. Two uses in draft contexts:

### Refresh after a custom action

```cds
annotate AdminService.Books with @Common.SideEffects #afterApprove : {
  SourceEntities  : [ ],
  SourceProperties: [ ],
  TargetProperties: [ 'status', 'price' ],
  TargetEntities  : [ 'reviews' ]
};

annotate AdminService.Books actions {
  approveBook() @(
    Common.SideEffects: { TargetProperties: ['status', 'price'] }
  );
};
```

Fiori Elements rebinds the listed properties / entities after the action returns. **Always** prefer this over `oBinding.refresh()` from extension code.

### Persistent validation messages

Persistent messages live in `DraftAdministrativeData.DraftMessages`. CAP auto-generates a side-effect annotation that re-fetches them after every `PATCH`:

> "CAP automatically generates corresponding side-effect annotations in the EDMX to instruct Fiori clients to fetch state messages after every `PATCH` request." — Capire, *Persistent Messages*

If you need to disable or replace the auto-generated behavior:

```cds
annotate AdminService.Books with @(
  Common.SideEffects #alwaysFetchMessages: null   //> disable
);
```

> "While in draft state, error messages are automatically persisted, so that they remain visible, even after editing other fields, or navigating away from the page and returning later on." — Capire

### Transient vs persistent messages

```javascript
// Persistent — written to DraftAdministrativeData.DraftMessages
req.error({ code: 'PRICE_NEGATIVE', message: 'Price must be non-negative', target: 'price' })

// Transient — shown once, not persisted (use for in-flight progress info)
req.warn({ code: 'PRICE_HIGH', message: 'Unusually high price', '@Common.numericSeverity': 2, transition: true })
```

Set `transition: true` (or call `req.message().transition(true)`) for messages that should not survive a refresh.

---

## 14. UI5 / extension code — preserving the draft binding context

The cardinal rule: **never construct an OData URL by string concatenation**. Always derive it from the current binding context.

### Bound action invocation from a controller extension

```javascript
sap.ui.define([], () => ({
  async onApprovePressed(_oEvent) {
    const oContext = this.editFlow.getView().getBindingContext();
    // oContext.getPath() already contains (ID=…,IsActiveEntity=false) in draft mode
    const oOperation = oContext.getModel().bindContext(
      `AdminService.approveBook(...)`, oContext, { $$inheritExpandSelect: true }
    );
    try {
      await oOperation.execute('$auto', /* bReplaceWithRVC */ true);
    } catch (err) {
      // Bound actions surface errors via the model — let Fiori show them
    }
  }
}));
```

Key points:

- `bindContext(action, context)` binds the action to the existing context — composite key carries through.
- `bReplaceWithRVC: true` tells Fiori Elements to swap the binding context with the action's return value, so the screen reflects the post-action row without a manual refresh.
- For actions on collections, use `oTable.getBinding('rows').getHeaderContext()` or the table's `selectedContexts`.
- Side effects declared in CDS (§13) fire automatically after `execute()`.

### Building media URLs

```javascript
// ❌ Don't do this
const url = `/odata/v4/AdminService/Books(ID=${ID},IsActiveEntity=true)/content`;

// ✅ Use the binding context's path
const oContext = oFileUploader.getBindingContext();
const url = oContext.getModel().sServiceUrl + oContext.getPath() + '/content';
```

### Standard refresh patterns

- After an action: prefer declarative `Common.SideEffects`.
- After a manual operation that mutates the row: `oContext.requestSideEffects([{ $PropertyPath: 'price' }])`.
- Last resort: `oBinding.refresh()` — but this re-reads the whole binding and is rarely the right answer.

### What not to touch

`sap.fe.core.ExtensionAPI` is the supported surface for controller extensions. Do **not** reach into `oController.getOwnerComponent().getRootControl()` or other internal navigation paths to "find the active context" — they bypass draft state.

---

## 15. Troubleshooting playbook

One subsection per recurring symptom. For each: how to recognize it, what is actually wrong, and the fix.

### 15.1 "Action not found" / 404 when invoking a bound action

**Recognition.** Controller-extension call to `approveBook` returns 404. The action is registered in `@(actions: {...})` and works fine when triggered from the standard Fiori button.

**Root cause.** The URL the extension code built is missing `IsActiveEntity`, or it has `IsActiveEntity=true` while the action handler is only registered on `Entity.drafts`.

**Fix.** Always invoke via `oContext.getModel().bindContext(actionName, oContext)`. Never hand-build the URL. Then check `srv.on(actionName, …)` — if it is registered only on `Books` (active), draft invocations will not match; switch to `[Books, Books.drafts]` or add a separate handler.

### 15.2 Action runs on the active row instead of the draft

**Recognition.** The action visibly fires, but it updates the active row even though the user is editing a draft. After the action, the draft is gone or out of sync.

**Root cause.** Either (a) the URL contained `IsActiveEntity=true`, or (b) the handler runs `UPDATE(Books).where(...)` instead of `UPDATE(req.subject)` and thus always hits the active sibling.

**Fix.**
- In extension code: re-invoke through the binding context.
- In the handler: use `req.subject` for the CQL target.
- If logic truly differs per state, register two handlers — one on `Books`, one on `Books.drafts`.

### 15.3 UI stale after a custom action

**Recognition.** The action returns successfully (200), the data was updated server-side, but the Fiori screen shows the old values until you manually refresh.

**Root cause.** No `Common.SideEffects` declared for the action, so Fiori Elements does not know what to re-read.

**Fix.** Annotate the action with `@Common.SideEffects: { TargetProperties: [...], TargetEntities: [...] }`. Cover every property the action touches, plus any cascaded navigation. Only fall back to `oContext.requestSideEffects(...)` from extension code if SideEffects cannot express the relationship.

### 15.4 Media / PDF preview not refreshing in draft

**Recognition.** The user uploads a new PDF while editing a draft. The upload succeeds (the draft's `content` was written) but the preview pane still shows the old document. After `SAVE`, the new PDF appears.

**Root cause.** The preview is bound to a URL constructed for the active row (`IsActiveEntity=true`). While editing, that URL still points at the old active stream.

**Fix.**
- Verify the preview field is annotated `@Core.MediaType` so Fiori Elements binds it through the standard binding context (which carries `IsActiveEntity=false`).
- If the preview is in a custom fragment / control, build the URL from `oBindingContext.getPath()`, not from `ID`.
- Declare a `Common.SideEffects` whose `TargetProperties` include the stream property so the preview re-binds after upload.

### 15.5 Validation firing at the wrong lifecycle phase

**Recognition.** Either (a) "Save and resume" is broken because trivial draft edits trigger expensive validation, or (b) invalid data slips through to active because validation only ran on `PATCH`.

**Root cause.** Mismatched placement — heavy validation in `before PATCH`, or no `before CREATE/UPDATE` on the active entity.

**Fix.**
- Move heavy / cross-entity checks to `before SAVE` *and* `before ['CREATE','UPDATE']` on the active sibling.
- Keep `before PATCH` to lightweight incremental rules, and prefer declarative `@assert.*` / `@mandatory` annotations.
- Use `req.message().transition(true)` for warnings that should not persist.

### 15.6 Active/draft data mixups in custom code

**Recognition.** A read in a handler returns the wrong row (active when the user is editing a draft, or vice versa). Two rows come back when only one was expected.

**Root cause.** Custom code targets the wrong entity: `Books` always addresses the active data,
`Books.drafts` always the draft — independent of what the user is currently editing.

**Fix.** Be explicit:
- `SELECT.from(Books.drafts, id)` for the draft.
- `SELECT.from(Books, id)` for the active row.
- `SELECT.from(req.subject)` / `UPDATE(req.subject)` to target whichever sibling the current request addresses.
- Never add `IsActiveEntity` to a `where` clause.

---

## 16. Anti-patterns

| Anti-pattern | Why it is wrong | Platform-native alternative |
|---|---|---|
| Custom `isDraft` boolean field on the entity | Fiori draft UX (discard, locks, unsaved-changes dialog) is keyed off CAP's generated `IsActiveEntity`, not your column | `@odata.draft.enabled` |
| Shadow `Books_draft` table maintained by your handlers | CAP already maintains a draft persistence transparently | `@odata.draft.enabled` |
| Custom `action save() returns ...` to "promote" a draft | The `draftActivate` action and the `SAVE` event do this for you, with transactional rollback on validation failure | `srv.before('SAVE', Books.drafts, ...)` |
| Hardcoded `IsActiveEntity=true` in extension-code URLs | Breaks every draft scenario; bound actions return 404 or run on the wrong row | Always derive URLs from the binding context |
| `before UPDATE` only on `Entity` (no handler on `.drafts`) | Misses every PATCH on a draft | Register on `Entity.drafts` for draft-phase logic |
| Calling `oBinding.refresh()` after every action | Causes flicker, extra requests, and lost selection | Declarative `Common.SideEffects` |
| Putting `@odata.draft.enabled` on the db model | Drafts are a service-projection concern; the db model should stay reusable | Annotate the service entity |
| Adding own filters on `IsActiveEntity` in custom CQL without using `Entity.drafts` | CAP's draft orchestration restricts manual filtering — you fight the runtime | Use `Books.drafts` and `req.subject` |

---

## 17. Verification checklist

After modeling and writing handlers, walk this list before declaring done. Each step exercises a real lifecycle event and confirms the wiring.

1. **Confirm the model.** `mcp__cds-mcp__search_model` with `name: "<Entity>"` and `kind: "entity"`; verify `@odata.draft.enabled` is present on the projection and that an `<Entity>.drafts` definition exists.
2. **Exercise the lifecycle.** With `cds watch` running, in a REST client (or `cds repl`):
   ```http
   POST   /odata/v4/<Service>/<Entity>/draftNew
   PATCH  /odata/v4/<Service>/<Entity>(ID=<x>,IsActiveEntity=false)   { "title": "..." }
   POST   /odata/v4/<Service>/<Entity>(ID=<x>,IsActiveEntity=false)/draftActivate
   POST   /odata/v4/<Service>/<Entity>(ID=<x>,IsActiveEntity=true)/draftEdit
   DELETE /odata/v4/<Service>/<Entity>(ID=<x>,IsActiveEntity=false)
   ```
   Each handler you registered should fire exactly once, with the right `req.target.name`.
3. **Open the Fiori Elements preview** (`cds watch` → `/$index.html` → your app). Check:
   - Draft indicator column shows "Draft" / "Unsaved Changes" on rows you started editing.
   - Edit / Create buttons trigger `draftEdit` / `draftNew`.
   - "You have unsaved changes" dialog pops when you navigate away mid-edit.
4. **Invoke each custom bound action while in draft** and confirm:
   - It targets the draft (200, draft row updated).
   - Declared `Common.SideEffects` refresh the right properties (no manual refresh needed).
   - Persistent error messages from the handler appear in the message strip and survive a page refresh.
5. **For media properties**, upload a new file in draft mode, verify the preview rebinds without manual reload, then `SAVE` and verify the active stream now serves the new content.
6. **Run the active-side bypass.** `PATCH /<Entity>(ID=<x>,IsActiveEntity=true)` directly — your `before CREATE/UPDATE` validation must reject the same bad inputs the draft validation rejected. Direct active updates must not bypass your business rules.
