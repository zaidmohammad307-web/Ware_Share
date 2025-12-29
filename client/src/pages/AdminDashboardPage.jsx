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

function NotAuthorized() {
  return (
    <div className="mt-24 rounded-2xl border bg-white p-6 text-sm text-gray-700 shadow-sm">
      <div className="text-lg font-semibold text-gray-900">Not authorized</div>
      <div className="mt-2">This page is restricted to admin@123456.</div>
      <div className="mt-4">
        <Link className="font-semibold text-primary underline" to="/dashboard">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

const AdminDashboardPage = () => {
  const { user, loading } = useAuth();

  const isLoggedIn = Boolean(user);
  if (!loading && !isLoggedIn) return <Navigate to="/login" replace />;

  const isAdmin = user?.email && String(user.email).toLowerCase() === 'admin@123456';
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
      console.error(e);
      const statusCode = e?.response?.status;
      if (statusCode === 403) {
        setNotAuthorized(true);
        setError('');
      } else {
        setError('Failed to load admin dashboard data.');
        toast.error('Failed to load admin dashboard.');
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="text-sm text-gray-600">Platform KPIs, charts, and risk flags.</div>
          </div>
          <Link to="/dashboard" className="font-semibold text-primary underline">
            Back to User Dashboard
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500">Date range</div>
            <div className="flex items-center gap-2">
              <select
                value={preset}
                onChange={(e) => {
                  setPreset(e.target.value);
                  setUseCustom(false);
                }}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <button
                type="button"
                onClick={() => setUseCustom((v) => !v)}
                className={classNames(
                  'rounded-xl border px-3 py-2 text-sm font-semibold',
                  useCustom ? 'bg-primary text-white border-primary' : 'bg-gray-100'
                )}
              >
                Custom
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
            <div className="mb-1 text-xs font-semibold text-gray-500">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="completed">completed</option>
              <option value="declined">cancelled/declined</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Warehouse title or booking ID"
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
              Refresh
            </button>
          </div>
        </div>
      </div>

      {busy ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600 shadow-sm">
          Loading admin dashboard…
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total users" value={k ? k.totalUsers : 0} sub="All-time" />
        <KPI label="Total warehouses" value={k ? k.totalWarehouses : 0} sub="All-time" />
        <KPI label="Bookings (range)" value={k ? k.totalBookings : 0} sub="Date filtered" />
        <KPI label="Active bookings" value={k ? k.activeBookings : 0} sub="pending + approved" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Completed" value={k ? k.completedBookings : 0} />
        <KPI label="Cancellation rate" value={`${safeMoney(k?.cancellationRate ?? 0)}%`} />
        <KPI label="GMV" value={`JOD ${safeMoney(k?.grossBookingValue ?? 0)}`} sub="Excludes declined" />
        <KPI label="Insured bookings %" value={`${safeMoney(k?.insuredBookingsPercentage ?? 0)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Bookings over time" subtitle="Count per day">
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

        <Card title="GMV over time" subtitle="Sum per day (excludes declined)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.charts?.gmvOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="gmv" name="GMV" fill={pickColor(0)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Add-ons revenue over time" subtitle="Insurance / Packing / Delivery (sum per day)">
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
