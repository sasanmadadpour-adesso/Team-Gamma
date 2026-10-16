import cds from '@sap/cds';

const { SELECT, INSERT, UPDATE } = cds.ql;

export default class CommunityManagementService extends cds.ApplicationService {
  async init() {
    const { Communities, Plants, PlantAssignments } = this.entities;

    this.on('assignPlant', Communities, async req => {
      const { plantId, validFrom } = req.data;
      const communityId = req.params[0].ID;
      const tx = cds.tx(req);

      const [community, plant] = await Promise.all([
        tx.run(SELECT.one.from(Communities).where({ ID: communityId })),
        tx.run(SELECT.one.from(Plants).where({ ID: plantId }))
      ]);

      if (!community || !plant) return req.reject(404, 'Community oder Anlage wurde nicht gefunden.');

      const existing = await tx.run(SELECT.one.from(PlantAssignments).where({
        community_ID: communityId,
        plant_ID: plantId
      }));
      if (existing) return existing;

      if (community.status !== 'DRAFT') return req.reject(409, 'Nur Communities im Status Entwurf können zugeordnet werden.');
      if (plant.status !== 'READY_FOR_ASSIGNMENT') return req.reject(409, 'Die Anlage ist nicht zur Zuordnung bereit.');

      const assigned = await tx.run(SELECT.one.from(PlantAssignments).where({ community_ID: communityId }));
      if (assigned) return req.reject(409, 'Die Community besitzt bereits eine zugeordnete Anlage.');
      if (community.balancingArea !== plant.balancingArea) return req.reject(409, 'Bilanzierungsgebiet stimmt nicht überein.');
      if (community.bkId !== plant.bkId) return req.reject(409, 'Bilanzkreis stimmt nicht überein.');
      if (!plant.imsysActive) return req.reject(409, 'Ein aktives iMSys ist erforderlich.');

      const vzpId = `VZP-${communityId.slice(0, 8)}-${plantId.slice(0, 8)}`;
      const assignment = {
        community_ID: communityId,
        plant_ID: plantId,
        validFrom,
        vzpId,
        s4Status: 'ACKNOWLEDGED'
      };

      await tx.run(INSERT.into(PlantAssignments).entries(assignment));
      await tx.run(UPDATE(Plants).set({ status: 'ASSIGNED', community_ID: communityId }).where({ ID: plantId }));
      await tx.run(UPDATE(Communities).set({ status: 'READY_FOR_ACTIVATION' }).where({ ID: communityId }));

      return tx.run(SELECT.one.from(PlantAssignments).where({ community_ID: communityId, plant_ID: plantId }));
    });

    this.on('activateCommunity', Communities, async req => {
      const communityId = req.params[0].ID;
      const tx = cds.tx(req);
      const community = await tx.run(SELECT.one.from(Communities).where({ ID: communityId }));
      if (!community) return req.reject(404, 'Community wurde nicht gefunden.');
      const assignment = await tx.run(SELECT.one.from(PlantAssignments).where({ community_ID: communityId }));
      if (!assignment) return req.reject(409, 'Für die Aktivierung ist mindestens eine zugeordnete Anlage erforderlich.');
      if (!['DRAFT', 'READY_FOR_ACTIVATION'].includes(community.status)) return req.reject(409, 'Die Community kann nicht aktiviert werden.');
      await tx.run(UPDATE(Communities).set({ status: 'ACTIVE' }).where({ ID: communityId }));
      return tx.run(SELECT.one.from(Communities).where({ ID: communityId }));
    });

    this.on('sendInvitation', Communities, async req => {
      if (!req.data.recipientEmail?.includes('@')) return req.reject(400, 'Bitte geben Sie eine gültige Empfängeradresse an.');
      return `Einladung an ${req.data.recipientEmail} wurde als Demo vorbereitet.`;
    });

    return super.init();
  }
}
