// routes/assures.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { broadcast } = require('../socket');
const { paginate } = require('./paginate');
const { sendMail } = require('../services/email');

const ASSURE_SELECT = `
  SELECT a.id, a.numero_ss, a.date_inscription, a.actif,
         p.nom, p.prenom, p.date_naissance, p.adresse, p.telephone, p.email,
         m.identifiant AS medecin_id_code, m.num_agrement,
         pm.nom || ' ' || pm.prenom AS medecin_traitant
  FROM assures a
  JOIN personnes p ON p.id = a.personne_id
  LEFT JOIN medecins m ON m.id = a.medecin_traitant_id
  LEFT JOIN personnes pm ON pm.id = m.personne_id
`;

// GET /api/assures
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const { q, page, limit } = req.query;
  const like = q ? `%${q}%` : null;
  let sql = `${ASSURE_SELECT} WHERE a.actif=1`;
  const params = [];
  if (q) {
    sql += ' AND (a.numero_ss LIKE ? OR p.nom LIKE ? OR p.prenom LIKE ?)';
    params.push(like, like, like);
  }
  sql += ' ORDER BY p.nom';
  res.json(await paginate(db, sql, params, page, limit));
});

// GET /api/assures/:id
router.get('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const row = await db.prepare(`${ASSURE_SELECT} WHERE a.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Assuré introuvable.' });
  res.json(row);
});

// POST /api/assures — Inscrire un assuré
router.post('/', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const { nom, prenom, date_naissance, adresse, telephone, email, medecin_traitant_id } = req.body;
  if (!nom || !prenom)
    return res.status(400).json({ error: 'Nom et prénom requis.' });

  // Auto-génération du N° SS
  const last = await db.prepare("SELECT numero_ss FROM assures WHERE numero_ss LIKE 'SS-%' ORDER BY id DESC LIMIT 1").get();
  const nextNum = last ? parseInt(last.numero_ss.split('-')[1]) + 1 : 1;
  const numero_ss = 'SS-' + String(nextNum).padStart(6, '0');

  // Si medecin_traitant_id fourni, vérif qu'il est généraliste
  if (medecin_traitant_id) {
    const med = await db.prepare("SELECT type FROM medecins WHERE id = ?").get(medecin_traitant_id);
    if (!med) return res.status(400).json({ error: 'Médecin introuvable.' });
    if (med.type !== 'generaliste') return res.status(400).json({ error: 'Le médecin traitant doit être généraliste.' });
  }

  const pInfo = await db.prepare(
    'INSERT INTO personnes (nom,prenom,date_naissance,adresse,telephone,email) VALUES (?,?,?,?,?,?)'
  ).run(nom.toUpperCase(), prenom, date_naissance || null, adresse || null, telephone || null, email || null);

  const aInfo = await db.prepare(
    'INSERT INTO assures (personne_id,numero_ss,medecin_traitant_id) VALUES (?,?,?)'
  ).run(pInfo.lastInsertRowid, numero_ss, medecin_traitant_id || null);

  broadcast('data-change', { resource: 'assures' });
  res.status(201).json({ id: aInfo.lastInsertRowid, numero_ss, message: 'Assuré inscrit avec succès.' });
});

// PUT /api/assures/:id — Mettre à jour
router.put('/:id', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const assure = await db.prepare('SELECT * FROM assures WHERE id = ?').get(req.params.id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  const { nom, prenom, date_naissance, adresse, telephone, email, medecin_traitant_id } = req.body;

  if (medecin_traitant_id) {
    const med = await db.prepare("SELECT type FROM medecins WHERE id = ?").get(medecin_traitant_id);
    if (!med || med.type !== 'generaliste')
      return res.status(400).json({ error: 'Le médecin traitant doit être généraliste.' });
  }

  await db.prepare(`UPDATE personnes SET nom=?, prenom=?, date_naissance=?, adresse=?, telephone=?, email=?
    WHERE id = ?`).run(
    nom?.toUpperCase() || undefined, prenom, date_naissance, adresse, telephone, email, assure.personne_id
  );

  if (medecin_traitant_id !== undefined) {
    await db.prepare('UPDATE assures SET medecin_traitant_id=? WHERE id=?').run(medecin_traitant_id, req.params.id);
  }

  broadcast('data-change', { resource: 'assures' });
  res.json({ message: 'Assuré mis à jour.' });
});

