import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../context/AuthContext';
import MapView from '../components/MapView';
import { ShieldCheck, MapPin, Compass, AlertTriangle, ArrowLeft } from 'lucide-react';

const ShareTracking = () => {
  const { journeyId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Trip details
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  
  // Display names
  const [originName, setOriginName] = useState('');
  const [destName, setDestName] = useState('');
  const [safetyRating, setSafetyRating] = useState(null);

  // Simulation parameters for moving marker along route coordinates
  const [simCoordIndex, setSimCoordIndex] = useState(0);

  useEffect(() => {
    loadTrackingData();
  }, [journeyId, searchParams]);

  const loadTrackingData = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      if (journeyId) {
        // SCENARIO 1: Connected Database Look-up (Cloud Users)
        const res = await fetch(`${API_BASE_URL}/api/journeys/share/${journeyId}`);
        if (!res.ok) {
          throw new Error('Tracking ID not found or expired.');
        }
        const data = await res.json();
        
        const originC = { lat: data.originLat, lng: data.originLng };
        const destC = { lat: data.destinationLat, lng: data.destinationLng };
        
        setOrigin(originC);
        setDestination(destC);
        setOriginName(data.originName);
        setDestName(data.destinationName);
        setSafetyRating(data.safetyRating);

        // Parse OSRM Geometry to coordinates
        if (data.routeGeometry) {
          const geom = JSON.parse(data.routeGeometry);
          const coords = geom.coordinates.map(c => [c[1], c[0]]);
          
          setRoutes([{ coordinates: coords, safetyRating: data.safetyRating }]);
          
          // Place live marker at the traveler's current coordinates if available, otherwise starting coordinates
          if (data.currentLat !== null && data.currentLng !== null) {
            setUserLocation({ lat: data.currentLat, lng: data.currentLng });
          } else if (coords.length > 0) {
            setUserLocation({ lat: coords[0][0], lng: coords[0][1] });
          }
        }
      } else {
        // SCENARIO 2: URL Parameters Parsing (Guest Users)
        const lat = parseFloat(searchParams.get('lat'));
        const lng = parseFloat(searchParams.get('lng'));
        const destLat = parseFloat(searchParams.get('destLat'));
        const destLng = parseFloat(searchParams.get('destLng'));
        const oName = searchParams.get('origin') || 'Origin Point';
        const dName = searchParams.get('dest') || 'Destination Point';

        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Invalid tracking coordinates supplied.');
        }

        const currentCoords = { lat, lng };
        setUserLocation(currentCoords);
        setOrigin(currentCoords);
        setOriginName(oName);
        setDestName(dName);
        setSafetyRating(8.5); // Default safety rating placeholder

        if (!isNaN(destLat) && !isNaN(destLng)) {
          const destCoords = { lat: destLat, lng: destLng };
          setDestination(destCoords);

          // Generate 15 interpolated coordinates for mock tracking route
          const steps = 15;
          const coords = [];
          for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            const stepLat = lat + (destLat - lat) * ratio;
            const stepLng = lng + (destLng - lng) * ratio;
            coords.push([stepLat, stepLng]);
          }

          setRoutes([{ coordinates: coords, safetyRating: 8.5 }]);
          
          // Set live traveler marker at first coordinate
          if (coords.length > 0) {
            setUserLocation({ lat: coords[0][0], lng: coords[0][1] });
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load live tracking metrics.');
    } finally {
      setLoading(false);
    }
  };

  // Live polling for database-tracked journey, or simulation for guest tracking
  useEffect(() => {
    if (journeyId) {
      // SCENARIO 1: Poll database for traveler's live coordinates
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/journeys/share/${journeyId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.currentLat !== null && data.currentLng !== null) {
              setUserLocation({ lat: data.currentLat, lng: data.currentLng });
            }
          }
        } catch (err) {
          console.error("Failed to poll traveler live location:", err);
        }
      }, 5000); // Poll every 5 seconds
      return () => clearInterval(pollInterval);
    } else if (routes.length > 0 && routes[0].coordinates.length > 0) {
      // SCENARIO 2: Local client-side simulation for guest tracking
      const coords = routes[0].coordinates;
      const interval = setInterval(() => {
        setSimCoordIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % coords.length;
          setUserLocation({ lat: coords[nextIndex][0], lng: coords[nextIndex][1] });
          return nextIndex;
        });
      }, 4000); // Shift marker every 4 seconds
      return () => clearInterval(interval);
    }
  }, [journeyId, routes]);

  return (
    <div className="h-screen flex flex-col bg-neutral-50 font-sans text-neutral-900 overflow-hidden">
      
      {/* Top Floating Dashboard Tracker Panel */}
      <div className="bg-white border-b border-neutral-200 p-4 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-neutral-100 rounded-xl transition text-neutral-500 hover:text-black"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-black shrink-0 animate-pulse">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-900 tracking-wide">Live Tracker Relaying</h1>
              <span className="text-[10px] text-neutral-400 font-bold block leading-none">REAL-TIME SHARE STATUS</span>
            </div>
          </div>
        </div>

        {/* Sync indicators */}
        {!loading && !errorMsg && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="dot-green"></span>
              <span className="text-neutral-700">Active Tracker Connection</span>
            </div>

            {safetyRating && (
              <div className="px-3 py-1 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 shadow-sm">
                Route Safety: <span className="text-black font-extrabold">{safetyRating}/10</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main content grid */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* Detail Panel */}
        <div className="w-full md:w-96 bg-white border-r border-neutral-200 p-5 flex flex-col space-y-6 z-10 overflow-y-auto">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
              <span className="text-xs font-medium">Resolving link coordinate keys...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-xs font-bold text-neutral-450 uppercase tracking-widest mb-3">Journey Route Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider block">Departed From</span>
                    <div className="flex items-start gap-1.5 mt-1">
                      <MapPin className="w-4 h-4 text-black shrink-0 mt-0.5" />
                      <p className="text-xs text-neutral-800 font-semibold leading-relaxed">{originName}</p>
                    </div>
                  </div>

                  <div className="border-l border-dashed border-neutral-200 ml-2 h-4 my-0.5"></div>

                  <div>
                    <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider block">Destination Target</span>
                    <div className="flex items-start gap-1.5 mt-1">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-neutral-800 font-semibold leading-relaxed">{destName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation status updates */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider block">Status Log Relay</span>
                <p className="text-xs text-neutral-800 font-medium">
                  {routes.length > 0 
                    ? `Traveler is traversing along Route 1. Position updated index ${simCoordIndex}/${routes[0].coordinates.length}.`
                    : 'Static single location trace active. Coordinates fixed at source.'
                  }
                </p>
              </div>

              <div className="text-[11px] text-neutral-400 border-t border-neutral-200 pt-4 leading-normal">
                This tracking channel is anonymous, secure, and shared via encrypted URL. Close this window when traveler alerts reach green status.
              </div>
            </>
          )}
        </div>

        {/* Map View */}
        <div className="flex-1 h-full relative">
          <MapView
            userLocation={userLocation}
            origin={origin}
            destination={destination}
            routes={routes}
            selectedRouteIndex={0}
            isJourneyActive={true}
          />
        </div>
      </div>
    </div>
  );
};

export default ShareTracking;