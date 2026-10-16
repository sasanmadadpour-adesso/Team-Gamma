# Community-App Einspeisung (SAP CAP + SAP BTP + SAP Fiori Elements Muster-App)

Prescribed implementation technologies for this project are:

- SAP CAP (Cloud Application Programming Model)
- SAP BTP
- SAP Fiori / SAP Fiori Elements

The runnable vanilla HTML/CSS/JavaScript application in this repository is the
validated functional and visual reference. The target architecture is SAP Fiori Elements
driving a CAP OData service with CAP business/domain logic and BTP-ready persistence.

Do NOT use the vanilla HTML/CSS/JavaScript application as the final implementation
architecture.

# Community-App Einspeisung (SAP CAP + SAP Fiori Elements foundation)

This repository now contains the CAP/CDS/service foundation and a Fiori Elements application skeleton for the Community-App Einspeisung.

The existing vanilla HTML/CSS/JavaScript prototype remains available in the repository root as the validated functional and visual reference. It is not the target architecture.

## Local prerequisites

Install these before running:

1. Node.js LTS
2. SAP CAP development kit:
   `npm install -g @sap/cds-dk`
3. CAP project dependencies:
   `npm install`
4. For the Fiori Elements app, use the SAP Fiori tools / SAP Business Application Studio / VS Code SAP Fiori tools as appropriate for manifest-based app run.

## Start CAP locally

From the repository root:

```bash
npm install
npm run watch
```

Then open:

```text
http://localhost:4004
```

Service endpoint:

```text
http://localhost:4004/communityapp
```

## Fiori Elements app

The Fiori Elements app skeleton is located under:

```text
app/community-einspeisung
```

For a local run, configure the SAP Fiori tools preview/run configuration against the OData service:

```text
http://localhost:4004/communityapp/
```

## Demo/mock data

Unavailable S1/S2/S3/S5 integrations use CAP seed data and service-level demo behavior. Demo data is clearly represented in `db/data` and in service logic.

This is not a real S/4HANA, VNB, MSB, Lumenaza or BKV implementation.

## Intentionally left for later

- Real BTP deployment
- Real S1 master-data integration
- Real S2 market-process triggering
- Real S3 market response integration
- Real S5 measurement/profile ingestion
- Aktion 2 assignment to Community
- Lumenaza/BKV downstream processing
- Production authentication/authorizations
