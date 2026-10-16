using { neo.energy as db } from '../db/schema';

@path: '/service/CommunityManagementService'
service CommunityManagementService @(requires: 'authenticated-user') {
  @odata.draft.enabled
  entity Communities as projection on db.Communities actions {
    action activateCommunity() returns Communities;
    action assignPlant(plantId : UUID, validFrom : Date) returns PlantAssignments;
    action sendInvitation(recipientEmail : String(255)) returns String;
  };

  entity Plants as projection on db.Plants;
  entity PlantCheckpoints as projection on db.PlantCheckpoints;
  entity PlantAssignments as projection on db.PlantAssignments;
  entity Participants as projection on db.Participants;
  entity ParticipationCheckpoints as projection on db.ParticipationCheckpoints;
  entity CommunityIntervals as projection on db.CommunityIntervals;
  entity PaymentPositions as projection on db.PaymentPositions;

  action getAssignableData() returns String;
}
