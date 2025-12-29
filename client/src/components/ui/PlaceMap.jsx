// client/src/components/ui/PlaceMap.jsx
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { parseGpsFlexible } from '@/utils/gps';

// Import marker assets so Vite handles them
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// ❗ Important: remove Leaflet's default URL resolver
delete L.Icon.Default.prototype._getIconUrl;

// Now provide explicit URLs from the imports above
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const PlaceMap = ({ place }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    const coords = parseGpsFlexible(place.gps);
    if (!coords || !mapContainerRef.current) return;

    // If map already exists, just update view
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([coords.lat, coords.lng], 13);
      return;
    }

    // Create the map once
    const map = L.map(mapContainerRef.current).setView(
      [coords.lat, coords.lng],
      13
    );
    mapInstanceRef.current = map;

    // Base tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Marker
    const marker = L.marker([coords.lat, coords.lng]).addTo(map);
    const popupText = `
      ${place.title || 'Warehouse'}<br/>
      ${place.address || ''}
    `;
    marker.bindPopup(popupText);

    // Cleanup
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [place.gps, place.title, place.address]);

  const coords = parseGpsFlexible(place.gps);
  if (!coords) {
    return (
      <div className="mt-4 rounded-2xl border bg-white p-4 text-sm text-gray-500">
        Map is not available for this warehouse (missing GPS coordinates).
      </div>
    );
  }

  return (
    <div className="mt-4 h-64 overflow-hidden rounded-2xl border bg-white">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
};

export default PlaceMap;
