// routes/medecins.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { broadcast } = require('../socket');
const { paginate } = require('./paginate');

const MED_SELECT = `
  SELECT m.id, m.identifiant, m.num_agrement, m.type, m.specialite,
         p.nom, p.prenom, p.telephone, p.email, p.adresse, p.date_naissance
  FROM medecins m
  JOIN personnes p ON p.id = m.personne_id
`;

// GET /api/medecins
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const { q, type, page, limit } = req.query;
  let sql = MED_SELECT + ' WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND m.type = ?'; params.push(type); }
  if (q) {
    sql += ' AND (p.nom LIKE ? OR p.prenom LIKE ? OR m.identifiant LIKE ? OR m.num_agrement LIKE ? OR m.specialite LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  sql += ' ORDER BY p.nom';
  res.json(await paginate(db, sql, params, page, limit));
});

// GET /api/medecins/:id
router.get('/:id', authenticate, async (req, res) => {
  const db  = getDb();
  const row = await db.prepare(`${MED_SELECT} WHERE m.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Médecin introuvable.' });
  res.json(row);
});

// POST /api/medecins
router.post('/', authenticate, requireRole('admin', 'assureur'), async (req, res) => {
  const db = getDb();
  const { nom, prenom, date_naissance, telephone, email, adresse, num_agrement, type, specialite } = req.body;
  if (!nom || !prenom || !type)
    return res.status(400).json({ error: 'Nom, prénom et type requis.' });
  if (!['generaliste','specialiste'].includes(type))
    return res.status(400).json({ error: 'Type invalide (generaliste | specialiste).' });
  if (type === 'specialiste' && !specialite)
    return res.status(400).json({ error: 'Spécialité requise pour un médecin spécialiste.' });

  // Auto-génération de l'identifiant
  const last = await db.prepare("SELECT identifiant FROM medecins WHERE identifiant LIKE 'MED-%' ORDER BY id DESC LIMIT 1").get();
  const nextNum = last ? parseInt(last.identifiant.split('-')[1]) + 1 : 1;
  const identifiant = 'MED-' + String(nextNum).padStart(3, '0');

  // Génération du mot de passe
  const pwPlain = Math.random().toString(36).slice(-10);
  const mot_de_passe = bcrypt.hashSync(pwPlain, 10);

  const pInfo = await db.prepare(
    'INSERT INTO personnes (nom,prenom,date_naissance,adresse,telephone,email) VALUES (?,?,?,?,?,?)'
  ).run(nom.toUpperCase(), prenom, date_naissance || null, adresse || null, telephone || null, email || null);

  const uInfo = await db.prepare(
    "INSERT INTO utilisateurs (identifiant, mot_de_passe, role, nom, prenom) VALUES (?, ?, 'medecin', ?, ?)"
  ).run(identifiant, mot_de_passe, nom.toUpperCase(), prenom);

  const mInfo = await db.prepare(
    'INSERT INTO medecins (personne_id,identifiant,num_agrement,type,specialite,utilisateur_id) VALUES (?,?,?,?,?,?)'
  ).run(pInfo.lastInsertRowid, identifiant, num_agrement || null, type, specialite || null, uInfo.lastInsertRowid);

  broadcast('data-change', { resource: 'medecins' });
  res.status(201).json({ id: mInfo.lastInsertRowid, identifiant, mot_de_passe: pwPlain, message: 'Médecin enregistré avec succès.' });
});

// PUT /api/medecins/:id
router.put('/:id', authenticate, requireRole('admin', 'assureur'), async (req, res) => {
  const db = getDb();
  const med = await db.prepare('SELECT * FROM medecins WHERE id=?').get(req.params.id);
  if (!med) return res.status(404).json({ error: 'Médecin introuvable.' });
  const { nom, prenom, telephone, email, adresse, num_agrement, specialite } = req.body;
  await db.prepare('UPDATE personnes SET nom=?,prenom=?,telephone=?,email=?,adresse=? WHERE id=?')
    .run(nom?.toUpperCase(), prenom, telephone, email, adresse, med.personne_id);
  if (specialite !== undefined)
    await db.prepare('UPDATE medecins SET specialite=? WHERE id=?').run(specialite, req.params.id);
  if (num_agrement !== undefined)
    await db.prepare('UPDATE medecins SET num_agrement=? WHERE id=?').run(num_agrement, req.params.id);
  broadcast('data-change', { resource: 'medecins' });
  res.json({ message: 'Médecin mis à jour.' });
});

module.exports = router;
