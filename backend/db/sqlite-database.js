// db/sqlite-database.js — Pilote SQLite (fallback local)
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db = null;
let _api = null;

async function initSqlite() {
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/forinsurance.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sqlite.sql'), 'utf8');
  db.exec(schema);

  _api = {
    prepare: (sql) => {
      const stmt = db.prepare(sql);
      return {
        get: (...params) => stmt.get(...params) || undefined,
        all: (...params) => stmt.all(...params),
        run: (...params) => {
          const info = stmt.run(...params);
          return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
        },
      };
    },
    exec: (sql) => db.exec(sql),
    transaction: (fn) => {
      if (fn.constructor.name === 'AsyncFunction') {
        return async function sqliteAsyncTransaction(...args) {
          db.exec('BEGIN');
          try {
            const result = await fn.apply(this, args);
            db.exec('COMMIT');
            return result;
          } catch (e) {
            db.exec('ROLLBACK');
            throw e;
          }
        };
      }
      return db.transaction(fn);
    },
    save: () => {},
    close: () => { db.close(); },
  };

  return _api;
}

function getSqliteDb() {
  if (!_api) throw new Error('SQLite non initialisé.');
  return _api;
}

module.exports = { initSqlite, getSqliteDb };
