using { neo.energy as db } from '../db/schema';

@path: '/service/ProducerOnboardingService'
service ProducerOnboardingService @(requires: 'authenticated-user') {
  entity Plants as projection on db.Plants { *,
    virtual generationTodayKwh : Decimal(15,6),
    virtual communityTodayKwh : Decimal(15,6),
    virtual surplusTodayKwh : Decimal(15,6),
    virtual usageRatePercent : Decimal(5,2),
    virtual revenueAmount : Decimal(15,2),
    virtual communityName : String(120),
    virtual communityStatus : String(40),
    virtual communityFixedPricePerKwh : Decimal(9,4),
    virtual communityResidualPricePerKwh : Decimal(9,4),
    virtual communityPriceModel : String(30)
  } actions {
    action register() returns Plants;
    action confirmTakeover() returns Plants;
    action release() returns Plants;
  };

  entity PlantCheckpoints as projection on db.PlantCheckpoints;

  @readonly entity Communities as projection on db.Communities;
  @readonly entity CommunityIntervals as projection on db.CommunityIntervals;
  @readonly entity PaymentPositions as projection on db.PaymentPositions;
  @readonly entity MeterReadings as projection on db.MeterReadings;
};