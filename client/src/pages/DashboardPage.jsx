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
  return (
    <div className="mt-24 rounded-2xl border bg-white p-6 text-sm text-gray-700 shadow-sm">
      <div className="text-lg font-semibold text-gray-900">Not authorized</div>
      <div className="mt-2">{message || 'You are not authorized to view this.'}</div>
      <div className="mt-4">
        <Link className="font-semibold text-primary underline" to="/dashboard">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const { user, loading } = useAuth();

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

  const isAdmin = user?.email && String(user.email).toLowerCase() === 'admin@123456';

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
      console.error(e);
      setSummary(null);
      setError('Failed to load overview.');
      toast.error('Failed to load dashboard overview.');
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
      console.error(e);
      setRenter(null);
      setError('Failed to load renting data.');
      toast.error('Failed to load renting dashboard.');
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
      console.error(e);
      setOwner(null);
      setError('Failed to load hosting data.');
      toast.error('Failed to load hosting dashboard.');
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
      if (data?.success) toast.success(data.message || `Booking ${nextStatus} successfully.`);
      else toast.error('Failed to update booking status.');

      if (tab === 'overview') await fetchOverview();
      if (tab === 'owner') await fetchOwner();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update booking status.');
    }
  };

  const filterBar = (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500">Quick actions</div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/account/bookings"
                className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
              >
                My bookings
              </Link>
              <Link
                to="/account/owner/bookings"
                className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
              >
                Hosting requests
              </Link>
              <Link
                to="/account/chats"
                className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
              >
                Messages
              </Link>
            </div>
          </div>
        </div>

        {tab === 'owner' ? (
          <div className="w-full lg:w-72">
            <div className="mb-1 text-xs font-semibold text-gray-500">Warehouse filter (hosting)</div>
            <select
              value={ownerPlaceId}
              onChange={(e) => setOwnerPlaceId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              disabled={!ownerPlaces?.length}
            >
              <option value="all">All my warehouses</option>
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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <div className="text-sm text-gray-600">Renter + Host insights with filters and charts.</div>
          </div>
          {isAdmin ? (
            <Link to="/admin/dashboard" className="font-semibold text-primary underline">
              Open Admin Dashboard
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {tabBtn('overview', 'Overview')}
          {tabBtn('renter', 'My Renting')}
          {tabBtn('owner', 'My Hosting')}
        </div>
      </div>

      {filterBar}

      {busy ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600 shadow-sm">
          Loading dashboard data…
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-sm">{error}</div>
      ) : null}

      {tab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI
              label="Renter active"
              value={overviewKpis ? overviewKpis.renterActiveBookings : 0}
              sub="Approved bookings"
            />
            <KPI
              label="Renter pending"
              value={overviewKpis ? overviewKpis.renterPendingBookings : 0}
              sub="Awaiting owner action"
            />
            <KPI
              label="Spent (paid)"
              value={`JOD ${safeMoney(overviewKpis?.renterTotalSpent ?? 0)}`}
              sub="Paid bookings only"
            />
            <KPI
              label="Owner pending"
              value={overviewKpis ? overviewKpis.ownerPendingRequests : 0}
              sub="Requests to your warehouses"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Bookings over time" subtitle="Count of bookings created per day">
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

            <Card title="Status breakdown" subtitle="Distribution of booking statuses">
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
            <KPI label="Total bookings" value={renterTotals?.totalBookings ?? 0} />
            <KPI label="Spent (paid)" value={`JOD ${safeMoney(renterTotals?.totalSpentPaid ?? 0)}`} />
            <KPI label="Insurance total" value={`JOD ${safeMoney(renterTotals?.insuranceTotal ?? 0)}`} />
            <KPI
              label="Packing + Delivery"
              value={`JOD ${safeMoney((renterTotals?.packingTotal ?? 0) + (renterTotals?.deliveryTotal ?? 0))}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Spending over time" subtitle="Paid totals per day">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={renterCharts?.spendingOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="amount" name="Spent (paid)" fill={pickColor(0)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Add-ons totals over time" subtitle="Insurance / Packing / Delivery">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={renterCharts?.addOnsOverTime || []}>
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
          </div>

          <Card
            title="My Renting"
            subtitle="Bookings you requested (filtered)"
            right={
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Range:</span> {renter?.from || range.from} →{' '}
                {renter?.to || range.to}
              </div>
            }
          >
            {(renter?.bookings || []).length === 0 ? (
              <div className="text-sm text-gray-600">No bookings found for the selected filters.</div>
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
                        <div className="font-semibold text-gray-900">{b.warehouse?.title || 'Warehouse'}</div>
                        <div className="text-xs text-gray-600">
                          {b.warehouse?.city || ''}
                          {b.warehouse?.city ? ' · ' : ''}
                          {String(b._id).slice(0, 8)}…
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          <span className="font-semibold">Status:</span> {b.status}{' '}
                          <span className="mx-1">·</span>
                          <span className="font-semibold">Total:</span> JOD {safeMoney(b.totalPrice)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/account/bookings/${b._id}`}
                        className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                      >
                        Open booking
                      </Link>
                      <Link
                        to={`/account/bookings/${b._id}/chat`}
                        className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                      >
                        Chat
                      </Link>
                      {b.warehouse?._id ? (
                        <Link
                          to={`/place/${b.warehouse._id}`}
                          className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                        >
                          View warehouse
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
            <KPI label="Pending requests" value={ownerTotals?.pendingRequests ?? 0} />
            <KPI label="Completed bookings" value={ownerTotals?.completedBookings ?? 0} />
            <KPI
              label="Gross earned"
              value={`JOD ${safeMoney(ownerTotals?.totalGrossEarned ?? 0)}`}
              sub="Excludes declined"
            />
            <KPI
              label="Add-ons total"
              value={`JOD ${safeMoney(
                (ownerTotals?.insuranceTotal ?? 0) + (ownerTotals?.packingTotal ?? 0) + (ownerTotals?.deliveryTotal ?? 0)
              )}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Earnings over time" subtitle="Paid totals per day">
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
                      name="Earnings (paid)"
                      stroke={pickColor(0)}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Add-ons totals over time" subtitle="Insurance / Packing / Delivery">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ownerCharts?.addOnsOverTime || []}>
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
          </div>

          <Card title="My Hosting" subtitle="Requests and bookings to your warehouses (filtered)">
            {(owner?.bookings || []).length === 0 ? (
              <div className="text-sm text-gray-600">No bookings found for the selected filters.</div>
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
                        <div className="font-semibold text-gray-900">{b.warehouse?.title || 'Warehouse'}</div>
                        <div className="text-xs text-gray-600">
                          <span className="font-semibold">Renter:</span> {b.renter?.name || 'Renter'}
                          {b.renter?.email ? ` (${b.renter.email})` : ''}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          <span className="font-semibold">Status:</span> {b.status}
                          <span className="mx-1">·</span>
                          <span className="font-semibold">Total:</span> JOD {safeMoney(b.totalPrice)}
                          <span className="mx-1">·</span>
                          <span className="font-semibold">Add-ons:</span> JOD{' '}
                          {safeMoney(
                            (b.addOns?.insuranceFee ?? 0) + (b.addOns?.packingFee ?? 0) + (b.addOns?.deliveryFee ?? 0)
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/account/chats/booking/${b._id}`}
                        className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                      >
                        Chat
                      </Link>

                      {b.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(b._id, 'approved')}
                            className="rounded-xl border border-green-600 bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(b._id, 'declined')}
                            className="rounded-xl border border-red-600 bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                          >
                            Decline
                          </button>
                        </>
                      ) : null}

                      {b.status === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(b._id, 'completed')}
                          className="rounded-xl border bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Mark completed
                        </button>
                      ) : null}

                      <Link
                        to={`/account/owner/bookings`}
                        className="rounded-xl border bg-gray-100 px-3 py-2 text-sm font-semibold"
                      >
                        Owner requests
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
