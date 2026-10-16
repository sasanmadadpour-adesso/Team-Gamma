---
name: cap-fiori-drafts
description: >-
  End-to-end SAP Fiori draft handling across CAP (CDS modeling, lifecycle
  events, Entity.drafts handler targets, validation placement), OData V4
  (IsActiveEntity composite key, draftActivate/draftEdit/draftNew/draftPrepare,
  DraftAdministrativeData), Fiori Elements (draft indicator, persistent
  messages, $draft.IsActiveEntity expressions, SideEffects), and UI5 extension
  code that must preserve the draft binding context. TRIGGER when: editing or
  creating draft-enabled entities; adding/removing `@odata.draft.enabled`;
  registering handlers for `NEW` / `EDIT` / `PATCH` / `SAVE` / `DISCARD`
  events; using `Entity.drafts`, `srv.new` / `srv.edit` / `srv.save` /
  `srv.discard`; writing or fixing custom bound actions on draft-enabled
  entities; constructing OData URLs with `IsActiveEntity=true|false`,
  `draftActivate`, `draftEdit`, `draftNew`, `draftPrepare`; writing UI
  annotation expressions with `$draft.IsActiveEntity`, `IsActiveEntity`,
  `HasActiveEntity`, `HasDraftEntity`, `SiblingEntity`,
  `DraftAdministrativeData`; configuring `Common.SideEffects` /
  `#alwaysFetchMessages` for draft validation refresh; invoking bound actions
  from a controller extension on an active or draft row; debugging draft
  symptoms — action runs on active instead of draft, action returns 404,
  stale UI after an action, media/PDF preview not refreshing in draft,
  validation firing at the wrong lifecycle phase, active/draft data mixups;
  user mentions "save and resume", "work in progress", "unsaved changes",
  "draft indicator", "lock", "draft lock", "draft timeout". SKIP: for
  non-draft CAP handlers / CDS modeling (use cap-development); for non-draft
  Fiori annotations or manifest edits (use fiori-elements); for the
  architectural decision of whether to use drafts at all (use
  framework-first-review).
---

# CAP Fiori Drafts

Draft handling spans four layers — CDS model, CAP runtime, OData V4 contracts, Fiori Elements / UI5. This skill is the practical bridge between **`skills/cap-development/SKILL.md`** (backend handlers, CQL) and **`skills/fiori-elements/SKILL.md`** (UI annotations). It is opinionated on platform-native draft choreography and does not recommend hand-rolled `isDraft` fields, shadow tables, or custom save actions.

## Reference Material

For the full deep dive, read `references/draft-handling-guide.md`. It covers — in this order — the mental model, `@odata.draft.enabled`, generated semantics (`IsActiveEntity`, `HasActiveEntity`, `HasDraftEntity`, `SiblingEntity`, `DraftAdministrativeData`), the `NEW` / `EDIT` / `PATCH` / `SAVE` / `DISCARD` lifecycle, the handler-registration matrix, validation placement, custom bound actions, draft-aware CQL, OData URLs, media streams, Fiori Elements UX, `$draft.IsActiveEntity` annotation expressions, `Common.SideEffects`, UI5 / extension-code patterns, troubleshooting, anti-patterns, and a verification checklist.

## Mental model in 60 seconds

1. **Lifecycle.** `NEW` → `PATCH*` → `SAVE` (activate) or `DISCARD`. `EDIT` is the alternative entry that turns an existing active entity into a draft you can `PATCH` and then `SAVE`.
2. **Two sibling entities, one composite key.** A draft-enabled entity is always two siblings keyed by `IsActiveEntity`. `(ID=…,IsActiveEntity=true)` is the active row; `(ID=…,IsActiveEntity=false)` is the draft row.
3. **Handler target matters.** `EDIT` is registered on the active entity (`MyEntity`); `NEW`, `PATCH`, `SAVE`, `DISCARD` are registered on the draft sibling (`MyEntity.drafts`). Custom bound actions inherit on both — register against `[MyEntity, MyEntity.drafts]` to share logic.
4. **Validation has two phases.** During draft editing (`PATCH`), `@assert` checks run but the row is still saved so the user does not lose progress. On `SAVE`, *all* validations on the active entity run again — including any custom `before CREATE` / `before UPDATE` handlers. Always validate on active entities, not only on drafts (active updates can bypass the draft flow).
5. **UI refresh is declarative.** Persistent validation messages survive page refreshes via `DraftAdministrativeData.DraftMessages` plus auto-generated `@Common.SideEffects #alwaysFetchMessages`. Use `Common.SideEffects` to refresh stale fields after an action — do not call `oBinding.refresh()` from extension code as a first reflex.