// PATCH /api/assures/:id/medecin-traitant — Enregistrer médecin traitant
router.patch('/:id/medecin-traitant', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const { medecin_traitant_id } = req.body;
  if (!medecin_traitant_id) return res.status(400).json({ error: 'ID médecin requis.' });

  const assure = await db.prepare('SELECT * FROM assures WHERE id = ?').get(req.params.id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  const med = await db.prepare(`
    SELECT m.*, p.email, p.nom AS med_nom, p.prenom AS med_prenom
    FROM medecins m JOIN personnes p ON p.id = m.personne_id WHERE m.id = ?
  `).get(medecin_traitant_id);
  if (!med) return res.status(404).json({ error: 'Médecin introuvable.' });
  if (med.type !== 'generaliste') return res.status(400).json({ error: 'Le médecin traitant doit être un généraliste.' });

  await db.prepare('UPDATE assures SET medecin_traitant_id=? WHERE id=?').run(medecin_traitant_id, req.params.id);

  // Créer les identifiants de connexion pour le médecin si nécessaire
  let identifiant, motDePasse;
  if (!med.utilisateur_id) {
    const base = (med.med_nom || 'med').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);
    identifiant = base + String(med.id).padStart(2, '0');
    motDePasse = Math.random().toString(36).slice(2, 10);
    const hash = bcrypt.hashSync(motDePasse, 10);
    const uInfo = await db.prepare(
      "INSERT INTO utilisateurs (identifiant, mot_de_passe, role, nom, prenom) VALUES (?, ?, 'medecin', ?, ?)"
    ).run(identifiant, hash, med.med_nom, med.med_prenom);
    await db.prepare('UPDATE medecins SET utilisateur_id=? WHERE id=?').run(uInfo.lastInsertRowid, med.id);
  } else {
    const usr = await db.prepare('SELECT identifiant FROM utilisateurs WHERE id=?').get(med.utilisateur_id);
    identifiant = usr.identifiant;
    motDePasse = '(déjà défini — contactez l\'administrateur pour le réinitialiser)';
  }

  // Envoyer les identifiants par email
  if (med.email) {
    try {
      await sendMail({
        to: med.email,
        subject: 'Vos identifiants de connexion — ForInsurance',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#1a56db">ForInsurance — Portail Médecin</h2>
            <p>Bonjour <strong>Dr. ${med.med_prenom} ${med.med_nom}</strong>,</p>
            <p>Vous avez été enregistré comme médecin traitant d'un assuré. Voici vos identifiants pour accéder à votre espace médecin :</p>
            <div style="background:#f4f6f8;padding:16px;border-radius:8px;margin:16px 0">
              <p style="margin:4px 0"><strong>Identifiant :</strong> ${identifiant}</p>
              <p style="margin:4px 0"><strong>Mot de passe :</strong> ${motDePasse}</p>
            </div>
            <p><a href="${process.env.APP_URL || 'http://localhost:3001'}" style="display:inline-block;padding:10px 24px;background:#1a56db;color:#fff;text-decoration:none;border-radius:6px">Se connecter</a></p>
            <hr style="margin:20px 0;border:none;border-top:1px solid #e0e0e0">
            <p style="color:#888;font-size:12px">Cet email est automatique, merci de ne pas y répondre.</p>
          </div>`,
      });
    } catch (e) {
      console.error('Erreur envoi email au médecin:', e.message);
    }
  }

  broadcast('data-change', { resource: 'assures' });
  res.json({ message: 'Médecin traitant enregistré avec succès.' });
});

// DELETE /api/assures/:id — Suppression complète avec toutes les données liées
router.delete('/:id', authenticate, requireRole('assureur'), async (req, res) => {
  const db = getDb();
  const assure = await db.prepare('SELECT personne_id FROM assures WHERE id=?').get(req.params.id);
  if (!assure) return res.status(404).json({ error: 'Assuré introuvable.' });

  const del = db.transaction(async () => {
    await db.prepare(`DELETE FROM remboursements WHERE feuille_id IN (SELECT id FROM feuilles_maladie WHERE assure_id=?)`).run(req.params.id);
    await db.prepare(`DELETE FROM prescription_medicaments WHERE prescription_id IN (SELECT id FROM prescriptions WHERE assure_id=?)`).run(req.params.id);
    await db.prepare(`DELETE FROM prescription_consultation WHERE prescription_id IN (SELECT id FROM prescriptions WHERE assure_id=?)`).run(req.params.id);
    await db.prepare(`DELETE FROM prescriptions WHERE assure_id=?`).run(req.params.id);
    await db.prepare(`DELETE FROM feuilles_maladie WHERE assure_id=?`).run(req.params.id);
    await db.prepare(`DELETE FROM assures WHERE id=?`).run(req.params.id);
    await db.prepare(`DELETE FROM personnes WHERE id=?`).run(assure.personne_id);
  });
  await del();

  broadcast('data-change', { resource: 'assures' });
  res.json({ message: 'Assuré et toutes ses données supprimés.' });
});

module.exports = router;
