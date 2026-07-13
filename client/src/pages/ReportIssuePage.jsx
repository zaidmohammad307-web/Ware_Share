// client/src/pages/ReportIssuePage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import { useAuth, usePageTitle } from '@/hooks';

const CATEGORIES = [
  { value: 'bug', label: 'App problem / bug' },
  { value: 'booking', label: 'Booking issue' },
  { value: 'payment', label: 'Payment issue' },
  { value: 'safety', label: 'Safety concern' },
  { value: 'listing', label: 'Problem with a listing' },
  { value: 'other', label: 'Something else' },
];

const ReportIssuePage = () => {
  usePageTitle('Report an issue');

  const { user } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    category: 'other',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const { data } = await axiosInstance.post('/support/report', form);
      toast.success(data.message || 'Report sent.');
      setDone(true);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || 'Could not send your report. Please try again.'
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
            Report received
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Thanks for letting us know. We will get back to you at{' '}
            <strong>{form.email}</strong>.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-24 px-4 pb-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-3xl font-semibold text-gray-900">Report an issue</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tell us what went wrong — a booking, a listing, the app itself, or a
          safety concern. We reply by email.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Your name
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Email <span className="text-red-500">*</span>
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
              Category
            </label>
            <select
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">
              What happened? <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              minLength={10}
              rows={6}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Describe the issue with as much detail as you can — include booking or listing links if relevant."
              value={form.message}
              onChange={(e) => setField('message', e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssuePage;
