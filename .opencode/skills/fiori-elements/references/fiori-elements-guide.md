# Fiori Elements Guide

Authoritative guide for building SAP Fiori Elements UIs in CAP projects. The core principle: **annotation-driven development** -- define UI behavior via CDS annotations, not custom code.

## Architecture

```text
app/
├── <appname>/                     # One directory per Fiori Elements app
│   ├── annotations.cds            # UI layout: HeaderInfo, LineItem, Facets, FieldGroup
│   ├── annotations/               # Optional split for specific @Common.* concerns
│   │   ├── value-helps.cds        # @Common.ValueList / @Common.Text / @Common.TextArrangement
│   │   ├── side-effects.cds       # @Common.SideEffects
│   │   └── labels.cds             # @Common.Label overrides specific to this app (rare)
│   ├── webapp/
│   │   ├── manifest.json          # App descriptor
│   │   ├── Component.js           # UI5 component (usually generated)
│   │   └── i18n/
│   │       └── i18n.properties    # App-specific translations
│   ├── ui5.yaml                   # UI5 tooling config
│   └── package.json               # App-level dependencies
```

- `@UI.*` annotations describe the **UI layout** and belong in
  `app/<appname>/annotations.cds`.
- `@Common.ValueList`, `@Common.SideEffects`, and any app-specific
  `@Common.Label` overrides are typically split into the `annotations/`
  sub-folder for separation of concerns.
- **Labels themselves are not UI-only.** Define them at the lowest layer that
  is still correct for every consumer — typically `db/schema.cds` (`@title`)
  or a dedicated `db/labels.cds` (`@Common.Label`). Apps inherit those labels
  automatically. See the **`cap-annotations`** skill for the full push-down
  rule, the file-placement matrix, and the i18n conventions.
- CAP loads `app/<appname>/annotations.cds` automatically, but **not** the files in
  `app/<appname>/annotations/`. Import each of them from `annotations.cds`
  (`using from './annotations/value-helps';` etc.) — otherwise they are silently ignored
  (see *Wiring* in **`cap-annotations`**).

## Annotation-Driven Development

Fiori Elements generates the entire UI from OData annotations. Write CDS annotations instead of custom UI5 code.

### List Report Page

Every visible string must be an `{i18n>Key}` — **never hard-code label strings**.
Per-column `Label:` entries are only needed when the column **deviates** from the
field's label at the DB or service layer (e.g. a short form in a narrow table
column). When the DB-level `@title` / `@Common.Label` already says the right
thing, leave the column without an explicit `Label:` so the model stays DRY.

```cds
using OrderService as service from '../../srv/order-service';
using from './annotations/value-helps';

annotate service.Orders with @(
  UI: {
    SelectionFields: [ status_code, type_code, createdAt ],
    LineItem: [
      { Value: title       },
      { Value: type.name   },
      { Value: totalAmount },
      { Value: riskScore,   Criticality: criticality },
      { Value: status.name, Criticality: status.criticality },
      { Value: createdAt   },
      // Context-specific override: short form only used in this table column
      { Value: orderNo, Label: '{i18n>OrderNo_short}' }
    ]
  }
);
```

### Object Page

```cds
annotate service.Orders with @(
  UI: {
    HeaderInfo: {
      TypeName: '{i18n>Order}',
      TypeNamePlural: '{i18n>Orders}',
      Title: { Value: title },
      Description: { Value: description }
    },
    HeaderFacets: [
      { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Status' }
    ],
    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: '{i18n>General}', Target: '@UI.FieldGroup#General' },
      { $Type: 'UI.ReferenceFacet', Label: '{i18n>LineItems}', Target: 'lineItems/@UI.LineItem' },
      { $Type: 'UI.ReferenceFacet', Label: '{i18n>Analysis}', Target: '@UI.FieldGroup#Analysis' }
    ],
    FieldGroup#General: {
      Data: [
        { Value: title },
        { Value: description },
        { Value: totalAmount },
        { Value: currency_code },
        { Value: type_code }
      ]
    },
    FieldGroup#Status: {
      Data: [
        { Value: status_code, Criticality: status.criticality },
        { Value: createdAt },
        { Value: modifiedAt }
      ]
    },
    FieldGroup#Analysis: {
      Data: [
        { Value: riskScore         },
        { Value: evaluationSummary }
      ]
    }
  }
);
```

