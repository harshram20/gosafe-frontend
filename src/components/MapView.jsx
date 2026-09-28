import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet when bundled
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons (Uber style: pickup is a black circle; dropoff is a black square)
const originIcon = L.divIcon({
  html: '<div class="flex items-center justify-center bg-black border-2 border-white rounded-full w-5 h-5 shadow-lg shadow-slate-950/50"><div class="w-1.5 h-1.5 bg-white rounded-full"></div></div>',
  className: 'uber-pickup-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const destIcon = L.divIcon({
  html: '<div class="flex items-center justify-center bg-black border-2 border-white w-5 h-5 shadow-lg shadow-slate-950/50"><div class="w-1.5 h-1.5 bg-white"></div></div>',
  className: 'uber-dropoff-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Pulse user icon using L.divIcon
const userLiveIcon = L.divIcon({
  html: '<div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg relative flex items-center justify-center"><div class="absolute w-full h-full rounded-full bg-blue-500 animate-ping opacity-75"></div></div>',
  className: 'custom-user-live-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Custom SOS icon using L.divIcon
const sosIcon = L.divIcon({
  className: 'sos-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Custom Shop icon using L.divIcon for visual landmarks
const shopMarkerIcon = L.divIcon({
  html: '<div class="flex items-center justify-center bg-white border border-neutral-300 rounded-full w-6 h-6 text-xs shadow-md">🛍️</div>',
  className: 'custom-shop-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Controller to handle center changes and bounds fit smoothly
const MapController = ({ center, bounds, zoom = 14 }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, bounds, zoom, map]);

  return null;
};

const MapView = ({
  userLocation,
  origin,
  destination,
  routes = [],
  selectedRouteIndex = 0,
  onSelectRoute,
  sosLocation = null,
  routeShops = [],
  isLoading = false,
  isJourneyActive = false
}) => {
  // Default map center: Delhi/User if userLocation is empty
  const defaultCenter = userLocation ? [userLocation.lat, userLocation.lng] : [28.6139, 77.2090];

  // Calculate map bounds based on origin and destination
  let mapBounds = null;
  if (!isJourneyActive && origin && destination) {
    mapBounds = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng]
    ];
  }

  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl border border-white/8 shadow-2xl">
      {isLoading && <div className="radar-scanner"></div>}

      <div className={`w-full h-full transition-all duration-300 ${isLoading ? 'map-loading-pulse' : ''}`}>
        <MapContainer
          center={defaultCenter}
          zoom={13}
          className="w-full h-full"
          zoomControl={false} // Disable standard top-left zoom for custom style
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // CartoDB Voyager (colorful) tiles
          />

          <MapController center={defaultCenter} bounds={mapBounds} zoom={isJourneyActive ? 16 : 14} />

          {/* Live User GPS Location */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userLiveIcon}>
              <Popup>
                <div className="text-slate-100 text-xs font-semibold">
                  {isJourneyActive ? "Your Live Location" : "Traveler's Live Location"}
                </div>
              </Popup>
            </Marker>
          )}

          {/* SOS Location Indicator */}
          {sosLocation && (
            <Marker position={[sosLocation.lat, sosLocation.lng]} icon={sosIcon}>
              <Popup>
                <div className="text-red-400 font-bold text-xs">SOS ALERT SENT HERE!</div>
              </Popup>
            </Marker>
          )}

          {/* Origin Marker */}
          {origin && (
            <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
              <Popup>
                <div className="text-slate-100 text-xs">
                  <span className="font-semibold block text-blue-400">Start</span>
                  {origin.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination Marker */}
          {destination && (
            <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
              <Popup>
                <div className="text-slate-100 text-xs">
                  <span className="font-semibold block text-red-400">Destination</span>
                  {destination.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Render Route Shops */}
          {routeShops.map((shop) => (
            <Marker
              key={shop.id}
              position={[shop.lat, shop.lng]}
              icon={shopMarkerIcon}
            >
              <Popup>
                <div className="text-black text-xs font-semibold">
                  {shop.name}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Display Routes */}
          {routes.map((route, index) => {
            const isSelected = index === selectedRouteIndex;
            // Color-code routes: selected is vibrant blue, unselected is slate gray
            const routeColor = isSelected ? '#3b82f6' : '#94a3b8';

            return (
              <Polyline
                key={index}
                positions={route.coordinates}
                pathOptions={{
                  color: routeColor,
                  weight: isSelected ? 6 : 4,
                  opacity: isSelected ? 0.95 : 0.4,
                  lineJoin: 'round',
                  dashArray: isSelected ? null : '5, 10' // Dashed for alternative routes
                }}
                eventHandlers={{
                  click: () => {
                    if (onSelectRoute) onSelectRoute(index);
                  }
                }}
              />
            );
          })}
        </MapContainer>
      </div>

    </div>
  );
};

export default MapView;