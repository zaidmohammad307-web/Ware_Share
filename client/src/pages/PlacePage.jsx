// client/src/pages/PlacePage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import BookingWidget from '../components/ui/BookingWidget';
import PlaceMap from '../components/ui/PlaceMap';
import PhotoLightbox from '../components/ui/PhotoLightbox';
import { usePageTitle } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const labelMaps = {
  EN: {
    warehouseType: {
      general: 'General storage',
      cold: 'Cold storage',
      frozen: 'Frozen storage',
      dry: 'Dry / ambient storage',
      hazmat: 'Hazardous material storage',
      bonded: 'Bonded warehouse',
      fulfillment: 'Fulfillment center',
      'cross-docking': 'Cross-docking facility',
    },
    equipment: {
      forklift: 'Forklift',
      'electric-pallet-jack': 'Electric pallet jack',
      'manual-pallet-jack': 'Manual pallet jack',
      'reach-truck': 'Reach truck',
      stacker: 'Stacker',
      conveyor: 'Conveyor',
      crane: 'Crane',
      racks: 'Racks / shelves',
      chillers: 'Chillers',
      freezers: 'Freezers',
      ventilation: 'Ventilation',
      'loading-dock': 'Loading docks',
      'dock-leveler': 'Dock leveler',
      ramp: 'Ramp',
      'roll-up-door': 'Roll-up doors',
    },
    truckAccess: {
      '20ft': '20 ft container',
      '40ft': '40 ft container',
      trailer: 'Long trailer / truck',
    },
    services: {
      'inventory-management': 'Inventory management',
      'labeling-packaging': 'Labeling & packaging',
      'picking-packing': 'Picking & packing',
      'quality-inspection': 'Quality inspections',
      transportation: 'Transportation',
      'customs-clearance': 'Customs clearance',
      'cross-docking': 'Cross-docking / transit handling',
    },
    allowedGoods: {
      fmcg: 'FMCG',
      electronics: 'Electronics',
      pharma: 'Pharma',
      clothing: 'Clothing / textiles',
      automotive: 'Automotive',
      industrial: 'Industrial goods',
      food: 'Food items',
      chemicals: 'Chemicals',
    },
  },

  AR: {
    warehouseType: {
      general: 'تخزين عام',
      cold: 'تخزين مبرّد',
      frozen: 'تخزين مجمّد',
      dry: 'تخزين جاف / بدرجة حرارة الغرفة',
      hazmat: 'تخزين المواد الخطرة',
      bonded: 'مستودع جمركي',
      fulfillment: 'مركز تجهيز الطلبات',
      'cross-docking': 'منشأة عبور وتحميل مباشر',
    },
    equipment: {
      forklift: 'رافعة شوكية',
      'electric-pallet-jack': 'مرفاع منصات كهربائي',
      'manual-pallet-jack': 'مرفاع منصات يدوي',
      'reach-truck': 'رافعة ريتش',
      stacker: 'رافعة تكديس',
      conveyor: 'سير ناقل',
      crane: 'رافعة',
      racks: 'رفوف / أرفف تخزين',
      chillers: 'أجهزة تبريد',
      freezers: 'أجهزة تجميد',
      ventilation: 'تهوية',
      'loading-dock': 'أرصفة تحميل',
      'dock-leveler': 'معدّل ارتفاع الرصيف',
      ramp: 'منحدر تحميل',
      'roll-up-door': 'أبواب رول',
    },
    truckAccess: {
      '20ft': 'حاوية 20 قدم',
      '40ft': 'حاوية 40 قدم',
      trailer: 'مقطورة / شاحنة طويلة',
    },
    services: {
      'inventory-management': 'إدارة المخزون',
      'labeling-packaging': 'الملصقات والتغليف',
      'picking-packing': 'الانتقاء والتعبئة',
      'quality-inspection': 'فحوصات الجودة',
      transportation: 'النقل',
      'customs-clearance': 'التخليص الجمركي',
      'cross-docking': 'العبور والمناولة المباشرة',
    },
    allowedGoods: {
      fmcg: 'السلع الاستهلاكية سريعة الدوران',
      electronics: 'الإلكترونيات',
      pharma: 'الأدوية',
      clothing: 'الملابس والمنسوجات',
      automotive: 'قطع السيارات',
      industrial: 'البضائع الصناعية',
      food: 'المواد الغذائية',
      chemicals: 'المواد الكيميائية',
    },
  },
};

