import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { AlertOctagon, ShieldAlert, X, Volume2, VolumeX } from 'lucide-react';

const SOSButton = ({ userLocation }) => {
  const { user, isGuest, authenticatedFetch } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isActive, setIsActive] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [sosCoordinates, setSosCoordinates] = useState({ lat: 28.6139, lng: 77.2090 });

  const countdownIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Web Audio API Siren simulation
  const startSiren = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      oscillatorRef.current = osc;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      let toggle = false;
      sirenIntervalRef.current = setInterval(() => {
        toggle = !toggle;
        if (osc && ctx) {
          osc.frequency.exponentialRampToValueAtTime(
            toggle ? 1100 : 700,
            ctx.currentTime + 0.35
          );
        }
      }, 400);
    } catch (e) {
      console.error('Audio Context not allowed or supported', e);
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (err) { }
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (err) { }
      audioCtxRef.current = null;
    }
  };

  // Handle countdown updates
  useEffect(() => {
    if (isActive) {
      if (countdown > 0) {
        countdownIntervalRef.current = setTimeout(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
      } else {
        // Countdown reached 0: dispatch SOS request to API
        triggerSosAlert();
      }
    }
    return () => {
      if (countdownIntervalRef.current) clearTimeout(countdownIntervalRef.current);
    };
  }, [countdown, isActive]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => stopSiren();
  }, []);

  const triggerSosAlert = async () => {
    setIsActive(false);
    setErrorMsg('');

    // Acquire current GPS coordinates. Use userLocation props or query browser geolocation direct
    let lat = 28.6139;
    let lng = 77.2090;

    if (userLocation) {
      lat = userLocation.lat;
      lng = userLocation.lng;
    } else {
      // Direct geolocator fallback
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {
        console.warn('Geolocation capture failed, using default coordinates', e);
      }
    }

    setSosCoordinates({ lat, lng });

    try {
      const payload = {
        latitude: lat,
        longitude: lng,
        message: 'EMERGENCY! I need immediate help!'
      };

      // Add guest contact credentials if in guest mode
      if (isGuest) {
        payload.guestEmergencyName = user.emergencyContactName;
        payload.guestEmergencyPhone = user.emergencyContactPhone;
      }

      const res = await authenticatedFetch('/api/sos/trigger', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to dispatch SOS alert.');
      }

      setResultMessage(data.message);

      // Attempt to auto-redirect to WhatsApp
      const whatsappText = `ALERT! GoSafe EMERGENCY. Traveler ${user?.name || 'Guest Traveler'} is in distress. Coordinates: (${lat.toFixed(6)}, ${lng.toFixed(6)}). Track live: ${window.location.origin}/share-tracking?lat=${lat}&lng=${lng}`;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(user?.emergencyContactPhone)}&text=${encodeURIComponent(whatsappText)}`;
      try {
        window.open(whatsappUrl, '_blank');
      } catch (e) {
        console.warn('Auto WhatsApp window popup blocked by browser settings.', e);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error triggering SOS. Direct alert failed.');
      stopSiren();
    }
  };

  const handleOpenSos = () => {
    setShowModal(true);
    setIsActive(true);
    setCountdown(3);
    setResultMessage('');
    setErrorMsg('');
    startSiren();
  };

  const handleCancelSos = () => {
    setIsActive(false);
    setShowModal(false);
    stopSiren();
  };

  return (
    <>
      {/* Floating SOS Warning circular button */}
      <button
        onClick={handleOpenSos}
        className="w-10 h-10 rounded-full bg-black hover:bg-neutral-900 text-white font-extrabold flex items-center justify-center flex-col shadow-2xl transition duration-200 outline-none border-4 border-red-500 ring-4 ring-red-500/10 hover:scale-105 active:scale-95 group"
        title="Trigger Emergency SOS"
      >
        <ShieldAlert className="w-3 h-3 animate-pulse group-hover:scale-110 duration-200 text-red-500" />
        <span className="text-[8px] font-sans font-black tracking-widest mt-0.5 text-red-500">SOS</span>
      </button>

      {/* SOS Countdown & Notification Modal */}
      {showModal && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-neutral-200 p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden">
            {/* Glowing red top aura */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-red-600"></div>

            <button
              onClick={handleCancelSos}
              className="absolute top-4 right-4 text-neutral-450 hover:text-neutral-900"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Siren sound control indicator */}
            <button
              onClick={() => {
                if (soundEnabled) {
                  stopSiren();
                } else {
                  startSiren();
                }
                setSoundEnabled(!soundEnabled);
              }}
              className="absolute top-4 left-4 text-neutral-450 hover:text-neutral-900 p-1 rounded-lg hover:bg-neutral-100"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-black" /> : <VolumeX className="w-5 h-5 text-neutral-400" />}
            </button>

            {isActive ? (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-6 animate-ping duration-1000">
                  <AlertOctagon className="w-10 h-10 text-red-550 animate-pulse" />
                </div>

                <h2 className="text-2xl font-black text-red-600 uppercase tracking-widest mb-1">
                  Triggering SOS Alert
                </h2>
                <p className="text-neutral-500 text-sm mb-6">
                  Emergency notifications will be dispatched to your contact: <br />
                  <strong className="text-neutral-800">{user?.emergencyContactName} ({user?.emergencyContactPhone})</strong>
                </p>

                <div className="text-7xl font-black text-neutral-900 font-mono animate-bounce mb-8">
                  {countdown}
                </div>

                <button
                  onClick={handleCancelSos}
                  className="px-8 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold rounded-2xl border border-neutral-300 transition-all text-sm tracking-wider uppercase outline-none shadow-sm"
                >
                  Cancel / Stop Alarm
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {errorMsg ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-6">
                      <AlertOctagon className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-red-600 mb-2">SOS Request Failed</h2>
                    <p className="text-neutral-500 text-sm mb-6">{errorMsg}</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-6">
                      <ShieldAlert className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 mb-2">SOS Dispatch Confirmed!</h2>
                    <p className="text-neutral-500 text-xs mb-4">
                      Emergency alert registered on server. Click the button below to dispatch the message via WhatsApp directly to your contact: <strong className="text-neutral-800">{user?.emergencyContactName} ({user?.emergencyContactPhone})</strong>.
                    </p>

                    <a
                      href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(user?.emergencyContactPhone)}&text=${encodeURIComponent(`ALERT! GoSafe EMERGENCY. Traveler ${user?.name || 'Guest Traveler'} is in distress. Coordinates: (${sosCoordinates.lat.toFixed(6)}, ${sosCoordinates.lng.toFixed(6)}). Track live: ${window.location.origin}/share-tracking?lat=${sosCoordinates.lat}&lng=${sosCoordinates.lng}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition duration-150 shadow-md shadow-emerald-600/10 mb-6 text-xs uppercase tracking-wider outline-none"
                    >
                      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.908-6.995-1.878-1.88-4.357-2.912-6.997-2.914-5.439 0-9.864 4.42-9.868 9.866-.001 1.77.461 3.5 1.34 5.025l-.946 3.454 3.538-.928zM17.15 13.9c-.28-.14-1.654-.816-1.91-.908-.255-.093-.44-.139-.626.139-.185.279-.718.908-.88 1.093-.162.186-.324.209-.604.069-.28-.14-1.183-.436-2.254-1.393-.833-.743-1.395-1.661-1.558-1.94-.163-.28-.018-.431.122-.571.126-.126.28-.325.42-.488.14-.162.186-.279.28-.465.093-.186.046-.349-.023-.488-.069-.14-.625-1.507-.856-2.064-.225-.54-.472-.467-.626-.467h-.534c-.186 0-.488.07-.743.349-.256.279-.974.953-.974 2.327 0 1.373 1.002 2.7 1.141 2.887.139.186 1.972 3.01 4.777 4.22.667.288 1.188.46 1.595.59.67.214 1.28.183 1.76.111.537-.08 1.654-.675 1.884-1.326.23-.651.23-1.21.162-1.326-.068-.116-.254-.185-.534-.325z" />
                      </svg>
                      Send WhatsApp Alert
                    </a>

                    <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl text-left text-xs font-mono text-neutral-800 mb-6 w-full max-h-48 overflow-y-auto">
                      <span className="text-neutral-400 block border-b border-neutral-100 pb-1 mb-1 font-semibold">DISPATCH MESSAGE PAYLOAD:</span>
                      {resultMessage || "SOS registration logs logged on server."}
                    </div>
                  </>
                )}

                <button
                  onClick={handleCancelSos}
                  className="px-8 py-2.5 bg-black hover:bg-neutral-850 text-white text-xs font-semibold rounded-xl transition shadow-md outline-none"
                >
                  Dismiss / Turn Off Siren
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SOSButton;