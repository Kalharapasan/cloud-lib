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
  const [reservations, setReservations] = useState([]);
  const [reservationStats, setReservationStats] = useState(null);
  const [reservationFilters, setReservationFilters] = useState({
    status: '',
    student: '',
    book: '',
    from: '',
    to: '',
  });
  const [selectedReservationIds, setSelectedReservationIds] = useState([]);
  const [reservationAction, setReservationAction] = useState({
    open: false,
    ids: [],
    status: 'Fulfilled',
    note: '',
  });
  const [loading, setLoading] = useState(true);

  // Filters for Book Inventory
  const [inventorySearch, setInventorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [publisherFilter, setPublisherFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Book form state
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    quantity: 0,
    description: '',
    category: '',
    publisher: '',
    publishYear: ''
  });

  // User/Student form state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Student',
    studentId: '',
    phone: '',
    department: ''
  });

  // User/Student details modal state
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState([]);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);

  // Issue form state
  const [issueForm, setIssueForm] = useState({ userId: '', bookId: '', dueDays: 14 });
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [booksRes, usersRes, recordsRes, reservationsRes, reservationStatsRes] = await Promise.all([
        API.get('/books'),
        API.get('/auth/users'),
        API.get('/borrow/all'),
        API.get('/reservations/all'),
        API.get('/reservations/stats'),
      ]);
      setBooks(booksRes.data.books);
      setUsers(usersRes.data.users);
      setRecords(recordsRes.data.records);
      setReservations(reservationsRes.data.reservations);
      setReservationStats(reservationStatsRes.data.stats);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshReservations = async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(reservationFilters).filter(([, value]) => value)
      );
      const [reservationsRes, reservationStatsRes] = await Promise.all([
        API.get('/reservations/all', { params }),
        API.get('/reservations/stats'),
      ]);
      setReservations(reservationsRes.data.reservations);
      setReservationStats(reservationStatsRes.data.stats);
      setSelectedReservationIds([]);
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to refresh reservations.', 'error');
    }
  };

  const openReservationAction = (ids, status) => {
    setReservationAction({
      open: true,
      ids,
      status,
      note: '',
    });
  };

  const closeReservationAction = () => {
    setReservationAction({
      open: false,
      ids: [],
      status: 'Fulfilled',
      note: '',
    });
  };

  const submitReservationAction = async () => {
    try {
      if (reservationAction.ids.length > 1) {
        await API.put('/reservations/bulk/status', {
          ids: reservationAction.ids,
          status: reservationAction.status,
          note: reservationAction.note,
        });
      } else {
        await API.put(`/reservations/${reservationAction.ids[0]}/status`, {
          status: reservationAction.status,
          note: reservationAction.note,
        });
      }
      showMessage(`Reservation ${reservationAction.status.toLowerCase()} successfully.`);
      closeReservationAction();
      refreshReservations();
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to update reservation.', 'error');
    }
  };

  const toggleReservationSelection = (id) => {
    setSelectedReservationIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  };

  const selectVisibleReservations = () => {
    const visibleIds = filteredReservations
      .filter((reservation) => reservation.Status === 'Pending')
      .map((reservation) => reservation.ReservationID);
    setSelectedReservationIds(visibleIds);
  };

  const clearReservationSelection = () => {
    setSelectedReservationIds([]);
  };

  const handleReservationReport = async () => {
    try {
      const res = await API.get('/reservations/report', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reservation_report.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to download reservation report.', 'error');
    }
  };

  const showMessage = (text, type = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: '', type: '' }), 4000);
  };

  // ── Book CRUD ─────────────────────────────────────────────
  const openAddBook = () => {
    setEditingBook(null);
    setBookForm({
      title: '',
      author: '',
      isbn: '',
      quantity: 0,
      description: '',
      category: '',
      publisher: '',
      publishYear: ''
    });
    setShowBookModal(true);
  };

  const openEditBook = (book) => {
    setEditingBook(book);
    setBookForm({
      title: book.Title,
      author: book.Author,
      isbn: book.ISBN,
      quantity: book.Quantity,
      description: book.Description || '',
      category: book.Category || '',
      publisher: book.Publisher || '',
      publishYear: book.PublishYear || '',
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

  // ── User / Student CRUD ──────────────────────────────────
  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      name: '',
      email: '',
      password: '',
      role: 'Student',
      studentId: '',
      phone: '',
      department: ''
    });
    setShowStudentModal(true);
  };

  const openEditStudent = (student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.Name,
      email: student.Email,
      password: '', // Blank by default, only updated if entered
      role: student.Role,
      studentId: student.StudentID || '',
      phone: student.Phone || '',
      department: student.Department || ''
    });
    setShowStudentModal(true);
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...studentForm };
      if (editingStudent) {
        if (!payload.password) delete payload.password; // Do not send empty password
        await API.put(`/auth/users/${editingStudent.UserID}`, payload);
        showMessage('Student account updated successfully!');
      } else {
        await API.post('/auth/users', payload);
        showMessage('Student account created successfully!');
      }
      setShowStudentModal(false);
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to save student account.', 'error');
    }
  };

  const handleDeleteStudent = async (userId) => {
    if (!confirm('Are you sure you want to delete this student account? This will cascade-delete all their borrow records.')) return;
    try {
      await API.delete(`/auth/users/${userId}`);
      showMessage('User account deleted.');
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to delete user account.', 'error');
    }
  };

  const viewStudentDetail = async (userId) => {
    setLoadingStudentDetail(true);
    setSelectedStudent(null);
    setSelectedStudentHistory([]);
    setShowStudentDetailModal(true);
    try {
      const res = await API.get(`/auth/users/${userId}`);
      setSelectedStudent(res.data.user);
      setSelectedStudentHistory(res.data.history);
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to fetch student details.', 'error');
      setShowStudentDetailModal(false);
    } finally {
      setLoadingStudentDetail(false);
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
  const pendingReservationsCount = reservations.filter(r => r.Status === 'Pending').length;
  const filteredReservations = reservations.filter((reservation) => {
    const matchesStatus = reservationFilters.status ? reservation.Status === reservationFilters.status : true;
    const matchesStudent = reservationFilters.student
      ? `${reservation.UserName} ${reservation.StudentID || ''}`.toLowerCase().includes(reservationFilters.student.toLowerCase())
      : true;
    const matchesBook = reservationFilters.book
      ? `${reservation.Title} ${reservation.ISBN}`.toLowerCase().includes(reservationFilters.book.toLowerCase())
      : true;
    const requestDate = new Date(reservation.RequestDate);
    const matchesFrom = reservationFilters.from ? requestDate >= new Date(reservationFilters.from) : true;
    const matchesTo = reservationFilters.to ? requestDate <= new Date(`${reservationFilters.to}T23:59:59`) : true;
    return matchesStatus && matchesStudent && matchesBook && matchesFrom && matchesTo;
  });

  const reservationStatusCounts = reservations.reduce((counts, reservation) => {
    counts[reservation.Status] = (counts[reservation.Status] || 0) + 1;
    return counts;
  }, {});

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
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
            background: 'var(--text-title-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem',
          }}>
            Admin Dashboard 🛡️
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
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
          <StatsCard icon="🔔" label="Reservations" value={pendingReservationsCount} color="#ec4899" />
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
            id="tab-inventory"
          >
            📦 Inventory Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
            id="tab-students"
          >
            👥 Student Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
            id="tab-transactions"
          >
            🔄 Transaction Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
            id="tab-reservations"
          >
            📚 Reservations
          </button>
        </div>

        <div className="tab-panel">
          {activeTab === 'inventory' && (() => {
            const categories = [...new Set(books.map((book) => book.Category).filter(Boolean))];
            const publishers = [...new Set(books.map((book) => book.Publisher).filter(Boolean))];
            const filteredBooks = books.filter((book) => {
              const matchesSearch =
                book.Title.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                book.Author.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                book.ISBN.toLowerCase().includes(inventorySearch.toLowerCase());
              const matchesCategory = categoryFilter ? book.Category === categoryFilter : true;
              const matchesPublisher = publisherFilter ? book.Publisher === publisherFilter : true;
              const matchesStatus = statusFilter ? book.Status === statusFilter : true;
              return matchesSearch && matchesCategory && matchesPublisher && matchesStatus;
            });

            return (
              <div className="animate-fade-in">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Book Inventory
                  </h3>
                  <button className="btn-gradient" onClick={openAddBook} id="btn-add-book">
                    + Add New Book
                  </button>
                </div>

                {/* Filters Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'var(--card-bg-light)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--card-border-light)',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem', fontWeight: 600 }}>Search</label>
                    <input
                      type="text"
                      className="input-glass"
                      placeholder="Title, Author, ISBN..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem', fontWeight: 600 }}>Category</label>
                    <select
                      className="select-glass"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem', fontWeight: 600 }}>Publisher</label>
                    <select
                      className="select-glass"
                      value={publisherFilter}
                      onChange={(e) => setPublisherFilter(e.target.value)}
                    >
                      <option value="">All Publishers</option>
                      {publishers.map(pub => (
                        <option key={pub} value={pub}>{pub}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem', fontWeight: 600 }}>Status</label>
                    <select
                      className="select-glass"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="Available">Available</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="table-glass">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Category</th>
                        <th>ISBN</th>
                        <th>Qty</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBooks.map((book) => (
                      <tr key={book.BookID}>
                        <td style={{ color: 'var(--text-muted)' }}>#{book.BookID}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{book.Title}</td>
                        <td style={{ color: 'var(--text-sub)' }}>{book.Author}</td>
                        <td style={{ color: 'var(--table-th-text)' }}>{book.Category || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{book.ISBN}</td>
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
            );
          })()}

          {/* ── TAB: Students ─────────────────────────────── */}
          {activeTab === 'students' && (
            <div className="animate-fade-in">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Student Roster
                </h3>
                <button className="btn-gradient" onClick={openAddStudent} id="btn-add-student">
                  + Add New Student
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table-glass">
                  <thead>
                    <tr>
                      <th>Name / Email</th>
                      <th>Student ID</th>
                      <th>Department</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.UserID}>
                        <td>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.Name}</span>
                            <br />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.Email}</span>
                          </div>
                        </td>
                        <td>
                          {u.StudentID ? (
                            <span style={{ fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>{u.StudentID}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>{u.Department || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td>{u.Phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td>
                          <span className={u.Role === 'Admin' ? 'badge badge-admin' : 'badge badge-student'}>
                            {u.Role}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(u.CreatedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => viewStudentDetail(u.UserID)}
                              style={{
                                background: 'rgba(56,189,248,0.15)',
                                border: '1px solid rgba(56,189,248,0.3)',
                                color: '#38bdf8',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                              }}
                              onMouseOver={(e) => { e.target.style.background = 'rgba(56,189,248,0.3)'; }}
                              onMouseOut={(e) => { e.target.style.background = 'rgba(56,189,248,0.15)'; }}
                            >
                              Details
                            </button>
                            <button
                              onClick={() => openEditStudent(u)}
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
                              onClick={() => handleDeleteStudent(u.UserID)}
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
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No users registered in the system.
                        </td>
                      </tr>
                    )}
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
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📤 Issue a Book
                </h4>
                <form onSubmit={handleIssueBook} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                  gap: '1rem',
                  alignItems: 'end',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
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
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
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
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
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
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                          <td style={{ color: 'var(--text-muted)' }}>#{rec.RecordID}</td>
                          <td>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>{rec.UserName}</span>
                              <br />
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rec.UserEmail}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{rec.Title}</td>
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
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                {rec.ReturnDate ? new Date(rec.ReturnDate).toLocaleDateString() : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="animate-fade-in">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Reservations
                </h3>
                <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                  Approve, cancel, and monitor student reservation requests.
                </p>
              </div>
              <button className="btn-gradient" onClick={handleReservationReport} id="btn-reservation-report">
                Download Report
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}>
              <StatsCard icon="🔔" label="Pending" value={reservationStatusCounts.Pending || 0} color="#f59e0b" />
              <StatsCard icon="✅" label="Fulfilled" value={reservationStatusCounts.Fulfilled || 0} color="#22c55e" />
              <StatsCard icon="❌" label="Cancelled" value={reservationStatusCounts.Cancelled || 0} color="#ef4444" />
              <StatsCard icon="⏰" label="Expired" value={reservationStatusCounts.Expired || 0} color="#a78bfa" />
            </div>

            <div className="glass-card-light" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                gap: '1rem',
                alignItems: 'end',
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem', fontWeight: 600 }}>Status</label>
                  <select
                    className="select-glass"
                    value={reservationFilters.status}
                    onChange={(e) => setReservationFilters({ ...reservationFilters, status: e.target.value })}
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Fulfilled">Fulfilled</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem', fontWeight: 600 }}>Student</label>
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Name or student ID"
                    value={reservationFilters.student}
                    onChange={(e) => setReservationFilters({ ...reservationFilters, student: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem', fontWeight: 600 }}>Book</label>
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Title or ISBN"
                    value={reservationFilters.book}
                    onChange={(e) => setReservationFilters({ ...reservationFilters, book: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem', fontWeight: 600 }}>From</label>
                  <input
                    type="date"
                    className="input-glass"
                    value={reservationFilters.from}
                    onChange={(e) => setReservationFilters({ ...reservationFilters, from: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem', fontWeight: 600 }}>To</label>
                  <input
                    type="date"
                    className="input-glass"
                    value={reservationFilters.to}
                    onChange={(e) => setReservationFilters({ ...reservationFilters, to: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn-gradient" type="button" onClick={refreshReservations} id="btn-refresh-reservations">
                    Apply Filters
                  </button>
                  <button
                    type="button"
                    className="tab-btn"
                    onClick={() => {
                      setReservationFilters({ status: '', student: '', book: '', from: '', to: '' });
                      setSelectedReservationIds([]);
                      fetchAll();
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-card-light" style={{ padding: '1rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '1rem',
              }}>
                <div style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                  Showing {filteredReservations.length} reservation{filteredReservations.length !== 1 ? 's' : ''}
                  {selectedReservationIds.length > 0 ? `, ${selectedReservationIds.length} selected` : ''}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tab-btn"
                    onClick={selectVisibleReservations}
                  >
                    Select Pending
                  </button>
                  <button
                    type="button"
                    className="tab-btn"
                    onClick={clearReservationSelection}
                    disabled={selectedReservationIds.length === 0}
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    className="btn-gradient"
                    onClick={() => openReservationAction(selectedReservationIds, 'Fulfilled')}
                    disabled={selectedReservationIds.length === 0}
                  >
                    Fulfill Selected
                  </button>
                  <button
                    type="button"
                    className="tab-btn"
                    onClick={() => openReservationAction(selectedReservationIds, 'Cancelled')}
                    disabled={selectedReservationIds.length === 0}
                  >
                    Cancel Selected
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table-glass">
                  <thead>
                    <tr>
                      <th style={{ width: '3rem' }}>
                        <input
                          type="checkbox"
                          checked={filteredReservations.filter((reservation) => reservation.Status === 'Pending').length > 0 && filteredReservations.filter((reservation) => reservation.Status === 'Pending').every((reservation) => selectedReservationIds.includes(reservation.ReservationID))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectVisibleReservations();
                            } else {
                              clearReservationSelection();
                            }
                          }}
                        />
                      </th>
                      <th>Student</th>
                      <th>Book</th>
                      <th>Requested</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Note</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map((reservation) => {
                      const isPending = reservation.Status === 'Pending';
                      return (
                        <tr key={reservation.ReservationID}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedReservationIds.includes(reservation.ReservationID)}
                              disabled={!isPending}
                              onChange={() => toggleReservationSelection(reservation.ReservationID)}
                            />
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{reservation.UserName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {reservation.StudentID || '—'} · {reservation.UserEmail}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{reservation.Title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reservation.ISBN}</div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-sub)' }}>{new Date(reservation.RequestDate).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${reservation.Priority === 'High' ? 'badge-overdue' : 'badge-pending'}`}>
                              {reservation.Priority}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${reservation.Status === 'Fulfilled' ? 'badge-returned' : reservation.Status === 'Pending' ? 'badge-pending' : 'badge-out'}`}>
                              {reservation.Status}
                            </span>
                          </td>
                          <td style={{ maxWidth: '18rem' }}>
                            <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem' }}>
                              {reservation.AdminNote || '—'}
                            </span>
                          </td>
                          <td>
                            {isPending ? (
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button className="btn-gradient" type="button" onClick={() => openReservationAction([reservation.ReservationID], 'Fulfilled')}>
                                  Fulfill
                                </button>
                                <button className="tab-btn" type="button" onClick={() => openReservationAction([reservation.ReservationID], 'Cancelled')}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredReservations.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No reservations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '24rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Title</label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Author</label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>ISBN</label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Quantity</label>
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
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Category</label>
              <input
                type="text"
                className="input-glass"
                value={bookForm.category}
                onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                placeholder="e.g. Programming, Databases"
                id="book-category"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Publisher</label>
              <input
                type="text"
                className="input-glass"
                value={bookForm.publisher}
                onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                placeholder="Publisher name"
                id="book-publisher"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Publish Year</label>
              <input
                type="number"
                className="input-glass"
                value={bookForm.publishYear}
                onChange={(e) => setBookForm({ ...bookForm, publishYear: e.target.value })}
                placeholder="e.g. 2008"
                id="book-publish-year"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Description</label>
              <textarea
                className="input-glass"
                style={{ resize: 'vertical', minHeight: '5rem' }}
                value={bookForm.description}
                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                placeholder="Brief summary of the book content"
                id="book-description"
              />
            </div>
            <button type="submit" className="btn-gradient" style={{ marginTop: '0.5rem' }} id="btn-save-book">
              {editingBook ? 'Update Book' : 'Add Book'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Student Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        title={editingStudent ? 'Edit User Details' : 'Add New Student'}
      >
        <form onSubmit={handleStudentSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '24rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Full Name</label>
              <input
                type="text"
                className="input-glass"
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="Full name"
                required
                id="student-name"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Email Address</label>
              <input
                type="email"
                className="input-glass"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                placeholder="email@university.edu"
                required
                id="student-email"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>
                Password {editingStudent && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>(Leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                className="input-glass"
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                placeholder="Password"
                required={!editingStudent}
                minLength={6}
                id="student-password"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Role</label>
              <select
                className="select-glass"
                value={studentForm.role}
                onChange={(e) => setStudentForm({ ...studentForm, role: e.target.value })}
                required
                id="student-role"
              >
                <option value="Student">Student</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {studentForm.role === 'Student' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Student ID</label>
                  <input
                    type="text"
                    className="input-glass"
                    value={studentForm.studentId}
                    onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                    placeholder="STU-2026-XXX"
                    required
                    id="student-studentid"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Phone Number</label>
                  <input
                    type="text"
                    className="input-glass"
                    value={studentForm.phone}
                    onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    placeholder="+1-555-XXXX"
                    id="student-phone"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.375rem', fontWeight: 600 }}>Department</label>
                  <input
                    type="text"
                    className="input-glass"
                    value={studentForm.department}
                    onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                    placeholder="e.g. Computer Science"
                    id="student-department"
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn-gradient" style={{ marginTop: '0.5rem' }} id="btn-save-student">
              {editingStudent ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Student Detail Modal ───────────────────────────────── */}
      <Modal
        isOpen={showStudentDetailModal}
        onClose={() => {
          setShowStudentDetailModal(false);
          setSelectedStudent(null);
          setSelectedStudentHistory([]);
        }}
        title="Student Profile & Loans"
      >
        {loadingStudentDetail ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading details...
          </div>
        ) : selectedStudent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '40rem', maxWidth: '90vw' }}>
            
            {/* Header Detail */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(99, 102, 241, 0.15)'
            }}>
              <div style={{
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'white',
              }}>
                {selectedStudent.Name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedStudent.Name}</h3>
                <span className={selectedStudent.Role === 'Admin' ? 'badge badge-admin' : 'badge badge-student'}>
                  {selectedStudent.Role}
                </span>
              </div>
            </div>

            {/* Profile Grid Info */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              background: 'var(--input-bg)',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--input-border)'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Email</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{selectedStudent.Email}</span>
              </div>
              {selectedStudent.Role === 'Student' && (
                <>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>StudentID</span>
                    <span style={{ fontSize: '0.875rem', color: '#a5b4fc', fontFamily: 'monospace', fontWeight: 600 }}>{selectedStudent.StudentID || '—'}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Department</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{selectedStudent.Department || '—'}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Phone</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{selectedStudent.Phone || '—'}</span>
                  </div>
                </>
              )}
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Account Registered</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-sub)' }}>
                  {new Date(selectedStudent.CreatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Borrow log list */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Borrowing Ledger
              </h4>
              <div style={{ maxHeight: '12rem', overflowY: 'auto', border: '1px solid rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem' }}>
                <table className="table-glass" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Book / ISBN</th>
                      <th>Issued</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudentHistory.map((rec) => {
                      const isOverdue = rec.ReturnStatus === 'Pending' && new Date(rec.DueDate) < new Date();
                      return (
                        <tr key={rec.RecordID}>
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{rec.Title}</span>
                            <br />
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.ISBN}</span>
                          </td>
                          <td>{new Date(rec.IssueDate).toLocaleDateString()}</td>
                          <td style={{ color: isOverdue ? '#f87171' : undefined }}>{new Date(rec.DueDate).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${rec.ReturnStatus === 'Returned' ? 'badge-returned' : isOverdue ? 'badge-overdue' : 'badge-pending'}`}>
                              {rec.ReturnStatus === 'Returned' ? 'Returned' : isOverdue ? 'Overdue' : 'Pending'}
                            </span>
                          </td>
                          <td>
                            {rec.ReturnStatus === 'Pending' ? (
                              <button
                                onClick={async () => {
                                  try {
                                    await API.put(`/borrow/return/${rec.RecordID}`);
                                    showMessage('Book marked as returned successfully!');
                                    // Refresh history in modal and all dashboard stats
                                    const detailsRes = await API.get(`/auth/users/${selectedStudent.UserID}`);
                                    setSelectedStudentHistory(detailsRes.data.history);
                                    fetchAll();
                                  } catch (err) {
                                    showMessage(err.response?.data?.error || 'Failed to return book.', 'error');
                                  }
                                }}
                                style={{
                                  background: 'rgba(34,197,94,0.15)',
                                  border: '1px solid rgba(34,197,94,0.3)',
                                  color: '#4ade80',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                }}
                              >
                                Return
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>
                                {rec.ReturnDate ? new Date(rec.ReturnDate).toLocaleDateString() : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {selectedStudentHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                          No borrow history found for this student.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              className="btn-gradient"
              onClick={() => {
                setShowStudentDetailModal(false);
                setSelectedStudent(null);
                setSelectedStudentHistory([]);
              }}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              Close Details
            </button>
          </div>
        ) : null}
      </Modal>

      {/* ── Reservation Action Confirmation Modal ───────────── */}
      <Modal
        isOpen={reservationAction.open}
        onClose={closeReservationAction}
        title={`${reservationAction.status === 'Fulfilled' ? '✅ Fulfill' : '❌ Cancel'} Reservation${reservationAction.ids.length > 1 ? 's' : ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: '24rem' }}>
          <div style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            background: reservationAction.status === 'Fulfilled' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${reservationAction.status === 'Fulfilled' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}>
            <p style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: reservationAction.status === 'Fulfilled' ? '#4ade80' : '#f87171',
              marginBottom: '0.25rem',
            }}>
              {reservationAction.status === 'Fulfilled'
                ? `Fulfill ${reservationAction.ids.length} reservation${reservationAction.ids.length > 1 ? 's' : ''}?`
                : `Cancel ${reservationAction.ids.length} reservation${reservationAction.ids.length > 1 ? 's' : ''}?`
              }
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
              {reservationAction.status === 'Fulfilled'
                ? 'This will issue the book(s) to the student(s) with a 14-day loan period and decrement stock.'
                : 'This will cancel the reservation(s) and notify the student(s) via email.'
              }
            </p>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              color: 'var(--text-sub)',
              marginBottom: '0.375rem',
              fontWeight: 600,
            }}>
              Admin Note (optional)
            </label>
            <textarea
              className="input-glass"
              style={{ resize: 'vertical', minHeight: '4rem' }}
              value={reservationAction.note}
              onChange={(e) => setReservationAction({ ...reservationAction, note: e.target.value })}
              placeholder="Add a note for the student (e.g., pickup location, reason for cancellation)..."
              id="reservation-action-note"
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(99, 102, 241, 0.1)',
          }}>
            <select
              className="select-glass"
              style={{ width: 'auto', minWidth: '10rem' }}
              value={reservationAction.status}
              onChange={(e) => setReservationAction({ ...reservationAction, status: e.target.value })}
              id="reservation-action-status"
            >
              <option value="Fulfilled">✅ Fulfill</option>
              <option value="Cancelled">❌ Cancel</option>
            </select>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="tab-btn"
                onClick={closeReservationAction}
              >
                Go Back
              </button>
              <button
                type="button"
                className="btn-gradient"
                onClick={submitReservationAction}
                id="btn-confirm-reservation-action"
              >
                Confirm {reservationAction.status === 'Fulfilled' ? 'Fulfill' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
