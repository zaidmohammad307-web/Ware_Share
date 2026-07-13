// client/src/components/ui/SearchMap.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { parseGpsFlexible } from '@/utils/gps';

// GPS parsing is shared (handles coordinates, swapped values, and common Google Maps URL formats)

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);

// Airbnb-style price pill marker
const pricePillIcon = (label) =>
  L.divIcon({
    className: '',
    html: `<div style="
      display:inline-block;
      background:#fff;
      color:#111;
      font-weight:700;
      font-size:12px;
      padding:4px 10px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,.12);
      box-shadow:0 2px 8px rgba(0,0,0,.18);
      white-space:nowrap;
      transform:translate(-50%,-50%);
    ">${escapeHtml(label)}</div>`,
    iconSize: [0, 0],
  });

const SearchMap = ({ places = [], userLocation, priceLabel }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const navigate = useNavigate();

  // Init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter =
      userLocation || { lat: 31.9539, lng: 35.9106 }; // Amman as default

    const map = L.map(mapContainerRef.current).setView(
      [initialCenter.lat, initialCenter.lng],
      11
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [userLocation]);

  // Update markers when places or userLocation change
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    const bounds = [];

    places.forEach((place) => {
      const coords = parseGpsFlexible(place.gps);
      if (!coords) return;

      const priceValue =
        typeof place.pricePerDay === 'number'
          ? place.pricePerDay
          : typeof place.price === 'number'
          ? place.price
          : null;

      const pillLabel =
        priceValue !== null
          ? (priceLabel ? priceLabel(priceValue) : `JOD ${priceValue.toLocaleString()}`)
          : '· · ·';

      const marker = L.marker([coords.lat, coords.lng], {
        icon: pricePillIcon(pillLabel),
      });

      const title = escapeHtml(place.title || 'Warehouse');
      const city = escapeHtml(place.city || '');
      const zone = place.zone ? ` • ${escapeHtml(place.zone)}` : '';
      const photo = Array.isArray(place.photos) && place.photos[0] ? place.photos[0] : null;
      const rating =
        typeof place.hostRating === 'number' ? `⭐ ${place.hostRating}` : '';
      const verified = place.hostVerified ? '✅' : '';

      // 🔵 Hover tooltip: listing preview like the demo (photo, title, price)
      marker.bindTooltip(
        `
          <div style="font-size:11px;width:180px;">
            ${
              photo
                ? `<img src="${escapeHtml(photo)}" style="width:100%;height:72px;object-fit:cover;border-radius:8px;margin-bottom:4px;" />`
                : ''
            }
            <div style="font-weight:600;color:#1E88E5;margin-bottom:2px;">
              ${title} ${verified}
            </div>
            <div style="color:#555;">
              ${city}${zone} ${rating ? `· ${rating}` : ''}
            </div>
            <div style="margin-top:2px;font-weight:700;color:#111;">
              ${escapeHtml(pillLabel)}
            </div>
          </div>
        `,
        {
          direction: 'top',
          offset: [0, -14],
          opacity: 0.97,
          sticky: true,
        }
      );

      // 🔵 Click marker → go to place page
      marker.on('click', () => {
        if (place._id) {
          navigate(`/place/${place._id}`);
        }
      });

      marker.addTo(markersLayer);
      bounds.push([coords.lat, coords.lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 11);
    }
  }, [places, userLocation, navigate]);

  return (
    <div className="h-[400px] w-full overflow-hidden rounded-2xl border">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
};

export default SearchMap;
