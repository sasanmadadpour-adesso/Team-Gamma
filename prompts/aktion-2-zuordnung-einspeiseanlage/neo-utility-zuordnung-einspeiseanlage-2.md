# Neo Utility – Zuordnung der Einspeiseanlage zur Gemeinschaft (Aktion 2)

## 1. Auftrag und Abgrenzung

Dieser Teil ergänzt das Teilnehmer-Onboarding um die Gegenseite: Der Dienstleister ordnet eine bereits angemeldete Einspeiseanlage (z. B. Solar- oder Windanlage) einer Energy-Sharing-Gemeinschaft zu. Erstelle ausschließlich diese vollständig durchklickbare und funktionale Zuordnungsstrecke innerhalb derselben App. Anlagenanmeldung, Erstellen und Aktivieren von Gemeinschaften, Verbraucher-Onboarding und Dashboard gehören nicht dazu.

Gestaltung, Navigation, Bedienung und allgemeine Validierungsregeln (Fehlerdarstellung, Prüfzeitpunkte, Info-Icons, Platzhalter, Erhalt von Eingaben) gelten wie im Teilnehmer-Onboarding und werden nicht neu definiert. Der Einstieg wird an passender Stelle der bestehenden Navigation ergänzt.

Externe Systeme werden ausschließlich über In-Memory-Mock-Schnittstellen simuliert; echte Verbindungen werden nicht hergestellt. Der gesamte Vorgang ist eine sichtbar gekennzeichnete Simulation. Eine bestandene Mock-Prüfung bestätigt keine reale Zuordnung im Netz. Liegen Gemeinschaften oder angemeldete Anlagen noch nicht vor, werden die gemeinsamen CAP/SQLite CSV-Seed-Daten (`db/data/neo.energy-Community.csv`, `db/data/neo.energy-Plant.csv`) geladen.

---

## 2. Fachlicher Kontext & Sonderspezifikation

Beim Energy Sharing (§ 42c EnWG) teilt ein Anlagenbetreiber den Strom seiner Erneuerbare-Energien-Anlage mit Teilnehmern im selben Bilanzierungsgebiet. Ein Dienstleister (Lieferant) verwaltet die Gemeinschaft, ordnet ihr eine Anlage zu und informiert anschließend den Anlagenbetreiber.

### Striktes 1:1-Anlagen-Regelwerk (Strict 1:1 Plant Rule)
- **Regel:** Eine Energy-Sharing-Gemeinschaft darf **strikt nur genau 1 Einspeiseanlage** zugewiesen bekommen. Mehrere Verbraucher (Teilnehmer/Consumer) sind in der Gemeinschaft erlaubt, aber sobald 1 Anlage erfolgreich zugewiesen wurde, ist die Gemeinschaft für weitere Anlagenzuordnungen gesperrt.
- **Anlagen-Statusübergang:** Nach erfolgreicher Zuordnung wechselt der Status der Anlage von `BEREIT_ZUR_ZUORDNUNG` auf **`ASSIGNED`**. Dadurch verschwindet die Anlage automatisch aus allen Auswahllisten (Dropdowns) im UI.
- **Gemeinschafts-Statusübergang:** Der Status der Gemeinschaft wechselt von `DRAFT` auf **`READY_FOR_ACTIVATION`**. Erst damit kann sie im System aktiviert werden.

---

## 3. Mock-Schnittstellen & Parameter

- **S1 – Stammdaten lesen (`getPlantMasterData`):** liefert zur MaLo-ID der Anlage das Bilanzierungsgebiet, die Bilanzkreis-ID (`bkId`) und den iMSys-Status (`imsysActive`). Fehlen diese Werte in den gemeinsamen Daten, erzeugt der Mock sie deterministisch (z. B. `bkId = "BK-" + bilanzierungsgebiet`).
- **S4 – Formeln anlegen:** nimmt das Ereignis `S4_FormelnAnpassen` entgegen (Einspeise-MaLo ab `validFrom` in die Berechnungsformeln der Gemeinschaft aufnehmen) und bestätigt es sofort mit `ACKNOWLEDGED`.

### Begriffsdefinitionen & Info-Icons

| Begriff | Bedeutung |
|---|---|
| **MaLo-ID (Anlage)** | Kennung der Einspeisestelle der Anlage (Format: „DE“ gefolgt von Ziffern, z. B. `DE0073325707820000000000000088943`). |
| **Bilanzierungsgebiet** | Netzzone, in der Energiemengen bilanziert werden. Anlage und Gemeinschaft müssen im selben Bilanzierungsgebiet liegen. |
| **Bilanzkreis (BK-ID)** | Abrechnungseinheit für Energiemengen. Anlage und Gemeinschaft müssen dieselbe `bkId` haben. |
| **VZP** | Virtueller Zählerpunkt (`VZP-XXXX`); rechnerische Beziehung zwischen Anlage und Gemeinschaft, gültig ab `validFrom`. |
| **EDM-Formelanpassung** | Aufnahme der Anlage in die Berechnungsformeln der Gemeinschaft im Energiedatenmanagement (S4-Event). |

