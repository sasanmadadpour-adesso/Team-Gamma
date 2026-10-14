# Team-Beta
Vibe Coding Challenge 2026 - Team Beta


# Use Case 2 — Hourly Mieterstrom Energy Management, Allocation & Financial Settlement ''English version''

**Vibe Coding Challenge | One web application | Three connected MVPs | 24-hour dataset**



### Introduction to Mieterstrom and the European Energy Framework

As part of the European Union's energy transition, regulatory initiatives such as the **Renewable Energy Directive (RED III)** and the **Electricity Market Design Reform** promote renewable energy generation, decentralized electricity systems, and greater consumer participation in energy markets. In Germany, the **Mieterstrom (tenant electricity) model**, governed by national legislation including the EEG and EnWG, enables households to benefit directly from locally generated electricity.

Under this model, a **plant operator (Anlagenbetreiber)** installs and operates renewable energy facilities, particularly photovoltaic systems. Participating households (**Teilnehmer**) consume locally generated electricity whenever available. If production is insufficient, supplementary electricity (**Reststrom**) is purchased from the public grid. Surplus electricity can be fed into the grid.

The main stakeholders include the **Anlagenbetreiber**, **Teilnehmer**, **Mieterstrom Supplier**, **Grid Operator (Netzbetreiber)**, and **Metering Service Provider (Messstellenbetreiber)**. In this challenge's simplified business scenario, **E.ON** acts as both the supplementary electricity supplier and grid operator, while **Metiundo** provides metering services.

A successful Mieterstrom system requires accurate participant and contract registration, reliable energy metering, allocation of locally generated electricity, and transparent financial transactions between stakeholders. Solar and wind generation are included in the challenge, while the statutory Mieterstrom subsidy applies only to eligible solar electricity.




## 1. Business Context and Challenge Goal

In a **Mieterstrom** community, participating households cover part of their electricity consumption with locally produced solar or wind energy.

Production changes throughout the day, and household demand changes as well. A building may export surplus electricity at noon and still need supplementary grid electricity later that night.

For this challenge, **E.ON** supplies any shortage as **Reststrom (supplementary electricity)**, while surplus electricity is exported to the grid.

**Metiundo** provides metering services.

Besides calculating electricity volumes, the application must show how much each household pays and how money moves between the Mieterstrom supplier, plant operators, E.ON and Metiundo.

**Challenge goal:** Create one web application that reads the provided data and **calculates building-level energy balances, each household's share of locally generated energy, and financial settlements**.

Household solar shares are **not precomputed in the input**: they are results that the application must produce.

## 2. Inputs and Core Rules

The supplied dataset includes:

- Building and asset identifiers
- Solar/wind asset types
- Hourly generation (kWh)
- Hourly household demand (kWh)
- Hourly wholesale market prices (EUR/kWh)
- Contracts and meters
- `Teilnahme MK7`
- Contractual tariffs

**Simulation period:** From `2026-10-01T00:00:00Z` up to but excluding `2026-10-02T00:00:00Z`: **24 one-hour intervals**, in UTC.

Units:

- Installed capacity: `kW`
- Electricity energy: `kWh`
- Unit price: `EUR/kWh`
- Payment: `EUR`

**Eligibility:** A household is included only when its contract is valid for that hour and its `Teilnahme MK7` value is `Ja`.

Keep `nein` records in the source data, but exclude them from allocation and billing.

**Site and time boundaries:** Balance every building and every hour independently. Electricity cannot move between buildings, and noon surplus cannot offset evening shortages; no battery storage is modeled.

**Wind energy:** Local wind energy can be allocated like solar energy, but the **Mieterstrom subsidy only applies to eligible locally used solar energy**.

## 3. Three MVP Tasks

### MVP 1 — Hourly Energy Monitoring & Balancing

Create an **operator-level, building-oriented** view.

For each of the 24 hours, the app must read the consumption of eligible households and the generation of the associated assets, then compare them.

Solar and wind values should remain distinguishable.

For each building and hour, show:

