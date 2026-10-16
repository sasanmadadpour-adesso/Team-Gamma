# 01 Anforderungsanalyse

## Quellen

- `prompts/loesungsbeschreibung-community-verwaltung.md`: verbindliche Konsolidierung, A001–A075, N001–N025, O001–O044.
- `prompts/aktion-4-einspeiseanlage-anmelden.md`: Erzeuger-Onboarding und Aktion 4.
- `prompts/neo-utility-zuordnung-einspeiseanlage-2.md`: Aktion 2 mit atomarer Zuordnung und strikter 1:1-Regel der Teilstrecke.
- `prompts/Neo-Utility-Verbraucher-Onboarding.md`: deutschsprachiges, mehrphasiges Teilnehmer-Onboarding.
- `prompts/prompt3.md`: ältere technische Prozessbeschreibung für Verbraucheranmeldung; widersprechende Regeln wurden zugunsten der aktuellen Konsolidierung verworfen.
- `docs/sources/5Energy Sharing im Stadtteil.pdf`: fachliches Rollen- und Schnittstellenmodell.
- `docs/sources/Dataset_English.xlsx` / `docs/sources/Datensatz_Deutsch.xlsx`: gleiche Datenstruktur, englische Feldnamen technisch maßgeblich.

## Anforderungsmatrix

| Bereich | IDs | Umsetzung | Status |
|---|---|---|---|
| Gemeinsames CAP-/Fiori-Produkt | A001–A006, A056–A070 | CAP-Servicezuschnitt, OData V4, drei generierte Fiori-Apps | IN_PROGRESS |
| Communities und Konditionen | A007–A017, A031–A032, A054–A059, A068–A069 | `Communities`, Draft, Actions, UI-Anmerkungen | IN_PROGRESS |
| Erzeuger und Anlagen | A018–A025, A055, A066, A071–A073 | `Plants`, Prüfpunkte, Producer-Service, Seed-Daten | IN_PROGRESS |
| Aktion 2 | A024–A025, Spezialprompt Z1–Z4 | `assignPlant`, Validierung, VZP, Statusübergang, Idempotenz | DONE für Backend-MVP |
| Teilnehmer und Teilnahme | A026–A030, A066, A068 | `Participants`, Prüfpunkte, Application-Draft und OTP-/Submit-Actions | IN_PROGRESS |
| Messwerte und Prognosen | A033–A040 | `MeterReadings`, `ForecastValues`, Integration-Service | IN_PROGRESS |
| Allokation und Zahlungspositionen | A041–A053, A074–A075 | Analytics-Modell und reine Allokationsfunktion; Persistenz/Referenzdaten folgen | IN_PROGRESS |
| Fiori-Oberflächen | A056–A070, Spezialprompt UX | Generator-Apps, Annotationen, FPM-Onboarding-Grundgerüst | IN_PROGRESS |
| BTP/Deployment | N009, N011–N016, N019 | MTA, HANA, XSUAA; echte externe Systeme bewusst Mock | IN_PROGRESS |
| Nicht-Ziele | N001–N025 | dokumentiert; keine Fake-Produktivprozesse | DONE |

## Wichtige Arbeitsannahmen

Die Community-Spezifikation entscheidet bei widersprüchlichen 20-%-/verbrauchsanteiligen Regeln, Anlagenanzahl, Preisen, MaLo-Validierung und externer Systemabgrenzung. Die fehlerhaften MaLo-/MeLo-Werte des Demosatzes werden nicht erfunden korrigiert.
