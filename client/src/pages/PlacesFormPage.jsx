import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import { usePrefs } from '@/providers/PreferencesProvider';

import AccountNav from '@/components/ui/AccountNav';
import PhotosUploader from '@/components/ui/PhotosUploader';
import Spinner from '@/components/ui/Spinner';
import LocationPicker from '@/components/ui/LocationPicker';
import Perks from '@/components/ui/Perks';
import { formatGps, parseGpsFlexible } from '@/utils/gps';

/**
 * IMPORTANT
 * Helper components MUST live at module scope.
 * If defined inside PlacesFormPage, they get re-created on every render,
 * which can cause inputs to lose focus ("have to re-click after each letter").
 */

/**
 * Local bilingual dictionary (EN / AR).
 * Only display strings live here — submitted values never change.
 */
const STR = {
  EN: {
    // Page header
    pageTitleAdd: 'Add new warehouse',
    pageTitleEdit: 'Edit warehouse',
    pageSubtitle: 'Follow the steps to create a clear, high-quality warehouse listing.',
    stepWord: 'Step',
    ofWord: 'of',

    // Steps
    stepBasic: 'Basic Info',
    stepCapacity: 'Capacity & Pricing',
    stepLocation: 'Location',
    stepFacilities: 'Facilities',
    stepServices: 'Services Offered',
    stepAvailability: 'Availability & Rules',
    stepImages: 'Images',
    stepReview: 'Review & Publish',

    // Navigation
    back: 'Back',
    continue: 'Continue',
    publish: 'Publish warehouse',
    completeStepFirst: 'Please complete this step before continuing.',

    // Warehouse types
    typeDry: 'Dry (Ambient)',
    typeCold: 'Cold',
    typeGeneral: 'Mixed / General',
    typeDryDesc: 'Ambient storage for general goods.',
    typeColdDesc: 'Temperature-controlled storage.',
    typeGeneralDesc: 'Flexible storage for multiple categories.',

    // Facilities
    facCCTV: 'CCTV',
    facForklift: 'Forklift',
    facLoadingDock: 'Loading dock',
    facAccess247: '24/7 access',
    facTemperatureControl: 'Temperature control',
    facTempHint: 'Cold storage / climate control features.',
    facDefaultHint: 'Visible on your listing for renters.',

    // Services
    svcInsurance: 'Insurance available',
    svcPacking: 'Packing available',
    svcDelivery: 'Delivery available',
    svcDeliveryHint: 'Transport / local delivery options.',
    svcPackingHint: 'Picking, packing, labeling, and packaging.',
    svcInsuranceHint: 'Insurance availability for stored goods.',

    // Basic info
    basicSubtitle: 'Start with a clear name, type, and a short description.',
    warehouseName: 'Warehouse name',
    warehouseNamePh: 'e.g. Cold storage warehouse in Amman',
    warehouseType: 'Warehouse type',
    shortDescription: 'Short description',
    shortDescriptionPh: 'Describe what you store, typical goods, handling, and key notes.',

    // Capacity & pricing
    capacitySubtitle: 'Provide capacity and a clear pricing structure.',
    totalAreaLabel: 'Total capacity (m²)',
    availableAreaLabel: 'Available capacity (m²)',
    palletCapacityLabel: 'Total capacity (pallets)',
    legacyUnitsLabel: 'Available units (legacy)',
    legacyUnitsHint: 'This keeps compatibility with your existing booking flow.',
    pricePerUnit: 'Price per unit',
    billingPeriod: 'Billing period',
    perDay: 'Per day',
    perMonth: 'Per month',
    billingHint: 'Stored as daily price (backend-compatible).',
    negotiable: 'Price is negotiable',
    ph500: 'e.g. 500',
    ph200: 'e.g. 200',
    ph1200: 'e.g. 1200',
    ph50: 'e.g. 50',
    ph25: 'e.g. 25',
    ph3: 'e.g. 3',
    ph30: 'e.g. 30',

    // Location
    locationSubtitle: 'Pin your location on the map and confirm address details.',
    mapLocation: 'Map location',
    address: 'Address',
    addressPh: 'Address will update from the map, but you can edit it.',
    addressHint: 'If you edit the address manually, ensure it matches the pinned location.',
    city: 'City',
    cityPh: 'e.g. Amman',
    country: 'Country',
    countryPh: 'e.g. Jordan',

    // Facilities section
    facilitiesSubtitle: 'Select the facilities available at your warehouse.',
    optionalNotes: 'Optional notes',
    optionalNotesHint:
      'You can add details about access procedures, dock scheduling, or temperature ranges in Rules.',

    // Services section
    servicesSubtitle: 'Select services you can provide as add-ons.',

    // Availability & rules
    availabilitySubtitle: 'Set availability start date and basic warehouse rules.',
    availableFrom: 'Available from',
    availableUntil: 'Available until (optional)',
    availableUntilHint: 'Leave empty if always available.',
    basicRules: 'Basic warehouse rules',
    basicRulesPh:
      'e.g. No hazardous materials. Access hours. Booking lead time. Pallet labeling requirements.',
    advancedLegacy: 'Advanced (optional) legacy fields',
    minBookingDays: 'Min booking days (optional)',
    maxBookingDays: 'Max booking days (optional)',
    legacyPerks: 'Legacy perks (optional)',

    // Images
    imagesSubtitle: (n) => `Upload and preview warehouse photos. At least ${n} images are required.`,
    imagesHint: (n) => `Minimum: ${n} images. Recommended: 5+ (exterior, interior, access points).`,

    // Review
    reviewSubtitle: 'Double-check your listing details before publishing.',
    summary: 'Summary',
    summaryHint: 'This is what renters will see on your listing.',
    sumCapacity: 'Capacity',
    sumPricing: 'Pricing',
    sumLocation: 'Location',
    sumFacilities: 'Facilities',
    sumServices: 'Services offered',
    sumRules: 'Rules',
    sumImages: 'Images',
    unitM2: 'm²',
    availableSuffix: 'available',
    palletsWord: 'pallets',
    perDayShort: '/ day',
    negotiableShort: '(negotiable)',
    uploadedWord: 'uploaded',
    finalChecks: 'Final checks',
    checkOk: 'OK',
    chkName: 'Warehouse name',
    chkType: 'Warehouse type',
    chkDescription: 'Description',
    chkPrice: 'Price',
    chkLocation: 'Location',
    chkAvailability: 'Availability',
    chkRules: 'Rules',
    chkImages: 'Images',

    // Side panel
    listingQuality: 'Listing quality',
    listingQualityHint: 'Completing these increases renter trust and reduces booking issues.',
    qualityNameType: 'Name + type',
    qualityCapacityPrice: 'Capacity + price',
    qualityMapAddress: 'Map + address',
    qualityImages: 'Images',
    done: 'Done',
    pending: 'Pending',
    quickTips: 'Quick tips',
    tip1: 'Use a specific name (city + type).',
    tip2: 'Ensure available capacity matches your operational reality.',
    tip3: 'Pin the exact location; the address should match the map marker.',
    tip4: 'Add facility/services that you truly offer to avoid disputes.',
    tip5: 'Upload clear photos (access points + interior).',

    // Validation & toasts
    errType: 'Please select a warehouse type.',
    errPrice: 'Enter a valid price per day.',
    errCapacity: 'Provide total capacity (m² or pallets).',
    errAvailableExceeds: 'Available capacity cannot exceed total capacity.',
    errAddress: 'Address is required.',
    errGps: 'Please set a valid location on the map.',
    errCity: 'City is required.',
    errCountry: 'Country is required.',
    errPhotos: (n) => `Please upload at least ${n} images.`,
    errTitle: 'Warehouse name is required.',
    errDescription: 'Short description is required.',
    errCheckIn: 'Available from date is required.',
    errRules: 'Please add basic warehouse rules.',
    toastLoadFailed: 'Failed to load warehouse data.',
    toastFixFields: 'Please fix the highlighted fields before publishing.',
    toastSaved: 'Warehouse saved successfully.',
    toastSaveFailed: 'Failed to save warehouse.',
  },

  AR: {
    // Page header
    pageTitleAdd: 'إضافة مستودع جديد',
    pageTitleEdit: 'تعديل المستودع',
    pageSubtitle: 'اتبع الخطوات لإنشاء إعلان مستودع واضح وعالي الجودة.',
    stepWord: 'الخطوة',
    ofWord: 'من',

    // Steps
    stepBasic: 'المعلومات الأساسية',
    stepCapacity: 'السعة والتسعير',
    stepLocation: 'الموقع',
    stepFacilities: 'المرافق',
    stepServices: 'الخدمات المتاحة',
    stepAvailability: 'التوفر والقواعد',
    stepImages: 'الصور',
    stepReview: 'المراجعة والنشر',

    // Navigation
    back: 'رجوع',
    continue: 'متابعة',
    publish: 'نشر المستودع',
    completeStepFirst: 'يرجى إكمال هذه الخطوة قبل المتابعة.',

    // Warehouse types
    typeDry: 'جاف (درجة حرارة الغرفة)',
    typeCold: 'مبرّد',
    typeGeneral: 'مختلط / عام',
    typeDryDesc: 'تخزين بدرجة حرارة الغرفة للبضائع العامة.',
    typeColdDesc: 'تخزين مُتحكَّم بدرجة حرارته.',
    typeGeneralDesc: 'تخزين مرن لفئات متعددة من البضائع.',

    // Facilities
    facCCTV: 'كاميرات مراقبة',
    facForklift: 'رافعة شوكية',
    facLoadingDock: 'رصيف تحميل',
    facAccess247: 'دخول على مدار الساعة',
    facTemperatureControl: 'التحكم بدرجة الحرارة',
    facTempHint: 'مزايا التخزين المبرّد والتحكم بالمناخ.',
    facDefaultHint: 'تظهر في إعلانك للمستأجرين.',

    // Services
    svcInsurance: 'تأمين متاح',
    svcPacking: 'خدمة تغليف متاحة',
    svcDelivery: 'خدمة توصيل متاحة',
    svcDeliveryHint: 'خيارات النقل والتوصيل المحلي.',
    svcPackingHint: 'التجهيز والتغليف ووضع الملصقات والتعبئة.',
    svcInsuranceHint: 'توفّر التأمين على البضائع المخزّنة.',

    // Basic info
    basicSubtitle: 'ابدأ باسم واضح ونوع المستودع ووصف مختصر.',
    warehouseName: 'اسم المستودع',
    warehouseNamePh: 'مثال: مستودع تخزين مبرّد في عمّان',
    warehouseType: 'نوع المستودع',
    shortDescription: 'وصف مختصر',
    shortDescriptionPh: 'اشرح ما يمكن تخزينه، وأنواع البضائع، وطريقة المناولة، وأي ملاحظات مهمة.',

    // Capacity & pricing
    capacitySubtitle: 'حدّد السعة وهيكل تسعير واضح.',
    totalAreaLabel: 'السعة الإجمالية (م²)',
    availableAreaLabel: 'السعة المتاحة (م²)',
    palletCapacityLabel: 'السعة الإجمالية (طبليات)',
    legacyUnitsLabel: 'الوحدات المتاحة (حقل قديم)',
    legacyUnitsHint: 'يحافظ هذا على التوافق مع آلية الحجز الحالية لديك.',
    pricePerUnit: 'السعر لكل وحدة',
    billingPeriod: 'فترة الفوترة',
    perDay: 'يومياً',
    perMonth: 'شهرياً',
    billingHint: 'يُحفظ كسعر يومي (متوافق مع الخادم).',
    negotiable: 'السعر قابل للتفاوض',
    ph500: 'مثال: 500',
    ph200: 'مثال: 200',
    ph1200: 'مثال: 1200',
    ph50: 'مثال: 50',
    ph25: 'مثال: 25',
    ph3: 'مثال: 3',
    ph30: 'مثال: 30',

    // Location
    locationSubtitle: 'حدّد موقعك على الخريطة وأكّد تفاصيل العنوان.',
    mapLocation: 'الموقع على الخريطة',
    address: 'العنوان',
    addressPh: 'سيتم تحديث العنوان من الخريطة، ويمكنك تعديله.',
    addressHint: 'إذا عدّلت العنوان يدوياً، تأكد من مطابقته للموقع المحدد على الخريطة.',
    city: 'المدينة',
    cityPh: 'مثال: عمّان',
    country: 'الدولة',
    countryPh: 'مثال: الأردن',

    // Facilities section
    facilitiesSubtitle: 'اختر المرافق المتوفرة في مستودعك.',
    optionalNotes: 'ملاحظات اختيارية',
    optionalNotesHint:
      'يمكنك إضافة تفاصيل حول إجراءات الدخول، وجدولة أرصفة التحميل، أو نطاقات درجات الحرارة في قسم القواعد.',

    // Services section
    servicesSubtitle: 'اختر الخدمات التي يمكنك تقديمها كخدمات إضافية.',

    // Availability & rules
    availabilitySubtitle: 'حدّد تاريخ بدء التوفر والقواعد الأساسية للمستودع.',
    availableFrom: 'متاح ابتداءً من',
    availableUntil: 'متاح حتى (اختياري)',
    availableUntilHint: 'اتركه فارغاً إذا كان متاحاً دائماً.',
    basicRules: 'القواعد الأساسية للمستودع',
    basicRulesPh:
      'مثال: يُمنع تخزين المواد الخطرة. ساعات الدخول. مدة الإشعار المسبق للحجز. متطلبات ترقيم الطبليات.',
    advancedLegacy: 'حقول متقدمة (اختيارية)',
    minBookingDays: 'الحد الأدنى لأيام الحجز (اختياري)',
    maxBookingDays: 'الحد الأقصى لأيام الحجز (اختياري)',
    legacyPerks: 'مزايا إضافية (اختياري)',

    // Images
    imagesSubtitle: (n) => `ارفع صور المستودع وعاينها. مطلوب ${n} صور على الأقل.`,
    imagesHint: (n) =>
      `الحد الأدنى: ${n} صور. الموصى به: 5 صور فأكثر (الخارج، الداخل، مداخل الوصول).`,

    // Review
    reviewSubtitle: 'راجع تفاصيل إعلانك جيداً قبل النشر.',
    summary: 'الملخص',
    summaryHint: 'هذا ما سيراه المستأجرون في إعلانك.',
    sumCapacity: 'السعة',
    sumPricing: 'التسعير',
    sumLocation: 'الموقع',
    sumFacilities: 'المرافق',
    sumServices: 'الخدمات المتاحة',
    sumRules: 'القواعد',
    sumImages: 'الصور',
    unitM2: 'م²',
    availableSuffix: 'متاحة',
    palletsWord: 'طبلية',
    perDayShort: '/ يوم',
    negotiableShort: '(قابل للتفاوض)',
    uploadedWord: 'صورة مرفوعة',
    finalChecks: 'الفحوصات النهائية',
    checkOk: 'مكتمل',
    chkName: 'اسم المستودع',
    chkType: 'نوع المستودع',
    chkDescription: 'الوصف',
    chkPrice: 'السعر',
    chkLocation: 'الموقع',
    chkAvailability: 'التوفر',
    chkRules: 'القواعد',
    chkImages: 'الصور',

    // Side panel
    listingQuality: 'جودة الإعلان',
    listingQualityHint: 'إكمال هذه العناصر يزيد ثقة المستأجرين ويقلل مشاكل الحجز.',
    qualityNameType: 'الاسم والنوع',
    qualityCapacityPrice: 'السعة والسعر',
    qualityMapAddress: 'الخريطة والعنوان',
    qualityImages: 'الصور',
    done: 'مكتمل',
    pending: 'قيد الإنجاز',
    quickTips: 'نصائح سريعة',
    tip1: 'استخدم اسماً محدداً (المدينة + النوع).',
    tip2: 'تأكد من أن السعة المتاحة تعكس الواقع التشغيلي لديك.',
    tip3: 'حدّد الموقع بدقة؛ ويجب أن يطابق العنوان علامة الخريطة.',
    tip4: 'أضف المرافق والخدمات التي تقدّمها فعلاً لتجنّب النزاعات.',
    tip5: 'ارفع صوراً واضحة (مداخل الوصول والداخل).',

    // Validation & toasts
    errType: 'يرجى اختيار نوع المستودع.',
    errPrice: 'أدخل سعراً يومياً صالحاً.',
    errCapacity: 'يرجى تحديد السعة الإجمالية (م² أو طبليات).',
    errAvailableExceeds: 'لا يمكن أن تتجاوز السعة المتاحة السعة الإجمالية.',
    errAddress: 'العنوان مطلوب.',
    errGps: 'يرجى تحديد موقع صالح على الخريطة.',
    errCity: 'المدينة مطلوبة.',
    errCountry: 'الدولة مطلوبة.',
    errPhotos: (n) => `يرجى رفع ${n} صور على الأقل.`,
    errTitle: 'اسم المستودع مطلوب.',
    errDescription: 'الوصف المختصر مطلوب.',
    errCheckIn: 'تاريخ بدء التوفر مطلوب.',
    errRules: 'يرجى إضافة القواعد الأساسية للمستودع.',
    toastLoadFailed: 'تعذّر تحميل بيانات المستودع.',
    toastFixFields: 'يرجى تصحيح الحقول المحددة قبل النشر.',
    toastSaved: 'تم حفظ المستودع بنجاح.',
    toastSaveFailed: 'تعذّر حفظ المستودع.',
  },
};

