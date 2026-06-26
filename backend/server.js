// server.js — Point d'entrée du backend SecuraSanté (PostgreSQL)
require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http    = require('http');
const cors    = require('cors');
const path    = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const { initSocket } = require('./socket');

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Démarrage asynchrone ───────────────────────────────────────
async function start() {
  await require('./db/database').initDb();

  // ── Socket.IO (temps réel) ────────────────────────────────────
  const io = initSocket(server);
  io.engine.on('connection_error', (err) => {
    console.error('⚠️ Socket.IO connection error:', err.message);
  });

  process.on('SIGINT', () => process.exit());
  process.on('SIGTERM', () => process.exit());

  // ── Routes API ───────────────────────────────────────────────
  app.use('/api/auth',           require('./routes/auth'));
  app.use('/api/assures',        require('./routes/assures'));
  app.use('/api/medecins',       require('./routes/medecins'));
  app.use('/api/feuilles',       require('./routes/feuilles'));
  app.use('/api/remboursements', require('./routes/remboursements'));
  app.use('/api/prescriptions',  require('./routes/prescriptions'));
  app.use('/api/stats',          require('./routes/stats'));

  // ── Frontend statique ────────────────────────────────────────
  const FRONTEND = path.join(__dirname, '../frontend');
  app.use(express.static(FRONTEND));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(FRONTEND, 'index.html'));
    }
  });

  // ── Gestion globale des erreurs ──────────────────────────────
  app.use((err, req, res, _next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  });

  server.listen(PORT, '0.0.0.0', () => {
    const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    console.log(`\n🏥  SecuraSanté API démarrée`);
    console.log(`🌐  URL: ${host}`);
    console.log(`📧  SMTP: ${process.env.SMTP_HOST || 'non configuré'}`);
    console.log(`📋  Endpoints disponibles :`);
    console.log(`    POST /api/auth/login`);
    console.log(`    GET  /api/assures`);
    console.log(`    GET  /api/medecins`);
    console.log(`    GET  /api/feuilles`);
    console.log(`    GET  /api/remboursements`);
    console.log(`    GET  /api/prescriptions`);
    console.log(`    GET  /api/stats\n`);
  });
}

start().catch(err => {
  console.error('❌ Erreur au démarrage:', err);
  process.exit(1);
});
