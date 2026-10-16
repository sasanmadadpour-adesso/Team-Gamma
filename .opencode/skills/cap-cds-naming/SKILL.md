---
name: cap-cds-naming
description: >-
  adesso naming standard for CAP projects — CDS identifiers (namespaces, entities, services,
  elements), @path values, service/annotation file names, and i18n keys — plus the Capire edge
  cases (slugification, reserved words, using-path casing). TRIGGER when:
  editing db/schema.cds, srv/*.cds, or any .cds file; using keywords
  namespace / entity / service / type / aspect / action; renaming a
  definition or a service file; choosing or debating an @path; naming an i18n key;
  reviewing models for portability across SAP HANA / SQLite / OData; user mentions "namespace",
  "qualified name", "slugification", "snake_case vs camelCase", "kebab-case",
  "plural vs singular entity name", "UI label vs technical name". SKIP:
  for srv/code/ logic-module naming (use cap-development), for Fiori annotation / @UI.*
  content (use fiori-elements), or for mta.yaml / package.json naming (use cap-project-scaffold).
---

# CAP naming conventions (adesso standard)

> **Baseline in `cap-developer`.** PascalCase for entities and types, camelCase for elements,
> and a `namespace` in `db/schema.cds` are official rules. This skill adds the **adesso
> decisions** on top, plus the Capire edge cases the official skill doesn't drill into.

## adesso conventions

| What | Convention | Example |
|---|---|---|
| Namespace | Dotted, lowercase, declared once in `db/schema.cds` | `namespace com.example.orders;` |
| Entities | PascalCase, **plural** (they are sets) | `Orders`, `LineItems`, `OrderStatuses` |
| Types / aspects | PascalCase, singular | `Amount`, `Address` |
| Elements | camelCase; `ID` for keys | `orderNo`, `totalAmount`, `ID` |
| Services | PascalCase, `<UseCase>Service` — named after the consumer / purpose, never `AppService` / `MainService` | `ProcessingService`, `AdminService`, `IntegrationService` |
| Actions / functions | camelCase verbs | `approve`, `submitOrder`, `getClientId` |
| Events | PascalCase nouns/verbs | `ProcessOrder`, `OrderApproved` |
| Service file | **kebab-case** of the service name, `.cds` + `.js` with identical base names | `srv/order-service.cds` + `srv/order-service.js` |
| Service annotation files | `srv/annotations/<service-file-name>/<topic>.cds` (kebab-case) | `srv/annotations/order-service/restrictions.cds` |
| Service annotation register | `srv/annotations/<service-file-name>/register.cds` — lists every file of that folder | `srv/annotations/order-service/register.cds` |
| Top-level annotation file | `srv/annotations.cds` — exactly one, lists every `register.cds` | `srv/annotations.cds` |
| Service path | `@path: '/service/<ServiceName>'` on every service | `@path: '/service/OrderService'` |
| i18n label keys (`_i18n/i18n.properties`) | PascalCase field / entity name, `_qualifier` for variants | `OrderNo`, `Orders`, `OrderNo_short` |
| Constraint message keys (`_i18n/messages.properties`) | `msg_<description>` | `msg_begin_after_end` |
| Runtime message keys (`_i18n/messages.properties`) | `UPPER_SNAKE_CASE` | `ORDER_NOT_FOUND` |
| Logic modules in `srv/code/` | see **`cap-development`** → *File Naming Conventions* | `orders-on-approve.js` |

### Notes on the `@path` standard

- Without `@path`, CAP Node.js serves a service at `/odata/v4/<name>` where `<name>` is the
  lowercase service name without the trailing `Service` (`CatalogService` → `/odata/v4/catalog`).
  adesso overrides this on purpose so that every project exposes its services under the same,
  predictable `/service/<ServiceName>` pattern (AppRouter routes, `project-context.md`, docs).
- An **absolute** `@path` means the service is served on **one protocol only**. If a service
  must be served via several protocols (e.g. `@protocol: ['odata', 'rest']`), use a relative
  path instead (`@path: 'order'` → `/odata/v4/order`, `/rest/order`) and record the exception in
  `project-context.md`.
- WebSocket services (`@protocol: 'ws'`, see **`cap-websocket`**) are separate services under
  `@path: '/ws/<ServiceName>'`.

### Renaming legacy files

PascalCase service files (`srv/OrderService.cds` / `.js`) are legacy. When you touch them,
rename `.cds` and `.js` together to kebab-case and update every `using from` path that points
at them — the `using` string must match the on-disk casing exactly (see below).

## Capire edge cases

Use CDS MCP **`search_docs`** for anything not listed here, e.g.
`"CDL identifiers delimited names reserved"`, `"slugified qualified names CQL SELECT"`,
`"@path service OData endpoint"`, `"file-unexpected-case-mismatch using from"`.

### Database and SQL interoperability

- Qualified CDS names are **slugified** for tables (dots become underscores), e.g.
  `com.example.orders.Orders` → `com_example_orders_Orders`. CQL/SQL may use **either** the qualified CDS
  name or the slugified table name.
- **Avoid** whitespace, non-ASCII, and SQL **reserved words** in identifiers. CAP can emit
  delimited/quoted DDL for "bad" names, but Capire **strongly discourages** this because of pain
  in native SQL, third-party tools, and interoperability. Prefer **simple ASCII identifiers**
  without reserved keywords.

### `using` imports and file names

- Compiler warning **`file-unexpected-case-mismatch`**: the string in `using from './Model'`
  must match **on-disk file casing**. Case-insensitive OSes (macOS, Windows) hide the bug until
  the build runs on Linux (CI, Cloud Foundry). Match the real filename (e.g. `./order-service`).

### Generated artifacts and data files

- Seed CSV file names derive from the qualified entity name, e.g. `db/data/com.example.orders-Orders.csv`
  — keep namespaces and entity names stable, renaming them orphans existing CSVs.

## Relationship to this library's handler naming

`srv/code/<service-name>/` event modules and the rest of the repository layout are documented
in `skills/cap-development/references/coding-standards.md`. Apply **this skill** for CDS model,
API surface, file and i18n-key naming; apply **cap-development** for logic-module layout.
