using { cuid, managed } from '@sap/cds/common';

namespace neo.energy;

type CommunityStatus : String enum {
  DRAFT;
  READY_FOR_ACTIVATION;
  ACTIVE;
};

type PlantStatus : String enum {
  REGISTERED;
  IN_REVIEW;
  ACTIVE;
  READY_FOR_ASSIGNMENT;
  ASSIGNED;
  REJECTED;
};

type ParticipationStatus : String enum {
  REGISTERED;
  IN_REVIEW;
  ACTIVE;
  REJECTED;
  NOT_PARTICIPATING;
};

type CheckStatus : String enum {
  OPEN;
  POSITIVE;
  NEGATIVE;
};

type IntervalType : String enum {
  MINUTES_15;
  HOUR;
};

entity Suppliers : cuid, managed {
  name        : String(120) @mandatory;
  operatorKey : String(80) @mandatory;
  balancingGroups : Composition of many BalancingGroups on balancingGroups.supplier = $self;
  communities : Association to many Communities on communities.supplier = $self;
}

entity BalancingGroups : cuid, managed {
  supplier : Association to Suppliers not null;
  bkId     : String(40) @mandatory;
  name     : String(120);
}

entity Communities : cuid, managed {
  name              : String(120) @mandatory;
  status            : CommunityStatus default 'DRAFT';
  visibility        : String(20) default 'OPEN';
  participationCode : String(40);
  contactName       : String(120) @mandatory;
  contactEmail      : String(255);
  location          : String(120) @mandatory;
  balancingArea     : String(80) @mandatory;
  bkId              : String(40) @mandatory;
  supplier          : Association to Suppliers not null;
  priceModel        : String(30) default 'FIXED_PRICE';
  fixedPricePerKwh  : Decimal(9,4) default 0.1200;
  residualPricePerKwh : Decimal(9,4) default 0.2500;
  serviceMarkup     : Decimal(5,4) default 0.1500;
  allocationKey     : String(60) default 'CONSUMPTION_PER_INTERVAL';
  validFrom         : Date;
  validTo           : Date;
  servicePostalCode : String(5);
  plants            : Association to many Plants on plants.community = $self;
  participants      : Association to many Participants on participants.community = $self;
  assignments       : Composition of many PlantAssignments on assignments.community = $self;
  intervals         : Association to many CommunityIntervals on intervals.community = $self;
}

entity Plants : cuid, managed {
  operatorName      : String(120) @mandatory;
  email             : String(255);
  productionType    : String(30) @mandatory;
  capacityKw        : Decimal(11,2) @mandatory;
  azimuth           : Decimal(5,2);
  address           : String(255);
  buildingId        : String(40) @mandatory;
  marketLocationId  : String(80) @mandatory;
  meteringLocationId : String(80);
  meterNumber       : String(80);
  meteringSystem    : String(40);
  balancingArea     : String(80) @mandatory;
  bkId              : String(40) @mandatory;
  imsysActive       : Boolean default false;
  status            : PlantStatus default 'REGISTERED';
  desiredStart      : Date;
  community         : Association to Communities;
  checkpoints       : Composition of many PlantCheckpoints on checkpoints.plant = $self;
  readings          : Association to many MeterReadings on readings.plant = $self;
  forecasts         : Association to many ForecastValues on forecasts.plant = $self;
}

entity PlantCheckpoints : cuid, managed {
  plant       : Association to Plants not null;
  code        : String(60) @mandatory;
  label       : String(160) @mandatory;
  status      : CheckStatus default 'OPEN';
  reason      : String(500);
  checkedAt   : Timestamp;
}

entity Participants : cuid, managed {
  firstName          : String(80);
  lastName           : String(80);
  companyName        : String(120);
  email              : String(255);
  customerType       : String(30) default 'HOUSEHOLD';
  buildingId         : String(40) @mandatory;
  marketLocationId   : String(80) @mandatory;
  meteringLocationId : String(80) @mandatory;
  meterNumber        : String(80);
  meteringSystem     : String(40);
  imsysActive        : Boolean default false;
  mk7Participation   : Boolean default true;
  balancingArea      : String(80) @mandatory;
  contractConfirmed  : Boolean default false;
  consentConfirmed   : Boolean default false;
  status             : ParticipationStatus default 'REGISTERED';
  validFrom          : Date;
  validTo            : Date;
  community          : Association to Communities;
  checkpoints        : Composition of many ParticipationCheckpoints on checkpoints.participant = $self;
  readings           : Association to many MeterReadings on readings.participant = $self;
  allocations        : Association to many ParticipantAllocations on allocations.participant = $self;
}

entity ParticipationCheckpoints : cuid, managed {
  participant : Association to Participants not null;
  code        : String(60) @mandatory;
  label       : String(160) @mandatory;
  status      : CheckStatus default 'OPEN';
  reason      : String(500);
  checkedAt   : Timestamp;
}

