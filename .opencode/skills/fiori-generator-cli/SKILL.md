---
name: fiori-generator-cli
description: >-
  Scaffolds new SAP Fiori Elements or Fiori freestyle UI5 apps with the
  official @sap/generator-fiori Yeoman generator (same engine as the
  Application Wizard). TRIGGER when: user asks to "create a new Fiori
  app", "add an app to app/", "scaffold a UI5 module", "generate a
  List Report / Object Page / Worklist / OVP / ALP app", "start a new
  frontend"; mentions yo fiori, yo @sap/fiori, @sap/generator-fiori,
  Application Generator, Application Wizard, fiori-generator,
  generator-fiori-elements; expected app folder (e.g. app/<name>/)
  does not exist yet; manifest.json or webapp/ needs to be created
  from scratch. SKIP: for modifying an existing Fiori app (use
  fiori-elements) and for CAP backend scaffolding (use
  cap-project-scaffold).
---

# Fiori app scaffolding (CLI / Yeoman)

## Mandatory rule

**Do not** create a new Fiori Elements (or full Fiori) application by hand: no pasting a full `manifest.json`, folder trees, `Component.js`, or generator-equivalent files from memory. Small **edits** to an already generated app (annotations, i18n, targeted manifest tweaks) are fine and belong under the `fiori-elements` skill.

The same scaffolding the **Fiori Application Generator** (VS Code / BAS “Application Wizard”) uses is available on the CLI via **Yeoman** and **`@sap/generator-fiori`** ([npm](https://www.npmjs.com/package/@sap/generator-fiori)).

## Prerequisites

Match the current generator readme (versions change):

- Node.js (LTS recommended)
- **`yo`** v4.3+ (global)
- **`mta`** CLI (global), when deployment options require it
- **`@sap/generator-fiori`** — global install or invoke via **`npx`**

## Run the generator (same logical flow as the wizard)

1. In the project or target parent directory, run **`yo`**.
2. Choose the **SAP Fiori** / **`@sap/fiori`** entry (wording varies by version; it is the generator backed by `@sap/generator-fiori`).

That is the CLI form of **Command Palette → “Fiori: Open Application Generator”** (wizard UI driving the same generator).

Example install + run:

```bash
npm i -g yo @sap/generator-fiori
yo
# then select the SAP Fiori application generator in the menu
```

Without a global generator install, use whatever **`@sap/generator-fiori`** documents for your version (for example `npx` patterns on the [npm page](https://www.npmjs.com/package/@sap/generator-fiori)). When in doubt, install globally and use **`yo`** + menu selection.

## Automation and prompts

The generator is **prompt-driven** (template, data source, entity, module name, namespace, UI5 version, deployment targets, etc.). In agent-driven terminals:

- The agent **can** start `yo` / the generator; **you** may need to **answer prompts** in the integrated terminal unless SAP documents a supported **non-interactive** mode for your generator version.
- **Hybrid workflow** (often best): you run **Fiori: Open Application Generator** (or `yo`) once; the agent only **refines** the output (annotations, extensions, tests).

Do not substitute “CI-style” or custom bash scaffolding for **initial** Fiori Elements app creation unless the user explicitly chose that path and accepts divergence from the wizard.

## After the app exists

For annotation-driven changes, Fiori MCP tools, and project conventions, follow **`skills/fiori-elements/SKILL.md`** and `skills/fiori-elements/references/fiori-elements-guide.md`.
