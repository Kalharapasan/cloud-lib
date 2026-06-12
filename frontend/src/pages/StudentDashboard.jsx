import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import BookCard from '../components/BookCard';
import StatsCard from '../components/StatsCard';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch books
  useEffect(() => {
    fetchBooks();
  }, []);

  // Fetch borrow history
  useEffect(() => {
    fetchHistory();
  }, []);

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
    if (due < today) return 'overdue';
    return 'pending';
  };

  const getDaysRemaining = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
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
            background: 'linear-gradient(135deg, #e2e8f0, #a5b4fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem',
          }}>
            Welcome back, {user?.Name?.split(' ')[0]} 👋
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Browse the digital catalog and manage your borrowing records.
          </p>
        </div>

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
              color: '#e2e8f0',
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
                color: '#64748b',
              }}>🔍</span>
            </div>
          </div>

          {loadingBooks ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading catalog...
            </div>
          ) : books.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
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
                <BookCard key={book.BookID} book={book} />
              ))}
            </div>
          )}
        </div>

        {/* ── Borrowing History ──────────────────────────────── */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#e2e8f0',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            📋 My Borrowing History
          </h3>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
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
                        <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{record.Title}</td>
                        <td style={{ color: '#94a3b8' }}>{record.Author}</td>
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
                            <span style={{ color: '#64748b' }}>—</span>
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
      </div>
    </div>
  );
};

export default StudentDashboard;
