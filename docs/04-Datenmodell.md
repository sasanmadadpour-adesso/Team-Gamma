# 04 Datenmodell

Das zentrale Modell liegt in `db/schema.cds` unter `namespace neo.energy`.

Kernbeziehungen:

- `Suppliers` → `BalancingGroups` und `Communities`
- `Communities` → `Plants`, `Participants`, `PlantAssignments`, `CommunityIntervals`
- `Plants` → `PlantCheckpoints`, `MeterReadings`, `ForecastValues`
- `Participants` → `ParticipationCheckpoints`, `MeterReadings`, `ParticipantAllocations`
- `PlantAssignments` speichert `validFrom`, VZP und S4-Status.

Draft ist nur für editierbare Root-Dokumente aktiviert. Daten werden über Service-Projektionen exponiert; Datenbanktabellen werden nicht direkt als API veröffentlicht.
