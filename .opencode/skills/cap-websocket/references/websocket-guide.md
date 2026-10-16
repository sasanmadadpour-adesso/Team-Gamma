. # CAP WebSocket Guide

Real-time UI updates in SAP CAP using `@cap-js-community/websocket` plugin with Fiori Elements SideEffects. Referenced by both Cursor skills and Claude Code (CLAUDE.md).

## Architecture Overview

The pattern has four layers that must be wired together correctly:

1. **WebSocket CDS Service** — a dedicated `@protocol: 'ws'` service that declares events
2. **OData Service annotations** — `@Common.WebSocketBaseURL` and `@Common.WebSocketChannel` on the OData service the Fiori app consumes
3. **SideEffects annotations** — `Common.SideEffects` with `SourceEvents` on the entity annotations in `app/<appname>/annotations.cds`
4. **Server-side emit utility** — a TypeScript/JavaScript helper that calls `WebSocketService.emit()` with the correct payload shape

## Install the Plugin

```shell
npm add @cap-js-community/websocket
```

No additional `cds.requires` configuration is needed — the plugin auto-registers when installed.

## WebSocket Service Definition

Create `srv/websocket-service.cds` (kebab-case file, see `cap-cds-naming`). Use `@protocol: 'ws'` (shorthand) and `@ws.format: 'pcp'` for the Push Channel Protocol that Fiori Elements understands.

> **Why a separate WebSocket service:** adesso services use the absolute `@path: '/service/<ServiceName>'`, which serves a service on one protocol only. The WebSocket events therefore live in their own service under `/ws/<ServiceName>` instead of adding `@ws` to the OData service.

```cds
@protocol: 'ws'
@path: '/ws/WebSocketService'
@ws.format: 'pcp'
service WebSocketService {

    @ws.pcp.action: 'OrderStatusChanged'
    event OrderStatusChanged : pcpEvent {
        ID : UUID;
    }

    @ws.pcp.action: 'TaskProgressUpdated'
    event TaskProgressUpdated : pcpEvent {
        ID : UUID;
    }

    type pcpEvent {
        serverAction        : String;
        sideEffectSource    : String;
        sideEffectEventName : String;
    }
}
```

### Rules

- Every event **must** extend `pcpEvent` (the three fields are required by the Fiori SideEffects protocol).
- The `@ws.pcp.action` value **must** match the event name exactly.
- Add entity key fields (e.g. `ID : UUID`) to each event so the frontend knows which record changed.
- The service path **must** start with `/ws/` by convention.

## OData Service Annotations

On the OData service that the Fiori Elements app consumes, add two annotations:

```cds
@path: '/service/OrderService'
@Common.WebSocketBaseURL : '/ws/WebSocketService'
@Common.WebSocketChannel #sideEffects : 'OrderStatusChanged,TaskProgressUpdated'
service OrderService {
    entity Orders as projection on db.Orders;
    entity TaskLogs as projection on db.TaskLogs;
}
```

### Rules