- Total eligible demand
- Total generation
- Energy that can be used locally
- The shortage requiring Reststrom
- Surplus electricity that can be exported

A table with clear summary metrics is enough: **an interactive chart is not required**.

**Illustrative example (not taken from the answer key):**

If eligible households consume `10 kWh` and local generation is `6 kWh`, local use is `6 kWh` and Reststrom is `4 kWh`.

If generation reaches `12 kWh`, local use is `10 kWh` and grid export is `2 kWh`.

### MVP 2 — Proportional Energy Allocation

Move from the **building level to the individual household level**.

The local energy available in each hour must be shared **in proportion to each eligible household's demand**, not equally among households.

For a building and hour, calculate:

`LocalUse = min(LocalGeneration, EligibleConsumption)`

`HouseholdLocalShare = LocalUse × HouseholdConsumption / EligibleConsumption`

`HouseholdReststrom = HouseholdConsumption − HouseholdLocalShare`

When eligible consumption is zero, allocate zero to every household and treat all generation as surplus.

No household can receive more than its own consumption.

If a building has both solar and wind production in the same hour, this challenge assigns the locally consumed amount of each source **proportionally to its share of that hour's generation**; keep each source's local use and export separately identifiable.

**Illustrative example:**

Three households use `2`, `3` and `5 kWh`, and `6 kWh` of local generation is available.

Their local shares are `1.2`, `1.8` and `3 kWh`.

Their Reststrom amounts are `0.8`, `1.2` and `2 kWh`.

### MVP 3 — Financial Settlement & Billing

Using the results of MVP 2 and the supplied rates, calculate a **24-hour electricity bill for every eligible household** and a financial overview for each stakeholder.

Reststrom procurement must use the **market price of the corresponding hour**; do not replace the hourly prices with one fixed daily average.

Each payment must be traceable to the hour, electricity volume (kWh), rate, payer and recipient.

Display totals for the 24-hour period per household and stakeholder as well.

## 4. Financial Model: Who Pays Whom?

**All rates below are fictional training assumptions.** E.ON acts as both Reststrom supplier and grid operator in the simplified challenge scenario.

| Payer → Recipient | Why? | Rate / Calculation |
|---|---|---|
| Participant → Mieterstrom Supplier | All electricity consumed | 0.25 EUR/kWh × total consumption |
| Mieterstrom Supplier → Plant Operator | Locally consumed solar and wind generation | 0.12 EUR/kWh × local allocation |
| Mieterstrom Supplier → E.ON | Supplementary grid electricity | Sum of hourly Reststrom × hourly market price, without markup |
| E.ON → Plant Operator | Exported surplus solar and wind energy | 0.07 EUR/kWh × exported energy |
| E.ON → Plant Operator | Mieterstrom subsidy | 0.025 EUR/kWh × eligible locally consumed solar energy; zero for wind |
| Mieterstrom Supplier → Metiundo | Metering services | 30/365 EUR per valid participating household meter for the 24-hour period |

There is **no Grundpreis (base fee)**.

Wholesale prices may be negative: use the signed value from the dataset rather than adding a markup or clamping it to zero.

Under these challenge rules, locally consumed wind energy also earns the 0.12 EUR/kWh operator payment, and exported wind energy earns 0.07 EUR/kWh.

## 5. Quality Checks and Expected Result

Results must be verifiable.

For **every building and hour**:

**Eligible consumption = locally consumed electricity + Reststrom**

**Local generation = locally consumed electricity + exported surplus**

The sum of household allocations must equal local use.

These checks must hold hour by hour, not only for the daily totals.

Submit **one application with three connected sections**:

1. Building energy balances
2. Household energy allocation
3. Billing and financial settlement

Read households from the dataset; a new participant list or a separate onboarding feature is **not part of this use case**.

Interactive time-series charts and live integrations with SAP, E.ON, Metiundo or a power exchange are not required.

Students must calculate the dataset's final numerical answers themselves.

This educational scenario deliberately simplifies real regulatory and tax requirements.







