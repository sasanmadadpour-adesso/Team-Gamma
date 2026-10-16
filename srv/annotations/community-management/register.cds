using CommunityManagementService from '../../community-management-service';

annotate CommunityManagementService.Communities with @(
  UI.HeaderInfo: {
    TypeName: 'Community',
    TypeNamePlural: 'Communities',
    Title: { Value: name },
    Description: { Value: location }
  },
  UI.LineItem: [
    { Value: name },
    { Value: status },
    { Value: balancingArea },
    { Value: fixedPricePerKwh },
    { Value: allocationKey }
  ],
  UI.SelectionFields: [ status, balancingArea ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Konditionen', Target: '@UI.FieldGroup#conditions' },
    { $Type: 'UI.ReferenceFacet', Label: 'Einspeiseanlagen', Target: 'plants/@UI.LineItem' },
    { $Type: 'UI.ReferenceFacet', Label: 'Teilnehmer', Target: 'participants/@UI.LineItem' },
    { $Type: 'UI.ReferenceFacet', Label: 'Energie', Target: 'intervals/@UI.LineItem' }
  ],
  UI.FieldGroup #conditions: {
    Data: [
      { Value: priceModel },
      { Value: fixedPricePerKwh },
      { Value: residualPricePerKwh },
      { Value: serviceMarkup },
      { Value: allocationKey },
      { Value: bkId }
    ]
  }
);

annotate CommunityManagementService.Plants with @(
  UI.HeaderInfo: { TypeName: 'Einspeiseanlage', TypeNamePlural: 'Einspeiseanlagen', Title: { Value: operatorName }, Description: { Value: productionType } },
  UI.LineItem: [
    { Value: operatorName },
    { Value: productionType },
    { Value: capacityKw },
    { Value: status },
    { Value: buildingId },
    { Value: balancingArea }
  ]
);

annotate CommunityManagementService.Participants with @(
  UI.LineItem: [
    { Value: firstName },
    { Value: lastName },
    { Value: customerType },
    { Value: status },
    { Value: buildingId },
    { Value: mk7Participation }
  ]
);

annotate CommunityManagementService.Communities with {
  status @Common.Label: 'Status';
  fixedPricePerKwh @Common.Label: 'Festpreis pro kWh';
  residualPricePerKwh @Common.Label: 'Reststrompreis pro kWh';
  balancingArea @Common.Label: 'Bilanzierungsgebiet';
  bkId @Common.Label: 'Bilanzkreis-ID';
};
