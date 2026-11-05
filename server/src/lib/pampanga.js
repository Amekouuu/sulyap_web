// Checks that a map pin falls inside Pampanga, using the same outline as the client map.
import { readFileSync } from 'node:fs';

const boundary = JSON.parse(
  readFileSync(new URL('../data/pampanga-boundary.json', import.meta.url), 'utf8'),
);
const RING = boundary.ring; // [[lng, lat], ...]

// Ray casting: count how many outline edges a line going east from the point crosses.
export function isInPampanga(latitude, longitude) {
  let inside = false;
  for (let i = 0, j = RING.length - 1; i < RING.length; j = i, i += 1) {
    const [xi, yi] = RING[i];
    const [xj, yj] = RING[j];
    const crosses =
      yi > latitude !== yj > latitude && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