const getLang = (lang) => (lang === 'AR' ? 'AR' : 'EN');

const WAREHOUSE_TYPES = [
  { value: 'dry', labelKey: 'typeDry', descKey: 'typeDryDesc' },
  { value: 'cold', labelKey: 'typeCold', descKey: 'typeColdDesc' },
  { value: 'general', labelKey: 'typeGeneral', descKey: 'typeGeneralDesc' },
];

const FACILITIES = [
  { key: 'CCTV', labelKey: 'facCCTV' },
  { key: 'forklift', labelKey: 'facForklift' },
  { key: 'loadingDock', labelKey: 'facLoadingDock' },
  { key: 'access247', labelKey: 'facAccess247' },
  { key: 'temperatureControl', labelKey: 'facTemperatureControl' },
];

const SERVICES_OFFERED = [
  { key: 'insurance', labelKey: 'svcInsurance' },
  { key: 'packing', labelKey: 'svcPacking' },
  { key: 'delivery', labelKey: 'svcDelivery' },
];

const MIN_PHOTOS_REQUIRED = 3;

const stepList = [
  { id: 'basic', titleKey: 'stepBasic' },
  { id: 'capacity', titleKey: 'stepCapacity' },
  { id: 'location', titleKey: 'stepLocation' },
  { id: 'facilities', titleKey: 'stepFacilities' },
  { id: 'services', titleKey: 'stepServices' },
  { id: 'availability', titleKey: 'stepAvailability' },
  { id: 'images', titleKey: 'stepImages' },
  { id: 'review', titleKey: 'stepReview' },
];

