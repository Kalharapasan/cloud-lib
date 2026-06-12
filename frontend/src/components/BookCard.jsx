const BookCard = ({ book, onClick }) => {
  const isAvailable = book.Status === 'Available';
  const coverColors = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #3b82f6, #6366f1)',
    'linear-gradient(135deg, #8b5cf6, #ec4899)',
    'linear-gradient(135deg, #14b8a6, #3b82f6)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #10b981, #6366f1)',
  ];
  const colorIndex = (book.BookID || 0) % coverColors.length;

  return (
    <div className="glass-card animate-fade-in" style={{
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      cursor: onClick ? 'pointer' : 'default',
    }}
    onClick={onClick}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.3)';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
    }}
    >
      {/* Cover Gradient */}
      <div style={{
        height: '8rem',
        background: coverColors[colorIndex],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <span style={{ fontSize: '3rem', opacity: 0.7 }}>📖</span>
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
        }}>
          <span className={isAvailable ? 'badge badge-available' : 'badge badge-out'}>
            {isAvailable ? '✓ Available' : '✗ Out of Stock'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.25rem' }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: '#e2e8f0',
          marginBottom: '0.25rem',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{book.Title}</h3>
        <p style={{
          fontSize: '0.8rem',
          color: '#94a3b8',
          marginBottom: '0.75rem',
        }}>by {book.Author}</p>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '0.7rem',
            color: '#64748b',
            fontFamily: 'monospace',
          }}>{book.ISBN}</span>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: isAvailable ? '#a5b4fc' : '#f87171',
          }}>
            Qty: {book.Quantity}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
