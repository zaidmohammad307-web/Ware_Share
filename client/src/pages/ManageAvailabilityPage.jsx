// client/src/pages/ManageAvailabilityPage.jsx
// Host tool: block / unblock dates on a listing so renters cannot book them.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import axiosInstance from '@/utils/axios';
import AccountNav from '@/components/ui/AccountNav';
import Spinner from '@/components/ui/Spinner';
import { usePageTitle } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_AR = ['إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'];

const STR = {
  EN: {
    weekdays: WEEKDAYS_EN,
    title: 'Availability',
    warehouse: 'Warehouse',
    instructions:
      'Tap dates to block or unblock them. Blocked dates cannot be booked by renters. Days with existing bookings are locked.',
    blockedByYou: 'Blocked by you',
    booked: 'Booked',
    blockedTip: 'Blocked — tap to unblock',
    save: 'Save availability',
    saving: 'Saving…',
    back: '← Back to your warehouses',
    backPlain: 'Back to your warehouses',
    loadError: 'Failed to load availability. Please try again.',
    saved: 'Availability saved.',
    saveError: 'Could not save availability.',
  },
  AR: {
    weekdays: WEEKDAYS_AR,
    title: 'التوفر',
    warehouse: 'مستودع',
    instructions:
      'اضغط على التواريخ لحجبها أو إلغاء حجبها. التواريخ المحجوبة لا يمكن للمستأجرين حجزها. الأيام التي تحتوي على حجوزات قائمة مقفلة.',
    blockedByYou: 'محجوب من قِبلك',
    booked: 'محجوز',
    blockedTip: 'محجوب — اضغط لإلغاء الحجب',
    save: 'حفظ التوفر',
    saving: 'جارٍ الحفظ…',
    back: '← العودة إلى مستودعاتك',
    backPlain: 'العودة إلى مستودعاتك',
    loadError: 'تعذّر تحميل التوفر. يرجى المحاولة مرة أخرى.',
    saved: 'تم حفظ التوفر.',
    saveError: 'تعذّر حفظ التوفر.',
  },
};

const toYMD = (d) => format(d, 'yyyy-MM-dd');

const ManageAvailabilityPage = () => {
  usePageTitle('Manage availability');
  const { lang } = usePrefs();
  const L = STR[lang] || STR.EN;

  const { id } = useParams();

  const [title, setTitle] = useState('');
  const [blocked, setBlocked] = useState(new Set());
  const [booked, setBooked] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const { data } = await axiosInstance.get(`/places/${id}/blocked-dates`);
        setTitle(data.title || '');
        setBlocked(new Set(data.blockedDates || []));
        setBooked(new Set(data.bookedDates || []));
      } catch (err) {
        setLoadError(
          err?.response?.data?.message || L.loadError
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const todayYMD = toYMD(new Date());

  const toggleDay = (day) => {
    const ymd = toYMD(day);
    if (booked.has(ymd)) return; // booked days can't be unblocked
    if (ymd < todayYMD) return; // past days are pointless to block

    setBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(ymd)) {
        next.delete(ymd);
      } else {
        next.add(ymd);
      }
      return next;
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      await axiosInstance.put(`/places/${id}/blocked-dates`, {
        dates: Array.from(blocked),
      });
      toast.success(L.saved);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || L.saveError
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <AccountNav />
        <Spinner />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AccountNav />
        <div className="mx-auto max-w-2xl px-4">
          <p className="text-red-600">{loadError}</p>
          <Link to="/account/places" className="text-sm text-primary underline">
            {L.backPlain}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AccountNav />

      <div className="mx-auto max-w-2xl px-4 pb-10">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            {L.title} — {title || L.warehouse}
          </h1>
        </div>
        <p className="mb-4 text-sm text-gray-500">{L.instructions}</p>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          {/* Month switcher */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
            >
              ←
            </button>
            <div className="text-sm font-semibold text-gray-900">
              {format(month, 'MMMM yyyy')}
            </div>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
            >
              →
            </button>
          </div>

          {/* Weekday header */}
          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-gray-500">
            {L.weekdays.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const ymd = toYMD(day);
              const inMonth = isSameMonth(day, month);
              const isBooked = booked.has(ymd);
              const isBlocked = blocked.has(ymd);
              const isPast = ymd < todayYMD;

              let cls =
                'flex h-10 items-center justify-center rounded-lg text-sm transition select-none';

              if (!inMonth) {
                cls += ' text-gray-300';
              } else if (isBooked) {
                cls += ' bg-blue-100 text-blue-800 cursor-not-allowed';
              } else if (isBlocked) {
                cls += ' bg-red-500 font-semibold text-white cursor-pointer';
              } else if (isPast) {
                cls += ' text-gray-400 cursor-not-allowed';
              } else {
                cls += ' hover:bg-gray-100 cursor-pointer';
              }

              return (
                <div
                  key={ymd}
                  className={cls}
                  onClick={() => inMonth && toggleDay(day)}
                  title={
                    isBooked ? L.booked : isBlocked ? L.blockedTip : ''
                  }
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-red-500" />
              <span>{L.blockedByYou}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-blue-100" />
              <span>{L.booked}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link
            to="/account/places"
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            {L.back}
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? L.saving : L.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageAvailabilityPage;
