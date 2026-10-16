# Projektzusammenfassung und offene Punkte

Stand: 16.10.2026

## 1. Projektziel

Das Projekt bildet eine integrierte Energy-Sharing-Anwendung für Communities in einem Stadtteil ab. Die Lösung verbindet Community-Verwaltung, Erzeuger-Onboarding, Anlagenzuordnung, Teilnehmer-Onboarding, Messwertverarbeitung, Energieallokation und Analytics in einer gemeinsamen SAP-CAP-Anwendung.

Technische Basis:

- SAP CAP Node.js
- CDS und OData V4
- Fiori Elements auf SAPUI5-Basis
- SQLite für lokale Entwicklung und Demo
- SAP HANA Cloud / HDI als produktives Zielbild
- SAP BTP Cloud Foundry, XSUAA und MTA als Deployment-Zielbild

## 2. Aktueller Implementierungsstand

### Backend

Das zentrale CDS-Modell liegt in `db/schema.cds`. Darauf basieren fünf Services:

| Service | Verantwortung |
|---|---|
| `CommunityManagementService` | Communities, Konditionen, Anlagenzuordnung und Aktivierung |
| `ProducerOnboardingService` | Anlagenregistrierung und technische Prüfpunkte |
| `ParticipantOnboardingService` | Teilnehmeranträge, E-Mail-Verifikation und Einreichung |
| `AnalyticsService` | Intervalle, Allokationen und Zahlungspositionen |
| `IntegrationService` | Messwerte und Prognosen |

Die fachliche Anlagenzuordnung ist als erster vertikaler End-to-End-Schnitt umgesetzt. Sie prüft Status, iMSys, Bilanzierungsgebiet und Bilanzkreis, erzeugt eine VZP-ID, schreibt das Assignment transaktional und aktualisiert die Status von Anlage und Community. Identische Wiederholungen werden idempotent behandelt.

### Frontend

Es existieren drei Fiori-Elements-Anwendungen auf SAPUI5-Basis:

1. `app/community-management` — List Report und Object Page für Communities
2. `app/producer-portal` — List Report und Object Page für Anlagen
3. `app/participant-onboarding` — Flexible Programming Model mit UI5-Erweiterung

Die Anwendungen verwenden OData V4, CDS-Annotations, responsive UI5-Konfiguration und app-spezifische i18n-Dateien.

### Energieallokation

Die getestete Kernfunktion verwendet verbrauchsproportionale Allokation pro Intervall:

```text
G = min(E, V)
R = max(0, V - E)
Ü = max(0, E - V)
Anteil_i = G × V_i / V
```

Dabei sind `G` die gemeinschaftlich nutzbare Energie, `R` der Reststrombedarf, `Ü` der Überschuss, `E` die Erzeugung, `V` der Gesamtverbrauch und `V_i` der Verbrauch eines einzelnen Teilnehmers. Bei einem Gesamtverbrauch von null wird keine Division durchgeführt.

### Daten und Dokumentation

- Demo-Seed-Daten liegen in `db/data/`.
- Die fachlichen Originalquellen liegen in `docs/sources/`.
- Prozessfluss und technische Landschaft sind in `docs/10-Prozessfluss.md` und `docs/11-Systemlandschaft.md` visualisiert.
- Die Projektstruktur trennt CDS-Modell, Services, Handler-Code, Apps, Tests, Dokumentation und Quellen.

## 3. Validierter Stand

Folgende Prüfungen wurden erfolgreich ausgeführt:

```text
npm test       4 Tests bestanden
npm run compile erfolgreich
npm run build   erfolgreich
```

Zusätzlich wurden das vollständige CDS-Modell, die fünf Services, die OData-Metadaten, Seed-Daten sowie der HTTP-Ablauf der Anlagenzuordnung lokal geprüft.

## 4. Offene Punkte

### 4.1 Vollständiger Excel-Datenimport

Die englische und deutsche Excel-Quelle wurde analysiert und strukturell abgeglichen. Der vollständige Übertrag in produktionsnahe Demo-Daten ist noch offen:

- vollständige Messwerttabellen
- Preis- und Finanzregeln
- Referenzwerte und erwartete Ergebnisse
- sämtliche Beziehungen zwischen den Tabellen
- formale Importvalidierung und Wiederholbarkeit

