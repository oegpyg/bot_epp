const sqlite3 = require('sqlite3').verbose();

function createDatabase(dbPath = './db/database.db') {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error al conectar DB:', err);
    } else {
      console.log('Base de datos conectada');
    }
  });

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS voluntarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        contacto TEXT UNIQUE,
        fecha TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS simpatizantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        barrio TEXT,
        contacto TEXT UNIQUE,
        fecha TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS afiliados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cedula TEXT UNIQUE,
        nombres_apellido TEXT,
        comite_nombre TEXT,
        mesa TEXT,
        distrito_nombre TEXT,
        contacto TEXT,
        fecha TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS votos (
        cedula TEXT PRIMARY KEY,
        votado INTEGER DEFAULT 0,
        hora_voto TEXT,
        marcado_por TEXT
      )
    `);

    db.run(`ALTER TABLE afiliados ADD COLUMN contacto TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.log('Columna contacto ya existe o error:', err.message);
      }
    });
  });

  return db;
}

module.exports = { createDatabase };
