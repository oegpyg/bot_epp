const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// =========================
// BASE DE DATOS ÚNICA
// =========================
const dbPath = path.join(__dirname, 'db', 'database.db'); // <- Tu DB está en /db/

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log('❌ Error al conectar DB:', err.message);
  } else {
    console.log('✅ Base de datos conectada en:', dbPath);
    // Desactivar WAL para que ver_tablas.js vea los datos al instante
    db.run('PRAGMA journal_mode = DELETE');
  }
});

module.exports = db;
// =========================
// CONFIGURACIÓN SEGURA
// =========================
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA foreign_keys = ON;');
});

module.exports = db;