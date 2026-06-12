import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import BookCard from '../components/BookCard';
import StatsCard from '../components/StatsCard';
import Modal from '../components/Modal';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [history, setHistory] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingReservations, setLoadingReservations] = useState(true);

  // Modal State
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  // Fetch books
  useEffect(() => {
    fetchBooks();
  }, []);

  // Fetch borrow history & reservations
  useEffect(() => {
    fetchHistory();
    fetchReservations();
  }, []);

  const showMessage = (text, type = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: '', type: '' }), 4000);
  };

  const fetchBooks = async (query = '') => {
    setLoadingBooks(true);
    try {
      const res = await API.get(`/books${query ? `?search=${query}` : ''}`);
      setBooks(res.data.books);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await API.get('/borrow/history');
      setHistory(res.data.records);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchReservations = async () => {
    setLoadingReservations(true);
    try {
      const res = await API.get('/reservations/my');
      setReservations(res.data.reservations);
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleReserveBook = async (bookId) => {
    try {
      await API.post('/reservations', { bookId });
      showMessage('Book reservation placed successfully!');
      setShowBookModal(false);
      fetchReservations();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to reserve book.', 'error');
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);

    // Debounced search
    clearTimeout(window._searchTimeout);
    window._searchTimeout = setTimeout(() => {
      fetchBooks(value);
    }, 300);
  };

  const getDueStatus = (record) => {
    if (record.ReturnStatus === 'Returned') return 'returned';
    const due = new Date(record.DueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
    return 'pending';
  };

  const getDaysRemaining = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const activeLoans = history.filter(r => r.ReturnStatus === 'Pending');
  const overdueCount = history.filter(r => getDueStatus(r) === 'overdue').length;
  const totalAvailable = books.filter(b => b.Status === 'Available').length;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div style={{ padding: '2rem', maxWidth: '80rem', margin: '0 auto' }}>
        {/* Welcome */}
        <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            background: 'var(--text-title-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem',
          }}>
            Welcome back, {user?.Name?.split(' ')[0]} 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Browse the digital catalog and manage your borrowing records.
          </p>
        </div>

        {/* Action Message */}
        {actionMsg.text && (
          <div className="animate-fade-in" style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: actionMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${actionMsg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            color: actionMsg.type === 'error' ? '#f87171' : '#4ade80',
          }}>
            {actionMsg.type === 'error' ? '✗' : '✓'} {actionMsg.text}
          </div>
        )}

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <StatsCard icon="📚" label="Catalog Size" value={books.length} color="#6366f1" />
          <StatsCard icon="✅" label="Available Now" value={totalAvailable} color="#22c55e" />
          <StatsCard icon="📋" label="My Active Loans" value={activeLoans.length} color="#f59e0b" />
          <StatsCard icon="⚠️" label="Overdue" value={overdueCount} color="#ef4444" />
        </div>

        {/* ── Digital Catalog ────────────────────────────────── */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              📖 Digital Catalog
            </h3>
            <div style={{ position: 'relative', minWidth: '20rem' }}>
              <input
                type="text"
                className="input-glass"
                placeholder="Search by Title, Author, or ISBN..."
                value={search}
                onChange={handleSearch}
                id="catalog-search"
                style={{ paddingLeft: '2.5rem' }}
              />
              <span style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
              }}>🔍</span>
            </div>
          </div>

          {loadingBooks ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading catalog...
            </div>
          ) : books.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
              <p>No books found matching your search.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))',
              gap: '1rem',
            }}>
              {books.map((book) => (
                <BookCard 
                  key={book.BookID} 
                  book={book} 
                  onClick={() => {
                    setSelectedBook(book);
                    setShowBookModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Borrowing History ──────────────────────────────── */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            📋 My Borrowing History
          </h3>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
              <p>You haven't borrowed any books yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Author</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Days</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => {
                    const status = getDueStatus(record);
                    const days = getDaysRemaining(record.DueDate);
                    return (
                      <tr key={record.RecordID}>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{record.Title}</td>
                        <td style={{ color: 'var(--text-sub)' }}>{record.Author}</td>
                        <td>{new Date(record.IssueDate).toLocaleDateString()}</td>
                        <td>{new Date(record.DueDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${status}`}>
                            {status === 'returned' && '✓ Returned'}
                            {status === 'pending' && '⏳ Pending'}
                            {status === 'overdue' && '⚠ Overdue'}
                          </span>
                        </td>
                        <td>
                          {status === 'returned' ? (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : status === 'overdue' ? (
                            <span style={{ color: '#f87171', fontWeight: 600 }}>{Math.abs(days)}d overdue</span>
                          ) : (
                            <span style={{ color: '#4ade80', fontWeight: 600 }}>{days}d left</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Reservations Ledger ────────────────────────────── */}
        <div className="glass-card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            🔔 My Book Reservations
          </h3>

          {loadingReservations ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading reservations...
            </div>
          ) : reservations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
              <p>You have no active book reservations.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Author</th>
                    <th>ISBN</th>
                    <th>Requested On</th>
                    <th>Status</th>
                    <th>Action / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((res) => (
                    <tr key={res.ReservationID}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{res.Title}</td>
                      <td style={{ color: 'var(--text-sub)' }}>{res.Author}</td>
                      <td style={{ fontFamily: 'monospace' }}>{res.ISBN}</td>
                      <td>{new Date(res.RequestDate).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${
                          res.Status === 'Fulfilled' ? 'badge-returned' : 
                          res.Status === 'Pending' ? 'badge-pending' : 'badge-out'
                        }`}>
                          {res.Status}
                        </span>
                      </td>
                      <td>
                        {res.Status === 'Pending' ? (
                          <button
                            onClick={async () => {
                              try {
                                await API.delete(`/reservations/${res.ReservationID}/cancel`);
                                showMessage('Reservation cancelled successfully.');
                                fetchReservations();
                              } catch (err) {
                                showMessage(err.response?.data?.error || 'Failed to cancel reservation.', 'error');
                              }
                            }}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Cancel Request
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            {res.Status === 'Fulfilled' ? 'Book Issued to You' : 'Reservation Cancelled'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Book Details Modal ─────────────────────────────── */}
      {selectedBook && (
        <Modal
          isOpen={showBookModal}
          onClose={() => {
            setShowBookModal(false);
            setSelectedBook(null);
          }}
          title="Book Details"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '32rem' }}>
            {/* Cover illustration simulation */}
            <div style={{
              height: '10rem',
              background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
            }}>
              📖
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedBook.Title}</h3>
              <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>by {selectedBook.Author}</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {selectedBook.Category && (
                  <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--table-th-text)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    {selectedBook.Category}
                  </span>
                )}
                <span className={selectedBook.Status === 'Available' ? 'badge badge-available' : 'badge badge-out'}>
                  {selectedBook.Status === 'Available' ? '✓ Available' : '✗ Out of Stock'}
                </span>
              </div>
            </div>

            {selectedBook.Description && (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Description</h4>
                <p style={{ color: 'var(--text-sub)', fontSize: '0.875rem', lineHeight: 1.5 }}>{selectedBook.Description}</p>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              background: 'var(--input-bg)',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--input-border)',
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>ISBN</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>{selectedBook.ISBN}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Available Copies</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 700 }}>{selectedBook.Quantity}</span>
              </div>
              {selectedBook.Publisher && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Publisher</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{selectedBook.Publisher}</span>
                </div>
              )}
              {selectedBook.PublishYear && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Publication Year</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{selectedBook.PublishYear}</span>
                </div>
              )}
            </div>

            {/* Check Active Loan for this Book */}
            {(() => {
              const activeLoan = history.find(r => r.BookID === selectedBook.BookID && r.ReturnStatus === 'Pending');
              if (activeLoan) {
                const days = getDaysRemaining(activeLoan.DueDate);
                const isOverdue = days < 0;
                return (
                  <div style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    background: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    color: isOverdue ? '#f87171' : '#fbbf24',
                  }}>
                    <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      {isOverdue ? '⚠️ Overdue Loan Detected' : '⏳ Currently Borrowed by You'}
                    </p>
                    <p style={{ fontSize: '0.8rem' }}>
                      Due Date: {new Date(activeLoan.DueDate).toLocaleDateString()} ({isOverdue ? `${Math.abs(days)} days overdue` : `${days} days left`})
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Check Reservations */}
            {(() => {
              const hasReservation = reservations.find(r => r.BookID === selectedBook.BookID && r.Status === 'Pending');
              if (hasReservation) {
                return (
                  <div style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: 'var(--text-main)',
                  }}>
                    <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      ⏳ Pending Reservation
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                      You have reserved this book. You will be notified when it becomes available.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {selectedBook.Quantity <= 0 && !reservations.find(r => r.BookID === selectedBook.BookID && r.Status === 'Pending') && (
                <button
                  className="btn-gradient"
                  style={{ flex: 1, padding: '0.75rem' }}
                  onClick={() => handleReserveBook(selectedBook.BookID)}
                >
                  Reserve Book 🔔
                </button>
              )}
              <button
                className="input-glass"
                style={{ 
                  flex: 1, 
                  padding: '0.75rem', 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  border: '1px solid var(--card-border)',
                  background: 'transparent'
                }}
                onClick={() => {
                  setShowBookModal(false);
                  setSelectedBook(null);
                }}
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentDashboard;
