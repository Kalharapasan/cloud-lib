// ============================================================
// Cloud Lib — Express Server Entry Point
// ============================================================
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const { startOverdueChecker } = require('./services/snsNotifier');
const { autoExpireReservations } = require('./controllers/reservationController');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health Check (used by Elastic Beanstalk ALB) ─────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const pool = require('./config/db');
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status:      isHealthy ? 'OK' : 'DEGRADED',
    service:     'Cloud Lib API',
    version:     process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database:    dbStatus,
    region:      process.env.AWS_REGION || 'local',
    timestamp:   new Date().toISOString(),
  });
});

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/reservations', reservationRoutes);

// ── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Cloud Lib API running on http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/api/health\n`);

  // Start the SNS overdue notification cron job
  startOverdueChecker();

  // ── Daily Auto-Expire Cron Job ────────────────────────────
  // Runs every day at midnight to expire old pending reservations
  cron.schedule('0 0 * * *', async () => {
    console.log('\n⏰ [Cron] Running daily reservation auto-expire job...');
    const result = await autoExpireReservations();
    console.log(`⏰ [Cron] Auto-expire result:`, result);
  });
  console.log('⏰ Reservation Auto-Expire scheduled — runs daily at midnight');

  // Run once on startup (10s delay to let DB pool settle)
  setTimeout(async () => {
    console.log('\n⏰ [Cron] Initial reservation expiry check on startup...');
    await autoExpireReservations();
  }, 10000);
});

module.exports = app;
