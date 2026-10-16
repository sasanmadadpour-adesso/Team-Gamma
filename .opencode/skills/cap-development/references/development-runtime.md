# Development, Testing & Deployment

How to run, test, and deploy SAP CAP projects. Covers local development, hybrid testing with real AI Core, and Cloud Foundry deployment.

## Airplane Mode: The Core Principle

> **The app MUST always be fully runnable locally without any remote services.** This is CAP's "airplane mode" philosophy -- you should be able to develop, run, and test on a plane with no internet.

CAP achieves this via **profile-based service resolution**. Every remote service (AI Core, HANA, auth) is automatically replaced by a local mock/stub in the development profile. Code must **never fail** because a remote service is unavailable -- it must gracefully fall back to a stub/mock that produces a valid result.

This means:
- `cds watch` (no profile = development) must boot cleanly and run the full application end-to-end with stubs
- Every function that calls an external service must have a try/catch fallback producing realistic stub data
- No handler may assume any remote service is reachable at development time
- Hybrid mode (`--profile hybrid`) selectively connects to real services for integration testing
- Production uses all real services

## Profiles

CAP uses profiles to switch between environments. Configure services differently per profile in `package.json` under `cds.requires`:

| Profile | Activated by | DB | Auth | AI Core | Purpose |
|---------|-------------|-----|------|---------|---------|
| `[development]` | `cds watch` (default) | SQLite (in-memory) | mocked | **mocked (stub)** | Full local dev -- airplane mode |
| `[hybrid]` | `cds watch --profile hybrid` | SQLite (in-memory) | mocked | **real** (bound) | Integration testing with real AI |
| `[production]` | Cloud Foundry | HANA Cloud | XSUAA/IAS | real | Deployed application |

### Profile Configuration in package.json

```json
{
  "cds": {
    "requires": {
      "auth": {
        "[development]": { "kind": "mocked", "users": {
          "alice": { "roles": ["Analyst"] },
          "bob": { "roles": ["Admin", "Analyst"] }
        }}
      }
    }
  }
}
```

What you do **not** need to configure:
- **Database** — `cds add hana` (when deployment is requested, see `cap-project-scaffold`) adds the `[production]` HANA config; in development `cds watch` uses an in-memory SQLite DB that is re-created from `db/data/*.csv` on every restart. Configure a file-based SQLite DB (`"[development]": { "kind": "sqlite", "credentials": { "url": "db.sqlite" } }`) only if you need data to survive restarts.
- **Production auth** — `cds add xsuaa` (or `ias`) writes the `[production]` auth config.
- **Event queues** — the persistent queue is enabled by default; set `cds.requires.queue` only to tune it (e.g. `maxAttempts`, default `10`).

## Local Development (Airplane Mode)

`cds watch` runs the development profile by default. **No remote services are needed.** Everything is mocked or stubbed:

```bash
npm install
cds watch                 # start with [development] profile (default); in-memory SQLite, seeded from db/data/
```

### How External Dependencies Are Mocked

CAP's mocking mechanism depends on the **type** of external dependency. There are three categories:

| Category | How CAP handles it locally | Example |
|----------|---------------------------|--------|
| **OData / CAP remote services** (`kind: "odata"` / `"odata-v2"` / `"hcql"`, `srv/external/*.cds`) | **Auto-mocked in-process** -- no config needed (official `cap-add-remote-service`) | Imported external OData APIs |
| **REST external services** (`kind: "rest"`, `srv/external/*.cds`) | **Not auto-mocked** -- needs a custom `.js` mock implementation next to the `.cds` file | External REST APIs accessed via `cds.connect.to()` |
| **Libraries / SDKs** (no CDS model at all) | **Not known to CAP** -- the SDK connects directly to the cloud, bypassing CAP's service layer | `@sap-ai-sdk/orchestration`, `@sap-ai-sdk/rpt` |

**Key insight:** OData services get free mocking from their CDS definitions. REST services and SDK libraries do not -- you must provide explicit mock code.

For the full reference with code examples for each category, see **Service Mocking & Airplane Mode** in `references/coding-standards.md`.

### What Happens Locally

1. You trigger your workflow (e.g., via a REST API call)
2. The application runs through all processing steps
3. SDK calls fail (no AI Core) -- the try/catch in each step catches the error and produces **stub data**
4. Any OData external services are auto-mocked by CAP from their CDS definitions
5. Entities move through all statuses with deterministic stub results
6. The Fiori UI shows data with stub-generated results

**This is by design.** The application is fully functional locally. The only difference vs. production is the quality of the AI-generated data.

### Stub Fallback Pattern (for SDK/library calls)

Functions that use `@sap-ai-sdk/orchestration` or `@sap-ai-sdk/rpt` (category 3) follow this try/catch pattern:

```javascript
import cds from '@sap/cds';
import { OrchestrationClient } from '@sap-ai-sdk/orchestration';
const LOGGER = cds.log('on-processDocument');

try {
  const client = new OrchestrationClient({
    promptTemplating: { model: { name: 'anthropic--claude-4.6-opus' } }
  });
  const response = await client.chatCompletion({ messages });
  result = JSON.parse(response.getContent());
} catch (remoteErr) {
  LOGGER.warn('AI call failed, using stub extraction', { reason: remoteErr.message });
  result = {
    category: entity.type_code || 'general',
    date: new Date().toISOString().split('T')[0],
    amount: Number(entity.totalAmount) || 0,
    description: 'Stub extraction — AI Core not configured'
  };
}
```