---

## 4. Übergabepunkte zu anderen Projektteilen

Die Zuordnung nutzt die gemeinsamen In-Memory/CSV-Daten und legt keine Parallelbestände an. Statuswerte und Feldnamen werden exakt übernommen.

| Richtung | Projektteil | Inhalt |
|---|---|---|
| **Eingang** | Gemeinschaftsverwaltung | Gemeinschaften mit Status `DRAFT`: Name, Betreiber, Standort, Bilanzierungsgebiet, `bkId`. |
| **Eingang** | Erzeuger-Onboarding | Anlagen mit Status `BEREIT_ZUR_ZUORDNUNG`: MaLo-ID, Betreiber, Erzeugungsart, Leistung (kW), Standort, gewünschter Lieferbeginn. |
| **Ausgang** | Gemeinschaftsverwaltung | Status der Gemeinschaft wechselt auf `READY_FOR_ACTIVATION`. |
| **Ausgang** | Erzeuger-Onboarding | Status der zugewiesenen Anlage wechselt auf **`ASSIGNED`** (aus UI-Drop-down entfernt). |
| **Ausgang** | Teilnehmer-Onboarding | Gemeinschaften mit zugewiesener Anlage und VZP sind in Schritt 3 („Gemeinschaft auswählen“) wählbar. |
| **Ausgang** | Erzeugeransicht | Benachrichtigung: „Anlage ist Teil der Community“ mit VZP-ID. |

---

## 5. Bedienung & Interface-Anforderungen

- **Desktop:** Einklappbares Vier-Spalten-Panel (Benutzeroberfläche Dienstleister, Benutzeroberfläche Anlagenbetreiber, Service-Schicht, Simulation), das zeigt, welcher Bereich gerade aktiv ist.
- Lange Kennungen (MaLo-ID, VZP-ID) werden vollständig lesbar dargestellt (Umbruch oder Kopieren-Schaltfläche).
- Einheiten und Formate sind sichtbar: Datum TT.MM.JJJJ, Leistung in kW.

---

## 6. Regelwerk & Validierung

**Formale Prüfung:** Auswahlfelder sind Pflicht. `validFrom` muss ein gültiges Datum sein (TT.MM.JJJJ oder ISO). Rückwirkende Daten sind erlaubt (mit Hinweis), da der gewünschte Lieferbeginn einer Anlage bereits in der Vergangenheit liegen kann. `validFrom` wird, sofern vorhanden, mit dem gewünschten Lieferbeginn der Anlage vorbelegt.

**Fachliche Vorbedingungen:**
1. Die Gemeinschaft existiert und hat exakt den Status `DRAFT`.
2. Die Gemeinschaft hat **noch keine** zugewiesene Anlage (1:1 Rule).
3. Die Anlage existiert und hat exakt den Status `BEREIT_ZUR_ZUORDNUNG`.
4. **Grid-Zone Match:** Anlage und Gemeinschaft liegen im selben Bilanzierungsgebiet.
5. **Bilanzkreis Match:** Anlage und Gemeinschaft haben dieselbe Bilanzkreis-ID (`bkId`).
6. **iMSys Check:** Die Anlage hat ein aktives iMSys (`imsysActive === true`).

**Fehlerfall (Gebiets-, Bilanzkreis- oder iMSys-Abweichung):**
- **Keine Datenänderung (`databaseMutated: false`):** Es werden keine Datensätze angelegt/geändert und keine Events erzeugt.
- Die Gemeinschaft bleibt auf `DRAFT`, die Anlage auf `BEREIT_ZUR_ZUORDNUNG`.
- Fachliche Warnungen an den Dienstleister:
  - `Hinweis an DL: Bilanzierungsgebiet mismatch`
  - `Hinweis an DL: Bilanzkreis mismatch`
  - `Hinweis an DL: aktives iMSys erforderlich`
- Dezente, rot hervorgehobene Warnkarte „Zuordnung blockiert“ mit Badge `MISMATCH`, Soll/Ist-Details und Hinweis „Datenbankveränderung: Keine“.

