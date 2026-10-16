import cds from '@sap/cds';

const { SELECT, UPDATE } = cds.ql;

function todayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

async function enrichPlant(plant) {
  if (!plant) return plant;
  const { Communities, CommunityIntervals, PaymentPositions } = cds.entities('neo.energy');
  const { start, end } = todayRange();

  let community = null;
  if (plant.community_ID) {
    community = await SELECT.one.from(Communities).where({ ID: plant.community_ID });
  }

  const intervals = plant.community_ID
    ? await SELECT.from(CommunityIntervals).where({
        community_ID: plant.community_ID,
        intervalStart: { '>=': start, '<': end }
      })
    : [];

  const generationTodayKwh = intervals.reduce((sum, item) => sum + Number(item.generationKwh || 0), 0);
  const communityTodayKwh = intervals.reduce((sum, item) => sum + Number(item.communityKwh || 0), 0);
  const surplusTodayKwh = intervals.reduce((sum, item) => sum + Number(item.surplusKwh || 0), 0);
  const usageRatePercent = generationTodayKwh > 0 ? (communityTodayKwh / generationTodayKwh) * 100 : 0;

  const payments = plant.ID
    ? await SELECT.from(PaymentPositions).where({ plant_ID: plant.ID })
    : [];
  const paymentAmount = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const rate = community?.fixedPricePerKwh ? Number(community.fixedPricePerKwh) : 0;
  const revenueAmount = payments.length ? paymentAmount : communityTodayKwh * rate;

  plant.generationTodayKwh = generationTodayKwh;
  plant.communityTodayKwh = communityTodayKwh;
  plant.surplusTodayKwh = surplusTodayKwh;
  plant.usageRatePercent = Number(usageRatePercent.toFixed(2));
  plant.revenueAmount = Number(revenueAmount.toFixed(2));
  plant.communityName = community?.name || null;
  plant.communityStatus = community?.status || null;
  plant.communityFixedPricePerKwh = community?.fixedPricePerKwh ? Number(community.fixedPricePerKwh) : null;
  plant.communityResidualPricePerKwh = community?.residualPricePerKwh ? Number(community.residualPricePerKwh) : null;
  plant.communityPriceModel = community?.priceModel || null;

  return plant;
}

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
        const updated = await SELECT.one.from(Plants).where({ ID: id });
        return enrichPlant(updated);
      });
    }

    this.after('READ', Plants, async data => {
      const plants = Array.isArray(data) ? data : (data ? [data] : []);
      await Promise.all(plants.map(enrichPlant));
    });

    return super.init();
  }
}