const STR = {
  EN: {
    warehouse: 'Warehouse',
    listSeparator: ', ',
    shareFallbackTitle: 'Warehouse on WareShare',
    linkCopied: 'Link copied to clipboard',
    shareFailed: 'Could not share the link.',
    listingGone: 'This warehouse listing no longer exists.',
    loadFailed: 'Failed to load warehouse. Please try again.',
    loadingWarehouse: 'Loading warehouse...',
    warehouseNotFound: 'Warehouse not found.',

    // Key facts
    totalCapacity: 'Total capacity',
    availableNow: 'Available now',
    palletCapacity: 'Pallet capacity',
    pallets: 'pallets',
    storageDuration: 'Storage duration',
    days: 'days',
    min: 'Min',
    max: 'Max',
    basePrice: 'Base price',
    priceOnRequest: 'Price on request',
    perDay: '/ day',
    warehouseTypeLabel: 'Warehouse type',
    securityLevel: 'Security level',
    securityHigh: 'High',
    securityStandard: 'Standard',
    securityBasic: 'Basic',

    daysAvailable: (n) => `${n}/7 days available`,

    // Badges
    negotiable: 'Negotiable',
    insuranceAvailable: 'Insurance available',
    packingAvailable: 'Packing available',
    deliveryAvailable: 'Delivery available',

    // Feature bullets
    cctv: 'CCTV surveillance',
    guards: '24/7 security guards',
    fireSuppression: 'Fire suppression system',
    smokeDetectors: 'Smoke detectors',
    tempControlled: 'Temperature-controlled capability',
    loadingDocks: 'Loading docks',
    forkliftAvailable: 'Forklift available',
    racksInstalled: 'Racks installed',
    parkingAvailable: 'Parking available',
    foodGrade: 'Food-grade certified',
    hazmatCert: 'Hazmat certified',
    iso: (v) => `ISO: ${v}`,

    // Best-for tags
    bestForPrefix: 'Best for:',
    tagEcommerce: 'E-commerce fulfillment',
    tagFmcg: 'FMCG storage',
    tagElectronics: 'Electronics',
    tagPharma: 'Pharma',
    tagHighVolume: 'High-volume',
    tagColdChain: 'Cold chain',
    tagSmes: 'SMEs',
    tagImportExport: 'Import/Export',

    // Calendar
    weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    unavailable: 'Unavailable',
    today: 'Today',

    // Hero
    share: 'Share',
    shareTitle: 'Share this warehouse',
    locationFallback: 'Location',
    host: 'Host',
    startingFrom: 'Starting from',
    negotiablePricing: 'Negotiable pricing',
    contactHost: 'Contact host',
    requestBooking: 'Request booking',
    viewHostProfile: 'View host profile',

    // Gallery
    viewAllPhotos: (n) => `View all ${n} photo${n === 1 ? '' : 's'}`,
    viewLocation: 'View location',
    servicesAddons: 'Services & add-ons',
    reviews: 'Reviews',

    // At a glance
    atAGlance: 'At a glance',
    atAGlanceSub: 'Key warehouse information for quick evaluation.',
    optionalPricing: 'Optional pricing components',
    perPalletPerDay: 'Per pallet / day',
    loadingFee: 'Loading / unloading fee',
    tempControlSurcharge: 'Temperature control surcharge',

    // Description
    descriptionFeatures: 'Description & features',
    noDescription: 'No description provided.',
    highlights: 'Highlights',
    equipment: 'Equipment',
    truckAccess: 'Truck access',
    allowedGoods: 'Allowed goods',
    notesRules: 'Notes / rules',

    // Location
    location: 'Location',
    locationSub: 'Map marker reflects the stored GPS coordinates.',
    mapUnavailable:
      'Map is not available for this warehouse (missing GPS coordinates).',
    address: 'Address',
    addressNotProvided: 'Address not provided',
    addressNote: 'Exact address details may be confirmed during booking and chat.',

    // Services
    servicesSub:
      'These indicate what the host can support. You can select add-ons during booking.',
    insurance: 'Insurance',
    packing: 'Packing',
    delivery: 'Delivery',
    insuranceYes: 'Available (coverage options during booking).',
    packingYes: 'Available (labeling / packing / handling support).',
    deliveryYes: 'Available (pickup / drop-off options during booking).',
    notListed: 'Not listed as available.',
    additionalServices: 'Additional services',
    restrictions: 'Restrictions',

    // Host
    hostSection: 'Host',
    hostSub: 'View the host profile and start a conversation before booking.',

    // Reviews
    reviewsSub: 'Feedback from renters who booked this warehouse.',
    loadingReviews: 'Loading reviews...',
    noReviews: 'No reviews yet. Be the first to book and review this warehouse.',
    anonymous: 'Anonymous',
    outOf5: (r) => `(${r} / 5)`,
    seeAllReviews: 'See all reviews',
    seeFewerReviews: 'See fewer reviews',
    reviewCount: (n) => (n === 1 ? '1 review' : `${n} reviews`),

    // Sidebar
    bookingSummary: 'Booking summary',
    addonsNote: 'Add-ons available during booking (insurance, packing, delivery).',
    fixed: 'Fixed',
    availability: 'Availability',
    mostlyAvailable: 'Mostly available',
    loadingAvailability: 'Loading availability...',
    noBlockedDates: 'No blocked dates yet. Most days are available to book.',
    bookingRules: 'Booking rules',
    minimumBooking: 'Minimum booking',
    maximumBooking: 'Maximum booking',
    dayCount: (n) => `${n} day${n > 1 ? 's' : ''}`,
    defaultTimes: 'Default times',
    checkInLabel: (v) => `Check-in: ${v}`,
    checkOutLabel: (v) => `Check-out: ${v}`,

    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    monthsShort: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
  },

  AR: {
    warehouse: 'مستودع',
    listSeparator: '، ',
    shareFallbackTitle: 'مستودع على وير شير',
    linkCopied: 'تم نسخ الرابط',
    shareFailed: 'تعذّرت مشاركة الرابط.',
    listingGone: 'لم يعد هذا الإعلان متوفرًا.',
    loadFailed: 'تعذّر تحميل بيانات المستودع. يرجى المحاولة مرة أخرى.',
    loadingWarehouse: 'جارٍ تحميل المستودع...',
    warehouseNotFound: 'لم يتم العثور على المستودع.',

    // Key facts
    totalCapacity: 'السعة الإجمالية',
    availableNow: 'المتاح حاليًا',
    palletCapacity: 'سعة المنصات',
    pallets: 'منصة',
    storageDuration: 'مدة التخزين',
    days: 'يوم',
    min: 'حد أدنى',
    max: 'حد أقصى',
    basePrice: 'السعر الأساسي',
    priceOnRequest: 'السعر عند الطلب',
    perDay: '/ يوم',
    warehouseTypeLabel: 'نوع المستودع',
    securityLevel: 'مستوى الأمان',
    securityHigh: 'مرتفع',
    securityStandard: 'قياسي',
    securityBasic: 'أساسي',

    daysAvailable: (n) => `${n}/7 أيام متاحة`,

    // Badges
    negotiable: 'قابل للتفاوض',
    insuranceAvailable: 'التأمين متاح',
    packingAvailable: 'التغليف متاح',
    deliveryAvailable: 'التوصيل متاح',

    // Feature bullets
    cctv: 'مراقبة بكاميرات',
    guards: 'حراسة أمنية على مدار الساعة',
    fireSuppression: 'نظام إطفاء حريق',
    smokeDetectors: 'كواشف دخان',
    tempControlled: 'إمكانية التحكم بدرجة الحرارة',
    loadingDocks: 'أرصفة تحميل',
    forkliftAvailable: 'رافعة شوكية متوفرة',
    racksInstalled: 'رفوف مركّبة',
    parkingAvailable: 'مواقف متاحة',
    foodGrade: 'معتمد للمواد الغذائية',
    hazmatCert: 'معتمد للمواد الخطرة',
    iso: (v) => `شهادة ISO: ${v}`,

    // Best-for tags
    bestForPrefix: 'الأنسب لـ:',
    tagEcommerce: 'تجهيز طلبات التجارة الإلكترونية',
    tagFmcg: 'تخزين السلع سريعة الدوران',
    tagElectronics: 'الإلكترونيات',
    tagPharma: 'الأدوية',
    tagHighVolume: 'الكميات الكبيرة',
    tagColdChain: 'سلسلة التبريد',
    tagSmes: 'الشركات الصغيرة والمتوسطة',
    tagImportExport: 'الاستيراد والتصدير',

    // Calendar
    weekdays: ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'],
    prevMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    unavailable: 'غير متاح',
    today: 'اليوم',

    // Hero
    share: 'مشاركة',
    shareTitle: 'شارك هذا المستودع',
    locationFallback: 'الموقع',
    host: 'المضيف',
    startingFrom: 'يبدأ من',
    negotiablePricing: 'التسعير قابل للتفاوض',
    contactHost: 'تواصل مع المضيف',
    requestBooking: 'إرسال طلب حجز',
    viewHostProfile: 'عرض ملف المضيف',

    // Gallery
    viewAllPhotos: (n) => `عرض جميع الصور (${n})`,
    viewLocation: 'عرض الموقع',
    servicesAddons: 'الخدمات والإضافات',
    reviews: 'التقييمات',

    // At a glance
    atAGlance: 'نظرة سريعة',
    atAGlanceSub: 'أبرز معلومات المستودع لتقييم سريع.',
    optionalPricing: 'مكوّنات تسعير اختيارية',
    perPalletPerDay: 'لكل منصة / يوم',
    loadingFee: 'رسوم التحميل والتفريغ',
    tempControlSurcharge: 'رسوم إضافية للتحكم بالحرارة',

    // Description
    descriptionFeatures: 'الوصف والمواصفات',
    noDescription: 'لا يوجد وصف.',
    highlights: 'أبرز المزايا',
    equipment: 'المعدات',
    truckAccess: 'وصول الشاحنات',
    allowedGoods: 'البضائع المسموح بها',
    notesRules: 'ملاحظات / قواعد',

    // Location
    location: 'الموقع',
    locationSub: 'يعكس مؤشر الخريطة الإحداثيات المسجّلة.',
    mapUnavailable: 'الخريطة غير متاحة لهذا المستودع (لا توجد إحداثيات).',
    address: 'العنوان',
    addressNotProvided: 'لم يتم إدخال العنوان',
    addressNote: 'قد يتم تأكيد تفاصيل العنوان الدقيقة أثناء الحجز والمحادثة.',

    // Services
    servicesSub:
      'تشير هذه الخدمات إلى ما يمكن للمضيف توفيره. يمكنك اختيار الإضافات أثناء الحجز.',
    insurance: 'التأمين',
    packing: 'التغليف',
    delivery: 'التوصيل',
    insuranceYes: 'متاح (تُحدَّد خيارات التغطية أثناء الحجز).',
    packingYes: 'متاح (ملصقات / تغليف / مناولة).',
    deliveryYes: 'متاح (خيارات الاستلام والتسليم أثناء الحجز).',
    notListed: 'غير مدرج كخدمة متاحة.',
    additionalServices: 'خدمات إضافية',
    restrictions: 'القيود',

    // Host
    hostSection: 'المضيف',
    hostSub: 'اطّلع على ملف المضيف وابدأ محادثة قبل الحجز.',

    // Reviews
    reviewsSub: 'آراء المستأجرين الذين حجزوا هذا المستودع.',
    loadingReviews: 'جارٍ تحميل التقييمات...',
    noReviews: 'لا توجد تقييمات بعد. كن أول من يحجز ويقيّم هذا المستودع.',
    anonymous: 'مستخدم غير معروف',
    outOf5: (r) => `(${r} / 5)`,
    seeAllReviews: 'عرض جميع التقييمات',
    seeFewerReviews: 'عرض عدد أقل',
    reviewCount: (n) => (n === 1 ? 'تقييم واحد' : `${n} تقييمًا`),

    // Sidebar
    bookingSummary: 'ملخص الحجز',
    addonsNote: 'تتوفر إضافات أثناء الحجز (تأمين، تغليف، توصيل).',
    fixed: 'ثابت',
    availability: 'التوفر',
    mostlyAvailable: 'متاح في معظم الأيام',
    loadingAvailability: 'جارٍ تحميل التوفر...',
    noBlockedDates: 'لا توجد أيام محجوزة بعد. معظم الأيام متاحة للحجز.',
    bookingRules: 'قواعد الحجز',
    minimumBooking: 'الحد الأدنى للحجز',
    maximumBooking: 'الحد الأقصى للحجز',
    dayCount: (n) => `${n} يوم`,
    defaultTimes: 'الأوقات الافتراضية',
    checkInLabel: (v) => `الدخول: ${v}`,
    checkOutLabel: (v) => `الخروج: ${v}`,

    months: [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ],
    monthsShort: [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ],
  },
};