**Erfolgsfall (Atomare Transaktion):**
1. `CommunityPlantAssignment` wird angelegt (`validFrom`).
2. `VirtualMeteringPointRelationship` (VZP) wird mit deterministischer ID (z. B. `VZP-XXXX`, per Hash aus Gemeinschaft & Anlage) angelegt.
3. Die Gemeinschaft wechselt auf **`READY_FOR_ACTIVATION`**.
4. Die Anlage wechselt auf **`ASSIGNED`** (wird aus der Auswahlliste entfernt).
5. Event `S4_FormelnAnpassen` wird ausgelöst (`ACKNOWLEDGED`).
6. Erzeugeransicht erhält Benachrichtigung: „Anlage ist Teil der Community“.

**Idempotenz:**
Wird für dieselbe Kombination aus Gemeinschaft und Anlage erneut eine Zuordnung angefragt, wird das gespeicherte Ergebnis unverändert zurückgegeben (`databaseMutated: false`), ohne doppelte Einträge zu erzeugen. Eine bereits zugewiesene Anlage erscheint nicht mehr in der Auswahlliste.

---

## 7. Schritte der Zuordnungsstrecke (Z1 bis Z4)

Die Schritte heißen Z1 bis Z4, um sie von den Schritten des Teilnehmer-Onboardings zu unterscheiden. Die Strecke hat eine eigene Fortschrittsanzeige.

### Z1 – Auswahl und Parametererfassung
- Dynamisches Laden der Ziel-Gemeinschaft (nur Status `DRAFT`) und der Einspeiseanlage (nur Status `BEREIT_ZUR_ZUORDNUNG`) über `/api/v1/assignable-data`.
- Erfassung von `validFrom`. Schreibgeschützte Vorschau von Bilanzierungsgebiet und Bilanzkreis beider Seiten.
- Gibt es keine auswählbaren Gemeinschaften oder Anlagen, erscheint eine verständliche Meldung mit Hinweis auf den zuständigen Projektbereich.
- Hauptaktionen:
  - **„Anlage der Community zuordnen“** (startet reguläre Prüfung und Zuordnung).
  - **„Test Grid-Zone Mismatch“** (Simulationsschalter für Fehlerfall bei ungleichen Bilanzierungsgebieten).

### Z2 – Stammdatenabgleich und Systemvalidierung
- Automatische Prüfungen vor Schreibzugriff: Statusprüfungen, S1-Aufruf, Bilanzierungsgebiet, Bilanzkreis, iMSys.
- Animierte Prüfindikatoren: *Ausstehend → In Prüfung → Erfolgreich / Blockiert*. Nach der ersten Blockade stoppen die folgenden Prüfungen sichtbar.

### Z3 – Ausführung und Ergebnis
- **Erfolg:** Zuordnung speichern, VZP anlegen, Status anpassen, S4-Event auslösen. Erfolgs-Karte mit VZP-ID, `validFrom`, neuem Status und `ACKNOWLEDGED`.
- **Mismatch:** Abbruch aller Schreiboperationen. Rote Warnkarte nennt Ursache und bestätigt `databaseMutated: false`. Rückkehr zu Z1 zur Korrektur ist möglich.

### Z4 – Benachrichtigung der Erzeugeransicht
- Ansicht mit Bestätigung: „Die Einspeiseanlage wurde erfolgreich der Community zugeordnet.“
- Anzeige von MaLo-ID, Gemeinschaftsname, Startdatum `validFrom`, VZP-ID und S4-Status. Umschalter „Als Anlagenbetreiber ansehen“ für die Demo.

---

## 8. Nachgelagerte Ergebnisse

Diese Ergebnisse im gemeinsamen Prozess berücksichtigen; die zuständigen Projektteile übernehmen ihre Umsetzung:
- **Aktivierung der Gemeinschaft:** Die Gemeinschaft hat den Status `READY_FOR_ACTIVATION` und kann aktiviert werden.
- **Teilnehmer-Onboarding:** Verbraucher können in Schritt 3 nur Gemeinschaften mit zugeordneter Anlage und VZP wählen.
- **EDM-Formelintegration:** Die Einspeisemengen der Anlage werden ab `validFrom` in die 15-Minuten-Berechnungsformeln der Gemeinschaft einbezogen. Eine tatsächliche Stromzuordnung entsteht erst nach Abschluss der erforderlichen Marktprozesse.

---

## 9. Technischer Anhang & REST Endpoints

### REST Endpoints
1. **Zuordenbare Daten abrufen (GET):**
   `GET /api/v1/assignable-data`
   - Liefert Gemeinschaften mit Status `DRAFT` und Anlagen mit Status `BEREIT_ZUR_ZUORDNUNG`.

2. **Zuordnung ausführen (POST):**
   `POST /api/v1/communities/assign-plant`
   ```json
   {
     "communityId": "COM-B-FRA-01",
     "plantMaLo": "DE0073325707820000000000000088943",
     "validFrom": "2026-10-01"
   }
   ```