## MCP Tool Guidance

Before writing draft-related code, query the relevant MCP server. These tools surface the canonical wording from Capire and the Fiori Elements docs — quote them rather than guessing.

### `mcp__cds-mcp__search_docs`

```
Tool: search_docs
Parameters:
  query: "your draft question"   (required)
  maxResults: 10                  (optional, default 10)
```

Examples:
- `query: "odata draft enabled choreography lifecycle"`
- `query: "draft specific events NEW EDIT PATCH SAVE DISCARD"`
- `query: "IsActiveEntity HasActiveEntity HasDraftEntity"`
- `query: "DraftAdministrativeData DraftMessages persistent"`
- `query: "fiori draft validation @assert active entity"`
- `query: "draft lock timeout draft_lock_timeout"`
- `query: "programmatic srv.new srv.edit srv.save srv.discard"`

### `mcp__fiori-mcp__search_docs`

```
Tool: search_docs
Parameters:
  query: "your Fiori draft question"   (required)
  maxResults: 25                        (optional, default 25)
```

Examples:
- `query: "draft indicator column list report"`
- `query: "$draft.IsActiveEntity UI Hidden expression"`
- `query: "Common.SideEffects after draft action refresh"`
- `query: "UI.DataFieldForAction draft availability"`
- `query: "unsaved changes dialog draft navigation"`

### `mcp__cds-mcp__search_model`

Use to confirm whether a target entity is actually draft-enabled before writing a handler, and to discover the qualified name of the `.drafts` sibling. Example: `name: "Travel", kind: "entity"`.

### `mcp__plugin_ui5_ui5-mcp-server__get_guidelines` / `get_api_reference`

Use before touching controller-extension code that invokes a bound action on a draft. The OData V4 `sap.ui.model.odata.v4.Context` API and `sap.fe.core.ExtensionAPI` are the canonical surfaces for keeping draft context.

## Core patterns

### 1. Handler registration matrix (CAP Node.js)

```javascript
const { Travels } = this.entities

// EDIT fires when the user starts editing an active row -> register on active
this.before('EDIT', Travels, req => { /* enrich initial draft */ })

// NEW / PATCH / SAVE / DISCARD fire on the draft sibling
this.before('NEW',     Travels.drafts, req => { req.data.ID = cds.utils.uuid() })
this.before('PATCH',   Travels.drafts, req => { /* incremental validation */ })
this.before('SAVE',    Travels.drafts, req => { /* full pre-activation checks */ })
this.before('DISCARD', Travels.drafts, req => { /* cleanup */ })

// Validate active entities too -- direct updates can bypass drafts
this.before(['CREATE', 'UPDATE'], Travels, req => { /* validate all */ })

// Custom bound action -- one implementation for both targets
this.on('approveTravel', [Travels, Travels.drafts], req =>
  UPDATE(req.subject).with({ status: 'A' })
)
```

### 2. Draft-aware UI expression

```cds
annotate TravelService.Travels with @UI : {
  // Hide a derived field while editing; only show it after activation
  Identification : [{
    $Type : 'UI.DataField', Value : totalPrice,
    ![@UI.Hidden] : (not $draft.IsActiveEntity)
  }]
};
```

### 3. Custom bound action surfaced for drafts

```cds
// srv/travel-service.cds
using { sap.capire.travels as db } from '../db/schema';

service TravelService {
  entity Travels as projection on db.Travels actions {
    action approveTravel() returns Travels;
  };
}
```

```cds
// srv/annotations/travel-service/restrictions.cds
// (registered in srv/annotations/travel-service/register.cds — see cap-annotations → Wiring)
using { TravelService } from '../../travel-service';
annotate TravelService.Travels with @odata.draft.enabled;
```

