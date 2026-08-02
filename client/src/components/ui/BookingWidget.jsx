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

// ---- Local bilingual strings (display only) ----
const STR = {
  EN: {
    daysTotal: (d) => `${d} days · Total:`,
    selectDates: 'Select dates',

    // Insurance
    addInsurance: 'Add insurance',
    declaredValue: 'Declared value (JOD)',
    declaredHint: (min, max, force) =>
      `Min: ${min} · Max: ${max} · If value > ${force}, tier is forced to high.`,
    tier: 'Tier',
    tierStandard: 'Standard',
    tierHigh: 'High value',
    tierForcedNote: 'Tier is forced to high due to declared value.',
    insurancePreview: 'Insurance preview',
    fee: 'Fee:',

    // Packing
    addPacking: 'Add packing',
    packingType: 'Packing type',
    packingBasic: 'Basic',
    packingStandard: 'Standard',
    packingFragile: 'Fragile',
    unitsType: 'Units type',
    unitsBoxes: 'Boxes',
    unitsPallets: 'Pallets',
    unitsCount: 'Units count',

    // Delivery
    addDelivery: 'Add delivery',
    deliveryType: 'Delivery type',
    pickupToWarehouse: 'Pickup → Warehouse',
    warehouseToDropoff: 'Warehouse → Drop-off',
    roundTrip: 'Round trip',
    noCityWarning:
      'This warehouse has no city set, so delivery may not be available.',
    pickupCity: 'Pickup city',
    pickupCityPlaceholder: 'e.g., Amman',
    dropoffCity: 'Drop-off city',
    dropoffCityPlaceholder: 'e.g., Zarqa',
    pickupAddress: 'Pickup address (optional)',
    dropoffAddress: 'Drop-off address (optional)',
    addressPlaceholder: 'Street, building, landmarks...',
    timeWindow: 'Time window',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',

    // Summary
    basePrice: 'Base booking price',
    insuranceFee: 'Insurance fee',
    packingFee: 'Packing fee',
    deliveryFee: 'Delivery fee',
    total: 'Total',
    requestWarehouse: 'Request this warehouse',

    // Toasts
    errDates: 'Please select valid dates',
    errUnits: "Units can't be less than 1",
    errName: "Name can't be empty",
    errPhone: "Phone can't be empty",
    errDeclaredNumber: 'Declared value must be a number',
    errDeclaredRange: (min, max) =>
      `Declared value must be between ${min} and ${max}`,
    errTier: 'Please select a valid insurance tier',
    errPackingType: 'Please select a valid packing type',
    errUnitsType: 'Please select a valid packing units type',
    errUnitsCount: 'Packing units count must be greater than 0',
    errDeliveryNoCity:
      'Delivery is not available because this warehouse has no city set.',
    errDeliveryType: 'Please select a valid delivery type',
    errPickupCity: 'Pickup city is required',
    errDropoffCity: 'Drop-off city is required',
    errBothCities: 'Pickup and drop-off cities are required',
    successSent: 'Request sent to the warehouse owner.',
    errSendFailed: 'Failed to send booking request.',
  },

  AR: {
    daysTotal: (d) => `${d} يوم · الإجمالي:`,
    selectDates: 'اختر التواريخ',

    // Insurance
    addInsurance: 'إضافة تأمين',
    declaredValue: 'القيمة المصرّح بها (دينار أردني)',
    declaredHint: (min, max, force) =>
      `الحد الأدنى: ${min} · الحد الأقصى: ${max} · إذا تجاوزت القيمة ${force} يتم اعتماد الفئة المرتفعة إلزاميًا.`,
    tier: 'فئة التغطية',
    tierStandard: 'قياسية',
    tierHigh: 'قيمة مرتفعة',
    tierForcedNote: 'تم اعتماد الفئة المرتفعة بسبب القيمة المصرّح بها.',
    insurancePreview: 'معاينة التأمين',
    fee: 'الرسوم:',

    // Packing
    addPacking: 'إضافة تغليف',
    packingType: 'نوع التغليف',
    packingBasic: 'أساسي',
    packingStandard: 'قياسي',
    packingFragile: 'للبضائع القابلة للكسر',
    unitsType: 'نوع الوحدات',
    unitsBoxes: 'صناديق',
    unitsPallets: 'منصات',
    unitsCount: 'عدد الوحدات',

    // Delivery
    addDelivery: 'إضافة توصيل',
    deliveryType: 'نوع التوصيل',
    pickupToWarehouse: 'من نقطة الاستلام ← المستودع',
    warehouseToDropoff: 'من المستودع ← نقطة التسليم',
    roundTrip: 'ذهاب وإياب',
    noCityWarning:
      'لم يتم تحديد مدينة لهذا المستودع، لذا قد لا يكون التوصيل متاحًا.',
    pickupCity: 'مدينة الاستلام',
    pickupCityPlaceholder: 'مثال: عمّان',
    dropoffCity: 'مدينة التسليم',
    dropoffCityPlaceholder: 'مثال: الزرقاء',
    pickupAddress: 'عنوان الاستلام (اختياري)',
    dropoffAddress: 'عنوان التسليم (اختياري)',
    addressPlaceholder: 'الشارع، المبنى، أقرب معلم...',
    timeWindow: 'الفترة الزمنية',
    morning: 'صباحًا',
    afternoon: 'بعد الظهر',
    evening: 'مساءً',

    // Summary
    basePrice: 'سعر الحجز الأساسي',
    insuranceFee: 'رسوم التأمين',
    packingFee: 'رسوم التغليف',
    deliveryFee: 'رسوم التوصيل',
    total: 'الإجمالي',
    requestWarehouse: 'اطلب هذا المستودع',

    // Toasts
    errDates: 'يرجى اختيار تواريخ صحيحة',
    errUnits: 'لا يمكن أن يقل عدد الوحدات عن 1',
    errName: 'الاسم مطلوب',
    errPhone: 'رقم الهاتف مطلوب',
    errDeclaredNumber: 'يجب أن تكون القيمة المصرّح بها رقمًا',
    errDeclaredRange: (min, max) =>
      `يجب أن تكون القيمة المصرّح بها بين ${min} و ${max}`,
    errTier: 'يرجى اختيار فئة تأمين صحيحة',
    errPackingType: 'يرجى اختيار نوع تغليف صحيح',
    errUnitsType: 'يرجى اختيار نوع وحدات تغليف صحيح',
    errUnitsCount: 'يجب أن يكون عدد وحدات التغليف أكبر من 0',
    errDeliveryNoCity: 'التوصيل غير متاح لأن هذا المستودع بدون مدينة محددة.',
    errDeliveryType: 'يرجى اختيار نوع توصيل صحيح',
    errPickupCity: 'مدينة الاستلام مطلوبة',
    errDropoffCity: 'مدينة التسليم مطلوبة',
    errBothCities: 'مدينتا الاستلام والتسليم مطلوبتان',
    successSent: 'تم إرسال الطلب إلى مالك المستودع.',
    errSendFailed: 'تعذّر إرسال طلب الحجز.',
  },
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
  const { t, lang, formatPrice } = usePrefs();
  const L = STR[lang] || STR.EN;
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
      return toast.error(L.errDates);
    } else if (noOfGuests < 1) {
      return toast.error(L.errUnits);
    } else if (name.trim() === '') {
      return toast.error(L.errName);
    } else if (phone.trim() === '') {
      return toast.error(L.errPhone);
    }

    // Insurance client-side validation (preview only)
    if (insurance.insuranceSelected) {
      const dv = Number(insurance.insuranceDeclaredValue);
      const MIN = Number(insuranceConstants.MIN_DECLARED_VALUE);
      const MAX = Number(insuranceConstants.MAX_DECLARED_VALUE);

      if (!Number.isFinite(dv)) {
        return toast.error(L.errDeclaredNumber);
      }
      if (dv < MIN || dv > MAX) {
        return toast.error(L.errDeclaredRange(MIN, MAX));
      }
      if (!['standard', 'high'].includes(insurance.insuranceTier)) {
        return toast.error(L.errTier);
      }
    }

    // Packing client-side validation (preview only)
    if (packing.packingSelected) {
      if (!['basic', 'standard', 'fragile'].includes(packing.packingType)) {
        return toast.error(L.errPackingType);
      }
      if (!['boxes', 'pallets'].includes(packing.packingUnitsType)) {
        return toast.error(L.errUnitsType);
      }
      const count = Number(packing.packingUnitsCount);
      if (!Number.isFinite(count) || count <= 0) {
        return toast.error(L.errUnitsCount);
      }
    }

    // Delivery client-side validation (preview only)
    if (delivery.deliverySelected) {
      if (!place?.city) {
        return toast.error(L.errDeliveryNoCity);
      }
      if (
        !['pickup_to_warehouse', 'warehouse_to_dropoff', 'round_trip'].includes(
          delivery.deliveryType
        )
      ) {
        return toast.error(L.errDeliveryType);
      }
      if (
        delivery.deliveryType === 'pickup_to_warehouse' &&
        !delivery.pickupCity.trim()
      ) {
        return toast.error(L.errPickupCity);
      }
      if (
        delivery.deliveryType === 'warehouse_to_dropoff' &&
        !delivery.dropoffCity.trim()
      ) {
        return toast.error(L.errDropoffCity);
      }
      if (delivery.deliveryType === 'round_trip') {
        if (!delivery.pickupCity.trim() || !delivery.dropoffCity.trim()) {
          return toast.error(L.errBothCities);
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
      toast.success(L.successSent);
    } catch (error) {
      toast.error(error?.response?.data?.message || L.errSendFailed);
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
            {L.daysTotal(daysPreview)}{' '}
            <span className="font-bold">{formatPrice(totalPricePreview)}</span>
          </>
        ) : (
          <span className="font-bold">{L.selectDates}</span>
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
          {L.addInsurance}
        </label>

        {insurance.insuranceSelected && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {L.declaredValue}
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
                {L.declaredHint(
                  insuranceConstants.MIN_DECLARED_VALUE,
                  insuranceConstants.MAX_DECLARED_VALUE,
                  insuranceConstants.FORCE_HIGH_TIER_VALUE
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {L.tier}
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
                <option value="standard">{L.tierStandard}</option>
                <option value="high">{L.tierHigh}</option>
              </select>
              {insuranceTierForcedPreview === 'high' && (
                <p className="mt-1 text-xs text-amber-700">{L.tierForcedNote}</p>
              )}
            </div>

            <div className="rounded-xl bg-white p-3 text-sm">
              <div className="font-semibold">{L.insurancePreview}</div>
              <div className="mt-1 text-gray-600">
                {L.fee}{' '}
                <span className="font-semibold">
                  {formatPrice(insuranceFeePreview)}
                </span>
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
          {L.addPacking}
        </label>

        {packing.packingSelected && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {L.packingType}
              </label>
              <select
                value={packing.packingType}
                onChange={(e) =>
                  setPacking((prev) => ({ ...prev, packingType: e.target.value }))
                }
                className="mt-1 w-full rounded-md border p-2 text-sm"
              >
                <option value="basic">{L.packingBasic}</option>
                <option value="standard">{L.packingStandard}</option>
                <option value="fragile">{L.packingFragile}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {L.unitsType}
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
                <option value="boxes">{L.unitsBoxes}</option>
                <option value="pallets">{L.unitsPallets}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {L.unitsCount}
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
          {L.addDelivery}
        </label>

        {delivery.deliverySelected && (
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {L.deliveryType}
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
                <option value="pickup_to_warehouse">{L.pickupToWarehouse}</option>
                <option value="warehouse_to_dropoff">{L.warehouseToDropoff}</option>
                <option value="round_trip">{L.roundTrip}</option>
              </select>
              {!place?.city ? (
                <p className="mt-1 text-xs text-amber-700">{L.noCityWarning}</p>
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
