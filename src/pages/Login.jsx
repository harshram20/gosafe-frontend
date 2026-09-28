import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Shield, Mail, Lock, UserCheck, AlertTriangle, User, ArrowRight } from 'lucide-react';
import AuthBackground from '../components/AuthBackground';

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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Guest State
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestEmergencyName, setGuestEmergencyName] = useState('');
  const [guestEmergencyPhone, setGuestEmergencyPhone] = useState('');
  const [guestError, setGuestError] = useState('');

  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [loadStartTs, setLoadStartTs] = useState(null);

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
      newToken = encodeState({ status: "processing", action: "signing-in", ts: loadStartTs || Date.now() });
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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password.');
      }

      login(data.token, {
        id: data.id,
        name: data.name,
        email: data.email,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        role: data.role
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = (e) => {
    e.preventDefault();
    if (!guestEmergencyName || !guestEmergencyPhone) {
      setGuestError('Emergency contact details are highly recommended to use the SOS system.');
      return;
    }
    loginAsGuest(guestEmergencyName, guestEmergencyPhone);
    navigate('/dashboard');
  };

  // bypassGuestModal removed to enforce emergency contact inputs

  return (
    <div className="relative min-h-screen bg-black text-white overflow-y-auto flex flex-col">
      {/* Top Nav Bar */}
      <div className="w-full h-14 flex items-center justify-center px-6 z-20  bg-neutral-950/20 backdrop-blur-xl select-none shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-1">
          <img src="/gosafe-logo.png" alt="" className='h-10 w-10' />
          <span className="text-xl font-bold tracking-tight text-white font-sans shimmer-text inline-block">GoSafe</span>
          <span className="text-xl font-bold ml-4 tracking-tight text-white font-sans">|</span>
          <span className="text-xl ml-4 font-bold tracking-tight text-white font-sans">Login</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative">
        {/* Reusable B&W Map Background */}
        <AuthBackground />

        <div className="w-full max-w-md bg-neutral-950/10 backdrop-blur-md border border-white/8 p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative z-10 before:content-[''] before:absolute before:-top-px before:left-1/2 before:-translate-x-1/2 before:w-2/3 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/60 before:to-transparent animate-auth-page">



          {error && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-200 text-sm rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-550 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-850 focus:border-white focus:ring-1 focus:ring-white/20 text-white pl-10 pr-4 py-3 rounded-xl transition outline-none text-sm placeholder:text-neutral-600"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" className="text-xs text-white hover:underline font-semibold">Forgot password?</Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-850 focus:border-white focus:ring-1 focus:ring-white/20 text-white pl-10 pr-4 py-3 rounded-xl transition outline-none text-sm placeholder:text-neutral-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-linear-to-b from-white to-neutral-200 hover:from-neutral-100 hover:to-neutral-300 text-black font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] duration-200 outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-4 items-center">
            <div className="grow border-t border-neutral-900"></div>
            <span className="shrink mx-4 text-neutral-500 text-xs uppercase font-medium">or</span>
            <div className="grow border-t border-neutral-900"></div>
          </div>

          <button
            onClick={() => setShowGuestModal(true)}
            className="w-full py-3 px-4 bg-transparent hover:bg-neutral-900 border border-neutral-800 text-white font-semibold rounded-xl transition-all outline-none text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <User className="w-4 h-4 text-white" />
            Continue as Guest
          </button>

          <p className="mt-8 text-center text-sm text-neutral-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-white hover:underline font-semibold underline underline-offset-4">
              Register now
            </Link>
          </p>
        </div>

        {/* Guest Mode Configuration Modal */}
        {showGuestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-neutral-950 border border-neutral-900 p-6 rounded-2xl shadow-xl relative">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                <UserCheck className="w-5 h-5 text-white" />
                Configure Guest Profile
              </h2>
              <p className="text-neutral-400 text-sm mb-6">
                GoSafe runs in Guest mode privately. Please add an emergency contact to enable SOS alerts.
              </p>

              {guestError && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl">
                  {guestError}
                </div>
              )}

              <form onSubmit={handleGuestLogin} className="space-y-4">
                <div>
                  <label className="block text-neutral-300 text-xs font-semibold mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe (Father)"
                    value={guestEmergencyName}
                    onChange={(e) => setGuestEmergencyName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white px-3.5 py-2.5 rounded-xl outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 text-xs font-semibold mb-1">Emergency Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={guestEmergencyPhone}
                    onChange={(e) => setGuestEmergencyPhone(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white px-3.5 py-2.5 rounded-xl outline-none text-sm"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-white hover:bg-neutral-100 text-black text-xs font-bold rounded-xl transition shadow-md active:scale-[0.98] outline-none"
                  >
                    Start Guest Mode
                  </button>
                </div>
              </form>

              <button
                onClick={() => setShowGuestModal(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white font-semibold text-lg"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;