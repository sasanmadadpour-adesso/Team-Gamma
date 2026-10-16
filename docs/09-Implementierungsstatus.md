# 09 Implementierungsstatus

Stand: 16.10.2026

## Erledigt

- Greenfield-CAP-Node.js-Projekt initialisiert.
- HANA-, XSUAA- und MTA-Facets erzeugt.
- Gemeinsames CDS-Domänenmodell und fünf OData-V4-Services erstellt.
- Seed-Daten aus der fachlichen Demo abgeleitet.
- Community- und Anlagenzuordnung mit Transaktion, Validierung, Idempotenz und VZP umgesetzt.
- Drei Fiori-Anwendungen über Fiori MCP generiert.
- Community-UI-Anmerkungen ergänzt.
- Produktionsbuild, EDMX-Compile und HTTP-Smoke-Test ausgeführt.

## Noch offen

- Vollständiger Excel-Import sämtlicher Messwerte, Preise und Zahlungsregeln.
- Vollständige Allokationspersistenz und Referenzwerttests A075.
- vollständiger FPM-Teilnehmerfluss mit allen Ansichten, Signatur- und SEPA-Demo-Regeln.
- UI-Action-Anmerkungen und vollständige Rollenfilter pro Benutzerattribut.
- echte BTP-Integration und Browser-E2E-Ausführung.

Eine ausführliche Zusammenfassung mit offenen Punkten und empfohlenen nächsten
Schritten steht in
[`12-Zusammenfassung-und-offene-punkte.md`](12-Zusammenfassung-und-offene-punkte.md).

## Blocker

- Node.js 25.9.0 ist außerhalb der von `@sap/xsenv` gemeldeten unterstützten Engine-Spanne; die Installation funktioniert mit Warnung. Für produktionsnahe Tests sollte Node.js 22 LTS verwendet werden.
- BTP-Zugangsdaten und Entitlements sind nicht vorhanden; Deployment bleibt vorbereitet.
