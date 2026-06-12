// ============================================================
// Cloud Lib — Auth Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers, createUser, getUserById, updateUser, deleteUser } = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', verifyToken, getMe);

// Admin-only User Management routes
router.get('/users', verifyToken, requireRole('Admin'), getAllUsers);
router.post('/users', verifyToken, requireRole('Admin'), createUser);
router.get('/users/:id', verifyToken, requireRole('Admin'), getUserById);
router.put('/users/:id', verifyToken, requireRole('Admin'), updateUser);
router.delete('/users/:id', verifyToken, requireRole('Admin'), deleteUser);

module.exports = router;
