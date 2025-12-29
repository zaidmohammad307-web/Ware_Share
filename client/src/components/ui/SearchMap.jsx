// client/src/components/ui/SearchMap.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { parseGpsFlexible } from '@/utils/gps';

// Fix marker icons for Vite / bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -30],
});

// GPS parsing is shared (handles coordinates, swapped values, and common Google Maps URL formats)

// Format JOD price for tooltip
const formatPriceJOD = (place) => {
  if (typeof place.pricePerDay === 'number') {
    return `JOD ${place.pricePerDay.toLocaleString()} / day`;
  }
  if (typeof place.price === 'number') {
    return `JOD ${place.price.toLocaleString()}`;
  }
  return 'Price on request';
};

const SearchMap = ({ places = [], userLocation }) => {
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

      const marker = L.marker([coords.lat, coords.lng], {
        icon: defaultIcon,
      });

      const title = place.title || 'Warehouse';
      const city = place.city || '';
      const zone = place.zone ? ` • ${place.zone}` : '';
      const priceLabel = formatPriceJOD(place);

      // 🔵 Hover tooltip: small summary (title, city, JOD price)
      marker.bindTooltip(
        `
          <div style="font-size:11px;">
            <div style="font-weight:600;color:#1E88E5;margin-bottom:2px;">
              ${title}
            </div>
            <div style="color:#555;">
              ${city}${zone}
            </div>
            <div style="margin-top:2px;font-weight:500;color:#333;">
              ${priceLabel}
            </div>
          </div>
        `,
        {
          direction: 'top',
          offset: [0, -30],
          opacity: 0.95,
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
