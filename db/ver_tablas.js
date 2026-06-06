const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Si ver_tablas.js está dentro de /db/, la ruta es solo './database.db'
const dbPath = path.join(__dirname, 'database.db'); 
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log('❌ Error:', err.message);
    return;
  }
  console.log('Leyendo DB:', dbPath);
});

console.log('=== TABLAS EN LA BASE DE DATOS ===\n');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) throw err;
  console.log('Tablas:', tables.map(t => t.name).join(', '));
  
  db.all("SELECT * FROM afiliados", (err, rows) => {
    if (err) {
      console.log('\n❌ Error:', err.message);
    } else {
      console.log('\n=== AFILIADOS GUARDADOS ===');
      console.table(rows);
      console.log(`\nTotal: ${rows.length} registros`);
    }
    db.close();
  });
});