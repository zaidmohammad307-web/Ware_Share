// client/src/pages/PlacePage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import BookingWidget from '../components/ui/BookingWidget';
import PlaceMap from '../components/ui/PlaceMap';
import PhotoLightbox from '../components/ui/PhotoLightbox';
import { usePageTitle } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const labelMaps = {
  warehouseType: {
    general: 'General storage',
    cold: 'Cold storage',
    frozen: 'Frozen storage',
    dry: 'Dry / ambient storage',
    hazmat: 'Hazardous material storage',
    bonded: 'Bonded warehouse',
    fulfillment: 'Fulfillment center',
    'cross-docking': 'Cross-docking facility',
  },
  equipment: {
    forklift: 'Forklift',
    'electric-pallet-jack': 'Electric pallet jack',
    'manual-pallet-jack': 'Manual pallet jack',
    'reach-truck': 'Reach truck',
    stacker: 'Stacker',
    conveyor: 'Conveyor',
    crane: 'Crane',
    racks: 'Racks / shelves',
    chillers: 'Chillers',
    freezers: 'Freezers',
    ventilation: 'Ventilation',
    'loading-dock': 'Loading docks',
    'dock-leveler': 'Dock leveler',
    ramp: 'Ramp',
    'roll-up-door': 'Roll-up doors',
  },
  truckAccess: {
    '20ft': '20 ft container',
    '40ft': '40 ft container',
    trailer: 'Long trailer / truck',
  },
  services: {
    'inventory-management': 'Inventory management',
    'labeling-packaging': 'Labeling & packaging',
    'picking-packing': 'Picking & packing',
    'quality-inspection': 'Quality inspections',
    transportation: 'Transportation',
    'customs-clearance': 'Customs clearance',
    'cross-docking': 'Cross-docking / transit handling',
  },
  allowedGoods: {
    fmcg: 'FMCG',
    electronics: 'Electronics',
    pharma: 'Pharma',
    clothing: 'Clothing / textiles',
    automotive: 'Automotive',
    industrial: 'Industrial goods',
    food: 'Food items',
    chemicals: 'Chemicals',
  },
};

const renderTagList = (items, map) => {
  if (!items || !items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
        >
          {map[item] || item}
        </span>
      ))}
    </div>
  );
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const formatJOD = (n) => {
  const num = toNum(n);
  if (num === null) return null;
  return `JOD ${num.toLocaleString()}`;
};

