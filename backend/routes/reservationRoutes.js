// ============================================================
// Cloud Lib — Reservation Routes (Advanced Feature)
// ============================================================
const express = require('express');
const router = express.Router();
const {
  createReservation,
  getMyReservations,
  getAllReservations,
  updateReservationStatus,
  bulkUpdateStatus,
  getReservationReport
} = require('../controllers/reservationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Student-only route to create a reservation
router.post('/', verifyToken, requireRole('Student'), createReservation);

// Student-only route to view their own reservations
router.get('/my', verifyToken, requireRole('Student'), getMyReservations);

// Admin-only route to view all reservations
router.get('/all', verifyToken, requireRole('Admin'), getAllReservations);

// Admin-only route to update status (Fulfill / Cancel)
router.put('/:id/status', verifyToken, requireRole('Admin'), updateReservationStatus);

module.exports = router;
