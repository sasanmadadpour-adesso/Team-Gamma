# Capire sources (CDS MCP)

The Capire edge cases in the parent `SKILL.md` were drafted from **`search_docs`** results on the CDS MCP server. Use the same tool with the suggested queries when you need wording or rules straight from documentation. The adesso conventions table is an adesso decision, not Capire content.

## Primary Capire pages cited

| Topic | URL |
|-------|-----|
| CDL keywords, identifiers, basic model shape | https://cap.cloud.sap/docs/cds/cdl |
| Qualified names → slugified DDL / invalid names | https://cap.cloud.sap/docs/guides/databases/cdl-to-ddl |
| Node.js service paths: default mount point, `@path`, absolute vs. relative | https://cap.cloud.sap/docs/node.js/cds-serve#path |
| `@title` / Fiori labels | https://cap.cloud.sap/docs/guides/uis/fiori |
| `using` path casing (`file-unexpected-case-mismatch`) | https://cap.cloud.sap/docs/cds/compiler/messages |
| Representative models (bookshop) | https://cap.cloud.sap/docs/get-started/bookshop |

## Suggested `search_docs` queries

- Namespace and nesting: `"namespace service entity nested CDL compile to cdl"`
- DB names: `"slugified qualified names CQL"`
- Service URL: `"@path service OData base path Node.js"`
- Imports: `"file-unexpected-case-mismatch using from"`
- UI labels: `"@title @description Fiori OData Common.Label"`
