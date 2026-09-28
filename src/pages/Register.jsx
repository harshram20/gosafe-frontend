import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Shield, User, Mail, Lock, Phone, UserCheck, HelpCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
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

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    securityQuestion: 'What is the name of your first school?',
    securityAnswer: ''
  });

  const [showPassword, setShowPassword] = useState(false);
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
      newToken = encodeState({ status: "processing", action: "creating-account", ts: loadStartTs || Date.now() });
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const { name, email, password, confirmPassword, emergencyContactName, emergencyContactPhone, securityQuestion, securityAnswer } = formData;

    // Field Validations
    if (!name || !email || !password || !confirmPassword || !emergencyContactName || !emergencyContactPhone || !securityAnswer) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          emergencyContactName,
          emergencyContactPhone,
          securityQuestion,
          securityAnswer
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      setSuccess('Account registered successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Registration server error.');
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
          <span className="text-xl ml-4 font-bold tracking-tight text-white font-sans">Register</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-4 relative">
        {/* Reusable B&W Map Background */}
        <AuthBackground />

        <div className="w-full max-w-xl bg-neutral-950/10 backdrop-blur-md border border-white/8 p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative z-10 before:content-[''] before:absolute before:-top-px before:left-1/2 before:-translate-x-1/2 before:w-2/3 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/60 before:to-transparent animate-auth-page">

          {error && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-200 text-sm rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-550 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-sm rounded-xl flex items-start gap-2.5">
              <UserCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            {/* Section 1: User Account */}
            <div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      name="name"
                      placeholder="Your Full Name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none placeholder:text-neutral-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      name="email"
                      placeholder="xyz@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none placeholder:text-neutral-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none placeholder:text-neutral-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none placeholder:text-neutral-600"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Emergency Contact */}
            <div>
              <h2 className="text-sm font-bold text-white border-b border-neutral-900 pb-1.5 mb-4">Emergency Contact (SOS Target)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Contact Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      name="emergencyContactName"
                      placeholder="Emergency Contact Name"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                      className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none placeholder:text-neutral-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Phone Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      placeholder="e.g. +91 9999988888"
                      value={formData.emergencyContactPhone}
                      onChange={handleChange}
                      className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none placeholder:text-neutral-600"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Recovery Question */}
            <div>
              <h2 className="text-sm font-bold text-white border-b border-neutral-900 pb-1.5 mb-4">Security Recovery Question</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-neutral-300 text-xs font-semibold mb-2">Select a Question</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                      <HelpCircle className="w-4 h-4" />
                    </span>
                    <select
                      name="securityQuestion"
                      value={formData.securityQuestion}
                      onChange={handleChange}
                      className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    >
                      <option value="What is the name of your first school?">What is the name of your first school?</option>
                      <option value="What is the city you were born in?">What is the city you were born in?</option>
                      <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                      <option value="What was the name of your childhood pet?">What was the name of your childhood pet?</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">Answer</label>
                  <input
                    type="text"
                    name="securityAnswer"
                    placeholder="Provide your secret answer"
                    value={formData.securityAnswer}
                    onChange={handleChange}
                    className="w-full bg-neutral-900 border border-neutral-850 focus:border-white text-white px-4 py-2.5 rounded-xl text-sm outline-none placeholder:text-neutral-600"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-linear-to-b from-white to-neutral-200 hover:from-neutral-100 hover:to-neutral-300 text-black font-extrabold rounded-xl transition duration-200 outline-none focus:ring-2 focus:ring-white/50 shadow-md disabled:opacity-50 text-sm"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-450">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:underline font-semibold underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;