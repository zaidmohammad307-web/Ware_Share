import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import axiosInstance from '@/utils/axios';
import { useAuth } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    notAuthorized: 'Not authorized',
    notAuthorizedBody: 'You are not authorized to view this.',
    goToDashboard: 'Go to dashboard',
    title: 'Dashboard',
    subtitle: 'Renter + Host insights with filters and charts.',
    openAdmin: 'Open Admin Dashboard',
    tabOverview: 'Overview',
    tabRenter: 'My Renting',
    tabOwner: 'My Hosting',
    dateRange: 'Date range',
    last7: 'Last 7 days',
    last30: 'Last 30 days',
    last90: 'Last 90 days',
    custom: 'Custom',
    status: 'Status',
    all: 'All',
    pending: 'pending',
    approved: 'approved',
    completed: 'completed',
    cancelledDeclined: 'cancelled/declined',
    search: 'Search',
    searchPlaceholder: 'Warehouse title or booking ID',
    quickActions: 'Quick actions',
    myBookings: 'My bookings',
    hostingRequests: 'Hosting requests',
    messages: 'Messages',
    warehouseFilter: 'Warehouse filter (hosting)',
    allMyWarehouses: 'All my warehouses',
    loading: 'Loading dashboard data…',
    errOverview: 'Failed to load overview.',
    errOverviewToast: 'Failed to load dashboard overview.',
    errRenter: 'Failed to load renting data.',
    errRenterToast: 'Failed to load renting dashboard.',
    errOwner: 'Failed to load hosting data.',
    errOwnerToast: 'Failed to load hosting dashboard.',
    statusUpdated: (s) => `Booking ${s} successfully.`,
    statusUpdateFailed: 'Failed to update booking status.',
    renterActive: 'Renter active',
    approvedBookings: 'Approved bookings',
    renterPending: 'Renter pending',
    awaitingOwner: 'Awaiting owner action',
    spentPaid: 'Spent (paid)',
    paidOnly: 'Paid bookings only',
    ownerPending: 'Owner pending',
    requestsToYours: 'Requests to your warehouses',
    bookingsOverTime: 'Bookings over time',
    bookingsOverTimeSub: 'Count of bookings created per day',
    statusBreakdown: 'Status breakdown',
    statusBreakdownSub: 'Distribution of booking statuses',
    totalBookings: 'Total bookings',
    insuranceTotal: 'Insurance total',
    packingDelivery: 'Packing + Delivery',
    spendingOverTime: 'Spending over time',
    paidPerDay: 'Paid totals per day',
    addOnsOverTime: 'Add-ons totals over time',
    addOnsSub: 'Insurance / Packing / Delivery',
    insurance: 'Insurance',
    packing: 'Packing',
    delivery: 'Delivery',
    myRenting: 'My Renting',
    myRentingSub: 'Bookings you requested (filtered)',
    range: 'Range:',
    noBookings: 'No bookings found for the selected filters.',
    warehouse: 'Warehouse',
    statusLabel: 'Status:',
    totalLabel: 'Total:',
    openBooking: 'Open booking',
    chat: 'Chat',
    viewWarehouse: 'View warehouse',
    pendingRequests: 'Pending requests',
    completedBookings: 'Completed bookings',
    grossEarned: 'Gross earned',
    excludesDeclined: 'Excludes declined',
    addOnsTotal: 'Add-ons total',
    earningsOverTime: 'Earnings over time',
    earningsPaid: 'Earnings (paid)',
    myHosting: 'My Hosting',
    myHostingSub: 'Requests and bookings to your warehouses (filtered)',
    renterLabel: 'Renter:',
    renter: 'Renter',
    addOnsLabel: 'Add-ons:',
    approve: 'Approve',
    decline: 'Decline',
    markCompleted: 'Mark completed',
    ownerRequests: 'Owner requests',
  },
  AR: {
    notAuthorized: 'غير مصرّح',
    notAuthorizedBody: 'لا تملك صلاحية لعرض هذا المحتوى.',
    goToDashboard: 'الذهاب إلى لوحة التحكم',
    title: 'لوحة التحكم',
    subtitle: 'مؤشرات الاستئجار والاستضافة مع الفلاتر والرسوم البيانية.',
    openAdmin: 'فتح لوحة الإدارة',
    tabOverview: 'نظرة عامة',
    tabRenter: 'استئجاري',
    tabOwner: 'استضافتي',
    dateRange: 'النطاق الزمني',
    last7: 'آخر 7 أيام',
    last30: 'آخر 30 يومًا',
    last90: 'آخر 90 يومًا',
    custom: 'مخصّص',
    status: 'الحالة',
    all: 'الكل',
    pending: 'معلّق',
    approved: 'مقبول',
    completed: 'مكتمل',
    cancelledDeclined: 'ملغى/مرفوض',
    search: 'بحث',
    searchPlaceholder: 'اسم المستودع أو رقم الحجز',
    quickActions: 'إجراءات سريعة',
    myBookings: 'حجوزاتي',
    hostingRequests: 'طلبات الاستضافة',
    messages: 'الرسائل',
    warehouseFilter: 'فلتر المستودع (الاستضافة)',
    allMyWarehouses: 'كل مستودعاتي',
    loading: 'جارٍ تحميل بيانات لوحة التحكم…',
    errOverview: 'تعذّر تحميل النظرة العامة.',
    errOverviewToast: 'تعذّر تحميل النظرة العامة للوحة التحكم.',
    errRenter: 'تعذّر تحميل بيانات الاستئجار.',
    errRenterToast: 'تعذّر تحميل لوحة الاستئجار.',
    errOwner: 'تعذّر تحميل بيانات الاستضافة.',
    errOwnerToast: 'تعذّر تحميل لوحة الاستضافة.',
    statusUpdated: () => 'تم تحديث حالة الحجز بنجاح.',
    statusUpdateFailed: 'تعذّر تحديث حالة الحجز.',
    renterActive: 'حجوزات نشطة كمستأجر',
    approvedBookings: 'الحجوزات المقبولة',
    renterPending: 'حجوزات معلّقة كمستأجر',
    awaitingOwner: 'بانتظار إجراء المالك',
    spentPaid: 'المصروف (المدفوع)',
    paidOnly: 'الحجوزات المدفوعة فقط',
    ownerPending: 'طلبات معلّقة كمالك',
    requestsToYours: 'طلبات على مستودعاتك',
    bookingsOverTime: 'الحجوزات عبر الزمن',
    bookingsOverTimeSub: 'عدد الحجوزات المنشأة يوميًا',
    statusBreakdown: 'توزيع الحالات',
    statusBreakdownSub: 'توزيع حالات الحجوزات',
    totalBookings: 'إجمالي الحجوزات',
    insuranceTotal: 'إجمالي التأمين',
    packingDelivery: 'التغليف + التوصيل',
    spendingOverTime: 'الإنفاق عبر الزمن',
    paidPerDay: 'إجمالي المدفوع لكل يوم',
    addOnsOverTime: 'إجمالي الخدمات الإضافية عبر الزمن',
    addOnsSub: 'التأمين / التغليف / التوصيل',
    insurance: 'التأمين',
    packing: 'التغليف',
    delivery: 'التوصيل',
    myRenting: 'استئجاري',
    myRentingSub: 'الحجوزات التي طلبتها (مُصفّاة)',
    range: 'النطاق:',
    noBookings: 'لا توجد حجوزات مطابقة للفلاتر المحددة.',
    warehouse: 'مستودع',
    statusLabel: 'الحالة:',
    totalLabel: 'الإجمالي:',
    openBooking: 'فتح الحجز',
    chat: 'المحادثة',
    viewWarehouse: 'عرض المستودع',
    pendingRequests: 'الطلبات المعلّقة',
    completedBookings: 'الحجوزات المكتملة',
    grossEarned: 'إجمالي الأرباح',
    excludesDeclined: 'باستثناء المرفوضة',
    addOnsTotal: 'إجمالي الخدمات الإضافية',
    earningsOverTime: 'الأرباح عبر الزمن',
    earningsPaid: 'الأرباح (المدفوعة)',
    myHosting: 'استضافتي',
    myHostingSub: 'الطلبات والحجوزات على مستودعاتك (مُصفّاة)',
    renterLabel: 'المستأجر:',
    renter: 'مستأجر',
    addOnsLabel: 'الخدمات الإضافية:',
    approve: 'قبول',
    decline: 'رفض',
    markCompleted: 'وضع علامة مكتمل',
    ownerRequests: 'طلبات المالك',
  },
};

