// client/src/providers/PreferencesProvider.jsx
// App-wide language (EN / AR with RTL) and display currency (live rates).
// Prices are always settled in JOD; other currencies are converted for display.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/* ------------------------------------------------
   Translations
------------------------------------------------ */
const STRINGS = {
  EN: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.myProfile': 'My profile',
    'nav.myBookings': 'My bookings',
    'nav.myWarehouses': 'My warehouses',
    'nav.requests': 'Requests to my warehouses',
    'nav.messages': 'Messages',
    'nav.adminHosts': 'Admin host verification',
    'nav.adminDashboard': 'Admin dashboard',
    'nav.waitlist': 'Waitlist',

    // Home
    'home.title': 'Find storage on Wareshare',
    'home.searchPlaceholder': 'Search by name, address, city or zone…',
    'home.list': 'List',
    'home.map': 'Map',
    'home.showFilters': 'Show filters',
    'home.hideFilters': 'Hide filters',
    'home.filtersSearch': 'Filters & search',
    'home.resetAll': 'Reset all',
    'home.noneYet': 'No warehouses have been listed yet. Check back soon!',
    'home.noMatch': 'No warehouses match your filters. Try broadening your search.',
    'home.loadFailed': 'Failed to load warehouses. Please check your connection and refresh.',
    'home.perDay': '/ day',
    'home.priceOnRequest': 'Price on request',
    'home.verifiedHost': 'Verified host',
    'home.available': 'available',
    'home.more': 'more',

    // Footer
    'footer.helpSupport': 'Help & support',
    'footer.helpCenter': 'Help Center',
    'footer.safety': 'Safety & security guidelines',
    'footer.access': 'Warehouse access & check-in',
    'footer.insurance': 'Insurance & claims',
    'footer.report': 'Report an issue',
    'footer.forOwners': 'For warehouse owners',
    'footer.listWarehouse': 'List your warehouse',
    'footer.pricingTips': 'Pricing & utilization tips',
    'footer.bestPractices': 'Operational best practices',
    'footer.partners': 'Partner & enterprise solutions',
    'footer.about': 'About WareShare',
    'footer.mission': 'Our mission',
    'footer.howItWorks': 'How the marketplace works',
    'footer.careers': 'Careers',
    'footer.press': 'Press & media',
    'footer.esg': 'ESG & sustainability',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.sitemap': 'Sitemap',
    'footer.companyDetails': 'Company details',
    'footer.rights': 'All rights reserved.',


    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.noAccount': "Don't have an account yet?",
    'auth.registerNow': 'Register now',
    'auth.alreadyMember': 'Already a member?',

    // Booking widget
    'book.units': 'Units / pallet positions needed',
    'book.space': 'Space needed (m²)',
    'book.fullWarehouse': 'Full warehouse',
    'book.leaveEmpty': 'Leave empty to book the entire',
    'book.partialNote': 'priced proportionally. The rest stays rentable.',
    'book.yourName': 'Your name',
    'book.phone': 'Phone',
    'book.bookNow': 'Request booking',

    // Report form
    'report.title': 'Report an issue',
    'report.subtitle': 'Tell us what went wrong — a booking, a listing, the app itself, or a safety concern. We reply by email.',
    'report.yourName': 'Your name',
    'report.email': 'Email',
    'report.category': 'Category',
    'report.what': 'What happened?',
    'report.send': 'Send report',
    'report.sending': 'Sending…',

    // Places page
    'places.title': 'Your warehouses',
    'places.subtitle': 'Manage visibility, pricing, and details of your Wareshare listings.',
    'places.addNew': 'Add new warehouse',
    'places.live': 'Live',
    'places.hidden': 'Hidden',
    'places.makeLive': 'Make live',
    'places.hide': 'Hide',
    'places.availability': 'Availability',

    // Chats
    'chats.title': 'Chats',
    'chats.refresh': 'Refresh',
    'chats.none': 'No conversations yet.',

    // Common
    'common.loading': 'Loading…',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.approx': '≈',
  },

  AR: {
    // Nav
    'nav.dashboard': 'لوحة التحكم',
    'nav.myProfile': 'ملفي الشخصي',
    'nav.myBookings': 'حجوزاتي',
    'nav.myWarehouses': 'مستودعاتي',
    'nav.requests': 'طلبات على مستودعاتي',
    'nav.messages': 'الرسائل',
    'nav.adminHosts': 'التحقق من المضيفين',
    'nav.adminDashboard': 'لوحة الإدارة',
    'nav.waitlist': 'قائمة الانتظار',

    // Home
    'home.title': 'ابحث عن مساحة تخزين على وير شير',
    'home.searchPlaceholder': 'ابحث بالاسم أو العنوان أو المدينة أو المنطقة…',
    'home.list': 'قائمة',
    'home.map': 'خريطة',
    'home.showFilters': 'إظهار الفلاتر',
    'home.hideFilters': 'إخفاء الفلاتر',
    'home.filtersSearch': 'الفلاتر والبحث',
    'home.resetAll': 'إعادة تعيين',
    'home.noneYet': 'لا توجد مستودعات معروضة بعد. عد قريبًا!',
    'home.noMatch': 'لا توجد مستودعات تطابق الفلاتر. جرّب توسيع البحث.',
    'home.loadFailed': 'تعذّر تحميل المستودعات. تحقق من اتصالك وأعد المحاولة.',
    'home.perDay': '/ يوم',
    'home.priceOnRequest': 'السعر عند الطلب',
    'home.verifiedHost': 'مضيف موثّق',
    'home.available': 'متاحة',
    'home.more': 'أخرى',

    // Footer
    'footer.helpSupport': 'المساعدة والدعم',
    'footer.helpCenter': 'مركز المساعدة',
    'footer.safety': 'إرشادات السلامة والأمان',
    'footer.access': 'الوصول للمستودع وتسجيل الدخول',
    'footer.insurance': 'التأمين والمطالبات',
    'footer.report': 'الإبلاغ عن مشكلة',
    'footer.forOwners': 'لأصحاب المستودعات',
    'footer.listWarehouse': 'اعرض مستودعك',
    'footer.pricingTips': 'نصائح التسعير والاستغلال',
    'footer.bestPractices': 'أفضل الممارسات التشغيلية',
    'footer.partners': 'حلول الشركاء والمؤسسات',
    'footer.about': 'عن وير شير',
    'footer.mission': 'رسالتنا',
    'footer.howItWorks': 'كيف يعمل السوق',
    'footer.careers': 'الوظائف',
    'footer.press': 'الصحافة والإعلام',
    'footer.esg': 'الاستدامة والحوكمة',
    'footer.privacy': 'الخصوصية',
    'footer.terms': 'الشروط',
    'footer.sitemap': 'خريطة الموقع',
    'footer.companyDetails': 'بيانات الشركة',
    'footer.rights': 'جميع الحقوق محفوظة.',


    // Auth
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
    'auth.noAccount': 'ليس لديك حساب بعد؟',
    'auth.registerNow': 'سجّل الآن',
    'auth.alreadyMember': 'لديك حساب بالفعل؟',

    // Booking widget
    'book.units': 'عدد الوحدات / مواقع المنصات المطلوبة',
    'book.space': 'المساحة المطلوبة (م²)',
    'book.fullWarehouse': 'المستودع كامل',
    'book.leaveEmpty': 'اتركه فارغًا لحجز كامل الـ',
    'book.partialNote': 'السعر يُحتسب نسبيًا، والباقي يبقى متاحًا للإيجار.',
    'book.yourName': 'اسمك',
    'book.phone': 'الهاتف',
    'book.bookNow': 'إرسال طلب حجز',

    // Report form
    'report.title': 'الإبلاغ عن مشكلة',
    'report.subtitle': 'أخبرنا بما حدث — حجز أو إعلان أو التطبيق نفسه أو مشكلة سلامة. نرد عبر البريد الإلكتروني.',
    'report.yourName': 'اسمك',
    'report.email': 'البريد الإلكتروني',
    'report.category': 'التصنيف',
    'report.what': 'ما الذي حدث؟',
    'report.send': 'إرسال البلاغ',
    'report.sending': 'جارٍ الإرسال…',

    // Places page
    'places.title': 'مستودعاتك',
    'places.subtitle': 'أدر ظهور إعلاناتك وأسعارها وتفاصيلها على وير شير.',
    'places.addNew': 'أضف مستودعًا جديدًا',
    'places.live': 'منشور',
    'places.hidden': 'مخفي',
    'places.makeLive': 'انشره',
    'places.hide': 'أخفه',
    'places.availability': 'التوفر',

    // Chats
    'chats.title': 'المحادثات',
    'chats.refresh': 'تحديث',
    'chats.none': 'لا توجد محادثات بعد.',

    // Common
    'common.loading': 'جارٍ التحميل…',
    'common.save': 'حفظ',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.approx': '≈',
  },
};

