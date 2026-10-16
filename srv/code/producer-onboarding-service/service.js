import cds from '@sap/cds';

const { SELECT, UPDATE } = cds.ql;

export default class ProducerOnboardingService extends cds.ApplicationService {
  async init() {
    const { Plants } = this.entities;
    for (const action of ['register', 'confirmTakeover', 'release']) {
      this.on(action, Plants, async req => {
        const id = req.params[0].ID;
        const plant = await SELECT.one.from(Plants).where({ ID: id });
        if (!plant) return req.reject(404, 'Anlage wurde nicht gefunden.');
        const status = action === 'register' ? 'IN_REVIEW' : action === 'confirmTakeover' ? 'READY_FOR_ASSIGNMENT' : 'ACTIVE';
        await UPDATE(Plants).set({ status }).where({ ID: id });
        return SELECT.one.from(Plants).where({ ID: id });
      });
    }
    return super.init();
  }
}
