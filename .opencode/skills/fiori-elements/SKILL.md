---
name: fiori-elements
description: >-
  Develops SAP Fiori Elements UIs through OData annotations and UI5 config,
  using the Fiori MCP tool chain. TRIGGER when: editing or creating files
  under app/**, especially app/*/annotations.cds, app/*/webapp/manifest.json,
  app/*/webapp/i18n/**, fragments/*.xml, app/*/webapp/ext/**; user mentions
  Fiori Elements, List Report, Object Page, Analytical List Page, Overview
  Page, ALP, LR, OP, flp, UI5, manifest.json, sap.ui5, routing, target,
  navigation, semanticObject; edits UI.* / Common.* annotations such as
  UI.LineItem, UI.HeaderInfo, UI.Facets, UI.FieldGroup, UI.SelectionFields,
  UI.Chart, UI.KPI, UI.PresentationVariant, UI.SelectionPresentationVariant,
  Common.ValueList, Common.SideEffects, Common.SemanticObject, Criticality,
  @UI.Hidden, @UI.HiddenFilter; adds a controller extension or flexibility
  change. SKIP: for creating a *new* Fiori app from scratch (use
  fiori-generator-cli) and for CAP backend / CDS service changes
  (use cap-development).
---

# Fiori Elements Development

## New applications

To create a **new** Fiori app (same generator as the IDE Application Generator), follow **`skills/fiori-generator-cli/SKILL.md`**. Do not scaffold full `manifest.json` / project trees by hand.

## Reference Material

For detailed guidance, read `references/fiori-elements-guide.md` in this skill directory.

## Standards

Read `references/fiori-elements-guide.md` for all Fiori Elements patterns including:

- Annotation-driven development philosophy
- List Report and Object Page annotations
- Common annotation patterns (LineItem, HeaderInfo, Facets, FieldGroup, ValueList)
- Criticality (color coding)

For **annotation placement** (which annotation belongs to `db/`, `srv/`, or
`app/<appname>/`; when to split UI annotations across `annotations.cds` and
`annotations/value-helps.cds` / `side-effects.cds` / `labels.cds` — and how
`annotations.cds` must import those files, because CAP does not load them on its own; when
to push labels down to `db/labels.cds`), follow the **`cap-annotations`** skill —
`references/fiori-elements-guide.md` does not duplicate those rules.

For draft-aware UI behaviour — `$draft.IsActiveEntity` expressions, persistent validation messages, `Common.SideEffects` after draft actions, controller-extension code that must preserve the draft binding context — see **`skills/cap-fiori-drafts/SKILL.md`**.

## Fiori MCP Tools

### search_docs

Search Fiori Elements, SAPUI5, and Fiori Tools documentation.

**When to use**: unsure about annotation syntax, Fiori Elements features, or UI5 APIs.

```
Tool: search_docs
Parameters:
  query: "your Fiori question"   (required)
  maxResults: 25                  (optional, default 25)
```

Examples:
- `query: "UI.LineItem annotation for list report"`
- `query: "Object Page facets and sections"`
- `query: "Common.ValueList value help dropdown"`
- `query: "side effects annotation"`

### 3-Step App Modification Workflow

For creating or modifying Fiori apps, follow this exact sequence:

#### Step 0 (optional): Find the app

```
Tool: list_fiori_apps
Parameters:
  searchPath: ["{{PROJECT_PATH}}/app"]
```

#### Step 1: List available functionalities

```
Tool: list_functionality
Parameters:
  appPath: "{{PROJECT_PATH}}/app/<appname>"
```

Returns IDs of supported operations (add column, add filter, add page, etc.).

#### Step 2: Get details for a functionality

```
Tool: get_functionality_details
Parameters:
  appPath: "{{PROJECT_PATH}}/app/<appname>"
  functionalityId: "<id from step 1>"
```

Returns required parameters for executing the functionality.

#### Step 3: Execute the functionality

```
Tool: execute_functionality
Parameters:
  appPath: "{{PROJECT_PATH}}/app/<appname>"
  functionalityId: "<id from step 2>"
  parameters: { <parameters from step 2> }
```

## Rules

- Always try the Fiori MCP 3-step workflow before manually editing annotations
- Use `search_docs` when unsure about annotation syntax
- If the MCP doesn't support a functionality, fall back to manual annotation editing following `references/fiori-elements-guide.md`
- Unbound actions (service-level, not tied to an entity) use `()` and `,` for parameters; bound actions (entity-level) use `{}` and `;` -- see the Actions section in `references/fiori-elements-guide.md`