**Rules for stub fallbacks:**
- The stub must produce data that matches the same schema as the real service response
- The stub must be deterministic (no randomness) so tests are repeatable
- The stub must allow the application to continue to the next processing step
- Log a WARN explaining the fallback, never silently swallow
- Never check `process.env.NODE_ENV` or profile names in code -- just try the real call and catch failure

## Interactive Debugging with `cds repl`

`cds repl` is a Node.js REPL preloaded with the CDS runtime — use it to explore a project's model and test queries interactively without writing a throwaway script or restarting `cds watch`.

```bash
cds repl -r .                # start a CAP server from the current project, expose entities/services globally
cds r -r @capire/bookshop    # shorthand; -r/--run also works with a package/module name
DEBUG=sql cds r -r .         # same, with SQL statement logging
```

Inside the REPL, once `-r` has run, entities and services are available as globals:

```javascript
await SELECT.from(Books).columns('ID', 'title').where({ ID: 201 })
await cds.connect.to('OrderService')
.inspect                     // shows the current object-nesting-depth setting for REPL output
```

Standard Node REPL commands also work: `.break`, `.clear`, `.editor` (multi-line input), `.exit`, `.help`, `.load <file>`, `.save <file>`.

**When to reach for it:**
- Verifying a CQL query shape (including infix filters / nested projections, see `coding-standards.md`) before wiring it into a handler
- Checking what `cds.entities(...)` or `cds.connect.to(...)` actually return for a given service
- Reproducing a bug from a handler in isolation, without going through the full HTTP request cycle

`cds watch` is for running the app end-to-end; `cds repl` is for poking at the model and runtime directly.

## Hybrid Testing = Integration Testing

Hybrid mode connects to **real remote services** while keeping local DB and mocked auth. This is how you do integration testing -- validating that the application works with actual AI Core responses, real model outputs, etc.

**Development (airplane mode)** proves the application logic works. **Hybrid** proves the real services produce the expected results and the integration is correct.

### Prerequisites

- SAP BTP subaccount with AI Core service instance
- `cf` CLI logged in to the subaccount
- `@sap/cds-dk` installed globally or locally

### Step 1: Bind AI Core

```bash
cds bind aicore --to <ai-core-service-instance-name>
```

This creates `.cdsrc-private.json` with the service credentials. **This file must be gitignored** -- it contains secrets.

### Step 2: Add AI Core to cds.requires

Ensure `package.json` has the AI Core destination config:

```json
{
  "cds": {
    "requires": {
      "aicore": {
        "[hybrid]": {
          "kind": "aicore"
        }
      }
    }
  }
}
```

### Step 3: Run in hybrid mode

```bash
cds watch --profile hybrid
```

This starts with SQLite + mocked auth but uses **real AI Core credentials** from `.cdsrc-private.json`.

### Step 4: Test your workflow

Trigger your application's main workflow and watch the logs as each step processes:

```bash
DEBUG=ai-sdk,cds cds watch --profile hybrid    # AI SDK + CDS debug output
DEBUG=sql cds watch --profile hybrid            # SQL statements
DEBUG=* cds watch --profile hybrid              # everything
```

### Important: .cdsrc-private.json

This file is auto-generated by `cds bind` and contains real credentials. It must:
- Be in `.gitignore` (add `*.private.json` or `.cdsrc-private.json`)
- Never be committed
- Never be shared
- Be re-created per developer via `cds bind`

## Deployment to Cloud Foundry (Later)

> **Note**: Deployment setup is typically not implemented at project start. This section documents the target architecture.

### Target Stack

- **Runtime**: Cloud Foundry (Node.js buildpack)
- **DB**: SAP HANA Cloud
- **Auth**: XSUAA or SAP IAS
- **AI**: SAP AI Core (service binding)
- **Build**: MTA (Multi-Target Application)

### Deployment Commands (once mta.yaml exists)

```bash
# Build the MTA archive
mbt build

# Deploy to Cloud Foundry
cf deploy mta_archives/<project-name>_1.0.0.mtar

# Or use the newer cds up (if supported)
cds up
```

### Required Service Instances on BTP

| Service | Plan | Purpose |
|---------|------|---------|
| hana-cloud | hana | Database |
| xsuaa | application | Authentication |
| aicore | standard | AI models (LLM, RPT-1) |
| destination | lite | External service routing |

### MTA Configuration

The `mta.yaml` will need:
- `<project-name>-srv` module (Node.js, CAP server)
- `<project-name>-db-deployer` module (HANA deployer)
- `<project-name>-app` module (app router for Fiori UI)
- Resource bindings for all service instances above

## npm Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `watch` | `cds watch` | Local dev (development profile) |
| `watch:hybrid` | `cds watch --profile hybrid` | Hybrid with real AI Core |
| `start` | `cds-serve` | Production start (Cloud Foundry) |
| `build` | `mbt build` | Build MTA archive (when ready) |
