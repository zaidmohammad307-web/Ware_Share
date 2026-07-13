// client/src/components/ui/BookingWidget.jsx
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { toast } from 'react-toastify';

import { useAuth } from '../../hooks';
import { usePrefs } from '@/providers/PreferencesProvider';
import axiosInstance from '@/utils/axios';
import DatePickerWithRange from './DatePickerWithRange';

// ---- Insurance defaults (frontend preview only; backend is source of truth) ----
const DEFAULT_INSURANCE_CONSTANTS = Object.freeze({
  STANDARD_RATE_PER_DAY: 0.0003,
  HIGH_RATE_PER_DAY: 0.0005,
  MIN_FEE: 3,
  MIN_DECLARED_VALUE: 100,
  MAX_DECLARED_VALUE: 50000,
  FORCE_HIGH_TIER_VALUE: 10000,
});

// ---- Packing pricing (frontend preview only; backend is source of truth) ----
const PACKING_RATE_BASIC = 0.75; // per box
const PACKING_RATE_STANDARD = 1.25; // per box
const PACKING_RATE_FRAGILE = 2.0; // per box
const PACKING_PALLET_MULTIPLIER = 10;
const PACKING_MIN_FEE = 10;

// ---- Delivery pricing (frontend preview only; backend is source of truth) ----
const DELIVERY_ZONE_A_FEE = 8;
const DELIVERY_ZONE_B_FEE = 15;
const DELIVERY_ZONE_C_FEE = 25;
const DELIVERY_MIN_FEE = 8;
const DELIVERY_BUNDLE_DISCOUNT = 3;

const CITY_GROUP_MAP = {
  amman: 'central',
  zarqa: 'central',
  salt: 'central',
  as_salt: 'central',
  balqa: 'central',
  madaba: 'central',
  'al-madaba': 'central',
  jerash: 'central_north',
  irbid: 'north',
  ajloun: 'north',
  mafraq: 'north',
  karak: 'south',
  tafileh: 'south',
  maan: 'south',
  aqaba: 'south',
};

const normalizeCity = (city) => String(city || '').trim().toLowerCase();
const roundTo2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const getPackingRate = (type) => {
  if (type === 'basic') return PACKING_RATE_BASIC;
  if (type === 'standard') return PACKING_RATE_STANDARD;
  if (type === 'fragile') return PACKING_RATE_FRAGILE;
  return 0;
};

const zoneFee = (a, b) => {
  const A = normalizeCity(a);
  const B = normalizeCity(b);

  if (!A || !B) return { zone: 'C', fee: DELIVERY_ZONE_C_FEE };
  if (A === B) return { zone: 'A', fee: DELIVERY_ZONE_A_FEE };

  const gA = CITY_GROUP_MAP[A];
  const gB = CITY_GROUP_MAP[B];
  if (gA && gB && gA === gB) return { zone: 'B', fee: DELIVERY_ZONE_B_FEE };

  return { zone: 'C', fee: DELIVERY_ZONE_C_FEE };
};

