const express = require('express')
const router = express.Router()
const sqlite3 = require('sqlite3').verbose()
const ExcelJS = require('exceljs')
const PDFDocument = require('pdfkit')

const db = new sqlite3.Database('./db/database.db')

router.get('/export/excel', async (req, res) => {

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Voluntarios')

  worksheet.columns = [
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Barrio', key: 'barrio', width: 25 },
    { header: 'Contacto', key: 'contacto', width: 25 },
    { header: 'Fecha', key: 'fecha', width: 20 }
  ]

  db.all(`SELECT * FROM voluntarios`, async (err, rows) => {

    if (err) {
      return res.send('Error exportando')
    }

    rows.forEach(row => {
      worksheet.addRow(row)
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=voluntarios.xlsx'
    )

    await workbook.xlsx.write(res)

    res.end()
  })

})

router.get('/export/pdf', (req, res) => {

  const doc = new PDFDocument()

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=voluntarios.pdf'
  )

  doc.pipe(res)

  doc.fontSize(20).text('Reporte Voluntarios')

  db.all(`SELECT * FROM voluntarios`, (err, rows) => {

    rows.forEach(r => {

      doc
        .fontSize(12)
        .text(`${r.nombre} - ${r.barrio} - ${r.fecha}`)

    })

    doc.end()

  })

})

router.get('/dashboard', (req, res) => {

  const { barrio, fecha, lider } = req.query

let where = []
let params = []

if (barrio) {
  where.push('barrio LIKE ?')
  params.push(`%${barrio}%`)
}

if (fecha) {
  where.push('fecha = ?')
  params.push(fecha)
}

if (lider) {
  where.push('lider LIKE ?')
  params.push(`%${lider}%`)
}

const whereSQL =
  where.length > 0
    ? 'WHERE ' + where.join(' AND ')
    : ''
    db.all(`
  SELECT *
  FROM voluntarios
  ${whereSQL}
  ORDER BY id DESC
`, params, (err, rows) => {

})

  db.get(`
    SELECT COUNT(*) as totalSimpatizantes FROM simpatizantes
  `, (err, sim) => {

    if (err) return res.send('Error simpatizantes')

    db.get(`
      SELECT COUNT(*) as totalVoluntarios FROM voluntarios
    `, (err2, vol) => {

      if (err2) return res.send('Error voluntarios')

      db.all(`
        SELECT fecha, COUNT(*) as cantidad
        FROM voluntarios
        GROUP BY fecha
        ORDER BY fecha ASC
        LIMIT 7
      `, (err3, volDias) => {

        if (err3) return res.send('Error stats voluntarios')

        db.all(`
          SELECT fecha, COUNT(*) as cantidad
          FROM simpatizantes
          GROUP BY fecha
          ORDER BY fecha ASC
          LIMIT 7
        `, (err4, simDias) => {

          if (err4) return res.send('Error stats simpatizantes')

          db.all(`
            SELECT nombre, barrio, fecha
            FROM voluntarios
            ORDER BY id DESC
            LIMIT 5
          `, (err5, actividad) => {

            if (err5) return res.send('Error actividad')

            res.render('dashboard', {
              totalSimpatizantes: sim.totalSimpatizantes,
              totalVoluntarios: vol.totalVoluntarios,
              volDias,
              simDias,
              actividad
            })

          })

        })

      })

    })

  })

})

module.exports = router