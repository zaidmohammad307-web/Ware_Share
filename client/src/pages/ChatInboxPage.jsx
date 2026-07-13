import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '@/utils/axios';
import AccountNav from '@/components/ui/AccountNav';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/hooks';

const ChatInboxPage = () => {
  const { user } = useAuth();
  const myId = user?._id || user?.id;

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInbox = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/chat/inbox');
      setThreads(data.threads || []);
    } catch (e) {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const formatWhen = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  };

  const getThreadLink = (t) => {
    if (t.type === 'booking' && t.bookingId) {
      return `/account/bookings/${t.bookingId}/chat`;
    }

    // place inquiry
    if (t.type === 'place' && t.placeId) {
      const isHost = t.place?.owner && myId && String(t.place.owner) === String(myId);
      if (isHost) {
        // host must supply renterId in query param
        return `/account/chats/place/${t.placeId}?renterId=${encodeURIComponent(t.renterId || '')}`;
      }
      return `/account/chats/place/${t.placeId}`;
    }

    return '#';
  };

  return (
    <div>
      <AccountNav />

      <div className="mx-auto max-w-4xl px-4 pb-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Chats</h1>
          <button
            type="button"
            onClick={loadInbox}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {loading && <Spinner />}

        {!loading && threads.length === 0 && (
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600 shadow-sm">
            No conversations yet.
          </div>
        )}

        {!loading && threads.length > 0 && (
          <div className="space-y-3">
            {threads.map((t, idx) => {
              const link = getThreadLink(t);
              const title = t.place?.title || 'Conversation';
              const address = t.place?.address || '';
              const lastText = t.lastMessage?.text || '';
              const when = formatWhen(t.lastMessage?.createdAt);

              const badge =
                t.type === 'booking'
                  ? { label: 'Booking', cls: 'bg-blue-50 text-blue-700' }
                  : { label: 'Place', cls: 'bg-emerald-50 text-emerald-700' };

              const unread = t.unreadCount || 0;

              return (
                <Link
                  key={`${t.type}-${t.placeId || ''}-${t.bookingId || ''}-${t.renterId || ''}-${idx}`}
                  to={link}
                  className="block overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex gap-3 p-4">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {t.place?.photo ? (
                        <img src={t.place.photo} alt={title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">
                          {badge.label}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <h2 className="truncate text-sm font-semibold text-gray-900">{title}</h2>
                          </div>
                          {address && <div className="mt-1 truncate text-xs text-gray-500">{address}</div>}
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          {when && <div className="text-xs text-gray-500">{when}</div>}
                          {unread > 0 && (
                            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`mt-2 line-clamp-2 text-sm ${
                          unread > 0 ? 'font-semibold text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {lastText}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                        {t.type === 'place' && t.placeId && (
                          <span className="rounded-full bg-gray-50 px-2 py-0.5">
                            Inquiry chat
                          </span>
                        )}
                        {t.type === 'booking' && t.bookingId && (
                          <span className="rounded-full bg-gray-50 px-2 py-0.5">
                            Booking chat
                          </span>
                        )}
                        {t.renterId && (
                          <span className="rounded-full bg-gray-50 px-2 py-0.5">
                            Renter: {String(t.renterId).slice(0, 6)}…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInboxPage;
