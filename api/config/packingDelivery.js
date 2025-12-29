// api/config/packingDelivery.js

// Packing pricing constants
const PACKING_RATE_BASIC = 0.75; // per box
const PACKING_RATE_STANDARD = 1.25; // per box
const PACKING_RATE_FRAGILE = 2.0; // per box
const PACKING_PALLET_MULTIPLIER = 10;
const PACKING_MIN_FEE = 10;

// Delivery pricing constants
const DELIVERY_ZONE_A_FEE = 8;
const DELIVERY_ZONE_B_FEE = 15;
const DELIVERY_ZONE_C_FEE = 25;
const DELIVERY_MIN_FEE = 8;
const DELIVERY_BUNDLE_DISCOUNT = 3;

// City grouping used to determine "Zone B" (near cities). Everything else defaults to Zone C.
// This is intentionally simple and can be extended.
const CITY_GROUP_MAP = {
  // Central
  amman: 'central',
  zarqa: 'central',
  salt: 'central',
  as_salt: 'central',
  balqa: 'central',
  madaba: 'central',
  'al-madaba': 'central',
  jerash: 'central_north',

  // North
  irbid: 'north',
  ajloun: 'north',
  mafraq: 'north',

  // South
  karak: 'south',
  tafileh: 'south',
  maan: 'south',
  aqaba: 'south',
};

function normalizeCity(city) {
  if (!city) return '';
  return String(city).trim().toLowerCase();
}

function roundTo2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function getPackingRate(packingType) {
  if (packingType === 'basic') return PACKING_RATE_BASIC;
  if (packingType === 'standard') return PACKING_RATE_STANDARD;
  if (packingType === 'fragile') return PACKING_RATE_FRAGILE;
  return 0;
}

function computePackingFee({
  packingSelected,
  packingType,
  packingUnitsType,
  packingUnitsCount,
}) {
  const selected = !!packingSelected;
  if (!selected) {
    return {
      packingSelected: false,
      packingFee: 0,
      packingStatus: 'none',
      packingRateUsed: 0,
      packingMinFeeUsed: 0,
    };
  }

  const rate = getPackingRate(packingType);
  const unitsMultiplier =
    packingUnitsType === 'pallets' ? PACKING_PALLET_MULTIPLIER : 1;
  const count = Number(packingUnitsCount);
  const raw = count * rate * unitsMultiplier;
  const fee = Math.max(PACKING_MIN_FEE, roundTo2(raw));

  return {
    packingSelected: true,
    packingFee: fee,
    packingStatus: 'requested',
    packingRateUsed: rate,
    packingMinFeeUsed: PACKING_MIN_FEE,
  };
}

function zoneFee(cityA, cityB) {
  const a = normalizeCity(cityA);
  const b = normalizeCity(cityB);

  if (!a || !b) {
    return { zone: 'C', fee: DELIVERY_ZONE_C_FEE };
  }

  if (a === b) {
    return { zone: 'A', fee: DELIVERY_ZONE_A_FEE };
  }

  const groupA = CITY_GROUP_MAP[a];
  const groupB = CITY_GROUP_MAP[b];

  if (groupA && groupB && groupA === groupB) {
    return { zone: 'B', fee: DELIVERY_ZONE_B_FEE };
  }

  return { zone: 'C', fee: DELIVERY_ZONE_C_FEE };
}

function maxZone(z1, z2) {
  const order = { A: 1, B: 2, C: 3 };
  return order[z1] >= order[z2] ? z1 : z2;
}

function computeDeliveryFee({
  deliverySelected,
  deliveryType,
  pickupCity,
  dropoffCity,
  warehouseCity,
}) {
  const selected = !!deliverySelected;

  if (!selected) {
    return {
      deliverySelected: false,
      deliveryFee: 0,
      deliveryStatus: 'none',
      deliveryZoneUsed: null,
      deliveryBundleDiscountUsed: 0,
    };
  }

  let fee = 0;
  let zoneUsed = 'C';
  let bundleDiscount = 0;

  if (deliveryType === 'pickup_to_warehouse') {
    const leg = zoneFee(pickupCity, warehouseCity);
    fee = leg.fee;
    zoneUsed = leg.zone;
  } else if (deliveryType === 'warehouse_to_dropoff') {
    const leg = zoneFee(warehouseCity, dropoffCity);
    fee = leg.fee;
    zoneUsed = leg.zone;
  } else if (deliveryType === 'round_trip') {
    const leg1 = zoneFee(pickupCity, warehouseCity);
    const leg2 = zoneFee(warehouseCity, dropoffCity);
    fee = leg1.fee + leg2.fee - DELIVERY_BUNDLE_DISCOUNT;
    zoneUsed = maxZone(leg1.zone, leg2.zone);
    bundleDiscount = DELIVERY_BUNDLE_DISCOUNT;
  } else {
    // Unknown type => charge Zone C min
    fee = DELIVERY_ZONE_C_FEE;
    zoneUsed = 'C';
  }

  const finalFee = Math.max(DELIVERY_MIN_FEE, roundTo2(fee));

  return {
    deliverySelected: true,
    deliveryFee: finalFee,
    deliveryStatus: 'requested',
    deliveryZoneUsed: zoneUsed,
    deliveryBundleDiscountUsed: bundleDiscount,
  };
}

module.exports = {
  // Packing
  PACKING_RATE_BASIC,
  PACKING_RATE_STANDARD,
  PACKING_RATE_FRAGILE,
  PACKING_PALLET_MULTIPLIER,
  PACKING_MIN_FEE,

  // Delivery
  DELIVERY_ZONE_A_FEE,
  DELIVERY_ZONE_B_FEE,
  DELIVERY_ZONE_C_FEE,
  DELIVERY_MIN_FEE,
  DELIVERY_BUNDLE_DISCOUNT,
  CITY_GROUP_MAP,

  // Helpers
  normalizeCity,
  roundTo2,
  getPackingRate,
  computePackingFee,
  zoneFee,
  computeDeliveryFee,
};
