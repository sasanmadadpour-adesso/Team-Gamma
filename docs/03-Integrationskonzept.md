# 03 Integrationskonzept

Der lokale MVP nutzt deterministische In-Memory-/SQLite-kompatible Grenzen. Die App behauptet keine reale Marktkommunikation.

| Schnittstelle | Zielbild | Lokaler Stand |
|---|---|---|
| S1 | Stammdaten | CDS-Stammdaten und Integrations-Service |
| S2 | Auftrag/Marktprozess | CDS-Action und Mock-Grenze vorgesehen |
| S3 | Ergebnis mit Grund | Status- und Prüfpunkte-Modell |
| S4 | Formeländerung | VZP-/Assignment-Ergebnis `ACKNOWLEDGED` |
| S5 | Messung/Allokation | `MeterReadings`, `CommunityIntervals` |
| S6 | Bilanzkreis | `BalancingGroups`, `bkId` und Zuordnungsprüfung |

Produktiv werden Destination Service, Connectivity und technische Credentials über BTP-Bindings eingebunden. Keine URLs oder Secrets werden im Quellcode gespeichert.
