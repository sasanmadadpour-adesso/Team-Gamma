# Auftrag: Energy-Sharing-App "Verbraucheranlage anmelden" mit SAP CAP und Fiori Elements

Baue sofort eine vollständige, lauffähige Anwendung nach dieser Beschreibung. Stelle
keine Rückfragen, lege keinen Plan zur Freigabe vor und erkläre deinen Code nicht.
Schreibe keine automatisierten Tests. Wenn etwas nicht beschrieben ist, triff eine
sinnvolle Entscheidung und arbeite weiter.

## 0. Vorgaben zur Technik (verbindlich)

- Vorgegeben sind SAP CAP (Node.js), SAP BTP als Zielplattform und eine Oberfläche mit
  SAP Fiori Elements (OData V4, List Report und Object Page). Verwende kein React,
  kein Vite und keine Freestyle-UI.
- Halte dich an die AGENTS.md im Repository und nutze die vorhandenen Skills unter
  .opencode/skills, insbesondere cap-project-scaffold, cap-developer und
  fiori-elements.
- Arbeite im Ordner D:\Vibe coding challenge\Team-Gamma.
- Wegen der PowerShell-Richtlinie rufst du npm immer als "npm.cmd" und npx als
  "npx.cmd" auf.
- Installiere @sap/cds-dk nicht global, sondern als devDependency, und rufe die CLI
  mit "npx.cmd cds" auf.
