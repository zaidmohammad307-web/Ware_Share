// client/src/components/ui/ChatBox.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import axiosInstance from '@/utils/axios';
import { getSocket } from '@/utils/socket';
import { useAuth } from '@/hooks';

const normalizeId = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    const inner = v?._id || v?.id;
    if (inner) return normalizeId(inner);
  }
  const s = String(v).trim();
  if (!s) return null;
  if (s === 'undefined' || s === 'null') return null;
  return s;
};

// Helper to avoid duplicate messages in UI
function pushUnique(prev, msg) {
  if (!msg?._id) return prev;
  if (prev.some((m) => m?._id === msg._id)) return prev;

  const senderId = msg?.sender?._id || msg?.sender;
  const filtered = prev.filter((m) => {
    if (!m?._pending) return true;
    const pendingSenderId = m?.sender?._id || m?.sender;
    return !(
      String(pendingSenderId) === String(senderId) &&
      String(m?.text || '').trim() === String(msg?.text || '').trim()
    );
  });

  return [...filtered, msg];
}

const ChatBox = ({ bookingId = null, placeId = null, renterId = null }) => {
  const { user } = useAuth();
  const myId = user?._id;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');

  // For profile links
  const [hostId, setHostId] = useState(null);
  const [renterIdResolved, setRenterIdResolved] = useState(null);

  const bottomRef = useRef(null);

  const mode = useMemo(() => {
    if (bookingId) return 'booking';
    if (placeId) return 'place';
    return null;
  }, [bookingId, placeId]);

  const socket = useMemo(() => getSocket(), []);

  // Load history + IDs for profile links
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        if (!mode) {
          setMessages([]);
          setHostId(null);
          setRenterIdResolved(null);
          return;
        }

        if (mode === 'booking') {
          const { data } = await axiosInstance.get(`/chat/booking/${bookingId}`);
          setMessages(data.messages || []);
          setHostId(normalizeId(data.hostId));
          setRenterIdResolved(normalizeId(data.renterId));
          return;
        }

        // place inquiry chat
        const rid = normalizeId(renterId);
        const url = rid
          ? `/chat/place/${placeId}?renterId=${rid}`
          : `/chat/place/${placeId}`;

        const { data } = await axiosInstance.get(url);
        setMessages(data.messages || []);
        setHostId(normalizeId(data.hostId));
        setRenterIdResolved(normalizeId(data.renterId) || rid || null);
      } catch (e) {
        setMessages([]);
        setHostId(null);
        setRenterIdResolved(null);
      } finally {
        setLoading(false);
      }
    };

    if ((mode === 'booking' && bookingId) || (mode === 'place' && placeId)) load();
  }, [mode, bookingId, placeId, renterId]);

  // Join + listen
  useEffect(() => {
    if (!mode) return;

    const onNewMessage = (msg) => {
      setMessages((prev) => pushUnique(prev, msg));
    };

    socket.on('new_message', onNewMessage);

    if (mode === 'booking' && bookingId) {
      socket.emit('join_booking', { bookingId });
    }

    if (mode === 'place' && placeId) {
      const rid = normalizeId(renterId);
      socket.emit('join_place', { placeId, renterId: rid || null });
    }

    return () => {
      socket.off('new_message', onNewMessage);
      if (mode === 'booking' && bookingId) {
        socket.emit('leave_booking', { bookingId });
      }
      if (mode === 'place' && placeId) {
        socket.emit('leave_place', { placeId, renterId: normalizeId(renterId) || null });
      }
    };
  }, [socket, mode, bookingId, placeId, renterId]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const trimmed = String(text || '').trim();
    if (!trimmed || !mode) return;

    // optimistic UI
    const optimistic = {
      _id: `pending-${Date.now()}`,
      _pending: true,
      text: trimmed,
      sender: { _id: myId, name: user?.name || 'Me' },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    if (mode === 'booking') {
      socket.emit('send_message', { bookingId, text: trimmed });
    } else {
      socket.emit('send_place_message', {
        placeId,
        renterId: normalizeId(renterId) || null,
        text: trimmed,
      });
    }

    setText('');
  };

  // Build the “View profile” link for the OTHER side
  const otherProfileLink = useMemo(() => {
    const me = normalizeId(myId);
    const hid = normalizeId(hostId);
    const rid = normalizeId(renterIdResolved);

    if (!me) return null;

    if (mode === 'booking') {
      if (!hid || !rid) return null;
      const otherIsHost = String(me) === String(rid);
      return otherIsHost
        ? { to: `/host/${hid}`, label: 'View host profile' }
        : { to: `/renter/${rid}`, label: 'View renter profile' };
    }

    if (mode === 'place') {
      if (!hid) return null;

      const iAmHost = String(me) === String(hid);

      if (iAmHost) {
        if (!rid) return null;
        return { to: `/renter/${rid}`, label: 'View renter profile' };
      }

      return { to: `/host/${hid}`, label: 'View host profile' };
    }

    return null;
  }, [mode, myId, hostId, renterIdResolved]);

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {mode === 'booking' ? 'Booking chat' : 'Place inquiry chat'}
          </h2>
          <p className="text-sm text-gray-500">
            {mode === 'booking'
              ? 'Chat between renter and host for this booking.'
              : 'Chat with the host before booking.'}
          </p>
        </div>

        {otherProfileLink && (
          <Link
            to={otherProfileLink.to}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            {otherProfileLink.label}
          </Link>
        )}
      </div>

      <div className="h-[460px] overflow-y-auto p-4">
        {loading && <p className="text-sm text-gray-500">Loading messages...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-500">No messages yet. Say hello.</p>
        )}

        <div className="space-y-3">
          {messages.map((m) => {
            const senderId = normalizeId(m?.sender?._id || m?.sender);
            const mine =
              normalizeId(myId) &&
              senderId &&
              String(senderId) === String(normalizeId(myId));

            return (
              <div
                key={m._id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                    mine ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900',
                    m._pending ? 'opacity-70' : '',
                  ].join(' ')}
                >
                  <div className="whitespace-pre-line">{m.text}</div>
                  <div
                    className={[
                      'mt-1 text-[10px]',
                      mine ? 'text-white/80' : 'text-gray-500',
                    ].join(' ')}
                  >
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex gap-2 border-t p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          className="w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="Type your message and press Enter"
        />
        <button
          type="button"
          onClick={send}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
