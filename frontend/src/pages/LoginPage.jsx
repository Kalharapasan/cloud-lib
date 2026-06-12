import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userData;
      if (isLogin) {
        userData = await login(email, password);
      } else {
        if (!name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        if (role === 'Student' && !studentId.trim()) {
          setError('Student ID is required');
          setLoading(false);
          return;
        }
        userData = await register(name, email, password, role, studentId, phone, department);
      }

      // Redirect based on role
      if (userData.Role === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Floating Theme Toggle (Top Right) */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          background: 'var(--card-bg-light)',
          border: '1px solid var(--card-border-light)',
          color: 'var(--text-main)',
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.625rem',
          cursor: 'pointer',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          zIndex: 10,
        }}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Background Decoration */}
      <div style={{
        position: 'absolute',
        width: '30rem',
        height: '30rem',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        top: '-10rem',
        right: '-10rem',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '25rem',
        height: '25rem',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        bottom: '-8rem',
        left: '-8rem',
        pointerEvents: 'none',
      }} />

      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '26rem',
        padding: '2.5rem',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            marginBottom: '1rem',
            boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
          }}>
            📚
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            background: 'var(--text-title-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem',
          }}>Cloud Lib</h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}>Library Management System</p>
        </div>

        {/* Toggle Tabs */}
        <div style={{
          display: 'flex',
          marginBottom: '1.5rem',
          borderRadius: '0.625rem',
          background: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          padding: '0.25rem',
        }}>
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            id="tab-login"
            style={{
              flex: 1,
              padding: '0.625rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              background: isLogin ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: isLogin ? 'white' : 'var(--text-muted)',
              boxShadow: isLogin ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
            }}
          >Sign In</button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            id="tab-register"
            style={{
              flex: 1,
              padding: '0.625rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              background: !isLogin ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: !isLogin ? 'white' : 'var(--text-muted)',
              boxShadow: !isLogin ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
            }}
          >Register</button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            color: '#f87171',
            fontSize: '0.8rem',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
                Full Name
              </label>
              <input
                type="text"
                className="input-glass"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                id="input-name"
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-glass"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="input-email"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
              Password
            </label>
            <input
              type="password"
              className="input-glass"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              id="input-password"
            />
          </div>

          {!isLogin && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
                  Role
                </label>
                <select
                  className="select-glass"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  id="select-role"
                >
                  <option value="Student">Student</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {role === 'Student' && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
                      Student ID
                    </label>
                    <input
                      type="text"
                      className="input-glass"
                      placeholder="e.g. STU-2026-001"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      id="input-studentid"
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      className="input-glass"
                      placeholder="e.g. +1-555-0199"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      id="input-phone"
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
                      Department
                    </label>
                    <input
                      type="text"
                      className="input-glass"
                      placeholder="e.g. Computer Science"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      id="input-department"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <button
            type="submit"
            className="btn-gradient"
            disabled={loading}
            id="btn-submit"
            style={{
              width: '100%',
              padding: '0.875rem',
              fontSize: '0.95rem',
              marginTop: '0.5rem',
            }}
          >
            {loading ? '⏳ Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          Powered by AWS Cloud Infrastructure
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
