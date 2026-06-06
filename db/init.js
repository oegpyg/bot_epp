db.run(`
  CREATE TABLE IF NOT EXISTS usuarios_estado (
    telefono TEXT PRIMARY KEY,
    paso TEXT,
    nombre TEXT,
    barrio TEXT
  )
`)