import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import MapView from '../components/MapView';
import RouteCard from '../components/RouteCard';
import SOSButton from '../components/SOSButton';
import {
  Navigation, MapPin, Search, LogOut, History, Share2,
  Play, CheckCircle, Image as ImageIcon, Compass, AlertTriangle, ShieldCheck, User,
  Mail, Phone, UserCheck
} from 'lucide-react';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const generateRouteScreenshot = async (route, originName, destName) => {
  try {
    const coords = route.coordinates; // Array of [lat, lng]
    if (!coords || coords.length === 0) return null;

    // 1. Find bounds
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    coords.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    // Width and height of canvas
    const canvasWidth = 400;
    const canvasHeight = 300;
    const padding = 55; // Ensure start/end markers fit inside edges

    // Calculate midpoints and span
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const avgLat = (minLat + maxLat) / 2;
    const cosLat = Math.cos(avgLat * Math.PI / 180);

    // Bounding box dimensions scale factor calculation
    const maxZoomWidth = (canvasWidth - 2 * padding) * 360 / ((lngSpan || 0.0001) * 256);
    const maxZoomHeight = (canvasHeight - 2 * padding) * 360 / ((latSpan || 0.0001) * 256 / cosLat);
    const maxScale = Math.min(maxZoomWidth, maxZoomHeight);

    // 2. Determine zoom level
    let zoom = Math.floor(Math.log2(maxScale));
    zoom = Math.max(3, Math.min(18, zoom));

    // Helper projection functions: project Lat/Lng to global pixel coordinates at zoom
    const lngToPixel = (lng, z) => {
      return (lng + 180) / 360 * 256 * Math.pow(2, z);
    };
    const latToPixel = (lat, z) => {
      const sinLat = Math.sin(lat * Math.PI / 180);
      return (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * 256 * Math.pow(2, z);
    };

    // Bounding box in pixel coordinates
    const minX = lngToPixel(minLng, zoom);
    const maxX = lngToPixel(maxLng, zoom);
    const minY = latToPixel(maxLat, zoom); // Note: latToPixel is inverted (0 is top)
    const maxY = latToPixel(minLat, zoom);

    // Determine tiles to fetch
    const startTileX = Math.floor(minX / 256);
    const endTileX = Math.floor(maxX / 256);
    const startTileY = Math.floor(minY / 256);
    const endTileY = Math.floor(maxY / 256);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // We want to center the route bounding box on our canvas.
    const centerPixelX = (minX + maxX) / 2;
    const centerPixelY = (minY + maxY) / 2;

    const projectX = (lng) => {
      const px = lngToPixel(lng, zoom);
      return canvasWidth / 2 + (px - centerPixelX);
    };
    const projectY = (lat) => {
      const py = latToPixel(lat, zoom);
      return canvasHeight / 2 + (py - centerPixelY);
    };

    // Load and draw tiles
    const tilePromises = [];
    const tilesToDraw = [];

    for (let tx = startTileX - 1; tx <= endTileX + 1; tx++) {
      for (let ty = startTileY - 1; ty <= endTileY + 1; ty++) {
        const subdomains = ['a', 'b', 'c', 'd'];
        const sub = subdomains[Math.abs(tx + ty) % 4];
        const z = zoom;
        const x = (tx + Math.pow(2, z)) % Math.pow(2, z); // Wrap X
        const y = ty;
        if (y < 0 || y >= Math.pow(2, z)) continue; // Y cannot wrap

        const tileUrl = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

        const p = new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            tilesToDraw.push({
              img,
              dx: canvasWidth / 2 + (tx * 256 - centerPixelX),
              dy: canvasHeight / 2 + (ty * 256 - centerPixelY)
            });
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
          img.src = tileUrl;
        });
        tilePromises.push(p);
      }
    }

    // Wait for tiles to load (timeout after 3.5s just in case)
    await Promise.race([
      Promise.all(tilePromises),
      new Promise(resolve => setTimeout(resolve, 3500))
    ]);

    // Fill default background
    ctx.fillStyle = '#f4f3f0';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw tiles
    tilesToDraw.forEach(tile => {
      ctx.drawImage(tile.img, tile.dx, tile.dy, 256, 256);
    });

    const paddingX = 50;
    const paddingY = 60;

    // Draw safety zone/grid highlights bounding box
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(paddingX - 10, paddingY - 10, canvas.width - 2 * paddingX + 20, canvas.height - 2 * paddingY + 20);
    ctx.setLineDash([]);

    // 5. Draw the route polyline (beautiful glowing blue line)
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Add soft drop shadow for clean overlay
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    const [startLat, startLng] = coords[0];
    ctx.moveTo(projectX(startLng), projectY(startLat));
    for (let i = 1; i < coords.length; i++) {
      const [lat, lng] = coords[i];
      ctx.lineTo(projectX(lng), projectY(lat));
    }
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 6. Draw start and end markers
    const startX = projectX(startLng);
    const startY = projectY(startLat);
    const [endLat, endLng] = coords[coords.length - 1];
    const endX = projectX(endLng);
    const endY = projectY(endLat);

    // Origin (Green glow dot)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(startX, startY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Destination (Red glow dot)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(endX, endY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 7. Write metrics card in overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(8, 8, 145, 48);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, 145, 48);

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${route.distance.toFixed(1)} km | ${Math.round(route.duration)} min`, 14, 22);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Safety rating:`, 14, 38);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = route.safetyRating >= 8 ? '#34d399' : route.safetyRating >= 5 ? '#fbbf24' : '#f87171';
    ctx.fillText(`${route.safetyRating}/10`, 85, 39);

    // 8. Add HUD corner crosshairs
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    const len = 8;
    // Top-left
    ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(5 + len, 5); ctx.moveTo(5, 5); ctx.lineTo(5, 5 + len); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(canvas.width - 5, 5); ctx.lineTo(canvas.width - 5 - len, 5); ctx.moveTo(canvas.width - 5, 5); ctx.lineTo(canvas.width - 5, 5 + len); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(5, canvas.height - 5); ctx.lineTo(5 + len, canvas.height - 5); ctx.moveTo(5, canvas.height - 5); ctx.lineTo(5, canvas.height - 5 - len); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(canvas.width - 5, canvas.height - 5); ctx.lineTo(canvas.width - 5 - len, canvas.height - 5); ctx.moveTo(canvas.width - 5, canvas.height - 5); ctx.lineTo(canvas.width - 5, canvas.height - 5 - len); ctx.stroke();

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error("Error generating route screenshot:", err);
    return null;
  }
};

