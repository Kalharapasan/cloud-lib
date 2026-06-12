import { useState, useEffect } from 'react';

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

  const cleanIsbn = book.ISBN ? book.ISBN.replace(/-/g, '') : '';
  const initialSrc = book.CoverImage || (cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg?default=false` : null);
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [imgError, setImgError] = useState(!initialSrc);

  useEffect(() => {
    const newCleanIsbn = book.ISBN ? book.ISBN.replace(/-/g, '') : '';
    const newSrc = book.CoverImage || (newCleanIsbn ? `https://covers.openlibrary.org/b/isbn/${newCleanIsbn}-M.jpg?default=false` : null);
    setImgSrc(newSrc);
    setImgError(!newSrc);
  }, [book.CoverImage, book.ISBN]);

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
      {/* Cover Image or Gradient */}
      <div style={{
        height: '10rem',
        background: imgError ? coverColors[colorIndex] : 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {!imgError ? (
          <img 
            src={imgSrc} 
            alt={book.Title} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transition: 'transform 0.5s ease',
            }}
            onError={() => setImgError(true)}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
        ) : (
          <span style={{ fontSize: '3rem', opacity: 0.7 }}>📖</span>
        )}
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          zIndex: 2,
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
          color: 'var(--text-main)',
          marginBottom: '0.25rem',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{book.Title}</h3>
        <p style={{
          fontSize: '0.8rem',
          color: 'var(--text-sub)',
          marginBottom: '0.75rem',
        }}>by {book.Author}</p>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
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