```cds
// app/travels/annotations.cds
using { TravelService } from '../../srv/travel-service';
annotate TravelService.Travels with @UI.LineItem : [
  { $Type : 'UI.DataFieldForAction', Action : 'TravelService.approveTravel',
    Label : '{i18n>Approve}' }
];
```

The action is automatically inherited by `Travels.drafts`. Register the handler once against both targets (see pattern 1) unless the logic genuinely differs.

### 4. UI5 controller-extension call that preserves draft context

```javascript
// In an .extend({ ... }) controller extension on the ObjectPage
sap.ui.define([], () => ({
  async onApprovePressed(oEvent) {
    const oContext = this.editFlow.getView().getBindingContext();
    // oContext path already contains (ID=…,IsActiveEntity=false) when in draft
    await oContext.getModel().bindContext(
      `TravelService.approveTravel(...)`, oContext
    ).execute('$auto', /* bReplaceWithRVC */ true);
  }
}));
```

Never hand-build a URL with `IsActiveEntity=true` from extension code — use the binding context.

## Troubleshooting quick table

| Symptom | Most likely root cause | First check / fix |
|---|---|---|
| Bound action returns 404 / "action not found" | URL lacks `IsActiveEntity` or hits the wrong service path | Use the binding context's path; verify the action is declared on the service entity (it inherits to `.drafts`) |
| Action runs on the active row instead of the draft | URL contains `IsActiveEntity=true`, or no handler registered on `Entity.drafts` | Invoke through `oContext.getModel().bindContext(...)`; if logic differs per state, register handlers separately on `Entity` and `Entity.drafts` |
| UI stale after a custom action | No `Common.SideEffects` declaring source/target properties for the action | Add `@Common.SideEffects` to the action; only fall back to `oBinding.refresh()` when SideEffects are not expressive enough |
| Media / PDF preview not refreshing in draft | Stream URL was built against the active key, or no SideEffect on the stream property after upload | Build the media URL from the draft context (composite key with `IsActiveEntity=false`); declare a SideEffect with `TargetProperties` covering the stream property |
| Validation firing at the wrong lifecycle phase | Heavy validation in `before PATCH` blocks save-and-resume; or no `before CREATE/UPDATE` on the active entity | Keep incremental checks (`@assert`, lightweight rules) in `PATCH`; put expensive / cross-field validation in `before SAVE` *and* `before CREATE/UPDATE` on the active entity |

Each row maps to a deeper section in `references/draft-handling-guide.md`.

## Anti-patterns

- **Custom `isDraft` field / `status = 'draft'`.** Use `@odata.draft.enabled`; CAP generates `IsActiveEntity` and the `.drafts` sibling for free, and the Fiori draft UX (discard, locks, unsaved-changes dialog) only kicks in for genuine drafts.
- **Manual shadow tables.** CAP already creates the draft persistence behind the scenes.
- **Custom `save` actions.** Use the platform-generated `draftActivate` action and the `SAVE` event.
- **Hardcoded active-only URLs in extension code.** Always derive the URL from the binding context so `IsActiveEntity=false` carries through.
- **Handlers that ignore `Entity.drafts`.** A `before UPDATE` on the active entity does *not* fire on `PATCH` to a draft. Register on the draft sibling for draft-phase logic.
- **Calling `oBinding.refresh()` as the default after every action.** Declarative `Common.SideEffects` is the platform-native refresh mechanism.

## Workflow

1. **Confirm draft semantics.** `mcp__cds-mcp__search_model` to check the entity is `@odata.draft.enabled` and the `.drafts` sibling exists; `mcp__cds-mcp__search_docs` for any lifecycle question.
2. **Model handlers per target.** Use the matrix in pattern 1 above. Validate on both `Entity.drafts` (during edit) and `Entity` (on activate / direct updates).
3. **Author annotations.** Use `$draft.IsActiveEntity` to branch UI behaviour; declare `Common.SideEffects` for action/field refresh.
4. **Wire extension code to the binding context.** Never construct OData URLs manually; pass the context through.
5. **Verify end-to-end.** With `cds watch` open, exercise `POST .../draftNew`, `POST .../draftEdit`, `PATCH …`, `POST .../draftActivate`, `DELETE …`. Open the Fiori Elements preview, confirm the draft indicator column shows the right state, invoke the action while in draft, and watch the message strip for persistent validation messages.
