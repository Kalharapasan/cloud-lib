// ============================================================
// Cloud Lib — Borrow Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { issueBook, returnBook, getMyHistory, getAllRecords, getOverdueRecords } = require('../controllers/borrowController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Student routes
router.get('/history', verifyToken, getMyHistory);

// Admin routes
router.post('/issue', verifyToken, requireRole('Admin'), issueBook);
router.put('/return/:recordId', verifyToken, requireRole('Admin'), returnBook);
router.get('/all', verifyToken, requireRole('Admin'), getAllRecords);
router.get('/overdue', verifyToken, requireRole('Admin'), getOverdueRecords);

module.exports = router;