------------------------------------------------------------------------------------------------------------------------------------





# Use Case 2 — Stündliches Mieterstrom-Energiemanagement, Energiezuordnung und finanzielle Abrechnung  ''Deutsche Version''

**Vibe Coding Challenge | Eine Webanwendung | Drei verbundene MVPs | 24-Stunden-Datensatz**



### Einführung in das Mieterstrommodell und den europäischen Energierahmen

Im Rahmen der europäischen Energiewende fördern regulatorische Entwicklungen wie die **Erneuerbare-Energien-Richtlinie (RED III)** und die **Reform des europäischen Strommarktdesigns** den Ausbau erneuerbarer Energien, die dezentrale Stromerzeugung sowie die aktive Beteiligung von Verbraucherinnen und Verbrauchern am Energiemarkt. In Deutschland ermöglicht das **Mieterstrommodell** auf Grundlage nationaler Regelungen, insbesondere des EEG und des EnWG, die direkte Nutzung lokal erzeugten Stroms durch Haushalte.

In diesem Modell errichtet und betreibt ein **Anlagenbetreiber** Energieerzeugungsanlagen, insbesondere Photovoltaikanlagen. Teilnehmende Haushalte (**Teilnehmer**) nutzen den lokal erzeugten Strom zur Deckung ihres Energiebedarfs. Reicht die lokale Erzeugung nicht aus, wird zusätzlicher Strom (**Reststrom**) aus dem öffentlichen Netz bezogen. Überschüssige Energie kann in das Netz eingespeist werden.

Zu den wichtigsten Akteuren gehören **Anlagenbetreiber**, **Teilnehmer**, **Mieterstromlieferant**, **Netzbetreiber** und **Messstellenbetreiber**. Im vereinfachten Geschäftsszenario dieser Challenge übernimmt **E.ON** sowohl die Rolle des Reststromlieferanten als auch die des Netzbetreibers. **Metiundo** ist für den Messstellenbetrieb zuständig.

Für die erfolgreiche Umsetzung eines Mieterstrommodells sind die korrekte Registrierung von Teilnehmern und Verträgen, die zuverlässige Messung und Zuordnung von Energiemengen sowie eine transparente Abwicklung der finanziellen Zahlungsströme erforderlich. Die Challenge berücksichtigt sowohl Solar- als auch Windenergie; der gesetzliche Mieterstromzuschlag ist jedoch ausschließlich für förderfähigen Solarstrom vorgesehen.



## 1. Geschäftlicher Hintergrund und Ziel

In einer **Mieterstromgemeinschaft** decken teilnehmende Haushalte einen Teil ihres Strombedarfs durch lokal erzeugten Solar- oder Windstrom.

Die Erzeugung schwankt im Tagesverlauf, gleichzeitig verändert sich der Stromverbrauch der Haushalte.

Deshalb kann ein Gebäude mittags einen Überschuss einspeisen und abends trotzdem zusätzlichen Strom aus dem Netz benötigen.

Im Challenge-Szenario liefert **E.ON** den fehlenden Strom als **Reststrom**. Nicht lokal verbrauchte Erzeugung wird ins Netz eingespeist.

**Metiundo** übernimmt den Messstellenbetrieb.

Neben den Energiemengen muss berechnet werden, wie viel jeder Haushalt bezahlt und wie die Geldflüsse zwischen Mieterstromlieferant, Anlagenbetreiber, E.ON und Metiundo aussehen.

**Ziel der Challenge:** Entwickelt eine integrierte Webanwendung, die die bereitgestellten Daten einliest und daraus **die Energiebilanz pro Gebäude, die lokale Energiezuordnung pro Haushalt und die finanziellen Zahlungen** selbst berechnet.

Die Solaranteile der einzelnen Haushalte sind **keine vorgegebenen Eingangsdaten**, sondern Ergebnisse eurer Anwendung.

## 2. Eingabedaten und Grundregeln

Der Datensatz enthält:

