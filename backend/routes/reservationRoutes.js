// ============================================================
// Cloud Lib — Reservation Routes (Advanced Feature)
// Supports: create, view, cancel, admin manage, bulk, stats, report
// ============================================================
const express = require('express');
const router = express.Router();
const {
  createReservation,
  getMyReservations,
  cancelMyReservation,
  getAllReservations,
  updateReservationStatus,
  bulkUpdateStatus,
  getReservationStats,
  getReservationReport,
} = require('../controllers/reservationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// ── Student Routes ──────────────────────────────────────────

// Create a new reservation
router.post('/', verifyToken, requireRole('Student'), createReservation);

// View own reservations
router.get('/my', verifyToken, requireRole('Student'), getMyReservations);

// Cancel own pending reservation
router.delete('/:id/cancel', verifyToken, requireRole('Student'), cancelMyReservation);

// ── Admin Routes ────────────────────────────────────────────

// View all reservations (with optional search/filter query params)
router.get('/all', verifyToken, requireRole('Admin'), getAllReservations);

// Reservation statistics & analytics
router.get('/stats', verifyToken, requireRole('Admin'), getReservationStats);

// Reservation report (JSON or CSV export)
router.get('/report', verifyToken, requireRole('Admin'), getReservationReport);

// Update single reservation status (Fulfill / Cancel)
router.put('/:id/status', verifyToken, requireRole('Admin'), updateReservationStatus);

// Bulk update reservation status
router.put('/bulk/status', verifyToken, requireRole('Admin'), bulkUpdateStatus);

module.exports = router;
