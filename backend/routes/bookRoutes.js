// ============================================================
// Cloud Lib — Book Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { getAllBooks, getBookById, createBook, updateBook, deleteBook } = require('../controllers/bookController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Public/Authenticated routes
router.get('/', verifyToken, getAllBooks);
router.get('/:id', verifyToken, getBookById);

// Admin-only routes
router.post('/', verifyToken, requireRole('Admin'), createBook);
router.put('/:id', verifyToken, requireRole('Admin'), updateBook);
router.delete('/:id', verifyToken, requireRole('Admin'), deleteBook);

module.exports = router;
