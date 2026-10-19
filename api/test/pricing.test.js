const test = require('node:test');
const assert = require('node:assert/strict');

const {
  INSURANCE_CONSTANTS,
  computeInsuranceSnapshot,
} = require('../config/insurance');
const { computeDeliveryFee, DELIVERY_MIN_FEE } = require('../config/packingDelivery');

const start = new Date('2026-01-01T00:00:00Z');
const end = new Date('2026-01-11T00:00:00Z'); // 10 days

test('insurance is free when not selected', () => {
  const snap = computeInsuranceSnapshot({ insuranceSelected: false });
  assert.equal(snap.insuranceSelected, false);
  assert.equal(snap.insuranceFee, 0);
});

test('insurance rejects a declared value below the minimum', () => {
  assert.throws(
    () =>
      computeInsuranceSnapshot({
        insuranceSelected: true,
        declaredValue: INSURANCE_CONSTANTS.MIN_DECLARED_VALUE - 1,
        startDate: start,
        endDate: end,
      }),
    (e) => e.status === 400
  );
});

test('insurance fee is never below the minimum fee', () => {
  const snap = computeInsuranceSnapshot({
    insuranceSelected: true,
    declaredValue: INSURANCE_CONSTANTS.MIN_DECLARED_VALUE,
    tier: 'standard',
    startDate: start,
    endDate: end,
  });
  assert.ok(snap.insuranceFee >= INSURANCE_CONSTANTS.MIN_FEE);
});

test('very high declared values are forced onto the high tier', () => {
  const snap = computeInsuranceSnapshot({
    insuranceSelected: true,
    declaredValue: Math.min(
      INSURANCE_CONSTANTS.FORCE_HIGH_TIER_VALUE + 1,
      INSURANCE_CONSTANTS.MAX_DECLARED_VALUE
    ),
    tier: 'standard',
    startDate: start,
    endDate: end,
  });
  assert.equal(snap.insuranceTier, 'high');
});

test('delivery is free when not selected', () => {
  assert.equal(computeDeliveryFee({ deliverySelected: false }).deliveryFee, 0);
});

test('delivery fee respects the minimum fee', () => {
  const r = computeDeliveryFee({
    deliverySelected: true,
    deliveryType: 'pickup_to_warehouse',
    pickupCity: 'Amman',
    warehouseCity: 'Amman',
  });
  assert.equal(r.deliveryStatus, 'requested');
  assert.ok(r.deliveryFee >= DELIVERY_MIN_FEE);
});
