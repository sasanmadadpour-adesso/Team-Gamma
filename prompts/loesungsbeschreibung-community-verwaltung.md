# Lösungsbeschreibung: Verwaltung von Energy-Sharing-Communities

Stand: 16. Oktober 2026

Diese Beschreibung legt Ziele, Nicht-Ziele und Anforderungen der Community-Verwaltung fest. Sie ist die fachliche Vorgabe für die Umsetzung mit SAP Cloud Application Programming Model (CAP) und SAP Fiori Elements. Sie enthält kein CDS-Datenmodell und keinen Anwendungscode.

Quellen sind das Konzept [5Energy Sharing im Stadtteil.pdf](../docs/sources/5Energy%20Sharing%20im%20Stadtteil.pdf) vom 15.10.2026, im Folgenden **Konzept**, die Datensätze [Dataset_English.xlsx](../docs/sources/Dataset_English.xlsx) und [Datensatz_Deutsch.xlsx](../docs/sources/Datensatz_Deutsch.xlsx), im Folgenden **Datensatz**, und die Entscheidungen des Teams, im Folgenden **Entscheidung des Teams**. Das Konzept beschreibt Rollen, Prozess und Schnittstellen. Der Datensatz liefert Stammdaten, Messwerte, Preise und Rechenregeln für die Demo. Entscheidungen des Teams gehen Konzept und Datensatz vor. Wo sich die Quellen sonst widersprechen, gilt bis zur Klärung eine Arbeitsannahme; der Widerspruch steht unter [Offene Punkte und Lücken](#offene-punkte-und-lücken).

Konventionen:

- Anforderungen sind fortlaufend **A001** bis höchstens **A999** nummeriert, Nicht-Ziele **N001** bis **N999**, offene Punkte **O001** bis **O999**. Ziele haben kein Nummernschema. Die Nummer eines beantworteten Punkts bleibt unvergeben.
- Annahmen sind als **Annahme** gekennzeichnet und verweisen auf einen offenen Punkt.
- Herkunftsvermerke: **Entscheidung des Teams** für Festlegungen, die das Team getroffen hat, **Konzept** mit Seite oder Schritt, **Datensatz** mit Blatt oder Regel, **Wettbewerb** für Übernahmen aus dem Wettbewerbsvergleich, **Fiori Elements** für Festlegungen, die nur die Oberfläche betreffen. Anforderungen ohne Vermerk sind Vorgaben des Teams aus der ersten Fassung.
- Blätter und Regeln heißen wie in der deutschen Fassung des Datensatzes, Spalten und Codes wie in der englischen.

## Einordnung

Das Konzept beschreibt Energy Sharing nach § 42c EnWG im Dienstleistungsmodell der Bundesnetzagentur (Mitteilung Nr. 73). Ein Anlagenbetreiber speist Strom aus einer Erneuerbare-Energien-Anlage ins öffentliche Verteilnetz ein. Teilnehmer im selben Bilanzierungsgebiet schließen mit ihm einen Vertrag zur gemeinsamen Nutzung über Umfang, Aufteilungsschlüssel und Entgelt. Ein Lieferant als Dienstleister ordnet die Mengen je Viertelstunde in seinem Bilanzkreis zu und liefert den Reststrom. Verteilnetzbetreiber (VNB) und Messstellenbetreiber (MSB) liefern Viertelstundenwerte und rechnen die Netznutzung wie bisher ab. Herkunft: Konzept, Seite 1.

Diese App ist die **Community-Verwaltung**. Sie übernimmt die Verwaltungsschritte, die das Konzept einer „DL-App“ zuordnet. Anders als im Konzept ist sie für die Verwalter einer Community gebaut, und das ist in erster Linie der Einspeiser (Entscheidung des Teams). Schritte, die nur der Lieferant ausführen kann, erscheinen für den Einspeiser als Prüfpunkte.

| Baustein | Aufgabe laut Konzept | Bezug zu dieser App |
| --- | --- | --- |
| DL-App | Dienstleister: Community bilden, Anlagen übernehmen und zuordnen, Community aktivieren, Lieferanmeldungen auslösen, Antworten verarbeiten | Diese App, Hauptnutzer Einspeiser |
| Community-App Einspeisung | Anlagenbetreiber: Anlage anmelden, Informationen empfangen | Andere App, N001 |
| Community-App Bezug | Teilnehmer: zur Community anmelden, Bestätigung oder Ablehnung empfangen | Andere App, N002 |
| BTP-Microservices mit BTP-DB | Community, Teilnahme, virtuelle Zählpunkt-Beziehungen; keine SAP-Stammdaten | Gemeinsames Backend der drei Apps |
| S/4HANA Utilities (im Konzept US4G) | Stammdaten, Marktkommunikation, EDM mit Formeln, Messwerten, Anteil und Reststrom | Nachbarsystem über S1 bis S5 |
| Lumenaza | Bilanzkreis, Formeln, Prognose, Fahrplan, Trading, MaBiS, Abrechnung | Nachbarsystem, Quelle der Belege |
| VNB, MSB, ÜNB als Bilanzkoordinator | Anmeldung und Zuordnung prüfen, Messwerte liefern, bilanzieren | Nur über S/4HANA und Lumenaza |
| Bilanzkreisverantwortlicher (BKV) | Bilanzkreis eines Dritten bereitstellen | Nur als Bilanzkreis-Option |

Herkunft: Konzept, Seite 2.

Messwerte und Einspeiseprognosen schreiben externe Systeme über eine API in die Datenbank; die App liest sie (Entscheidung des Teams). Im Zielbild erzeugt Lumenaza aus den Zählpunkt-Beziehungen und dem Schlüssel Formeln. S/4HANA EDM berechnet damit Anteil und Reststrom je Viertelstunde und stellt sie über S5 bereit. Die Abrechnung läuft in Lumenaza. Im Hackathon stehen S/4HANA und Lumenaza nicht zur Verfügung (Annahme, O007). Die App berechnet Anteile und Zahlungspositionen dann selbst, nach A041 bis A052 und A071 bis A075.

### Rollen

| Rolle | Konzept | Datensatz | In dieser App |
| --- | --- | --- | --- |
| Einspeiser (Anlagenbetreiber) | Betreibt die Anlage, schließt Nutzungsverträge, nutzt die Community-App Einspeisung | Blatt Erzeuger Registrierung; „Plant Operator“ | Hauptnutzer, verwaltet seine Communities (Entscheidung des Teams) |
| Lieferant (Dienstleister) | Bildet Communities in der DL-App, ordnet im Bilanzkreis zu, liefert Reststrom | Annahme: `mk7_operator`; in den Zahlungsregeln „Mieterstrom Supplier“ (O002) | Nutzer für die Lieferantenschritte und seine Prüfpunkte (Annahme, O038) |
| Teilnehmer (Verbraucher) | Haushalte, KMU und Gemeinden im selben Gebiet; nutzen die Community-App Bezug | Blatt MK7 Teilnehmer, Rolle `Household Consumption`; „Eligible Participant“ | Objekt |
| VNB | Prüft Lieferanmeldung und Zuordnung, rechnet Netznutzung ab | DSK GmbH, zugleich Reststromlieferant | kein Nutzer |
| MSB | Liefert Viertelstundenwerte | Tawanir | kein Nutzer |
| BKV | Stellt den Bilanzkreis eines Dritten | nicht enthalten | kein Nutzer |

### Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Community | Einspeiseanlagen und Teilnehmer in einem Bilanzierungsgebiet. Im Datensatz bildet jede `building_id` eine Community (Annahme, O019). |
| Prüfpunkt | Einzelne Voraussetzung, die positiv bestätigt sein muss, bevor eine Anlage oder Teilnahme aktiv wird (A020, A027). |
| Intervall | Messintervall mit Beginn und Ende. Konzept: 15 Minuten. Datensatz: 60 Minuten. |
| Gemeinschaftsmenge | Im Intervall lokal zugeteilte Energie, das Minimum aus Erzeugung und berechtigtem Verbrauch. |
| Überschuss | Erzeugung, die Teilnehmer im Intervall nicht verbrauchen. Im Datensatz „export“. |
| Reststrom | Verbrauch, den die Erzeugung im Intervall nicht deckt. In der ersten Fassung „Unterdeckung“. |
| Festpreis | Preis je kWh, zu dem der Einspeiser die Gemeinschaftsmenge verkauft. |
| Dienstleistungsaufschlag | 15 % auf den Festpreis; er geht an den Lieferanten für seine Dienste. |
| MaLo, MeLo | Marktlokation mit 11-stelliger ID, Messlokation mit 33-stelliger ID. Jede Anlage und jeder Teilnehmer hat eine eigene. |
| iMSys | Intelligentes Messsystem. Jede Anlage und jeder Teilnehmer hat einen eigenen iMSys-Zähler. |
| Bilanzkreis (BK) | Energiemengenkonto eines BKV beim Übertragungsnetzbetreiber (ÜNB). Jede MaLo hängt an genau einem BK. |
| Virtuelle ZP-Beziehung | Auf der BTP-DB gespeicherte Beziehung zwischen den Zählpunkten von Anlage und Teilnehmer mit „gültig ab“ und „gültig bis“. Grundlage der Formeln. |
| UTILMD, MSCONS | EDIFACT-Nachrichten für Anmeldungen und Stammdaten bzw. für Messwerte. |
| GPKE, MaBiS | Festlegungen der Bundesnetzagentur zur Kundenbelieferung bzw. zur Bilanzkreisabrechnung. |

## Ziele

- Der Einspeiser bildet seine Communities, legt Konditionen und Preis fest, ordnet seine Anlagen zu und aktiviert die Community in einer App.
- Der Einspeiser sieht, ob seine Anlage aktiv ist, und andernfalls, welcher Prüfpunkt offen oder negativ ist.
- Anmeldungen von Teilnehmern laufen bis zur Bestätigung oder Ablehnung durch diese App; der Stand jeder Teilnahme ist sichtbar.
- Teilnahmecodes geschlossener Communities lassen sich anzeigen oder per E-Mail verschicken.
- Erzeugung, Prognose, Verbrauch, Gemeinschaftsmenge, Überschuss und Reststrom sind je Intervall verfügbar und für wählbare Zeiträume vergleichbar.
- Der Einspeiser sieht seine Erlöse; Zahlungspositionen sind je Community und Zeitraum nachvollziehbar, ohne dass die App Rechnungen erzeugt.
- Die Demo läuft ohne S/4HANA und Lumenaza und reproduziert die [Referenzwerte für die Abnahme](#referenzwerte-für-die-abnahme).

## Nicht-Ziele

| ID | Nicht-Ziel |
| --- | --- |
| N001 | Registrierung von Anlagenbetreibern und Anmeldung von Einspeiseanlagen (Schritte A und 4.1). Das bleibt die Community-App Einspeisung. Herkunft: Konzept. |
| N002 | Anmeldung von Teilnehmern (Schritte 4 und 3.1). Das bleibt die Community-App Bezug. Herkunft: Konzept. |
| N003 | Benachrichtigungen zu Prozessschritten (Schritte 2.4, 3.4, 4.4 und 7). Diese App setzt den Status; die Anzeige beim Empfänger übernimmt dessen App. Einladungen per E-Mail gehören zur App (A017). Herkunft: Konzept. |
| N004 | Versand und Empfang von UTILMD und MSCONS, GPKE-Fristen und die Berechnung in EDM. Die App löst Prozesse über S2 aus und liest Ergebnisse über S3 und S5. Herkunft: Konzept. |
| N005 | Entgegennahme von Mess- und Prognosewerten. Externe Systeme schreiben sie über eine API in die Datenbank. Herkunft: Entscheidung des Teams. |
| N006 | Berechnung von Prognosen, Fahrplan, Trading und Börsenorders. Einspeiseprognosen kommen von extern, Fahrplan und Trading leistet Lumenaza (Schritt P). Herkunft: Konzept; Entscheidung des Teams. |
| N007 | Durchführung der Bonitätsprüfung, Pflege der Blacklist und Abfrage des Marktstammdatenregisters. Die App zeigt die Ergebnisse als Prüfpunkte. |
| N008 | Börsenpreis als Verkaufspreis der Gemeinschaftsmenge. Das Preismodell ist vorgesehen, im Release gilt nur der Festpreis. Herkunft: Entscheidung des Teams. |
| N009 | Technisches Berechtigungsmodell mit Rollen und Attributen. Die fachliche Sichtbarkeit regelt A004. |
| N010 | Mehrere Anlagenbetreiber in einer Community. Mehrere Anlagen desselben Anlagenbetreibers sind zulässig (A012). |
| N011 | Öffentliche Einsehbarkeit geschlossener Communities. |
| N012 | Energy Sharing auf Basis von Standardlastprofilen ohne iMSys. Herkunft: Konzept; Wettbewerb, ausdrücklich nicht übernommen. |
| N013 | Netznutzungsabrechnung, Bilanzierung und MaBiS-Clearing (Schritt M). Herkunft: Konzept; Wettbewerb, ausdrücklich nicht übernommen. |
| N014 | Rechnungslauf, Buchung in FI-CA und ERP-Integration. Die Abrechnung bleibt in Lumenaza (Schritt 11). Herkunft: Konzept; Wettbewerb, ausdrücklich nicht übernommen. |
| N015 | Anbindung von Home-Energy-Management, E-Mobilität und Flexibilität. Herkunft: Wettbewerb, ausdrücklich nicht übernommen. |
| N016 | Virtuelles Kraftwerk. Herkunft: Wettbewerb, ausdrücklich nicht übernommen. |
| N017 | Statische Aufteilungsschlüssel mit festen Quoten. Die Aufteilung ist verbrauchsanteilig je Intervall (A043). |
| N018 | Mieterstrom und gemeinschaftliche Gebäudeversorgung als Produkt dieser App. Die Position Mieterstromzuschlag des Datensatzes wird nur simuliert (A050, O019). |
| N019 | Anlegen eines Bilanzkreises und Einholen der Zuordnungsermächtigung beim BKV (Schritte B, B1 und B2). Die App zeigt Bilanzkreis-Option und BK-ID. Herkunft: Konzept. |
| N020 | Teilnahme aus angrenzenden Bilanzierungsgebieten derselben Regelzone, zulässig ab 1.6.2028. Herkunft: Konzept. |
| N021 | Freestyle-UI5-Dashboard. Herkunft: Fiori Elements. |
| N022 | Eigener Button, der den Chart tagweise zurückschaltet. Herkunft: Fiori Elements. |
| N023 | Zweite Werteachse im Zeitreihendiagramm, insbesondere für Euro oder Börsenpreise. Herkunft: Fiori Elements. |
| N024 | Criticality-Einfärbung der Kurve. Herkunft: Fiori Elements. |
| N025 | Aggregation der Intervallwerte im Browser. |

## Datengrundlage

| Blatt (deutsch / englisch) | Inhalt | Zeilen | Verwendung |
| --- | --- | ---: | --- |
| Erzeuger Registrierung / Producer Onboarding | Anlagenbetreiber und Anlage: Name, Anschrift, Erzeugungsart, Leistung in kW, Koordinaten, Marktlokation, Vertrag, `building_id` | 3 | Angemeldete Einspeiseanlagen |
| MK7 Teilnehmer / MK7 Participants | Stammliste je Gebäude: Rolle, Teilnahme MK7, MeLo, MaLo für Bezug und Einspeisung, MSB, Messsystem, Vertrag; 17 von 32 Spalten leer (O033) | 17 | Einzige Stammliste für Anlagen und Teilnehmer |
| Stündlicher Verbrauch / Hourly Consumption | Verbrauch in kWh je Haushalt und Stunde | 264 | Verbrauchsintervalle |
| Stündliche Erzeugung / Hourly Generation | Erzeugung in kWh je Anlage und Stunde | 72 | Erzeugungsintervalle |
| Strompreise / Energy Pricing | Börsenpreis je Stunde, feste Sätze, Marktpartner | 24 | Preise je Intervall |
| Feldbeschreibungen / Field Descriptions | Pflichtigkeit und Bedeutung der Felder | 39 | Referenz |
| Zahlungsregeln / Financial Rules | Szenario- und Zahlungsregeln | 19 | Rechenregeln, soweit keine Entscheidung vorgeht |

Inhalt:

- Zeitraum ist der 1.10.2026 von 00:00 bis 24:00 Uhr UTC mit 24 Stundenintervallen. Alle Verträge laufen 24 Stunden.
- Drei Gebäude mit je einer Anlage: B-FRA-01 in Frankfurt am Main mit Solar 6 kW, B-CGN-01 in Köln mit Wind 7 kW, B-MUL-01 in Mülheim an der Ruhr mit Solar 5,5 kW. Jan Koller betreibt B-FRA-01 und B-MUL-01, Roman Weidenfeller B-CGN-01. Anschriften und Postleitzahlen sind uneinheitlich (O034).
- Je Gebäude gibt es eine Marktlokation mit Rolle `Residual Supply Market Location` ohne Messwerte (O032).
- Elf Haushalte, davon zehn mit Teilnahme MK7 = `Ja`. Der Haushalt mit `nein` liegt in B-MUL-01 und hat Verbrauchswerte.
- Alle Marktlokationen haben das Messsystem `iMS/TF` und den MSB Tawanir. Netzbetreiber und Reststromlieferant ist die DSK GmbH.
- Feste Sätze: Verkaufspreis 0,25 €/kWh, Anlagenankaufspreis 0,12 €/kWh, Einspeisevergütung 0,07 €/kWh, Mieterstromzuschlag 0,025 €/kWh, Messentgelt rund 0,0822 € je Zähler und 24 Stunden (30 € pro Jahr geteilt durch 365). Der Börsenpreis liegt je Stunde zwischen −0,028 und 0,245 €/kWh und ist in drei Stunden negativ. Annahme für den Release: Der Anlagenankaufspreis dient als Festpreis, der Verkaufspreis als Reststrompreis (O042).
- Es fehlen: Prognosewerte, Ausrichtung der PV-Anlagen (O043), Ergebnisse der Prüfpunkte wie Marktstammdatenregister, Bonität, Blacklist und Zustimmung des Vorlieferanten (O039).
- Alle Werte sind laut Datensatz synthetische Übungsdaten.

Verknüpfungen:

- `building_id` verbindet alle Blätter.
- Verbrauchswerte hängen über `metering_location_id_MeLo` an MK7 Teilnehmer. MK7 Teilnehmer ist die einzige Stammliste (Regel „Quelle der Teilnehmerliste“).
- Erzeugungswerte hängen über die Anlagen-ID: `market_location_id_MaLo` in Stündliche Erzeugung = `market_location_identifier` in Erzeuger Registrierung = `metering_location_id_MeLo` der Anlagenzeile in MK7 Teilnehmer. Die Werte haben das Format einer Messlokations-ID (O030).
- Preise hängen über `start_time` am Intervall.

Die englische und die deutsche Fassung sind inhaltlich gleich; geprüft per Zellvergleich. Die deutsche Fassung übersetzt Blattnamen, Spaltennamen außer im Blatt Erzeuger Registrierung, Aufzählungswerte wie `hour` zu „Stunde“ und Texte (O035).

## Prozess

Das Konzept gliedert den Prozess in vier Aktionen und den laufenden Betrieb. Die Reihenfolge ist: 1.1 und 1.2, dann Aktion 4 und Aktion 2, dann 1.3, dann Aktion 3. Aktivieren setzt eine zugeordnete Anlage voraus, Zuordnen eine angemeldete. Die Aktionsseiten sind ein „Entwurf zum Hackathon“, die Schnittstellen S1 bis S6 und B1, B2 ein Vorschlag. Seite 2 ist neuer als die Seiten 3 bis 6; bei Abweichungen gilt Seite 2 (O008). In der Spalte „Wer“ steht die Rolle nach Entscheidung des Teams; wo das Konzept den Dienstleister nennt und diese Fassung den Einspeiser, ist das vermerkt.

### Aktion 1: Community bilden

Konzept, Seiten 2 und 3.

| Schritt | Wer | Inhalt | Schnittstelle | Diese App |
| --- | --- | --- | --- | --- |
| 1.1 Community anlegen | Einspeiser (Konzept: Dienstleister) | Name, Gebiet, Ansprechpartner; Status Entwurf | S1: Netz- und Bilanzierungsgebiet zur Adresse | A007, A013 |
| 1.2 Konditionen festlegen | Einspeiser (Konzept: Dienstleister) | Preismodell, Festpreis, Laufzeit, Schlüssel-Typ | – | A008 bis A010 |
| B Bilanzkreis festlegen | Lieferant mit Lumenaza, BKV, ÜNB | bestehender oder neuer Bilanzkreis, BK-ID, Zuordnungsermächtigung beim Dritt-BKV | S6, B1, B2 | A011, N019 |
| Prüfung | Backend | Einspeiseanlage zugeordnet und aktiv? Sonst zuerst Aktion 2 | – | A014 |
| 1.3 Community aktivieren | Einspeiser (Konzept: Freigabe durch den Dienstleister, O041) | Bedingungen veröffentlichen, Community in beiden Community-Apps sichtbar | – | A014, A015 |

### Aktion 4: Einspeiseanlage anmelden

Konzept, Seiten 2 und 6.

| Schritt | Wer | Inhalt | Schnittstelle | Diese App |
| --- | --- | --- | --- | --- |
| 4.1 Anlage anmelden | Einspeiser in der Community-App Einspeisung | Einspeise-MaLo, Leistung, EE-Art | – | nein, N001 |
| Anlage prüfen | Backend und Lieferant | Prüfpunkte der Anlage | S1, S3 | A020, A021 |
| 4.2 Übernahme bestätigen | Lieferant | Einspeisung in den Bilanzkreis | S2; UTILMD an den VNB | A022 |
| 4.3 Antwort verarbeiten | Lieferant | Bestätigung oder Ablehnung des VNB; Anlage freigeben | S3 | A023 |
| 4.4 Info an Betreiber | Community-App Einspeisung | Anlage ist angemeldet und bereit zur Zuordnung | – | nein, N003 |

### Aktion 2: Einspeiseanlage zuordnen

Konzept, Seiten 2 und 4.

| Schritt | Wer | Inhalt | Schnittstelle | Diese App |
| --- | --- | --- | --- | --- |
| 2.1 Anlage auswählen | Einspeiser (Konzept: Dienstleister) | aus seinen aktiven Anlagen | – | A024 |
| Prüfung | Backend | Gebiet, Bilanzkreis, iMSys; sonst Hinweis | S1: MaLo-Stammdaten | A024 |
| 2.2 Zuordnung speichern | Backend | „gültig ab“ | – | A025 |
| 2.3 Virtuelle ZP-Beziehung | Backend | auf der BTP-DB | S4: Formeln ab Gültigkeit | A025 |
| 2.4 Info an Betreiber | Community-App Einspeisung | Anlage ist Teil der Community | – | nein, N003 |

### Aktion 3: Verbraucheranlage anmelden

Konzept, Seiten 2 und 5.

| Schritt | Wer | Inhalt | Schnittstelle | Diese App |
| --- | --- | --- | --- | --- |
| 3.1 Anmeldung | Teilnehmer | MaLo-ID, Zustimmung, Vertrag | – | nein, N002 |
| Teilnahme prüfen | Backend und Lieferant | Prüfpunkte der Teilnahme | S1, S3 | A027 |
| 3.2 Lieferanmeldung | Lieferant | Wechsel zum Paket-Anbieter | S2; UTILMD mit BK-ID an den VNB, GPKE 24 h | A028 |
| 3.3 Antwort verarbeiten | Lieferant | weiter oder abbrechen | S3 | A029 |
| 3.4 Info an Teilnehmer | Community-App Bezug | Bestätigung oder Ablehnung | – | nein, N003 |
| 3.5 Virtuelle ZP-Beziehung | Backend | „gültig ab“ und „gültig bis“ | – | A029 |

### Betrieb

Konzept, Seite 2.

| Schritt | Wer | Inhalt | Schnittstelle | Diese App |
| --- | --- | --- | --- | --- |
| Mess- und Prognosewerte | externe Systeme | schreiben über eine API in die Datenbank | API | A033, A038, N005 |
| 9 Formeln berechnen | Lumenaza | aus ZP-Beziehungen und Schlüssel; Übergabe an EDM, versioniert ab Gültigkeit | S4 | nein, N004 |
| 10 Messwerte verarbeiten | S/4HANA EDM | Viertelstundenwerte des MSB per MSCONS; Anteil und Reststrom | – | nein, N004 |
| Werte für die Apps | Backend | Anteile je Viertelstunde | S5 | A047, A074 |
| P Prognose, Fahrplan, Trading | Lumenaza | Viertelstundenprognose der Community | S5, B2 | nein, N006 |
| M MaBiS | Lumenaza | Summenzeitreihen prüfen, Clearing | B2 | nein, N013 |
| 11 Abrechnung | Lumenaza | Teilnehmer, Gutschrift Anlage; Eingang Mess- und Profilwerte aus EDM | S5 | nein, N014 |
| Rechnung in den Apps | Backend | Belege anzeigen | nicht benannt (O010) | A053 |

## Anforderungen

### Umfang und Rollen

**A001** Diese App ist die Community-Verwaltung. Sie umfasst die Verwaltungsschritte, die das Konzept der DL-App zuordnet: 1.1 bis 1.3, 2.1 bis 2.3, 3.2, 3.3, 3.5, 4.2 und 4.3. Dazu kommen Prüfpunkte, Status, Werte, Prognosen und Belege. Herkunft: Konzept, Seiten 2 bis 6.

**A002** Die App ist für die Verwalter einer Community gebaut. Hauptnutzer ist der Einspeiser. Herkunft: Entscheidung des Teams.

**A003** Schritte, die nur der Lieferant ausführen kann, führt der Lieferant aus: Bilanzkreis-Zuordnung, Bonitäts- und Blacklist-Prüfung, 4.2, 4.3, 3.2 und 3.3. Annahme: Er tut das in dieser App mit eigener Rolle (O038). Der Einspeiser sieht das Ergebnis als Prüfpunkt.

**A004** Der Einspeiser sieht nur die Communities, zu denen seine Anlagen gehören. In der Demo sieht Jan Koller B-FRA-01 und B-MUL-01, Roman Weidenfeller sieht B-CGN-01. Der Lieferant sieht die Communities, die er beliefert (Annahme: über `mk7_operator`, O002).

**A005** Die App nutzt die BTP-DB gemeinsam mit der Community-App Einspeisung und der Community-App Bezug. Sie legt keine SAP-Stammdaten an. Herkunft: Konzept, Seiten 2 und 3.

**A006** Im Zielbild liest die App Stammdaten über S1, löst Lieferanmeldung und Zuordnung über S2 aus, empfängt Bestätigung oder Ablehnung mit Grund über S3 und liest Anteil und Reststrom über S5. Herkunft: Konzept, Seite 2.

### Community

**A007** Eine Community hat Name, Gebiet und Ansprechpartner. Das Gebiet ist das Netz- und Bilanzierungsgebiet zur Adresse der Community; es kommt über S1. Herkunft: Konzept, Aktion 1.1.

**A008** Eine Community hat Konditionen mit Preismodell, Festpreis je kWh, Laufzeit und Schlüssel-Typ. Der Festpreis ist das Entgelt, zu dem der Einspeiser die Gemeinschaftsmenge an die Teilnehmer verkauft. Herkunft: Konzept, Aktion 1.2; Entscheidung des Teams.

**A009** Das Preismodell wird je Community gewählt: Festpreis je kWh oder Börsenpreis. Im Release ist nur der Festpreis verfügbar; der Börsenpreis ist N008. Herkunft: Entscheidung des Teams. Höhe des Festpreises in der Demo: O042.

**A010** Der einzige Schlüssel-Typ dieser Ausbaustufe ist „verbrauchsanteilig je Intervall“ nach A043 (O022).

**A011** Der Lieferant ordnet den Einspeiser einem Bilanzkreis zu: bestehender Bilanzkreis des Lieferanten, neuer eigener Bilanzkreis oder Bilanzkreis eines Dritten. Die App zeigt Option und BK-ID; die Zuordnung ist ein Prüfpunkt (A020). Das Anlegen eines Bilanzkreises ist N019. Herkunft: Konzept, Seite 2, Schritt B; Entscheidung des Teams. Der Datensatz enthält keine BK-ID (O014).

**A012** Eine Community hat beliebig viele Teilnehmer und vor der Aktivierung mindestens eine Einspeiseanlage. Weitere Einspeiseanlagen sind zulässig, wenn sie demselben Anlagenbetreiber gehören (N010, O003). Herkunft: Konzept, Aktion 1.3.

**A013** Eine Community hat nach 1.1 den Status Entwurf und nach 1.3 den Status aktiv. Der fachliche Status Entwurf ist unabhängig vom Entwurfsmodus (Draft) von Fiori Elements. Herkunft: Konzept, Aktion 1.

**A014** Der Einspeiser aktiviert die Community. Das geht nur, wenn mindestens eine Einspeiseanlage zugeordnet und aktiv ist. Andernfalls verweist die App auf Aktion 2 oder auf den offenen Prüfpunkt. Herkunft: Konzept, Aktion 1.3; Entscheidung des Teams. Das Konzept sieht hier eine Freigabe durch den Dienstleister vor (O041).

**A015** Mit der Aktivierung veröffentlicht die App die Bedingungen. Danach ist die Community in der Community-App Bezug und der Community-App Einspeisung sichtbar und offen für Teilnehmer und weitere Einspeiseanlagen. Herkunft: Konzept, Aktion 1.3.

**A016** Eine Community ist offen oder geschlossen. Eine geschlossene Community ist in der Community-App Bezug nicht öffentlich sichtbar; wer teilnehmen will, braucht einen Teilnahmecode. Die App verwaltet beide Typen gleich. Herkunft: Entscheidung des Teams; das Konzept kennt den Typ nicht.

**A017** Die App zeigt den Teilnahmecode an, damit er abgelesen und mündlich oder auf einem anderen individuellen Weg geteilt werden kann. Sie verschickt ihn außerdem per E-Mail: Der Verwalter gibt die Empfängeradresse im Dialog ein, der Versand läuft über einen angebundenen SMTP-Server. Herkunft: Entscheidung des Teams.

### Einspeiseanlagen

**A018** Eine Einspeiseanlage hat Anlagenbetreiber, Erzeugungsart, installierte Leistung in kW und Standort. Sie hat eine eigene MaLo, eine eigene MeLo und einen eigenen iMSys-Zähler. Im Datensatz kommen die Werte aus dem Blatt Erzeuger Registrierung und aus der Zeile mit Rolle `Solar Plant` oder `Wind Plant` im Blatt MK7 Teilnehmer. Herkunft: Konzept, Aktion 4.1; Datensatz; Entscheidung des Teams.

**A019** Eine PV-Anlage hat eine Ausrichtung, insbesondere die Abweichung von Süden. Sie bestimmt die Einspeiseprognose neuer Anlagen, für die noch keine Zeitreihe vorliegt. Die App zeigt die Ausrichtung an. Herkunft: Entscheidung des Teams. Angabeform und Quelle: O043.

**A020** Eine Einspeiseanlage ist aktiv, wenn alle Prüfpunkte der folgenden Tabelle positiv bestätigt sind. Herkunft: Entscheidung des Teams; Konzept, Aktion 4.

| Prüfpunkt | Ergebnis kommt von | Bezug im Konzept |
| --- | --- | --- |
| iMSys-Zähler vorhanden | S1 | Anlage prüfen |
| Registrierung im Marktstammdatenregister vorhanden | Annahme: Lieferant (O039) | – |
| Bisheriger Lieferant hat dem Wechsel zugestimmt | S3 | – |
| VNB hat dem Wechsel zugestimmt | S3 | VNB prüft Zuordnung, 4.3 |
| Lieferant hat den Einspeiser einem Bilanzkreis zugeordnet | Lieferant | 4.2, Schritt B |
| Geschäftspartner der Anlage hat eine positive Bonität | Lieferant | – |
| Geschäftspartner der Anlage steht nicht auf der Blacklist des Lieferanten | Lieferant | – |
| Erneuerbare-Energien-Anlage im selben Gebiet, Betrieb nicht überwiegend gewerblich | S1 | Anlage prüfen; offen O015, O016 |

**A021** Jeder Prüfpunkt hat den Stand offen, positiv oder negativ, bei negativ mit Grund. Die App zeigt alle Prüfpunkte einer Anlage und hebt offene und negative hervor. Herkunft: Entscheidung des Teams.

**A022** Der Lieferant bestätigt die Übernahme der Anlage in den Bilanzkreis (4.2). Die App löst damit über S2 die Zuordnung der Einspeise-MaLo aus. Herkunft: Konzept, Aktion 4.

**A023** Nach der Antwort des VNB über S3 verarbeitet der Lieferant das Ergebnis (4.3). Bei Bestätigung gibt er die Anlage frei; bei Ablehnung zeigt die App den Grund. Herkunft: Konzept, Aktion 4.

**A024** Der Einspeiser ordnet einer Community eine seiner aktiven Anlagen zu (2.1). Die App prüft Gebiet, Bilanzkreis und iMSys mit den Stammdaten aus S1. Schlägt die Prüfung fehl, zeigt die App den Grund und speichert nichts. Herkunft: Konzept, Aktion 2; Entscheidung des Teams.

**A025** Eine erfolgreiche Zuordnung speichert die App mit „gültig ab“ (2.2) und legt die virtuelle ZP-Beziehung an (2.3). Herkunft: Konzept, Aktion 2. Wie die Beziehung zu Lumenaza gelangt, beschreibt das Konzept nicht (O010).

### Teilnehmer

**A026** Ein Teilnehmer hat Kundentyp, Zustimmung, Vertrag, eine eigene MaLo, eine eigene MeLo und einen eigenen iMSys-Zähler. Im Datensatz kommen die Werte aus der Zeile mit Rolle `Household Consumption` im Blatt MK7 Teilnehmer. Herkunft: Konzept, Aktion 3.1; Datensatz; Entscheidung des Teams.

**A027** Eine Teilnahme ist aktiv, wenn ihre Prüfpunkte positiv sind: iMSys-Zähler vorhanden, Gebiet, Kundentyp, Vertrag, Zustimmung des bisherigen Lieferanten und Zustimmung des VNB. Zulässige Kundentypen sind Haushalte, KMU und Gemeinden. Die App zeigt die Prüfpunkte wie in A021. Herkunft: Konzept, Seiten 1, 2 und 5. Annahme: Die Zustimmungen gelten wie bei Anlagen (O040). Merkmal für den Kundentyp: O017.

**A028** Der Lieferant löst die Lieferanmeldung aus (3.2). Die App sendet sie über S2 mit der BK-ID der Community; S/4HANA schickt sie als UTILMD an den VNB. Herkunft: Konzept, Aktion 3 und Seite 2. Ob der Einspeiser Anmeldungen zusätzlich annimmt oder ablehnt, ist offen (O005). Zur Wahlfreiheit beim ergänzenden Bezug siehe O018.

**A029** Nach der Antwort des VNB über S3 entscheidet der Lieferant, ob der Prozess weiterläuft oder abbricht (3.3). Läuft er nach einer Bestätigung weiter, legt die App die virtuelle ZP-Beziehung mit „gültig ab“ und „gültig bis“ an (3.5). Bei Ablehnung oder Abbruch zeigt die App den Grund. Herkunft: Konzept, Aktion 3.

**A030** Ein Haushalt mit Teilnahme MK7 = `nein` ist kein Teilnehmer. Die App zeigt ihn mit dem Status „nimmt nicht teil“ und schließt ihn aus allen Berechnungen aus. Herkunft: Datensatz, Regeln „Teilnahmeberechtigung“ und „Zuteilung zu Haushalten“.

### Status

**A031** Die App führt für Community, Einspeiseanlage und Teilnahme einen Status nach der folgenden Tabelle. Die Namen sind ein Vorschlag (O011).

| Objekt | Status | erreicht durch |
| --- | --- | --- |
| Community | Entwurf | 1.1 |
| Community | aktiv | 1.3, mindestens eine zugeordnete aktive Anlage |
| Einspeiseanlage | angemeldet | 4.1 in der Community-App Einspeisung |
| Einspeiseanlage | in Prüfung | mindestens ein Prüfpunkt offen, keiner negativ |
| Einspeiseanlage | aktiv | alle Prüfpunkte positiv |
| Einspeiseanlage | zugeordnet | 2.2, ab „gültig ab“ |
| Einspeiseanlage | abgelehnt | mindestens ein Prüfpunkt negativ |
| Teilnahme | angemeldet | 3.1 in der Community-App Bezug |
| Teilnahme | in Prüfung | mindestens ein Prüfpunkt offen, keiner negativ |
| Teilnahme | aktiv | alle Prüfpunkte positiv, 3.3 „weiter“, 3.5 ab „gültig ab“ |
| Teilnahme | abgelehnt | mindestens ein Prüfpunkt negativ oder Abbruch in 3.3 |
| Teilnahme | nimmt nicht teil | Datensatz: Teilnahme MK7 = `nein` |

**A032** Ist eine Community, Anlage oder Teilnahme nicht aktiv, zeigt die App, welcher Prüfpunkt oder Schritt offen ist, und bei Ablehnung den Grund (O012).

### Messwerte und Intervalle

**A033** Jede MeLo liefert Intervallwerte mit Beginn, Ende, Menge, Einheit und Aggregationstyp: Erzeugung je Anlage und Verbrauch je Teilnehmer, jeweils in kWh. Externe Systeme schreiben sie über eine API in die Datenbank (N005). Herkunft: Datensatz, Blätter Stündliche Erzeugung und Stündlicher Verbrauch; Entscheidung des Teams.

**A034** Die App verarbeitet Intervalle von 15 und 60 Minuten. Das Konzept verlangt Viertelstunden, der Datensatz liefert Stunden mit `aggregation_type` = `hour` (O028). Herkunft: Konzept, Seite 1; Datensatz.

**A035** Zeitstempel sind UTC nach ISO 8601. Herkunft: Datensatz, Feldbeschreibungen. Anzeige und Tagesgrenzen: O029.

**A036** Die Leistung eines Intervalls in kW ist seine Menge in kWh geteilt durch die Intervalldauer in Stunden. Leistungen werden nicht über die Zeit summiert.

**A037** Die Berechnung nutzt Intervallmengen, keine Zählerstände.

### Prognose

**A038** Für jede Einspeiseanlage liegt eine Einspeiseprognose als Zeitreihe in der Datenbank. Ein externes System schreibt sie über eine API (N005). Herkunft: Entscheidung des Teams.

**A039** Liegen für eine Anlage schon Zeitreihen der Einspeisung vor, entsteht die Prognose extern daraus. Bei neuen PV-Anlagen bestimmt die Ausrichtung aus A019 die Prognose. Die App berechnet keine Prognose (N006). Herkunft: Entscheidung des Teams.

**A040** Die App zeigt die prognostizierte Einspeisung je Anlage und Community in kWh pro Jahr und für den gewählten Zeitraum. Format, Raster und Testdaten der Prognose: O043.

### Allokation

**A041** In die Berechnung gehen nur Haushalte mit Rolle `Household Consumption` und Teilnahme MK7 = `Ja` ein. Maßgeblich ist das Blatt MK7 Teilnehmer; Verbrauchswerte werden über `metering_location_id_MeLo` zugeordnet. Herkunft: Datensatz, Regeln „Teilnahmeberechtigung“ und „Quelle der Teilnehmerliste“.

**A042** Je Community und Intervall sei E die Erzeugung aller Anlagen und V der Verbrauch aller berechtigten Teilnehmer. Dann gilt `Gemeinschaftsmenge G = min(E, V)`, `Reststrom R = max(0, V − E)` und `Überschuss Ü = max(0, E − V)`. Herkunft: Datensatz, Regeln „Strombilanzierung“ und „Berechnung der Einspeisung“.

**A043** Die Gemeinschaftsmenge wird im Verhältnis des Intervallverbrauchs auf die berechtigten Teilnehmer verteilt: `Anteil_i = G × V_i / V`. Der Reststrom eines Teilnehmers ist `V_i − Anteil_i`. Ist V gleich 0, ist jeder Anteil 0. Herkunft: Datensatz, Regel „Zuteilung zu Haushalten“; Konzept, Seite 1; Wettbewerb.

**A044** Die Allokation läuft im Intervall der Quelldaten. Größere Zeiträume summieren die allokierten Intervallwerte. Minimum und Maximum aus A042 werden nie auf summierten Werten gebildet, weil das andere Ergebnisse liefert.

**A045** Windstrom zählt zur Erzeugung. Herkunft: Datensatz, Regel „Windkraft bleibt enthalten“.

**A046** Summen, Allokation, Kennzahlen und Kurven entstehen aus den gespeicherten Intervallwerten. Die Aggregation läuft in SQL, nah an der Persistenz.

**A047** Liefert S5 Anteil und Reststrom aus S/4HANA EDM, zeigt die App diese Werte an und rechnet nicht selbst. Herkunft: Konzept, Schritte 9 und 10, S5.

### Preise und Zahlungspositionen

**A048** Preise gelten je Intervall: Festpreis der Community, Dienstleistungsaufschlag von 15 %, Reststrompreis, Börsenpreis je Stunde, Einspeisevergütung, Mieterstromzuschlag und Messentgelt je Zähler und 24 Stunden. Sätze in €/kWh, Beträge in Euro. Annahme für den Release: Festpreis 0,12 €/kWh, Reststrompreis 0,25 €/kWh, beide aus dem Blatt Strompreise (O042). Herkunft: Entscheidung des Teams; Datensatz.

**A049** Teilnehmer zahlen für ihren Anteil an der Gemeinschaftsmenge den Festpreis zuzüglich 15 %. Der Festpreis geht an den Einspeiser, der Aufschlag an den Lieferanten für die Bereitstellung seiner Dienste. Der Aufschlag gilt auch, wenn später der Börsenpreis als Preismodell kommt. Herkunft: Entscheidung des Teams. Konfigurierbarkeit des Aufschlags: O044.

**A050** Die App berechnet je Community und Zeitraum die folgenden Zahlungspositionen. Abgerechnet wird über den Lieferanten: Er stellt dem Teilnehmer die Positionen 1 bis 3 in Rechnung und schreibt dem Einspeiser Position 1 gut (Konzept, Schritt 11). Die Regel des Datensatzes „Gesamtverbrauch × Verkaufspreis“ ist damit ersetzt (O019).

| Nr. | Position | Zahler | Empfänger | Berechnung | Herkunft |
| ---: | --- | --- | --- | --- | --- |
| 1 | Gemeinschaftsmenge, Festpreis | Teilnehmer | Einspeiser | Anteil × Festpreis | Entscheidung des Teams |
| 2 | Gemeinschaftsmenge, Dienstleistungsaufschlag | Teilnehmer | Lieferant | Anteil × Festpreis × 15 % | Entscheidung des Teams |
| 3 | Reststrom | Teilnehmer | Lieferant | Reststrom × Reststrompreis | Annahme, O042 |
| 4 | Reststrombeschaffung | Lieferant | DSK GmbH | Reststrom je Intervall × Börsenpreis des Intervalls, kein Aufschlag | Datensatz |
| 5 | Einspeisevergütung | DSK GmbH | Einspeiser | Überschuss je Intervall × Einspeisevergütung | Datensatz; Bewertung des Überschusses O042 |
| 6 | Mieterstromzuschlag (Simulation) | DSK GmbH | Einspeiser | lokal genutzter Solarstrom × Mieterstromzuschlag, Windstrom ausgenommen | Datensatz |
| 7 | Messstellenbetrieb | Lieferant | Tawanir | Anzahl berechtigter Haushaltszähler × Messentgelt, einmal je 24 Stunden | Datensatz |

Offen sind Steuern und Entgelte (O024), der Solaranteil bei gemischten Anlagen (O023) und das Messentgelt für andere Zeiträume als 24 Stunden (O026).

**A051** Negative Börsenpreise bleiben unverändert. Die Reststrombeschaffung kann dadurch in einzelnen Intervallen negativ sein. Herkunft: Datensatz, Regel „Börsenpreise“.

**A052** Die Erlöse des Einspeisers sind die Positionen 1, 5 und 6. Dienstleistungsaufschlag und Reststrom sind keine Erlöse des Einspeisers.

**A053** Alle Beträge sind vorläufig; die App erzeugt keine Rechnung (N014). Im Zielbild zeigt sie die Belege der Abrechnung aus Lumenaza (Schritt 11). Herkunft: Konzept, Seite 2.

### Kennzahlen

**A054** Die Community zeigt Status, Preismodell und Festpreis, Anzahl der Einspeiseanlagen, installierte Leistung in kW als Summe, Anzahl der Teilnehmer und prognostizierte Einspeisung in kWh pro Jahr. Für den gewählten Zeitraum kommen Erzeugung, Verbrauch, Gemeinschaftsmenge, Überschuss und Reststrom in kWh sowie die Erlöse des Einspeisers dazu.

**A055** Jede Einspeiseanlage zeigt Erzeugungsart, installierte Leistung als Peak-Einspeiseleistung, bei PV die Ausrichtung, MaLo, MeLo, iMSys-Zählernummer, prognostizierte Einspeisung in kWh pro Jahr und ihre Prüfpunkte. Die Zählernummer ist im Datensatz leer (O031).

### Oberfläche

Die fachlichen Seiten sind die Community mit Energie- und Abrechnungssicht, die Einspeiseanlage und der Teilnehmer. Ihre Form folgt den Floorplans von Fiori Elements. Quelle der Grenzen ist die SAPUI5-Dokumentation [Configuring Charts](https://github.com/SAP-docs/sapui5/blob/main/docs/06_SAP_Fiori_Elements/configuring-charts-653ed0f.md): Kennzahlen aus assoziierten Entitäten sind im Chart nicht zulässig, Criticality färbt den Chart nicht, und die Chart-Personalisierung wird nicht in der Variante gespeichert. Vor der Implementierung sind die Floorplans mit dem Fiori-MCP zu prüfen.

**A056** Der Einstieg ist ein List Report der Communities, die der angemeldete Verwalter sieht, mit ihrem Status. Die einzelne Community ist eine Object Page. Herkunft: Fiori Elements.

**A057** Der Kopf der Object Page zeigt den Status mit Criticality, bei nicht aktiven Communities den offenen Prüfpunkt oder Schritt, und die Kennzahlen aus A054. Herkunft: Fiori Elements.

**A058** Die Object Page hat Sektionen für Konditionen, Einspeiseanlagen, Teilnehmer, Energie und Abrechnung. Die Teilnehmer-Sektion enthält auch laufende Anmeldungen, in der ersten Fassung „Bewerber“. Zeilen der Sektionen Einspeiseanlagen und Teilnehmer navigieren auf die Object Page des Eintrags. Herkunft: Fiori Elements.

**A059** Gemeinschaftsmenge, Überschuss und Reststrom des gewählten Zeitraums erscheinen als Kennzahlen oder als Tabelle, nicht als eingefärbte Fläche in der Kurve. Herkunft: Fiori Elements.

**A060** Erzeugung, prognostizierte Einspeisung und Verbrauch erscheinen als Kennzahlen eines Liniencharts auf derselben Achse und in derselben Einheit. Die Dimension ist die Zeit. Herkunft: Fiori Elements.

**A061** In der Tagesansicht zeigt der Chart die Leistung in kW je Intervall nach A036. Herkunft: Fiori Elements, damit alle Reihen dieselbe Einheit haben.

**A062** In der Wochen-, Monats- und Jahresansicht sowie bei einem freien Beginn- und Endedatum zeigt der Chart die Arbeit in kWh. Herkunft: Fiori Elements. Der Datensatz deckt nur einen Tag ab (O028).

**A063** Der Zeitraum wird über die Filterleiste gewählt: semantische Datumsfilter und ein freies Intervall mit Beginn und Ende. Herkunft: Fiori Elements. Der frühere Wunsch, tagweise per Button zurückzuspringen, ist N022.

**A064** Die Zeitreihe wird als flache analytische Entität bereitgestellt. Sie enthält je Community und Intervall Erzeugung, Prognose, Verbrauch, Gemeinschaftsmenge, Überschuss und Reststrom nach A042; Kennzahlen und Zeitdimension liegen auf dieser Entität. Die Oberfläche liest aggregierte Ergebnisse über OData `$apply` und summiert die Intervallwerte nicht im Browser. Herkunft: Fiori Elements, passend zu A044 und A046.

**A065** Preise und Euro stehen in eigenen Kennzahlen oder in einer Tabelle, nicht auf der Kurve aus A060. Herkunft: Fiori Elements.

**A066** Die Object Page einer Einspeiseanlage zeigt die Daten aus A055, den Status mit allen Prüfpunkten sowie Erzeugung und Prognose im gewählten Zeitraum. Die Object Page eines Teilnehmers zeigt Status und Prüfpunkte und je gewähltem Zeitraum Verbrauch, zugeteilte Gemeinschaftsmenge, Reststrom, angewendete Preise und vorläufigen Rechnungsbetrag. Herkunft: Wettbewerb; Datensatz.

**A067** Die Sektion Abrechnung zeigt je Zeitraum die Positionen aus A050 mit Menge, Satz, Betrag, Zahler und Empfänger sowie die Erlöse des Einspeisers aus A052. Sie erzeugt keine Rechnung. Herkunft: Wettbewerb, abgegrenzt gegen N014.

**A068** Die Prozessschritte sind gebundene Aktionen. Für den Einspeiser: Community aktivieren (1.3), Anlage zuordnen mit „gültig ab“ (2.1), Teilnahmecode anzeigen und Einladung per E-Mail versenden mit der Empfängeradresse als Parameter (A017). Für den Lieferanten (Annahme, O038): Bilanzkreis zuordnen, Bonität und Blacklist bestätigen, Übernahme bestätigen (4.2), Anlage freigeben (4.3), Lieferanmeldung auslösen (3.2), Antwort verarbeiten mit „weiter“ oder „abbrechen“ (3.3). Eine Aktion ist nur verfügbar, wenn Rolle und Status sie zulassen. Der Parameterdialog bleibt auf einfache Felder beschränkt. Herkunft: Fiori Elements.

**A069** Anlegen und Bearbeiten einer Community mit Name, Gebiet, Ansprechpartner und Konditionen laufen über die Object Page. Herkunft: Konzept, Aktionen 1.1 und 1.2; Fiori Elements.

**A070** Für den hier beschriebenen Umfang sind keine Controller-Erweiterungen und keine Custom Sections vorgesehen. Eine Erweiterung kommt nur in Betracht, wenn eine festgehaltene Anforderung mit Annotationen nicht darstellbar ist. Herkunft: Fiori Elements.

### Demo im Hackathon

**A071** Ein Mock ersetzt S1 bis S5 und die Ergebnisse der Lieferanten-Prüfpunkte (Annahme, O007, O039). S1 liefert Stammdaten aus dem Datensatz, S2 nimmt Aufträge an, S3 liefert Zustimmung oder für Testfälle Ablehnung mit Grund, S5 liefert die Intervallwerte des Datensatzes.

**A072** Jede `building_id` des Datensatzes bildet eine Community. Ihre Anlagen und Haushalte gelten als im selben Bilanzierungsgebiet (Annahme, O014, O019). Name, Ansprechpartner und Festpreis fehlen im Datensatz und werden in der App gepflegt oder vorbelegt.

**A073** Die Communities des Datensatzes sind aktiv, ihre Anlagen zugeordnet und alle Prüfpunkte positiv. Die Haushalte mit Teilnahme MK7 = `Ja` sind aktive Teilnehmer, jeweils ab `mk7_supply_start_utc`. Die Schritte der Aktionen 1 bis 4 und negative Prüfpunkte werden an zusätzlichen Testobjekten gezeigt (O013).

**A074** Ohne S5 berechnet die App Gemeinschaftsmenge, Anteile, Reststrom und Überschuss nach A041 bis A045 und die Zahlungspositionen nach A048 bis A052 selbst.

**A075** Die Demo reproduziert die Referenzwerte im folgenden Abschnitt.

## Referenzwerte für die Abnahme

Die Werte folgen aus dem Datensatz und den Regeln A041 bis A052 für den 1. Oktober 2026 von 00:00 bis 24:00 Uhr UTC, mit Festpreis 0,12 €/kWh, Aufschlag 15 % und Reststrompreis 0,25 €/kWh. Gerechnet wird ungerundet je Intervall; erst das Ergebnis wird auf Cent gerundet (Annahme, O025). Ändert eine Entscheidung unter den offenen Punkten eine Regel, sind die Werte neu zu rechnen.

| Größe | B-FRA-01 | B-CGN-01 | B-MUL-01 |
| --- | ---: | ---: | ---: |
| Anlage | Solar, 6 kW | Wind, 7 kW | Solar, 5,5 kW |
| Berechtigte Teilnehmer | 3 | 4 | 3 von 4 |
| Erzeugung in kWh | 38,100 | 58,380 | 30,851 |
| Verbrauch der Teilnehmer in kWh | 40,823 | 54,991 | 42,101 |
| Gemeinschaftsmenge in kWh | 16,262 | 40,359 | 15,344 |
| Reststrom in kWh | 24,561 | 14,632 | 26,757 |
| Überschuss in kWh | 21,838 | 18,021 | 15,507 |
| 1 Gemeinschaftsmenge, Festpreis in € | 1,95 | 4,84 | 1,84 |
| 2 Dienstleistungsaufschlag in € | 0,29 | 0,73 | 0,28 |
| 3 Reststrom in € | 6,14 | 3,66 | 6,69 |
| Stromrechnung der Teilnehmer (1 bis 3) in € | 8,38 | 9,23 | 8,81 |
| 4 Reststrombeschaffung in € | 2,98 | 2,13 | 3,18 |
| 5 Einspeisevergütung in € | 1,53 | 1,26 | 1,09 |
| 6 Mieterstromzuschlag in € | 0,41 | 0,00 | 0,38 |
| 7 Messstellenbetrieb in € | 0,25 | 0,33 | 0,25 |
| Erlöse Einspeiser (1, 5, 6) in € | 3,89 | 6,10 | 3,31 |

Teilnehmer in B-MUL-01, einschließlich des ausgeschlossenen Haushalts:

| Messlokation | Teilnahme MK7 | Verbrauch in kWh | Anteil Gemeinschaftsmenge in kWh | Reststrom in kWh | Stromrechnung in € |
| --- | --- | ---: | ---: | ---: | ---: |
| DE0001815707800000101300000131964 | Ja | 15,243 | 5,369 | 9,874 | 3,21 |
| DE0001815707800000101300000135009 | Ja | 12,863 | 4,758 | 8,105 | 2,68 |
| DE0001815707800000101300000137866 | Ja | 13,995 | 5,217 | 8,778 | 2,91 |
| DE0001815707800000101300000135832 | nein | 14,034 | – | – | – |

## Wettbewerbsvergleich

Der Vergleich dient der Einordnung. Übernommen ist nur, was die Community-Verwaltung vervollständigt. Diese Punkte sind in A043, A066 und A067 gekennzeichnet.

[exnaton](https://www.exnaton.ai/energy-sharing) richtet sich an Energieversorger und Netzbetreiber. Die Plattform verwaltet Communities, verteilt Energie in 15-Minuten-Scheiben, bildet Tarife ab, liefert Abrechnungspositionen und unterstützt das Onboarding. Sie umfasst zusätzlich ERP-Anbindung und die Mengenberechnung für den Verteilnetzbetreiber. Beides ist hier Nicht-Ziel.

[Lumenaza](https://www.lumenaza.de/de/saas-plattform) ist eine Lieferantenplattform für Beschaffung, Direktvermarktung, Bilanzkreis und Marktkommunikation. Das [Kundenportal](https://www.lumenaza.de/de/saas-plattform/kundenportal) zeigt Verbrauch, Einspeisung, Community-Teilnahme und Day-Ahead-Preise. Das [virtuelle Kraftwerk](https://www.lumenaza.de/de/saas-plattform/virtuelles-kraftwerk) überwacht und vermarktet dezentrale Anlagen und ist nicht die Community-Verwaltung dieser App. Im Konzept ist Lumenaza zugleich Nachbarsystem dieser App für Bilanzkreis, Formeln, Prognose, MaBiS und Abrechnung (Seite 2). Der Vergleich betrifft nur die Oberflächen.

## Quellen

### Projektquellen

- [5Energy Sharing im Stadtteil.pdf](../docs/sources/5Energy%20Sharing%20im%20Stadtteil.pdf), sechs Seiten, Stand 15.10.2026. Seite 1: Rollenmodell. Seite 2: Gesamtprozess mit Lumenaza und BKV, Schnittstellen S1 bis S6 und B1, B2. Seiten 3 bis 6: Aktionen 1 bis 4.
- [Dataset_English.xlsx](../docs/sources/Dataset_English.xlsx) und [Datensatz_Deutsch.xlsx](../docs/sources/Datensatz_Deutsch.xlsx), je sieben Blätter, inhaltlich gleich.

### Weiterführende Recherche

Die Links sind Quellen zum Nachlesen. Ein Gesetzestext wird dadurch keine Anforderung. Weicht er von einer nummerierten Anforderung ab, gilt die Anforderung.

#### Gemeinsame Nutzung und Abgrenzung

- [§ 42c EnWG, gemeinsame Nutzung elektrischer Energie](https://www.gesetze-im-internet.de/enwg_2005/__42c.html)
- [Bundesnetzagentur, FAQ Energy Sharing](https://www.bundesnetzagentur.de/DE/Vportal/Energie/Energy_Sharing/faq_table.html)
- [Bundesnetzagentur, Mitteilung Nr. 73 zu Energy Sharing in GPKE und Bilanzierung](https://www.bundesnetzagentur.de/DE/Beschlusskammern/BK06/BK6_81_GPKE_GeLi/Mitteilung_Nr_73/MitteilungNr73.html)
- [§ 42b EnWG, gemeinschaftliche Gebäudeversorgung](https://www.gesetze-im-internet.de/enwg_2005/__42b.html), nur zur Abgrenzung
- [GÖRG, Ausblick auf § 42c ab 1. Juni 2026](https://www.goerg.de/de/aktuelles/veroeffentlichungen/13-04-2026/bald-strom-mit-nachbarn-teilen-ein-ausblick-auf-das-ab-1-juni-2026-geltende-energy-sharing-gemaess-ss-42c-enwg-chancen-und-grenzen), Kommentar, nicht normativ

#### Messwesen und Marktkommunikation

- [BDEW, Marktlokation und Messlokation](https://www.bdew.de/service/anwendungshilfen/marktlokation-und-messlokation-grundlagen-und-anwendungsbeispiele/)
- [BDEW, Marktkommunikation 2022](https://www.bdew.de/energie/marktkommunikation-2022-artikel/)
- [EDI@Energy](https://www.edi-energy.de/)
- [Bundesnetzagentur, Mitteilung Nr. 56 zu den Datenformaten](https://www.bundesnetzagentur.de/DE/Beschlusskammern/BK06/BK6_83_Zug_Mess/835_mitteilungen_datenformate/Mitteilung_56/Mitteilung_Nr_56.html), darunter MSCONS, verbindlich ab 1. Oktober 2026

#### Direktvermarktung und 15-Minuten-Preise

- [§ 10b EEG, Vorgaben zur Direktvermarktung](https://www.gesetze-im-internet.de/eeg_2014/__10b.html)
- [Bundesministerium für Wirtschaft und Energie, FAQ zur Viertelstunde am Day-Ahead-Markt](https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Dossier/ErneuerbareEnergien/faq-zur-energierechtsnovelle-zur-vermeidung-von-stromspitzen-und-zum-biomassepaket.html)
- [EPEX SPOT, 15-Minuten-Produkte](https://www.epexspot.com/en/15-minute-products-market-coupling)
- [SMARD, Großhandelspreise](https://www.smard.de/page/home/wiki-article/446/562/grosshandelspreise)
- [BDEW-Anwendungshilfe zum Energy Sharing](https://www.bdew.de/service/bdew-anwendungshilfe-zum-energy-sharing/), netzwirtschaftliche Umsetzung beim Verteilnetzbetreiber, nicht der Funktionsumfang dieser App

#### Wettbewerb

- [exnaton, Energy Sharing](https://www.exnaton.ai/energy-sharing)
- [exnaton, Plattform](https://www.exnaton.ai/)
- [Lumenaza, SaaS-Plattform](https://www.lumenaza.de/de/saas-plattform)
- [Lumenaza, Kundenportal](https://www.lumenaza.de/de/saas-plattform/kundenportal)
- [Lumenaza, virtuelles Kraftwerk](https://www.lumenaza.de/de/saas-plattform/virtuelles-kraftwerk)

#### Fiori Elements

- [SAPUI5, Configuring Charts](https://github.com/SAP-docs/sapui5/blob/main/docs/06_SAP_Fiori_Elements/configuring-charts-653ed0f.md)

## Offene Punkte und Lücken

Jeder Punkt nennt die Lücke oder den Widerspruch mit Fundstelle und die Arbeitsannahme, mit der diese Fassung bis zur Klärung arbeitet. Die Spalte Entscheidung ist zum Nachtragen. Beantwortete Punkte sind gestrichen.

### Umfang und Rollen

| ID | Lücke oder Widerspruch | Arbeitsannahme | Entscheidung |
| --- | --- | --- | --- |
| O002 | Wen sieht der Lieferant? Die Bedeutung von `mk7_operator` („Ein plus Neun Gmbh“, „Gelbschwarz AG“) ist nicht erklärt; die Zahlungsregeln nennen den Lieferanten nur „Mieterstrom Supplier“. | Der Einspeiser sieht die Communities seiner Anlagen. `mk7_operator` ist der Lieferant und sieht die Communities mit seinem Namen (A004). | |
| O003 | Konzept, Aktion 1.3: Eine aktive Community ist offen für weitere Einspeiseanlagen. Erste Fassung: genau ein Einspeiser. Offen sind mehrere Anlagenbetreiber je Community und die Aufteilung der Erlöse auf mehrere Anlagen. | Ein Anlagenbetreiber, mehrere Anlagen (A012, N010). Erlöse je Anlage anteilig nach ihrer Erzeugung im Intervall. | |
| O005 | Erste Fassung: Der Einspeiser nimmt Bewerbungen an oder lehnt sie ab (Herkunft Wettbewerb). Konzept und Prüfkatalog: Über die Teilnahme entscheiden Prüfpunkte, VNB und Lieferant. Soll der Einspeiser als Verwalter zusätzlich annehmen oder ablehnen? | Keine manuelle Annahme; der Einspeiser sieht den Stand der Prüfpunkte (A027, A028). | |
| O006 | Wer baut die automatischen Prüfungen? Das Konzept ordnet sie dem gemeinsamen Backend zu, nicht einer App. | Die Registrierungs-Apps legen die Prüfpunkte an, diese App zeigt und aktualisiert sie. | |
| O038 | Wo führt der Lieferant seine Schritte aus (Bilanzkreis-Zuordnung, Bonität, Blacklist, 4.2, 4.3, 3.2, 3.3): in dieser App mit eigener Rolle oder in einer eigenen DL-App wie im Konzept? | In dieser App mit Rolle Lieferant (A003, A068). | |
| O041 | Konzept, Aktion 1.3: Die Community wird durch den Dienstleister freigegeben. Jetzt verwaltet der Einspeiser die Community. Braucht die Aktivierung zusätzlich eine Freigabe des Lieferanten? | Nein. Die Freigabe des Lieferanten steckt in den Prüfpunkten der Anlage (Bilanzkreis, Bonität, Blacklist), A014. | |

### Prozess und Schnittstellen

| ID | Lücke oder Widerspruch | Arbeitsannahme | Entscheidung |
| --- | --- | --- | --- |
| O007 | Stehen S/4HANA Utilities und Lumenaza oder Mocks davon im Hackathon zur Verfügung? | Nein. Diese App mockt S1 bis S5 (A071). | |
| O008 | Seite 2 (Stand 15.10.2026) verlegt Formeln und Abrechnung nach Lumenaza: S4 läuft von Lumenaza nach S/4HANA, S6 heißt „Bilanzkreis hinterlegen“, „S6 alt (Abrechnungsdaten) entfällt“. Die Seiten 4 und 5 zeigen noch S4 von BTP nach S/4HANA, Formeln und Abrechnung in S/4HANA (3.6, 3.8) und S6 als Abrechnungsdaten. Die Teilnahmeprüfung nennt auf Seite 2 „Vertrag“, auf Seite 5 „Kundentyp“. | Seite 2 gilt. Die Teilnahme hat beide Prüfpunkte (A027). | |
| O010 | Ohne Bezeichnung im Konzept: Übergabe der ZP-Beziehungen von BTP an Lumenaza (Schritt 8 nach 9), BK-ID je Community an BTP (S6 geht nur an S/4HANA), Belege aus Lumenaza an BTP („Rechnung in den Apps“). | Im Hackathon nicht gebaut. Die BK-ID wird in der App gepflegt; Belege entfallen. | |
| O011 | Die Statusnamen in A031 sind ein Vorschlag. Nicht beschrieben sind Beenden oder Deaktivieren einer Community, Laufzeitende, Austritt eines Teilnehmers, Ende einer Zuordnung („gültig bis“), Rücknahme eines positiven Prüfpunkts und „weiter“ nach einer Ablehnung in 3.3. | Nur die Zustände aus A031. Ein Prüfpunkt kann jederzeit neu gesetzt werden; der Status folgt. | |
| O012 | S3 liefert Bestätigung oder Ablehnung „inkl. Grund“. Eine Codeliste der Gründe und der Umgang mit Fristen (GPKE 24 h) fehlen. | Grund als Freitext; keine Fristüberwachung. | |
| O013 | Der Datensatz enthält nur eingerichtete Communities mit Verträgen ab 1.10.2026. Objekte in Zwischenständen und mit negativen Prüfpunkten fehlen. | Zusätzliche Testobjekte werden in der App angelegt (A073). | |
| O014 | Der Datensatz enthält weder Netz- und Bilanzierungsgebiet (`grid_operator_code` und `grid_operator_name_sap` sind leer) noch BK-IDs. Die erste Fassung bezog das Bilanzgebiet auf die Netzebene Niederspannung; das Konzept nennt keine Netzebene. | Anlagen und Haushalte einer `building_id` liegen im selben Gebiet (A072). Die BK-ID wird als Platzhalter gepflegt. | |

### Prüfregeln

| ID | Lücke oder Widerspruch | Arbeitsannahme | Entscheidung |
| --- | --- | --- | --- |
| O015 | Zulässige Erzeugungsarten: erste Fassung Photovoltaik, Wind und Biogas; Feldbeschreibungen Solar, Wind, Gas, Hydro und Battery; Konzept nur Erneuerbare-Energien-Anlagen. Der Prüfkatalog (A020) nennt die Erzeugungsart nicht. Ist Gas Biogas? Zählt eine Batterie? | Zulässig sind Solar, Wind, Hydro und Gas als Biogas, Battery nicht. | |
| O016 | Konzept, Aktion 4: Betrieb nicht überwiegend gewerblich. Der Prüfkatalog nennt das nicht. Gilt die Regel, und woran wird sie erkannt? Der Datensatz hat `is_business`; Jan Koller hat `true`. | `is_business` wird angezeigt, nicht geprüft. | |
| O017 | Ein Merkmal für den Kundentyp fehlt; der Datensatz kennt nur die Rolle `Household Consumption`. | `Household Consumption` ist der Kundentyp Haushalt. | |
| O018 | Konzept, Seite 5: Wahlfreiheit des Teilnehmers beim ergänzenden Bezug beachten (§ 42c Abs. 6 EnWG). Seite 1: Bietet der bisherige Lieferant das Paket nicht an, wechselt der Teilnehmer. Was muss die App abbilden? | Die App bildet nur den Wechsel zum Paket-Anbieter ab (A028). | |
| O039 | Woher kommen die Ergebnisse der Prüfpunkte? Der Datensatz enthält keine Marktstammdatenregister-Nummer, keine Bonität, keine Blacklist und keine Zustimmung des Vorlieferanten (`previous_supplier` ist leer). | Bilanzkreis, Bonität, Blacklist und Marktstammdatenregister setzt der Lieferant in der App; iMSys und Gebiet kommen über S1, die Zustimmungen über S3. In der Demo liefert ein Mock die Ergebnisse (A071). | |
| O040 | Der Prüfkatalog spricht vom Geschäftspartner der Einspeiseanlage. Welche Prüfpunkte gelten für Teilnehmer? | Teilnehmer: iMSys, Zustimmung von Vorlieferant und VNB sowie Gebiet, Kundentyp und Vertrag aus dem Konzept. Marktstammdatenregister, Bonität, Blacklist und Bilanzkreis nur für Anlagen (A027). | |

### Rechenregeln und Preise

| ID | Lücke oder Widerspruch | Arbeitsannahme | Entscheidung |
| --- | --- | --- | --- |
| O019 | Der Datensatz rechnet je Gebäude mit Mieterstrom-Begriffen („Mieterstrom Supplier“, Mieterstromzuschlag) und berechnet den Teilnehmern den Gesamtverbrauch zum Verkaufspreis. Das Konzept beschreibt Energy Sharing über das öffentliche Netz im Bilanzierungsgebiet; N018 schließt Mieterstrom als Produkt aus. | Jede `building_id` ist eine Community. Die Teilnehmerrechnung folgt dem Preismodell der Community (A009, A050). Die übrigen Zahlungsregeln des Datensatzes gelten für die Demo; der Mieterstromzuschlag ist eine Simulationsposition. | |
| O022 | Das Konzept nennt einen Schlüssel-Typ (1.2), aber keine Typen. | Nur „verbrauchsanteilig je Intervall“ (A010, N017). | |
| O023 | Wie wird der lokal genutzte Solarstrom für den Mieterstromzuschlag bestimmt, wenn eine Community Solar- und Windanlagen hat? Der Datensatz hat je Gebäude eine Anlage. | Anteilig nach Erzeugung im Intervall. | |
| O024 | Konzept, Seite 1: Netzentgelte, Umlagen und Abgaben fallen voll an. Der Datensatz bildet sie nicht ab und sagt nicht, ob Preise netto oder brutto sind; `is_reverse_charge` wird nicht verwendet. | Alle Beträge netto, ohne Netzentgelte, Umlagen und Steuern. | |
| O025 | Die Rundung ist nicht geregelt. Beispiel: Die gerundeten Rechnungen der drei Teilnehmer in B-MUL-01 ergeben zusammen 8,80 €, die gerundete Community-Summe 8,81 €. | Ungerundet je Intervall, auf Cent gerundet erst im Ergebnis. | |
| O026 | Das Messentgelt gilt einmal je Zähler für 24 Stunden (30 € pro Jahr geteilt durch 365). Eine Regel für andere Zeiträume fehlt. | Je Zähler und Kalendertag mit Teilnahme. | |
| O042 | Preise im Release: Höhe des Festpreises; Preis des Reststroms für Teilnehmer (erste Fassung: höherer Börsen-Einkaufspreis; Datensatz: 0,25 €/kWh); Bewertung des Überschusses (erste Fassung: Direktvermarktung zum Börsenverkaufspreis; Datensatz: Einspeisevergütung 0,07 €/kWh). | Festpreis 0,12 €/kWh (Anlagenankaufspreis), Reststrom 0,25 €/kWh fest (Verkaufspreis), Überschuss 0,07 €/kWh Einspeisevergütung (A048, A050). | |
| O044 | Ist der Dienstleistungsaufschlag von 15 % für alle Communities fest oder je Community oder Lieferant einstellbar? | Fester Wert 15 %, als Parameter hinterlegt, nur auf die Gemeinschaftsmenge (A049). | |

### Prognose

| ID | Lücke oder Widerspruch | Arbeitsannahme | Entscheidung |
| --- | --- | --- | --- |
| O043 | Prognose: Raster, Horizont und Format der Prognosewerte; wer die Push-API betreibt; Angabe der PV-Ausrichtung (Azimut in Grad oder Himmelsrichtung, Neigung). Die erste Fassung wollte zusätzlich den prognostizierten Verbrauch aller Teilnehmer und prognostizierte Einnahmen. Der Datensatz enthält weder Prognose noch Ausrichtung. | Prognose je Anlage im Intervallraster der Messwerte, Ausrichtung als Azimut in Grad mit Süden = 180°. Die API gehört nicht zu dieser App. Verbrauchsprognose und prognostizierte Einnahmen entfallen bis zur Klärung. Die Demo zeigt Prognosen erst mit Testdaten. | |

### Datensatz

| ID | Lücke oder Widerspruch | Arbeitsannahme | Entscheidung |
| --- | --- | --- | --- |
| O028 | Der Datensatz hat 60-Minuten-Werte für einen Tag (1.10.2026); das Konzept verlangt Viertelstunden. Für Viertelstunden sowie Woche, Monat und Jahr fehlen Testdaten. | Die App kann 15 und 60 Minuten (A034). Die Demo zeigt die Tagesansicht; längere Zeiträume erst mit zusätzlichen Testdaten. | |
| O029 | Die Zeitstempel sind UTC. Sollen Anzeige und Tagesgrenzen in UTC oder in Europe/Berlin laufen? Der Datensatztag entspricht dem 1.10. 02:00 Uhr bis 2.10. 02:00 Uhr MESZ. | Die Demo zeigt UTC. | |
| O030 | Entscheidung des Teams verlangt je Anlage und Teilnehmer eine eigene MaLo und MeLo. Der Datensatz verletzt das: Alle drei Anlagen haben dieselbe Einspeise-MaLo 51664053767, und die Bezugs-MaLo 50539603888 gehört in B-FRA-01 und B-CGN-01 zu verschiedenen Messlokationen. Außerdem enthalten `market_location_id_MaLo` (Stündliche Erzeugung) und `market_location_identifier` (Erzeuger Registrierung) Messlokations-IDs statt 11-stelliger MaLo, und die ID der Windanlage, DE00733257078200000000000000880945, hat 34 statt 33 Stellen. | Schlüssel für Anlagen und Messwerte ist die Messlokation zusammen mit `building_id`. MaLo werden nur angezeigt und nicht validiert. Ein korrigierter Datensatz wäre besser. | |
| O031 | `meter_number` ist in allen Zeilen leer; die erste Fassung verlangt die iMSys-Zählernummer. Das Messsystem `iMS/TF` ist nicht erklärt. | Die Zählernummer bleibt leer. Der Prüfpunkt iMSys gilt als positiv, wenn `metering_system` mit `iMS` beginnt. | |
| O032 | Je Gebäude gibt es eine Marktlokation mit Rolle `Residual Supply Market Location`, ohne Messwerte und ohne Erklärung. | Sie wird angezeigt und geht nicht in Berechnungen ein. | |
| O033 | Die Bedeutung von „MK7“ und der 17 leeren Spalten im Blatt MK7 Teilnehmer (unter anderem `plant_time_status`, `metering_point_header_status`, `billing_block`, `eog_notification`, `previous_supplier`) ist nicht erklärt. | MK7 steht für die Teilnahme an der Community. Leere Spalten werden nicht übernommen. | |
| O034 | Adressen: Die Postleitzahl steigt innerhalb derselben Adresse zeilenweise (B-FRA-01 60388 bis 60390, B-CGN-01 50859 bis 50864, B-MUL-01 45470 bis 45475). Dazu kommen Schreibweisen wie „Vilbelerlandstrß“ und „Müllheim an der Ruhr“ (45470 gehört zu Mülheim an der Ruhr), die Hausnummer doppelt im Straßenfeld und Leerzeichen am Ende. | Adressen werden nur angezeigt, Leerzeichen am Rand entfernt. Das Gebiet wird nicht aus der Adresse abgeleitet (O014). | |
| O035 | Die Varianten sind inhaltlich gleich. Die deutsche Fassung übersetzt Spaltennamen außer im Blatt Erzeuger Registrierung; die Feldbeschreibungen nennen in beiden Fassungen die englischen Namen. | Englische Feldnamen und Codes sind technisch maßgeblich. | |
