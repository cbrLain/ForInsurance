// routes/auth.js
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { sendMail } = require('../services/email');
const { authenticate } = require('../middleware/auth');
const { broadcast } = require('../socket');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { identifiant, mot_de_passe } = req.body;
  if (!identifiant || !mot_de_passe)
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });

  const db   = getDb();
  const user = await db.prepare('SELECT * FROM utilisateurs WHERE identifiant = ?').get(identifiant);
  if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe))
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });

  const token = jwt.sign(
    { id: user.id, identifiant: user.identifiant, role: user.role, nom: user.nom, prenom: user.prenom },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, user: { id: user.id, identifiant: user.identifiant, role: user.role, nom: user.nom, prenom: user.prenom } });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/register-medecin
router.post('/register-medecin', async (req, res) => {
  const { nom, prenom, email, telephone, agrement, type, specialite } = req.body;
  if (!nom || !prenom || !email || !agrement || !type)
    return res.status(400).json({ error: 'Champs obligatoires : nom, prenom, email, agrement, type.' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM demandes_inscription WHERE email = ? AND statut = \'en_attente\'').get(email);
  if (existing)
    return res.status(409).json({ error: 'Une demande est déjà en attente pour cet email.' });

  db.prepare(`INSERT INTO demandes_inscription (nom, prenom, email, telephone, num_agrement, type, specialite)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(nom, prenom, email, telephone || null, agrement, type, specialite || null);

  try {
    await sendMail({
      to: email,
      subject: 'Demande d\'inscription reçue — ForInsurance',
      html: `<p>Bonjour Dr. ${prenom} ${nom},</p>
        <p>Votre demande d'inscription a bien été reçue. Vous serez notifié par email après validation.</p>
        <p>Cordialement,<br>L'équipe ForInsurance</p>`
    });
  } catch (e) {
    console.error('Email error:', e.message);
  }

  broadcast('data-change', { resource: 'demandes' });
  res.status(201).json({ message: 'Demande envoyée.' });
});

// GET /api/auth/demandes
router.get('/demandes', authenticate, (req, res) => {
  if (req.user.role !== 'assureur')
    return res.status(403).json({ error: 'Accès réservé aux assureurs.' });

  const db = getDb();
  const demandes = db.prepare('SELECT * FROM demandes_inscription ORDER BY created_at DESC').all();
  res.json(demandes);
});

// PATCH /api/auth/demandes/:id
router.patch('/demandes/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'assureur')
    return res.status(403).json({ error: 'Accès réservé aux assureurs.' });

  const { statut, motif_rejet } = req.body;
  if (!['approuvee','rejetee'].includes(statut))
    return res.status(400).json({ error: 'Statut invalide (approuvee ou rejetee).' });

  const db = getDb();
  const demande = db.prepare('SELECT * FROM demandes_inscription WHERE id = ?').get(req.params.id);
  if (!demande) return res.status(404).json({ error: 'Demande introuvable.' });
  if (demande.statut !== 'en_attente')
    return res.status(400).json({ error: 'Demande déjà traitée.' });

  if (statut === 'rejetee') {
    db.prepare('UPDATE demandes_inscription SET statut = ?, motif_rejet = ? WHERE id = ?')
      .run('rejetee', motif_rejet || null, req.params.id);
    try {
      await sendMail({
        to: demande.email,
        subject: 'Demande d\'inscription refusée — ForInsurance',
        html: `<p>Bonjour Dr. ${demande.prenom} ${demande.nom},</p>
          <p>Votre demande d'inscription a été refusée.</p>
          ${motif_rejet ? `<p>Motif : ${motif_rejet}</p>` : ''}
          <p>Cordialement,<br>L'équipe ForInsurance</p>`
      });
    } catch (e) { console.error('Email error:', e.message); }
    broadcast('data-change', { resource: 'demandes' });
    return res.json({ message: 'Demande refusée.' });
  }

  // Approuvée : créer l'utilisateur et le medecin
  const identifiant = 'MED' + demande.id.toString().padStart(4,'0');
  const pwPlain = Math.random().toString(36).slice(-10);
  const mot_de_passe = bcrypt.hashSync(pwPlain, 10);

  const insertUser = db.prepare('INSERT INTO utilisateurs (identifiant, mot_de_passe, role, nom, prenom) VALUES (?, ?, \'medecin\', ?, ?)');
  const userResult = insertUser.run(identifiant, mot_de_passe, demande.nom, demande.prenom);

  // Vérifier si la personne existe déjà
  let personne = db.prepare('SELECT id FROM personnes WHERE nom = ? AND prenom = ?').get(demande.nom, demande.prenom);
  if (!personne) {
    const pRes = db.prepare('INSERT INTO personnes (nom, prenom, email, telephone) VALUES (?, ?, ?, ?)')
      .run(demande.nom, demande.prenom, demande.email, demande.telephone);
    personne = { id: pRes.lastInsertRowid };
  }

  db.prepare('INSERT INTO medecins (personne_id, identifiant, num_agrement, type, specialite, utilisateur_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(personne.id, identifiant, demande.num_agrement, demande.type, demande.specialite, userResult.lastInsertRowid);

  db.prepare('UPDATE demandes_inscription SET statut = ? WHERE id = ?').run('approuvee', req.params.id);

  try {
    await sendMail({
      to: demande.email,
      subject: 'Inscription approuvée — ForInsurance',
      html: `<p>Bonjour Dr. ${demande.prenom} ${demande.nom},</p>
        <p>Votre demande d'inscription a été approuvée !</p>
        <p><strong>Identifiant :</strong> ${identifiant}<br>
        <strong>Mot de passe :</strong> ${pwPlain}</p>
        <p>Connectez-vous sur votre espace médecin et modifiez votre mot de passe.</p>
        <p>Cordialement,<br>L'équipe ForInsurance</p>`
    });
  } catch (e) { console.error('Email error:', e.message); }

  broadcast('data-change', { resource: 'demandes' });
  res.json({ message: 'Médecin inscrit avec succès.', identifiant });
});

module.exports = router;
