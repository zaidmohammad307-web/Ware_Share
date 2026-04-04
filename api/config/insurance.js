// api/config/insurance.js

const INSURANCE_CONSTANTS = Object.freeze({
  STANDARD_RATE_PER_DAY: 0.0003,
  HIGH_RATE_PER_DAY: 0.0005,
  MIN_FEE: 3,
  MIN_DECLARED_VALUE: 100,
  MAX_DECLARED_VALUE: 50000,
  FORCE_HIGH_TIER_VALUE: 10000,
});

function roundTo2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function toNumber(v) {
  const n = typeof v === 'string' ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return !!v;
}

function calcDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return null;

  const MS_DAY = 24 * 60 * 60 * 1000;
  const days = Math.ceil(diffMs / MS_DAY);
  return Math.max(1, days);
}

/**
 * Computes insurance snapshot for a booking (backend source of truth).
 * Throws an Error with .status (HTTP code) for validation issues.
 */
function computeInsuranceSnapshot({
  insuranceSelected,
  declaredValue,
  tier,
  startDate,
  endDate,
}) {
  const selected = parseBool(insuranceSelected);

  if (!selected) {
    return {
      insuranceSelected: false,
      insuranceDeclaredValue: null,
      insuranceTier: null,
      insuranceRatePerDayUsed: 0,
      insuranceMinFeeUsed: 0,
      insuranceFee: 0,
      insuranceDaysUsed: 0,
    };
  }

  const dv = toNumber(declaredValue);
  if (dv === null) {
    const e = new Error('insuranceDeclaredValue must be a number');
    e.status = 400;
    throw e;
  }

  if (dv < INSURANCE_CONSTANTS.MIN_DECLARED_VALUE) {
    const e = new Error(
      `Declared value must be at least ${INSURANCE_CONSTANTS.MIN_DECLARED_VALUE}`
    );
    e.status = 400;
    throw e;
  }

  if (dv > INSURANCE_CONSTANTS.MAX_DECLARED_VALUE) {
    const e = new Error(
      `Declared value must be at most ${INSURANCE_CONSTANTS.MAX_DECLARED_VALUE}`
    );
    e.status = 400;
    throw e;
  }

  const days = calcDays(startDate, endDate);
  if (!days) {
    const e = new Error('Invalid booking dates for insurance calculation');
    e.status = 400;
    throw e;
  }

  let chosenTier = (tier || 'standard').toString().trim().toLowerCase();
  if (!['standard', 'high'].includes(chosenTier)) chosenTier = 'standard';

  if (dv > INSURANCE_CONSTANTS.FORCE_HIGH_TIER_VALUE) {
    chosenTier = 'high';
  }

  const ratePerDay =
    chosenTier === 'high'
      ? INSURANCE_CONSTANTS.HIGH_RATE_PER_DAY
      : INSURANCE_CONSTANTS.STANDARD_RATE_PER_DAY;

  const premiumRaw = dv * ratePerDay * days;
  const fee = Math.max(INSURANCE_CONSTANTS.MIN_FEE, roundTo2(premiumRaw));

  return {
    insuranceSelected: true,
    insuranceDeclaredValue: dv,
    insuranceTier: chosenTier,
    insuranceRatePerDayUsed: ratePerDay,
    insuranceMinFeeUsed: INSURANCE_CONSTANTS.MIN_FEE,
    insuranceFee: fee,
    insuranceDaysUsed: days,
  };
}

module.exports = {
  INSURANCE_CONSTANTS,
  roundTo2,
  computeInsuranceSnapshot,
};