- Gebäude- und Anlagenkennungen
- Anlagentypen (Solar/Wind)
- Stündliche Erzeugung (kWh)
- Stündlichen Haushaltsverbrauch (kWh)
- Stündliche Börsenstrompreise (EUR/kWh)
- Verträge und Zähler
- `Teilnahme MK7`
- Tarifregeln

**Zeitraum:** `2026-10-01T00:00:00Z` bis ausschließlich `2026-10-02T00:00:00Z`: **24 einstündige Intervalle** in UTC.

Einheiten:

- Anlagenleistung: `kW`
- Energie: `kWh`
- Strompreis: `EUR/kWh`
- Zahlungen: `EUR`

**Teilnahme:** Ein Haushalt zählt nur, wenn sein Vertrag in der betreffenden Stunde gültig ist und `Teilnahme MK7` den Wert `Ja` enthält.

Datensätze mit `nein` bleiben erhalten, werden aber bei Zuordnung und Abrechnung nicht berücksichtigt.

**Gebäude- und Zeitgrenzen:** Jedes Gebäude und jede Stunde sind getrennt zu betrachten. Strom wird nicht zwischen Gebäuden übertragen, und ein Mittagsüberschuss kann nicht gegen den Abendbedarf verrechnet werden; es gibt keinen Batteriespeicher.

**Windstrom:** Lokal erzeugter Windstrom kann wie Solarstrom zugeordnet werden. Der **Mieterstromzuschlag wird jedoch nur für förderfähigen, lokal genutzten Solarstrom** angesetzt.

## 3. Drei MVP-Aufgaben

### MVP 1 — Hourly Energy Monitoring & Balancing

Erstellt eine Übersicht **auf Gebäudeebene**.

Für jede der 24 Stunden soll eure Anwendung den Strombedarf der teilnahmeberechtigten Haushalte und die Erzeugung der zugeordneten Anlagen einlesen und vergleichen.

Solar- und Winderzeugung sollen getrennt erkennbar bleiben.

Zeigt je Gebäude und Stunde:

- Gesamtverbrauch
- Gesamterzeugung
- Lokal nutzbare Strommenge
- Fehlenden Reststrom
- Mögliche Überschusseinspeisung

Eine Tabelle und aussagekräftige Kennzahlen genügen; ein **interaktives Diagramm ist nicht notwendig**.

**Einfaches Beispiel (nicht die Lösung des Datensatzes):**

Beträgt der Verbrauch `10 kWh` und die lokale Erzeugung `6 kWh`, werden `6 kWh` lokal genutzt und `4 kWh` als Reststrom benötigt.

Bei `12 kWh` Erzeugung sind `10 kWh` lokal nutzbar und `2 kWh` Überschuss.

### MVP 2 — Proportional Energy Allocation

Übertragt die Bilanz von der **Gebäudeebene auf jeden einzelnen Haushalt**.

Die lokal verfügbare Energie einer Stunde wird **im Verhältnis zum Verbrauch der teilnahmeberechtigten Haushalte** zugeordnet – nicht zu gleichen Teilen.

Berechnet je Gebäude und Stunde:

`LocalUse = min(LocalGeneration, EligibleConsumption)`

`HouseholdLocalShare = LocalUse × HouseholdConsumption / EligibleConsumption`

`HouseholdReststrom = HouseholdConsumption − HouseholdLocalShare`

Ist der Gesamtverbrauch berechtigter Haushalte null, wird niemandem lokale Energie zugeordnet; die gesamte Erzeugung ist Überschuss.

Kein Haushalt darf mehr lokal erzeugten Strom erhalten, als er selbst verbraucht.

Falls in einem Gebäude gleichzeitig Solar- und Windstrom entstehen, wird die lokal genutzte Energiemenge für diese Challenge **entsprechend dem Erzeugungsanteil beider Quellen** aufgeteilt; lokale Nutzung und Überschuss sind je Energiequelle getrennt auszuweisen.

**Beispiel:**

Drei Haushalte verbrauchen `2`, `3` und `5 kWh`; lokal stehen `6 kWh` zur Verfügung.

