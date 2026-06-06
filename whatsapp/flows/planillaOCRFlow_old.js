module.exports = async function planillaOCRFlow(
  sock,
  db,
  from,
  msg
) {

  try {

    await sock.sendMessage(from, {
      text: '⏳ Procesando imagen...'
    });

    // =========================
    // SIMULACIÓN OCR
    // =========================
    const cedulas = [
      '1234567',
      '9876543'
    ];

    let afiliados = 0;
    let noAfiliados = 0;

    for (const cedula of cedulas) {

      // SIMULACIÓN
      const esAfiliado =
        Math.random() > 0.5;

      if (esAfiliado) {

        afiliados++;

        db.run(
          `INSERT INTO planillas_ocr
          (
            nombre,
            cedula,
            afiliado,
            comite,
            distrito,
            fecha
          )
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            'Afiliado Detectado',
            cedula,
            'SI',
            'Comité Central',
            'Asunción',
            new Date().toLocaleString()
          ]
        );

      } else {

        noAfiliados++;

        db.run(
          `INSERT INTO planillas_ocr
          (
            cedula,
            afiliado,
            fecha
          )
          VALUES (?, ?, ?)`,
          [
            cedula,
            'NO',
            new Date().toLocaleString()
          ]
        );
      }
    }

    return sock.sendMessage(from, {
      text:
`✅ Procesamiento terminado

📋 Registros encontrados: ${cedulas.length}
✅ Afiliados: ${afiliados}
⚠️ No afiliados: ${noAfiliados}`
    });

  } catch (err) {

    console.log('❌ Error OCR:', err);

    return sock.sendMessage(from, {
      text: '❌ Error procesando imagen'
    });
  }
};