- `@Common.WebSocketBaseURL` requires a **leading `/`** for local development (`cds watch`) because Fiori Elements resolves the path relative to the page URL. However, SAP Build Work Zone requires a relative path **without** leading `/`. See [Leading-Slash Build Script](#leading-slash-build-script) below for the recommended workaround.
- `@Common.WebSocketChannel` lists **all event names** the frontend should subscribe to, comma-separated.
- The `#sideEffects` qualifier is required when using SideEffects-based refresh.

## SideEffects Annotations (Fiori Elements)

In `app/<appname>/annotations.cds`, annotate the **entity that should refresh** with `Common.SideEffects` referencing the WebSocket events.

### Refresh entire list (new records appear)

Use `TargetEntities` to trigger a full re-read of an entity set. This makes new rows appear in list reports.

```cds
annotate service.TaskLogs with @(
    Common.SideEffects #TaskLogCreated : {
        SourceEvents : [ 'TaskLogCreated' ],
        TargetEntities : [ '/OrderService.EntityContainer/TaskLogs' ]
    },
);
```

### Refresh specific properties (existing record updates)

Use `TargetProperties` to re-read the current entity context. This updates progress bars, statuses, etc.

```cds
annotate service.TaskLogs with @(
    Common.SideEffects #TaskProgressUpdated : {
        SourceEvents : [ 'TaskProgressUpdated' ],
        TargetProperties : [ '*' ],
    },
);
```

### Rules

- `SourceEvents` values must match the `@ws.pcp.action` / event name in the WebSocket service.
- `TargetEntities` uses the OData EntityContainer path: `'/ServiceName.EntityContainer/EntitySetName'`. This triggers a full re-read of the entity set (use for "created" events).
- `TargetProperties : [ '*' ]` triggers a re-read of the current entity context (use for "changed/updated" events).
- The SideEffects qualifier (e.g. `#TaskLogCreated`) should be unique and descriptive.
- SideEffects on **bound actions** use `in/` prefix for target properties:

```cds
annotate service.Orders with actions {
    Approve @(
        Common.SideEffects #ApproveOrder : {
            TargetProperties : [
                'in/status',
                'in/approvedAt',
            ],
        }
    );
};
```

## Server-Side Emit Utility

Create a reusable helper in `srv/code/utils/emitWebSocketMessage.ts`:

```typescript
import cds from '@sap/cds';
const LOGGER = cds.log('websocket');

export const emitWebSocketMessage = async ({
    eventName, keys, sideEffectSource
}: {
    eventName: string;
    keys: Record<string, string>;
    sideEffectSource: string;
}) => {
    LOGGER.debug('emitting websocket event:', eventName, keys, sideEffectSource);
    try {
        if (!eventName || !keys || !sideEffectSource) throw new Error('Missing required parameters');
        let encodedSideEffectSource = sideEffectSource;
        for (const [, val] of Object.entries(keys)) {
            encodedSideEffectSource = encodedSideEffectSource.replace(val, encodeURIComponent(val));
        }
        const WebSocketService = await cds.connect.to('WebSocketService');
        await WebSocketService.emit(eventName, {
            ...keys,
            serverAction: 'RaiseSideEffect',
            sideEffectSource: encodedSideEffectSource,
            sideEffectEventName: eventName
        });
        LOGGER.debug('emitted:', eventName);
    } catch (error) {
        LOGGER.error('Error emitting websocket event:', error);
    }
};
```

### Payload Fields

| Field | Value | Purpose |
|-------|-------|---------|
| `serverAction` | Always `'RaiseSideEffect'` | Tells Fiori Elements to trigger SideEffects |
| `sideEffectSource` | OData entity path with keys | Identifies which entity instance changed |
| `sideEffectEventName` | Must match `SourceEvents` in annotation | Routes to the correct SideEffect |
| `...keys` | Entity key-value pairs | Spread into the payload for the event type definition |

### URI-encoding

Key values in `sideEffectSource` must be URI-encoded (the utility does this automatically). This is critical because the Fiori Elements client matches the `sideEffectSource` path against its OData model binding paths.

## sideEffectSource Path Format (Critical)

The `sideEffectSource` must match the OData path that the Fiori Elements frontend holds in its binding context. **This is the most error-prone part of the integration.**

### OData key path rules

| Scenario | Path format | Example |
|----------|-------------|---------|
| Single UUID key | `/Entity(UUID)` | `/TaskLogs(a1b2c3d4-e5f6-...)` |
| Single string key | `/Entity('value')` | `/Categories('electronics')` |
| Multiple keys (mixed) | `/Entity(key1=UUID,key2='str')` | `/Items(ID=a1b2...,type='A')` |
| Multiple keys (all string) | `/Entity(k1='v1',k2='v2')` | `/Texts(locale='en',ID='help')` |

### Rules

- UUID values have **no quotes** in the path.
- String values are wrapped in **single quotes** `'...'`.
- With a single key, just the value in parentheses: `Entity(value)`.
- With multiple keys, use `key=value` pairs separated by commas.
- The path is **relative to the service root** (no service name prefix) — e.g. `/TaskLogs(...)` not `/OrderService/TaskLogs(...)`.
- Always derive the path from the entity's CDS key definition.

### Examples

```typescript
// Single UUID key — no quotes around UUID
emitWebSocketMessage({
    eventName: 'TaskLogCreated',
    keys: { ID: logID },
    sideEffectSource: `/TaskLogs(${logID})`
});

// Single string key — single quotes
emitWebSocketMessage({
    eventName: 'CategoryChanged',
    keys: { code: category },
    sideEffectSource: `/Categories('${category}')`
});

// Multiple keys — key=value pairs
emitWebSocketMessage({
    eventName: 'TextChanged',
    keys: { locale: lang, ID: textId },
    sideEffectSource: `/Texts(locale='${lang}',ID=${textId})`
});
```

## Side-Effect Transaction Helper

WebSocket emits during long-running operations (e.g. batch sync, background jobs) should use a separate transaction so progress updates reach the frontend immediately rather than being held until the main transaction commits.

```typescript
import cds from '@sap/cds';

export function sideEffectTx(fn: () => Promise<void>): void | Promise<void> {
    const tx = cds.tx(fn);
    if (cds.db?.kind === 'hana') return tx;
}
```

- On HANA: `await sideEffectTx(...)` — the transaction is awaited to prevent connection-pool exhaustion.
- On SQLite: fire-and-forget — SQLite has a single-writer lock, so awaiting would deadlock.

### Usage pattern

```typescript
await sideEffectTx(async () => {
    await UPDATE(TaskLogs, logID).with({ current: totalProcessed });
    emitWebSocketMessage({
        eventName: 'TaskProgressUpdated',
        keys: { ID: logID },
        sideEffectSource: `/TaskLogs(${logID})`
    });
});
```

## Approuter Configuration (xs-app.json)

For deployed applications, the approuter must forward WebSocket traffic. Add a route for `ws/` **and** enable the `websockets` option:

```json
{
    "routes": [
        {
            "source": "^/?ws/(.*)$",
            "target": "/ws/$1",
            "destination": "srv-api"
        }
    ],
    "websockets": {
        "enabled": true
    }
}
```

Place the `ws/` route **before** the catch-all route so it takes precedence.

## Leading-Slash Build Script

There is a known limitation with `@Common.WebSocketBaseURL`:

- **Locally** (`cds watch`): Fiori Elements expects a **leading `/`** — e.g. `'/ws/WebSocketService'` — because the browser resolves the path relative to the current page URL.
- **Deployed** (SAP Build Work Zone): Work Zone requires a **relative path without** leading `/` — e.g. `'ws/WebSocketService'` — because its reverse proxy prepends the app's base path.

To avoid toggling this manually, keep the leading `/` in CDS source (so local development works) and strip it during `cds build --production` with an after-build script.

### Setup

Create `scripts/strip-leading-slash-gen.js`:

```javascript
#!/usr/bin/env node
// ESM — matches the "type": "module" default of cds init projects
import fs from 'node:fs';
import path from 'node:path';

const genDir = path.join(import.meta.dirname, '..', 'gen');

if (!fs.existsSync(genDir)) {
  console.error('strip-leading-slash-gen: gen/ folder not found. Run cds build first.');
  process.exit(1);
}

let patchCount = 0;

function patchFile(filePath) {
  const ext = path.extname(filePath);
  if (ext !== '.json' && ext !== '.xml') return;

  const original = fs.readFileSync(filePath, 'utf8');
  let patched;

  if (ext === '.json') {
    patched = original.replace(
      /("(?:@Common\.)?WebSocketBaseURL"\s*:\s*)"\/ws\//g,
      '$1"ws/'
    );
    if (path.basename(filePath) === 'manifest.json') {
      patched = patched.replace(/"uri"\s*:\s*"\/service\//g, '"uri": "service/');
    }
  } else {
    patched = original.replace(/String="\/ws\//g, 'String="ws/');
  }

  if (patched !== original) {
    fs.writeFileSync(filePath, patched, 'utf8');
    console.log(`strip-leading-slash-gen: patched ${path.relative(process.cwd(), filePath)}`);
    patchCount++;
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full);
    else patchFile(full);
  }
}

walkDir(genDir);
console.log(`strip-leading-slash-gen: done (${patchCount} file(s) patched).`);
```

### Wire into MTA build

In `mta.yaml`, add the script after `cds build --production`:

```yaml
build-parameters:
  before-all:
    - builder: custom
      commands:
        - npm ci
        - npx cds build --production
        - node scripts/strip-leading-slash-gen.js
```

### What it patches

| File type | What changes | Example |
|-----------|-------------|---------|
| JSON (OData metadata) | `"/ws/..."` → `"ws/..."` | `WebSocketBaseURL` values in `gen/srv/` |
| XML (EDMX) | `String="/ws/..."` → `String="ws/..."` | EDMX annotation files |
| `manifest.json` | `"/service/..."` → `"service/..."` | Fiori app dataSource URIs |

This way the CDS source always uses the leading-slash form (works with `cds watch`) and the deployed build artifacts use the relative form (works with Work Zone).

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| `sideEffectSource` path doesn't match binding | UI doesn't refresh | Check OData key format (UUID vs string quotes, single vs composite key) |
| `sideEffectEventName` doesn't match `SourceEvents` | SideEffect not triggered | Ensure exact string match between emit payload and annotation |
| Missing `@ws.format: 'pcp'` | Fiori Elements ignores messages | Add `@ws.format: 'pcp'` to the WebSocket service |
| Missing `@Common.WebSocketChannel` | Frontend never subscribes | Add comma-separated event list to OData service |
| `WebSocketBaseURL` missing leading `/` locally | WS connection fails in `cds watch` | Use `/ws/...` in CDS source; strip via build script for deployment |
| Emitting inside main transaction | Updates arrive late / not at all | Use `sideEffectTx` helper for separate transaction |
| Missing `websockets.enabled` in xs-app.json | WebSocket blocked in production | Add `"websockets": { "enabled": true }` |
| String key missing quotes in path | 404 or wrong entity matched | Wrap string keys in single quotes: `Entity('value')` |
