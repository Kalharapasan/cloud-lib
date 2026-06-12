// ============================================================
// Cloud Lib — Borrow Controller (Issue / Return / History)
// ============================================================
const pool = require('../config/db');

/**
 * POST /api/borrow/issue
 * Issue a book to a user (Admin only)
 * Body: { userId, bookId, dueDays? }
 */
const issueBook = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { userId, bookId, dueDays } = req.body;

    if (!userId || !bookId) {
      return res.status(400).json({ error: 'userId and bookId are required.' });
    }

    await connection.beginTransaction();

    // Check book availability
    const [books] = await connection.query('SELECT * FROM Books WHERE BookID = ? FOR UPDATE', [bookId]);
    if (books.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Book not found.' });
    }
    if (books[0].Quantity <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Book is out of stock.' });
    }

    // Check user exists
    const [users] = await connection.query('SELECT UserID FROM Users WHERE UserID = ?', [userId]);
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if user already has this book (pending)
    const [activeLoans] = await connection.query(
      'SELECT RecordID FROM Borrow_Records WHERE UserID = ? AND BookID = ? AND ReturnStatus = ?',
      [userId, bookId, 'Pending']
    );
    if (activeLoans.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'User already has this book on loan.' });
    }

    // Calculate due date (default 14 days)
    const days = parseInt(dueDays) || 14;
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    // Create borrow record
    const [result] = await connection.query(
      'INSERT INTO Borrow_Records (UserID, BookID, IssueDate, DueDate, ReturnStatus) VALUES (?, ?, ?, ?, ?)',
      [userId, bookId, issueDate, dueDate, 'Pending']
    );

    // Decrement book quantity
    const newQty = books[0].Quantity - 1;
    const newStatus = newQty > 0 ? 'Available' : 'Out of Stock';
    await connection.query(
      'UPDATE Books SET Quantity = ?, Status = ? WHERE BookID = ?',
      [newQty, newStatus, bookId]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Book issued successfully',
      record: {
        RecordID: result.insertId,
        UserID: userId,
        BookID: bookId,
        IssueDate: issueDate.toISOString().split('T')[0],
        DueDate: dueDate.toISOString().split('T')[0],
        ReturnStatus: 'Pending'
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('IssueBook error:', err.message);
    res.status(500).json({ error: 'Failed to issue book.' });
  } finally {
    connection.release();
  }
};

/**
 * PUT /api/borrow/return/:recordId
 * Mark a borrow record as returned (Admin only)
 */
const returnBook = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { recordId } = req.params;

    await connection.beginTransaction();

    // Get borrow record
    const [records] = await connection.query(
      'SELECT * FROM Borrow_Records WHERE RecordID = ?',
      [recordId]
    );
    if (records.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Borrow record not found.' });
    }
    if (records[0].ReturnStatus === 'Returned') {
      await connection.rollback();
      return res.status(400).json({ error: 'Book has already been returned.' });
    }

    // Update return status
    const returnDate = new Date();
    await connection.query(
      'UPDATE Borrow_Records SET ReturnStatus = ?, ReturnDate = ? WHERE RecordID = ?',
      ['Returned', returnDate, recordId]
    );

    // Increment book quantity
    await connection.query(
      'UPDATE Books SET Quantity = Quantity + 1, Status = ? WHERE BookID = ?',
      ['Available', records[0].BookID]
    );

    await connection.commit();

    res.json({
      message: 'Book returned successfully',
      returnDate: returnDate.toISOString().split('T')[0]
    });
  } catch (err) {
    await connection.rollback();
    console.error('ReturnBook error:', err.message);
    res.status(500).json({ error: 'Failed to return book.' });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/borrow/history
 * Get personal borrowing history for the logged-in student
 */
const getMyHistory = async (req, res) => {
  try {
    const [records] = await pool.query(
      `SELECT br.*, b.Title, b.Author, b.ISBN 
       FROM Borrow_Records br 
       JOIN Books b ON br.BookID = b.BookID 
       WHERE br.UserID = ? 
       ORDER BY br.IssueDate DESC`,
      [req.user.userId]
    );
    res.json({ records });
  } catch (err) {
    console.error('GetMyHistory error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
};

/**
 * GET /api/borrow/all
 * Get all borrow records with user/book details (Admin only)
 */
const getAllRecords = async (req, res) => {
  try {
    const [records] = await pool.query(
      `SELECT br.*, u.Name AS UserName, u.Email AS UserEmail, 
              b.Title, b.Author, b.ISBN
       FROM Borrow_Records br
       JOIN Users u ON br.UserID = u.UserID
       JOIN Books b ON br.BookID = b.BookID
       ORDER BY br.IssueDate DESC`
    );
    res.json({ records });
  } catch (err) {
    console.error('GetAllRecords error:', err.message);
    res.status(500).json({ error: 'Failed to fetch records.' });
  }
};

/**
 * GET /api/borrow/overdue
 * Get all overdue, unreturned records (Admin only)
 */
const getOverdueRecords = async (req, res) => {
  try {
    const [records] = await pool.query(
      `SELECT br.*, u.Name AS UserName, u.Email AS UserEmail,
              b.Title, b.Author,
              DATEDIFF(CURDATE(), br.DueDate) AS DaysOverdue
       FROM Borrow_Records br
       JOIN Users u ON br.UserID = u.UserID
       JOIN Books b ON br.BookID = b.BookID
       WHERE br.ReturnStatus = 'Pending' AND br.DueDate < CURDATE()
       ORDER BY br.DueDate ASC`
    );
    res.json({ records });
  } catch (err) {
    console.error('GetOverdueRecords error:', err.message);
    res.status(500).json({ error: 'Failed to fetch overdue records.' });
  }
};

module.exports = { issueBook, returnBook, getMyHistory, getAllRecords, getOverdueRecords };
