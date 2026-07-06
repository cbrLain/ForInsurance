-- ============================================================
--  SCHEMA SQLite — Organisme de Sécurité Sociale
-- ============================================================

CREATE TABLE IF NOT EXISTS utilisateurs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  identifiant TEXT UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'medecin',
  nom         TEXT NOT NULL,
  prenom      TEXT NOT NULL,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personnes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nom            TEXT NOT NULL,
  prenom         TEXT NOT NULL,
  date_naissance TEXT,
  adresse        TEXT,
  telephone      TEXT,
  email          TEXT
);

CREATE TABLE IF NOT EXISTS medecins (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  personne_id       INTEGER REFERENCES personnes(id) ON DELETE CASCADE,
  identifiant       TEXT UNIQUE NOT NULL,
  num_agrement      TEXT,
  type              TEXT CHECK(type IN ('generaliste','specialiste')) NOT NULL,
  specialite        TEXT,
  utilisateur_id    INTEGER REFERENCES utilisateurs(id)
);

CREATE TABLE IF NOT EXISTS assures (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  personne_id         INTEGER REFERENCES personnes(id) ON DELETE CASCADE,
  numero_ss           TEXT UNIQUE NOT NULL,
  medecin_traitant_id INTEGER REFERENCES medecins(id) ON DELETE SET NULL,
  date_inscription    TEXT DEFAULT (date('now')),
  actif               INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS feuilles_maladie (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  reference            TEXT UNIQUE NOT NULL,
  assure_id            INTEGER REFERENCES assures(id) ON DELETE CASCADE NOT NULL,
  medecin_id           INTEGER REFERENCES medecins(id) NOT NULL,
  date_consultation    TEXT NOT NULL,
  diagnostic           TEXT NOT NULL,
  actes_medicaux       TEXT,
  statut               TEXT CHECK(statut IN (
    'Incomplète','Complétée','Remboursée','Rejetée'
  )) DEFAULT 'Incomplète',
  montant_honoraires   REAL,
  montant_remboursement REAL,
  taux_remboursement   REAL DEFAULT 0.7,
  mode_paiement        TEXT CHECK(mode_paiement IN ('especes','virement')),
  notes                TEXT,
  created_at           TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at           TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS remboursements (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  feuille_id          INTEGER REFERENCES feuilles_maladie(id) ON DELETE CASCADE NOT NULL,
  assure_id           INTEGER REFERENCES assures(id) ON DELETE CASCADE NOT NULL,
  assureur_id         INTEGER REFERENCES utilisateurs(id),
  montant             REAL NOT NULL,
  mode_paiement       TEXT CHECK(mode_paiement IN ('especes','virement')) NOT NULL,
  reference_bancaire  TEXT,
  date_remboursement  TEXT DEFAULT CURRENT_TIMESTAMP,
  statut              TEXT CHECK(statut IN ('en_attente','effectue','echec')) DEFAULT 'effectue'
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT CHECK(type IN ('medicaments','consultation_specialiste')) NOT NULL,
  medecin_id   INTEGER REFERENCES medecins(id) NOT NULL,
  assure_id    INTEGER REFERENCES assures(id) ON DELETE CASCADE NOT NULL,
  feuille_id   INTEGER REFERENCES feuilles_maladie(id),
  date_prescription TEXT DEFAULT (date('now')),
  notes        TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescription_medicaments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
  nom_medicament  TEXT NOT NULL,
  dosage          TEXT,
  duree           TEXT,
  instructions    TEXT
);

CREATE TABLE IF NOT EXISTS prescription_consultation (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id   INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
  specialiste_id    INTEGER REFERENCES medecins(id),
  specialite_requise TEXT NOT NULL,
  urgence           TEXT CHECK(urgence IN ('normale','urgente')) DEFAULT 'normale',
  motif             TEXT
);

CREATE TABLE IF NOT EXISTS demandes_inscription (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nom               TEXT NOT NULL,
  prenom            TEXT NOT NULL,
  email             TEXT NOT NULL,
  telephone         TEXT,
  num_agrement      TEXT,
  type              TEXT CHECK(type IN ('generaliste','specialiste')) NOT NULL,
  specialite        TEXT,
  statut            TEXT CHECK(statut IN ('en_attente','approuvee','rejetee')) DEFAULT 'en_attente',
  motif_rejet       TEXT,
  created_at        TEXT DEFAULT CURRENT_TIMESTAMP
);
