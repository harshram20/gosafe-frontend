import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const API_BASE_URL = 'https://gosafe-server.onrender.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize authentication state on load
  useEffect(() => {
    // Clean up legacy 911 guest values if present
    if (localStorage.getItem('gosafe_guest_emergency_phone') === '911') {
      localStorage.removeItem('gosafe_isguest');
      localStorage.removeItem('gosafe_guest_emergency_name');
      localStorage.removeItem('gosafe_guest_emergency_phone');
    }

    const savedToken = localStorage.getItem('gosafe_token');
    const savedUser = localStorage.getItem('gosafe_user');
    const savedGuest = localStorage.getItem('gosafe_isguest');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsGuest(false);
    } else if (savedGuest === 'true') {
      setIsGuest(true);
      setUser({
        name: 'Guest Traveler',
        email: 'guest@gosafe.local',
        emergencyContactName: localStorage.getItem('gosafe_guest_emergency_name') || 'Emergency Contact',
        emergencyContactPhone: localStorage.getItem('gosafe_guest_emergency_phone') || '',
        role: 'ROLE_GUEST'
      });
    }
    setLoading(false);
  }, []);

  const login = (accessToken, userData) => {
    localStorage.setItem('gosafe_token', accessToken);
    localStorage.setItem('gosafe_user', JSON.stringify(userData));
    localStorage.removeItem('gosafe_isguest');
    
    setToken(accessToken);
    setUser(userData);
    setIsGuest(false);
  };

  const loginAsGuest = (emergencyName = '', emergencyPhone = '') => {
    localStorage.setItem('gosafe_isguest', 'true');
    localStorage.setItem('gosafe_guest_emergency_name', emergencyName);
    localStorage.setItem('gosafe_guest_emergency_phone', emergencyPhone);
    localStorage.removeItem('gosafe_token');
    localStorage.removeItem('gosafe_user');

    setIsGuest(true);
    setUser({
      name: 'Guest Traveler',
      email: 'guest@gosafe.local',
      emergencyContactName: emergencyName || 'Emergency Contact',
      emergencyContactPhone: emergencyPhone || '',
      role: 'ROLE_GUEST'
    });
  };

  const updateGuestEmergencyContact = (name, phone) => {
    if (isGuest) {
      localStorage.setItem('gosafe_guest_emergency_name', name);
      localStorage.setItem('gosafe_guest_emergency_phone', phone);
      setUser(prev => ({
        ...prev,
        emergencyContactName: name,
        emergencyContactPhone: phone
      }));
    }
  };

  const updateUserProfile = (name, emergencyName, emergencyPhone) => {
    setUser(prev => {
      const updatedUser = {
        ...prev,
        name,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone
      };
      localStorage.setItem('gosafe_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const logout = () => {
    localStorage.removeItem('gosafe_token');
    localStorage.removeItem('gosafe_user');
    localStorage.removeItem('gosafe_isguest');
    localStorage.removeItem('gosafe_guest_emergency_name');
    localStorage.removeItem('gosafe_guest_emergency_phone');

    setToken(null);
    setUser(null);
    setIsGuest(false);
  };

  // Helper for API fetch that automatically appends Auth token
  const authenticatedFetch = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token && !isGuest) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isGuest,
      loading,
      login,
      loginAsGuest,
      logout,
      updateGuestEmergencyContact,
      updateUserProfile,
      authenticatedFetch
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);