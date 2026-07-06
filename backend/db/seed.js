// db/seed.js — Données de démonstration
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

const db = getDb();

console.log('🌱 Seeding database...');

// ── Utilisateurs ──────────────────────────────────────────────
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO utilisateurs (identifiant, mot_de_passe, role, nom, prenom)
  VALUES (?, ?, ?, ?, ?)
`);
const hash = (p) => bcrypt.hashSync(p, 10);

insertUser.run('admin', hash('AdminForInsurance2025!'), 'admin', 'SYSTEM', 'Admin');
insertUser.run('assureur01', hash('assureur123'), 'assureur', 'NOUMSSI', 'Elvira');
insertUser.run('assureur02', hash('assureur123'), 'assureur', 'ABONDO', 'Mark');
insertUser.run('medecin01',  hash('medecin123'),  'medecin',  'MAWAMBA', 'Princesse');
insertUser.run('medecin02',  hash('medecin123'),  'medecin',  'BILONGO', 'Laurent');
insertUser.run('medecin03',  hash('medecin123'),  'medecin',  'KIKI', 'Daniel');
insertUser.run('medecin04',  hash('medecin123'),  'medecin',  'TALLA TEYO', 'Sylvain');
insertUser.run('medecin05',  hash('medecin123'),  'medecin',  'WAFO TEGUO', 'Vitric');
insertUser.run('medecin06',  hash('medecin123'),  'medecin',  'ONDOA MANGA', 'Harry Johan');

// ── Personnes + Médecins ──────────────────────────────────────
const insertPersonne = db.prepare(`
  INSERT OR IGNORE INTO personnes (nom, prenom, date_naissance, adresse, telephone, email)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertMedecin = db.prepare(`
  INSERT OR IGNORE INTO medecins (personne_id, identifiant, num_agrement, type, specialite, utilisateur_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

function seedMedecin(nom, prenom, dob, tel, email, identifiant, numAgrement, type, specialite, userId) {
  const info = insertPersonne.run(nom, prenom, dob, 'Yaoundé, Cameroun', tel, email);
  const pid = info.lastInsertRowid || db.prepare('SELECT id FROM personnes WHERE email=?').get(email)?.id;
  insertMedecin.run(pid, identifiant, numAgrement, type, specialite || null, userId || null);
}

seedMedecin('MAWAMBA DJOMO', 'Princesse',   '1980-03-15', '699000001', 'p.mawamba@enspy.cm', 'MED-001', 'AGR-001', 'generaliste',  null,           4);
seedMedecin('BILONGO MINLO', 'Laurent',     '1978-07-22', '699000002', 'l.bilongo@enspy.cm', 'MED-002', 'AGR-002', 'generaliste',  null,           5);
seedMedecin('KIKI DANIEL',   'Bryan',       '1975-11-08', '699000003', 'd.kiki@enspy.cm',    'MED-003', 'AGR-003', 'specialiste',  'Cardiologie',  6);
seedMedecin('TALLA TEYO',    'Sylvain',     '1970-05-30', '699000004', 's.talla@enspy.cm',   'MED-004', 'AGR-004', 'specialiste',  'Neurologie',   7);
seedMedecin('WAFO TEGUO',    'Vitric',      '1982-09-14', '699000005', 'v.wafo@enspy.cm',    'MED-005', 'AGR-005', 'specialiste',  'Dermatologie', 8);
seedMedecin('ONDOA MANGA',   'Harry Johan', '1985-01-20', '699000006', 'h.ondoa@enspy.cm',   'MED-006', 'AGR-006', 'generaliste',  null,           9);

// ── Assurés ────────────────────────────────────────────────────
const insertAssure = db.prepare(`
  INSERT OR IGNORE INTO assures (personne_id, numero_ss, medecin_traitant_id, date_inscription)
  VALUES (?, ?, ?, ?)
`);

function seedAssure(nom, prenom, dob, tel, email, nss, medecinTraitantId, dateInscription) {
  const info = insertPersonne.run(nom, prenom, dob, 'Yaoundé, Cameroun', tel, email);
  const pid  = info.lastInsertRowid || db.prepare('SELECT id FROM personnes WHERE email=?').get(email)?.id;
  insertAssure.run(pid, nss, medecinTraitantId, dateInscription);
}

const med1Id = db.prepare("SELECT id FROM medecins WHERE identifiant='MED-001'").get()?.id;
const med2Id = db.prepare("SELECT id FROM medecins WHERE identifiant='MED-002'").get()?.id;
const med6Id = db.prepare("SELECT id FROM medecins WHERE identifiant='MED-006'").get()?.id;

seedAssure('ASSAM ESSI', 'Camille',   '1990-04-12', '677000001', 'c.assam@gmail.com',   'SS-000001', med1Id, '2024-01-10');
seedAssure('BAKOTCHA',   'Loïc',      '1985-08-25', '677000002', 'l.bakotcha@gmail.com','SS-000002', med1Id, '2024-02-15');
seedAssure('DJOKAM',     'Franck',    '1995-12-03', '677000003', 'f.djokam@gmail.com',  'SS-000003', med2Id, '2024-03-20');
seedAssure('MEGOUEO',    'Davy',      '1988-06-17', '677000004', 'd.megoueo@gmail.com', 'SS-000004', med2Id, '2024-04-05');
seedAssure('NSOBÉ',      'Chamberlain','1992-02-28','677000005', 'c.nsobe@gmail.com',   'SS-000005', med6Id, '2024-05-12');
seedAssure('TACHAGO',    'Eugénie',   '1993-09-09', '677000006', 'e.tachago@gmail.com', 'SS-000006', med6Id, '2024-06-18');

// ── Feuilles de maladie ────────────────────────────────────────
const insertFeuille = db.prepare(`
  INSERT OR IGNORE INTO feuilles_maladie
  (reference, assure_id, medecin_id, date_consultation, diagnostic, actes_medicaux,
   statut, montant_honoraires, montant_remboursement, taux_remboursement, mode_paiement, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const a1 = db.prepare("SELECT id FROM assures WHERE numero_ss='SS-000001'").get()?.id;
const a2 = db.prepare("SELECT id FROM assures WHERE numero_ss='SS-000002'").get()?.id;
const a3 = db.prepare("SELECT id FROM assures WHERE numero_ss='SS-000003'").get()?.id;
const a4 = db.prepare("SELECT id FROM assures WHERE numero_ss='SS-000004'").get()?.id;

insertFeuille.run('FM-2024-001', a1, med1Id, '2024-01-15', 'Grippe saisonnière',
  'Consultation générale, prise de sang', 'Remboursée', 15000, 15000, 1.0, 'virement',
  'Remboursement effectué par virement CMR Bank');

insertFeuille.run('FM-2024-002', a2, med1Id, '2024-02-20', 'Hypertension artérielle',
  'ECG, bilan biologique', 'Complétée', 25000, 25000, 1.0, 'especes', null);

insertFeuille.run('FM-2024-003', a3, med2Id, '2024-03-10', 'Lombalgie chronique',
  'Radio lombaire, kinésithérapie x5', 'Incomplète', 40000, null, 1.0, null, null);

insertFeuille.run('FM-2024-004', a4, med2Id, '2024-04-05', 'Diabète type 2',
  'Glycémie, HbA1c', 'Incomplète', 20000, null, 1.0, null, 'Ordonnance manquante');

insertFeuille.run('FM-2024-005', a1, med1Id, '2024-05-12', 'Rhinite allergique',
  'Tests cutanés allergènes', 'Rejetée', 18000, null, 1.0, null, 'Dossier incomplet - délai dépassé');

insertFeuille.run('FM-2024-006', a2, med2Id, '2024-06-01', 'Bronchite aiguë',
  'Radiographie pulmonaire', 'Incomplète', 12000, null, 1.0, null, null);

// ── Remboursement ──────────────────────────────────────────────
const f1 = db.prepare("SELECT id FROM feuilles_maladie WHERE reference='FM-2024-001'").get()?.id;
const assureur1 = db.prepare("SELECT id FROM utilisateurs WHERE identifiant='assureur01'").get()?.id;

db.prepare(`
  INSERT OR IGNORE INTO remboursements (feuille_id, assure_id, assureur_id, montant, mode_paiement, reference_bancaire, statut)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(f1, a1, assureur1, 10500, 'virement', 'VIR-2024-001-CMR', 'effectue');

// ── Prescriptions ──────────────────────────────────────────────
const insertPrescription = db.prepare(`
  INSERT OR IGNORE INTO prescriptions (type, medecin_id, assure_id, feuille_id, date_prescription, notes)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const f3 = db.prepare("SELECT id FROM feuilles_maladie WHERE reference='FM-2024-003'").get()?.id;

const p1 = insertPrescription.run('medicaments', med2Id, a3, f3, '2024-03-10', 'Traitement antalgique');
db.prepare(`INSERT OR IGNORE INTO prescription_medicaments (prescription_id, nom_medicament, dosage, duree, instructions)
  VALUES (?, ?, ?, ?, ?)`).run(p1.lastInsertRowid, 'Paracétamol 1g', '3x/jour', '7 jours', 'Prendre après les repas');
db.prepare(`INSERT OR IGNORE INTO prescription_medicaments (prescription_id, nom_medicament, dosage, duree, instructions)
  VALUES (?, ?, ?, ?, ?)`).run(p1.lastInsertRowid, 'Ibuprofène 400mg', '2x/jour', '5 jours', 'Si douleur persiste');

const med3Id = db.prepare("SELECT id FROM medecins WHERE identifiant='MED-003'").get()?.id;
const p2 = insertPrescription.run('consultation_specialiste', med1Id, a1, null, '2024-01-20', 'Bilan cardiaque nécessaire');
db.prepare(`INSERT OR IGNORE INTO prescription_consultation (prescription_id, specialiste_id, specialite_requise, urgence, motif)
  VALUES (?, ?, ?, ?, ?)`).run(p2.lastInsertRowid, med3Id, 'Cardiologie', 'normale', 'Palpitations récurrentes depuis 3 mois');

console.log('✅ Base de données initialisée avec succès !');
console.log('');
console.log('🔐 Tous les identifiants (mot de passe par défaut : medecin123) :');
console.log('═══════════════════════════════════════════════════');
console.log('  ASSUREURS :');
console.log('    admin      → AdminForInsurance2025!   | Administrateur système');
console.log('    assureur01 → assureur123              | NOUMSSI Elvira');
console.log('    assureur02 → assureur123              | ABONDO Mark');
console.log('');
console.log('  MEDECINS :');
console.log('    medecin01  → medecin123   | MAWAMBA Princesse (Généraliste)');
console.log('    medecin02  → medecin123   | BILONGO Laurent (Généraliste)');
console.log('    medecin03  → medecin123   | KIKI Daniel (Spécialiste - Cardiologie)');
console.log('    medecin04  → medecin123   | TALLA TEYO Sylvain (Spécialiste - Neurologie)');
console.log('    medecin05  → medecin123   | WAFO TEGUO Vitric (Spécialiste - Dermatologie)');
console.log('    medecin06  → medecin123   | ONDOA MANGA Harry Johan (Généraliste)');