/* ------------------------------------------------
   Currencies (JOD is the settlement currency)
------------------------------------------------ */
export const CURRENCIES = [
  { code: 'JOD', label: 'JOD — Jordanian dinar' },
  { code: 'USD', label: 'USD — US dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British pound' },
  { code: 'SAR', label: 'SAR — Saudi riyal' },
  { code: 'AED', label: 'AED — UAE dirham' },
  { code: 'KWD', label: 'KWD — Kuwaiti dinar' },
  { code: 'QAR', label: 'QAR — Qatari riyal' },
  { code: 'BHD', label: 'BHD — Bahraini dinar' },
  { code: 'EGP', label: 'EGP — Egyptian pound' },
];

// Fallback rates (1 JOD = X target currency) used until live rates load
const FALLBACK_RATES = {
  JOD: 1,
  USD: 1.41,
  EUR: 1.3,
  GBP: 1.11,
  SAR: 5.29,
  AED: 5.18,
  KWD: 0.43,
  QAR: 5.14,
  BHD: 0.53,
  EGP: 68.5,
};

const PreferencesContext = createContext(null);

export const PreferencesProvider = ({ children }) => {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('wareshare_lang') || 'EN'
  );
  const [currency, setCurrencyState] = useState(
    () => localStorage.getItem('wareshare_currency') || 'JOD'
  );
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [ratesLive, setRatesLive] = useState(false);

  // Reflect language on <html> for RTL layout + font handling
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang === 'AR' ? 'ar' : 'en';
    root.dir = lang === 'AR' ? 'rtl' : 'ltr';
  }, [lang]);

  // Fetch live exchange rates once (base JOD). Falls back silently.
  useEffect(() => {
    let active = true;
    fetch('https://open.er-api.com/v6/latest/JOD')
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.rates) return;
        setRates((prev) => ({ ...prev, ...data.rates, JOD: 1 }));
        setRatesLive(true);
      })
      .catch(() => {
        // keep fallback rates
      });
    return () => {
      active = false;
    };
  }, []);

  const setLang = useCallback((code) => {
    setLangState(code);
    localStorage.setItem('wareshare_lang', code);
  }, []);

  const setCurrency = useCallback((code) => {
    setCurrencyState(code);
    localStorage.setItem('wareshare_currency', code);
  }, []);

  const t = useCallback(
    (key) => STRINGS[lang]?.[key] ?? STRINGS.EN[key] ?? key,
    [lang]
  );

  // Convert a JOD amount to the display currency and format it.
  // Non-JOD amounts are approximations of the JOD settlement price.
  const formatPrice = useCallback(
    (amountJod, { approx = true } = {}) => {
      const n = Number(amountJod);
      if (!Number.isFinite(n)) return null;

      const rate = rates[currency] ?? 1;
      const converted = n * rate;

      const locale = lang === 'AR' ? 'ar-JO' : 'en-US';
      let formatted;
      try {
        formatted = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: converted >= 100 ? 0 : 2,
        }).format(converted);
      } catch (_) {
        formatted = `${currency} ${converted.toFixed(2)}`;
      }

      // Mark converted prices as approximate (settlement stays JOD)
      if (currency !== 'JOD' && approx) {
        return `${STRINGS[lang]['common.approx']}${formatted}`;
      }
      return formatted;
    },
    [currency, rates, lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      isRTL: lang === 'AR',
      t,
      currency,
      setCurrency,
      rates,
      ratesLive,
      formatPrice,
    }),
    [lang, setLang, t, currency, setCurrency, rates, ratesLive, formatPrice]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePrefs = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePrefs must be used inside PreferencesProvider');
  }
  return ctx;
};
