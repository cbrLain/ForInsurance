// routes/medicaments.js
const router = require('express').Router();
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/medicaments/search?q=...
router.get('/search', authenticate, async (req, res) => {
  const db = getDb();
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const like = `%${q}%`;
  const rows = await db.prepare(`
    SELECT DISTINCT nom_medicament, dosage
    FROM prescription_medicaments
    WHERE nom_medicament LIKE ?
    ORDER BY nom_medicament
    LIMIT 20
  `).all(like);
  res.json(rows.map(r => ({ nom: r.nom_medicament, dosage: r.dosage || '' })));
});

// GET /api/medicaments/popular
router.get('/popular', authenticate, async (req, res) => {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT nom_medicament, COUNT(*) AS cnt
    FROM prescription_medicaments
    GROUP BY nom_medicament
    ORDER BY cnt DESC
    LIMIT 20
  `).all();
  res.json(rows.map(r => ({ nom: r.nom_medicament })));
});

module.exports = router;
