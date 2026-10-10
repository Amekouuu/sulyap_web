// The 3 cities and 19 municipalities of Pampanga, with approximate town-center coordinates.
// The centers are a fallback for map views and for addresses the geocoder cannot place.
export const JURISDICTIONS = [
  { name: 'Angeles City', type: 'city', lat: 15.145, lng: 120.5887 },
  { name: 'City of San Fernando', type: 'city', lat: 15.0343, lng: 120.6844 },
  { name: 'Mabalacat City', type: 'city', lat: 15.2217, lng: 120.5711 },
  { name: 'Apalit', type: 'municipality', lat: 14.9496, lng: 120.7587 },
  { name: 'Arayat', type: 'municipality', lat: 15.1507, lng: 120.7697 },
  { name: 'Bacolor', type: 'municipality', lat: 14.9981, lng: 120.6528 },
  { name: 'Candaba', type: 'municipality', lat: 15.093, lng: 120.8283 },
  { name: 'Floridablanca', type: 'municipality', lat: 14.9744, lng: 120.5283 },
  { name: 'Guagua', type: 'municipality', lat: 14.9658, lng: 120.6339 },
  { name: 'Lubao', type: 'municipality', lat: 14.9392, lng: 120.6011 },
  { name: 'Macabebe', type: 'municipality', lat: 14.9083, lng: 120.7153 },
  { name: 'Magalang', type: 'municipality', lat: 15.215, lng: 120.6608 },
  { name: 'Masantol', type: 'municipality', lat: 14.9006, lng: 120.7092 },
  { name: 'Mexico', type: 'municipality', lat: 15.0647, lng: 120.7197 },
  { name: 'Minalin', type: 'municipality', lat: 14.9681, lng: 120.6828 },
  { name: 'Porac', type: 'municipality', lat: 15.0719, lng: 120.5419 },
  { name: 'San Luis', type: 'municipality', lat: 15.04, lng: 120.7908 },
  { name: 'San Simon', type: 'municipality', lat: 14.9983, lng: 120.7803 },
  { name: 'Santa Ana', type: 'municipality', lat: 15.0939, lng: 120.7669 },
  { name: 'Santa Rita', type: 'municipality', lat: 14.9953, lng: 120.615 },
  { name: 'Santo Tomas', type: 'municipality', lat: 14.9956, lng: 120.7092 },
  { name: 'Sasmuan', type: 'municipality', lat: 14.9375, lng: 120.6203 },
];

export const JURISDICTION_NAMES = JURISDICTIONS.map((j) => j.name);
export const PROVINCE = 'Pampanga';
