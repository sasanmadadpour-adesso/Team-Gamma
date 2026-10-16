export function allocateInterval({ generationKwh, participantConsumptions }) {
  const consumptionKwh = participantConsumptions.reduce((sum, value) => sum + value, 0);
  const communityKwh = Math.min(generationKwh, consumptionKwh);
  const residualKwh = Math.max(0, consumptionKwh - generationKwh);
  const surplusKwh = Math.max(0, generationKwh - consumptionKwh);
  const allocations = participantConsumptions.map(consumptionKwhForParticipant => ({
    consumptionKwh: consumptionKwhForParticipant,
    communityKwh: consumptionKwh === 0 ? 0 : communityKwh * consumptionKwhForParticipant / consumptionKwh,
    residualKwh: consumptionKwh === 0 ? 0 : consumptionKwhForParticipant - communityKwh * consumptionKwhForParticipant / consumptionKwh
  }));
  return { consumptionKwh, communityKwh, residualKwh, surplusKwh, allocations };
}
