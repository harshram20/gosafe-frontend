import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, History as HistoryIcon, Calendar, Navigation, Car, AlertTriangle, ShieldCheck, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';

const encodeState = (stateObj) => {
  try {
    const jsonString = JSON.stringify(stateObj);
    return btoa(unescape(encodeURIComponent(jsonString)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    return '';
  }
};

const History = () => {
  const { user, isGuest, authenticatedFetch } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Image preview state
  const [selectedImage, setSelectedImage] = useState(null);

  const navigate = useNavigate();
  const [loadStartTs, setLoadStartTs] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  // Set loading timestamp
  useEffect(() => {
    if (loading && !loadStartTs) {
      setLoadStartTs(Date.now());
    } else if (!loading && loadStartTs) {
      setLoadStartTs(null);
    }
  }, [loading, loadStartTs]);

  // Sync processing state to URL query parameters in encoded form
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    const currentToken = searchParams.get('token');

    let newToken = null;
    if (loading) {
      newToken = encodeState({ status: "processing", action: "fetching-history", ts: loadStartTs || Date.now() });
    }

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
  }, [loading, loadStartTs, searchParams, setSearchParams]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');

    try {
      if (isGuest) {
        // Load from LocalStorage
        const localHistory = JSON.parse(localStorage.getItem('gosafe_guest_history') || '[]');
        setHistory(localHistory);
      } else {
        // Fetch from Spring Boot JPA REST endpoint
        const res = await authenticatedFetch('/api/journeys');
        const data = await res.json();
        if (res.ok) {
          setHistory(data);
        } else {
          throw new Error(data.message || 'Failed to fetch history from cloud database.');
        }
      }
    } catch (err) {
      setError(err.message || 'Error connecting to database.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSingleJourney = async (id) => {
    if (!window.confirm("Are you sure you want to delete this journey log from your history?")) {
      return;
    }

    try {
      if (isGuest) {
        // Delete from local storage
        const localHistory = JSON.parse(localStorage.getItem('gosafe_guest_history') || '[]');
        const updatedHistory = localHistory.filter(item => item.id !== id);
        localStorage.setItem('gosafe_guest_history', JSON.stringify(updatedHistory));
        setHistory(updatedHistory);
      } else {
        // Delete from Spring Boot backend database
        const res = await authenticatedFetch(`/api/journeys/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setHistory(prev => prev.filter(item => item.id !== id));
        } else {
          const data = await res.json();
          throw new Error(data.message || 'Failed to delete journey log.');
        }
      }
    } catch (err) {
      alert(err.message || 'Error deleting journey log.');
    }
  };

  const clearAllHistory = async () => {
    if (!window.confirm("WARNING: Are you sure you want to delete your entire journey log history? This action is permanent and cannot be undone.")) {
      return;
    }

    try {
      if (isGuest) {
        // Clear from local storage
        localStorage.removeItem('gosafe_guest_history');
        setHistory([]);
      } else {
        // Clear from Spring Boot backend database
        const res = await authenticatedFetch('/api/journeys', {
          method: 'DELETE'
        });
        if (res.ok) {
          setHistory([]);
        } else {
          const data = await res.json();
          throw new Error(data.message || 'Failed to clear journey history.');
        }
      }
    } catch (err) {
      alert(err.message || 'Error clearing journey history.');
    }
  };

  const getSafetyColor = (rating) => {
    if (rating >= 8) return 'text-emerald-400 border-emerald-950/45 bg-emerald-955/20';
    if (rating >= 5) return 'text-amber-400 border-amber-955/45 bg-amber-955/20';
    return 'text-red-400 border-red-955/45 bg-red-955/20';
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">

        {/* Navigation back header */}
        <div className="flex items-center justify-between mb-8 pb-2 border-b border-zinc-850">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-zinc-900 rounded-xl transition text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 text-white/50" />
            </button>
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-white" />
              <h1 className="text-xl font-bold text-white tracking-wide">Journey Log History</h1>
            </div>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearAllHistory}
              className="px-3.5 py-1.5 bg-red-955/10 border border-red-900/30 hover:bg-red-955/25 text-red-400 hover:text-red-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition duration-150 flex items-center gap-1.5 shadow-sm outline-none"
              title="Clear all history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>All</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-sm rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-white animate-spin"></div>
            <span className="text-xs font-semibold">Retrieving history logs...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 border border-zinc-850 rounded-2xl p-12 bg-zinc-900/20 backdrop-blur-md shadow-2xl">
            <FileText className="w-12 h-12 text-zinc-500 mb-3" />
            <h3 className="text-sm font-bold text-zinc-200">No Journeys Logged Yet</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs text-center">
              Your navigation path history reports will appear here once you start and finish a GoSafe journey.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-5 py-2.5 bg-white hover:bg-zinc-250 text-black font-bold text-xs rounded-xl transition shadow-md"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((journey) => {
              const formattedDate = new Date(journey.createdAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              });

              return (
                <div
                  key={journey.id}
                  className="bg-zinc-900/40 border border-zinc-850 hover:border-zinc-750 p-5 rounded-2xl transition duration-150 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xl backdrop-blur-md"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-5 flex-1 w-full min-w-0">
                    {/* Route screenshot thumbnail */}
                    {journey.routeScreenshot && (
                      <div
                        onClick={() => setSelectedImage(journey.routeScreenshot)}
                        className="relative w-full md:w-36 h-28 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden cursor-pointer hover:border-zinc-650 transition duration-150 shrink-0 group shadow-md"
                      >
                        <img
                          src={journey.routeScreenshot}
                          alt="Route Map Screenshot"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                          <span className="text-[10px] font-bold text-white bg-zinc-900/95 border border-zinc-800 px-2.5 py-1 rounded-lg tracking-wider uppercase">View Map</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-zinc-555" />
                        <span>{formattedDate}</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block shrink-0 ring-4 ring-emerald-500/10"></span>
                          <p className="text-xs text-zinc-200 font-semibold truncate max-w-lg" title={journey.originName}>{journey.originName}</p>
                        </div>
                        <div className="w-0.5 h-2 bg-zinc-800 border-l border-dashed border-zinc-700 ml-1"></div>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block shrink-0 ring-4 ring-red-500/10"></span>
                          <p className="text-xs text-zinc-200 font-semibold truncate max-w-lg" title={journey.destinationName}>{journey.destinationName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-semibold pt-2 border-t border-zinc-850">
                        <div className="flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{journey.distance.toFixed(1)} km</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{Math.round(journey.duration)} mins</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {journey.attachedImage && (
                      <button
                        onClick={() => setSelectedImage(journey.attachedImage)}
                        className="p-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 rounded-xl border border-zinc-700 transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
                        title="View Incident Photo"
                      >
                        <ImageIcon className="w-4 h-4 text-sky-400" />
                        <span>View Photo</span>
                      </button>
                    )}

                    <div className={`px-4 py-2 border rounded-xl font-extrabold text-xs flex flex-col items-center leading-tight min-w-21.25 ${getSafetyColor(journey.safetyRating)}`}>
                      <span className="text-[10px] opacity-80 uppercase font-bold tracking-wider leading-none">Safety</span>
                      <span className="text-sm mt-0.5">{journey.safetyRating}/10</span>
                    </div>

                    <button
                      onClick={() => deleteSingleJourney(journey.id)}
                      className="p-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-red-400 rounded-xl border border-zinc-800 hover:border-red-900/50 transition duration-150 shadow-sm outline-none"
                      title="Delete Journey Log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Image preview overlay modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative max-w-3xl w-full max-h-[85vh] overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full p-2.5 z-10 border border-zinc-800 transition duration-150 outline-none"
            >
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
            <div className="p-4 flex items-center justify-center h-full bg-zinc-950/40">
              <img src={selectedImage} alt="Journey preview upload" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;