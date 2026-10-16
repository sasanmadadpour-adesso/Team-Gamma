using { neo.energy as db } from '../db/schema';

@path: '/service/AnalyticsService'
service AnalyticsService @(requires: 'authenticated-user') {
  @readonly entity CommunityIntervals as projection on db.CommunityIntervals;
  @readonly entity ParticipantAllocations as projection on db.ParticipantAllocations;
  @readonly entity PaymentPositions as projection on db.PaymentPositions;
}
