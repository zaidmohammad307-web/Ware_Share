// client/src/pages/LaunchPage.jsx
// Standalone shareable pre-launch page: showcases the app and collects
// email / phone signups into the waitlist so we can contact them at launch.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import axiosInstance from '@/utils/axios';
import { usePageTitle } from '@/hooks';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

/* ---------------------------------------------
   Interactive demo panels (mock app screens)
--------------------------------------------- */

// Real warehouse photo (Unsplash CDN, free license). If it ever fails to
// load we fall back to a branded gradient block.
const WAREHOUSE_PHOTO =
  'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=70&auto=format';

const WarehousePhoto = ({ className }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-secondary to-blue-100 ${className}`}>
    <img
      src={WAREHOUSE_PHOTO}
      alt="Warehouse with pallet racking"
      loading="lazy"
      className="h-full w-full object-cover"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  </div>
);

const DemoSearch = () => (
  <div>
    {/* Filter chips */}
    <div className="mb-3 flex flex-wrap gap-2">
      {['Amman', 'Cold storage', '400+ m²', 'CCTV ✓'].map((f) => (
        <span
          key={f}
          className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary"
        >
          {f}
        </span>
      ))}
    </div>

    {/* Listing card mock */}
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <WarehousePhoto className="h-32 w-full" />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Cold storage — Airport Rd, Amman
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              ⭐ 4.9 · ✅ Verified host · 520 m² available
            </div>
          </div>
          <div className="whitespace-nowrap text-sm font-bold text-primary">
            JOD 32<span className="text-xs font-normal text-gray-500">/day</span>
          </div>
        </div>
        <div className="mt-2 flex gap-2 text-[11px] text-gray-600">
          <span className="rounded-full bg-gray-100 px-2 py-0.5">CCTV</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">Forklift</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">Food-grade ✓</span>
        </div>
      </div>
    </div>
  </div>
);

const DemoMap = () => (
  <div>
    <div className="relative h-56 overflow-hidden rounded-2xl border shadow-sm">
      {/* Stylized map */}
      <svg viewBox="0 0 320 224" className="h-full w-full bg-[#EAF2FB]">
        {/* City blocks */}
        <g fill="#DDE9F7">
          <rect x="10" y="12" width="80" height="56" rx="6" />
          <rect x="110" y="12" width="90" height="40" rx="6" />
          <rect x="220" y="12" width="88" height="70" rx="6" />
          <rect x="10" y="90" width="60" height="60" rx="6" />
          <rect x="90" y="72" width="80" height="78" rx="6" />
          <rect x="190" y="102" width="70" height="48" rx="6" />
          <rect x="10" y="170" width="120" height="42" rx="6" />
          <rect x="150" y="170" width="158" height="42" rx="6" />
        </g>
        {/* Roads */}
        <g stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round">
          <path d="M0 80 H320" />
          <path d="M0 160 H320" />
          <path d="M80 0 V224" />
          <path d="M180 0 V224" />
          <path d="M270 0 V100" />
        </g>
      </svg>

      {/* Price pins */}
      <div className="absolute left-[12%] top-[22%] rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-800 shadow-md">
        JOD 18
      </div>
      <div className="absolute left-[52%] top-[50%] -translate-x-1/2 -translate-y-1/2 scale-110 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lg ring-4 ring-primary/20">
        JOD 32
      </div>
      <div className="absolute right-[10%] top-[18%] rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-800 shadow-md">
        JOD 25
      </div>

      {/* You are here */}
      <div className="absolute bottom-[16%] left-[30%]">
        <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow" />
      </div>

      {/* Selected listing preview over the map */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 rounded-xl bg-white/95 p-2 shadow-lg backdrop-blur">
        <WarehousePhoto className="h-12 w-16 flex-shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-gray-900">
            Cold storage — Airport Rd
          </div>
          <div className="text-[11px] text-gray-500">2.4 km away · ⭐ 4.9</div>
        </div>
        <div className="whitespace-nowrap text-xs font-bold text-primary">
          JOD 32/day
        </div>
      </div>
    </div>
  </div>
);

const DemoChat = () => (
  <div className="space-y-3">
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white shadow-sm">
        Hi! Is the space free next week? I have ~200 pallets of packaged food.
      </div>
    </div>
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-2.5 text-sm text-gray-800 shadow-sm">
        Yes — 300 pallet spots open, food-grade certified. Send your request
        and I'll approve it today. 👍
      </div>
    </div>
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white shadow-sm">
        Perfect, sending it now!
      </div>
    </div>
    <div className="text-center text-[11px] text-gray-400">
      Chat directly with hosts — before you pay anything
    </div>
  </div>
);

const DemoBook = () => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between">
      <div className="text-sm font-semibold text-gray-900">Your booking</div>
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
        ✓ Approved
      </span>
    </div>

    {/* Mini calendar strip */}
    <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px]">
      {['18', '19', '20', '21', '22', '23', '24'].map((d) => {
        const selected = Number(d) >= 20 && Number(d) <= 23;
        return (
          <div
            key={d}
            className={`rounded-lg py-1.5 font-semibold ${
              selected
                ? 'bg-primary text-white'
                : d === '19'
                ? 'bg-gray-100 text-gray-300 line-through'
                : 'bg-gray-50 text-gray-600'
            }`}
          >
            {d}
          </div>
        );
      })}
    </div>
    <div className="mb-3 text-center text-[11px] text-gray-400">
      Jul 20 → Aug 3 · booked in real time, unavailable dates greyed out
    </div>

    {/* Status flow */}
    <div className="flex items-center justify-between">
      {[
        { label: 'Requested', state: 'done' },
        { label: 'Approved', state: 'done' },
        { label: 'Check-in', state: 'next' },
      ].map((step, i) => (
        <React.Fragment key={step.label}>
          {i > 0 && (
            <div
              className={`mx-1 h-0.5 flex-1 rounded ${
                step.state === 'done' ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          )}
          <div className="flex flex-col items-center gap-1">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                step.state === 'done'
                  ? 'bg-primary text-white'
                  : 'border-2 border-gray-300 bg-white text-gray-400'
              }`}
            >
              {step.state === 'done' ? '✓' : i + 1}
            </span>
            <span className="text-[10px] font-medium text-gray-600">
              {step.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>

    <div className="mt-3 flex justify-between border-t pt-2 text-sm font-bold text-gray-900">
      <span>14 days × JOD 32</span>
      <span className="text-primary">JOD 448</span>
    </div>
  </div>
);

const DemoEarn = () => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
      Your hosting this month
    </div>
    <div className="text-3xl font-bold text-gray-900">
      JOD 1,240
      <span className="ml-2 text-sm font-semibold text-emerald-600">+18%</span>
    </div>

    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>Space utilization</span>
        <span className="font-semibold text-gray-700">78%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full w-[78%] rounded-full bg-primary" />
      </div>
    </div>

    <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5">
      <span className="text-sm font-medium text-gray-800">
        🔔 3 new booking requests
      </span>
      <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
        Review
      </span>
    </div>
  </div>
);

const DEMO_TABS = [
  {
    key: 'search',
    icon: '🔍',
    label: 'Find space',
    caption:
      'Filter by city, storage type, area, price, and safety features — every listing shows exactly what the facility offers.',
    Panel: DemoSearch,
  },
  {
    key: 'map',
    icon: '🗺️',
    label: 'Map view',
    caption:
      'See every warehouse around you with live day rates on the map — tap a pin to preview the space and its distance from you.',
    Panel: DemoMap,
  },
  {
    key: 'chat',
    icon: '💬',
    label: 'Chat first',
    caption:
      'Message hosts before booking. Agree the details, then send your request — you only pay after approval.',
    Panel: DemoChat,
  },
  {
    key: 'book',
    icon: '📅',
    label: 'Easy booking',
    caption:
      'Pick your dates on a live availability calendar, send the request, and track it from approval to check-in — clear day-rate pricing, no surprises.',
    Panel: DemoBook,
  },
  {
    key: 'earn',
    icon: '💰',
    label: 'Earn as a host',
    caption:
      'List spare capacity, set your price per day, block dates you need, and approve only the bookings that fit.',
    Panel: DemoEarn,
  },
];

const ROTATE_MS = 5000;

const LaunchPage = () => {
  usePageTitle('Coming soon');

  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const [tab, setTab] = useState(0);
  const pausedRef = useRef(false);

  // Auto-rotate the demo until the visitor interacts with it
  useEffect(() => {
    const t = setInterval(() => {
      if (!pausedRef.current) {
        setTab((prev) => (prev + 1) % DEMO_TABS.length);
      }
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const pickTab = (i) => {
    pausedRef.current = true;
    setTab(i);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const value = contact.trim();
    const isEmail = EMAIL_RE.test(value);
    const isPhone = !isEmail && PHONE_RE.test(value);

    if (!isEmail && !isPhone) {
      setError('Please enter a valid email address or phone number.');
      return;
    }

    try {
      setSubmitting(true);
      await axiosInstance.post('/waitlist', {
        email: isEmail ? value : null,
        phone: isPhone ? value : null,
        name: name.trim() || null,
        source: 'launch-page',
      });
      setDone(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const ActivePanel = DEMO_TABS[tab].Panel;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-secondary/40 to-secondary text-[#333]">
      <style>{`
        @keyframes ws-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <img
            src="/wareshare-logo-full.png"
            alt="WareShare"
            className="h-12 w-auto"
          />
          <Link
            to="/"
            className="rounded-full border border-primary/30 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-secondary"
          >
            Browse the beta →
          </Link>
        </div>

        {/* Hero */}
        <div className="mt-12 text-center sm:mt-16">
          <img
            src="/wareshare-logo-full.png"
            alt="WareShare"
            className="mx-auto h-32 w-auto sm:h-40"
          />
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Launching soon
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
            Warehouse space,{' '}
            <span className="text-primary">booked like a hotel room.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-600">
            The marketplace for on-demand storage. Find verified warehouse
            space by the day — or earn from the space you're not using.
          </p>
        </div>

        {/* Signup form */}
        <div className="mx-auto mt-8 w-full max-w-md">
          {done ? (
            <div className="rounded-2xl border border-primary/20 bg-white p-6 text-center shadow-sm">
              <div className="text-3xl">🎉</div>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">
                You're on the list!
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                We'll contact you the moment WareShare launches in your city.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Email or phone number"
                  className="w-full flex-1 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1565C0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Joining…' : 'Notify me'}
                </button>
              </div>
              {error && (
                <p className="text-center text-sm font-medium text-red-600">
                  {error}
                </p>
              )}
              <p className="text-center text-xs text-gray-500">
                No spam — one message when we launch.
              </p>
            </form>
          )}
        </div>

        {/* Interactive demo */}
        <div className="mt-16">
          <h2 className="text-center text-xl font-bold text-gray-900">
            See how it works
          </h2>

          {/* Tabs */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {DEMO_TABS.map((t, i) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickTab(i)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  i === tab
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-gray-700 shadow-sm hover:bg-secondary'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Progress dots */}
          <div className="mt-3 flex justify-center gap-1.5">
            {DEMO_TABS.map((t, i) => (
              <span
                key={t.key}
                className={`h-1.5 rounded-full transition-all ${
                  i === tab ? 'w-6 bg-primary' : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Demo stage */}
          <div className="mx-auto mt-6 max-w-md">
            <div
              key={DEMO_TABS[tab].key}
              style={{ animation: 'ws-fade-up 0.4s ease' }}
            >
              {/* Phone-style frame */}
              <div className="rounded-[28px] border-4 border-gray-900/90 bg-white p-4 shadow-xl">
                <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-gray-200" />
                <ActivePanel />
              </div>
              <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-6 text-gray-600">
                {DEMO_TABS[tab].caption}
              </p>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mx-auto mt-16 grid w-full max-w-2xl grid-cols-3 gap-3 text-center">
          {[
            ['By the day', 'No long leases'],
            ['Verified', 'Every host checked'],
            ['Insured', 'Optional coverage'],
          ].map(([big, small]) => (
            <div
              key={big}
              className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
            >
              <div className="text-sm font-bold text-primary sm:text-base">
                {big}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">
                {small}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-auto pt-14 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} WareShare — storage, shared.
        </div>
      </div>
    </div>
  );
};

export default LaunchPage;
