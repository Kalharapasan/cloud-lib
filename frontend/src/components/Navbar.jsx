import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass-card" style={{
      borderRadius: 0,
      borderLeft: 'none',
      borderRight: 'none',
      borderTop: 'none',
      padding: '0.75rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.625rem',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
        }}>
          📚
        </div>
        <div>
          <h1 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #a5b4fc, #c4b5fd)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
          }}>Cloud Lib</h1>
          <p style={{ fontSize: '0.65rem', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Library Management System
          </p>
        </div>
      </div>

      {/* User Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>{user?.Name}</p>
          <span className={isAdmin ? 'badge badge-admin' : 'badge badge-student'} style={{ fontSize: '0.65rem' }}>
            {user?.Role}
          </span>
        </div>
        <div style={{
          width: '2.25rem',
          height: '2.25rem',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          fontWeight: 700,
          color: 'white',
        }}>
          {user?.Name?.charAt(0)?.toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.3)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.15)';
          }}
          id="logout-btn"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
