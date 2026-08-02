// client/src/pages/AdminSupportPage.jsx
// Admin inbox for everything submitted through the site: help requests,
// insurance claims, issue reports, partnership/press/careers enquiries.
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import AccountNav from '@/components/ui/AccountNav';
import Spinner from '@/components/ui/Spinner';
import { usePageTitle } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    title: 'Support requests',
    subtitle: 'Everything submitted through Help Center, claims, and issue reports.',
    all: 'All',
    open: 'Open',
    inProgress: 'In progress',
    resolved: 'Resolved',
    none: 'No requests yet.',
    from: 'From',
    anonymous: 'Anonymous',
    category: 'Category',
    submitted: 'Submitted',
    markOpen: 'Reopen',
    markProgress: 'Start',
    markResolved: 'Resolve',
    notePlaceholder: 'Internal note (only admins see this)…',
    saveNote: 'Save note',
    noteSaved: 'Note saved.',
    statusUpdated: 'Status updated.',
    updateFailed: 'Could not update the request.',
    loadFailed: 'Failed to load requests',
    adminOnly:
      'Admin access required — make sure ADMIN_EMAIL on the server matches your login email.',
    reply: 'Reply by email',
    source: 'Submitted from',
  },
  AR: {
    title: 'طلبات الدعم',
    subtitle: 'كل ما يُرسل عبر مركز المساعدة والمطالبات وبلاغات المشاكل.',
    all: 'الكل',
    open: 'مفتوح',
    inProgress: 'قيد المعالجة',
    resolved: 'تم الحل',
    none: 'لا توجد طلبات بعد.',
    from: 'من',
    anonymous: 'مجهول',
    category: 'التصنيف',
    submitted: 'تاريخ الإرسال',
    markOpen: 'إعادة فتح',
    markProgress: 'بدء المعالجة',
    markResolved: 'تم الحل',
    notePlaceholder: 'ملاحظة داخلية (يراها المسؤولون فقط)…',
    saveNote: 'حفظ الملاحظة',
    noteSaved: 'تم حفظ الملاحظة.',
    statusUpdated: 'تم تحديث الحالة.',
    updateFailed: 'تعذّر تحديث الطلب.',
    loadFailed: 'تعذّر تحميل الطلبات',
    adminOnly:
      'مطلوب صلاحية مسؤول — تأكد أن ADMIN_EMAIL على الخادم يطابق بريدك المستخدم لتسجيل الدخول.',
    reply: 'الرد عبر البريد',
    source: 'أُرسل من',
  },
};

const CATEGORY_LABELS = {
  EN: {
    bug: 'App problem',
    booking: 'Booking issue',
    payment: 'Payment issue',
    safety: 'Safety concern',
    listing: 'Listing problem',
    claim: 'Insurance claim',
    help: 'Help request',
    partnership: 'Partnership',
    press: 'Press & media',
    careers: 'Careers',
    other: 'Other',
  },
  AR: {
    bug: 'مشكلة في التطبيق',
    booking: 'مشكلة في الحجز',
    payment: 'مشكلة في الدفع',
    safety: 'مخاوف تتعلق بالسلامة',
    listing: 'مشكلة في إعلان',
    claim: 'مطالبة تأمين',
    help: 'طلب مساعدة',
    partnership: 'شراكة',
    press: 'صحافة وإعلام',
    careers: 'وظائف',
    other: 'أخرى',
  },
};

const STATUS_STYLES = {
  open: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
};

