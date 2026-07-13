// client/src/pages/LaunchPage.jsx
// Standalone shareable pre-launch page: showcases the app and collects
// email / phone signups into the waitlist so we can contact them at launch.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import axiosInstance from '@/utils/axios';
import { usePageTitle } from '@/hooks';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

const FEATURES = [
  {
    icon: '🏭',
    title: 'Storage on demand',
    text: 'Rent verified warehouse space by the day — dry, cold, frozen, bonded, or fulfillment. No year-long leases.',
  },
  {
    icon: '🛡️',
    title: 'Verified & insured',
    text: 'Every host is identity-verified. Add insurance to any booking and see CCTV, guards, and fire systems before you book.',
  },
  {
    icon: '💬',
    title: 'Chat before you book',
    text: 'Message hosts directly, agree the details, then send your booking request. You only pay after approval.',
  },
  {
    icon: '💰',
    title: 'Earn from empty space',
    text: 'Own a warehouse? List spare capacity, set your daily price, and approve the bookings that fit.',
  },
];

const LaunchPage = () => {
  usePageTitle('Coming soon');

  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2137] via-[#123a5c] to-[#1976D2] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
        {/* Brand */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight">
            Ware<span className="text-sky-300">Share</span>
          </div>
          <Link
            to="/"
            className="rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10"
          >
            Browse the beta →
          </Link>
        </div>

        {/* Hero */}
        <div className="mt-16 text-center sm:mt-24">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">
            Launching soon
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Warehouse space, booked like a hotel room.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
            WareShare is the marketplace for on-demand storage. Find verified
            warehouse space by the day — or earn from the space you are not
            using.
          </p>
        </div>

        {/* Signup form */}
        <div className="mx-auto mt-10 w-full max-w-md">
          {done ? (
            <div className="rounded-2xl bg-white/10 p-6 text-center backdrop-blur">
              <div className="text-3xl">🎉</div>
              <h2 className="mt-2 text-lg font-semibold">You're on the list!</h2>
              <p className="mt-1 text-sm text-white/80">
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
                className="w-full rounded-full border-0 px-5 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none ring-2 ring-transparent focus:ring-sky-300"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Email or phone number"
                  className="w-full flex-1 rounded-full border-0 px-5 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none ring-2 ring-transparent focus:ring-sky-300"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-sky-400 px-8 py-3 text-sm font-bold text-[#0d2137] transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Joining…' : 'Notify me'}
                </button>
              </div>
              {error && (
                <p className="text-center text-sm font-medium text-red-300">
                  {error}
                </p>
              )}
              <p className="text-center text-xs text-white/60">
                No spam — one message when we launch.
              </p>
            </form>
          )}
        </div>

        {/* Feature showcase */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-white/10 p-5 backdrop-blur transition hover:bg-white/15"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-2 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-6 text-white/75">{f.text}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-auto pt-16 text-center text-xs text-white/50">
          © {new Date().getFullYear()} WareShare — storage, shared.
        </div>
      </div>
    </div>
  );
};

export default LaunchPage;
