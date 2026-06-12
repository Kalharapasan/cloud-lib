// ============================================================
// Cloud Lib — Auth Controller (Register / Login / Me)
// ============================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '24h';

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.UserID, email: user.Email, role: user.Role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const validRoles = ['Student', 'Admin'];
    const userRole = validRoles.includes(role) ? role : 'Student';

    // Check if email already exists
    const [existing] = await pool.query('SELECT UserID FROM Users WHERE Email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO Users (Name, Email, Role, PasswordHash) VALUES (?, ?, ?, ?)',
      [name, email, userRole, passwordHash]
    );

    const newUser = {
      UserID: result.insertId,
      Name: name,
      Email: email,
      Role: userRole
    };

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const [users] = await pool.query('SELECT * FROM Users WHERE Email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        UserID: user.UserID,
        Name: user.Name,
        Email: user.Email,
        Role: user.Role
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

/**
 * GET /api/auth/me
 * Get current user profile from JWT
 */
const getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT UserID, Name, Email, Role, CreatedAt FROM Users WHERE UserID = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: users[0] });
  } catch (err) {
    console.error('GetMe error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * GET /api/auth/users
 * Get all users (Admin only — used for issue book dropdown)
 */
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT UserID, Name, Email, Role FROM Users ORDER BY Name'
    );
    res.json({ users });
  } catch (err) {
    console.error('GetAllUsers error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { register, login, getMe, getAllUsers };
