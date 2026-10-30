// Shared map pieces: the Pampanga outline, view limits, and pin icons.
import L from 'leaflet';
import boundary from '@/constants/pampanga-boundary.json';

export const WORLD = [
  [-90, -180],
  [-90, 180],
  [90, 180],
  [90, -180],
];
export const PAMPANGA = boundary.ring.map(([lng, lat]) => [lat, lng]);
export const PROVINCE_BOUNDS = L.latLngBounds(boundary.bounds);
export const MAX_BOUNDS = PROVINCE_BOUNDS.pad(0.15);

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const pinSvg = (fill) =>
  `<svg viewBox="-17 -44 34 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
  `<path d="M0,0 C0,0 -15,-14 -15,-26 C-15,-35 -8,-41 0,-41 C8,-41 15,-35 15,-26 C15,-14 0,0 0,0Z" ` +
  `fill="${fill}" stroke="#fff" stroke-width="2.5"/><circle cx="0" cy="-26" r="5.5" fill="#fff"/></svg>`;

function makePin(fill, width) {
  const height = Math.round(width * 1.35);
  return L.divIcon({
    className: 'sulyap-pin',
    html: pinSvg(fill),
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    tooltipAnchor: [0, -height],
  });
}
export const PIN = makePin('#234638', 30);
export const PIN_SELECTED = makePin('#CC0000', 38);

// Same test as the server: is the point inside the Pampanga outline?
export function isInPampanga(latitude, longitude) {
  const ring = boundary.ring;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}
