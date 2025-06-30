import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

const AuthContext = createContext({
  token: null,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  loading: true,
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkToken = useCallback(async () => {
    const storedToken = await AsyncStorage.getItem('accessToken');
    if (storedToken && !isTokenExpired(storedToken)) {
      setToken(storedToken);
    } else {
      setToken(null);
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  const login = async (accessToken, refreshToken, userData) => {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
    setToken(accessToken);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{
      token,
      isAuthenticated: !!token,
      login,
      logout,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 