const emptyForm = {
  // BASIC (required by backend: title, address)
  title: '',
  address: '',
  description: '',
  warehouseType: [],

  // CAPACITY & PRICING
  totalArea: '',
  availableArea: '',
  palletCapacity: '',
  pricePerDay: '',
  price: 500, // legacy, keep for compatibility
  priceUnit: 'day', // UI-only helper (not saved in DB)

  negotiablePrice: false,

  // LOCATION
  city: '',
  zone: '', // used as "country" in UX (stored in DB as zone)
  gps: '',

  // FACILITIES (mapped to existing model fields)
  CCTV: false,

  // existing model fields we keep stable
  equipment: [],
  perks: [],
  tempControlFee: '',

  // SERVICES
  insurance: false,
  services: [],

  // AVAILABILITY & RULES
  checkIn: '',
  extraInfo: '',

  // keep existing required/used fields
  checkOut: '',
  maxGuests: 10, // legacy (can represent "units/pallets")
  minBookingDays: '',
  maxBookingDays: '',

  // keep existing extras (do not remove)
  loadingDocks: '',
  loadingFee: '',
  parkingAvailable: false,
  securityGuards: false,
  fireSuppression: false,
  smokeDetectors: false,
  hazmatCert: false,
  foodGradeCert: false,
  ISOcert: '',
  hazmatRestrictions: '',
  ceilingHeight: '',
  floorLoadCapacity: '',
  rackAvailability: false,
  rackType: 'none',
  spaceType: 'open-floor',
  truckAccess: [],
  peakSeason: false,
  pricePerPallet: '',
  allowedGoods: [],
  prohibitedGoods: '',
};