const AdminSupportPage = () => {
  usePageTitle('Support requests');
  const { lang } = usePrefs();
  const L = STR[lang] || STR.EN;
  const CAT = CATEGORY_LABELS[lang] || CATEGORY_LABELS.EN;

  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ open: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get('/support/tickets');
      setTickets(data.tickets || []);
      setCounts(data.counts || {});
      const initialNotes = {};
      (data.tickets || []).forEach((tk) => {
        initialNotes[tk._id] = tk.adminNote || '';
      });
      setNotes(initialNotes);
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 403
          ? L.adminOnly
          : `${L.loadFailed}${status ? ` (HTTP ${status})` : ''}.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTicket = async (id, payload, successMsg) => {
    try {
      setBusyId(id);
      const { data } = await axiosInstance.patch(`/support/tickets/${id}`, payload);
      setTickets((prev) =>
        prev.map((tk) => (tk._id === id ? { ...tk, ...data.ticket } : tk))
      );
      // refresh status counts
      setCounts((prev) => {
        const next = { ...prev };
        const old = tickets.find((tk) => tk._id === id);
        if (payload.status && old && old.status !== payload.status) {
          next[old.status] = Math.max(0, (next[old.status] || 0) - 1);
          next[payload.status] = (next[payload.status] || 0) + 1;
        }
        return next;
      });
      toast.success(successMsg);
    } catch (err) {
      toast.error(err?.response?.data?.message || L.updateFailed);
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    if (filter === 'all') return tickets;
    return tickets.filter((tk) => tk.status === filter);
  }, [tickets, filter]);

  const TABS = [
    { key: 'all', label: L.all, n: tickets.length },
    { key: 'open', label: L.open, n: counts.open || 0 },
    { key: 'in_progress', label: L.inProgress, n: counts.in_progress || 0 },
    { key: 'resolved', label: L.resolved, n: counts.resolved || 0 },
  ];

  return (
    <div>
      <AccountNav />

      <div className="mx-auto max-w-4xl px-4 pb-10">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">{L.title}</h1>
          <p className="text-sm text-gray-500">{L.subtitle}</p>
        </div>

        {/* Status tabs */}
        {!error && (
          <div className="mb-4 flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  filter === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label} ({tab.n})
              </button>
            ))}
          </div>
        )}

        {loading && <Spinner />}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && visible.length === 0 && (
          <div className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
            {L.none}
          </div>
        )}

        <div className="space-y-3">
          {visible.map((tk) => {
            const isBusy = busyId === tk._id;
            return (
              <div
                key={tk._id}
                className="rounded-2xl border bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-primary">
                      {CAT[tk.category] || tk.category}
                    </span>
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[tk.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tk.status === 'open'
                        ? L.open
                        : tk.status === 'in_progress'
                        ? L.inProgress
                        : L.resolved}
                    </span>
                    {tk.source && (
                      <span className="text-[11px] text-gray-400">
                        {L.source}: {tk.source}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {tk.createdAt ? new Date(tk.createdAt).toLocaleString() : ''}
                  </span>
                </div>

                <div className="mb-2 text-sm">
                  <span className="font-semibold text-gray-900">
                    {tk.name || L.anonymous}
                  </span>{' '}
                  <a
                    href={`mailto:${tk.email}?subject=Re: your WareShare request`}
                    className="text-primary hover:underline"
                  >
                    {tk.email}
                  </a>
                </div>

                <p className="whitespace-pre-line rounded-xl bg-gray-50 p-3 text-sm text-gray-800">
                  {tk.message}
                </p>

                {/* Internal note */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={notes[tk._id] ?? ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [tk._id]: e.target.value }))
                    }
                    placeholder={L.notePlaceholder}
                    className="flex-1 rounded-xl border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      updateTicket(
                        tk._id,
                        { adminNote: notes[tk._id] ?? '' },
                        L.noteSaved
                      )
                    }
                    className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                  >
                    {L.saveNote}
                  </button>
                </div>

                {/* Status actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {tk.status !== 'open' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        updateTicket(tk._id, { status: 'open' }, L.statusUpdated)
                      }
                      className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                    >
                      {L.markOpen}
                    </button>
                  )}
                  {tk.status !== 'in_progress' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        updateTicket(
                          tk._id,
                          { status: 'in_progress' },
                          L.statusUpdated
                        )
                      }
                      className="rounded-full border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                    >
                      {L.markProgress}
                    </button>
                  )}
                  {tk.status !== 'resolved' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        updateTicket(
                          tk._id,
                          { status: 'resolved' },
                          L.statusUpdated
                        )
                      }
                      className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      {L.markResolved}
                    </button>
                  )}
                  <a
                    href={`mailto:${tk.email}?subject=Re: your WareShare request`}
                    className="rounded-full border px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {L.reply}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportPage;
