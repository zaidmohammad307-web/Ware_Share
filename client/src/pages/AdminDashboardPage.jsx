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
} from 'recharts';

import axiosInstance from '@/utils/axios';
import { useAuth } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    notAuthorized: 'Not authorized',
    adminOnly: 'This page is restricted to administrators only.',
    goToDashboard: 'Go to dashboard',
    title: 'Admin Dashboard',
    subtitle: 'Platform KPIs, charts, and risk flags.',
    backToUser: 'Back to User Dashboard',
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
    refresh: 'Refresh',
    loading: 'Loading admin dashboard…',
    loadError: 'Failed to load admin dashboard data.',
    loadToast: 'Failed to load admin dashboard.',
    totalUsers: 'Total users',
    totalWarehouses: 'Total warehouses',
    bookingsRange: 'Bookings (range)',
    activeBookings: 'Active bookings',
    allTime: 'All-time',
    dateFiltered: 'Date filtered',
    pendingApproved: 'pending + approved',
    completedLabel: 'Completed',
    cancellationRate: 'Cancellation rate',
    gmv: 'GMV',
    excludesDeclined: 'Excludes declined',
    insuredPct: 'Insured bookings %',
    bookingsOverTime: 'Bookings over time',
    countPerDay: 'Count per day',
    gmvOverTime: 'GMV over time',
    gmvSubtitle: 'Sum per day (excludes declined)',
    addOnsRevenue: 'Add-ons revenue over time',
    addOnsSubtitle: 'Insurance / Packing / Delivery (sum per day)',
    insurance: 'Insurance',
    packing: 'Packing',
    delivery: 'Delivery',
    utilization: 'Utilization',
    utilizationSubtitle:
      'Current + over time (proxy based on approved bookings created per day)',
    current: 'Current:',
    totalListedCapacity: 'Total listed capacity',
    usedCapacity: 'Used capacity',
    utilizationPct: 'Utilization %',
    recentBookings: 'Recent bookings',
    recentBookingsSubtitle: 'Renter / Owner / Status / Total / CreatedAt',
    noBookings: 'No bookings found for the selected filters.',
    thBooking: 'Booking',
    thWarehouse: 'Warehouse',
    thRenter: 'Renter',
    thOwner: 'Owner',
    thStatus: 'Status',
    thTotal: 'Total',
    thCreated: 'Created',
    lowPerforming: 'Low-performing owners (signals)',
    lowPerformingSubtitle: 'High cancellation rate within selected range',
    noRiskSignals: 'No owner risk signals found for the selected range.',
    thDeclined: 'Declined',
    thCompleted: 'Completed',
    thCancellationPct: 'Cancellation %',
    owner: 'Owner',
  },
  AR: {
    notAuthorized: 'غير مصرّح',
    adminOnly: 'هذه الصفحة مخصّصة للمسؤولين فقط.',
    goToDashboard: 'الذهاب إلى لوحة التحكم',
    title: 'لوحة الإدارة',
    subtitle: 'مؤشرات الأداء والرسوم البيانية وإشارات المخاطر.',
    backToUser: 'العودة إلى لوحة المستخدم',
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
    refresh: 'تحديث',
    loading: 'جارٍ تحميل لوحة الإدارة…',
    loadError: 'تعذّر تحميل بيانات لوحة الإدارة.',
    loadToast: 'تعذّر تحميل لوحة الإدارة.',
    totalUsers: 'إجمالي المستخدمين',
    totalWarehouses: 'إجمالي المستودعات',
    bookingsRange: 'الحجوزات (ضمن النطاق)',
    activeBookings: 'الحجوزات النشطة',
    allTime: 'منذ البداية',
    dateFiltered: 'مُصفّاة بالتاريخ',
    pendingApproved: 'معلّق + مقبول',
    completedLabel: 'مكتملة',
    cancellationRate: 'نسبة الإلغاء',
    gmv: 'إجمالي قيمة الحجوزات',
    excludesDeclined: 'باستثناء المرفوضة',
    insuredPct: 'نسبة الحجوزات المؤمّنة',
    bookingsOverTime: 'الحجوزات عبر الزمن',
    countPerDay: 'العدد لكل يوم',
    gmvOverTime: 'إجمالي قيمة الحجوزات عبر الزمن',
    gmvSubtitle: 'المجموع لكل يوم (باستثناء المرفوضة)',
    addOnsRevenue: 'إيرادات الخدمات الإضافية عبر الزمن',
    addOnsSubtitle: 'التأمين / التغليف / التوصيل (المجموع لكل يوم)',
    insurance: 'التأمين',
    packing: 'التغليف',
    delivery: 'التوصيل',
    utilization: 'معدل الاستغلال',
    utilizationSubtitle:
      'الحالي وعبر الزمن (تقدير مبني على الحجوزات المقبولة المنشأة يوميًا)',
    current: 'الحالي:',
    totalListedCapacity: 'إجمالي السعة المعروضة',
    usedCapacity: 'السعة المستخدمة',
    utilizationPct: 'نسبة الاستغلال',
    recentBookings: 'أحدث الحجوزات',
    recentBookingsSubtitle: 'المستأجر / المالك / الحالة / الإجمالي / تاريخ الإنشاء',
    noBookings: 'لا توجد حجوزات مطابقة للفلاتر المحددة.',
    thBooking: 'الحجز',
    thWarehouse: 'المستودع',
    thRenter: 'المستأجر',
    thOwner: 'المالك',
    thStatus: 'الحالة',
    thTotal: 'الإجمالي',
    thCreated: 'تاريخ الإنشاء',
    lowPerforming: 'الملّاك ضعيفو الأداء (مؤشرات)',
    lowPerformingSubtitle: 'نسبة إلغاء مرتفعة ضمن النطاق المحدد',
    noRiskSignals: 'لا توجد مؤشرات مخاطر للملّاك ضمن النطاق المحدد.',
    thDeclined: 'مرفوضة',
    thCompleted: 'مكتملة',
    thCancellationPct: 'نسبة الإلغاء',
    owner: 'مالك',
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
  if (preset === '7') return { from: toYMD(addDays(today, -6)), to: toYMD(today) };
  if (preset === '90') return { from: toYMD(addDays(today, -89)), to: toYMD(today) };
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

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@123456';

function NotAuthorized() {
  const { lang } = usePrefs();
  const L = STR[lang] || STR.EN;
  return (
    <div className="mt-24 rounded-2xl border bg-white p-6 text-sm text-gray-700 shadow-sm">
      <div className="text-lg font-semibold text-gray-900">{L.notAuthorized}</div>
      <div className="mt-2">{L.adminOnly}</div>
      <div className="mt-4">
        <Link className="font-semibold text-primary underline" to="/dashboard">
          {L.goToDashboard}
        </Link>
      </div>
    </div>
  );
}

const AdminDashboardPage = () => {
  const { user, loading } = useAuth();
  const { lang, formatPrice } = usePrefs();
  const L = STR[lang] || STR.EN;

  const isLoggedIn = Boolean(user);
  if (!loading && !isLoggedIn) return <Navigate to="/login" replace />;

  const isAdmin = user?.email && String(user.email).toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (!loading && user && !isAdmin) return <NotAuthorized />;

  const [preset, setPreset] = useState('30');
  const [useCustom, setUseCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  const range = useMemo(() => {
    if (useCustom && customFrom && customTo) return { from: customFrom, to: customTo };
    return getPresetRange(preset);
  }, [preset, useCustom, customFrom, customTo]);

  const paramsBase = useMemo(() => {
    return {
      from: range.from,
      to: range.to,
      status: status || 'all',
      q: q ? q.trim() : '',
    };
  }, [range.from, range.to, status, q]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notAuthorized, setNotAuthorized] = useState(false);

  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [util, setUtil] = useState(null);
  const [risk, setRisk] = useState(null);

  async function loadAll() {
    setBusy(true);
    setError('');
    setNotAuthorized(false);

    try {
      const [s, b, u, r] = await Promise.all([
        axiosInstance.get('/admin/dashboard/summary', { params: paramsBase }),
        axiosInstance.get('/admin/dashboard/bookings', { params: paramsBase }),
        axiosInstance.get('/admin/dashboard/utilization', { params: paramsBase }),
        axiosInstance.get('/admin/dashboard/risk', { params: { from: paramsBase.from, to: paramsBase.to } }),
      ]);

      if (!s.data?.success) throw new Error('Summary failed');
      setSummary(s.data);

      if (b.data?.success) setBookings(b.data);
      else setBookings({ bookings: [] });

      if (u.data?.success) setUtil(u.data);
      else setUtil(null);

      if (r.data?.success) setRisk(r.data);
      else setRisk({ lowPerformingOwners: [] });
    } catch (e) {
      const statusCode = e?.response?.status;
      if (statusCode === 403) {
        setNotAuthorized(true);
        setError('');
      } else {
        setError(L.loadError);
        toast.error(L.loadToast);
      }
      setSummary(null);
      setBookings(null);
      setUtil(null);
      setRisk(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (loading || !user || !isAdmin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?._id, isAdmin, paramsBase.from, paramsBase.to, paramsBase.status, paramsBase.q]);

  if (notAuthorized) return <NotAuthorized />;

  const k = summary?.kpis || null;

  return (
    <div className="mt-24 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{L.title}</h1>
            <div className="text-sm text-gray-600">{L.subtitle}</div>
          </div>
          <Link to="/dashboard" className="font-semibold text-primary underline">
            {L.backToUser}
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadAll}
              className="w-full rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white"
              disabled={busy}
            >
              {L.refresh}
            </button>
          </div>
        </div>
      </div>

      {busy ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600 shadow-sm">
          {L.loading}
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label={L.totalUsers} value={k ? k.totalUsers : 0} sub={L.allTime} />
        <KPI label={L.totalWarehouses} value={k ? k.totalWarehouses : 0} sub={L.allTime} />
        <KPI label={L.bookingsRange} value={k ? k.totalBookings : 0} sub={L.dateFiltered} />
        <KPI label={L.activeBookings} value={k ? k.activeBookings : 0} sub={L.pendingApproved} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label={L.completedLabel} value={k ? k.completedBookings : 0} />
        <KPI label={L.cancellationRate} value={`${safeMoney(k?.cancellationRate ?? 0)}%`} />
        <KPI
          label={L.gmv}
          value={formatPrice(safeMoney(k?.grossBookingValue ?? 0))}
          sub={L.excludesDeclined}
        />
        <KPI label={L.insuredPct} value={`${safeMoney(k?.insuredBookingsPercentage ?? 0)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={L.bookingsOverTime} subtitle={L.countPerDay}>
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

        <Card title={L.gmvOverTime} subtitle={L.gmvSubtitle}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.charts?.gmvOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="gmv" name={L.gmv} fill={pickColor(0)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={L.addOnsRevenue} subtitle={L.addOnsSubtitle}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.charts?.addOnsRevenueOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="insurance" name="Insurance" stackId="a" fill={pickColor(1)} />
                <Bar dataKey="packing" name="Packing" stackId="a" fill={pickColor(2)} />
                <Bar dataKey="delivery" name="Delivery" stackId="a" fill={pickColor(3)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Utilization"
          subtitle="Current + over time (proxy based on approved bookings created per day)"
          right={
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Current:</span> {safeMoney(util?.utilizationPercentage ?? 0)}%
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KPI label="Total listed capacity" value={safeMoney(util?.totalListedCapacity ?? 0)} />
            <KPI label="Used capacity" value={safeMoney(util?.usedCapacity ?? 0)} />
            <KPI label="Utilization %" value={`${safeMoney(util?.utilizationPercentage ?? 0)}%`} />
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={util?.utilizationOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="utilization"
                  name="Utilization %"
                  stroke={pickColor(4)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Recent bookings" subtitle="Renter / Owner / Status / Total / CreatedAt">
        {(bookings?.bookings || []).length === 0 ? (
          <div className="text-sm text-gray-600">No bookings found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3">Booking</th>
                  <th className="py-2 pr-3">Warehouse</th>
                  <th className="py-2 pr-3">Renter</th>
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {(bookings?.bookings || []).map((b) => (
                  <tr key={b._id} className="border-b">
                    <td className="py-2 pr-3 font-mono">{String(b._id).slice(0, 10)}…</td>
                    <td className="py-2 pr-3">{b.warehouseTitle || '-'}</td>
                    <td className="py-2 pr-3">{b.renterEmail || '-'}</td>
                    <td className="py-2 pr-3">{b.ownerEmail || '-'}</td>
                    <td className="py-2 pr-3">{b.status}</td>
                    <td className="py-2 pr-3">JOD {safeMoney(b.totalPrice)}</td>
                    <td className="py-2 pr-3">{b.createdAt ? new Date(b.createdAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Low-performing owners (signals)" subtitle="High cancellation rate within selected range">
        {(risk?.lowPerformingOwners || []).length === 0 ? (
          <div className="text-sm text-gray-600">No owner risk signals found for the selected range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Declined</th>
                  <th className="py-2 pr-3">Completed</th>
                  <th className="py-2 pr-3">Cancellation %</th>
                </tr>
              </thead>
              <tbody>
                {(risk?.lowPerformingOwners || []).map((o) => (
                  <tr key={o.ownerId} className="border-b">
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-gray-900">{o.ownerName || 'Owner'}</div>
                      <div className="text-xs text-gray-600">{o.ownerEmail || ''}</div>
                    </td>
                    <td className="py-2 pr-3">{o.totalBookings}</td>
                    <td className="py-2 pr-3">{o.declinedCount}</td>
                    <td className="py-2 pr-3">{o.completedCount}</td>
                    <td className="py-2 pr-3">{safeMoney(o.cancellationRate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