const isFiniteNumber = (v) => {
  if (v === '' || v === null || v === undefined) return false;
  const n = Number(v);
  return Number.isFinite(n);
};

const normalizeString = (v) => (typeof v === 'string' ? v.trim() : '');

// -------------------------
// Helper components (module scope)
// -------------------------

const SectionCard = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
    </div>
    {children}
  </div>
);

const FieldLabel = ({ children }) => (
  <label className="mb-1 block text-sm font-medium text-gray-700">{children}</label>
);

const FieldError = ({ errors, name }) => {
  const msg = errors?.[name] || '';
  if (!msg) return null;
  return <p className="mt-1 text-sm text-red-600">{msg}</p>;
};

const Stepper = ({ activeStep, stepIndex, validateStep, goStep, L }) => (
  <div className="rounded-2xl border bg-white p-3 shadow-sm">
    <div className="flex flex-wrap gap-2">
      {stepList.map((s, idx) => {
        const isActive = s.id === activeStep;
        const isDone = idx < stepIndex;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              // Allow navigation backwards freely; forward only if current step validates
              if (idx <= stepIndex) {
                goStep(s.id);
                return;
              }
              const { ok } = validateStep(activeStep);
              if (!ok) {
                toast.error(L.completeStepFirst);
                return;
              }
              goStep(s.id);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? 'bg-primary text-white'
                : isDone
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : isDone
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700'
              }`}
            >
              {idx + 1}
            </span>
            <span>{L[s.titleKey]}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const NavButtons = ({ stepIndex, onBack, onNext, showPublish = false, L }) => (
  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      disabled={stepIndex === 0}
      className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm disabled:opacity-50"
    >
      {L.back}
    </button>

    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {stepIndex < stepList.length - 1 && (
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm"
        >
          {L.continue}
        </button>
      )}

      {showPublish && (
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          {L.publish}
        </button>
      )}
    </div>
  </div>
);

const WarehouseTypeSelector = ({ warehouseType, setMainType, L }) => {
  const selected = Array.isArray(warehouseType) ? warehouseType : [];

  const currentMain = (() => {
    if (selected.includes('dry')) return 'dry';
    if (selected.includes('cold') || selected.includes('frozen')) return 'cold';
    if (selected.includes('general') || selected.includes('fulfillment') || selected.includes('bonded'))
      return 'general';
    return '';
  })();

  return (
    <div className="mt-2 grid gap-3 sm:grid-cols-3">
      {WAREHOUSE_TYPES.map((opt) => {
        const checked = currentMain === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMainType(opt.value)}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm transition ${
              checked ? 'border-primary bg-primary/5' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">{L[opt.labelKey]}</p>
              <p className="mt-1 text-xs text-gray-500">{L[opt.descKey]}</p>
            </div>
            <span
              className={`h-5 w-5 rounded-full border-2 ${
                checked ? 'border-primary bg-primary' : 'border-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
    <div className="text-sm font-medium text-gray-700">{label}</div>
    <div className="text-right text-sm text-gray-900">{value || '—'}</div>
  </div>
);

const PlacesFormPage = () => {
  const { id } = useParams();
  const { lang } = usePrefs();
  const L = STR[getLang(lang)] || STR.EN;

  const [redirect, setRedirect] = useState(false);
  const [loading, setLoading] = useState(false);

  const [addedPhotos, setAddedPhotos] = useState([]);
  const [activeStep, setActiveStep] = useState('basic');

  const [formData, setFormData] = useState({ ...emptyForm });
  const [errors, setErrors] = useState({});

  const stepIndex = useMemo(
    () => Math.max(0, stepList.findIndex((s) => s.id === activeStep)),
    [activeStep]
  );

  const goStep = (nextId) => {
    setActiveStep(nextId);
    setErrors({});
  };

  const goNext = () => {
    const { ok, nextErrors } = validateStep(activeStep);
    setErrors(nextErrors);
    if (!ok) return;

    const next = stepList[stepIndex + 1];
    if (next) goStep(next.id);
  };

  const goBack = () => {
    const prev = stepList[stepIndex - 1];
    if (prev) goStep(prev.id);
  };

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const toggleArrayValue = (field, optionValue) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(optionValue);
      const nextArr = exists
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [field]: nextArr };
    });
  };

  const toggleCheckbox = (name) => {
    setFormData((prev) => ({ ...prev, [name]: !prev[name] }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const setMainWarehouseType = (v) => {
    // Keep schema-compatible values; ensure exactly one of the UX-required types is present.
    setFormData((prev) => {
      const current = Array.isArray(prev.warehouseType) ? prev.warehouseType : [];
      let next = current.filter((t) => !['dry', 'cold', 'frozen', 'general'].includes(t));

      if (v === 'dry') next = [...next, 'dry'];
      if (v === 'cold') next = [...next, 'cold'];
      if (v === 'general') next = [...next, 'general'];

      // Keep temperatureControl coherence if user picked cold
      if (v === 'cold') {
        const equip = Array.isArray(prev.equipment) ? prev.equipment : [];
        const nextEquip = equip.includes('chillers') ? equip : [...equip, 'chillers'];
        return { ...prev, warehouseType: next, equipment: nextEquip };
      }

      return { ...prev, warehouseType: next };
    });
    setErrors((prev) => ({ ...prev, warehouseType: '' }));
  };

  const facilityState = useMemo(() => {
    const equipment = Array.isArray(formData.equipment) ? formData.equipment : [];
    const perks = Array.isArray(formData.perks) ? formData.perks : [];
    const types = Array.isArray(formData.warehouseType)
      ? formData.warehouseType
      : [];

    return {
      CCTV: !!formData.CCTV,
      forklift: equipment.includes('forklift'),
      loadingDock: equipment.includes('loading-dock'),
      access247: perks.includes('access-24-7'),
      temperatureControl:
        types.includes('cold') ||
        types.includes('frozen') ||
        equipment.includes('chillers') ||
        equipment.includes('freezers'),
    };
  }, [formData]);

  const toggleFacility = (key) => {
    if (key === 'CCTV') {
      toggleCheckbox('CCTV');
      return;
    }

    if (key === 'forklift') {
      toggleArrayValue('equipment', 'forklift');
      return;
    }

    if (key === 'loadingDock') {
      toggleArrayValue('equipment', 'loading-dock');
      return;
    }

    if (key === 'access247') {
      toggleArrayValue('perks', 'access-24-7');
      return;
    }

    if (key === 'temperatureControl') {
      // Prefer warehouseType for clarity; keep equipment aligned as optional hint
      setFormData((prev) => {
        const currentTypes = Array.isArray(prev.warehouseType)
          ? prev.warehouseType
          : [];
        const hasTemp =
          currentTypes.includes('cold') ||
          currentTypes.includes('frozen') ||
          (Array.isArray(prev.equipment) &&
            (prev.equipment.includes('chillers') ||
              prev.equipment.includes('freezers')));

        if (hasTemp) {
          const nextTypes = currentTypes.filter(
            (t) => t !== 'cold' && t !== 'frozen'
          );
          const currentEquip = Array.isArray(prev.equipment)
            ? prev.equipment
            : [];
          const nextEquip = currentEquip.filter(
            (e) => e !== 'chillers' && e !== 'freezers'
          );
          return { ...prev, warehouseType: nextTypes, equipment: nextEquip };
        }

        const nextTypes = currentTypes.includes('cold')
          ? currentTypes
          : [...currentTypes, 'cold'];

        const currentEquip = Array.isArray(prev.equipment) ? prev.equipment : [];
        const nextEquip = currentEquip.includes('chillers')
          ? currentEquip
          : [...currentEquip, 'chillers'];

        return { ...prev, warehouseType: nextTypes, equipment: nextEquip };
      });
      return;
    }
  };

  const servicesState = useMemo(() => {
    const services = Array.isArray(formData.services) ? formData.services : [];
    return {
      insurance: !!formData.insurance,
      packing:
        services.includes('picking-packing') ||
        services.includes('labeling-packaging'),
      delivery: services.includes('transportation'),
    };
  }, [formData]);

  const toggleServiceOffer = (key) => {
    if (key === 'insurance') {
      toggleCheckbox('insurance');
      return;
    }

    if (key === 'packing') {
      setFormData((prev) => {
        const current = Array.isArray(prev.services) ? prev.services : [];
        const hasPacking =
          current.includes('picking-packing') ||
          current.includes('labeling-packaging');

        if (hasPacking) {
          return {
            ...prev,
            services: current.filter(
              (s) => s !== 'picking-packing' && s !== 'labeling-packaging'
            ),
          };
        }

        // Add both for better matching/search
        const next = [...new Set([...current, 'picking-packing', 'labeling-packaging'])];
        return { ...prev, services: next };
      });
      return;
    }

    if (key === 'delivery') {
      toggleArrayValue('services', 'transportation');
      return;
    }
  };

  const validateStep = (stepId) => {
    const nextErrors = {};

    const title = normalizeString(formData.title);
    const address = normalizeString(formData.address);
    const description = normalizeString(formData.description);

    const gpsParsed = parseGpsFlexible(formData.gps);
    const gpsOk =
      gpsParsed &&
      typeof gpsParsed.lat === 'number' &&
      typeof gpsParsed.lng === 'number' &&
      Number.isFinite(gpsParsed.lat) &&
      Number.isFinite(gpsParsed.lng) &&
      gpsParsed.lat >= -90 &&
      gpsParsed.lat <= 90 &&
      gpsParsed.lng >= -180 &&
      gpsParsed.lng <= 180;

    const requireWarehouseType = () => {
      const wt = Array.isArray(formData.warehouseType)
        ? formData.warehouseType
        : [];
      if (wt.length < 1) nextErrors.warehouseType = L.errType;
    };

    const requirePrice = () => {
      // We keep stable backend fields: pricePerDay is used (preferred), price legacy stays
      if (!isFiniteNumber(formData.pricePerDay) || Number(formData.pricePerDay) <= 0) {
        nextErrors.pricePerDay = L.errPrice;
      }
    };

    const requireCapacity = () => {
      const hasArea = isFiniteNumber(formData.totalArea) && Number(formData.totalArea) > 0;
      const hasPallet = isFiniteNumber(formData.palletCapacity) && Number(formData.palletCapacity) > 0;
      if (!hasArea && !hasPallet) {
        nextErrors.totalArea = L.errCapacity;
        nextErrors.palletCapacity = L.errCapacity;
      }
      if (
        isFiniteNumber(formData.totalArea) &&
        isFiniteNumber(formData.availableArea) &&
        Number(formData.totalArea) > 0 &&
        Number(formData.availableArea) > Number(formData.totalArea)
      ) {
        nextErrors.availableArea = L.errAvailableExceeds;
      }
    };

    const requireLocation = () => {
      if (!address) nextErrors.address = L.errAddress;
      if (!gpsOk) nextErrors.gps = L.errGps;
      if (!normalizeString(formData.city)) nextErrors.city = L.errCity;
      if (!normalizeString(formData.zone)) nextErrors.zone = L.errCountry;
    };

    const requireImages = () => {
      if (!Array.isArray(addedPhotos) || addedPhotos.length < MIN_PHOTOS_REQUIRED) {
        nextErrors.addedPhotos = L.errPhotos(MIN_PHOTOS_REQUIRED);
      }
    };

    if (stepId === 'basic') {
      if (!title) nextErrors.title = L.errTitle;
      requireWarehouseType();
      if (!description) nextErrors.description = L.errDescription;
    }

    if (stepId === 'capacity') {
      requireCapacity();
      requirePrice();
    }

    if (stepId === 'location') {
      requireLocation();
    }

    if (stepId === 'availability') {
      const from = normalizeString(formData.checkIn);
      if (!from) nextErrors.checkIn = L.errCheckIn;
      const rules = normalizeString(formData.extraInfo);
      if (!rules) nextErrors.extraInfo = L.errRules;
    }

    if (stepId === 'images') {
      requireImages();
    }

    if (stepId === 'review') {
      // full validation gate
      if (!title) nextErrors.title = L.errTitle;
      if (!description) nextErrors.description = L.errDescription;
      requireWarehouseType();
      requireCapacity();
      requirePrice();
      requireLocation();
      const from = normalizeString(formData.checkIn);
      if (!from) nextErrors.checkIn = L.errCheckIn;
      const rules = normalizeString(formData.extraInfo);
      if (!rules) nextErrors.extraInfo = L.errRules;
      requireImages();
    }

    return { ok: Object.keys(nextErrors).length === 0, nextErrors };
  };

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    axiosInstance
      .get(`/places/${id}`)
      .then((response) => {
        const { place } = response.data;

        setFormData((prev) => {
          const updated = { ...prev };
          Object.keys(prev).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(place, key)) {
              updated[key] =
                place[key] === null || place[key] === undefined ? prev[key] : place[key];
            }
          });

          // Backward-compat: if older listing used "price" only, copy to pricePerDay for UX
          if (
            (!isFiniteNumber(updated.pricePerDay) || Number(updated.pricePerDay) <= 0) &&
            isFiniteNumber(place?.price) &&
            Number(place.price) > 0
          ) {
            updated.pricePerDay = Number(place.price);
          }

          // Ensure arrays
          updated.warehouseType = Array.isArray(updated.warehouseType) ? updated.warehouseType : [];
          updated.equipment = Array.isArray(updated.equipment) ? updated.equipment : [];
          updated.perks = Array.isArray(updated.perks) ? updated.perks : [];
          updated.services = Array.isArray(updated.services) ? updated.services : [];

          return updated;
        });

        setAddedPhotos(Array.isArray(place.photos) ? place.photos : []);
      })
      .catch(() => {
        toast.error(L.toastLoadFailed);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const buildPayload = () => {
    // Normalize GPS (prevents swapped lat/lng and URL-only values)
    const normalizedGps = (() => {
      const parsed = parseGpsFlexible(formData.gps);
      return parsed ? formatGps(parsed) : formData.gps;
    })();

    // Keep data shape stable (backend expects addedPhotos + rest)
    // Map UI priceUnit into existing fields without changing backend schema.
    const pricePerDay =
      isFiniteNumber(formData.pricePerDay) && Number(formData.pricePerDay) > 0
        ? Number(formData.pricePerDay)
        : '';

    const legacyPrice =
      isFiniteNumber(formData.price) && Number(formData.price) > 0
        ? Number(formData.price)
        : '';

    const payload = {
      ...formData,
      gps: normalizedGps,
      pricePerDay,
      price: legacyPrice || pricePerDay || formData.price,
      addedPhotos,
    };

    // UI-only helper must not go to backend
    delete payload.priceUnit;

    return payload;
  };

  const savePlace = async (e) => {
    e.preventDefault();

    const { ok, nextErrors } = validateStep('review');
    setErrors(nextErrors);
    if (!ok) {
      toast.error(L.toastFixFields);
      return;
    }

    try {
      const payload = buildPayload();
      if (id) {
        await axiosInstance.put('/places/update-place', { id, ...payload });
      } else {
        await axiosInstance.post('/places/add-places', payload);
      }
      toast.success(L.toastSaved);
      setRedirect(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || L.toastSaveFailed);
    }
  };

  if (redirect) {
    return <Navigate to="/account/places" />;
  }

  if (loading) {
    return <Spinner />;
  }

  return (
    <div>
      <AccountNav />

      <form className="mx-auto max-w-5xl px-4 pb-10" onSubmit={savePlace}>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{id ? L.pageTitleEdit : L.pageTitleAdd}</h1>
            <p className="mt-1 text-sm text-gray-500">{L.pageSubtitle}</p>
          </div>

          <div className="text-sm text-gray-600">
            {L.stepWord} <span className="font-semibold">{stepIndex + 1}</span> {L.ofWord}{' '}
            <span className="font-semibold">{stepList.length}</span>
          </div>
        </div>

        <div className="mt-4">
          <Stepper
            activeStep={activeStep}
            stepIndex={stepIndex}
            validateStep={validateStep}
            goStep={goStep}
            L={L}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          {/* MAIN */}
          <div className="space-y-6">
            {/* 1) BASIC INFO */}
            {activeStep === 'basic' && (
              <SectionCard title={L.stepBasic} subtitle={L.basicSubtitle}>
                <div className="grid gap-4">
                  <div>
                    <FieldLabel>{L.warehouseName}</FieldLabel>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setField('title', e.target.value)}
                      placeholder={L.warehouseNamePh}
                      required
                    />
                    <FieldError errors={errors} name="title" />
                  </div>

                  <div>
                    <FieldLabel>{L.warehouseType}</FieldLabel>
                    <WarehouseTypeSelector
                      warehouseType={formData.warehouseType}
                      setMainType={setMainWarehouseType}
                      L={L}
                    />
                    <FieldError errors={errors} name="warehouseType" />
                  </div>

                  <div>
                    <FieldLabel>{L.shortDescription}</FieldLabel>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder={L.shortDescriptionPh}
                      className="min-h-[120px]"
                      required
                    />
                    <FieldError errors={errors} name="description" />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 2) CAPACITY & PRICING */}
            {activeStep === 'capacity' && (
              <SectionCard title={L.stepCapacity} subtitle={L.capacitySubtitle}>
                <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>{L.totalAreaLabel}</FieldLabel>
                      <input
                        type="number"
                        value={formData.totalArea}
                        onChange={(e) => setField('totalArea', e.target.value)}
                        placeholder={L.ph500}
                        min="0"
                      />
                      <FieldError errors={errors} name="totalArea" />
                    </div>

                    <div>
                      <FieldLabel>{L.availableAreaLabel}</FieldLabel>
                      <input
                        type="number"
                        value={formData.availableArea}
                        onChange={(e) => setField('availableArea', e.target.value)}
                        placeholder={L.ph200}
                        min="0"
                      />
                      <FieldError errors={errors} name="availableArea" />
                    </div>

                    <div>
                      <FieldLabel>{L.palletCapacityLabel}</FieldLabel>
                      <input
                        type="number"
                        value={formData.palletCapacity}
                        onChange={(e) => setField('palletCapacity', e.target.value)}
                        placeholder={L.ph1200}
                        min="0"
                      />
                      <FieldError errors={errors} name="palletCapacity" />
                    </div>

                    <div>
                      <FieldLabel>{L.legacyUnitsLabel}</FieldLabel>
                      <input
                        type="number"
                        value={formData.maxGuests}
                        onChange={(e) => setField('maxGuests', e.target.value)}
                        placeholder={L.ph50}
                        min="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">{L.legacyUnitsHint}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <FieldLabel>{L.pricePerUnit}</FieldLabel>
                        <input
                          type="number"
                          value={formData.pricePerDay}
                          onChange={(e) => setField('pricePerDay', e.target.value)}
                          placeholder={L.ph25}
                          min="0"
                          required
                        />
                        <FieldError errors={errors} name="pricePerDay" />
                      </div>

                      <div className="sm:w-48">
                        <FieldLabel>{L.billingPeriod}</FieldLabel>
                        <select
                          value={formData.priceUnit}
                          onChange={(e) => setField('priceUnit', e.target.value)}
                        >
                          <option value="day">{L.perDay}</option>
                          <option value="month">{L.perMonth}</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">{L.billingHint}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <input
                        id="negotiablePrice"
                        type="checkbox"
                        checked={!!formData.negotiablePrice}
                        onChange={() => toggleCheckbox('negotiablePrice')}
                      />
                      <label htmlFor="negotiablePrice" className="text-sm font-medium text-gray-800">
                        {L.negotiable}
                      </label>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 3) LOCATION */}
            {activeStep === 'location' && (
              <SectionCard title={L.stepLocation} subtitle={L.locationSubtitle}>
                <div className="grid gap-5">
                  <div>
                    <FieldLabel>{L.mapLocation}</FieldLabel>
                    <LocationPicker
                      gpsValue={formData.gps}
                      addressValue={formData.address}
                      onChange={(patch) => {
                        if (patch?.gps !== undefined) setField('gps', patch.gps);
                        if (patch?.address !== undefined) setField('address', patch.address);
                        if (patch?.city !== undefined && patch.city) setField('city', patch.city);
                      }}
                      className="mt-2"
                    />
                    <FieldError errors={errors} name="gps" />
                  </div>

                  <div>
                    <FieldLabel>{L.address}</FieldLabel>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setField('address', e.target.value)}
                      placeholder={L.addressPh}
                      required
                    />
                    <FieldError errors={errors} name="address" />
                    <p className="mt-1 text-xs text-gray-500">{L.addressHint}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>{L.city}</FieldLabel>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setField('city', e.target.value)}
                        placeholder={L.cityPh}
                        required
                      />
                      <FieldError errors={errors} name="city" />
                    </div>

                    <div>
                      <FieldLabel>{L.country}</FieldLabel>
                      <input
                        type="text"
                        value={formData.zone}
                        onChange={(e) => setField('zone', e.target.value)}
                        placeholder={L.countryPh}
                        required
                      />
                      <FieldError errors={errors} name="zone" />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 4) FACILITIES */}
            {activeStep === 'facilities' && (
              <SectionCard title={L.stepFacilities} subtitle={L.facilitiesSubtitle}>
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FACILITIES.map((f) => {
                      const checked = !!facilityState[f.key];
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => toggleFacility(f.key)}
                          className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm transition ${
                            checked ? 'border-primary bg-primary/5' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{L[f.labelKey]}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {f.key === 'temperatureControl' ? L.facTempHint : L.facDefaultHint}
                            </p>
                          </div>
                          <span
                            className={`h-5 w-5 rounded-md border ${
                              checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-800">{L.optionalNotes}</p>
                    <p className="mt-1 text-xs text-gray-500">{L.optionalNotesHint}</p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* 5) SERVICES OFFERED */}
            {activeStep === 'services' && (
              <SectionCard title={L.stepServices} subtitle={L.servicesSubtitle}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SERVICES_OFFERED.map((s) => {
                    const checked = !!servicesState[s.key];
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleServiceOffer(s.key)}
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm transition ${
                          checked ? 'border-primary bg-primary/5' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{L[s.labelKey]}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {s.key === 'delivery'
                              ? L.svcDeliveryHint
                              : s.key === 'packing'
                                ? L.svcPackingHint
                                : L.svcInsuranceHint}
                          </p>
                        </div>
                        <span
                          className={`h-5 w-5 rounded-md border ${
                            checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* 6) AVAILABILITY & RULES */}
            {activeStep === 'availability' && (
              <SectionCard title={L.stepAvailability} subtitle={L.availabilitySubtitle}>
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>{L.availableFrom}</FieldLabel>
                      <input
                        type="date"
                        value={formData.checkIn}
                        onChange={(e) => setField('checkIn', e.target.value)}
                        required
                      />
                      <FieldError errors={errors} name="checkIn" />
                    </div>

                    <div>
                      <FieldLabel>{L.availableUntil}</FieldLabel>
                      <input
                        type="date"
                        value={formData.checkOut}
                        onChange={(e) => setField('checkOut', e.target.value)}
                      />
                      <p className="mt-1 text-xs text-gray-500">{L.availableUntilHint}</p>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>{L.basicRules}</FieldLabel>
                    <textarea
                      value={formData.extraInfo}
                      onChange={(e) => setField('extraInfo', e.target.value)}
                      placeholder={L.basicRulesPh}
                      className="min-h-[140px]"
                      required
                    />
                    <FieldError errors={errors} name="extraInfo" />
                  </div>

                  <details className="rounded-2xl border bg-white p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                      {L.advancedLegacy}
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>{L.minBookingDays}</FieldLabel>
                          <input
                            type="number"
                            value={formData.minBookingDays}
                            onChange={(e) => setField('minBookingDays', e.target.value)}
                            min="0"
                            placeholder={L.ph3}
                          />
                        </div>
                        <div>
                          <FieldLabel>{L.maxBookingDays}</FieldLabel>
                          <input
                            type="number"
                            value={formData.maxBookingDays}
                            onChange={(e) => setField('maxBookingDays', e.target.value)}
                            min="0"
                            placeholder={L.ph30}
                          />
                        </div>
                      </div>

                      <div>
                        <FieldLabel>{L.legacyPerks}</FieldLabel>
                        <Perks
                          selected={Array.isArray(formData.perks) ? formData.perks : []}
                          handleFormData={(e) => {
                            // keep original perks component behavior stable
                            const { type, name, checked } = e.target;
                            if (type === 'checkbox') {
                              setFormData((prev) => {
                                const current = Array.isArray(prev.perks) ? prev.perks : [];
                                const exists = current.includes(name);
                                const next = checked
                                  ? exists
                                    ? current
                                    : [...current, name]
                                  : current.filter((p) => p !== name);
                                return { ...prev, perks: next };
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </details>
                </div>
              </SectionCard>
            )}

            {/* 7) IMAGES */}
            {activeStep === 'images' && (
              <SectionCard
                title={L.stepImages}
                subtitle={L.imagesSubtitle(MIN_PHOTOS_REQUIRED)}
              >
                <div>
                  <PhotosUploader addedPhotos={addedPhotos} setAddedPhotos={setAddedPhotos} />
                  <FieldError errors={errors} name="addedPhotos" />
                  <p className="mt-2 text-xs text-gray-500">
                    {L.imagesHint(MIN_PHOTOS_REQUIRED)}
                  </p>
                </div>
              </SectionCard>
            )}

            {/* 8) REVIEW & PUBLISH */}
            {activeStep === 'review' && (
              <SectionCard title={L.stepReview} subtitle={L.reviewSubtitle}>
                <div className="grid gap-5">
                  <div className="rounded-2xl border bg-white">
                    <div className="px-5 py-4">
                      <h3 className="text-base font-semibold text-gray-900">{L.summary}</h3>
                      <p className="mt-1 text-sm text-gray-500">{L.summaryHint}</p>
                    </div>
                    <div className="px-5 pb-2">
                      <SummaryRow label={L.warehouseName} value={normalizeString(formData.title)} />
                      <SummaryRow
                        label={L.warehouseType}
                        value={
                          Array.isArray(formData.warehouseType) && formData.warehouseType.length
                            ? formData.warehouseType
                                .map((t) => {
                                  const opt = WAREHOUSE_TYPES.find((o) => o.value === t);
                                  return opt ? L[opt.labelKey] : t;
                                })
                                .join(', ')
                            : ''
                        }
                      />
                      <SummaryRow
                        label={L.shortDescription}
                        value={normalizeString(formData.description)}
                      />
                      <SummaryRow
                        label={L.sumCapacity}
                        value={[
                          isFiniteNumber(formData.totalArea)
                            ? `${Number(formData.totalArea)} ${L.unitM2}`
                            : '',
                          isFiniteNumber(formData.availableArea)
                            ? `${Number(formData.availableArea)} ${L.unitM2} ${L.availableSuffix}`
                            : '',
                          isFiniteNumber(formData.palletCapacity)
                            ? `${Number(formData.palletCapacity)} ${L.palletsWord}`
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      />
                      <SummaryRow
                        label={L.sumPricing}
                        value={
                          isFiniteNumber(formData.pricePerDay)
                            ? `${Number(formData.pricePerDay)} ${L.perDayShort}${
                                formData.negotiablePrice ? ` ${L.negotiableShort}` : ''
                              }`
                            : ''
                        }
                      />
                      <SummaryRow
                        label={L.sumLocation}
                        value={[
                          normalizeString(formData.address),
                          normalizeString(formData.city),
                          normalizeString(formData.zone),
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      />
                      <SummaryRow
                        label={L.sumFacilities}
                        value={FACILITIES.filter((f) => !!facilityState[f.key])
                          .map((f) => L[f.labelKey])
                          .join(', ')}
                      />
                      <SummaryRow
                        label={L.sumServices}
                        value={SERVICES_OFFERED.filter((s) => !!servicesState[s.key])
                          .map((s) => L[s.labelKey])
                          .join(', ')}
                      />
                      <SummaryRow
                        label={L.availableFrom}
                        value={normalizeString(formData.checkIn)}
                      />
                      <SummaryRow
                        label={L.sumRules}
                        value={normalizeString(formData.extraInfo)}
                      />
                      <SummaryRow
                        label={L.sumImages}
                        value={
                          Array.isArray(addedPhotos)
                            ? `${addedPhotos.length} ${L.uploadedWord}`
                            : `0 ${L.uploadedWord}`
                        }
                      />
                    </div>
                  </div>

                  {/* Inline validation callouts */}
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">{L.finalChecks}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      <li className={errors.title ? 'text-red-700' : ''}>
                        {L.chkName} {errors.title ? `— ${errors.title}` : `— ${L.checkOk}`}
                      </li>
                      <li className={errors.warehouseType ? 'text-red-700' : ''}>
                        {L.chkType}{' '}
                        {errors.warehouseType ? `— ${errors.warehouseType}` : `— ${L.checkOk}`}
                      </li>
                      <li className={errors.description ? 'text-red-700' : ''}>
                        {L.chkDescription}{' '}
                        {errors.description ? `— ${errors.description}` : `— ${L.checkOk}`}
                      </li>
                      <li className={errors.pricePerDay ? 'text-red-700' : ''}>
                        {L.chkPrice}{' '}
                        {errors.pricePerDay ? `— ${errors.pricePerDay}` : `— ${L.checkOk}`}
                      </li>
                      <li className={errors.gps || errors.address || errors.city || errors.zone ? 'text-red-700' : ''}>
                        {L.chkLocation}{' '}
                        {errors.gps || errors.address || errors.city || errors.zone
                          ? `— ${errors.gps || errors.address || errors.city || errors.zone}`
                          : `— ${L.checkOk}`}
                      </li>
                      <li className={errors.checkIn ? 'text-red-700' : ''}>
                        {L.chkAvailability}{' '}
                        {errors.checkIn ? `— ${errors.checkIn}` : `— ${L.checkOk}`}
                      </li>
                      <li className={errors.extraInfo ? 'text-red-700' : ''}>
                        {L.chkRules} {errors.extraInfo ? `— ${errors.extraInfo}` : `— ${L.checkOk}`}
                      </li>
                      <li className={errors.addedPhotos ? 'text-red-700' : ''}>
                        {L.chkImages}{' '}
                        {errors.addedPhotos ? `— ${errors.addedPhotos}` : `— ${L.checkOk}`}
                      </li>
                    </ul>
                  </div>
                </div>
              </SectionCard>
            )}

            <NavButtons
              stepIndex={stepIndex}
              onBack={goBack}
              onNext={goNext}
              showPublish={activeStep === 'review'}
              L={L}
            />
          </div>

          {/* SIDE PANEL */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">{L.listingQuality}</h3>
              <p className="mt-1 text-sm text-gray-500">{L.listingQualityHint}</p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{L.qualityNameType}</span>
                  <span className="font-semibold text-gray-900">
                    {normalizeString(formData.title) &&
                    Array.isArray(formData.warehouseType) &&
                    formData.warehouseType.length
                      ? L.done
                      : L.pending}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{L.qualityCapacityPrice}</span>
                  <span className="font-semibold text-gray-900">
                    {(isFiniteNumber(formData.totalArea) ||
                      isFiniteNumber(formData.palletCapacity)) &&
                    isFiniteNumber(formData.pricePerDay)
                      ? L.done
                      : L.pending}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{L.qualityMapAddress}</span>
                  <span className="font-semibold text-gray-900">
                    {parseGpsFlexible(formData.gps) && normalizeString(formData.address)
                      ? L.done
                      : L.pending}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{L.qualityImages}</span>
                  <span className="font-semibold text-gray-900">
                    {Array.isArray(addedPhotos) && addedPhotos.length >= MIN_PHOTOS_REQUIRED
                      ? L.done
                      : L.pending}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">Quick tips</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
                <li>Use a specific name (city + type).</li>
                <li>Ensure available capacity matches your operational reality.</li>
                <li>Pin the exact location; the address should match the map marker.</li>
                <li>Add facility/services that you truly offer to avoid disputes.</li>
                <li>Upload clear photos (access points + interior).</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlacesFormPage;
