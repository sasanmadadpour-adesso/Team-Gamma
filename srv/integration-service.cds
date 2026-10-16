using { neo.energy as db } from '../db/schema';

@path: '/service/IntegrationService'
service IntegrationService @(requires: 'IntegrationClient') {
  entity MeterReadings as projection on db.MeterReadings;
  entity ForecastValues as projection on db.ForecastValues;
}
