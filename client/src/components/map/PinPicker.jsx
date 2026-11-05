import { useEffect } from 'react';
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MAX_BOUNDS,
  PAMPANGA,
  PIN_SELECTED,
  PROVINCE_BOUNDS,
  TILE_ATTRIBUTION,
  TILE_URL,
  WORLD,
  isInPampanga,
} from './geo';

const round = (n) => Math.round(n * 1e6) / 1e6;

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

// Moves the view when the town changes, or to the pin when one is set from outside.
function FollowView({ pin, focus }) {
  const map = useMap();
  useEffect(() => {
    map.setMinZoom(map.getBoundsZoom(MAX_BOUNDS, true));
  }, [map]);
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 13), { duration: 0.5 });
  }, [map, focus]);
  useEffect(() => {
    if (pin && !map.getBounds().contains([pin.latitude, pin.longitude])) {
      map.setView([pin.latitude, pin.longitude], Math.max(map.getZoom(), 14));
    }
  }, [map, pin]);
  return null;
}

// Map for placing a destination pin. Click (or tap) to place it, drag to adjust.
// value: { latitude, longitude } or null. onOutside(): the click was outside Pampanga.
export function PinPicker({ value, onChange, onOutside, focus, className = 'h-[380px]' }) {
  function pick(lat, lng) {
    if (!isInPampanga(lat, lng)) {
      onOutside?.();
      return;
    }
    onChange({ latitude: round(lat), longitude: round(lng) });
  }

  return (
    <div
      className={`relative z-0 overflow-hidden rounded-panel border border-sage bg-[#EEF2E8] ${className}`}
    >
      <MapContainer
        bounds={value ? undefined : PROVINCE_BOUNDS}
        center={value ? [value.latitude, value.longitude] : undefined}
        zoom={value ? 15 : undefined}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="h-full w-full cursor-crosshair"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={18} />
        <Polygon
          positions={[WORLD, PAMPANGA]}
          pathOptions={{ stroke: false, fillColor: '#252927', fillOpacity: 0.38 }}
          interactive={false}
        />
        <Polygon
          positions={PAMPANGA}
          pathOptions={{ color: '#234638', weight: 2, fill: false }}
          interactive={false}
        />
        {value && (
          <Marker
            position={[value.latitude, value.longitude]}
            icon={PIN_SELECTED}
            draggable
            title="Destination pin. Drag to adjust."
            alt="Destination pin"
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = event.target.getLatLng();
                if (isInPampanga(lat, lng)) pick(lat, lng);
                else {
                  event.target.setLatLng([value.latitude, value.longitude]);
                  onOutside?.();
                }
              },
            }}
          />
        )}
        <ClickToPlace onPick={pick} />
        <ZoomControl position="topright" />
        <FollowView pin={value} focus={focus} />
      </MapContainer>
    </div>
  );
}

export default PinPicker;