const PlacePage = () => {
  const { id } = useParams();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placeError, setPlaceError] = useState(null);

  usePageTitle(place?.title || 'Warehouse');
  const { formatPrice } = usePrefs();
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const handleShare = async () => {
    const url = window.location.href;
    const title = place?.title || 'Warehouse on WareShare';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error('Could not share the link.');
      }
    }
  };

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // 📅 Availability calendar state
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  useEffect(() => {
    const loadPlace = async () => {
      try {
        setLoading(true);
        setPlaceError(null);
        const { data } = await axiosInstance.get(`/places/${id}`);
        setPlace(data.place || data);
      } catch (err) {
        const status = err?.response?.status;
        setPlaceError(
          status === 404
            ? 'This warehouse listing no longer exists.'
            : 'Failed to load warehouse. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    const loadReviews = async () => {
      try {
        setReviewsLoading(true);
        const { data } = await axiosInstance.get(`/reviews/place/${id}`);
        setReviews(data.reviews || []);
      } catch (_) {
        // silently fail; reviews stay empty
      } finally {
        setReviewsLoading(false);
      }
    };

    const loadAvailability = async () => {
      try {
        setAvailabilityLoading(true);
        const { data } = await axiosInstance.get(`/bookings/availability/${id}`);
        setUnavailableDates(data.unavailableDates || []);
      } catch (_) {
        // silently fail; all dates treated as available
      } finally {
        setAvailabilityLoading(false);
      }
    };

    loadPlace();
    loadReviews();
    loadAvailability();
  }, [id]);

  const unavailableSet = useMemo(
    () => new Set(unavailableDates),
    [unavailableDates]
  );

  const avgRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const hasHostRating = useMemo(() => {
    return (
      typeof place?.hostRating === 'number' &&
      (place?.hostRatingCount || 0) > 0
    );
  }, [place]);

  const keyFacts = useMemo(() => {
    if (!place) return [];
    const facts = [];

    const totalArea = toNum(place.totalArea);
    const availableArea = toNum(place.availableArea);
    const palletCapacity = toNum(place.palletCapacity);

    if (totalArea !== null)
      facts.push({ label: 'Total capacity', value: `${totalArea} m²`, icon: '📦' });
    if (availableArea !== null)
      facts.push({ label: 'Available now', value: `${availableArea} m²`, icon: '✅' });
    if (palletCapacity !== null)
      facts.push({
        label: 'Pallet capacity',
        value: `${palletCapacity} pallets`,
        icon: '🧱',
      });

    const minDays = toNum(place.minBookingDays);
    const maxDays = toNum(place.maxBookingDays);

    if (minDays !== null || maxDays !== null) {
      const v =
        minDays !== null && maxDays !== null
          ? `${minDays}–${maxDays} days`
          : minDays !== null
          ? `Min ${minDays} days`
          : `Max ${maxDays} days`;
      facts.push({ label: 'Storage duration', value: v, icon: '🗓️' });
    }

    const primaryPrice = toNum(place.pricePerDay) ?? toNum(place.price) ?? null;

    if (primaryPrice !== null) {
      facts.push({
        label: 'Base price',
        value: `${formatJOD(primaryPrice)} / day`,
        icon: '💰',
      });
    } else {
      facts.push({ label: 'Base price', value: 'Price on request', icon: '💰' });
    }

    if (place.warehouseType?.length) {
      const types = place.warehouseType
        .map((t) => labelMaps.warehouseType[t] || t)
        .slice(0, 2);
      facts.push({
        label: 'Warehouse type',
        value: types.join(', ') + (place.warehouseType.length > 2 ? '…' : ''),
        icon: '🏭',
      });
    }

    const securityLevel = (() => {
      const points =
        (place.CCTV ? 1 : 0) +
        (place.securityGuards ? 1 : 0) +
        (place.fireSuppression ? 1 : 0) +
        (place.smokeDetectors ? 1 : 0);
      if (points >= 3) return 'High';
      if (points >= 1) return 'Standard';
      return 'Basic';
    })();

    facts.push({ label: 'Security level', value: securityLevel, icon: '🛡️' });

    return facts;
  }, [place]);

  const availabilityHint = useMemo(() => {
    if (availabilityLoading) return null;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let availableCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const key = format(d, 'yyyy-MM-dd');
      if (!unavailableSet.has(key)) availableCount += 1;
    }
    return `${availableCount}/7 days available`;
  }, [availabilityLoading, unavailableSet]);

  const badges = useMemo(() => {
    if (!place) return [];
    const arr = [];

    if (place.negotiablePrice) {
      arr.push({ label: 'Negotiable', tone: 'success', icon: '🤝' });
    }

    if (place.insurance) {
      arr.push({ label: 'Insurance available', tone: 'info', icon: '🛡️' });
    }

    const hasPacking =
      Array.isArray(place.services) &&
      (place.services.includes('labeling-packaging') ||
        place.services.includes('picking-packing'));

    const hasDelivery =
      Array.isArray(place.services) && place.services.includes('transportation');

    if (hasPacking)
      arr.push({ label: 'Packing available', tone: 'info', icon: '📦' });
    if (hasDelivery)
      arr.push({ label: 'Delivery available', tone: 'info', icon: '🚚' });

    return arr;
  }, [place]);

  const featuresBullets = useMemo(() => {
    if (!place) return [];

    const bullets = [];

    if (place.CCTV) bullets.push({ icon: '🎥', label: 'CCTV surveillance' });
    if (place.securityGuards)
      bullets.push({ icon: '🛡️', label: '24/7 security guards' });
    if (place.fireSuppression)
      bullets.push({ icon: '🧯', label: 'Fire suppression system' });
    if (place.smokeDetectors)
      bullets.push({ icon: '🔔', label: 'Smoke detectors' });

    const hasTempControl =
      (Array.isArray(place.warehouseType) &&
        (place.warehouseType.includes('cold') ||
          place.warehouseType.includes('frozen'))) ||
      !!place.tempControlFee ||
      (Array.isArray(place.equipment) &&
        (place.equipment.includes('chillers') ||
          place.equipment.includes('freezers')));

    if (hasTempControl)
      bullets.push({ icon: '❄️', label: 'Temperature-controlled capability' });

    if (
      toNum(place.loadingDocks) !== null ||
      (Array.isArray(place.equipment) && place.equipment.includes('loading-dock'))
    ) {
      bullets.push({ icon: '🚪', label: 'Loading docks' });
    }

    if (Array.isArray(place.equipment) && place.equipment.includes('forklift')) {
      bullets.push({ icon: '🏗️', label: 'Forklift available' });
    }

    if (place.rackAvailability) bullets.push({ icon: '🧱', label: 'Racks installed' });
    if (place.parkingAvailable) bullets.push({ icon: '🅿️', label: 'Parking available' });
    if (place.foodGradeCert) bullets.push({ icon: '🥫', label: 'Food-grade certified' });
    if (place.hazmatCert) bullets.push({ icon: '☣️', label: 'Hazmat certified' });
    if (place.ISOcert) bullets.push({ icon: '📜', label: `ISO: ${place.ISOcert}` });

    return bullets.slice(0, 10);
  }, [place]);

  const visibleReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    return showAllReviews ? reviews : reviews.slice(0, 3);
  }, [reviews, showAllReviews]);

  const bestForTags = useMemo(() => {
    const p = place;
    const tags = [];

    if (
      Array.isArray(p?.services) &&
      p.services.includes('fulfillment')
    )
      tags.push('E-commerce fulfillment');

    if (Array.isArray(p?.allowedGoods) && p.allowedGoods.includes('fmcg'))
      tags.push('FMCG storage');
    if (
      Array.isArray(p?.allowedGoods) &&
      p.allowedGoods.includes('electronics')
    )
      tags.push('Electronics');
    if (Array.isArray(p?.allowedGoods) && p.allowedGoods.includes('pharma'))
      tags.push('Pharma');

    const pallets = toNum(p?.palletCapacity);
    if (pallets !== null && pallets >= 500) tags.push('High-volume');

    if (
      Array.isArray(p?.warehouseType) &&
      (p.warehouseType.includes('cold') || p.warehouseType.includes('frozen'))
    ) {
      tags.push('Cold chain');
    }

    if (tags.length === 0) tags.push('SMEs', 'Import/Export');

    return tags.slice(0, 4);
  }, [place]);

  const renderAvailabilityCalendar = () => {
    const startMonth = startOfMonth(calendarMonth);
    const endMonth = endOfMonth(calendarMonth);
    const startDate = startOfWeek(startMonth, { weekStartsOn: 1 });
    const endDate = endOfWeek(endMonth, { weekStartsOn: 1 });

    const rows = [];
    let day = startDate;

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    while (day <= endDate) {
      const cells = [];
      for (let i = 0; i < 7; i++) {
        const dayStr = format(day, 'yyyy-MM-dd');
        const isUnavailable = unavailableSet.has(dayStr);
        const inMonth = isSameMonth(day, calendarMonth);
        const isPast = day < todayMidnight;

        let base = 'flex h-8 w-8 items-center justify-center rounded-full text-xs';
        let extra = '';

        if (!inMonth) extra += ' text-gray-300';
        else if (isUnavailable) extra += ' bg-red-500 text-white';
        else if (isPast) extra += ' text-gray-300';
        else extra += ' text-gray-700';

        const isToday = dayStr === format(todayMidnight, 'yyyy-MM-dd');
        if (isToday && !isUnavailable) extra += ' border border-primary font-semibold';

        cells.push(
          <div key={dayStr} className={`${base} ${extra}`}>
            {format(day, 'd')}
          </div>
        );

        day = addDays(day, 1);
      }

      rows.push(
        <div className="grid grid-cols-7 gap-1" key={format(day, 'yyyy-MM-dd')}>
          {cells}
        </div>
      );
    }

    return (
      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700">
          <button
            type="button"
            onClick={() => setCalendarMonth((prev) => addMonths(prev, -1))}
            className="rounded-full border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-100"
          >
            ‹
          </button>
          <span>{format(calendarMonth, 'MMMM yyyy')}</span>
          <button
            type="button"
            onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
            className="rounded-full border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-100"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-gray-500">
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
          <span>Su</span>
        </div>

        <div className="space-y-1">{rows}</div>

        <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500">
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full border border-primary" />
            <span>Today</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mt-24 px-4">
        <p>Loading warehouse...</p>
      </div>
    );
  }

  if (placeError || !place) {
    return (
      <div className="mt-24 px-4">
        <p className="text-red-600">{placeError || 'Warehouse not found.'}</p>
      </div>
    );
  }

  const primaryPrice = toNum(place.pricePerDay) ?? toNum(place.price) ?? null;
  const priceLabel =
    primaryPrice !== null
      ? `${formatPrice(primaryPrice)} / day`
      : 'Price on request';

  const locationLine = (() => {
    const parts = [];
    if (place.city) parts.push(place.city);
    return parts.join(', ');
  })();

  const hasPacking =
    Array.isArray(place.services) &&
    (place.services.includes('labeling-packaging') ||
      place.services.includes('picking-packing'));

  const hasDelivery =
    Array.isArray(place.services) && place.services.includes('transportation');

  const reviewCountLabel =
    reviews?.length === 1 ? '1 review' : `${reviews?.length || 0} reviews`;

  return (
    <div className="mt-20 px-4 pb-12">
      {lightboxIndex !== null && place.photos?.length > 0 && (
        <PhotoLightbox
          photos={place.photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
      <div className="mx-auto w-full max-w-6xl">
        {/* A. HERO SECTION */}
        <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">
                  {place.title || 'Warehouse'}
                </h1>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  title="Share this warehouse"
                >
                  <span className="text-sm">🔗</span>
                  <span>Share</span>
                </button>

                {badges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          b.tone === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-50 text-blue-800'
                        }`}
                      >
                        <span className="text-sm">{b.icon}</span>
                        <span>{b.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                <div className="inline-flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <span className="font-medium text-gray-800">
                    {locationLine || place.address || 'Location'}
                  </span>
                </div>

                {avgRating && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-base">⭐</span>
                    <span className="font-semibold text-gray-900">{avgRating}</span>
                    <span className="text-gray-500">({reviewCountLabel})</span>
                  </div>
                )}

                {hasHostRating && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-base">🏅</span>
                    <span className="font-semibold text-gray-900">
                      Host {place.hostRating}
                    </span>
                    <span className="text-gray-500">({place.hostRatingCount})</span>
                  </div>
                )}

                {availabilityHint && (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-base">🗓️</span>
                    <span className="font-medium text-gray-800">{availabilityHint}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {bestForTags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                  >
                    Best for: {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col items-start gap-2 md:w-auto md:items-end">
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-left md:text-right">
                <div className="text-xs font-semibold text-gray-500">Starting from</div>
                <div className="mt-1 text-xl font-semibold text-gray-900">{priceLabel}</div>
                {place.negotiablePrice && (
                  <div className="mt-1 text-xs font-semibold text-emerald-700">
                    Negotiable pricing
                  </div>
                )}
              </div>

              <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
                <Link
                  to={`/place/${place._id}/chat`}
                  className="inline-flex items-center justify-center rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                >
                  Contact host
                </Link>

                <a
                  href="#booking"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Request booking
                </a>
              </div>

              {place.owner && (
                <Link
                  to={`/host/${place.owner}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  View host profile
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* IMAGE GALLERY */}
        {place.photos?.length > 0 && (
          <div className="mb-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="grid grid-cols-2 gap-1 md:grid-cols-4 md:grid-rows-2">
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="col-span-2 row-span-2 h-72 cursor-zoom-in bg-gray-200 md:h-[420px]"
              >
                <img
                  src={place.photos[0]}
                  alt={place.title}
                  className="h-full w-full object-cover"
                />
              </button>

              {place.photos.slice(1, 5).map((photo, i) => (
                <button
                  type="button"
                  key={photo}
                  onClick={() => setLightboxIndex(i + 1)}
                  className="h-36 cursor-zoom-in bg-gray-200 md:h-[209px]"
                >
                  <img
                    src={photo}
                    alt={place.title}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                View all {place.photos.length} photo{place.photos.length === 1 ? '' : 's'}
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="#location"
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  View location
                </a>
                <a
                  href="#services"
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Services & add-ons
                </a>
                <a
                  href="#reviews"
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Reviews
                </a>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT + STICKY BOOKING SUMMARY */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            {/* B. KEY FACTS */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">At a glance</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Key warehouse information for quick evaluation.
                  </p>
                </div>
                {place.warehouseType?.length > 0 && (
                  <div className="text-xs font-semibold text-gray-500">
                    {place.warehouseType
                      .map((t) => labelMaps.warehouseType[t] || t)
                      .join(' • ')}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {keyFacts.slice(0, 6).map((f) => (
                  <div key={f.label} className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-500">{f.label}</div>
                        <div className="mt-1 text-base font-semibold text-gray-900">{f.value}</div>
                      </div>
                      <div className="text-xl">{f.icon}</div>
                    </div>
                  </div>
                ))}
              </div>

              {(toNum(place.pricePerPallet) !== null ||
                toNum(place.loadingFee) !== null ||
                toNum(place.tempControlFee) !== null) && (
                <div className="mt-4 rounded-2xl border bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">Optional pricing components</div>
                  <div className="mt-2 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                    {toNum(place.pricePerPallet) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>Per pallet / day</span>
                        <span className="font-semibold">{formatJOD(place.pricePerPallet)}</span>
                      </div>
                    )}
                    {toNum(place.loadingFee) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>Loading / unloading fee</span>
                        <span className="font-semibold">{formatJOD(place.loadingFee)}</span>
                      </div>
                    )}
                    {toNum(place.tempControlFee) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>Temperature control surcharge</span>
                        <span className="font-semibold">{formatJOD(place.tempControlFee)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* C. DESCRIPTION & FEATURES */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Description & features</h2>

              {place.description ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                  {place.description}
                </p>
              ) : (
                <p className="mt-3 text-sm text-gray-600">No description provided.</p>
              )}

              {featuresBullets.length > 0 && (
                <div className="mt-5">
                  <div className="text-sm font-semibold text-gray-900">Highlights</div>
                  <ul className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                    {featuresBullets.map((b) => (
                      <li
                        key={b.label}
                        className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2"
                      >
                        <span className="text-base">{b.icon}</span>
                        <span className="font-medium">{b.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(place.equipment?.length > 0 ||
                place.truckAccess?.length > 0 ||
                place.allowedGoods?.length > 0) && (
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {place.equipment?.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Equipment</div>
                      {renderTagList(place.equipment, labelMaps.equipment)}
                    </div>
                  )}

                  {place.truckAccess?.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Truck access</div>
                      {renderTagList(place.truckAccess, labelMaps.truckAccess)}
                    </div>
                  )}

                  {place.allowedGoods?.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-sm font-semibold text-gray-900">Allowed goods</div>
                      {renderTagList(place.allowedGoods, labelMaps.allowedGoods)}
                    </div>
                  )}
                </div>
              )}

              {place.extraInfo && (
                <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-900">Notes / rules</div>
                  <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{place.extraInfo}</p>
                </div>
              )}
            </section>

            {/* D. MAP & LOCATION */}
            <section id="location" className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Location</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Map marker reflects the stored GPS coordinates.
                  </p>
                </div>
                {(place.city || place.zone) && (
                  <div className="text-sm font-semibold text-gray-700">
                    {place.city ? place.city : ''}
                    {place.city && place.zone ? ' • ' : ''}
                    {place.zone ? place.zone : ''}
                  </div>
                )}
              </div>

              {place.gps ? (
                <div className="mt-4">
                  <PlaceMap place={place} />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">
                  Map is not available for this warehouse (missing GPS coordinates).
                </div>
              )}

              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-500">Address</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {place.address || 'Address not provided'}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Exact address details may be confirmed during booking and chat.
                </div>
              </div>
            </section>

            {/* E. SERVICES & ADD-ONS */}
            <section id="services" className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Services & add-ons</h2>
              <p className="mt-1 text-sm text-gray-600">
                These indicate what the host can support. You can select add-ons during booking.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Insurance</div>
                    <div className="text-xl">🛡️</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {place.insurance
                      ? 'Available (coverage options during booking).'
                      : 'Not listed as available.'}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Packing</div>
                    <div className="text-xl">📦</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {hasPacking
                      ? 'Available (labeling / packing / handling support).'
                      : 'Not listed as available.'}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Delivery</div>
                    <div className="text-xl">🚚</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {hasDelivery
                      ? 'Available (pickup / drop-off options during booking).'
                      : 'Not listed as available.'}
                  </div>
                </div>
              </div>

              {place.services?.length > 0 && (
                <div className="mt-5">
                  <div className="text-sm font-semibold text-gray-900">Additional services</div>
                  {renderTagList(place.services, labelMaps.services)}
                </div>
              )}

              {place.prohibitedGoods && (
                <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-900">Restrictions</div>
                  <div className="mt-2 whitespace-pre-line text-sm text-gray-700">
                    {place.prohibitedGoods}
                  </div>
                </div>
              )}
            </section>

            {/* G. HOST INFORMATION */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Host</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    View the host profile and start a conversation before booking.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {hasHostRating && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-900">
                        ⭐ {place.hostRating}{' '}
                        <span className="text-yellow-800">({place.hostRatingCount})</span>
                      </span>
                    )}

                    {place.owner && (
                      <Link
                        to={`/host/${place.owner}`}
                        className="inline-flex items-center rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                      >
                        View host profile
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/place/${place._id}/chat`}
                    className="inline-flex items-center justify-center rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                  >
                    Contact host
                  </Link>

                  <a
                    href="#booking"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                  >
                    Request booking
                  </a>
                </div>
              </div>
            </section>

            {/* H. REVIEWS */}
            <section id="reviews" className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Feedback from renters who booked this warehouse.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {avgRating && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                      ⭐ {avgRating}{' '}
                      <span className="text-gray-500">({reviewCountLabel})</span>
                    </span>
                  )}
                </div>
              </div>

              {reviewsLoading && (
                <p className="mt-4 text-sm text-gray-600">Loading reviews...</p>
              )}

              {!reviewsLoading && reviews.length === 0 && (
                <p className="mt-4 text-sm text-gray-600">
                  No reviews yet. Be the first to book and review this warehouse.
                </p>
              )}

              {!reviewsLoading && reviews.length > 0 && (
                <>
                  <div className="mt-4 space-y-4">
                    {visibleReviews.map((review) => (
                      <div
                        key={review._id}
                        className="rounded-2xl border bg-gray-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-gray-900">
                            {review.user?.name || 'Anonymous'}
                          </div>
                          <div className="text-xs font-semibold text-gray-500">
                            {review.createdAt &&
                              format(new Date(review.createdAt), 'dd MMM yyyy')}
                          </div>
                        </div>

                        <div className="mt-2 text-sm text-gray-800">
                          <span className="font-semibold">
                            {'⭐'.repeat(Number(review.rating) || 0)}
                          </span>{' '}
                          <span className="text-gray-600">
                            ({review.rating} / 5)
                          </span>
                        </div>

                        {review.comment && (
                          <p className="mt-2 text-sm text-gray-700">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {reviews.length > 3 && (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => setShowAllReviews((v) => !v)}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        {showAllReviews ? 'See fewer reviews' : 'See all reviews'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* F. STICKY PRICING & BOOKING SUMMARY */}
          <aside className="space-y-4">
            <div id="booking" className="lg:sticky lg:top-24">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">
                      Booking summary
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {priceLabel}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Add-ons available during booking (insurance, packing, delivery).
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                    {place.negotiablePrice ? 'Negotiable' : 'Fixed'}
                  </div>
                </div>

                <div className="mt-4">
                  <BookingWidget place={place} />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Availability</h3>
                  {!availabilityLoading && unavailableDates?.length === 0 && (
                    <span className="text-xs font-semibold text-emerald-700">
                      Mostly available
                    </span>
                  )}
                </div>

                {availabilityLoading ? (
                  <p className="text-xs text-gray-500">Loading availability...</p>
                ) : (
                  <>
                    {renderAvailabilityCalendar()}
                    {unavailableDates.length === 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        No blocked dates yet. Most days are available to book.
                      </p>
                    )}
                  </>
                )}
              </div>

              {(place.checkIn ||
                place.checkOut ||
                toNum(place.minBookingDays) !== null ||
                toNum(place.maxBookingDays) !== null) && (
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900">Booking rules</h3>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    {toNum(place.minBookingDays) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>Minimum booking</span>
                        <span className="font-semibold">
                          {place.minBookingDays} day
                          {place.minBookingDays > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {toNum(place.maxBookingDays) !== null && (
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <span>Maximum booking</span>
                        <span className="font-semibold">
                          {place.maxBookingDays} day
                          {place.maxBookingDays > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {(place.checkIn || place.checkOut) && (
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <div className="text-xs font-semibold text-gray-500">
                          Default times
                        </div>
                        <div className="mt-1 font-semibold text-gray-800">
                          {place.checkIn ? `Check-in: ${place.checkIn}` : ''}
                          {place.checkIn && place.checkOut ? ' • ' : ''}
                          {place.checkOut ? `Check-out: ${place.checkOut}` : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
};

export default PlacePage;