### 4.2 Vollständige Allokation und Abrechnung

Die Kernberechnung ist vorhanden, aber die komplette Verarbeitung fehlt noch:

- Zeitreihenverarbeitung
- Persistierung von `CommunityIntervals`
- Persistierung von `ParticipantAllocations`
- Monats- und Jahresaggregation
- Produzentenvergütung, Serviceentgelt und Reststromkosten
- vollständige Zahlungspositionen
- Referenzwerttests aus A075 und den Datensätzen

### 4.3 Teilnehmer-Onboarding

Der technische Grundfluss mit Verifikationscode, E-Mail-Bestätigung und Antragseinreichung ist vorhanden. Noch umzusetzen sind:

- vollständiger mehrstufiger FPM-Prozess
- deutsche Fachtexte und vollständige UX-Führung
- Adress-, PLZ-, MaLo-/MeLo- und iMSys-Prüfungen
- Vertragsbestätigung und explizite Einwilligungen
- SEPA-Demo-Prozess und Signaturprozess
- Reststromoption
- Resume-/Draft-Verhalten für alle Schritte
- vollständige Fehler-, Status- und Hinweisanzeigen

### 4.4 Fiori-Oberflächen

Die drei Apps sind generiert und an die Services angebunden. Noch offen sind:

- UI-Actions für alle fachlichen CDS-Actions
- vollständige Object-Page-Facets
- Criticality- und Statusdarstellungen
- Analytics-Charts
- vollständige Onboarding-Navigation
- Accessibility- und Responsive-Feinschliff
- Browser-/OPA-/Journey-Ausführung

### 4.5 Externe Integrationen

Die S1–S6-Grenzen und Datenmodelle sind vorbereitet. Produktive Anbindungen fehlen noch für VNB / Netzbetreiber, S/4HANA oder VZP-System, Lumenaza beziehungsweise vergleichbare Marktplattform, E-Mail und OTP, Signatur, Billing, Payment und reale Marktkommunikation. Aktuell werden diese Abläufe lokal als Demo- oder Mock-Prozesse dargestellt.

### 4.6 Autorisierung

XSUAA und Rollen für `Producer`, `Supplier`, `Participant` und `IntegrationClient` sind vorbereitet. Noch fehlen vollständige `@restrict`-Regeln, Community- und benutzerbasierte Datenfilter, Action-spezifische Berechtigungen sowie Tests mit echten XSUAA-Tokens.

### 4.7 Deployment und Betrieb

MTA, HANA-HDI-Container, HDB-Deployer und XSUAA sind vorbereitet. Noch nicht ausgeführt wurden Deployment in einen BTP-Cloud-Foundry-Space, HANA- und XSUAA-Bindings, Destinations und Connectivity, produktive Smoke-Tests, produktive externe Systemverbindungen sowie Monitoring und Betriebslogging.

Für diese Schritte fehlen aktuell BTP-Zugangsdaten, Entitlements und Zielsysteme.

### 4.8 Testabdeckung

Vorhanden sind Unit-Tests, Modell-Smoke-Tests, ein HTTP-Smoke-Test sowie Compile- und Build-Prüfungen. Noch offen sind vollständige Service-Integrationstests, Autorisierungstests, systematische Fehlerfalltests aller Actions, Browser-E2E-Tests, Last- und Performancetests sowie HANA-spezifische Tests.

## 5. Technischer Hinweis

Die lokale Umgebung verwendet Node.js 25.9.0. Die Installation und Validierung waren erfolgreich, einzelne Abhängigkeiten melden jedoch eine unterstützte Engine-Spanne bis Node.js 24. Für produktionsnahe Tests sollte Node.js 22 LTS verwendet werden.

## 6. Nächste empfohlene Schritte

1. Excel-Datenimport vollständig und reproduzierbar implementieren.
2. Allokations- und Abrechnungsservices gegen die Referenzdaten testen.
3. Teilnehmer-Onboarding fachlich und visuell vervollständigen.
4. Fiori-Actions, Charts und Statusdarstellungen ergänzen.
5. `@restrict`-Regeln und Token-basierte Tests einführen.
6. Externe Adapter mit BTP Destination/Connectivity integrieren.
7. Browser-E2E-Tests auf Node.js 22 LTS ausführen.
8. MTA-Deployment in einem bereitgestellten BTP-Space durchführen.
