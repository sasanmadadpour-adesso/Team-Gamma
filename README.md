# Team-Gamma
Vibe Coding Challenge 2026 - Team Gamma


# Use Case 2: Smart Mieterstrom Management Platform English Version

**Vibe Coding Challenge | 3 MVPs in one web application | Simulation period: 24 hours**

## 1. Business Problem

Decentralized energy installations can supply households directly with locally generated electricity. In a Mieterstrom (tenant electricity) model, however, participants, contracts, meter readings, local generation, supplementary grid electricity, and financial transactions between different stakeholders must be coordinated accurately.

An operator manages generation assets at several locations. Participating households obtain part of their electricity from local generation. If local generation is insufficient in any hour, **E.ON supplies the remaining electricity (Reststrom)**. Electricity not used locally is exported to the grid. **Metiundo** acts as the metering service provider in this scenario.

**Your challenge:** Build **one integrated web application containing three connected MVPs** that covers onboarding, hourly energy allocation, and financial settlement using the supplied Excel datasets.

## 2. Provided Data and Scope

You will receive datasets covering assets, buildings, households, meters, contracts, hourly consumption, hourly solar and wind generation, hourly wholesale electricity prices, and contractual tariffs and financial rules.

- **Time window:** October 1, 2026, 00:00 UTC through October 2, 2026, 00:00 UTC (exclusive end): exactly 24 hours, represented by 24 hourly intervals.
- **Timestamp format:** ISO 8601 UTC, for example `2026-10-01T00:00:00Z`.
- **Units:** Installed capacity in `kW`, hourly energy in `kWh`, energy prices in `EUR/kWh`, payments in `EUR`.
- **Data source:** Use the provided datasets. Do not invent additional households or generation assets.
- **Eligibility:** The existing column **`Teilnahme MK7`** determines participation. Records marked `nein` must remain visible in the source data but must not contribute to Mieterstrom energy allocation or billing.
- **Site boundaries:** Match consumption and generation only within their assigned building/site. Do not pool electricity across sites or net surpluses against deficits across different hours; no battery storage is modeled.
- **Wind generation:** Wind installations remain part of the application. For this challenge, locally consumed wind electricity may be allocated proportionally like solar electricity; the Mieterstrom subsidy applies only to eligible solar electricity.

## 3. Financial Model: Who Pays Whom?

The following rates are **simplified, fictional challenge tariffs**, not official market or regulatory rates. For this simulation, **E.ON** plays both the supplementary electricity supplier and grid operator roles.

| Payer → Recipient | Purpose | Rate / Calculation |
|---|---|---|
| **Participant → Mieterstrom Supplier** | Electricity bill for total consumption | **0.25 EUR/kWh** × total consumption |
| **Mieterstrom Supplier → Plant Operator** | Payment for locally allocated solar and wind electricity | **0.12 EUR/kWh** × locally allocated renewable electricity |
| **Mieterstrom Supplier → E.ON** | Supplementary electricity (Reststrom) procurement | Hourly wholesale market price × electricity purchased in that hour; **no markup** |
| **E.ON → Plant Operator** | Feed-in payment for surplus solar and wind electricity | **0.07 EUR/kWh** × exported electricity |
| **E.ON → Plant Operator** | Mieterstrom subsidy | **0.025 EUR/kWh** × eligible, locally consumed solar electricity |
| **Mieterstrom Supplier → Metiundo** | Metering services | **30 EUR per meter per year**; allocate **30/365 EUR** per relevant meter to the 24-hour period |

There is **no fixed base fee (Grundpreis)**. Hourly wholesale electricity prices may fluctuate and may be negative. Apply the supplied prices without adding a markup. Display electricity transfers and other costs separately so the settlement remains auditable.

## 4. Three MVPs — One Application

### MVP 1 — Participant Onboarding

Create a module to manage the existing participants and their contract and meter data.

The application must:
- load and link participant, building, meter, and contract records from the dataset;
- check and clearly display the status in **`Teilnahme MK7`**;
- respect contract validity during the 24-hour period;
- show which households are eligible for Mieterstrom calculations and which are excluded.

### MVP 2 — Operator & Energy Management

Create a module for managing generation assets and allocating energy hourly.

The application must:
- display solar and wind installations and their hourly electricity generation;
- calculate total hourly demand of eligible participants for each building;
- allocate available local generation **within each building and hour, proportionally to eligible household consumption**;
- calculate locally allocated electricity and supplementary grid electricity for each participant;
- calculate surplus grid exports and grid imports per asset/building, while keeping solar and wind energy identifiable separately.

**Allocation rule:** For each building and hour, locally usable electricity equals the smaller of available local generation and total eligible demand. Each eligible household receives a share proportional to its consumption during that hour. No household can be allocated more electricity than it consumed. If eligible demand is zero, local allocation is zero.

### MVP 3 — Financial Settlement & Billing

Create a module to calculate bills and clearly explain the flow of money.

