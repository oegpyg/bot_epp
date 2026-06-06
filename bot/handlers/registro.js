async function iniciarRegistro(sock, db, from) {

  db.run(`
    INSERT OR REPLACE INTO usuarios_estado
    (telefono, paso)
    VALUES (?, ?)
  `, [from, 'nombre'])

  await sock.sendMessage(from, {
    text: '🙌 Excelente.\n\n¿Cuál es tu nombre completo?'
  })

}

module.exports = {
  iniciarRegistro
}