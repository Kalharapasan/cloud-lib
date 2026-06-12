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

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('cloudlib_token');
    const savedUser = localStorage.getItem('cloudlib_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

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
    isAuthenticated: !!token,
    isAdmin: user?.Role === 'Admin',
    isStudent: user?.Role === 'Student',
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