The application must:
- calculate the 24-hour electricity bill for each eligible participant;
- calculate the supplier's payments to plant operators for locally allocated electricity;
- calculate Reststrom procurement costs **hour by hour using the wholesale prices**;
- calculate feed-in revenue from exported solar and wind electricity;
- apply the Mieterstrom subsidy **only to eligible, locally allocated solar electricity**;
- include the prorated Metiundo metering charges and present a clear summary of amounts payable and receivable.

Each amount must be traceable to the underlying energy quantity, hour, tariff rule, payer, and recipient.

## 5. Expected Deliverable

Deliver a working **web application integrating all three MVPs**. A user should be able to review the existing participants and assets, inspect hourly energy flows, and see all payments and revenues for the 24-hour simulation period.

An interactive time-series chart is **not required**. Clear tables, summary metrics, and settlement views are sufficient. Live integrations with SAP, E.ON, Metiundo, or an electricity exchange API are **not required**. Correct data relationships, energy allocation, and financial calculations are the key priorities.

**Note:** This challenge intentionally simplifies the Mieterstrom business process. It does not represent a complete implementation of regulatory, tax, or energy-market requirements.




# Use Case 2: Smart Mieterstrom Management Platform deutsche Version

**Vibe Coding Challenge | 3 MVPs in einer Webanwendung | Simulationszeitraum: 24 Stunden**

## 1. Problemstellung

Dezentrale Energieanlagen können Haushalte direkt mit lokal erzeugtem Strom versorgen. Im Mieterstrom-Modell müssen jedoch Teilnehmende, Verträge, Messwerte, lokale Erzeugung, ergänzender Netzstrom sowie die finanziellen Beziehungen zwischen mehreren Akteuren korrekt koordiniert werden.

Ein Betreiber verwaltet Erzeugungsanlagen an mehreren Standorten. Die teilnehmenden Haushalte beziehen einen Teil ihres Stroms aus der lokalen Erzeugung; reicht diese in einer Stunde nicht aus, wird **Reststrom von E.ON** bezogen. Nicht lokal genutzte Erzeugung wird ins Netz eingespeist. **Metiundo** ist im Szenario für den Messstellenbetrieb zuständig.

**Eure Aufgabe:** Entwickelt **eine integrierte Webanwendung mit drei miteinander verbundenen MVPs**, die den Prozess vom Onboarding über die stündliche Energiezuordnung bis zur finanziellen Abrechnung anhand der bereitgestellten Excel-Datensätze abbildet.

## 2. Datengrundlage und Rahmenbedingungen

Ihr erhaltet Datensätze zu Anlagen, Gebäuden, Haushalten, Zählern, Verträgen, stündlichem Verbrauch, stündlicher Solar- und Winderzeugung, stündlichen Börsenstrompreisen sowie vertraglichen Tarifen und Finanzregeln.

- **Zeitraum:** 1. Oktober 2026, 00:00 Uhr bis 2. Oktober 2026, 00:00 Uhr (Ende exklusiv): genau 24 Stunden mit 24 Stundenintervallen.
- **Zeitformat:** ISO 8601 in UTC, z. B. `2026-10-01T00:00:00Z`.
- **Einheiten:** Leistung in `kW`, stündliche Energiemengen in `kWh`, Energiepreise in `EUR/kWh`, Zahlungen in `EUR`.
- **Datenquelle:** Nutzt die bereitgestellten Datensätze. Legt keine zusätzlichen fiktiven Haushalte oder Anlagen an.
- **Teilnahmeprüfung:** Die vorhandene Spalte **`Teilnahme MK7`** ist maßgeblich. Einträge mit `nein` bleiben in den Quelldaten sichtbar, dürfen aber nicht in die Energiezuordnung und Mieterstromabrechnung eingehen.
- **Gebäudebezug:** Verbrauch und Erzeugung dürfen nur innerhalb des jeweils zugeordneten Gebäudes/Standorts verrechnet werden. Keine Verrechnung zwischen Standorten und keine zeitliche Verrechnung zwischen Stunden; ein Batteriespeicher ist nicht Teil des Szenarios.
- **Windenergie:** Windanlagen bleiben Bestandteil der Anwendung. Für die Challenge kann lokal genutzter Windstrom wie Solarstrom anteilig zugeordnet werden; der Mieterstromzuschlag gilt in der Simulation ausschließlich für berechtigten Solarstrom.

## 3. Finanzmodell: Wer zahlt an wen?

Die folgenden Werte sind **vereinfachte, fiktive Challenge-Tarife**, keine verbindlichen Markt- oder EEG-Tarife. **E.ON** übernimmt im Szenario sowohl die Rolle des Reststromlieferanten als auch die Rolle des Netzbetreibers.

