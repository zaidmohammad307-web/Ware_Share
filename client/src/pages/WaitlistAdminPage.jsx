// client/src/pages/WaitlistAdminPage.jsx
// Admin-only: view everyone who signed up on the launch page.
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import AccountNav from '@/components/ui/AccountNav';
import Spinner from '@/components/ui/Spinner';
import { usePageTitle } from '@/hooks';

const WaitlistAdminPage = () => {
  usePageTitle('Waitlist signups');

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get('/waitlist');
        setEntries(data.entries || []);
      } catch (err) {
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message;
        setError(
          status === 403
            ? 'Admin access required — make sure ADMIN_EMAIL on the server matches your login email.'
            : `Failed to load waitlist${status ? ` (HTTP ${status})` : ''}${serverMsg ? `: ${serverMsg}` : '.'}`
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const copyAll = async () => {
    const lines = entries.map((e) =>
      [
        e.name || '',
        e.email || '',
        e.phone || '',
        e.createdAt ? new Date(e.createdAt).toISOString() : '',
      ].join(',')
    );
    const csv = ['name,email,phone,signed_up_at', ...lines].join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      toast.success('Copied as CSV to clipboard.');
    } catch (_) {
      toast.error('Could not copy.');
    }
  };

  return (
    <div>
      <AccountNav />

      <div className="mx-auto max-w-4xl px-4 pb-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Waitlist signups</h1>
            {!loading && !error && (
              <p className="text-sm text-gray-500">
                {entries.length} {entries.length === 1 ? 'person' : 'people'} waiting
              </p>
            )}
          </div>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={copyAll}
              className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Copy as CSV
            </button>
          )}
        </div>

        {loading && <Spinner />}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && entries.length === 0 && (
          <div className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
            No signups yet. Share the launch page:{' '}
            <code className="rounded bg-gray-100 px-1">/launch</code>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e._id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">{e.name || '—'}</td>
                    <td className="px-4 py-3">{e.email || '—'}</td>
                    <td className="px-4 py-3">{e.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitlistAdminPage;
