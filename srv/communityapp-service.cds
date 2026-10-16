using { UUID } from '@sap/cds/common';
using community.app.einspeisung as db from '../db/schema';

type DailyEnergySummary : {
  productionKwh : Decimal(10,3);
  communityUsageKwh : Decimal(10,3);
  surplusKwh : Decimal(10,3);
  reststromKwh : Decimal(10,3);
  communityUsagePercent : Decimal(10,2);
  communityRevenue : Decimal(15,2);
  directMarketingRevenue : Decimal(15,2);
  totalRevenue : Decimal(15,2);
};

service CommunityAppService @(path: '/communityapp') {

  entity Communities as projection on db.Community;

  entity EnergyPlants as projection on db.EnergyPlant
    actions {
      action checkRequirements() returns db.RequirementCheck;
      action requestTakeover() returns db.BilanzkreisTakeover;
      action processExternalResult(isConfirmed : Boolean) returns db.ExternalProcessResult;
      action prepareCommunityAssignment() returns EnergyPlants;
    };

  entity RequirementChecks as projection on db.RequirementCheck;
  entity BilanzkreisTakeovers as projection on db.BilanzkreisTakeover;
  entity ExternalProcessResults as projection on db.ExternalProcessResult;
  entity EnergyMeasurements as projection on db.EnergyMeasurement;
  entity PricingConfigurations as projection on db.PricingConfiguration;

  action registerPlant(
    communityID : UUID,
    einspeiseMaLo : String(60),
    eeArt : String(20),
    leistungKw : Decimal(10,2),
    standort : String(100)
  ) returns EnergyPlants;

  function getDashboardContext(communityID : UUID) returns Communities;
  function getDailyEnergySummary(plantID : UUID) returns DailyEnergySummary;
}

annotate CommunityAppService.EnergyPlants with @(
  UI.HeaderInfo: {
    TypeName: 'Einspeiseanlage',
    TypeNamePlural: 'Einspeiseanlagen',
    Title: { Value: einspeiseMaLo },
    Description: { Value: eeArt }
  },
  UI.Identification: [
    { Value: einspeiseMaLo, Label: 'Einspeise-MaLo' },
    { Value: eeArt, Label: 'EE-Art' },
    { Value: leistungKw, Label: 'Leistung (kW)' },
    { Value: status, Label: 'Status' },
    { $Type: 'UI.DataFieldForAction', Action: 'CommunityAppService.checkRequirements', Label: 'Anlage prüfen' },
    { $Type: 'UI.DataFieldForAction', Action: 'CommunityAppService.requestTakeover', Label: 'Übernahme simulieren' },
    { $Type: 'UI.DataFieldForAction', Action: 'CommunityAppService.processExternalResult', Label: 'Externe Antwort verarbeiten' }
  ],
  UI.LineItem: [
    { Value: einspeiseMaLo, Label: 'Einspeise-MaLo' },
    { Value: eeArt, Label: 'EE-Art' },
    { Value: leistungKw, Label: 'Leistung (kW)' },
    { Value: status, Label: 'Status' },
    { $Type: 'UI.DataFieldForAction', Action: 'CommunityAppService.checkRequirements', Label: 'Anlage prüfen' }
  ],
  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'PlantDetailsFacet',
      Label: 'Einspeiseanlage',
      Target: '@UI.FieldGroup#PlantDetails'
    },
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'Aktion4Facet',
      Label: 'Aktion 4',
      Target: '@UI.FieldGroup#Aktion4Process'
    }
  ]
);

annotate CommunityAppService.EnergyPlants with @UI.FieldGroup #PlantDetails: {
  Label: 'Einspeiseanlage',
  Data: [
    { Value: einspeiseMaLo, Label: 'Einspeise-MaLo' },
    { Value: eeArt, Label: 'EE-Art' },
    { Value: leistungKw, Label: 'Leistung (kW)' },
    { Value: status, Label: 'Status' },
    { Value: standort, Label: 'Standort' }
  ]
};

annotate CommunityAppService.EnergyPlants with @UI.FieldGroup #Aktion4Process: {
  Label: 'Aktion 4',
  Data: [
    { Value: status, Label: 'Aktion-4-Status' },
    { Value: einspeiseMaLo, Label: 'Relevante Einspeise-MaLo für S2' }
  ]
};

annotate CommunityAppService.Communities with @(
  UI.HeaderInfo: {
    TypeName: 'Community',
    TypeNamePlural: 'Communities',
    Title: { Value: name },
    Description: { Value: status }
  },
  UI.LineItem: [
    { Value: name, Label: 'Community' },
    { Value: status, Label: 'Status' },
    { Value: operatorName, Label: 'Anlagenbetreiber' },
    { Value: participantCount, Label: 'Teilnehmer' }
  ],
  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'CommunityContextFacet',
      Label: 'Community',
      Target: '@UI.FieldGroup#CommunityContext'
    },
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'GridContextFacet',
      Label: 'Netz & Bilanzierung',
      Target: '@UI.FieldGroup#NetzBilanzierung'
    },
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'MeteringContextFacet',
      Label: 'Messung',
      Target: '@UI.FieldGroup#Messung'
    }
  ]
);

annotate CommunityAppService.Communities with @UI.FieldGroup #CommunityContext: {
  Label: 'Community',
  Data: [
    { Value: name, Label: 'Community' },
    { Value: status, Label: 'Status' },
    { Value: operatorName, Label: 'Anlagenbetreiber' },
    { Value: participantCount, Label: 'Teilnehmer' }
  ]
};

annotate CommunityAppService.Communities with @UI.FieldGroup #NetzBilanzierung: {
  Label: 'Netz & Bilanzierung',
  Data: [
    { Value: bilanzierungsgebietId, Label: 'Bilanzierungsgebiet' },
    { Value: bilanzkreisId, Label: 'Bilanzkreis' }
  ]
};

annotate CommunityAppService.Communities with @UI.FieldGroup #Messung: {
  Label: 'Messung',
  Data: [
    { Value: messlokationId, Label: 'Messlokation' },
    { Value: meteringSystem, Label: 'Messsystem' },
    { Value: meteringOperator, Label: 'Messstellenbetreiber' }
  ]
};

