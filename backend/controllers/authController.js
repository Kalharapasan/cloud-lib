// ============================================================
// Cloud Lib — Auth Controller (Register / Login / Me / CRUD)
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
    const { name, email, password, role, studentId, phone, department } = req.body;

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

    // Check if StudentID already exists
    if (userRole === 'Student' && studentId) {
      const [existingStu] = await pool.query('SELECT UserID FROM Users WHERE StudentID = ?', [studentId]);
      if (existingStu.length > 0) {
        return res.status(409).json({ error: 'Student ID already registered.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO Users (Name, Email, Role, PasswordHash, StudentID, Phone, Department) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, userRole, passwordHash, studentId || null, phone || null, department || null]
    );

    const newUser = {
      UserID: result.insertId,
      Name: name,
      Email: email,
      Role: userRole,
      StudentID: studentId || null,
      Phone: phone || null,
      Department: department || null
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
        Role: user.Role,
        StudentID: user.StudentID,
        Phone: user.Phone,
        Department: user.Department
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
      'SELECT UserID, Name, Email, Role, StudentID, Phone, Department, CreatedAt FROM Users WHERE UserID = ?',
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
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT UserID, Name, Email, Role, StudentID, Phone, Department, CreatedAt FROM Users ORDER BY Name'
    );
    res.json({ users });
  } catch (err) {
    console.error('GetAllUsers error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * POST /api/auth/users
 * Create a new user (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, studentId, phone, department } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const validRoles = ['Student', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    // Check email uniqueness
    const [existing] = await pool.query('SELECT UserID FROM Users WHERE Email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Check studentId uniqueness
    if (role === 'Student' && studentId) {
      const [existingStu] = await pool.query('SELECT UserID FROM Users WHERE StudentID = ?', [studentId]);
      if (existingStu.length > 0) {
        return res.status(409).json({ error: 'Student ID already registered.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO Users (Name, Email, Role, PasswordHash, StudentID, Phone, Department) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, role, passwordHash, studentId || null, phone || null, department || null]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        UserID: result.insertId,
        Name: name,
        Email: email,
        Role: role,
        StudentID: studentId || null,
        Phone: phone || null,
        Department: department || null
      }
    });
  } catch (err) {
    console.error('CreateUser error:', err.message);
    res.status(500).json({ error: 'Server error during user creation.' });
  }
};

/**
 * GET /api/auth/users/:id
 * Get details of a single user and their borrow history (Admin only)
 */
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user details
    const [users] = await pool.query(
      'SELECT UserID, Name, Email, Role, StudentID, Phone, Department, CreatedAt FROM Users WHERE UserID = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Get borrow history for this user
    const [borrowHistory] = await pool.query(
      `SELECT br.*, b.Title, b.Author, b.ISBN 
       FROM Borrow_Records br 
       JOIN Books b ON br.BookID = b.BookID 
       WHERE br.UserID = ? 
       ORDER BY br.IssueDate DESC`,
      [userId]
    );

    res.json({
      user: users[0],
      history: borrowHistory
    });
  } catch (err) {
    console.error('GetUserById error:', err.message);
    res.status(500).json({ error: 'Server error retrieving user details.' });
  }
};

/**
 * PUT /api/auth/users/:id
 * Update user details (Admin only)
 */
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, password, role, studentId, phone, department } = req.body;

    // Check user exists
    const [existing] = await pool.query('SELECT * FROM Users WHERE UserID = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = existing[0];

    // Check email uniqueness (exclude current user)
    if (email && email !== user.Email) {
      const [emailCheck] = await pool.query('SELECT UserID FROM Users WHERE Email = ?', [email]);
      if (emailCheck.length > 0) {
        return res.status(409).json({ error: 'Email already registered by another user.' });
      }
    }

    // Check studentId uniqueness (exclude current user)
    const finalRole = role || user.Role;
    if (finalRole === 'Student' && studentId && studentId !== user.StudentID) {
      const [stuCheck] = await pool.query('SELECT UserID FROM Users WHERE StudentID = ?', [studentId]);
      if (stuCheck.length > 0) {
        return res.status(409).json({ error: 'Student ID already registered by another student.' });
      }
    }

    // Hash password if provided
    let passwordHash = user.PasswordHash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    // Update statement
    await pool.query(
      `UPDATE Users 
       SET Name = ?, Email = ?, Role = ?, PasswordHash = ?, StudentID = ?, Phone = ?, Department = ? 
       WHERE UserID = ?`,
      [
        name || user.Name,
        email || user.Email,
        finalRole,
        passwordHash,
        finalRole === 'Student' ? (studentId || user.StudentID) : null,
        phone !== undefined ? phone : user.Phone,
        department !== undefined ? department : user.Department,
        userId
      ]
    );

    res.json({
      message: 'User updated successfully',
      user: {
        UserID: userId,
        Name: name || user.Name,
        Email: email || user.Email,
        Role: finalRole,
        StudentID: finalRole === 'Student' ? (studentId || user.StudentID) : null,
        Phone: phone !== undefined ? phone : user.Phone,
        Department: department !== undefined ? department : user.Department
      }
    });
  } catch (err) {
    console.error('UpdateUser error:', err.message);
    res.status(500).json({ error: 'Server error during user update.' });
  }
};

/**
 * DELETE /api/auth/users/:id
 * Delete user (Admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check user exists
    const [existing] = await pool.query('SELECT UserID, Role FROM Users WHERE UserID = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Avoid deleting the logged-in admin
    if (req.user.userId == userId) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    // Delete user (Borrow records will cascade delete in DB)
    await pool.query('DELETE FROM Users WHERE UserID = ?', [userId]);

    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('DeleteUser error:', err.message);
    res.status(500).json({ error: 'Server error during user deletion.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser
};
