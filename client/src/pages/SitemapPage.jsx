// client/src/pages/SitemapPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    pageTitle: 'Sitemap',
    intro: 'Every page on WareShare.',
    marketplace: 'Marketplace',
    yourAccount: 'Your account',
    helpSupport: 'Help & support',
    forOwners: 'For warehouse owners',
    about: 'About WareShare',
    legal: 'Legal',
    findStorage: 'Find storage (home)',
    waitlist: 'Coming soon / waitlist',
    login: 'Login',
    createAccount: 'Create an account',
    myProfile: 'My profile',
    myBookings: 'My bookings',
    myWarehouses: 'My warehouses',
    ownerRequests: 'Requests to my warehouses',
    messages: 'Messages',
    dashboard: 'Dashboard',
    createListing: 'Create a listing',
    privacyPolicy: 'Privacy policy',
    termsOfService: 'Terms of service',
  },
  AR: {
    pageTitle: 'خريطة الموقع',
    intro: 'جميع صفحات وير شير.',
    marketplace: 'السوق',
    yourAccount: 'حسابك',
    helpSupport: 'المساعدة والدعم',
    forOwners: 'لأصحاب المستودعات',
    about: 'عن وير شير',
    legal: 'الشؤون القانونية',
    findStorage: 'ابحث عن مساحة تخزين (الرئيسية)',
    waitlist: 'قريبًا / قائمة الانتظار',
    login: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب',
    myProfile: 'ملفي الشخصي',
    myBookings: 'حجوزاتي',
    myWarehouses: 'مستودعاتي',
    ownerRequests: 'طلبات على مستودعاتي',
    messages: 'الرسائل',
    dashboard: 'لوحة التحكم',
    createListing: 'أنشئ إعلانًا',
    privacyPolicy: 'سياسة الخصوصية',
    termsOfService: 'شروط الخدمة',
  },
};

const SitemapPage = () => {
  usePageTitle('Sitemap');
  const { t, lang } = usePrefs();
  const L = STR[lang] || STR.EN;

  const SECTIONS = [
    {
      heading: L.marketplace,
      links: [
        { label: L.findStorage, to: '/' },
        { label: L.waitlist, to: '/launch' },
        { label: L.login, to: '/login' },
        { label: L.createAccount, to: '/register' },
      ],
    },
    {
      heading: L.yourAccount,
      links: [
        { label: L.myProfile, to: '/account' },
        { label: L.myBookings, to: '/account/bookings' },
        { label: L.myWarehouses, to: '/account/places' },
        { label: L.ownerRequests, to: '/account/owner/bookings' },
        { label: L.messages, to: '/account/chats' },
        { label: L.dashboard, to: '/dashboard' },
      ],
    },
    {
      heading: L.helpSupport,
      links: [
        { label: t('footer.helpCenter'), to: '/info/help-center' },
        { label: t('footer.safety'), to: '/info/safety-security' },
        { label: t('footer.access'), to: '/info/warehouse-access' },
        { label: t('footer.insurance'), to: '/info/insurance-claims' },
        { label: t('footer.report'), to: '/support/report' },
      ],
    },
    {
      heading: L.forOwners,
      links: [
        { label: t('footer.listWarehouse'), to: '/info/list-your-warehouse' },
        { label: t('footer.pricingTips'), to: '/info/pricing-tips' },
        { label: t('footer.bestPractices'), to: '/info/best-practices' },
        { label: t('footer.partners'), to: '/info/partners' },
        { label: L.createListing, to: '/account/places/new' },
      ],
    },
    {
      heading: L.about,
      links: [
        { label: t('footer.mission'), to: '/info/mission' },
        { label: t('footer.howItWorks'), to: '/info/how-it-works' },
        { label: t('footer.careers'), to: '/info/careers' },
        { label: t('footer.press'), to: '/info/press' },
        { label: t('footer.esg'), to: '/info/esg' },
      ],
    },
    {
      heading: L.legal,
      links: [
        { label: L.privacyPolicy, to: '/info/privacy' },
        { label: L.termsOfService, to: '/info/terms' },
        { label: t('footer.companyDetails'), to: '/info/company-details' },
      ],
    },
  ];

  return (
    <div className="mt-24 px-4 pb-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-semibold text-gray-900">{L.pageTitle}</h1>
        <p className="mt-2 text-gray-600">{L.intro}</p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                {s.heading}
              </h2>
              <ul className="space-y-1.5">
                {s.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SitemapPage;
