import assert from 'node:assert/strict';
import test from 'node:test';
import cds from '@sap/cds';

test('loads the complete CAP model and exposes all planned services', async () => {
  const model = await cds.load(['db', 'srv', 'app']);
  const serviceNames = [
    'CommunityManagementService',
    'ProducerOnboardingService',
    'ParticipantOnboardingService',
    'AnalyticsService',
    'IntegrationService'
  ];

  for (const serviceName of serviceNames) {
    assert.ok(model.definitions[serviceName], `${serviceName} is missing`);
  }

  assert.ok(model.definitions['neo.energy.Communities']);
  assert.ok(model.definitions['neo.energy.PlantAssignments']);
  assert.ok(model.definitions['neo.energy.ParticipationApplications']);
});
