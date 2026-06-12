// ============================================================
// Cloud Lib — Reservation Controller (Advanced Feature)
// Features: CRUD, student cancellation, bulk actions, email
//           templates, auto-expire, reporting & statistics
// ============================================================
const pool = require('../config/db');
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (err) {
  console.warn('⚠️  [Email] nodemailer is not installed — email notifications will be disabled');
}

// ── Configuration ───────────────────────────────────────────
const RESERVATION_TTL_DAYS = parseInt(process.env.RESERVATION_TTL_DAYS) || 7;

// ── Email Transporter (graceful fallback to console) ────────
let transporter = null;
try {
  if (nodemailer && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✅ [Email] SMTP transporter configured');
  } else {
    console.log('📧 [Email] No SMTP_HOST set — emails will be logged to console');
  }
} catch (err) {
  console.warn('⚠️  [Email] Failed to create transporter:', err.message);
}

// ── Custom Email Templates ──────────────────────────────────
const emailTemplates = {
  /** Reservation placed confirmation (to student) */
  reservationPlaced: (studentName, bookTitle) => ({
    subject: `📚 Reservation Confirmed — ${bookTitle}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px">
          <h1 style="margin:0;font-size:22px;color:#fff">Cloud Lib 📚</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#a5b4fc;margin-top:0">Reservation Placed!</h2>
          <p>Hi <strong>${studentName}</strong>,</p>
          <p>Your reservation for <strong style="color:#c4b5fd">${bookTitle}</strong> has been recorded.</p>
          <p>An administrator will review your request. You'll receive a notification when it's fulfilled or if it's cancelled.</p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;font-size:13px;color:#94a3b8">⏳ Reservations expire automatically after <strong style="color:#fbbf24">${RESERVATION_TTL_DAYS} days</strong> if not processed.</p>
          </div>
          <p style="color:#64748b;font-size:12px">— Cloud Lib Automated System</p>
        </div>
      </div>`,
  }),

  /** Reservation fulfilled (to student) */
  reservationFulfilled: (studentName, bookTitle, dueDate) => ({
    subject: `✅ Reservation Fulfilled — ${bookTitle}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:24px 32px">
          <h1 style="margin:0;font-size:22px;color:#fff">Cloud Lib 📚</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#4ade80;margin-top:0">Book Issued!</h2>
          <p>Hi <strong>${studentName}</strong>,</p>
          <p>Great news! Your reservation for <strong style="color:#86efac">${bookTitle}</strong> has been approved and the book has been issued to you.</p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:4px 0;font-size:14px">📅 <strong>Due Date:</strong> <span style="color:#fbbf24">${new Date(dueDate).toLocaleDateString('en-GB')}</span></p>
          </div>
          <p>Please return the book on or before the due date to avoid penalties.</p>
          <p style="color:#64748b;font-size:12px">— Cloud Lib Automated System</p>
        </div>
      </div>`,
  }),

  /** Reservation cancelled (to student) */
  reservationCancelled: (studentName, bookTitle, reason) => ({
    subject: `❌ Reservation Cancelled — ${bookTitle}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:24px 32px">
          <h1 style="margin:0;font-size:22px;color:#fff">Cloud Lib 📚</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#f87171;margin-top:0">Reservation Cancelled</h2>
          <p>Hi <strong>${studentName}</strong>,</p>
          <p>Unfortunately, your reservation for <strong style="color:#fca5a5">${bookTitle}</strong> has been cancelled.</p>
          ${reason ? `<div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0;font-size:13px;color:#94a3b8">💬 <strong>Reason:</strong> ${reason}</p></div>` : ''}
          <p>You may place a new reservation at any time.</p>
          <p style="color:#64748b;font-size:12px">— Cloud Lib Automated System</p>
        </div>
      </div>`,
  }),

  /** Reservation expired (to student) */
  reservationExpired: (studentName, bookTitle) => ({
    subject: `⏰ Reservation Expired — ${bookTitle}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px 32px">
          <h1 style="margin:0;font-size:22px;color:#fff">Cloud Lib 📚</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#fbbf24;margin-top:0">Reservation Expired</h2>
          <p>Hi <strong>${studentName}</strong>,</p>
          <p>Your reservation for <strong style="color:#fde68a">${bookTitle}</strong> has expired after ${RESERVATION_TTL_DAYS} days without being processed.</p>
          <p>Feel free to place a new reservation if the book is still available.</p>
          <p style="color:#64748b;font-size:12px">— Cloud Lib Automated System</p>
        </div>
      </div>`,
  }),

  /** Student self-cancellation confirmation */
  studentCancelled: (studentName, bookTitle) => ({
    subject: `🔔 Reservation Withdrawn — ${bookTitle}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#64748b,#475569);padding:24px 32px">
          <h1 style="margin:0;font-size:22px;color:#fff">Cloud Lib 📚</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#94a3b8;margin-top:0">Reservation Withdrawn</h2>
          <p>Hi <strong>${studentName}</strong>,</p>
          <p>Your reservation for <strong>${bookTitle}</strong> has been cancelled at your request.</p>
          <p>You can place a new reservation at any time from your dashboard.</p>
          <p style="color:#64748b;font-size:12px">— Cloud Lib Automated System</p>
        </div>
      </div>`,
  }),
};

// ── Email Sender Helper ─────────────────────────────────────
/**
 * Send an email using the configured transporter.
 * Falls back to console logging if SMTP is not configured.
 */
const sendEmail = async (to, template) => {
  const { subject, html } = template;
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Cloud Lib" <no-reply@cloudlib.com>',
        to,
        subject,
        html,
      });
      console.log(`✅ [Email] Sent to ${to}: ${subject}`);
    } catch (err) {
      console.error(`❌ [Email] Failed to send to ${to}:`, err.message);
    }
  } else {
    // Console fallback for development
    console.log(`📧 [Email Simulated] To: ${to} | Subject: ${subject}`);
  }
};

// ============================================================
// POST /api/reservations
// Create a new book reservation (Student only)
// Body: { bookId, priority? }
// ============================================================
const createReservation = async (req, res) => {
  try {
    const { bookId, priority } = req.body;
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

    // Create reservation with optional priority
    const validPriority = ['Normal', 'High'].includes(priority) ? priority : 'Normal';
    await pool.query(
      'INSERT INTO Reservations (UserID, BookID, Status, Priority) VALUES (?, ?, ?, ?)',
      [userId, bookId, 'Pending', validPriority]
    );

    // Fetch student name for email
    const [userRows] = await pool.query('SELECT Name, Email FROM Users WHERE UserID = ?', [userId]);
    if (userRows.length > 0) {
      await sendEmail(
        userRows[0].Email,
        emailTemplates.reservationPlaced(userRows[0].Name, books[0].Title)
      );
    }

    res.status(201).json({ message: 'Book reservation placed successfully!' });
  } catch (err) {
    console.error('CreateReservation error:', err.message);
    res.status(500).json({ error: 'Failed to create reservation.' });
  }
};

// ============================================================
// GET /api/reservations/my
// Get logged-in student's reservations
// ============================================================
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

// ============================================================
// DELETE /api/reservations/:id/cancel
// Student-initiated cancellation of their own pending reservation
// ============================================================
const cancelMyReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify ownership and pending status
    const [rows] = await pool.query(
      `SELECT r.*, b.Title, u.Name, u.Email
       FROM Reservations r
       JOIN Books b ON r.BookID = b.BookID
       JOIN Users u ON r.UserID = u.UserID
       WHERE r.ReservationID = ? AND r.UserID = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const reservation = rows[0];
    if (reservation.Status !== 'Pending') {
      return res.status(400).json({ error: `Cannot cancel a reservation with status "${reservation.Status}".` });
    }

    // Cancel the reservation
    await pool.query(
      'UPDATE Reservations SET Status = ? WHERE ReservationID = ?',
      ['Cancelled', id]
    );

    // Send confirmation email to student
    await sendEmail(
      reservation.Email,
      emailTemplates.studentCancelled(reservation.Name, reservation.Title)
    );

    res.json({ message: 'Reservation cancelled successfully.' });
  } catch (err) {
    console.error('CancelMyReservation error:', err.message);
    res.status(500).json({ error: 'Failed to cancel reservation.' });
  }
};

// ============================================================
// GET /api/reservations/all
// List all reservations with optional search/filter (Admin only)
// Query params: ?status=Pending&student=name&book=title&from=date&to=date
// ============================================================
const getAllReservations = async (req, res) => {
  try {
    const { status, student, book, from, to } = req.query;
    let query = `
      SELECT r.*, u.Name AS UserName, u.Email AS UserEmail, u.StudentID,
             b.Title, b.Author, b.ISBN, b.Quantity AS AvailableQty
      FROM Reservations r
      JOIN Users u ON r.UserID = u.UserID
      JOIN Books b ON r.BookID = b.BookID
      WHERE 1=1`;
    const params = [];

    // Apply filters
    if (status) {
      query += ' AND r.Status = ?';
      params.push(status);
    }
    if (student) {
      query += ' AND (u.Name LIKE ? OR u.StudentID LIKE ?)';
      params.push(`%${student}%`, `%${student}%`);
    }
    if (book) {
      query += ' AND (b.Title LIKE ? OR b.ISBN LIKE ?)';
      params.push(`%${book}%`, `%${book}%`);
    }
    if (from) {
      query += ' AND r.RequestDate >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND r.RequestDate <= ?';
      params.push(to + ' 23:59:59');
    }

    query += ' ORDER BY r.RequestDate DESC';

    const [reservations] = await pool.query(query, params);
    res.json({ reservations });
  } catch (err) {
    console.error('GetAllReservations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
};

// ============================================================
// PUT /api/reservations/:id/status
// Update reservation status: Fulfill or Cancel (Admin only)
// Body: { status, note? } — status: 'Fulfilled' | 'Cancelled'
// ============================================================
const updateReservationStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!['Fulfilled', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Fulfilled or Cancelled.' });
    }

    await connection.beginTransaction();

    // Fetch reservation with user and book info for email
    const [reservations] = await connection.query(
      `SELECT r.*, u.Name AS UserName, u.Email AS UserEmail, b.Title AS BookTitle
       FROM Reservations r
       JOIN Users u ON r.UserID = u.UserID
       JOIN Books b ON r.BookID = b.BookID
       WHERE r.ReservationID = ? FOR UPDATE`,
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

    let dueDate = null;

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

      // Issue the book (14-day loan period)
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      await connection.query(
        'INSERT INTO Borrow_Records (UserID, BookID, DueDate, ReturnStatus) VALUES (?, ?, ?, ?)',
        [reservation.UserID, reservation.BookID, dueDate, 'Pending']
      );

      // Decrement book stock
      const newQty = books[0].Quantity - 1;
      const newBookStatus = newQty > 0 ? 'Available' : 'Out of Stock';
      await connection.query(
        'UPDATE Books SET Quantity = ?, Status = ? WHERE BookID = ?',
        [newQty, newBookStatus, reservation.BookID]
      );
    }

    // Update reservation status and optional admin note
    await connection.query(
      'UPDATE Reservations SET Status = ?, AdminNote = ? WHERE ReservationID = ?',
      [status, note || null, id]
    );

    await connection.commit();

    // Send email notification based on status
    if (status === 'Fulfilled') {
      await sendEmail(
        reservation.UserEmail,
        emailTemplates.reservationFulfilled(reservation.UserName, reservation.BookTitle, dueDate)
      );
    } else {
      await sendEmail(
        reservation.UserEmail,
        emailTemplates.reservationCancelled(reservation.UserName, reservation.BookTitle, note)
      );
    }

    res.json({ message: `Reservation marked as ${status} successfully.` });
  } catch (err) {
    await connection.rollback();
    console.error('UpdateReservationStatus error:', err.message);
    res.status(500).json({ error: 'Failed to update reservation status.' });
  } finally {
    connection.release();
  }
};

// ============================================================
// PUT /api/reservations/bulk/status
// Bulk update reservation status (Admin only)
// Body: { ids: [int], status: 'Fulfilled' | 'Cancelled', note? }
// ============================================================
const bulkUpdateStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { ids, status, note } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required.' });
    }
    if (!['Fulfilled', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    await connection.beginTransaction();

    // Fetch all matching pending reservations with user/book info
    const [rows] = await connection.query(
      `SELECT r.ReservationID, r.UserID, r.BookID,
              u.Name AS UserName, u.Email AS UserEmail,
              b.Title AS BookTitle
       FROM Reservations r
       JOIN Users u ON r.UserID = u.UserID
       JOIN Books b ON r.BookID = b.BookID
       WHERE r.ReservationID IN (?) AND r.Status = ?`,
      [ids, 'Pending']
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'No pending reservations found for the given IDs.' });
    }

    let fulfilled = 0;
    let skipped = 0;

    for (const r of rows) {
      if (status === 'Fulfilled') {
        // Check book stock
        const [books] = await connection.query(
          'SELECT Quantity FROM Books WHERE BookID = ? FOR UPDATE',
          [r.BookID]
        );
        if (books.length === 0 || books[0].Quantity <= 0) {
          skipped++;
          continue; // Skip this one instead of aborting entire batch
        }

        // Check for existing active loan
        const [active] = await connection.query(
          'SELECT RecordID FROM Borrow_Records WHERE UserID = ? AND BookID = ? AND ReturnStatus = ?',
          [r.UserID, r.BookID, 'Pending']
        );
        if (active.length > 0) {
          skipped++;
          continue;
        }

        // Issue book
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        await connection.query(
          'INSERT INTO Borrow_Records (UserID, BookID, DueDate, ReturnStatus) VALUES (?, ?, ?, ?)',
          [r.UserID, r.BookID, dueDate, 'Pending']
        );

        // Decrement stock
        const newQty = books[0].Quantity - 1;
        const newBookStatus = newQty > 0 ? 'Available' : 'Out of Stock';
        await connection.query(
          'UPDATE Books SET Quantity = ?, Status = ? WHERE BookID = ?',
          [newQty, newBookStatus, r.BookID]
        );

        // Update reservation
        await connection.query(
          'UPDATE Reservations SET Status = ?, AdminNote = ? WHERE ReservationID = ?',
          ['Fulfilled', note || null, r.ReservationID]
        );

        // Send email
        await sendEmail(r.UserEmail, emailTemplates.reservationFulfilled(r.UserName, r.BookTitle, dueDate));
        fulfilled++;
      } else {
        // Cancel
        await connection.query(
          'UPDATE Reservations SET Status = ?, AdminNote = ? WHERE ReservationID = ?',
          ['Cancelled', note || null, r.ReservationID]
        );
        await sendEmail(r.UserEmail, emailTemplates.reservationCancelled(r.UserName, r.BookTitle, note));
        fulfilled++;
      }
    }

    await connection.commit();
    res.json({
      message: `Bulk ${status.toLowerCase()} completed: ${fulfilled} processed, ${skipped} skipped.`,
      processed: fulfilled,
      skipped,
    });
  } catch (err) {
    await connection.rollback();
    console.error('BulkUpdateStatus error:', err.message);
    res.status(500).json({ error: 'Bulk update failed.' });
  } finally {
    connection.release();
  }
};

