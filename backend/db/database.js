// db/database.js — PostgreSQL (via pg) ou SQLite (fallback local)
const { initPg, getPgDb } = require('./pg-database');
const { initSqlite, getSqliteDb } = require('./sqlite-database');

let _api = null;
let _mode = null;

async function initDb() {
  if (process.env.DATABASE_URL) {
    console.log('🗄️  DATABASE_URL détecté → PostgreSQL');
    _api = await initPg();
    _mode = 'pg';
  } else {
    console.log('🗄️  Aucun DATABASE_URL → SQLite local');
    _api = await initSqlite();
    _mode = 'sqlite';
  }

  // Seed si base vide
  const row = await _api.prepare('SELECT COUNT(*) AS n FROM utilisateurs').get();
  if (!row || row.n === '0' || row.n === 0) {
    console.log('📦 Base vide — exécution du seed...');
    require('./seed');
  }

  // Nettoyage : table résiduelle d'une migration antérieure échouée (SQLite seulement)
  if (_mode === 'sqlite') {
    try {
      const old = _api.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='utilisateurs_old'").get();
      if (old) {
        console.log('🧹 Nettoyage : utilisateurs_old détectée, restauration...');
        _api.prepare('DROP TABLE IF EXISTS utilisateurs_old').run();
        console.log('✅ utilisateurs_old supprimée.');
      }
    } catch {}
  }

  // Migration : attribuer le rôle admin à l'utilisateur 'admin'
  try {
    _api.prepare("UPDATE utilisateurs SET role='admin' WHERE identifiant='admin'").run();
    console.log('✅ Rôle admin attribué à l\'utilisateur admin.');
  } catch {
    console.log('⚠️  Impossible de mettre à jour le rôle admin (contrainte CHECK). L\'admin est reconnu par son identifiant.');
  }

  return _api;
}

function getDb() {
  if (!_api) throw new Error('Database not initialized.');
  return _api;
}

function getMode() {
  return _mode;
}

module.exports = { getDb, initDb, getMode };
