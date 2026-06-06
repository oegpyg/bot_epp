const express = require('express')
const router = express.Router()

router.get('/export/excel', (req, res) => {
  res.send('✅ Export Excel funcionando')
})

router.get('/export/pdf', (req, res) => {
  res.send('✅ Export PDF funcionando')
})

module.exports = router