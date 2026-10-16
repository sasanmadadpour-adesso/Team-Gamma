const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const {
    EnergyPlants,
    RequirementChecks,
    BilanzkreisTakeovers,
    ExternalProcessResults,
    EnergyMeasurements,
    PricingConfigurations
  } = this.entities;

  this.on('registerPlant', async (req) => {
    const {
      communityID,
      einspeiseMaLo,
      eeArt,
      leistungKw,
      standort
    } = req.data || {};

    if (!communityID || !einspeiseMaLo || !eeArt || !leistungKw) {
      req.reject(400, 'Einspeise-MaLo, EE-Art and Leistung are required.');
      return;
    }

    const plant = {
      ID: cds.utils.uuid(),
      community_ID: communityID,
      einspeiseMaLo,
      eeArt,
      leistungKw,
      status: 'In Prüfung',
      standort: standort || null
    };

    await INSERT.into(EnergyPlants).entries(plant);
    return await SELECT.one.from(EnergyPlants).where({ ID: plant.ID });
  });

  this.on('checkRequirements', 'EnergyPlants', async (req) => {
    const plant = await SELECT.one.from(EnergyPlants).where({ ID: req.params[0] });
    if (!plant) {
      req.reject(404, 'Plant not found.');
      return;
    }

    const check = {
      ID: cds.utils.uuid(),
      plant_ID: plant.ID,
      eeAnlageStatus: 'erfüllt',
      gebietStatus: 'erfüllt',
      iMSysStatus: 'erfüllt',
      checkedAt: new Date().toISOString()
    };

    await INSERT.into(RequirementChecks).entries(check);
    return check;
  });

  this.on('requestTakeover', 'EnergyPlants', async (req) => {
    const plant = await SELECT.one.from(EnergyPlants).where({ ID: req.params[0] });
    if (!plant) {
      req.reject(404, 'Plant not found.');
      return;
    }

    const takeover = {
      ID: cds.utils.uuid(),
      plant_ID: plant.ID,
      status: 'bestätigt',
      confirmedAt: new Date().toISOString(),
      confirmedByRole: 'Dienstleister / Lieferant'
    };

    await INSERT.into(BilanzkreisTakeovers).entries(takeover);
    return takeover;
  });

  this.on('processExternalResult', 'EnergyPlants', async (req) => {
    const plantID = req.params[0];
    const isConfirmed = req.data && req.data.isConfirmed === true;
    const plant = await SELECT.one.from(EnergyPlants).where({ ID: plantID });

    if (!plant) {
      req.reject(404, 'Plant not found.');
      return;
    }

    const response = {
      ID: cds.utils.uuid(),
      plant_ID: plantID,
      responseStatus: isConfirmed ? 'bestätigt' : 'abgelehnt',
      released: isConfirmed,
      resultMessage: isConfirmed
        ? 'Anlage ist angemeldet und bereit zur Zuordnung.'
        : 'Anmeldung abgelehnt. Die Anlage ist nicht für die Community-Zuordnung verfügbar.',
      receivedAt: new Date().toISOString()
    };

    await INSERT.into(ExternalProcessResults).entries(response);

    await UPDATE(EnergyPlants)
      .set({ status: isConfirmed ? 'Bereit zur Zuordnung' : 'Abgelehnt' })
      .where({ ID: plantID });

    // Aktion 2 / assignment to Community is intentionally not implemented here.
    return response;
  });

  this.on('prepareCommunityAssignment', 'EnergyPlants', async (req) => {
    req.reject(501, 'Aktion 2 is intentionally not implemented in this MVP.');
  });

  this.on('getDashboardContext', async (req) => {
    const communityID = req.data && req.data.communityID;
    if (!communityID) {
      req.reject(400, 'communityID is required.');
      return;
    }

    const community = await SELECT.one.from(this.entities.Communities).where({ ID: communityID });
    if (!community) {
      req.reject(404, 'Community not found.');
      return;
    }

    return community;
  });

  this.on('getDailyEnergySummary', async (req) => {
    const plantID = req.data && req.data.plantID;
    if (!plantID) {
      req.reject(400, 'plantID is required.');
      return;
    }

    const measurements = await SELECT.from(EnergyMeasurements).where({ plant_ID: plantID });
    const pricing = await SELECT.one
      .from(PricingConfigurations)
      .orderBy('validFrom desc');

    const productionKwh = measurements.reduce((sum, row) => sum + (row.productionKwh || 0), 0);
    const communityUsageKwh = measurements.reduce((sum, row) => sum + (row.communityUsageKwh || 0), 0);
    const surplusKwh = measurements.reduce((sum, row) => sum + (row.surplusKwh || 0), 0);
    const reststromKwh = measurements.reduce((sum, row) => sum + (row.reststromKwh || 0), 0);
    const communityUsagePercent = productionKwh > 0 ? (communityUsageKwh / productionKwh) * 100 : 0;
    const communityCompensation = pricing ? pricing.communityCompensationPerKwh : 0;
    const directMarketingPrice = pricing ? pricing.directMarketingPricePerKwh : 0;
    const communityRevenue = communityUsageKwh * communityCompensation;
    const directMarketingRevenue = surplusKwh * directMarketingPrice;

    return {
      productionKwh,
      communityUsageKwh,
      surplusKwh,
      reststromKwh,
      communityUsagePercent,
      communityRevenue,
      directMarketingRevenue,
      totalRevenue: communityRevenue + directMarketingRevenue
    };
  });
});