Sie erhalten `1,2`, `1,8` und `3 kWh` lokalen Strom.

Ihr Reststrom beträgt `0,8`, `1,2` und `2 kWh`.

### MVP 3 — Financial Settlement & Billing

Berechnet auf Grundlage von MVP 2 und den bereitgestellten Tarifen eine **24-Stunden-Stromrechnung für jeden berechtigten Haushalt** sowie die Einnahmen und Ausgaben aller beteiligten Akteure.

Für Reststrom muss der **Börsenpreis der jeweiligen Stunde** verwendet werden, kein einheitlicher Tagesdurchschnitt.

Jeder Betrag muss auf Stunde, Energiemenge (kWh), Tarif, Zahler und Empfänger zurückgeführt werden können.

Zeigt zusätzlich die Summen für die 24 Stunden je Haushalt und Akteur.

## 4. Finanzmodell: Wer zahlt an wen?

**Alle Preise sind fiktive Übungsannahmen.** Im vereinfachten Szenario übernimmt E.ON sowohl die Rolle des Reststromlieferanten als auch die des Netzbetreibers.

| Zahler → Empfänger | Zahlungsgrund | Preis / Berechnung |
|---|---|---|
| Teilnehmer → Mieterstromlieferant | Gesamter Stromverbrauch | 0,25 EUR/kWh × Gesamtverbrauch |
| Mieterstromlieferant → Anlagenbetreiber | Lokal genutzter Solar- und Windstrom | 0,12 EUR/kWh × lokal zugeordnete Energie |
| Mieterstromlieferant → E.ON | Bezogener Reststrom | Summe aus stündlichem Reststrom × stündlichem Börsenpreis, ohne Aufschlag |
| E.ON → Anlagenbetreiber | Überschusseinspeisung aus Solar- und Windenergie | 0,07 EUR/kWh × eingespeiste Energie |
| E.ON → Anlagenbetreiber | Mieterstromzuschlag | 0,025 EUR/kWh × förderfähigen lokal genutzten Solarstrom; für Windstrom null |
| Mieterstromlieferant → Metiundo | Messstellenbetrieb | 30/365 EUR pro gültigem Haushaltszähler eines Teilnehmers für den 24-Stunden-Zeitraum |

Es gibt **keinen Grundpreis**.

Börsenstrompreise können negativ sein und müssen mit ihrem Vorzeichen aus dem Datensatz übernommen werden; weder Aufschläge noch eine Begrenzung auf null sind zulässig.

Nach den Challenge-Regeln erhält lokal genutzter Windstrom ebenfalls die Anlagenbetreibervergütung von 0,12 EUR/kWh; eingespeister Windstrom wird mit 0,07 EUR/kWh vergütet.

## 5. Ergebniskontrolle und erwartete Abgabe

Die Ergebnisse sollen überprüfbar sein.

Für **jedes Gebäude und jede Stunde** muss gelten:

**Verbrauch berechtigter Haushalte = lokal genutzter Strom + Reststrom**

**Lokale Erzeugung = lokal genutzter Strom + Netzeinspeisung**

Auch die Summe der Haushaltszuordnungen muss der lokalen Nutzung entsprechen.

Diese Beziehungen müssen stündlich stimmen, nicht nur in der Tagesbilanz.

Liefert **eine Webanwendung mit drei verbundenen Bereichen**:

1. Energiebilanz je Gebäude
2. Energiezuordnung je Haushalt
3. Stromabrechnung und Zahlungsübersicht

Die Haushalte werden aus den Daten eingelesen; neue Teilnehmerlisten oder ein gesondertes Onboarding sind **nicht Teil dieses Use Cases**.

Interaktive Zeitreihendiagramme und produktive Verbindungen mit SAP, E.ON, Metiundo oder einer Strombörse sind nicht notwendig.

Die korrekten Zahlen des Datensatzes sollen die Teams selbst ermitteln.

Dieses Schulungsszenario vereinfacht die realen gesetzlichen und steuerlichen Anforderungen bewusst.