| Zahler → Empfänger | Anlass | Preis / Berechnungsbasis |
|---|---|---|
| **Teilnehmer → Mieterstromlieferant** | Stromrechnung für den gesamten Verbrauch | **0,25 EUR/kWh** × gesamter Verbrauch |
| **Mieterstromlieferant → Anlagenbetreiber** | Vergütung lokal genutzter Solar- und Windenergie | **0,12 EUR/kWh** × lokal zugeordnete erneuerbare Energie |
| **Mieterstromlieferant → E.ON** | Bezug des ergänzenden Reststroms | Stündlicher Börsenstrompreis × Reststrommenge der jeweiligen Stunde; **kein Aufschlag** |
| **E.ON → Anlagenbetreiber** | Einspeisevergütung für überschüssige Solar- und Windenergie | **0,07 EUR/kWh** × Netzeinspeisung |
| **E.ON → Anlagenbetreiber** | Mieterstromzuschlag | **0,025 EUR/kWh** × förderfähige, lokal genutzte Solarenergie |
| **Mieterstromlieferant → Metiundo** | Messstellenbetrieb | **30 EUR pro Zähler und Jahr**; für 24 Stunden anteilig **30/365 EUR** pro relevantem Zähler |

Es gibt **keinen Grundpreis**. Stündliche Börsenpreise können schwanken und auch negativ sein; diese Werte sind ohne zusätzlichen Aufschlag zu berücksichtigen. Bei der Abrechnung sind Energiezahlungen und andere Kosten getrennt nachvollziehbar darzustellen.

## 4. Drei MVPs – eine Anwendung

### MVP 1 — Participant Onboarding

Erstellt einen Bereich für die Verwaltung der bestehenden Teilnehmenden und ihrer Vertrags- und Zählerinformationen.

Die Anwendung soll:
- Teilnehmer-, Gebäude-, Zähler- und Vertragsdaten aus dem Datensatz einlesen und verknüpfen;
- den Status aus **`Teilnahme MK7`** prüfen und klar anzeigen;
- die Vertragsgültigkeit für den 24-Stunden-Zeitraum berücksichtigen;
- anzeigen, welche Haushalte für die Mieterstromberechnung berücksichtigt werden und welche nicht.

### MVP 2 — Operator & Energy Management

Erstellt einen Bereich für Anlagenbetrieb und stündliche Energiezuordnung.

Die Anwendung soll:
- Solar- und Windanlagen sowie ihre stündliche Erzeugung anzeigen;
- den stündlichen Verbrauch der berechtigten Teilnehmenden je Gebäude bestimmen;
- die lokal verfügbare Energie **pro Gebäude und Stunde proportional zum Verbrauch der berechtigten Haushalte** verteilen;
- je Teilnehmer lokal zugeordnete Energie und Reststrom ermitteln;
- je Anlage/Gebäude Überschusseinspeisung und Netzbezug berechnen und Solar- und Windmengen getrennt ausweisen.

**Zuordnungsregel:** Für eine Stunde und ein Gebäude ist die lokal nutzbare Energiemenge das Minimum aus verfügbarer lokaler Erzeugung und Gesamtverbrauch berechtigter Haushalte. Jeder berechtigte Haushalt erhält davon den Anteil, der seinem Anteil am Gesamtverbrauch dieser Stunde entspricht. Niemand darf mehr Energie erhalten, als er verbraucht. Bei Gesamtverbrauch null ist die lokale Zuordnung null.

### MVP 3 — Financial Settlement & Billing

Erstellt einen Bereich für Abrechnung und Transparenz der Geldflüsse.

Die Anwendung soll:
- die Stromkosten jedes berechtigten Haushalts für 24 Stunden berechnen;
- die Vergütung der lokal genutzten Erzeugung an den Anlagenbetreiber ermitteln;
- den Reststrombezug **stundenweise anhand der Börsenpreise** abrechnen;
- die Einspeisevergütung für Solar- und Windüberschüsse bestimmen;
- den Mieterstromzuschlag **ausschließlich auf förderfähigen, lokal zugeordneten Solarstrom** anwenden;
- die anteiligen Metiundo-Kosten und eine nachvollziehbare Gesamtübersicht der Zahlungen darstellen.

Jedes Ergebnis muss auf die verwendete Energiemenge, Stunde, Tarifregel und die beteiligten Akteure zurückführbar sein.

## 5. Erwartete Abgabe

Liefert eine funktionsfähige **Webanwendung mit drei verknüpften MVPs**. Ein Nutzer soll bestehende Teilnehmer und Anlagen prüfen, die stündlichen Energieflüsse nachvollziehen und die Zahlungsverpflichtungen bzw. Einnahmen für den 24-Stunden-Zeitraum einsehen können.

Eine interaktive Zeitreihengrafik ist **nicht erforderlich**. Übersichtliche Tabellen, Kennzahlen und Abrechnungsansichten genügen. Echte Integrationen mit SAP, E.ON, Metiundo oder einem Strombörsen-API sind **nicht erforderlich**. Entscheidend sind korrekte Datenverknüpfung, Energiezuordnung und Abrechnung.

**Wichtig:** Diese Challenge bildet einen bewusst vereinfachten Mieterstrom-Geschäftsprozess ab. Sie ist keine vollständige Darstellung regulatorischer, steuerlicher oder energiewirtschaftlicher Pflichten.
