---
name: cap-logging
description: >-
  Logs from CAP backend code using the cds.log facade with a module-level
  LOGGER. TRIGGER when: editing any file under srv/code/**; adding
  logging, tracing, debug output, warnings, or error reporting in CAP
  Node.js handlers; user mentions cds.log, LOGGER, log level, log
  category, DEBUG env var, CDS_LOG, structured logs, "why is nothing
  printed", console.log in a CAP file. SKIP: for frontend / UI5 logging
  (out of scope), for the SAP Audit Log Service (covered by
  framework-first-review / BTP catalog), and for test assertions
  (use the project's test harness).
---

# CAP Logging

## Standards

Read the **Logging** section of `skills/cap-development/references/coding-standards.md` for all rules.

## Quick Reference

Every logic module in `srv/code/` must create a module-level logger:

```javascript
// srv/code/order-service/on-processOrder.js
import cds from '@sap/cds';
const LOGGER = cds.log('on-processOrder');

export default async function processOrder(msg, srv) {
  LOGGER.info('Starting order processing', { orderId: msg.data.ID });
  // ...
  LOGGER.debug('External response received', { tokens: tokenUsage.total_tokens });
  // ...
  LOGGER.error('Processing step failed', error);
}
```

## Logger Name Convention

The logger name matches the logic file name without the `.js` extension (file naming per
`coding-standards.md` → *File Naming Conventions*):

| File | Logger name |
|------|-------------|
| `code/order-service/on-processOrder.js` | `cds.log('on-processOrder')` |
| `code/order-service/on-validateOrder.js` | `cds.log('on-validateOrder')` |
| `code/order-service/orders-on-approve.js` | `cds.log('orders-on-approve')` |
| `code/utils/aiClient.js` | `cds.log('utils-aiClient')` |

## Log Levels

| Level | Use for |
|-------|---------|
| `LOGGER.error()` | Failures that prevent the step from completing |
| `LOGGER.warn()` | Recoverable issues (fallbacks, retries) |
| `LOGGER.info()` | Key milestones (step started, step completed, status transitions) |
| `LOGGER.debug()` | Detailed data (LLM token usage, payloads, intermediate results) |

## Enabling Debug Output

```bash
DEBUG=on-processOrder cds watch                # one module
DEBUG=on-processOrder,on-validateOrder cds watch   # multiple
DEBUG=all cds watch                            # everything
```

Or configure in `package.json`:

```json
{ "cds": { "log": { "levels": { "on-processOrder": "debug" } } } }
```

## CDS MCP

Use CDS MCP `search_docs` with queries like:
- `"cds.log logging facade Node.js"`
- `"DEBUG environment variable log levels"`
- `"custom log format cds.log.format"`
