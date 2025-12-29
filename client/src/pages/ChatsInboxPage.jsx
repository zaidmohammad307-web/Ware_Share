import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountNav from './client/src/components/ui/AccountNav';
import axiosInstance from './client/src/utils/axios';

const ChatInboxPage = () => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get('/chat/inbox');
        setThreads(data.threads || []);
      } catch (e) {
        console.log('Inbox error:', e);
        setThreads([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <AccountNav />

      <div className="mx-auto max-w-5xl px-4 pb-10">
        <h1 className="mb-4 text-2xl font-semibold">Chats</h1>

        {loading && <p className="text-sm text-gray-500">Loading...</p>}

        {!loading && threads.length === 0 && (
          <p className="text-sm text-gray-500">No chats yet.</p>
        )}

        <div className="grid gap-3">
          {threads.map((t) => {
            const isBooking = t.type === 'booking';
            const title = t.place?.title || 'Chat';
            const subtitle = isBooking
              ? `Booking chat • Status: ${t.booking?.status || '—'}`
              : 'Place inquiry chat';

            const to = isBooking
              ? `/account/chats/booking/${t.bookingId}`
              : `/account/chats/place/${t.placeId}?renterId=${t.renterId}`;

            return (
              <Link
                key={`${t.type}-${t.bookingId || t.placeId}-${t.renterId}`}
                to={to}
                className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition hover:shadow-md"
              >
                <div className="h-12 w-12 overflow-hidden rounded-xl bg-gray-100">
                  {t.place?.photo ? (
                    <img
                      src={t.place.photo}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{title}</div>
                    <div className="text-xs text-gray-500">
                      {t.lastMessage?.createdAt
                        ? new Date(t.lastMessage.createdAt).toLocaleString()
                        : ''}
                    </div>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>
                  <div className="mt-1 line-clamp-1 text-sm text-gray-700">
                    {t.lastMessage?.text || ''}
                  </div>
                </div>

                <div className="text-xs font-semibold text-primary">Open</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatInboxPage;
