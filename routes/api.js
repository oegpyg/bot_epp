router.get('/api/stats', (req, res) => {

  db.get(`SELECT COUNT(*) as v FROM voluntarios`, (e1, v) => {
    db.get(`SELECT COUNT(*) as s FROM simpatizantes`, (e2, s) => {

      res.json({
        voluntarios: v.v,
        simpatizantes: s.s
      })

    })
  })

})