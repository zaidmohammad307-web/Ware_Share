// client/src/components/ui/AvailabilityCalendar.jsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '@/utils/axios';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';

const parseBlockedDates = (data) => {
  // be flexible with API shape
  const raw =
    data.blockedDates ||
    data.blocked ||
    data.dates ||
    data.unavailableDates ||
    [];

  return raw
    .map((d) => {
      try {
        if (!d) return null;
        // handle Date, ISO string or "YYYY-MM-DD"
        if (d instanceof Date) return startOfDay(d);
        return startOfDay(parseISO(String(d)));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

const AvailabilityCalendar = ({ placeId }) => {
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await axiosInstance.get(
          `/bookings/availability/${placeId}`
        );
        setBlockedDates(parseBlockedDates(data || {}));
      } catch (err) {
        console.error('availability error', err);
        setError('Could not load availability.');
      } finally {
        setLoading(false);
      }
    };

    if (placeId) {
      load();
    }
  }, [placeId]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const today = startOfDay(new Date());

  const isBlocked = (day) =>
    blockedDates.some((d) => isSameDay(d, day));

  const isToday = (day) => isSameDay(day, today);

  return (
    <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">
            Availability calendar
          </h2>
          <p className="text-[11px] text-gray-500">
            See which days are blocked for this warehouse.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() =>
              setCurrentMonth((prev) => subMonths(prev, 1))
            }
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            ‹
          </button>
          <span className="min-w-[110px] text-center text-xs font-semibold text-gray-800">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() =>
              setCurrentMonth((prev) => addMonths(prev, 1))
            }
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            ›
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="text-xs">
        {/* Weekday header */}
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-gray-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
            (d) => (
              <div key={d}>{d}</div>
            )
          )}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inCurrentMonth =
              day.getMonth() === currentMonth.getMonth();
            const blocked = isBlocked(day);
            const todayFlag = isToday(day);

            let classes =
              'relative flex h-8 w-8 items-center justify-center rounded-full text-[11px]';

            if (!inCurrentMonth) {
              classes += ' text-gray-300';
            } else if (blocked) {
              classes +=
                ' bg-red-100 text-red-700 line-through font-semibold';
            } else {
              classes +=
                ' bg-emerald-50 text-emerald-700 font-medium';
            }

            if (todayFlag && !blocked && inCurrentMonth) {
              classes += ' ring-2 ring-primary ring-offset-1';
            }

            return (
              <div
                key={day.toISOString()}
                className="flex items-center justify-center"
              >
                <div className={classes}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend + info */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-emerald-50 border border-emerald-200" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-red-100 border border-red-200" />
          <span>Blocked / booked</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full border border-primary" />
          <span>Today</span>
        </div>
      </div>

      {loading && (
        <p className="mt-2 text-[11px] text-gray-500">
          Loading availability…
        </p>
      )}

      {!loading && error && (
        <p className="mt-2 text-[11px] text-red-500">{error}</p>
      )}

      {!loading && !error && blockedDates.length === 0 && (
        <p className="mt-2 text-[11px] text-gray-500">
          No blocked dates yet. Most days are available to book.
        </p>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