entity PlantAssignments : cuid, managed {
  community : Association to Communities not null;
  plant     : Association to Plants not null;
  validFrom : Date @mandatory;
  vzpId     : String(80) @mandatory;
  s4Status  : String(30) default 'ACKNOWLEDGED';
}

entity VirtualMeteringPointRelationships : cuid, managed {
  community : Association to Communities not null;
  plant     : Association to Plants;
  participant : Association to Participants;
  vzpId     : String(80) @mandatory;
  validFrom : Date @mandatory;
  validTo   : Date;
}

entity MeterReadings : cuid, managed {
  community  : Association to Communities;
  plant      : Association to Plants;
  participant : Association to Participants;
  intervalStart : Timestamp @mandatory;
  intervalEnd   : Timestamp @mandatory;
  quantityKwh   : Decimal(15,6) @mandatory;
  unit          : String(10) default 'kWh';
  intervalType  : IntervalType @mandatory;
}

entity ForecastValues : cuid, managed {
  plant        : Association to Plants not null;
  intervalStart : Timestamp @mandatory;
  intervalEnd   : Timestamp @mandatory;
  quantityKwh   : Decimal(15,6) @mandatory;
  intervalType  : IntervalType @mandatory;
}

entity CommunityIntervals : cuid, managed {
  community       : Association to Communities not null;
  intervalStart   : Timestamp @mandatory;
  intervalEnd     : Timestamp @mandatory;
  generationKwh   : Decimal(15,6) default 0;
  forecastKwh     : Decimal(15,6) default 0;
  consumptionKwh  : Decimal(15,6) default 0;
  communityKwh    : Decimal(15,6) default 0;
  surplusKwh      : Decimal(15,6) default 0;
  residualKwh     : Decimal(15,6) default 0;
  intervalType    : IntervalType @mandatory;
}

entity ParticipantAllocations : cuid, managed {
  participant    : Association to Participants not null;
  community      : Association to Communities not null;
  intervalStart  : Timestamp @mandatory;
  intervalEnd    : Timestamp @mandatory;
  consumptionKwh : Decimal(15,6) default 0;
  communityKwh   : Decimal(15,6) default 0;
  residualKwh    : Decimal(15,6) default 0;
  fixedPrice     : Decimal(9,4);
  amount         : Decimal(15,2);
}

entity PaymentPositions : cuid, managed {
  community    : Association to Communities not null;
  participant  : Association to Participants;
  plant        : Association to Plants;
  positionType : String(50) @mandatory;
  quantityKwh  : Decimal(15,6);
  ratePerKwh   : Decimal(9,4);
  amount       : Decimal(15,2);
  payer        : String(120);
  payee        : String(120);
  periodStart  : Date;
  periodEnd    : Date;
}

entity ParticipationApplications : cuid, managed {
  status             : String(40) default 'DRAFT';
  currentPhase       : String(40) default 'PREREQUISITES';
  currentSubphase    : String(40);
  customerType       : String(20) default 'PRIVATE';
  firstName          : String(80);
  lastName           : String(80);
  companyName        : String(120);
  legalForm          : String(80);
  representativeName : String(160);
  email              : String(255);
  phone              : String(40);
  street             : String(120);
  houseNumber        : String(20);
  postalCode         : String(5);
  city               : String(120);
  consumptionAddressDifferent : Boolean default false;
  consumptionStreet  : String(120);
  consumptionHouseNumber : String(20);
  consumptionPostalCode : String(5);
  consumptionCity    : String(120);
  annualConsumption  : Decimal(12,2);
  monthlyCost        : Decimal(12,2);
  existingElectricityContract : Boolean;
  currentSupplier    : String(120);
  contractNumber     : String(120);
  cancellationOrder  : Boolean;
  cancellationPowerOfAttorney : Boolean default false;
  desiredStart       : Date;
  marketLocationId   : String(20);
  marketLocationStatus : String(40) default 'OPEN';
  meteringLocationId : String(80);
  imsysDeclared      : Boolean;
  imsysCheckStatus   : String(40) default 'PENDING';
  residualSupplier   : String(120);
  residualSupplyStatus : String(40) default 'OPEN';
  residualSupplyNextStep : String(300);
  community          : Association to Communities;
  emailVerified      : Boolean default false;
  verificationCodeHash : String(128);
  verificationCodeExpiresAt : Timestamp;
  verificationAvailableAt : Timestamp;
  contractConsent    : Boolean default false;
  usageConsent       : Boolean default false;
  sepaConsent        : Boolean default false;
  accountHolder      : String(160);
  iban               : String(34);
  sepaMandateVersion : String(30);
  signatureName      : String(160);
  signatureMethod    : String(30);
  signedAt           : Timestamp;
  termsVersion       : String(30);
  offerVersion       : String(30);
  calculatorUsed     : Boolean default false;
  calculatorAnnualSaving : Decimal(12,2);
  resumeMessage      : String(300);
  referenceNumber    : String(40);
  submittedAt        : Timestamp;
  message            : String(500);
}
