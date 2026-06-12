// ============================================================
// Cloud Lib — Reservation Controller (Advanced Feature)
// ============================================================
const pool = require('../config/db');

/**
 * POST /api/reservations
 * Create a new book reservation (Student only)
 * Body: { bookId }
 */
const createReservation = async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = req.user.userId;

    if (!bookId) {
      return res.status(400).json({ error: 'Book ID is required.' });
    }

    // Verify book exists
    const [books] = await pool.query('SELECT * FROM Books WHERE BookID = ?', [bookId]);
    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    // Check if student already has a pending reservation for this book
    const [existing] = await pool.query(
      'SELECT ReservationID FROM Reservations WHERE UserID = ? AND BookID = ? AND Status = ?',
      [userId, bookId, 'Pending']
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already have a pending reservation for this book.' });
    }

    // Create reservation
    await pool.query(
      'INSERT INTO Reservations (UserID, BookID, Status) VALUES (?, ?, ?)',
      [userId, bookId, 'Pending']
    );

    res.status(201).json({ message: 'Book reservation placed successfully!' });
  } catch (err) {
    console.error('CreateReservation error:', err.message);
    res.status(500).json({ error: 'Failed to create reservation.' });
  }
};

/**
 * GET /api/reservations/my
 * Get logged-in student's reservations
 */
const getMyReservations = async (req, res) => {
  try {
    const [reservations] = await pool.query(
      `SELECT r.*, b.Title, b.Author, b.ISBN, b.Status AS BookAvailability
       FROM Reservations r
       JOIN Books b ON r.BookID = b.BookID
       WHERE r.UserID = ?
       ORDER BY r.RequestDate DESC`,
      [req.user.userId]
    );
    res.json({ reservations });
  } catch (err) {
    console.error('GetMyReservations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
};

/**
 * GET /api/reservations/all
 * List all reservations (Admin only)
 */
const getAllReservations = async (req, res) => {
  try {
    const [reservations] = await pool.query(
      `SELECT r.*, u.Name AS UserName, u.Email AS UserEmail, u.StudentID,
              b.Title, b.Author, b.ISBN, b.Quantity AS AvailableQty
       FROM Reservations r
       JOIN Users u ON r.UserID = u.UserID
       JOIN Books b ON r.BookID = b.BookID
       ORDER BY r.RequestDate DESC`
    );
    res.json({ reservations });
  } catch (err) {
    console.error('GetAllReservations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
};

/**
 * PUT /api/reservations/:id/status
 * Update reservation status: Fulfill or Cancel (Admin only)
 * Body: { status } ('Fulfilled', 'Cancelled')
 */
const updateReservationStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Fulfilled', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Fulfilled or Cancelled.' });
    }

    await connection.beginTransaction();

    // Check reservation exists
    const [reservations] = await connection.query(
      'SELECT * FROM Reservations WHERE ReservationID = ? FOR UPDATE',
      [id]
    );
    if (reservations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const reservation = reservations[0];
    if (reservation.Status !== 'Pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Reservation is already processed.' });
    }

    if (status === 'Fulfilled') {
      // Check if book is available
      const [books] = await connection.query(
        'SELECT Quantity, Status FROM Books WHERE BookID = ? FOR UPDATE',
        [reservation.BookID]
      );
      if (books.length === 0 || books[0].Quantity <= 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Book is currently out of stock. Cannot fulfill reservation.' });
      }

      // Check if user already has this book active
      const [activeLoans] = await connection.query(
        'SELECT RecordID FROM Borrow_Records WHERE UserID = ? AND BookID = ? AND ReturnStatus = ?',
        [reservation.UserID, reservation.BookID, 'Pending']
      );
      if (activeLoans.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'User already has an active loan for this book.' });
      }

      // 1. Issue the book (default 14 days)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      await connection.query(
        'INSERT INTO Borrow_Records (UserID, BookID, DueDate, ReturnStatus) VALUES (?, ?, ?, ?)',
        [reservation.UserID, reservation.BookID, dueDate, 'Pending']
      );

      // 2. Decrement book stock
      const newQty = books[0].Quantity - 1;
      const newBookStatus = newQty > 0 ? 'Available' : 'Out of Stock';
      await connection.query(
        'UPDATE Books SET Quantity = ?, Status = ? WHERE BookID = ?',
        [newQty, newBookStatus, reservation.BookID]
      );
    }

    // Update reservation status
    await connection.query(
      'UPDATE Reservations SET Status = ? WHERE ReservationID = ?',
      [status, id]
    );

    await connection.commit();
    res.json({ message: `Reservation marked as ${status} successfully.` });
  } catch (err) {
    await connection.rollback();
    console.error('UpdateReservationStatus error:', err.message);
    res.status(500).json({ error: 'Failed to update reservation status.' });
  } finally {
    connection.release();
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  getAllReservations,
  updateReservationStatus
};
