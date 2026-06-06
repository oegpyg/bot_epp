const datos = {
  comite1: {
    total: 15,                              // ← Total N°1
    evolucion: [8, 9, 10, 11, 13, 14, 15]  // ← Por día N°1
  },
  comite2: {
    total: 10,                              // ← Total N°2  
    evolucion: [5, 5, 6, 7, 8, 9, 10]      // ← Por día N°2
  }
};

// =========================
// RANKING COMITÉS N°1 VS N°2
// =========================
app.get('/ranking', requireLogin, (req, res) => {
  res.sendFile(__dirname + '/ranking-comites.html');
});