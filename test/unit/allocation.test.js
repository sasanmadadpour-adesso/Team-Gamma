import assert from 'node:assert/strict';
import test from 'node:test';
import { allocateInterval } from '../../srv/code/analytics-service/allocation.js';

test('allocates community energy proportionally per interval', () => {
  const result = allocateInterval({ generationKwh: 10, participantConsumptions: [4, 6] });
  assert.equal(result.consumptionKwh, 10);
  assert.equal(result.communityKwh, 10);
  assert.equal(result.residualKwh, 0);
  assert.equal(result.surplusKwh, 0);
  assert.deepEqual(result.allocations.map(item => item.communityKwh), [4, 6]);
});

test('keeps residual and surplus separate when values differ', () => {
  const shortage = allocateInterval({ generationKwh: 3, participantConsumptions: [2, 4] });
  assert.equal(shortage.communityKwh, 3);
  assert.equal(shortage.residualKwh, 3);
  assert.equal(shortage.surplusKwh, 0);

  const surplus = allocateInterval({ generationKwh: 9, participantConsumptions: [2, 4] });
  assert.equal(surplus.communityKwh, 6);
  assert.equal(surplus.residualKwh, 0);
  assert.equal(surplus.surplusKwh, 3);
});

test('allocates zero consumption without division by zero', () => {
  const result = allocateInterval({ generationKwh: 5, participantConsumptions: [0, 0] });
  assert.equal(result.communityKwh, 0);
  assert.equal(result.surplusKwh, 5);
  assert.deepEqual(result.allocations.map(item => item.communityKwh), [0, 0]);
});
