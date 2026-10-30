import { useEffect } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MAX_BOUNDS,
  PAMPANGA,
  PIN,
  PIN_SELECTED,
  PROVINCE_BOUNDS,
  TILE_ATTRIBUTION,
  TILE_URL,
  WORLD,
} from './geo';

// Leaflet map limited to Pampanga. Neighboring provinces are greyed out and the view cannot be
// dragged away from the province. Pins are endorsed destinations; the selected one is red.

// Stops zooming out past the province, and flies to the selected pin when asked to.
function ViewControl({ selected, followSelected }) {
  const map = useMap();

  useEffect(() => {
    map.setMinZoom(map.getBoundsZoom(MAX_BOUNDS, true));
  }, [map]);

  useEffect(() => {
    if (followSelected && selected) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 12), {
        duration: 0.6,
      });
    }
  }, [map, selected, followSelected]);

  return null;
}

// destinations: [{ id, name, latitude, longitude }]
// onSelect(id): called when a pin is clicked, or chosen with Enter.
// home: { latitude, longitude, radiusKm } draws the Nearby circle around the user's home.
// followSelected: fly to the selected pin whenever it changes (Map page). Otherwise the map
//   opens on the selected pin (destination page) or on the whole province.
export function PampangaMap({
  destinations = [],
  selectedId,
  onSelect,
  followSelected = false,
  scrollZoom = true,
  className = 'h-[560px]',
  label = 'Map of Pampanga with endorsed destinations',
  home,
}) {
  const selected = destinations.find((d) => d.id === selectedId);
  const start =
    selected && !followSelected
      ? { center: [selected.latitude, selected.longitude], zoom: 13 }
      : { bounds: PROVINCE_BOUNDS };

  return (
    <div
      className={`relative z-0 overflow-hidden rounded-panel border border-sage bg-[#EEF2E8] ${className}`}
      role="region"
      aria-label={label}
    >
      <MapContainer
        {...start}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom={scrollZoom}
        zoomControl={false}
        className="h-full w-full"
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
        {home && (
          <>
            <Circle
              center={[home.latitude, home.longitude]}
              radius={home.radiusKm * 1000}
              pathOptions={{ color: '#C9653B', weight: 2, dashArray: '6 6', fillOpacity: 0.06 }}
              interactive={false}
            />
            <CircleMarker
              center={[home.latitude, home.longitude]}
              radius={7}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#C9653B', fillOpacity: 1 }}
            >
              <Tooltip direction="top">Your home</Tooltip>
            </CircleMarker>
          </>
        )}
        {destinations.map((d) => {
          const isSelected = d.id === selectedId;
          return (
            <Marker
              key={d.id}
              position={[d.latitude, d.longitude]}
              icon={isSelected ? PIN_SELECTED : PIN}
              title={d.name}
              alt={d.name}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={onSelect ? { click: () => onSelect(d.id) } : undefined}
            >
              {/* Leaflet reads "permanent" only when the tooltip is created, so remount it on change. */}
              <Tooltip
                key={isSelected ? 'selected' : 'hover'}
                direction="top"
                offset={[0, -4]}
                permanent={isSelected}
              >
                {d.name}
              </Tooltip>
            </Marker>
          );
        })}
        <ZoomControl position="topright" />
        <ViewControl selected={selected} followSelected={followSelected} />
      </MapContainer>
    </div>
  );
}

export default PampangaMap;
