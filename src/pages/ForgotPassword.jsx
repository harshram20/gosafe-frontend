import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Shield, Mail, HelpCircle, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../context/AuthContext';
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

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email input, 2: Security Q&A + Reset Password
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

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
      const action = step === 1 ? 'searching-user' : 'resetting-password';
      newToken = encodeState({ status: "processing", action, ts: loadStartTs || Date.now() });
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
  }, [loading, step, loadStartTs, searchParams, setSearchParams]);

  const handleFetchQuestion = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Email not found.');
      }

      setSecurityQuestion(data.securityQuestion);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Forgot password query error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!securityAnswer || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          securityAnswer,
          newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Incorrect security answer.');
      }

      setSuccess('Your password has been reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-y-auto flex flex-col">
      {/* Top Nav Bar */}
      <div className="w-full h-14 flex items-center justify-center px-6 z-20  bg-neutral-950/20 backdrop-blur-xl select-none shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-1">
          <img src="/gosafe-logo.png" alt="" className='h-10 w-10' />
          <span className="text-xl font-bold tracking-tight text-white font-sans shimmer-text inline-block">GoSafe</span>
          <span className="text-xl font-bold ml-4 tracking-tight text-white font-sans">|</span>
          <span className="text-xl ml-4 font-bold tracking-tight text-white font-sans">Reset Password</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative">
        {/* Reusable B&W Map Background */}
        <AuthBackground />

        <div className="w-full max-w-md bg-neutral-950/10 backdrop-blur-md border border-white/8 p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative z-10 text-white animate-auth-page">
          {error && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-200 text-sm rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-550 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-sm rounded-xl flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleFetchQuestion} className="space-y-5">
              <div>
                <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-850 focus:border-white focus:ring-1 focus:ring-white/20 text-white pl-10 pr-4 py-3 rounded-xl outline-none text-sm placeholder:text-neutral-600"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-white hover:bg-neutral-100 text-black font-extrabold rounded-xl transition duration-200 outline-none focus:ring-2 focus:ring-white/50 shadow-md"
              >
                {loading ? 'Searching...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="p-4 bg-neutral-900 border border-neutral-850 rounded-xl mb-4">
                <span className="text-neutral-400 text-xs uppercase font-semibold">Security Question:</span>
                <p className="text-white text-sm font-semibold mt-1">{securityQuestion}</p>
              </div>

              <div>
                <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Answer</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                    <HelpCircle className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Provide security answer"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm placeholder:text-neutral-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm placeholder:text-neutral-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm placeholder:text-neutral-600"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 px-4 bg-transparent hover:bg-neutral-900 border border-neutral-800 text-white text-xs font-bold rounded-xl transition shadow-sm outline-none"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-neutral-100 text-black text-xs font-extrabold rounded-xl transition shadow-md outline-none"
                >
                  {loading ? 'Resetting...' : 'Reset'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-neutral-400">
            Remember credentials?{' '}
            <Link to="/login" className="text-white hover:underline font-semibold underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;