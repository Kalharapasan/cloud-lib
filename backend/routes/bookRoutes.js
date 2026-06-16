// ============================================================
// Cloud Lib — Book Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { getAllBooks, getBookById, createBook, updateBook, deleteBook, uploadCoverImage } = require('../controllers/bookController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public/Authenticated routes
router.get('/', verifyToken, getAllBooks);
router.get('/:id', verifyToken, getBookById);

// Admin-only routes
router.post('/', verifyToken, requireRole('Admin'), createBook);
router.post('/upload', verifyToken, requireRole('Admin'), (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, uploadCoverImage);
router.put('/:id', verifyToken, requireRole('Admin'), updateBook);
router.delete('/:id', verifyToken, requireRole('Admin'), deleteBook);

module.exports = router;
