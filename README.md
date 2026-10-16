
# Energy Sharing im Stadtteil

SAP CAP Node.js / OData V4 / Fiori Elements-Anwendung für Community-Verwaltung,
Erzeuger-Onboarding, Anlagenzuordnung, Teilnehmer-Onboarding und Analytics.

## Schnellstart lokal

```powershell
npm install
npm test
npm run compile
npm run build
npx cds watch
```

Die lokalen Demo-Services verwenden SQLite und die Seed-Daten aus `db/data/`.
Während `cds watch` läuft, sind die Services unter `/service/<ServiceName>/`
erreichbar. Die lokale Mock-Authentifizierung akzeptiert beispielsweise den
Benutzer `alice` mit leerem Passwort.

## Anwendungen

- `app/community-management` — Community-Verwaltung (List Report/Object Page)
- `app/producer-portal` — Anlagen-/Erzeugerportal (List Report/Object Page)
- `app/participant-onboarding` — mehrstufiges Teilnehmer-Onboarding (FPM)

## Dokumentation

Die Anforderungsanalyse, Architektur, Entscheidungen, Testnachweise,
Deployment-Vorbereitung und der offene Restumfang liegen unter `docs/`.
Produktive BTP-Bindings und echte Marktpartner-Integrationen sind vorbereitet,
aber in dieser Umgebung nicht vorhanden und daher nicht als ausgeführt behauptet.

Wichtige Übersichten:

- [`docs/10-Prozessfluss.md`](docs/10-Prozessfluss.md) — fachlicher End-to-End-Prozess mit Flowcharts und Sequenzdiagramm
- [`docs/11-Systemlandschaft.md`](docs/11-Systemlandschaft.md) — technische, fachliche und deploymentbezogene Gesamtlandschaft
- [`docs/12-Zusammenfassung-und-offene-punkte.md`](docs/12-Zusammenfassung-und-offene-punkte.md) — aktueller Stand, offene Punkte und nächste Schritte
