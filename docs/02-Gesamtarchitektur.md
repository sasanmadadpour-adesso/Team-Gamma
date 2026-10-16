# 02 Gesamtarchitektur

Die Anwendung ist ein CAP-Node.js-Backend mit gemeinsamem CDS-Domänenmodell und mehreren Fiori-Elements-Oberflächen. Lokal wird SQLite verwendet, produktiv HANA Cloud/HDI.

```mermaid
flowchart TB
  UI["Fiori Elements: Community / Erzeuger / Teilnehmer"] --> X[XSUAA / Approuter]
  X --> CAP["CAP Node.js: OData V4 Services"]
  CAP --> DB["SQLite lokal / HANA Cloud produktiv"]
  CAP --> MOCK["S1-S6 deterministische Mock-Adapter"]
  CAP --> NOTIFY["Notification/Mail-Adapter"]
```

Services:

- `CommunityManagementService`: Communities, Zuordnung und Aktivierung.
- `ProducerOnboardingService`: Anlagenstatus und Prüfpunkte.
- `ParticipantOnboardingService`: Antrag, E-Mail-Verifikation und Einreichung.
- `AnalyticsService`: Zeitreihen und Zahlungspositionen.
- `IntegrationService`: Messwert- und Prognoseaufnahme.

CRUD bleibt beim CAP Generic Provider. Fachliche Vorgänge sind gebundene CDS-Actions. Benutzeroberflächen verwenden Annotationen; nur der mehrphasige Teilnehmerfluss benötigt das generierte FPM-Grundgerüst.
