const StatsCard = ({ icon, label, value, color = '#6366f1' }) => {
  return (
    <div className="glass-card animate-fade-in" style={{
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'all 0.3s ease',
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.borderColor = color;
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)';
    }}
    >
      <div style={{
        width: '3rem',
        height: '3rem',
        borderRadius: '0.75rem',
        background: `${color}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--text-sub)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
          marginBottom: '0.125rem',
        }}>{label}</p>
        <p style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: 'var(--text-main)',
          lineHeight: 1,
        }}>{value}</p>
      </div>
    </div>
  );
};

export default StatsCard;
