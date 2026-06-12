// ============================================================
// Cloud Lib — Auth Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers } = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', verifyToken, getMe);
router.get('/users', verifyToken, requireRole('Admin'), getAllUsers);

module.exports = router;
