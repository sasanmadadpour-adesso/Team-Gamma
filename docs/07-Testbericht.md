# 07 Testbericht

## Ausgeführt

- `npx.cmd cds compile srv -s CommunityManagementService --to edmx` — erfolgreich.
- `npx.cmd cds compile srv -s all --to edmx` — erfolgreich; fünf Service-EDMX-Ausgaben.
- `npx.cmd cds build --production` — erfolgreich; HANA-, Node.js- und UI5-Build-Tasks.
- `npm.cmd install` — erfolgreich, mit Node-25-Engine-Warnung und gemeldeten npm-Audit-Schwachstellen.
- `cds watch` — erfolgreich gestartet; SQLite-Seed-Daten deployed und fünf Services served.
- HTTP GET `$metadata` mit Mock-User — HTTP 200.
- HTTP GET `Communities` mit Mock-User — HTTP 200 und Seed-Community vorhanden.
- HTTP POST `assignPlant` — HTTP 200, Assignment/VZP erzeugt, `ACKNOWLEDGED`.

## Automatisierte Tests

`npm test` führt vier Tests erfolgreich aus:

- `test/unit/allocation.test.js` deckt proportionale Intervallallokation, Reststrom/Überschuss und Division durch Null ab.
- `test/integration/model-smoke.test.js` lädt das vollständige Modell und prüft die fünf geplanten Services sowie zentrale Entitäten.

Der PowerShell-Smoke-Test liegt unter `test/integration/http-smoke.ps1` und benötigt einen laufenden `cds watch`.

## Einschränkungen

Die drei generierten UI5-Journey-Dateien wurden angelegt, aber kein Browser-E2E-Lauf ist in dieser Umgebung bestätigt. Produktive BTP-Bindings und echte Marktpartner sind nicht vorhanden.
