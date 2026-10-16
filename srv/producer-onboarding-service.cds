using { neo.energy as db } from '../db/schema';

@path: '/service/ProducerOnboardingService'
service ProducerOnboardingService @(requires: 'authenticated-user') {
  entity Plants as projection on db.Plants actions {
    action register() returns Plants;
    action confirmTakeover() returns Plants;
    action release() returns Plants;
  };
  entity PlantCheckpoints as projection on db.PlantCheckpoints;
}
