# 06 Technische Entscheidungen

## CAP statt paralleler API

OData-V4-Serviceprojektionen, Generic Providers und CDS-Actions bilden die öffentliche Schnittstelle. Eigene REST-CRUD-Controller werden nicht verwendet.

## Deklarativ vor imperativ

Pflichtwerte, Draft und UI-Layout werden über CDS-Anmerkungen modelliert. Handler bleiben auf echte Domänenlogik wie atomare Anlagenzuordnung und OTP-/Submit-Prüfungen begrenzt.

## Transaktionale Zuordnung

`assignPlant` prüft Community, Anlage, Status, Gebiet, Bilanzkreis und iMSys und schreibt Assignment, VZP-relevante Daten sowie Statusänderungen innerhalb der CAP-Transaktion. Fehler führen zu keinem Teilzustand.

## Mock statt Fake-Produktivintegration

Die Anforderungen verlangen im Hackathon eine Simulation. Deshalb werden externe Systeme nicht als erfolgreiche reale VNB-/S/4HANA-Prozesse ausgegeben.