// ============================================================
// GET /api/reservations/stats
// Reservation statistics & analytics (Admin only)
// ============================================================
const getReservationStats = async (req, res) => {
  try {
    // Overall counts
    const [counts] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(Status = 'Pending')   AS pending,
        SUM(Status = 'Fulfilled') AS fulfilled,
        SUM(Status = 'Cancelled') AS cancelled,
        SUM(Status = 'Expired')   AS expired
      FROM Reservations
    `);

    // Most reserved books (top 5)
    const [topBooks] = await pool.query(`
      SELECT b.Title, b.Author, COUNT(r.ReservationID) AS reservationCount
      FROM Reservations r
      JOIN Books b ON r.BookID = b.BookID
      GROUP BY r.BookID, b.Title, b.Author
      ORDER BY reservationCount DESC
      LIMIT 5
    `);

    // Reservations per day (last 30 days)
    const [dailyTrend] = await pool.query(`
      SELECT DATE(RequestDate) AS date, COUNT(*) AS count
      FROM Reservations
      WHERE RequestDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(RequestDate)
      ORDER BY date ASC
    `);

    // Average fulfillment time (in hours)
    const [avgTime] = await pool.query(`
      SELECT AVG(TIMESTAMPDIFF(HOUR, RequestDate, 
        (SELECT MIN(br.IssueDate) FROM Borrow_Records br 
         WHERE br.UserID = r.UserID AND br.BookID = r.BookID 
         AND br.IssueDate >= DATE(r.RequestDate))
      )) AS avgFulfillmentHours
      FROM Reservations r
      WHERE r.Status = 'Fulfilled'
    `);

    // Most active students (top 5 by reservation count)
    const [topStudents] = await pool.query(`
      SELECT u.Name, u.StudentID, COUNT(r.ReservationID) AS reservationCount
      FROM Reservations r
      JOIN Users u ON r.UserID = u.UserID
      GROUP BY r.UserID, u.Name, u.StudentID
      ORDER BY reservationCount DESC
      LIMIT 5
    `);

    res.json({
      stats: {
        ...counts[0],
        avgFulfillmentHours: Math.round(avgTime[0]?.avgFulfillmentHours || 0),
        topBooks,
        dailyTrend,
        topStudents,
      },
    });
  } catch (err) {
    console.error('GetReservationStats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reservation statistics.' });
  }
};

// ============================================================
// GET /api/reservations/report
// Reservation report with optional CSV export (Admin only)
// Query: ?format=csv
// ============================================================
const getReservationReport = async (req, res) => {
  try {
    const [allReservations] = await pool.query(`
      SELECT r.ReservationID, u.Name AS StudentName, u.StudentID, u.Email,
             b.Title AS BookTitle, b.ISBN,
             r.RequestDate, r.Status, r.Priority, r.AdminNote
      FROM Reservations r
      JOIN Users u ON r.UserID = u.UserID
      JOIN Books b ON r.BookID = b.BookID
      ORDER BY r.RequestDate DESC
    `);

    if (req.query.format === 'csv') {
      // Build CSV
      const headers = 'ReservationID,Student,StudentID,Email,Book,ISBN,RequestDate,Status,Priority,Note';
      const rows = allReservations.map(r =>
        `${r.ReservationID},"${r.StudentName}","${r.StudentID || ''}","${r.Email}","${r.BookTitle}","${r.ISBN}",${new Date(r.RequestDate).toISOString()},${r.Status},${r.Priority},"${(r.AdminNote || '').replace(/"/g, '""')}"`
      );
      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="reservation_report.csv"');
      return res.send(csv);
    }

    // JSON report with summary
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(Status = 'Pending')   AS pending,
        SUM(Status = 'Fulfilled') AS fulfilled,
        SUM(Status = 'Cancelled') AS cancelled,
        SUM(Status = 'Expired')   AS expired
      FROM Reservations
    `);

    res.json({ report: stats[0], reservations: allReservations });
  } catch (err) {
    console.error('ReservationReport error:', err.message);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
};

// ============================================================
// Auto-Expire Job — Expire pending reservations older than TTL
// Called by the cron scheduler in server.js
// ============================================================
const autoExpireReservations = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RESERVATION_TTL_DAYS);

    // Find all pending reservations older than TTL
    const [toExpire] = await connection.query(
      `SELECT r.ReservationID, r.UserID, r.BookID,
              u.Name AS UserName, u.Email AS UserEmail,
              b.Title AS BookTitle
       FROM Reservations r
       JOIN Users u ON r.UserID = u.UserID
       JOIN Books b ON r.BookID = b.BookID
       WHERE r.Status = ? AND r.RequestDate < ?`,
      ['Pending', cutoff]
    );

    if (toExpire.length === 0) {
      await connection.commit();
      console.log('📗 [Auto-Expire] No expired reservations found.');
      return { expired: 0 };
    }

    const ids = toExpire.map(r => r.ReservationID);
    await connection.query(
      'UPDATE Reservations SET Status = ? WHERE ReservationID IN (?)',
      ['Expired', ids]
    );

    await connection.commit();

    // Send expiry email to each student (after commit so DB is consistent)
    for (const r of toExpire) {
      await sendEmail(r.UserEmail, emailTemplates.reservationExpired(r.UserName, r.BookTitle));
    }

    console.log(`⏰ [Auto-Expire] Expired ${ids.length} reservation(s).`);
    return { expired: ids.length };
  } catch (err) {
    await connection.rollback();
    console.error('AutoExpireReservations error:', err.message);
    return { expired: 0, error: err.message };
  } finally {
    connection.release();
  }
};

// ============================================================
// Exports
// ============================================================
module.exports = {
  createReservation,
  getMyReservations,
  cancelMyReservation,
  getAllReservations,
  updateReservationStatus,
  bulkUpdateStatus,
  getReservationStats,
  getReservationReport,
  autoExpireReservations,
};