### Common Annotation Patterns

| Annotation | Purpose |
|------------|---------|
| `@UI.LineItem` | Columns in list/table |
| `@UI.SelectionFields` | Filter bar fields |
| `@UI.HeaderInfo` | Object page header |
| `@UI.Facets` | Object page sections |
| `@UI.FieldGroup` | Grouped fields in a section |
| `@UI.DataPoint` | KPI / header data point |
| `@UI.Chart` | Analytical chart |
| `@UI.Identification` | Actions on the object page |
| `@Common.ValueList` | Value help / dropdown |
| `@Common.Text` | Display text for code fields |
| `@Common.TextArrangement` | How code + text are shown (#TextOnly, #TextFirst) |

### Value Help

Value-help annotations belong in `app/<appname>/annotations/value-helps.cds`,
not in the main `annotations.cds` next to `LineItem`. See `cap-annotations`
for the split rationale and push-down rules (when a value help is shared
across every UI of a service, it can move to
`srv/annotations/{svc}/value-helps.cds`).

```cds
// app/<appname>/annotations/value-helps.cds
using OrderService as service from '../../../srv/order-service';

annotate service.Orders with {
  status @Common.ValueList: {
    CollectionPath: 'OrderStatuses',
    Parameters: [
      { $Type: 'Common.ValueListParameterInOut',      LocalDataProperty: status_code, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]
  };
};
```

### Criticality (Color Coding)

Use virtual elements or calculated fields for criticality:

```cds
// In service CDS
entity Orders as projection on db.Orders;
```

### Actions

**Bound actions** belong to a specific entity and are annotated using `{}` and `;`:

```cds
annotate service.Orders with actions {
  approve @(UI.Hidden: false);
  reject  @(UI.Hidden: false);
};
```

**Unbound actions** live at service level (not tied to an entity) and use `()` and `,` instead:

```cds
annotate OrderService with actions {
  processAll(
    filter: String,
    status: String
  ) returns String;
};
```

To expose an action as a button in Fiori Elements, add a `DataFieldForAction` entry to `UI.Identification` (object page) or `UI.LineItem` (list report):

```cds
annotate service.Orders with @(
  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'OrderService.EntityContainer/approve', Label: '{i18n>Approve}' }
  ]
);
```

For **unbound** action buttons, reference the action directly on the service container:

```cds
annotate OrderService with @(
  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'OrderService.EntityContainer/processAll', Label: '{i18n>ProcessAll}' }
  ]
);
```

## Rules

- **Never** build custom UI5 views/controllers when Fiori Elements annotations can achieve the same result.
- **Never** hard-code label strings in annotations — always use `{i18n>Key}` references. The full i18n conventions (two bundles, key naming, origin comments, locale-file consistency) live in the **`cap-annotations`** skill, `references/i18n.md`.
- **Always** add label keys to `_i18n/i18n.properties` and to every locale file when introducing new fields.
- **Use** `@Common.Text` with `@Common.TextArrangement` for code-list fields to show human-readable labels.
- **Use** `Criticality` annotations to color-code risk levels and statuses.
- **Place `@UI.*` annotations** in `app/<appname>/annotations.cds`; split `@Common.ValueList`, `@Common.SideEffects` and any app-specific `@Common.Label` overrides into the `annotations/` sub-folder.
- **Push labels down**: prefer `@title: '{i18n>Key}'` in `db/schema.cds` or `@Common.Label` in `db/labels.cds` over per-column `Label:` entries. Only set an inline `Label:` on a `@UI.*` element when that specific UI context truly deviates from the DB/service-layer label.
- For the full placement matrix (db / srv / app, push-down conditions, when to create which file), follow the **`cap-annotations`** skill — this guide does not duplicate those rules.
- When in doubt about annotation syntax, consult the Fiori MCP `search_docs` tool or the [SAP Fiori Elements documentation](https://ui5.sap.com/).