const CHART_COLORS = [
  '#2563EB', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#F97316', // orange
  '#64748B', // slate
];

function pickColor(i) {
  return CHART_COLORS[i % CHART_COLORS.length];
}

function safeMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function toYMD(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function getPresetRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === '7') {
    return { from: toYMD(addDays(today, -6)), to: toYMD(today) };
  }
  if (preset === '90') {
    return { from: toYMD(addDays(today, -89)), to: toYMD(today) };
  }
  // default 30
  return { from: toYMD(addDays(today, -29)), to: toYMD(today) };
}

function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

function KPI({ label, value, sub }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          {subtitle ? <div className="text-sm text-gray-600">{subtitle}</div> : null}
        </div>
        {right ? <div className="mt-2 sm:mt-0">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function NotAuthorized({ message }) {
  const { lang } = usePrefs();
  const L = STR[lang] || STR.EN;
  return (
    <div className="mt-24 rounded-2xl border bg-white p-6 text-sm text-gray-700 shadow-sm">
      <div className="text-lg font-semibold text-gray-900">{L.notAuthorized}</div>
      <div className="mt-2">{message || L.notAuthorizedBody}</div>
      <div className="mt-4">
        <Link className="font-semibold text-primary underline" to="/dashboard">
          {L.goToDashboard}
        </Link>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const { user, loading } = useAuth();
  const { lang, formatPrice } = usePrefs();
  const L = STR[lang] || STR.EN;

  const [tab, setTab] = useState('overview');

  // Filters
  const [preset, setPreset] = useState('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [ownerPlaceId, setOwnerPlaceId] = useState('all');

  const range = useMemo(() => {
    if (useCustom && customFrom && customTo) return { from: customFrom, to: customTo };
    return getPresetRange(preset);
  }, [preset, useCustom, customFrom, customTo]);

  const isLoggedIn = Boolean(user);
  if (!loading && !isLoggedIn) return <Navigate to="/login" replace />;

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@123456';
  const isAdmin = user?.email && String(user.email).toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [renter, setRenter] = useState(null);
  const [owner, setOwner] = useState(null);

  const paramsBase = useMemo(() => {
    const p = {
      from: range.from,
      to: range.to,
      status: status || 'all',
      q: q ? q.trim() : '',
    };
    return p;
  }, [range.from, range.to, status, q]);

  async function fetchOverview() {
    setBusy(true);
    setError('');
    try {
      const { data } = await axiosInstance.get('/dashboard/summary', { params: paramsBase });
      if (!data?.success) throw new Error('Failed');
      setSummary(data);
    } catch (e) {
      setSummary(null);
      setError(L.errOverview);
      toast.error(L.errOverviewToast);
    } finally {
      setBusy(false);
    }
  }

  async function fetchRenter() {
    setBusy(true);
    setError('');
    try {
      const { data } = await axiosInstance.get('/dashboard/renter', { params: paramsBase });
      if (!data?.success) throw new Error('Failed');
      setRenter(data);
    } catch (e) {
      setRenter(null);
      setError(L.errRenter);
      toast.error(L.errRenterToast);
    } finally {
      setBusy(false);
    }
  }

  async function fetchOwner() {
    setBusy(true);
    setError('');
    try {
      const params = {
        ...paramsBase,
        placeId: ownerPlaceId && ownerPlaceId !== 'all' ? ownerPlaceId : undefined,
      };
      const { data } = await axiosInstance.get('/dashboard/owner', { params });
      if (!data?.success) throw new Error('Failed');
      setOwner(data);
    } catch (e) {
      setOwner(null);
      setError(L.errOwner);
      toast.error(L.errOwnerToast);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (loading || !user) return;
    if (tab === 'overview') fetchOverview();
    if (tab === 'renter') fetchRenter();
    if (tab === 'owner') fetchOwner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loading, user?._id, paramsBase.from, paramsBase.to, paramsBase.status, paramsBase.q, ownerPlaceId]);

  const overviewKpis = summary?.kpis || null;

  const renterTotals = renter?.totals || null;
  const renterCharts = renter?.charts || null;

  const ownerTotals = owner?.totals || null;
  const ownerCharts = owner?.charts || null;
  const ownerPlaces = owner?.places || [];

  const updateBookingStatus = async (bookingId, nextStatus) => {
    try {
      const { data } = await axiosInstance.put(`/bookings/${bookingId}/status`, {
        status: nextStatus,
      });
      if (data?.success) toast.success(data.message || L.statusUpdated(nextStatus));
      else toast.error(L.statusUpdateFailed);

      if (tab === 'overview') await fetchOverview();
      if (tab === 'owner') await fetchOwner();
    } catch (e) {
      toast.error(L.statusUpdateFailed);
    }
  };

  const filterBar = (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500">{L.dateRange}</div>
            <div className="flex items-center gap-2">
              <select
                value={preset}
                onChange={(e) => {
                  setPreset(e.target.value);
                  setUseCustom(false);
                }}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="7">{L.last7}</option>
                <option value="30">{L.last30}</option>
                <option value="90">{L.last90}</option>
              </select>
              <button
                type="button"
                onClick={() => setUseCustom((v) => !v)}
                className={classNames(
                  'rounded-xl border px-3 py-2 text-sm font-semibold',
                  useCustom ? 'bg-primary text-white border-primary' : 'bg-gray-100'
                )}
              >
                {L.custom}
              </button>
            </div>
            {useCustom ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                />
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-500">
                {range.from} → {range.to}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500">{L.status}</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            >
              <option value="all">{L.all}</option>
              <option value="pending">{L.pending}</option>
              <option value="approved">{L.approved}</option>
              <option value="completed">{L.completed}</option>
              <option value="declined">{L.cancelledDeclined}</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500">{L.search}</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L.searchPlaceholder}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500">{L.quickActions}</div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/account/bookings"
                className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
              >
                {L.myBookings}
              </Link>
              <Link
                to="/account/owner/bookings"
                className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
              >
                {L.hostingRequests}
              </Link>
              <Link
                to="/account/chats"
                className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
              >
                {L.messages}
              </Link>
            </div>
          </div>
        </div>

        {tab === 'owner' ? (
          <div className="w-full lg:w-72">
            <div className="mb-1 text-xs font-semibold text-gray-500">{L.warehouseFilter}</div>
            <select
              value={ownerPlaceId}
              onChange={(e) => setOwnerPlaceId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              disabled={!ownerPlaces?.length}
            >
              <option value="all">{L.allMyWarehouses}</option>
              {(ownerPlaces || []).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} {p.city ? `(${p.city})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={classNames(
        'rounded-full border px-4 py-2 text-sm font-semibold',
        tab === key ? 'bg-primary text-white border-primary' : 'bg-gray-200 text-gray-800'
      )}
    >
      {label}
    </button>
  );

  const statusBreakdownData = Array.isArray(summary?.charts?.statusBreakdown)
    ? summary.charts.statusBreakdown
    : [];

  return (
    <div className="mt-24 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{L.title}</h1>
            <div className="text-sm text-gray-600">{L.subtitle}</div>
          </div>
          {isAdmin ? (
            <Link to="/admin/dashboard" className="font-semibold text-primary underline">
              {L.openAdmin}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {tabBtn('overview', L.tabOverview)}
          {tabBtn('renter', L.tabRenter)}
          {tabBtn('owner', L.tabOwner)}
        </div>
      </div>

      {filterBar}

      {busy ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600 shadow-sm">
          {L.loading}
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-sm">{error}</div>
      ) : null}

      {tab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI
              label={L.renterActive}
              value={overviewKpis ? overviewKpis.renterActiveBookings : 0}
              sub={L.approvedBookings}
            />
            <KPI
              label={L.renterPending}
              value={overviewKpis ? overviewKpis.renterPendingBookings : 0}
              sub={L.awaitingOwner}
            />
            <KPI
              label={L.spentPaid}
              value={formatPrice(safeMoney(overviewKpis?.renterTotalSpent ?? 0))}
              sub={L.paidOnly}
            />
            <KPI
              label={L.ownerPending}
              value={overviewKpis ? overviewKpis.ownerPendingRequests : 0}
              sub={L.requestsToYours}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title={L.bookingsOverTime} subtitle={L.bookingsOverTimeSub}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary?.charts?.bookingsOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="bookings"
                      stroke={pickColor(0)}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={L.statusBreakdown} subtitle={L.statusBreakdownSub}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdownData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={110}
                      innerRadius={65}
                      label
                      isAnimationActive={false}
                    >
                      {statusBreakdownData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={pickColor(idx)} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      ) : null}

      {tab === 'renter' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI label={L.totalBookings} value={renterTotals?.totalBookings ?? 0} />
            <KPI label={L.spentPaid} value={formatPrice(safeMoney(renterTotals?.totalSpentPaid ?? 0))} />
            <KPI label={L.insuranceTotal} value={formatPrice(safeMoney(renterTotals?.insuranceTotal ?? 0))} />
            <KPI
              label={L.packingDelivery}
              value={formatPrice(
                safeMoney((renterTotals?.packingTotal ?? 0) + (renterTotals?.deliveryTotal ?? 0))
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title={L.spendingOverTime} subtitle={L.paidPerDay}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={renterCharts?.spendingOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="amount" name={L.spentPaid} fill={pickColor(0)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={L.addOnsOverTime} subtitle={L.addOnsSub}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={renterCharts?.addOnsOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="insurance" name={L.insurance} stackId="a" fill={pickColor(1)} />
                    <Bar dataKey="packing" name={L.packing} stackId="a" fill={pickColor(2)} />
                    <Bar dataKey="delivery" name={L.delivery} stackId="a" fill={pickColor(3)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card
            title={L.myRenting}
            subtitle={L.myRentingSub}
            right={
              <div className="text-sm text-gray-700">
                <span className="font-semibold">{L.range}</span> {renter?.from || range.from} →{' '}
                {renter?.to || range.to}
              </div>
            }
          >
            {(renter?.bookings || []).length === 0 ? (
              <div className="text-sm text-gray-600">{L.noBookings}</div>
            ) : (
              <div className="space-y-3">
                {(renter?.bookings || []).map((b) => (
                  <div
                    key={b._id}
                    className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-xl bg-gray-200">
                        {b.warehouse?.image ? (
                          <img src={b.warehouse.image} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{b.warehouse?.title || L.warehouse}</div>
                        <div className="text-xs text-gray-600">
                          {b.warehouse?.city || ''}
                          {b.warehouse?.city ? ' · ' : ''}
                          {String(b._id).slice(0, 8)}…
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          <span className="font-semibold">{L.statusLabel}</span> {b.status}{' '}
                          <span className="mx-1">·</span>
                          <span className="font-semibold">{L.totalLabel}</span>{' '}
                          {formatPrice(safeMoney(b.totalPrice))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/account/bookings/${b._id}`}
                        className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                      >
                        {L.openBooking}
                      </Link>
                      <Link
                        to={`/account/bookings/${b._id}/chat`}
                        className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                      >
                        {L.chat}
                      </Link>
                      {b.warehouse?._id ? (
                        <Link
                          to={`/place/${b.warehouse._id}`}
                          className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                        >
                          {L.viewWarehouse}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}

      {tab === 'owner' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI label={L.pendingRequests} value={ownerTotals?.pendingRequests ?? 0} />
            <KPI label={L.completedBookings} value={ownerTotals?.completedBookings ?? 0} />
            <KPI
              label={L.grossEarned}
              value={formatPrice(safeMoney(ownerTotals?.totalGrossEarned ?? 0))}
              sub={L.excludesDeclined}
            />
            <KPI
              label={L.addOnsTotal}
              value={formatPrice(
                safeMoney(
                  (ownerTotals?.insuranceTotal ?? 0) +
                    (ownerTotals?.packingTotal ?? 0) +
                    (ownerTotals?.deliveryTotal ?? 0)
                )
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title={L.earningsOverTime} subtitle={L.paidPerDay}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ownerCharts?.earningsOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name={L.earningsPaid}
                      stroke={pickColor(0)}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={L.addOnsOverTime} subtitle={L.addOnsSub}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ownerCharts?.addOnsOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="insurance" name={L.insurance} stackId="a" fill={pickColor(1)} />
                    <Bar dataKey="packing" name={L.packing} stackId="a" fill={pickColor(2)} />
                    <Bar dataKey="delivery" name={L.delivery} stackId="a" fill={pickColor(3)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card title={L.myHosting} subtitle={L.myHostingSub}>
            {(owner?.bookings || []).length === 0 ? (
              <div className="text-sm text-gray-600">{L.noBookings}</div>
            ) : (
              <div className="space-y-3">
                {(owner?.bookings || []).map((b) => (
                  <div
                    key={b._id}
                    className="flex flex-col gap-3 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-xl bg-gray-200">
                        {b.warehouse?.image ? (
                          <img src={b.warehouse.image} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{b.warehouse?.title || L.warehouse}</div>
                        <div className="text-xs text-gray-600">
                          <span className="font-semibold">{L.renterLabel}</span>{' '}
                          {b.renter?.name || L.renter}
                          {b.renter?.email ? ` (${b.renter.email})` : ''}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          <span className="font-semibold">{L.statusLabel}</span> {b.status}
                          <span className="mx-1">·</span>
                          <span className="font-semibold">{L.totalLabel}</span>{' '}
                          {formatPrice(safeMoney(b.totalPrice))}
                          <span className="mx-1">·</span>
                          <span className="font-semibold">{L.addOnsLabel}</span>{' '}
                          {formatPrice(
                            safeMoney(
                              (b.addOns?.insuranceFee ?? 0) +
                                (b.addOns?.packingFee ?? 0) +
                                (b.addOns?.deliveryFee ?? 0)
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/account/chats/booking/${b._id}`}
                        className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                      >
                        {L.chat}
                      </Link>

                      {b.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(b._id, 'approved')}
                            className="rounded-xl border border-green-600 bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                          >
                            {L.approve}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(b._id, 'declined')}
                            className="rounded-xl border border-red-600 bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                          >
                            {L.decline}
                          </button>
                        </>
                      ) : null}

                      {b.status === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(b._id, 'completed')}
                          className="rounded-xl border bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
                        >
                          {L.markCompleted}
                        </button>
                      ) : null}

                      <Link
                        to={`/account/owner/bookings`}
                        className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                      >
                        {L.ownerRequests}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default DashboardPage;