- Die Fiori-Elements-App liegt im Ordner app/ und wird direkt von CAP ausgeliefert.
  Lade SAPUI5 in der index.html vom CDN (https://ui5.sap.com), damit kein separater
  UI5-Build nötig ist und "npx.cmd cds watch" zum Starten genügt.
- Die Datenbank ist SQLite im Arbeitsspeicher, die Testdaten kommen aus CSV-Dateien
  in db/data.
- Die gesamte Oberfläche ist auf Deutsch (i18n-Datei auf Deutsch).
- Am Ende führst du "npm.cmd install" und "npx.cmd cds compile srv --to edmx" aus,
  behebst alle Fehler und nennst mir nur den Startbefehl und die Adresse der
  Fiori-App im Browser.

## 1. Fachlicher Hintergrund

Energy Sharing nach §42c EnWG bedeutet, dass mehrere Teilnehmer lokal erzeugten
Strom aus erneuerbaren Energien über das öffentliche Netz teilen. Ein Dienstleister,
der gleichzeitig Lieferant ist, betreibt eine Community aus Erzeugungsanlagen und
Verbrauchern. Jeder Verbraucher erhält pro Viertelstunde einen Anteil am erzeugten
Strom nach einem Aufteilungsschlüssel. Was die Community nicht abdeckt, ist
Reststrom. Jeder Teilnehmer braucht ein intelligentes Messsystem (Smart Meter),
weil viertelstundengenau gemessen wird. Die Marktlokations-ID (MaLo-ID) ist eine
11-stellige Zahl, die eine Verbrauchsstelle eindeutig kennzeichnet.

Die App bildet nur einen Teilprozess ab: Ein Verbraucher meldet sich bei einer
bereits bestehenden, aktiven Community an. Die Community und ihre Erzeugungsanlage
existieren schon und werden als feste Testdaten angelegt.

## 2. Architektur

Die externen Systeme SAP BTP, SAP Cloud, SAP S/4HANA und Lumenaza existieren nicht
wirklich. Simuliere sie als vier getrennte JavaScript-Module in srv/mocks/:
sapBtp.js, sapCloud.js, s4hana.js und lumenaza.js. Die Service-Handler der
CAP-Anwendung rufen ausschließlich diese Module auf und greifen nie direkt auf
Mock-Stammdaten zu. Jeder Aufruf eines Mock-Moduls schreibt einen Eintrag in das
Systemprotokoll der jeweiligen Anmeldung (siehe Abschnitt 6).

## 3. Datenmodell (db/schema.cds)

- Communities: Name, Status, Aufteilungsschlüssel (Text), Bilanzkreis-ID,
  Erzeugungsanlage (Name, Leistung in kWp), Paketpreise und Grundversorgungspreise.
- MaloStammdaten (Mock-Daten der externen Systeme): MaLo-ID, bereits registriert
  (Boolean), Vertragsart ("keiner", "kurzfristig", "langfristig"), Anbieter des
  bestehenden Vertrags, gültig in SAP Cloud (Boolean), Demo-Bezeichnung und
  Demo-Hinweis.
- Anmeldungen (cuid, managed): MaLo-ID, Status, aktuelle Meldung, Kritikalität der
  Meldung, Vorname, Nachname, E-Mail, Jahresverbrauch in kWh, bestehender Vertrag
  (Art und Anbieter), Bilanzkreis-ID, Kundennummer, Vertragsnummer, geteilter Strom
  und Reststrom pro Jahr in kWh, Monatskosten, Jahreskosten, Jahreskosten
  Grundversorgung, Ersparnis pro Jahr, Kostenformel, Unterschrift (Name) und
  Zeitpunkt der Unterschrift.
- Protokolleintraege (Composition of many in Anmeldungen): Zeitpunkt, System,
  Funktion, Ergebnis.

Der Status einer Anmeldung ist einer der folgenden Werte: NEU, SMART_METER_FRAGE,
EINBAU_FRAGE, REGISTRIERUNG, VERTRAG_LANGFRISTIG_FRAGE, LIEFERANMELDUNG, ANGEBOT,
ABLEHNUNG_BESTAETIGEN, UNTERSCHRIFT, ABGESCHLOSSEN, ABGEBROCHEN.

## 4. Testdaten (CSV in db/data)

Community: Name "Sonnenquartier Dortmund-Hörde", Status "aktiv",
Aufteilungsschlüssel "statisch, 20 % der Erzeugung je Teilnehmer",
Bilanzkreis-ID "11XDEMO-BK-0001", Erzeugungsanlage "PV-Anlage Schulzentrum" mit
99 kWp.

Preise Energy-Sharing-Paket: Grundpreis 8,00 € pro Monat, Arbeitspreis für geteilten
Strom 18,00 ct/kWh, Arbeitspreis für Reststrom 32,00 ct/kWh.
Preise Grundversorgung zum Vergleich: Grundpreis 14,00 € pro Monat, Arbeitspreis
36,20 ct/kWh.

MaloStammdaten:
- 51238047659: bereits registriert. Demo-Bezeichnung "Bereits registriert".
- 52345678901: neu, kein Vertrag, gültig. "Neu ohne Vertrag", Hinweis "Alle Fragen
  mit Ja beantworten".
- 53456789012: neu, kurzfristiger Vertrag bei "Stadtwerke Muster", gültig.
  "Kurzfristiger Vertrag".
- 54567890123: neu, langfristiger Vertrag bei "Energie Beispiel AG", gültig.
  "Langfristiger Vertrag", Hinweis "Beendigung mit Ja oder Nein testen".
- 55678901234: neu, kein Vertrag, gültig. "Ohne Smart Meter", Hinweis
  "Smart-Meter-Frage mit Nein beantworten".
- 56789012345: neu, kein Vertrag, in SAP Cloud ungültig. "Ungültig in SAP Cloud".

Jede andere MaLo-ID gilt als neu, ohne Vertrag und gültig, sofern sie aus genau 11
Ziffern besteht. Ist sie nicht 11-stellig, lehnt der Service das Anlegen mit der
Fehlermeldung "Bitte geben Sie eine 11-stellige MaLo-ID ein." ab.

## 5. Mock-Module und ihre Funktionen

SAP BTP (sapBtp.js): checkMaloRegistered(maloId), getActiveCommunity(),
getExistingContract(maloId), terminateContract(maloId),
requestSmartMeterInstallation(maloId), submitSupplyRegistration(maloId, bkId).

Lumenaza (lumenaza.js): getBalancingGroupId(communityName).

SAP Cloud (sapCloud.js): validateMalo(maloId) und createCustomer(customerData). Die
Kundennummer hat das Format "K-" plus sechs Ziffern, die Vertragsnummer das Format
"V-2026-" plus vier Ziffern.

SAP S/4HANA (s4hana.js): buildCostFormula(community),
processMeterReadings(annualConsumptionKwh) und createBilling(result, community).

Berechnung in processMeterReadings: Erzeuge einen typischen Tag mit 96
Viertelstundenwerten. Die Erzeugung der PV-Anlage folgt einer Glockenkurve zwischen
6 und 20 Uhr mit dem Maximum um 13 Uhr, die Tageserzeugung beträgt 270 kWh. Der
Verbrauch des Haushalts folgt einem Profil mit einer kleinen Spitze morgens und
einer größeren Spitze abends, der Tagesverbrauch ist der Jahresverbrauch geteilt
durch 365. Der zugeteilte Anteil je Viertelstunde ist 20 % der Erzeugung. Der
geteilte Strom je Viertelstunde ist das Minimum aus Verbrauch und zugeteiltem Anteil,
der Reststrom ist Verbrauch minus geteilter Strom. Summiere über den Tag und
multipliziere mit 365.

Berechnung in createBilling: Jahreskosten = 12 × Grundpreis + geteilter Strom ×
18,00 ct + Reststrom × 32,00 ct. Monatskosten = Jahreskosten / 12. Jahreskosten
Grundversorgung = 12 × 14,00 € + Jahresverbrauch × 36,20 ct. Ersparnis = Differenz.
Alle Beträge in Euro mit zwei Nachkommastellen.

## 6. Systemprotokoll

Jeder Mock-Aufruf erzeugt einen Protokolleintrag mit Zeitpunkt, System (SAP BTP,
SAP Cloud, SAP S/4HANA oder Lumenaza), Funktionsname und Ergebnis in Kurzform, zum
Beispiel Funktion "checkMaloRegistered(52345678901)" und Ergebnis "nicht
registriert". Die Einträge erscheinen auf der Object Page als Tabelle im Abschnitt
"Systemprotokoll", sortiert nach Zeitpunkt. So sieht die Jury, welches System wann
beteiligt ist.

## 7. Ablauf als Aktionen

Der Service AnmeldungService stellt Anmeldungen (draft-enabled zum Anlegen),
Protokolleintraege, MaloStammdaten (nur lesend) und Communities (nur lesend) bereit.
Der Nutzer legt in der List Report eine neue Anmeldung an und gibt nur die MaLo-ID
ein. Das Feld MaLo-ID hat eine Wertehilfe auf MaloStammdaten, die Demo-Bezeichnung
und Demo-Hinweis anzeigt. Nach dem Sichern steht die Anmeldung im Status NEU.

Jeder Prozessschritt ist eine gebundene Aktion auf Anmeldungen. Jede Aktion ist nur
im passenden Status verfügbar (über @Core.OperationAvailable), sodass auf der
Object Page immer nur die Knöpfe des aktuellen Schritts aktiv sind. Jede Aktion
setzt den neuen Status, schreibt die Meldung (wörtlich wie unten in
Anführungszeichen) in das Feld "aktuelle Meldung" und setzt die Kritikalität
(Erfolg grün, Warnung gelb, Fehler rot, neutral). Endet der Prozess, wird der Status
ABGEBROCHEN oder ABGESCHLOSSEN.

1. Aktion "Anmeldung prüfen" (Status NEU): SAP BTP prüft checkMaloRegistered. Ist
   die MaLo-ID registriert: ABGEBROCHEN mit "Die MaLo-ID oder die Verbrauchsanlage
   ist bereits im System registriert." Sonst SMART_METER_FRAGE mit "Verfügen Sie
   über ein intelligentes Messsystem (Smart Meter)?"

2. Aktionen "Smart Meter vorhanden" und "Kein Smart Meter" (SMART_METER_FRAGE):
   Vorhanden führt zu REGISTRIERUNG mit "Möchten Sie sich als neuer Nutzer
   registrieren?". Kein Smart Meter führt zu EINBAU_FRAGE mit "Möchten Sie ein
   intelligentes Messsystem einbauen lassen?"
   Aktionen "Einbau anfragen" und "Kein Einbau" (EINBAU_FRAGE): Einbau anfragen ruft
   requestSmartMeterInstallation auf und beendet mit "Ihre Anfrage zum Einbau eines
   intelligenten Messsystems wurde übermittelt. Nach dem Einbau können Sie sich
   erneut anmelden." Kein Einbau beendet mit "Ohne intelligentes Messsystem ist eine
   Teilnahme am Energy Sharing leider nicht möglich."

3. Aktion "Registrieren" (REGISTRIERUNG) mit den Pflichtparametern Vorname, Nachname,
   E-Mail und Jahresverbrauch in kWh (Vorschlagswert 2500). Aktion "Nicht
   registrieren" beendet mit "Die Anmeldung wurde abgebrochen."
   Direkt nach dem Registrieren prüft der Handler mit getExistingContract den
   bestehenden Vertrag:
   - kein Vertrag: weiter zu LIEFERANMELDUNG mit "Ihre Daten sind erfasst. Bitte
     senden Sie die Lieferanmeldung."
   - kurzfristig: terminateContract aufrufen, weiter zu LIEFERANMELDUNG mit "Ihr
     kurzfristiger Vertrag bei [Anbieter] wird gekündigt. Bitte senden Sie die
     Lieferanmeldung."
   - langfristig: VERTRAG_LANGFRISTIG_FRAGE mit "Sie haben einen langfristigen
     Stromvertrag bei [Anbieter]. Möchten Sie diesen vorzeitig beenden?"

4. Aktionen "Vertrag vorzeitig beenden" und "Vertrag behalten"
   (VERTRAG_LANGFRISTIG_FRAGE): Beenden ruft terminateContract auf und führt zu
   LIEFERANMELDUNG. Behalten beendet mit "Die Anmeldung wurde abgebrochen."

5. Aktion "Lieferanmeldung senden" (LIEFERANMELDUNG): Lumenaza liefert mit
   getBalancingGroupId die Bilanzkreis-ID, SAP BTP erhält mit
   submitSupplyRegistration die Lieferanmeldung. Danach prüft SAP Cloud mit
   validateMalo die MaLo-ID. Ist sie ungültig: ABGEBROCHEN mit "Bei der Anmeldung
   ist ein Fehler aufgetreten. Die MaLo-ID ist ungültig." Ist sie gültig, ruft der
   Handler processMeterReadings und createBilling auf, speichert die Werte und setzt
   ANGEBOT mit "Ihre Ersparnis: [Betrag] € pro Jahr. Möchten Sie den Vertrag
   abschließen?"

6. Aktionen "Vertrag abschließen" und "Vertrag ablehnen" (ANGEBOT): Abschließen führt
   zu UNTERSCHRIFT mit "Bitte unterschreiben Sie den Vertrag digital." Ablehnen führt
   zu ABLEHNUNG_BESTAETIGEN mit "Sind Sie sicher, dass Sie keinen Vertrag bei uns
   abschließen möchten?"
   Aktionen "Ja, ich bin sicher" und "Nein, zurück zum Angebot"
   (ABLEHNUNG_BESTAETIGEN): Die erste beendet mit "Die Anmeldung wurde beendet. Es
   wurde kein Vertrag abgeschlossen." Die zweite führt zurück zu ANGEBOT mit der
   Angebotsmeldung.

7. Aktion "Verbindlich unterschreiben" (UNTERSCHRIFT) mit den Pflichtparametern
   "Unterschrift (vollständiger Name)" und "Ich unterschreibe den Vertrag
   verbindlich" (Boolean, muss wahr sein, sonst Fehlermeldung). Danach legt SAP Cloud
   mit createCustomer den Kunden an, SAP S/4HANA erzeugt mit buildCostFormula die
   Kostenformel, und der Status wird ABGESCHLOSSEN mit "Willkommen in der Community
   Sonnenquartier!"

## 8. Oberfläche (Annotationen in app/ bzw. srv/annotations.cds)

List Report "Anmeldungen": Spalten MaLo-ID, Name, Status, aktuelle Meldung (mit
Kritikalität), Monatskosten. Titel der App: "Energy Sharing · Verbraucheranmeldung".

Object Page einer Anmeldung:
- Kopfbereich: MaLo-ID als Titel, Status und aktuelle Meldung mit Kritikalität
  deutlich sichtbar. Im Kopf steht als DataPoint groß die Monatskosten mit der
  Beschriftung "pro Monat" und daneben kleiner die Jahreskosten mit "pro Jahr"
  (nur gefüllt, wenn berechnet).
- Abschnitt "Kundendaten": Vorname, Nachname, E-Mail, Jahresverbrauch.
- Abschnitt "Bestehender Vertrag": Vertragsart und Anbieter.
- Abschnitt "Angebot": Paketpreise (Grundpreis, Arbeitspreis geteilter Strom,
  Arbeitspreis Reststrom, Jahreskosten) neben Grundversorgung (Grundpreis,
  Arbeitspreis, Jahreskosten) und die Ersparnis pro Jahr hervorgehoben.
- Abschnitt "Vertrag": Kundennummer, Vertragsnummer, Community, Bilanzkreis-ID,
  geteilter Strom und Reststrom pro Jahr in kWh, Kostenformel, Unterschrift und
  Zeitpunkt.
- Abschnitt "Systemprotokoll": Tabelle der Protokolleinträge.
- Alle Aktionen aus Abschnitt 7 erscheinen als Knöpfe im Kopfbereich der Object
  Page und sind nur im passenden Status aktiv.


AUCH wenn die eingegebene Maloid nicht besteht  dann muss eine fehlermeldung angezeigt "MALOID BESTEHT NICHT" 

AUCH wir werden eine malo id festlegen , jedes Mal dass die eingegeben wir muss sie als gültig gelten : 12345678 

AUCH bei Registrierung der kunde muss er zuerst gefragt werden ob er sich anmelden will oder nicht dafür soll die Möglichkeit bestehen mit 2 widgets ja oder nein es bestätigen zu können 