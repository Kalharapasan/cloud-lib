import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import StatsCard from '../components/StatsCard';
import Modal from '../components/Modal';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Book form state
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', quantity: 0 });

  // Issue form state
  const [issueForm, setIssueForm] = useState({ userId: '', bookId: '', dueDays: 14 });
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [booksRes, usersRes, recordsRes] = await Promise.all([
        API.get('/books'),
        API.get('/auth/users'),
        API.get('/borrow/all'),
      ]);
      setBooks(booksRes.data.books);
      setUsers(usersRes.data.users);
      setRecords(recordsRes.data.records);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: '', type: '' }), 4000);
  };

  // ── Book CRUD ─────────────────────────────────────────────
  const openAddBook = () => {
    setEditingBook(null);
    setBookForm({ title: '', author: '', isbn: '', quantity: 0 });
    setShowBookModal(true);
  };

  const openEditBook = (book) => {
    setEditingBook(book);
    setBookForm({
      title: book.Title,
      author: book.Author,
      isbn: book.ISBN,
      quantity: book.Quantity,
    });
    setShowBookModal(true);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await API.put(`/books/${editingBook.BookID}`, bookForm);
        showMessage('Book updated successfully!');
      } else {
        await API.post('/books', bookForm);
        showMessage('Book added successfully!');
      }
      setShowBookModal(false);
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to save book.', 'error');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
      await API.delete(`/books/${bookId}`);
      showMessage('Book deleted.');
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to delete book.', 'error');
    }
  };

  // ── Borrow Actions ────────────────────────────────────────
  const handleIssueBook = async (e) => {
    e.preventDefault();
    try {
      await API.post('/borrow/issue', issueForm);
      showMessage('Book issued successfully!');
      setIssueForm({ userId: '', bookId: '', dueDays: 14 });
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to issue book.', 'error');
    }
  };

  const handleReturnBook = async (recordId) => {
    try {
      await API.put(`/borrow/return/${recordId}`);
      showMessage('Book marked as returned!');
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to return book.', 'error');
    }
  };

  // ── Stats ─────────────────────────────────────────────────
  const totalBooks = books.reduce((sum, b) => sum + b.Quantity, 0);
  const availableBooks = books.filter(b => b.Status === 'Available').length;
  const pendingRecords = records.filter(r => r.ReturnStatus === 'Pending');
  const overdueRecords = pendingRecords.filter(r => new Date(r.DueDate) < new Date());

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div style={{ padding: '2rem', maxWidth: '85rem', margin: '0 auto' }}>
        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #e2e8f0, #a5b4fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem',
          }}>
            Admin Dashboard 🛡️
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Manage inventory, process transactions, and monitor library operations.
          </p>
        </div>

        {/* Action Message */}
        {actionMsg.text && (
          <div className="animate-fade-in" style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <StatsCard icon="📚" label="Total Titles" value={books.length} color="#6366f1" />
          <StatsCard icon="📦" label="Total Copies" value={totalBooks} color="#3b82f6" />
          <StatsCard icon="✅" label="Available Titles" value={availableBooks} color="#22c55e" />
          <StatsCard icon="📋" label="Active Loans" value={pendingRecords.length} color="#f59e0b" />
          <StatsCard icon="⚠️" label="Overdue" value={overdueRecords.length} color="#ef4444" />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '-1px',
        }}>
          <button
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
            id="tab-inventory"
          >
            📦 Inventory Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
            id="tab-transactions"
          >
            🔄 Transaction Management
          </button>
        </div>

        {/* Tab Content */}
        <div className="glass-card" style={{ padding: '1.5rem', borderTopLeftRadius: 0 }}>

          {/* ── TAB: Inventory ─────────────────────────────── */}
          {activeTab === 'inventory' && (
            <div className="animate-fade-in">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' }}>
                  Book Inventory
                </h3>
                <button className="btn-gradient" onClick={openAddBook} id="btn-add-book">
                  + Add New Book
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table-glass">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Author</th>
                      <th>ISBN</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((book) => (
                      <tr key={book.BookID}>
                        <td style={{ color: '#64748b' }}>#{book.BookID}</td>
                        <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{book.Title}</td>
                        <td style={{ color: '#94a3b8' }}>{book.Author}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>{book.ISBN}</td>
                        <td style={{ fontWeight: 700, color: book.Quantity > 0 ? '#a5b4fc' : '#f87171' }}>{book.Quantity}</td>
                        <td>
                          <span className={book.Status === 'Available' ? 'badge badge-available' : 'badge badge-out'}>
                            {book.Status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => openEditBook(book)}
                              style={{
                                background: 'rgba(99,102,241,0.15)',
                                border: '1px solid rgba(99,102,241,0.3)',
                                color: '#a5b4fc',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                              }}
                              onMouseOver={(e) => { e.target.style.background = 'rgba(99,102,241,0.3)'; }}
                              onMouseOut={(e) => { e.target.style.background = 'rgba(99,102,241,0.15)'; }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBook(book.BookID)}
                              style={{
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                              }}
                              onMouseOver={(e) => { e.target.style.background = 'rgba(239,68,68,0.3)'; }}
                              onMouseOut={(e) => { e.target.style.background = 'rgba(239,68,68,0.15)'; }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB: Transactions ──────────────────────────── */}
          {activeTab === 'transactions' && (
            <div className="animate-fade-in">
              {/* Issue Book Form */}
              <div className="glass-card-light" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📤 Issue a Book
                </h4>
                <form onSubmit={handleIssueBook} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                  gap: '1rem',
                  alignItems: 'end',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', fontWeight: 600 }}>
                      Select Student
                    </label>
                    <select
                      className="select-glass"
                      value={issueForm.userId}
                      onChange={(e) => setIssueForm({ ...issueForm, userId: e.target.value })}
                      required
                      id="issue-user"
                    >
                      <option value="">Choose a user...</option>
                      {users.map((u) => (
                        <option key={u.UserID} value={u.UserID}>
                          {u.Name} ({u.Email}) — {u.Role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', fontWeight: 600 }}>
                      Select Book
                    </label>
                    <select
                      className="select-glass"
                      value={issueForm.bookId}
                      onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
                      required
                      id="issue-book"
                    >
                      <option value="">Choose a book...</option>
                      {books.filter(b => b.Status === 'Available').map((b) => (
                        <option key={b.BookID} value={b.BookID}>
                          {b.Title} (Qty: {b.Quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', fontWeight: 600 }}>
                      Due Days
                    </label>
                    <input
                      type="number"
                      className="input-glass"
                      value={issueForm.dueDays}
                      onChange={(e) => setIssueForm({ ...issueForm, dueDays: parseInt(e.target.value) || 14 })}
                      min={1}
                      max={90}
                      id="issue-days"
                    />
                  </div>
                  <button type="submit" className="btn-gradient" id="btn-issue" style={{ height: 'fit-content' }}>
                    Issue Book
                  </button>
                </form>
              </div>

              {/* All Transactions Table */}
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📋 All Transactions
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-glass">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Student</th>
                      <th>Book</th>
                      <th>Issued</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => {
                      const isOverdue = rec.ReturnStatus === 'Pending' && new Date(rec.DueDate) < new Date();
                      return (
                        <tr key={rec.RecordID} style={{
                          background: isOverdue ? 'rgba(239,68,68,0.06)' : undefined,
                        }}>
                          <td style={{ color: '#64748b' }}>#{rec.RecordID}</td>
                          <td>
                            <div>
                              <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>{rec.UserName}</span>
                              <br />
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{rec.UserEmail}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{rec.Title}</td>
                          <td>{new Date(rec.IssueDate).toLocaleDateString()}</td>
                          <td style={{ color: isOverdue ? '#f87171' : undefined, fontWeight: isOverdue ? 700 : undefined }}>
                            {new Date(rec.DueDate).toLocaleDateString()}
                            {isOverdue && <span style={{ display: 'block', fontSize: '0.65rem', color: '#f87171' }}>OVERDUE</span>}
                          </td>
                          <td>
                            <span className={`badge ${rec.ReturnStatus === 'Returned' ? 'badge-returned' : isOverdue ? 'badge-overdue' : 'badge-pending'}`}>
                              {rec.ReturnStatus === 'Returned' ? '✓ Returned' : isOverdue ? '⚠ Overdue' : '⏳ Pending'}
                            </span>
                          </td>
                          <td>
                            {rec.ReturnStatus === 'Pending' ? (
                              <button
                                onClick={() => handleReturnBook(rec.RecordID)}
                                style={{
                                  background: 'rgba(34,197,94,0.15)',
                                  border: '1px solid rgba(34,197,94,0.3)',
                                  color: '#4ade80',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '0.375rem',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseOver={(e) => { e.target.style.background = 'rgba(34,197,94,0.3)'; }}
                                onMouseOut={(e) => { e.target.style.background = 'rgba(34,197,94,0.15)'; }}
                              >
                                Mark Returned
                              </button>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                {rec.ReturnDate ? new Date(rec.ReturnDate).toLocaleDateString() : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Book Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        title={editingBook ? 'Edit Book' : 'Add New Book'}
      >
        <form onSubmit={handleBookSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.375rem', fontWeight: 600 }}>Title</label>
              <input
                type="text"
                className="input-glass"
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                placeholder="Book title"
                required
                id="book-title"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.375rem', fontWeight: 600 }}>Author</label>
              <input
                type="text"
                className="input-glass"
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                placeholder="Author name"
                required
                id="book-author"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.375rem', fontWeight: 600 }}>ISBN</label>
              <input
                type="text"
                className="input-glass"
                value={bookForm.isbn}
                onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                placeholder="978-XXXXXXXXXX"
                required
                id="book-isbn"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.375rem', fontWeight: 600 }}>Quantity</label>
              <input
                type="number"
                className="input-glass"
                value={bookForm.quantity}
                onChange={(e) => setBookForm({ ...bookForm, quantity: parseInt(e.target.value) || 0 })}
                min={0}
                required
                id="book-quantity"
              />
            </div>
            <button type="submit" className="btn-gradient" style={{ marginTop: '0.5rem' }} id="btn-save-book">
              {editingBook ? 'Update Book' : 'Add Book'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
