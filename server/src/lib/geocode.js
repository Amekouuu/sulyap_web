// Address look-up through OpenStreetMap Nominatim (https://nominatim.org). Its usage policy asks
// for an identifying User-Agent and at most one request per second, so calls are queued here.
// Only the typed address is sent; nothing about the user.
import { config } from '../config.js';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = `Sulyap/1.0 (${config.appUrl})`;
let last = Promise.resolve();

function oneAtATime(task) {
  const run = last.then(async () => {
    try {
      return await task();
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  });
  last = run.catch(() => {});
  return run;
}

// Up to five places in the Philippines that match the address, best match first.
export function geocode(address) {
  return oneAtATime(async () => {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({
      q: address,
      format: 'jsonv2',
      countrycodes: 'ph',
      limit: '5',
      'accept-language': 'en',
    });
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Geocoder answered ${response.status}`);
    const results = await response.json();
    return results.map((r) => ({
      label: r.display_name,
      latitude: Math.round(Number(r.lat) * 1e6) / 1e6,
      longitude: Math.round(Number(r.lon) * 1e6) / 1e6,
    }));
  });
}
