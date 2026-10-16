using { neo.energy as db } from '../db/schema';

@path: '/service/ParticipantOnboardingService'
service ParticipantOnboardingService @(requires: 'authenticated-user') {
  @odata.draft.enabled
  entity ParticipationApplications as projection on db.ParticipationApplications actions {
    action sendVerificationCode() returns String;
    action verifyEmail(code : String(6)) returns String;
    action calculateSavings() returns String;
    action lookupMarketLocation() returns String;
    action submitApplication() returns ParticipationApplications;
  };
  @readonly entity Communities as projection on db.Communities;
}
