const express = require('express')
const router = express.Router()

const sqlite3 = require('sqlite3').verbose()

const db = new sqlite3.Database('./database.db')

// ======================
// PANEL
// ======================
router.get('/campanas', (req, res) => {
  res.render('campanas')
})

// ======================
// ENVIO MASIVO
// ======================
router.post('/campanas/enviar', (req, res) => {

  const mensaje = req.body.mensaje

  db.all(`
    SELECT contacto
    FROM simpatizantes
  `, async (err, rows) => {

    if (err) {
      return res.send('❌ Error DB')
    }

    for (const user of rows) {

      if (!user.contacto) continue

      const numero =
        user.contacto.replace(/\D/g, '') +
        '@s.whatsapp.net'

      try {

        await global.sock.sendMessage(numero, {
          text: mensaje
        })

        console.log('✅ Enviado:', numero)

      } catch (e) {

        console.log('❌ Error:', numero)
      }
    }

    db.run(`
      INSERT INTO campañas (mensaje, fecha)
      VALUES (?, ?)
    `,
    [
      mensaje,
      new Date().toLocaleString()
    ])

    res.send('🚀 Campaña enviada')
  })
})

module.exports = router