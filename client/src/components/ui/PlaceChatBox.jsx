import React, { useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '@/utils/axios';
import { getSocket } from '@/utils/socket';

const PlaceChatBox = ({ placeId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get(`/chat/place/${placeId}`);
        setMessages(data.messages || []);
      } catch (e) {
        // silently fail; UI shows "No messages yet"
      } finally {
        setLoading(false);
      }
    };

    if (placeId) fetchHistory();
  }, [placeId]);

  useEffect(() => {
    if (!placeId) return;

    socket.emit('join_place', { placeId });

    const onNew = (msg) => setMessages((prev) => [...prev, msg]);
    socket.on('new_message', onNew);

    return () => {
      socket.off('new_message', onNew);
    };
  }, [socket, placeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit('send_place_message', { placeId, text: trimmed });
    setText('');
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Chat with the host</h2>
        <p className="text-sm text-gray-500">
          Ask questions before booking. The host can reply here.
        </p>
      </div>

      <div className="h-[420px] overflow-y-auto p-4">
        {loading && <p className="text-sm text-gray-500">Loading messages...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-500">No messages yet. Start the conversation.</p>
        )}

        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m._id} className="rounded-xl bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{m.sender?.name || 'User'}</span>
                <span className="text-xs text-gray-500">
                  {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-800">{m.text}</p>
            </div>
          ))}
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

export default PlaceChatBox;