const renderTagList = (items, map) => {
  if (!items || !items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
        >
          {map[item] || item}
        </span>
      ))}
    </div>
  );
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const PlacePage = () => {
  const { id } = useParams();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placeError, setPlaceError] = useState(null);

  const { formatPrice, lang } = usePrefs();
  const L = STR[lang] || STR.EN;
  const maps = labelMaps[lang] || labelMaps.EN;

  usePageTitle(place?.title || L.warehouse);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const handleShare = async () => {
    const url = window.location.href;
    const title = place?.title || L.shareFallbackTitle;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(L.linkCopied);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error(L.shareFailed);
      }
    }
  };

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // 📅 Availability calendar state
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  useEffect(() => {
    const loadPlace = async () => {
      try {
        setLoading(true);
        setPlaceError(null);
        const { data } = await axiosInstance.get(`/places/${id}`);
        setPlace(data.place || data);
      } catch (err) {
        const status = err?.response?.status;
        setPlaceError(status === 404 ? 'notFound' : 'loadFailed');
      } finally {
        setLoading(false);
      }
    };

    const loadReviews = async () => {
      try {
        setReviewsLoading(true);
        const { data } = await axiosInstance.get(`/reviews/place/${id}`);
        setReviews(data.reviews || []);
      } catch (_) {
        // silently fail; reviews stay empty
      } finally {
        setReviewsLoading(false);
      }
    };

    const loadAvailability = async () => {
      try {
        setAvailabilityLoading(true);
        const { data } = await axiosInstance.get(`/bookings/availability/${id}`);
        setUnavailableDates(data.unavailableDates || []);
      } catch (_) {
        // silently fail; all dates treated as available
      } finally {
        setAvailabilityLoading(false);
      }
    };

    loadPlace();
    loadReviews();
    loadAvailability();
  }, [id]);

  const unavailableSet = useMemo(
    () => new Set(unavailableDates),
    [unavailableDates]
  );

  const avgRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const hasHostRating = useMemo(() => {
    return (
      typeof place?.hostRating === 'number' &&
      (place?.hostRatingCount || 0) > 0
    );
  }, [place]);

  const keyFacts = useMemo(() => {
    if (!place) return [];
    const facts = [];

    const totalArea = toNum(place.totalArea);
    const availableArea = toNum(place.availableArea);
    const palletCapacity = toNum(place.palletCapacity);

    if (totalArea !== null)
      facts.push({ label: L.totalCapacity, value: `${totalArea} m²`, icon: '📦' });
    if (availableArea !== null)
      facts.push({ label: L.availableNow, value: `${availableArea} m²`, icon: '✅' });
    if (palletCapacity !== null)
      facts.push({
        label: L.palletCapacity,
        value: `${palletCapacity} ${L.pallets}`,
        icon: '🧱',
      });

    const minDays = toNum(place.minBookingDays);
    const maxDays = toNum(place.maxBookingDays);

    if (minDays !== null || maxDays !== null) {
      const v =
        minDays !== null && maxDays !== null
          ? `${minDays}–${maxDays} ${L.days}`
          : minDays !== null
          ? `${L.min} ${minDays} ${L.days}`
          : `${L.max} ${maxDays} ${L.days}`;
      facts.push({ label: L.storageDuration, value: v, icon: '🗓️' });
    }

    const primaryPrice = toNum(place.pricePerDay) ?? toNum(place.price) ?? null;

    if (primaryPrice !== null) {
      facts.push({
        label: L.basePrice,
        value: `${formatPrice(primaryPrice)} ${L.perDay}`,
        icon: '💰',
      });
    } else {
      facts.push({ label: L.basePrice, value: L.priceOnRequest, icon: '💰' });
    }

    if (place.warehouseType?.length) {
      const types = place.warehouseType
        .map((t) => maps.warehouseType[t] || t)
        .slice(0, 2);
      facts.push({
        label: L.warehouseTypeLabel,
        value:
          types.join(L.listSeparator) +
          (place.warehouseType.length > 2 ? '…' : ''),
        icon: '🏭',
      });
    }

    const securityLevel = (() => {
      const points =
        (place.CCTV ? 1 : 0) +
        (place.securityGuards ? 1 : 0) +
        (place.fireSuppression ? 1 : 0) +
        (place.smokeDetectors ? 1 : 0);
      if (points >= 3) return L.securityHigh;
      if (points >= 1) return L.securityStandard;
      return L.securityBasic;
    })();

    facts.push({ label: L.securityLevel, value: securityLevel, icon: '🛡️' });

    return facts;
  }, [place, L, maps, formatPrice]);

  const availabilityHint = useMemo(() => {
    if (availabilityLoading) return null;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let availableCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const key = format(d, 'yyyy-MM-dd');
      if (!unavailableSet.has(key)) availableCount += 1;
    }
    return L.daysAvailable(availableCount);
  }, [availabilityLoading, unavailableSet, L]);

  const badges = useMemo(() => {
    if (!place) return [];
    const arr = [];

    if (place.negotiablePrice) {
      arr.push({ label: L.negotiable, tone: 'success', icon: '🤝' });
    }

    if (place.insurance) {
      arr.push({ label: L.insuranceAvailable, tone: 'info', icon: '🛡️' });
    }

    const hasPacking =
      Array.isArray(place.services) &&
      (place.services.includes('labeling-packaging') ||
        place.services.includes('picking-packing'));

    const hasDelivery =
      Array.isArray(place.services) && place.services.includes('transportation');

    if (hasPacking)
      arr.push({ label: L.packingAvailable, tone: 'info', icon: '📦' });
    if (hasDelivery)
      arr.push({ label: L.deliveryAvailable, tone: 'info', icon: '🚚' });

    return arr;
  }, [place, L]);

  const featuresBullets = useMemo(() => {
    if (!place) return [];

    const bullets = [];

    if (place.CCTV) bullets.push({ icon: '🎥', label: L.cctv });
    if (place.securityGuards)
      bullets.push({ icon: '🛡️', label: L.guards });
    if (place.fireSuppression)
      bullets.push({ icon: '🧯', label: L.fireSuppression });
    if (place.smokeDetectors)
      bullets.push({ icon: '🔔', label: L.smokeDetectors });

    const hasTempControl =
      (Array.isArray(place.warehouseType) &&
        (place.warehouseType.includes('cold') ||
          place.warehouseType.includes('frozen'))) ||
      !!place.tempControlFee ||
      (Array.isArray(place.equipment) &&
        (place.equipment.includes('chillers') ||
          place.equipment.includes('freezers')));

    if (hasTempControl)
      bullets.push({ icon: '❄️', label: L.tempControlled });

    if (
      toNum(place.loadingDocks) !== null ||
      (Array.isArray(place.equipment) && place.equipment.includes('loading-dock'))
    ) {
      bullets.push({ icon: '🚪', label: L.loadingDocks });
    }

    if (Array.isArray(place.equipment) && place.equipment.includes('forklift')) {
      bullets.push({ icon: '🏗️', label: L.forkliftAvailable });
    }

    if (place.rackAvailability) bullets.push({ icon: '🧱', label: L.racksInstalled });
    if (place.parkingAvailable) bullets.push({ icon: '🅿️', label: L.parkingAvailable });
    if (place.foodGradeCert) bullets.push({ icon: '🥫', label: L.foodGrade });
    if (place.hazmatCert) bullets.push({ icon: '☣️', label: L.hazmatCert });
    if (place.ISOcert) bullets.push({ icon: '📜', label: L.iso(place.ISOcert) });

    return bullets.slice(0, 10);
  }, [place, L]);

  const visibleReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    return showAllReviews ? reviews : reviews.slice(0, 3);
  }, [reviews, showAllReviews]);

  const bestForTags = useMemo(() => {
    const p = place;
    const tags = [];

    if (
      Array.isArray(p?.services) &&
      p.services.includes('fulfillment')
    )
      tags.push(L.tagEcommerce);

    if (Array.isArray(p?.allowedGoods) && p.allowedGoods.includes('fmcg'))
      tags.push(L.tagFmcg);
    if (
      Array.isArray(p?.allowedGoods) &&
      p.allowedGoods.includes('electronics')
    )
      tags.push(L.tagElectronics);
    if (Array.isArray(p?.allowedGoods) && p.allowedGoods.includes('pharma'))
      tags.push(L.tagPharma);

    const pallets = toNum(p?.palletCapacity);
    if (pallets !== null && pallets >= 500) tags.push(L.tagHighVolume);

    if (
      Array.isArray(p?.warehouseType) &&
      (p.warehouseType.includes('cold') || p.warehouseType.includes('frozen'))
    ) {
      tags.push(L.tagColdChain);
    }

    if (tags.length === 0) tags.push(L.tagSmes, L.tagImportExport);

    return tags.slice(0, 4);
  }, [place, L]);

  const formatMonthYear = (date) =>
    lang === 'AR'
      ? `${L.months[date.getMonth()]} ${date.getFullYear()}`
      : format(date, 'MMMM yyyy');

  const formatReviewDate = (date) =>
    lang === 'AR'
      ? `${date.getDate()} ${L.monthsShort[date.getMonth()]} ${date.getFullYear()}`
      : format(date, 'dd MMM yyyy');

  const renderAvailabilityCalendar = () => {
    const startMonth = startOfMonth(calendarMonth);
    const endMonth = endOfMonth(calendarMonth);
    const startDate = startOfWeek(startMonth, { weekStartsOn: 1 });
    const endDate = endOfWeek(endMonth, { weekStartsOn: 1 });

    const rows = [];
    let day = startDate;

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    while (day <= endDate) {
      const cells = [];
      for (let i = 0; i < 7; i++) {
        const dayStr = format(day, 'yyyy-MM-dd');
        const isUnavailable = unavailableSet.has(dayStr);
        const inMonth = isSameMonth(day, calendarMonth);
        const isPast = day < todayMidnight;

        let base = 'flex h-8 w-8 items-center justify-center rounded-full text-xs';
        let extra = '';

        if (!inMonth) extra += ' text-gray-300';
        else if (isUnavailable) extra += ' bg-red-500 text-white';
        else if (isPast) extra += ' text-gray-300';
        else extra += ' text-gray-700';

        const isToday = dayStr === format(todayMidnight, 'yyyy-MM-dd');
        if (isToday && !isUnavailable) extra += ' border border-primary font-semibold';

        cells.push(
          <div key={dayStr} className={`${base} ${extra}`}>
            {format(day, 'd')}
          </div>
        );

        day = addDays(day, 1);
      }

      rows.push(
        <div className="grid grid-cols-7 gap-1" key={format(day, 'yyyy-MM-dd')}>
          {cells}
        </div>
      );
    }

    return (
      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700">
          <button
            type="button"
            aria-label={L.prevMonth}
            title={L.prevMonth}
            onClick={() => setCalendarMonth((prev) => addMonths(prev, -1))}
            className="rounded-full border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-100"
          >
            ‹
          </button>
          <span>{formatMonthYear(calendarMonth)}</span>
          <button
            type="button"
            aria-label={L.nextMonth}
            title={L.nextMonth}
            onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
            className="rounded-full border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-100"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-gray-500">
          {L.weekdays.map((w, i) => (
            <span key={`${w}-${i}`}>{w}</span>
          ))}
        </div>

        <div className="space-y-1">{rows}</div>

        <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500">
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            <span>{L.unavailable}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full border border-primary" />
            <span>{L.today}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mt-24 px-4">
        <p>{L.loadingWarehouse}</p>
      </div>
    );
  }

  if (placeError || !place) {
    const errorText =
      placeError === 'notFound'
        ? L.listingGone
        : placeError === 'loadFailed'
        ? L.loadFailed
        : L.warehouseNotFound;

    return (
      <div className="mt-24 px-4">
        <p className="text-red-600">{errorText}</p>
      </div>
    );
  }

  const primaryPrice = toNum(place.pricePerDay) ?? toNum(place.price) ?? null;
  const priceLabel =
    primaryPrice !== null
      ? `${formatPrice(primaryPrice)} ${L.perDay}`
      : L.priceOnRequest;

  const locationLine = (() => {
    const parts = [];
    if (place.city) parts.push(place.city);
    return parts.join(', ');
  })();

  const hasPacking =
    Array.isArray(place.services) &&
    (place.services.includes('labeling-packaging') ||
      place.services.includes('picking-packing'));

  const hasDelivery =
    Array.isArray(place.services) && place.services.includes('transportation');

  const reviewCountLabel = L.reviewCount(reviews?.length || 0);

  return (
    <div className="mt-20 px-4 pb-12">
      {lightboxIndex !== null && place.photos?.length > 0 && (
        <PhotoLightbox
          photos={place.photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
      <div className="mx-auto w-full max-w-6xl">
        {/* A. HERO SECTION */}
        <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">
                  {place.title || L.warehouse}
                </h1>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  title={L.shareTitle}
                >
                  <span className="text-sm">🔗</span>
                  <span>{L.share}</span>
                </button>

                {badges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          b.tone === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-50 text-blue-800'
                        }`}
                      >
                        <span className="text-sm">{b.icon}</span>
                        <span>{b.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                <div className="inline-flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <span className="font-medium text-gray-800">
                    {locationLine || place.address || L.locationFallback}
                  </span>
                </div>

                {avgRating && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-base">⭐</span>
                    <span className="font-semibold text-gray-900">{avgRating}</span>
                    <span className="text-gray-500">({reviewCountLabel})</span>
                  </div>
                )}

                {hasHostRating && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-base">🏅</span>
                    <span className="font-semibold text-gray-900">
                      {L.host} {place.hostRating}
                    </span>
                    <span className="text-gray-500">({place.hostRatingCount})</span>
                  </div>
                )}

                {availabilityHint && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-base">🗓️</span>
                    <span className="font-medium text-gray-800">{availabilityHint}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {bestForTags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                  >
                    {L.bestForPrefix} {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col items-start gap-2 md:w-auto md:items-end">
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-left md:text-right">
                <div className="text-xs font-semibold text-gray-500">{L.startingFrom}</div>
                <div className="mt-1 text-xl font-semibold text-gray-900">{priceLabel}</div>
                {place.negotiablePrice && (
                  <div className="mt-1 text-xs font-semibold text-emerald-700">
                    {L.negotiablePricing}
                  </div>
                )}
              </div>

              <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
                <Link
                  to={`/place/${place._id}/chat`}
                  className="inline-flex items-center justify-center rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                >
                  {L.contactHost}
                </Link>

                <a
                  href="#booking"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  {L.requestBooking}
                </a>
              </div>

              {place.owner && (
                <Link
                  to={`/host/${place.owner}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {L.viewHostProfile}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* IMAGE GALLERY */}
        {place.photos?.length > 0 && (
          <div className="mb-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="grid grid-cols-2 gap-1 md:grid-cols-4 md:grid-rows-2">
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="col-span-2 row-span-2 h-72 cursor-zoom-in bg-gray-200 md:h-[420px]"
              >
                <img
                  src={place.photos[0]}
                  alt={place.title}
                  className="h-full w-full object-cover"
                />
              </button>

              {place.photos.slice(1, 5).map((photo, i) => (
                <button
                  type="button"
                  key={photo}
                  onClick={() => setLightboxIndex(i + 1)}
                  className="h-36 cursor-zoom-in bg-gray-200 md:h-[209px]"
                >
                  <img
                    src={photo}
                    alt={place.title}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {L.viewAllPhotos(place.photos.length)}
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="#location"
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  {L.viewLocation}
                </a>
                <a
                  href="#services"
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  {L.servicesAddons}
                </a>
                <a
                  href="#reviews"
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  {L.reviews}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT + STICKY BOOKING SUMMARY */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            {/* B. KEY FACTS */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{L.atAGlance}</h2>
                  <p className="mt-1 text-sm text-gray-600">{L.atAGlanceSub}</p>
                </div>
                {place.warehouseType?.length > 0 && (
                  <div className="text-xs font-semibold text-gray-500">
                    {place.warehouseType
                      .map((t) => maps.warehouseType[t] || t)
                      .join(' • ')}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {keyFacts.slice(0, 6).map((f) => (
                  <div key={f.label} className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-500">{f.label}</div>
                        <div className="mt-1 text-base font-semibold text-gray-900">{f.value}</div>
                      </div>
                      <div className="text-xl">{f.icon}</div>
                    </div>
                  </div>
                ))}
              </div>

              {(toNum(place.pricePerPallet) !== null ||
                toNum(place.loadingFee) !== null ||
                toNum(place.tempControlFee) !== null) && (
                <div className="mt-4 rounded-2xl border bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">{L.optionalPricing}</div>
                  <div className="mt-2 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                    {toNum(place.pricePerPallet) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>{L.perPalletPerDay}</span>
                        <span className="font-semibold">{formatPrice(place.pricePerPallet)}</span>
                      </div>
                    )}
                    {toNum(place.loadingFee) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>{L.loadingFee}</span>
                        <span className="font-semibold">{formatPrice(place.loadingFee)}</span>
                      </div>
                    )}
                    {toNum(place.tempControlFee) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>{L.tempControlSurcharge}</span>
                        <span className="font-semibold">{formatPrice(place.tempControlFee)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* C. DESCRIPTION & FEATURES */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{L.descriptionFeatures}</h2>

              {place.description ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                  {place.description}
                </p>
              ) : (
                <p className="mt-3 text-sm text-gray-600">{L.noDescription}</p>
              )}

              {featuresBullets.length > 0 && (
                <div className="mt-5">
                  <div className="text-sm font-semibold text-gray-900">{L.highlights}</div>
                  <ul className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                    {featuresBullets.map((b) => (
                      <li
                        key={b.label}
                        className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2"
                      >
                        <span className="text-base">{b.icon}</span>
                        <span className="font-medium">{b.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(place.equipment?.length > 0 ||
                place.truckAccess?.length > 0 ||
                place.allowedGoods?.length > 0) && (
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {place.equipment?.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{L.equipment}</div>
                      {renderTagList(place.equipment, maps.equipment)}
                    </div>
                  )}

                  {place.truckAccess?.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{L.truckAccess}</div>
                      {renderTagList(place.truckAccess, maps.truckAccess)}
                    </div>
                  )}

                  {place.allowedGoods?.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-sm font-semibold text-gray-900">{L.allowedGoods}</div>
                      {renderTagList(place.allowedGoods, maps.allowedGoods)}
                    </div>
                  )}
                </div>
              )}

              {place.extraInfo && (
                <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-900">{L.notesRules}</div>
                  <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{place.extraInfo}</p>
                </div>
              )}
            </section>

            {/* D. MAP & LOCATION */}
            <section id="location" className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{L.location}</h2>
                  <p className="mt-1 text-sm text-gray-600">{L.locationSub}</p>
                </div>
                {(place.city || place.zone) && (
                  <div className="text-sm font-semibold text-gray-700">
                    {place.city ? place.city : ''}
                    {place.city && place.zone ? ' • ' : ''}
                    {place.zone ? place.zone : ''}
                  </div>
                )}
              </div>

              {place.gps ? (
                <div className="mt-4">
                  <PlaceMap place={place} />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">
                  {L.mapUnavailable}
                </div>
              )}

              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-500">{L.address}</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {place.address || L.addressNotProvided}
                </div>
                <div className="mt-2 text-xs text-gray-500">{L.addressNote}</div>
              </div>
            </section>

            {/* E. SERVICES & ADD-ONS */}
            <section id="services" className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{L.servicesAddons}</h2>
              <p className="mt-1 text-sm text-gray-600">{L.servicesSub}</p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">{L.insurance}</div>
                    <div className="text-xl">🛡️</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {place.insurance ? L.insuranceYes : L.notListed}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">{L.packing}</div>
                    <div className="text-xl">📦</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {hasPacking ? L.packingYes : L.notListed}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">{L.delivery}</div>
                    <div className="text-xl">🚚</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {hasDelivery ? L.deliveryYes : L.notListed}
                  </div>
                </div>
              </div>

              {place.services?.length > 0 && (
                <div className="mt-5">
                  <div className="text-sm font-semibold text-gray-900">{L.additionalServices}</div>
                  {renderTagList(place.services, maps.services)}
                </div>
              )}

              {place.prohibitedGoods && (
                <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-900">{L.restrictions}</div>
                  <div className="mt-2 whitespace-pre-line text-sm text-gray-700">
                    {place.prohibitedGoods}
                  </div>
                </div>
              )}
            </section>

            {/* G. HOST INFORMATION */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{L.hostSection}</h2>
                  <p className="mt-1 text-sm text-gray-600">{L.hostSub}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {hasHostRating && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-900">
                        ⭐ {place.hostRating}{' '}
                        <span className="text-yellow-800">({place.hostRatingCount})</span>
                      </span>
                    )}

                    {place.owner && (
                      <Link
                        to={`/host/${place.owner}`}
                        className="inline-flex items-center rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                      >
                        {L.viewHostProfile}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/place/${place._id}/chat`}
                    className="inline-flex items-center justify-center rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                  >
                    {L.contactHost}
                  </Link>

                  <a
                    href="#booking"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                  >
                    {L.requestBooking}
                  </a>
                </div>
              </div>
            </section>

            {/* H. REVIEWS */}
            <section id="reviews" className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{L.reviews}</h2>
                  <p className="mt-1 text-sm text-gray-600">{L.reviewsSub}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {avgRating && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                      ⭐ {avgRating}{' '}
                      <span className="text-gray-500">({reviewCountLabel})</span>
                    </span>
                  )}
                </div>
              </div>

              {reviewsLoading && (
                <p className="mt-4 text-sm text-gray-600">{L.loadingReviews}</p>
              )}

              {!reviewsLoading && reviews.length === 0 && (
                <p className="mt-4 text-sm text-gray-600">{L.noReviews}</p>
              )}

              {!reviewsLoading && reviews.length > 0 && (
                <>
                  <div className="mt-4 space-y-4">
                    {visibleReviews.map((review) => (
                      <div
                        key={review._id}
                        className="rounded-2xl border bg-gray-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-gray-900">
                            {review.user?.name || L.anonymous}
                          </div>
                          <div className="text-xs font-semibold text-gray-500">
                            {review.createdAt &&
                              formatReviewDate(new Date(review.createdAt))}
                          </div>
                        </div>

                        <div className="mt-2 text-sm text-gray-800">
                          <span className="font-semibold">
                            {'⭐'.repeat(Number(review.rating) || 0)}
                          </span>{' '}
                          <span className="text-gray-600">
                            {L.outOf5(review.rating)}
                          </span>
                        </div>

                        {review.comment && (
                          <p className="mt-2 text-sm text-gray-700">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {reviews.length > 3 && (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => setShowAllReviews((v) => !v)}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        {showAllReviews ? L.seeFewerReviews : L.seeAllReviews}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* F. STICKY PRICING & BOOKING SUMMARY */}
          <aside className="space-y-4">
            <div id="booking" className="lg:sticky lg:top-24">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">
                      {L.bookingSummary}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {priceLabel}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {L.addonsNote}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                    {place.negotiablePrice ? L.negotiable : L.fixed}
                  </div>
                </div>

                <div className="mt-4">
                  <BookingWidget place={place} />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{L.availability}</h3>
                  {!availabilityLoading && unavailableDates?.length === 0 && (
                    <span className="text-xs font-semibold text-emerald-700">
                      {L.mostlyAvailable}
                    </span>
                  )}
                </div>

                {availabilityLoading ? (
                  <p className="text-xs text-gray-500">{L.loadingAvailability}</p>
                ) : (
                  <>
                    {renderAvailabilityCalendar()}
                    {unavailableDates.length === 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        {L.noBlockedDates}
                      </p>
                    )}
                  </>
                )}
              </div>

              {(place.checkIn ||
                place.checkOut ||
                toNum(place.minBookingDays) !== null ||
                toNum(place.maxBookingDays) !== null) && (
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900">{L.bookingRules}</h3>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    {toNum(place.minBookingDays) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>{L.minimumBooking}</span>
                        <span className="font-semibold">
                          {L.dayCount(place.minBookingDays)}
                        </span>
                      </div>
                    )}
                    {toNum(place.maxBookingDays) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>{L.maximumBooking}</span>
                        <span className="font-semibold">
                          {L.dayCount(place.maxBookingDays)}
                        </span>
                      </div>
                    )}
                    {(place.checkIn || place.checkOut) && (
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <div className="text-xs font-semibold text-gray-500">
                          {L.defaultTimes}
                        </div>
                        <div className="mt-1 font-semibold text-gray-800">
                          {place.checkIn ? L.checkInLabel(place.checkIn) : ''}
                          {place.checkIn && place.checkOut ? ' • ' : ''}
                          {place.checkOut ? L.checkOutLabel(place.checkOut) : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
};

export default PlacePage;