const BookingWidget = ({ place }) => {
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [bookingData, setBookingData] = useState({
    noOfGuests: 1,
    name: '',
    phone: '',
  });

  const [insuranceConstants, setInsuranceConstants] = useState(
    DEFAULT_INSURANCE_CONSTANTS
  );

  const [insurance, setInsurance] = useState({
    insuranceSelected: false,
    insuranceDeclaredValue: 100,
    insuranceTier: 'standard', // standard | high (preview; backend may force high)
  });

  const [packing, setPacking] = useState({
    packingSelected: false,
    packingType: 'basic',
    packingUnitsType: 'boxes',
    packingUnitsCount: 1,
  });

  const [delivery, setDelivery] = useState({
    deliverySelected: false,
    deliveryType: 'pickup_to_warehouse',
    pickupCity: '',
    dropoffCity: '',
    pickupAddressText: '',
    dropoffAddressText: '',
    deliveryTimeWindow: 'morning',
  });

  const [redirect, setRedirect] = useState('');

  const { user } = useAuth();
  const { t } = usePrefs();
  const { noOfGuests, name, phone } = bookingData;
  const { _id: id, pricePerDay, price, availableArea } = place;

  // Space requested in m². Empty = book the full warehouse.
  const [areaM2, setAreaM2] = useState('');
  const totalCapacity =
    Number.isFinite(Number(availableArea)) && Number(availableArea) > 0
      ? Number(availableArea)
      : null;

  useEffect(() => {
    if (user) {
      setBookingData((prev) => ({ ...prev, name: user.name }));
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axiosInstance.get('/bookings/insurance-config');
        if (!mounted) return;
        if (data?.constants) {
          setInsuranceConstants({
            ...DEFAULT_INSURANCE_CONSTANTS,
            ...data.constants,
          });
        }
      } catch (e) {
        // silent fallback to defaults
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const numberOfDays =
    dateRange.from && dateRange.to
      ? differenceInDays(
          new Date(dateRange.to).setHours(0, 0, 0, 0),
          new Date(dateRange.from).setHours(0, 0, 0, 0)
        )
      : 0;

  const daysPreview = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return 0;
    return Math.max(1, numberOfDays);
  }, [dateRange.from, dateRange.to, numberOfDays]);

  const areaFractionPreview = useMemo(() => {
    if (!totalCapacity) return 1;
    const a = Number(areaM2);
    if (!Number.isFinite(a) || a <= 0 || a >= totalCapacity) return 1;
    return a / totalCapacity;
  }, [areaM2, totalCapacity]);

  const baseBookingPricePreview = useMemo(() => {
    if (daysPreview < 1) return 0;
    return roundTo2(
      daysPreview * Number(pricePerDay ?? price ?? 0) * areaFractionPreview
    );
  }, [daysPreview, pricePerDay, price, areaFractionPreview]);

  const insuranceFeePreview = useMemo(() => {
    if (!insurance.insuranceSelected) return 0;

    const dv = Number(insurance.insuranceDeclaredValue);
    if (!Number.isFinite(dv)) return 0;

    const MIN = Number(insuranceConstants.MIN_DECLARED_VALUE);
    const MAX = Number(insuranceConstants.MAX_DECLARED_VALUE);
    const FORCE = Number(insuranceConstants.FORCE_HIGH_TIER_VALUE);
    const MIN_FEE = Number(insuranceConstants.MIN_FEE);

    if (!Number.isFinite(MIN) || !Number.isFinite(MAX) || !Number.isFinite(FORCE) || !Number.isFinite(MIN_FEE)) {
      return 0;
    }

    if (dv < MIN || dv > MAX) return 0;
    if (daysPreview < 1) return 0;

    const tierForced = dv > FORCE ? 'high' : insurance.insuranceTier;
    const ratePerDay =
      tierForced === 'high'
        ? Number(insuranceConstants.HIGH_RATE_PER_DAY)
        : Number(insuranceConstants.STANDARD_RATE_PER_DAY);

    if (!Number.isFinite(ratePerDay)) return 0;

    const raw = dv * ratePerDay * daysPreview;
    return Math.max(MIN_FEE, roundTo2(raw));
  }, [insurance, insuranceConstants, daysPreview]);

  const packingFeePreview = useMemo(() => {
    if (!packing.packingSelected) return 0;

    const rate = getPackingRate(packing.packingType);
    const multiplier =
      packing.packingUnitsType === 'pallets' ? PACKING_PALLET_MULTIPLIER : 1;
    const count = Number(packing.packingUnitsCount);
    if (!Number.isFinite(count) || count <= 0) return 0;

    const raw = count * rate * multiplier;
    return Math.max(PACKING_MIN_FEE, roundTo2(raw));
  }, [packing]);

  const deliveryFeePreview = useMemo(() => {
    if (!delivery.deliverySelected) return 0;

    const warehouseCity = place?.city;
    if (!warehouseCity) return 0;

    const type = delivery.deliveryType;
    const pickupCity = delivery.pickupCity;
    const dropoffCity = delivery.dropoffCity;

    let fee = 0;

    if (type === 'pickup_to_warehouse') {
      if (!pickupCity) return 0;
      fee = zoneFee(pickupCity, warehouseCity).fee;
    } else if (type === 'warehouse_to_dropoff') {
      if (!dropoffCity) return 0;
      fee = zoneFee(warehouseCity, dropoffCity).fee;
    } else if (type === 'round_trip') {
      if (!pickupCity || !dropoffCity) return 0;
      fee =
        zoneFee(pickupCity, warehouseCity).fee +
        zoneFee(warehouseCity, dropoffCity).fee -
        DELIVERY_BUNDLE_DISCOUNT;
    } else {
      fee = DELIVERY_ZONE_C_FEE;
    }

    return Math.max(DELIVERY_MIN_FEE, roundTo2(fee));
  }, [delivery, place?.city]);

  const totalPricePreview = useMemo(() => {
    return roundTo2(
      baseBookingPricePreview +
        insuranceFeePreview +
        packingFeePreview +
        deliveryFeePreview
    );
  }, [
    baseBookingPricePreview,
    insuranceFeePreview,
    packingFeePreview,
    deliveryFeePreview,
  ]);

  const handleBookingData = (e) => {
    setBookingData({
      ...bookingData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBooking = async () => {
    if (!user) {
      return setRedirect('/login');
    }

    if (daysPreview < 1) {
      return toast.error('Please select valid dates');
    } else if (noOfGuests < 1) {
      return toast.error("Units can't be less than 1");
    } else if (name.trim() === '') {
      return toast.error("Name can't be empty");
    } else if (phone.trim() === '') {
      return toast.error("Phone can't be empty");
    }

    // Insurance client-side validation (preview only)
    if (insurance.insuranceSelected) {
      const dv = Number(insurance.insuranceDeclaredValue);
      const MIN = Number(insuranceConstants.MIN_DECLARED_VALUE);
      const MAX = Number(insuranceConstants.MAX_DECLARED_VALUE);

      if (!Number.isFinite(dv)) {
        return toast.error('Declared value must be a number');
      }
      if (dv < MIN || dv > MAX) {
        return toast.error(`Declared value must be between ${MIN} and ${MAX}`);
      }
      if (!['standard', 'high'].includes(insurance.insuranceTier)) {
        return toast.error('Please select a valid insurance tier');
      }
    }

    // Packing client-side validation (preview only)
    if (packing.packingSelected) {
      if (!['basic', 'standard', 'fragile'].includes(packing.packingType)) {
        return toast.error('Please select a valid packing type');
      }
      if (!['boxes', 'pallets'].includes(packing.packingUnitsType)) {
        return toast.error('Please select a valid packing units type');
      }
      const count = Number(packing.packingUnitsCount);
      if (!Number.isFinite(count) || count <= 0) {
        return toast.error('Packing units count must be greater than 0');
      }
    }

    // Delivery client-side validation (preview only)
    if (delivery.deliverySelected) {
      if (!place?.city) {
        return toast.error(
          'Delivery is not available because this warehouse has no city set.'
        );
      }
      if (
        !['pickup_to_warehouse', 'warehouse_to_dropoff', 'round_trip'].includes(
          delivery.deliveryType
        )
      ) {
        return toast.error('Please select a valid delivery type');
      }
      if (
        delivery.deliveryType === 'pickup_to_warehouse' &&
        !delivery.pickupCity.trim()
      ) {
        return toast.error('Pickup city is required');
      }
      if (
        delivery.deliveryType === 'warehouse_to_dropoff' &&
        !delivery.dropoffCity.trim()
      ) {
        return toast.error('Drop-off city is required');
      }
      if (delivery.deliveryType === 'round_trip') {
        if (!delivery.pickupCity.trim() || !delivery.dropoffCity.trim()) {
          return toast.error('Pickup and drop-off cities are required');
        }
      }
    }

    try {
      const response = await axiosInstance.post('/bookings', {
        checkIn: dateRange.from,
        checkOut: dateRange.to,
        noOfGuests,
        name,
        phone,
        place: id,
        areaM2:
          totalCapacity && Number(areaM2) > 0 && Number(areaM2) < totalCapacity
            ? Number(areaM2)
            : undefined,

        // Insurance
        insuranceSelected: !!insurance.insuranceSelected,
        insuranceDeclaredValue: insurance.insuranceSelected
          ? Number(insurance.insuranceDeclaredValue)
          : undefined,
        insuranceTier: insurance.insuranceSelected
          ? insurance.insuranceTier
          : undefined,

        // Packing
        packingSelected: !!packing.packingSelected,
        packingType: packing.packingSelected ? packing.packingType : undefined,
        packingUnitsType: packing.packingSelected
          ? packing.packingUnitsType
          : undefined,
        packingUnitsCount: packing.packingSelected
          ? Number(packing.packingUnitsCount)
          : undefined,

        // Delivery
        deliverySelected: !!delivery.deliverySelected,
        deliveryType: delivery.deliverySelected
          ? delivery.deliveryType
          : undefined,
        pickupCity: delivery.deliverySelected ? delivery.pickupCity : undefined,
        dropoffCity: delivery.deliverySelected
          ? delivery.dropoffCity
          : undefined,
        pickupAddressText: delivery.deliverySelected
          ? delivery.pickupAddressText
          : undefined,
        dropoffAddressText: delivery.deliverySelected
          ? delivery.dropoffAddressText
          : undefined,
        deliveryTimeWindow: delivery.deliverySelected
          ? delivery.deliveryTimeWindow
          : undefined,
      });

      const bookingId = response.data.booking._id;

      setRedirect(`/account/bookings/${bookingId}`);
      toast.success('Request sent to the warehouse owner.');
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to send booking request.'
      );
    }
  };

  if (redirect) {
    return <Navigate to={redirect} />;
  }

  const insuranceTierForcedPreview =
    insurance.insuranceSelected &&
    Number(insurance.insuranceDeclaredValue) >
      Number(insuranceConstants.FORCE_HIGH_TIER_VALUE)
      ? 'high'
      : insurance.insuranceTier;

  return (
    <div className="mt-8 rounded-2xl border bg-white p-4 shadow">
      <div className="text-2xl font-semibold">
        {daysPreview > 0 ? (
          <>
            {daysPreview} days · Total:{' '}
            <span className="font-bold">JOD{totalPricePreview}</span>
          </>
        ) : (
          <span className="font-bold">Select dates</span>
        )}
      </div>

      <div className="mt-4">
        <DatePickerWithRange setDateRange={setDateRange} />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">
          {t('book.units')}
        </label>
        <input
          type="number"
          name="noOfGuests"
          value={noOfGuests}
          onChange={handleBookingData}
          className="w-full rounded-md border p-2"
          min={1}
        />
      </div>

      {totalCapacity && (
        <div className="mt-4">
          <label className="block text-sm font-medium">
            {t('book.space')}
          </label>
          <input
            type="number"
            value={areaM2}
            onChange={(e) => setAreaM2(e.target.value)}
            placeholder={`${t('book.fullWarehouse')} (${totalCapacity} m²)`}
            className="w-full rounded-md border p-2"
            min={1}
            max={totalCapacity}
          />
          <p className="mt-1 text-xs text-gray-500">
            {Number(areaM2) > 0 && Number(areaM2) < totalCapacity
              ? `${areaM2} / ${totalCapacity} m² — ${t('book.partialNote')}`
              : `${t('book.leaveEmpty')} ${totalCapacity} m².`}
          </p>
        </div>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium">{t('book.yourName')}</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={handleBookingData}
          className="w-full rounded-md border p-2"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">{t('book.phone')}</label>
        <input
          type="tel"
          name="phone"
          value={phone}
          onChange={handleBookingData}
          className="w-full rounded-md border p-2"
        />
      </div>

      {/* Insurance add-on */}
      <div className="mt-4 rounded-xl border bg-gray-50 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={insurance.insuranceSelected}
            onChange={(e) =>
              setInsurance((prev) => ({
                ...prev,
                insuranceSelected: e.target.checked,
              }))
            }
          />
          Add insurance
        </label>

        {insurance.insuranceSelected && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Declared value (JOD)
              </label>
              <input
                type="number"
                min={insuranceConstants.MIN_DECLARED_VALUE}
                max={insuranceConstants.MAX_DECLARED_VALUE}
                value={insurance.insuranceDeclaredValue}
                onChange={(e) =>
                  setInsurance((prev) => ({
                    ...prev,
                    insuranceDeclaredValue: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Min: {insuranceConstants.MIN_DECLARED_VALUE} · Max:{' '}
                {insuranceConstants.MAX_DECLARED_VALUE} · If value &gt;{' '}
                {insuranceConstants.FORCE_HIGH_TIER_VALUE}, tier is forced to
                high.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tier
              </label>
              <select
                value={insurance.insuranceTier}
                onChange={(e) =>
                  setInsurance((prev) => ({
                    ...prev,
                    insuranceTier: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
                disabled={insuranceTierForcedPreview === 'high' && insurance.insuranceTier !== 'high'}
              >
                <option value="standard">Standard</option>
                <option value="high">High</option>
              </select>
              {insuranceTierForcedPreview === 'high' && (
                <p className="mt-1 text-xs text-amber-700">
                  Tier is forced to high due to declared value.
                </p>
              )}
            </div>

            <div className="rounded-xl bg-white p-3 text-sm">
              <div className="font-semibold">Insurance preview</div>
              <div className="mt-1 text-gray-600">
                Fee: <span className="font-semibold">JOD{insuranceFeePreview}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Packing add-on */}
      <div className="mt-4 rounded-xl border bg-gray-50 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={packing.packingSelected}
            onChange={(e) =>
              setPacking((prev) => ({
                ...prev,
                packingSelected: e.target.checked,
              }))
            }
          />
          Add Packing
        </label>

        {packing.packingSelected && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Packing type
              </label>
              <select
                value={packing.packingType}
                onChange={(e) =>
                  setPacking((prev) => ({ ...prev, packingType: e.target.value }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="fragile">Fragile</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Units type
              </label>
              <select
                value={packing.packingUnitsType}
                onChange={(e) =>
                  setPacking((prev) => ({
                    ...prev,
                    packingUnitsType: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
              >
                <option value="boxes">Boxes</option>
                <option value="pallets">Pallets</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Units count
              </label>
              <input
                type="number"
                min={1}
                value={packing.packingUnitsCount}
                onChange={(e) =>
                  setPacking((prev) => ({
                    ...prev,
                    packingUnitsCount: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Delivery add-on */}
      <div className="mt-4 rounded-xl border bg-gray-50 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={delivery.deliverySelected}
            onChange={(e) =>
              setDelivery((prev) => ({
                ...prev,
                deliverySelected: e.target.checked,
              }))
            }
          />
          Add Delivery
        </label>

        {delivery.deliverySelected && (
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery type
              </label>
              <select
                value={delivery.deliveryType}
                onChange={(e) =>
                  setDelivery((prev) => ({
                    ...prev,
                    deliveryType: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
              >
                <option value="pickup_to_warehouse">Pickup → Warehouse</option>
                <option value="warehouse_to_dropoff">Warehouse → Drop-off</option>
                <option value="round_trip">Round trip</option>
              </select>
              {!place?.city ? (
                <p className="mt-1 text-xs text-amber-700">
                  This warehouse has no city set, so delivery may not be
                  available.
                </p>
              ) : null}
            </div>

            {(delivery.deliveryType === 'pickup_to_warehouse' ||
              delivery.deliveryType === 'round_trip') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pickup city
                </label>
                <input
                  type="text"
                  value={delivery.pickupCity}
                  onChange={(e) =>
                    setDelivery((prev) => ({
                      ...prev,
                      pickupCity: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border p-2 text-sm"
                  placeholder="e.g., Amman"
                />
              </div>
            )}

            {(delivery.deliveryType === 'warehouse_to_dropoff' ||
              delivery.deliveryType === 'round_trip') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Drop-off city
                </label>
                <input
                  type="text"
                  value={delivery.dropoffCity}
                  onChange={(e) =>
                    setDelivery((prev) => ({
                      ...prev,
                      dropoffCity: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border p-2 text-sm"
                  placeholder="e.g., Zarqa"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pickup address (optional)
              </label>
              <input
                type="text"
                value={delivery.pickupAddressText}
                onChange={(e) =>
                  setDelivery((prev) => ({
                    ...prev,
                    pickupAddressText: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
                placeholder="Street, building, landmarks..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Drop-off address (optional)
              </label>
              <input
                type="text"
                value={delivery.dropoffAddressText}
                onChange={(e) =>
                  setDelivery((prev) => ({
                    ...prev,
                    dropoffAddressText: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
                placeholder="Street, building, landmarks..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Time window
              </label>
              <select
                value={delivery.deliveryTimeWindow}
                onChange={(e) =>
                  setDelivery((prev) => ({
                    ...prev,
                    deliveryTimeWindow: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Price breakdown */}
      {daysPreview > 0 && (
        <div className="mt-4 rounded-xl border bg-white p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Base booking price</span>
            <span className="font-semibold">JOD{baseBookingPricePreview}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-gray-600">Insurance fee</span>
            <span className="font-semibold">JOD{insuranceFeePreview}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-gray-600">Packing fee</span>
            <span className="font-semibold">JOD{packingFeePreview}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-gray-600">Delivery fee</span>
            <span className="font-semibold">JOD{deliveryFeePreview}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <span className="font-semibold">Total</span>
            <span className="text-base font-bold">JOD{totalPricePreview}</span>
          </div>
        </div>
      )}

      <button onClick={handleBooking} className="primary mt-4 w-full">
        Request this warehouse
        {daysPreview > 0 && <span> · JOD{totalPricePreview}</span>}
      </button>
    </div>
  );
};

export default BookingWidget;
