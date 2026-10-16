namespace community.app.einspeisung;

using { cuid, managed } from '@sap/cds/common';

type PlantStatus : String(40) enum {
  InPruefung = 'In Prüfung';
  BereitZurZuordnung = 'Bereit zur Zuordnung';
  Abgelehnt = 'Abgelehnt';
  Aktiv = 'Aktiv';
};

type RequirementStatus : String(20) enum {
  Erfuellt = 'erfüllt';
  Offen = 'offen';
  Abgelehnt = 'abgelehnt';
};

type ExternalResponseStatus : String(20) enum {
  Bestaetigt = 'bestätigt';
  Abgelehnt = 'abgelehnt';
  Offen = 'offen';
};

type DataSource : String(20) enum {
  Demo = 'Demo';
  Integrated = 'Integrated';
};

entity Community : cuid, managed {
  name : String(100);
  status : String(20);
  operatorName : String(100);
  participantCount : Integer;
  bilanzierungsgebietId : String(40);
  bilanzkreisId : String(40);
  messlokationId : String(60);
  meteringSystem : String(20);
  meteringOperator : String(100);
}

entity EnergyPlant : cuid, managed {
  community : Association to Community;
  einspeiseMaLo : String(60);
  eeArt : String(20);
  leistungKw : Decimal(10,2);
  status : PlantStatus;
  standort : String(100);
}

entity RequirementCheck : cuid, managed {
  plant : Association to EnergyPlant;
  eeAnlageStatus : RequirementStatus;
  gebietStatus : RequirementStatus;
  iMSysStatus : RequirementStatus;
  checkedAt : Timestamp;
}

entity BilanzkreisTakeover : cuid, managed {
  plant : Association to EnergyPlant;
  status : String(30);
  confirmedAt : Timestamp;
  confirmedByRole : String(40);
}

entity ExternalProcessResult : cuid, managed {
  plant : Association to EnergyPlant;
  responseStatus : ExternalResponseStatus;
  released : Boolean;
  resultMessage : String(255);
  receivedAt : Timestamp;
}

entity EnergyMeasurement : cuid, managed {
  // Supports 15-minute energy data. Überschuss is the producer-side remainder
  // after community allocation and is intentionally distinct from Reststrom.
  plant : Association to EnergyPlant;
  intervalStart : Timestamp;
  intervalEnd : Timestamp;
  productionKwh : Decimal(10,3);
  communityUsageKwh : Decimal(10,3);
  surplusKwh : Decimal(10,3);
  reststromKwh : Decimal(10,3);
  dataSource : DataSource;
}

entity PricingConfiguration : cuid, managed {
  community : Association to Community;
  communityCompensationPerKwh : Decimal(10,4);
  directMarketingPricePerKwh : Decimal(10,4);
  currency : String(5);
  validFrom : Date;
}
