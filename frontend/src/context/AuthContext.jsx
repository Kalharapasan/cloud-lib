import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  // Restore session and theme on mount
  useEffect(() => {
    // 1. Session restore
    const savedToken = localStorage.getItem('cloudlib_token');
    const savedUser = localStorage.getItem('cloudlib_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);

    // 2. Theme restore
    const savedTheme = localStorage.getItem('cloudlib_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('cloudlib_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    localStorage.setItem('cloudlib_token', jwt);
    localStorage.setItem('cloudlib_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (name, email, password, role, studentId, phone, department) => {
    const res = await API.post('/auth/register', { name, email, password, role, studentId, phone, department });
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    localStorage.setItem('cloudlib_token', jwt);
    localStorage.setItem('cloudlib_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('cloudlib_token');
    localStorage.removeItem('cloudlib_user');
  };

  const value = {
    user,
    token,
    loading,
    theme,
    isAuthenticated: !!token,
    isAdmin: user?.Role === 'Admin',
    isStudent: user?.Role === 'Student',
    login,
    register,
    logout,
    toggleTheme
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