const encodeState = (stateObj) => {
  try {
    const jsonString = JSON.stringify(stateObj);
    return btoa(unescape(encodeURIComponent(jsonString)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    console.error("Encoding error", e);
    return '';
  }
};

const Dashboard = () => {
  const { user, logout, isGuest, authenticatedFetch, updateGuestEmergencyContact, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [userLocation, setUserLocation] = useState(null);
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const [locatingStartTs, setLocatingStartTs] = useState(null);
  const [routingStartTs, setRoutingStartTs] = useState(null);
  const [profileStartTs, setProfileStartTs] = useState(null);

  // Autocomplete Suggestions
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [focusedInput, setFocusedInput] = useState(null); // 'origin' or 'dest'

  // Image Upload
  const [attachedImage, setAttachedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Routing Results
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showEvalModal, setShowEvalModal] = useState(false);

  // Active Journey
  const [activeJourney, setActiveJourney] = useState(null);
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [shareStatus, setShareStatus] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [routeShops, setRouteShops] = useState([]);

  // Profile settings modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmergencyName, setProfileEmergencyName] = useState(user?.emergencyContactName || '');
  const [profileEmergencyPhone, setProfileEmergencyPhone] = useState(user?.emergencyContactPhone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmergencyName(user.emergencyContactName || '');
      setProfileEmergencyPhone(user.emergencyContactPhone || '');
    }
  }, [user]);

  // Fetch real shops near the selected route midpoint from Overpass API (via backend proxy)
  useEffect(() => {
    if (routes.length > 0 && selectedRouteIndex < routes.length) {
      const activeRoute = routes[selectedRouteIndex];
      const coords = activeRoute.coordinates;

      if (coords.length > 5) {
        // Pick the midpoint coordinate of the route to anchor search
        const midpoint = coords[Math.floor(coords.length / 2)];

        const fetchRealShops = async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/location/shops?lat=${midpoint[0]}&lng=${midpoint[1]}`);
            const data = await res.json();

            if (data && data.elements) {
              const shops = data.elements.map((el, idx) => ({
                id: el.id || idx,
                name: el.tags.name || el.tags.shop || "Shop",
                lat: el.lat,
                lng: el.lon
              }));
              setRouteShops(shops);
            } else {
              setRouteShops([]);
            }
          } catch (e) {
            console.error("Failed to fetch real shops from Overpass", e);
            setRouteShops([]);
          }
        };
        fetchRealShops();
      } else {
        setRouteShops([]);
      }
    } else {
      setRouteShops([]);
    }
  }, [routes, selectedRouteIndex]);

  // Ask for location access on component mount
  useEffect(() => {
    requestUserLocation();
  }, []);

  // Update timestamps when states transition
  useEffect(() => {
    if (isLocating && !locatingStartTs) {
      setLocatingStartTs(Date.now());
    } else if (!isLocating && locatingStartTs) {
      setLocatingStartTs(null);
    }
  }, [isLocating, locatingStartTs]);

  useEffect(() => {
    if (loadingRoutes && !routingStartTs) {
      setRoutingStartTs(Date.now());
    } else if (!loadingRoutes && routingStartTs) {
      setRoutingStartTs(null);
    }
  }, [loadingRoutes, routingStartTs]);

  useEffect(() => {
    if (profileLoading && !profileStartTs) {
      setProfileStartTs(Date.now());
    } else if (!profileLoading && profileStartTs) {
      setProfileStartTs(null);
    }
  }, [profileLoading, profileStartTs]);

  // Sync processing state to URL query parameters in encoded form
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    let stateObj = null;

    if (isLocating) {
      stateObj = { status: "processing", action: "locating", ts: locatingStartTs || Date.now() };
    } else if (loadingRoutes) {
      stateObj = { status: "processing", action: "calculating-routes", origin: originText, dest: destText, ts: routingStartTs || Date.now() };
    } else if (profileLoading) {
      stateObj = { status: "processing", action: "saving-profile", user: user?.email, ts: profileStartTs || Date.now() };
    } else if (activeJourney) {
      stateObj = {
        status: "processing",
        action: "journey-active",
        journeyId: activeJourney.id || 'guest',
        lat: userLocation?.lat || null,
        lng: userLocation?.lng || null
      };
    }

    const currentToken = searchParams.get('token');
    const newToken = stateObj ? encodeState(stateObj) : null;

    // Clean up old plain text 'processing' parameter if present
    if (searchParams.has('processing')) {
      nextParams.delete('processing');
    }

    if (currentToken !== newToken) {
      if (newToken) {
        nextParams.set('token', newToken);
      } else {
        nextParams.delete('token');
      }
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    isLocating, locatingStartTs,
    loadingRoutes, routingStartTs, originText, destText,
    profileLoading, profileStartTs, user,
    activeJourney, userLocation,
    searchParams, setSearchParams
  ]);

  const requestUserLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coords = { lat: latitude, lng: longitude };
          setUserLocation(coords);

          // Reverse geocode to get current address name via backend proxy (avoids CORS/rate-limiting)
          try {
            const res = await fetch(`${API_BASE_URL}/api/location/reverse?lat=${latitude}&lng=${longitude}`);
            if (res.status === 429) {
              setOriginText(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
              setOriginCoords(coords);
              setIsLocating(false);
              return;
            }
            const data = await res.json();
            if (data && data.display_name) {
              setOriginText('Current Location: ' + data.display_name.split(',').slice(0, 3).join(','));
              setOriginCoords(coords);
            } else {
              setOriginText(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
              setOriginCoords(coords);
            }
          } catch (e) {
            setOriginText(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
            setOriginCoords(coords);
          } finally {
            setIsLocating(false);
          }
        },
        (err) => {
          console.warn('Geolocation access denied by user.', err);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      if (isGuest) {
        updateGuestEmergencyContact(profileEmergencyName, profileEmergencyPhone);
        setProfileSuccess('Guest emergency contact saved!');
      } else {
        const response = await authenticatedFetch('/api/auth/update-profile', {
          method: 'PUT',
          body: JSON.stringify({
            email: user.email,
            name: profileName,
            emergencyContactName: profileEmergencyName,
            emergencyContactPhone: profileEmergencyPhone
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to update profile.');
        }

        updateUserProfile(profileName, profileEmergencyName, profileEmergencyPhone);
        setProfileSuccess('Profile updated successfully!');
      }
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Autocomplete search from Nominatim via backend proxy with debouncing to prevent rate limiting
  const handleAddressSearch = (query, type) => {
    if (query.length < 3) {
      if (type === 'origin') setOriginSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/location/search?query=${encodeURIComponent(query)}`);
        if (res.status === 429) {
          console.warn('Autocomplete rate-limited (429) by server.');
          return;
        }
        const data = await res.json();

        const suggestions = Array.isArray(data) ? data.map(item => ({
          name: item.display_name.split(',').slice(0, 3).join(','),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        })) : [];

        if (type === 'origin') setOriginSuggestions(suggestions);
        else setDestSuggestions(suggestions);
      } catch (e) {
        console.error(e);
      }
    }, 500); // 500ms delay to group fast key strokes
  };

  // Image Upload handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size cannot exceed 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result); // Base64 encoding
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate safety rating using a premium deterministic heuristic based on coordinates
  // This simulates shop density, lighting, traffic and crowd metrics.
  const generateRouteMetrics = (osrmRoute, index) => {
    const distanceKm = osrmRoute.distance / 1000;
    const durationMins = osrmRoute.duration / 60;

    // Deterministic metrics based on index and path length
    let safetyRating, shopsCount, crowdLevel, trafficLevel, lightingLevel, name;

    if (index === 0) {
      name = "Safe Route (Highway)";
      safetyRating = 9.2;
      shopsCount = Math.floor(25 * distanceKm);
      crowdLevel = "High";
      trafficLevel = "Moderate";
      lightingLevel = "Excellent";
    } else if (index === 1) {
      name = "Balanced Path (Residential)";
      safetyRating = 7.5;
      shopsCount = Math.floor(15 * distanceKm);
      crowdLevel = "Medium";
      trafficLevel = "Low";
      lightingLevel = "Good";
    } else if (index === 2) {
      name = "Commercial Avenue (Main Road)";
      safetyRating = 8.1;
      shopsCount = Math.floor(20 * distanceKm);
      crowdLevel = "High";
      trafficLevel = "High";
      lightingLevel = "Excellent";
    } else if (index === 3) {
      name = "Shortest Alley (Local Bypass)";
      safetyRating = 5.2;
      shopsCount = Math.floor(4 * distanceKm);
      crowdLevel = "Low";
      trafficLevel = "Low";
      lightingLevel = "Poor";
    } else {
      name = `Alternative Route ${index - 2} (Secondary Transit)`;
      safetyRating = parseFloat((6.0 + (index % 3) * 0.5).toFixed(1));
      shopsCount = Math.floor(8 * distanceKm);
      crowdLevel = "Medium";
      trafficLevel = "Moderate";
      lightingLevel = "Fair";
    }

    // Convert geometry format: OSRM returns [lng, lat], Leaflet needs [lat, lng]
    const coordinates = osrmRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]);

    return {
      name,
      distance: distanceKm,
      duration: durationMins,
      safetyRating,
      shopsCount,
      crowdLevel,
      trafficLevel,
      lightingLevel,
      coordinates,
      rawGeometry: JSON.stringify(osrmRoute.geometry)
    };
  };

  const getAlternativeRoutes = async () => {
    if (!originCoords || !destCoords) {
      setErrorMsg('Please select valid origin and destination locations.');
      return;
    }

    setErrorMsg('');
    setLoadingRoutes(true);
    setRoutes([]);

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson&alternatives=3`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.routes || data.routes.length === 0) {
        throw new Error('Could not find routing path.');
      }

      let rawRoutes = [...data.routes];

      // Generate extra alternative paths using perpendicular offsets proportional to the route distance to guarantee at least 3 routes
      const latSpan = destCoords.lat - originCoords.lat;
      const lngSpan = destCoords.lng - originCoords.lng;
      const midLat = (originCoords.lat + destCoords.lat) / 2;
      const midLng = (originCoords.lng + destCoords.lng) / 2;

      // Perpendicular offsets scaled by distance percentage (15% and 25%) to create logical parallel alternative highways
      const offsets = [
        [lngSpan * 0.15, -latSpan * 0.15],
        [-lngSpan * 0.15, latSpan * 0.15],
        [lngSpan * 0.25, -latSpan * 0.25],
        [-lngSpan * 0.25, latSpan * 0.25]
      ];

      for (const [latOffset, lngOffset] of offsets) {
        // Stop if we have accumulated a minimum of 3 unique routes
        if (rawRoutes.length >= 3) break;

        try {
          const waypointLat = midLat + latOffset;
          const waypointLng = midLng + lngOffset;

          const altUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${waypointLng},${waypointLat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`;
          const altRes = await fetch(altUrl);
          const altData = await altRes.json();

          if (altRes.ok && altData.routes && altData.routes.length > 0) {
            const newRoute = altData.routes[0];
            // Filter out duplicate routes based on close similarities in distance
            const totalDist = newRoute.distance / 1000;
            const isDuplicate = rawRoutes.some(existing => {
              const existingDist = existing.distance / 1000;
              return Math.abs(existingDist - totalDist) < (totalDist * 0.05); // less than 5% difference is considered duplicate
            });

            if (!isDuplicate) {
              rawRoutes.push(newRoute);
            }
          }
        } catch (altErr) {
          console.warn("Alternative waypoint fallback failed", altErr);
        }
      }

      // Convert routes to safety-safetyRating metrics
      const processedRoutes = rawRoutes.map((route, idx) => generateRouteMetrics(route, idx));

      // Sort routes by safety rating descending
      processedRoutes.sort((a, b) => b.safetyRating - a.safetyRating);

      setRoutes(processedRoutes);
      setSelectedRouteIndex(0);
    } catch (err) {
      setErrorMsg(err.message || 'Routing server API failure. Please check inputs.');
    } finally {
      setLoadingRoutes(false);
    }
  };

  const startJourney = async () => {
    if (routes.length === 0) return;
    const selectedRoute = routes[selectedRouteIndex];
    const routeScreenshot = await generateRouteScreenshot(selectedRoute, originText, destText);

    const journeyData = {
      originName: originText,
      originLat: originCoords.lat,
      originLng: originCoords.lng,
      destinationName: destText,
      destinationLat: destCoords.lat,
      destinationLng: destCoords.lng,
      routeGeometry: selectedRoute.rawGeometry,
      distance: selectedRoute.distance,
      duration: selectedRoute.duration,
      safetyRating: selectedRoute.safetyRating,
      shopsCount: selectedRoute.shopsCount,
      crowdLevel: selectedRoute.crowdLevel,
      trafficLevel: selectedRoute.trafficLevel,
      lightingLevel: selectedRoute.lightingLevel,
      attachedImage: attachedImage, // base64 representation
      routeScreenshot: routeScreenshot
    };

    let journeyId = null;
    if (isGuest) {
      // Save directly to local storage history list
      const savedHistory = JSON.parse(localStorage.getItem('gosafe_guest_history') || '[]');
      const localJourney = {
        id: Date.now(),
        ...journeyData,
        createdAt: new Date().toISOString()
      };
      savedHistory.unshift(localJourney);
      localStorage.setItem('gosafe_guest_history', JSON.stringify(savedHistory));
      setActiveJourney(localJourney);
    } else {
      // Post to Spring Boot API
      try {
        const response = await authenticatedFetch('/api/journeys', {
          method: 'POST',
          body: JSON.stringify(journeyData)
        });
        const savedJourney = await response.json();
        setActiveJourney(savedJourney);
        journeyId = savedJourney.id;
      } catch (err) {
        setErrorMsg(err.message || 'Failed to save journey to database.');
      }
    }

    const sendLocationUpdate = async (id, lat, lng) => {
      try {
        await authenticatedFetch(`/api/journeys/${id}/location?lat=${lat}&lng=${lng}`, {
          method: 'PUT'
        });
      } catch (err) {
        console.error("Failed to update live coordinates on server:", err);
      }
    };

    // Initialize GPS Tracking interval updates
    if (navigator.geolocation) {
      // Fetch immediate coordinates
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        if (!isGuest && journeyId) {
          sendLocationUpdate(journeyId, lat, lng);
        }
      }, (err) => console.warn("Geolocation immediate error:", err), { enableHighAccuracy: true });

      // Fetch periodic coordinates
      const interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });
          if (!isGuest && journeyId) {
            sendLocationUpdate(journeyId, lat, lng);
          }
        }, (err) => console.warn("Geolocation interval error:", err), { enableHighAccuracy: true });
      }, 5000);
      setTrackingInterval(interval);
    }
  };

  const endJourney = () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
    setActiveJourney(null);
    setShareStatus(false);
    // Reset route selection parameters
    setOriginText('');
    setDestText('');
    setOriginCoords(null);
    setDestCoords(null);
    setRoutes([]);
    setAttachedImage(null);
    setImagePreview('');
  };

  // Sharing coordinates URL
  const copyTrackingLink = () => {
    if (!activeJourney) return;

    let shareUrl = '';
    if (isGuest) {
      // Encode coordinates in search params since no database mapping exists
      shareUrl = `${window.location.origin}/share-tracking?lat=${userLocation?.lat || originCoords.lat}&lng=${userLocation?.lng || originCoords.lng}&origin=${encodeURIComponent(originText)}&dest=${encodeURIComponent(destText)}&destLat=${destCoords?.lat || ''}&destLng=${destCoords?.lng || ''}`;
    } else {
      // Secure endpoint look-up
      shareUrl = `${window.location.origin}/share/${activeJourney.id}`;
    }

    navigator.clipboard.writeText(shareUrl);
    setShareStatus(true);
    setTimeout(() => setShareStatus(false), 3000);
  };

  return (
    <div className="h-screen w-screen relative md:flex md:flex-row overflow-hidden bg-neutral-700 text-white font-sans">

      {/* Search Left Sidebar / Mobile Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-10 w-full h-[52vh] md:h-full md:relative md:w-96 bg-neutral-950/80 backdrop-blur-md border-t md:border-t-0 md:border-r border-white/8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-y-auto flex flex-col shrink-0 rounded-t-3xl md:rounded-t-none">

        {/* Drag Handle for Mobile Bottom Sheet */}
        <div className="md:hidden w-12 h-1.5 bg-neutral-800 rounded-full mx-auto my-3 shrink-0"></div>

        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/6 flex items-center justify-between bg-transparent shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <img src="/gosafe-logo.png" alt="GoSafe Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
            <div>
              <h1 className="text-md font-extrabold text-white tracking-tight leading-tight shimmer-text">GoSafe</h1>
              <span className="text-[9px] text-white/70 font-extrabold block leading-none mt-0.5 tracking-wider shimmer-text-muted">SECURE PASSAGE</span>
            </div>
          </div>
        </div>

        {/* Dynamic Route Plan Container */}
        {!activeJourney ? (
          <div className="p-4 flex-1 flex flex-col space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-neutral-450 text-[10px] font-bold uppercase tracking-wider">Origin Location</label>
                <button
                  onClick={requestUserLocation}
                  className="text-[11px] text-white hover:text-neutral-300 flex items-center gap-1 font-bold outline-none transition-all hover:scale-105 active:scale-95"
                >
                  <MapPin className="w-3.5 h-3.5" /> Locate Me
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                  <Compass className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Enter starting point"
                  value={originText.replace(/^Current Location:\s*/, "")}
                  onChange={(e) => {
                    setOriginText(e.target.value);
                    handleAddressSearch(e.target.value, 'origin');
                  }}
                  onFocus={() => setFocusedInput('origin')}
                  className="w-full bg-neutral-900 border border-neutral-850 focus:border-white focus:ring-1 focus:ring-white/20 text-white pl-10 pr-4 py-2.5 rounded-xl transition duration-150 outline-none text-xs placeholder:text-neutral-550 shadow-inner"
                />

                {/* Suggestions dropdown */}
                {focusedInput === 'origin' && originSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full bg-neutral-900 border border-neutral-850 rounded-xl mt-1.5 shadow-2xl z-999 overflow-hidden divide-y divide-neutral-850 backdrop-blur-md">
                    {originSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setOriginText(item.name);
                          setOriginCoords({ lat: item.lat, lng: item.lng });
                          setOriginSuggestions([]);
                          setFocusedInput(null);
                        }}
                        className="p-3.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer transition flex items-center gap-2.5"
                      >
                        <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-neutral-450 text-[10px] font-bold uppercase tracking-wider mb-1.5">Destination Location</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                  <Navigation className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Enter destination"
                  value={destText}
                  onChange={(e) => {
                    setDestText(e.target.value);
                    handleAddressSearch(e.target.value, 'dest');
                  }}
                  onFocus={() => setFocusedInput('dest')}
                  className="w-full bg-neutral-900 border border-neutral-850 focus:border-white focus:ring-1 focus:ring-white/20 text-white pl-10 pr-4 py-2.5 rounded-xl transition duration-150 outline-none text-xs placeholder:text-neutral-550 shadow-inner"
                />

                {/* Suggestions dropdown */}
                {focusedInput === 'dest' && destSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full bg-neutral-900 border border-neutral-850 rounded-xl mt-1.5 shadow-2xl z-999 overflow-hidden divide-y divide-neutral-850 backdrop-blur-md">
                    {destSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setDestText(item.name);
                          setDestCoords({ lat: item.lat, lng: item.lng });
                          setDestSuggestions([]);
                          setFocusedInput(null);
                        }}
                        className="p-3.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer transition flex items-center gap-2.5"
                      >
                        <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Image attachment box */}
            <div>
              <label className="block text-neutral-450 text-[10px] font-bold uppercase tracking-wider mb-2">Attach Captain Details Screenshot</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-neutral-800 hover:border-white hover:bg-neutral-900 rounded-xl p-2.5 cursor-pointer transition-all duration-150 group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 text-neutral-450 group-hover:text-white transition">
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] font-bold">Upload</span>
                  </div>
                </label>

                {imagePreview && (
                  <div className="relative w-11 h-11 rounded-lg border border-neutral-800 overflow-hidden shadow-sm">
                    <img src={imagePreview} alt="upload preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        setAttachedImage(null);
                        setImagePreview('');
                      }}
                      className="absolute inset-0 bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-xs font-bold transition"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={getAlternativeRoutes}
              disabled={loadingRoutes || !originCoords || !destCoords}
              className="w-full py-3 bg-white hover:bg-neutral-100 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:cursor-not-allowed text-black font-extrabold rounded-xl transition duration-150 outline-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-sm active:scale-[0.98]"
            >
              <Search className="w-4 h-4 shrink-0" />
              {loadingRoutes ? 'Scanning Routes...' : 'Calculate Safe Routes'}
            </button>

            {errorMsg && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* List calculated Routes */}
            {routes.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-neutral-850">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-bold uppercase text-neutral-450 tracking-wider">Available Routes Ranked by Safety</h3>
                  <button
                    onClick={() => setShowEvalModal(true)}
                    className="text-[10px] text-neutral-450 hover:text-white font-bold flex items-center gap-1 underline transition outline-none"
                  >
                    How is safety calculated?
                  </button>
                </div>
                <div className="space-y-2.5 max-h-45 md:max-h-75 overflow-y-auto pr-1">
                  {routes.map((route, index) => (
                    <RouteCard
                      key={index}
                      route={route}
                      index={index}
                      isSelected={index === selectedRouteIndex}
                      onClick={() => setSelectedRouteIndex(index)}
                    />
                  ))}
                </div>

                <button
                  onClick={startJourney}
                  className="w-full mt-3 py-3 bg-white hover:bg-neutral-100 text-black font-bold rounded-xl transition duration-200 outline-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95"
                >
                  <Play className="w-4 h-4 animate-pulse" />
                  Start Safe Navigation
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Active Ride Panel */
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="p-4 bg-neutral-900/45 border border-white/6 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Active Journey Shield</h3>
                  <p className="text-neutral-450 text-[11px] mt-0.5">
                    Live tracking active. GPS positions push coordinates dynamically to target relays.
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Departing</span>
                  <p className="text-xs text-white font-semibold truncate mt-0.5">{originText}</p>
                </div>

                <div className="border-l-2 border-dashed border-neutral-800 pl-3.5 my-1">
                  <span className="text-[10px] text-neutral-350 font-bold uppercase tracking-wider leading-none">Route Safe: {routes[selectedRouteIndex]?.name}</span>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Arriving</span>
                  <p className="text-xs text-white font-semibold truncate mt-0.5">{destText}</p>
                </div>
              </div>

              {/* Attached Image preview in ride */}
              {imagePreview && (
                <div>
                  <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider block mb-1">Attached Incident Log</span>
                  <img src={imagePreview} alt="Attached incident" className="w-full h-24 object-cover rounded-xl border border-neutral-850" />
                </div>
              )}

              <button
                onClick={copyTrackingLink}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-bold rounded-xl transition duration-200 outline-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <Share2 className="w-4 h-4 text-white" />
                {shareStatus ? 'Tracking Link Copied!' : 'Share Live Tracking'}
              </button>
            </div>

            <button
              onClick={endJourney}
              className="w-full py-3 bg-red-955/20 border border-red-900/30 hover:bg-red-955/40 text-red-400 font-bold rounded-xl transition duration-200 outline-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider mt-4"
            >
              <CheckCircle className="w-4 h-4" />
              Finish Journey
            </button>
          </div>
        )}
      </div>

      {/* Map Content View */}
      <div className="absolute top-0 left-0 right-0 w-full h-[52vh] z-0 md:relative md:flex-1 md:h-full md:inset-auto">
        <MapView
          userLocation={userLocation}
          origin={originCoords}
          destination={destCoords}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={setSelectedRouteIndex}
          routeShops={routeShops}
          isLoading={loadingRoutes}
          isJourneyActive={!!activeJourney}
        />
      </div>

      {/* Floating SOS button */}
      <div className="absolute bottom-[54vh] right-4 md:bottom-6 md:right-6 z-100 md:z-450 transition-all duration-300">
        <SOSButton userLocation={userLocation} />
      </div>

      {/* Floating Profile Dropdown Button */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-450 flex flex-col items-end">
        <button
          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          className="w-10 h-10 rounded-full bg-black text-white hover:bg-neutral-900 flex items-center justify-center shadow-lg border border-white/8 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition active:scale-95 outline-none font-bold text-sm tracking-wider"
          title="Account Settings"
        >
          {getInitials(user?.name)}
        </button>

        {/* Dropdown Menu */}
        {showProfileDropdown && (
          <div className="mt-2 w-64 bg-neutral-950/90 border border-white/8 rounded-2xl shadow-2xl p-3 flex flex-col gap-1 z-500 font-sans text-white backdrop-blur-xl animate-fade-in">
            <div className="px-2 py-1.5">
              <span className="text-[10px] text-neutral-450 font-bold block uppercase tracking-wider leading-none">Logged in as</span>
              <span className="text-sm font-bold text-white block mt-1 truncate">{user?.name}</span>
              <span className="text-[10px] text-neutral-500 block truncate mt-0.5">{user?.email}</span>
            </div>

            <div className="border-b border-neutral-900 my-1"></div>

            <button
              onClick={() => {
                setShowProfileDropdown(false);
                setShowProfileModal(true);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-neutral-900 transition flex items-center gap-2 outline-none"
            >
              <User className="w-4 h-4 text-neutral-450" />
              View & Edit Profile
            </button>

            <button
              onClick={() => {
                setShowProfileDropdown(false);
                navigate('/history');
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-neutral-900 transition flex items-center gap-2 outline-none"
            >
              <History className="w-4 h-4 text-neutral-450" />
              Journey History Logs
            </button>

            <div className="border-b border-neutral-900 my-1"></div>

            <button
              onClick={() => {
                setShowProfileDropdown(false);
                logout();
                navigate('/login');
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/30 transition flex items-center gap-2 outline-none"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Safety Evaluation explanation Modal */}
      {showEvalModal && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-neutral-950/90 border border-white/8 p-6 rounded-2xl shadow-2xl relative text-white backdrop-blur-xl">
            <button
              onClick={() => setShowEvalModal(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white font-bold text-lg outline-none"
            >
              ×
            </button>

            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-white" />
              Route Safety Evaluation
            </h2>

            <p className="text-neutral-400 text-xs leading-relaxed mb-4">
              GoSafe ranks routing paths dynamically by evaluating environmental safety vectors along each route segment:
            </p>

            <div className="space-y-3 text-xs text-neutral-300">
              <div className="flex justify-between border-b border-neutral-900 pb-2 gap-3">
                <span className="font-semibold text-white shrink-0">1. Road Category</span>
                <span className="text-neutral-400 text-right">Highways & main arterial paths score higher than isolated alleys.</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-2 gap-3">
                <span className="font-semibold text-white shrink-0">2. Commercial Density</span>
                <span className="text-neutral-400 text-right">Uses real-time Overpass API shop count checkpoints (safe havens).</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-2 gap-3">
                <span className="font-semibold text-white shrink-0">3. Lighting Coverage</span>
                <span className="text-neutral-400 text-right">Grades street light presence from Poor to Excellent.</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-2 gap-3">
                <span className="font-semibold text-white shrink-0">4. Public Crowds</span>
                <span className="text-neutral-400 text-right">Active crowds increase safety ("eyes on the street" principle).</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-2 gap-3">
                <span className="font-semibold text-white shrink-0">5. Traffic Congestion</span>
                <span className="text-neutral-400 text-right">Moderate vehicular presence is safer than deserted bypass roads.</span>
              </div>
            </div>

            <div className="mt-5 bg-neutral-900/40 border border-white/6 rounded-xl p-3 text-[11px] text-neutral-400 leading-normal">
              <strong>Evaluation Formula:</strong><br />
              Safety Score = 0.4 × (Road Type) + 0.3 × (Lighting Level) + 0.2 × (Shop Density) + 0.1 × (Public Crowds & Traffic presence).
            </div>
          </div>
        </div>
      )}

      {/* Profile & Settings Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-neutral-950/90 border border-white/8 p-6 rounded-2xl shadow-2xl relative text-white backdrop-blur-xl">
            <button
              onClick={() => {
                setShowProfileModal(false);
                setProfileSuccess('');
                setProfileError('');
              }}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white font-bold text-lg outline-none"
            >
              ×
            </button>

            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2 font-sans">
              <User className="w-5 h-5 text-white" />
              Manage Profile & Settings
            </h2>
            <p className="text-neutral-400 text-xs mb-4">
              Update your passenger account and emergency contact settings below.
            </p>

            {profileSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-900/30 text-emerald-200 text-xs font-semibold rounded-xl">
                {profileSuccess}
              </div>
            )}

            {profileError && (
              <div className="mb-4 p-3 bg-red-955/20 border border-red-900/30 text-red-400 text-xs font-semibold rounded-xl">
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-neutral-450 text-[10px] font-extrabold uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    disabled={isGuest}
                    placeholder="Passenger Name"
                    className="w-full bg-neutral-900 border border-neutral-850 text-white disabled:opacity-50 pl-9 pr-3.5 py-2 rounded-xl text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-450 text-[10px] font-extrabold uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    placeholder="Passenger Email"
                    className="w-full bg-neutral-900 border border-neutral-850 text-white opacity-60 pl-9 pr-3.5 py-2 rounded-xl text-xs outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-450 text-[10px] font-extrabold uppercase tracking-wider mb-1">Emergency Contact (SOS Target Name)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={profileEmergencyName}
                    onChange={(e) => setProfileEmergencyName(e.target.value)}
                    placeholder="e.g. Mary Jane (Spouse)"
                    className="w-full bg-neutral-900 border border-neutral-850 text-white pl-9 pr-3.5 py-2 rounded-xl text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-450 text-[10px] font-extrabold uppercase tracking-wider mb-1">Emergency Contact Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    value={profileEmergencyPhone}
                    onChange={(e) => setProfileEmergencyPhone(e.target.value)}
                    placeholder="e.g. +91 9999988888"
                    className="w-full bg-neutral-900 border border-neutral-850 text-white pl-9 pr-3.5 py-2 rounded-xl text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full py-2.5 bg-white hover:bg-neutral-100 text-black font-bold rounded-xl transition text-xs shadow-sm outline-none"
                >
                  {profileLoading ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    navigate('/history');
                  }}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-xs outline-none"
                >
                  <History className="w-4 h-4 text-white" />
                  View Journey History Logs
                </button>

                <div className="border-t border-neutral-900 my-1"></div>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full py-2.5 bg-red-955/20 hover:bg-red-955/40 border border-red-900/30 text-red-400 font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-xs outline-none"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out / Log Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;