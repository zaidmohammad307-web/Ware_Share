// client/src/pages/ReportIssuePage.jsx
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import { useAuth, usePageTitle } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const CATEGORIES = [
  { value: 'help', EN: 'General help request', AR: 'طلب مساعدة عام' },
  { value: 'claim', EN: 'Insurance claim', AR: 'مطالبة تأمين' },
  { value: 'bug', EN: 'App problem / bug', AR: 'مشكلة في التطبيق' },
  { value: 'booking', EN: 'Booking issue', AR: 'مشكلة في الحجز' },
  { value: 'payment', EN: 'Payment issue', AR: 'مشكلة في الدفع' },
  { value: 'safety', EN: 'Safety concern', AR: 'مخاوف تتعلق بالسلامة' },
  { value: 'listing', EN: 'Problem with a listing', AR: 'مشكلة في إعلان' },
  { value: 'partnership', EN: 'Partnership enquiry', AR: 'استفسار شراكة' },
  { value: 'press', EN: 'Press & media', AR: 'صحافة وإعلام' },
  { value: 'careers', EN: 'Careers', AR: 'وظائف' },
  { value: 'other', EN: 'Something else', AR: 'شيء آخر' },
];

const VALID_CATEGORIES = CATEGORIES.map((c) => c.value);

const STR = {
  EN: {
    received: 'Request received',
    thanks: 'Thanks for letting us know. We will get back to you at',
    backHome: 'Back to home',
    fullName: 'Full name',
    describe:
      'Describe your request with as much detail as you can — include booking or listing links if relevant.',
    sent: 'Request sent.',
    failed: 'Could not send your request. Please try again.',
  },
  AR: {
    received: 'تم استلام طلبك',
    thanks: 'شكرًا لإخبارنا. سنعود إليك على',
    backHome: 'العودة إلى الرئيسية',
    fullName: 'الاسم الكامل',
    describe:
      'صف طلبك بأكبر قدر ممكن من التفاصيل — أرفق روابط الحجز أو الإعلان إن وُجدت.',
    sent: 'تم إرسال الطلب.',
    failed: 'تعذّر إرسال طلبك. يرجى المحاولة مرة أخرى.',
  },
};

const ReportIssuePage = () => {
  usePageTitle('Report an issue');

  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const L = STR[lang] || STR.EN;

  const [searchParams] = useSearchParams();
  const presetCategory = searchParams.get('category');
  const source = searchParams.get('source') || 'report-page';

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    category: VALID_CATEGORIES.includes(presetCategory)
      ? presetCategory
      : 'other',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // `user` resolves asynchronously, so prefill once it arrives
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      email: prev.email || user.email || '',
    }));
  }, [user]);

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const { data } = await axiosInstance.post('/support/report', { ...form, source });
      toast.success(data.message || L.sent);
      setDone(true);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || L.failed
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mt-24 px-4 pb-16">
        <div className="mx-auto w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">✅</div>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">
            {L.received}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {L.thanks}{' '}
            <strong>{form.email}</strong>.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            {L.backHome}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-24 px-4 pb-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-3xl font-semibold text-gray-900">{t('report.title')}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t('report.subtitle')}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-600">
                {t('report.yourName')}
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder={L.fullName}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">
                {t('report.email')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">
              {t('report.category')}
            </label>
            <select
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c[lang] || c.EN}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">
              {t('report.what')} <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              minLength={10}
              rows={6}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder={L.describe}
              value={form.message}
              onChange={(e) => setField('message', e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t('report.sending') : t('report.send')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssuePage;
