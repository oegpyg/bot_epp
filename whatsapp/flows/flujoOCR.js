const { procesarOCR } = require('../services/ocrService');
const { extraerRegistros } = require('../services/parserService');
const { validarRegistros } = require('../services/afiliacionService');
require('../../db')

async function flujoOCR(msg, sock, from) {

  // 1. OCR
  const { texto } = await procesarOCR(msg);

  // 2. Parser
  const registros = extraerRegistros(texto);

  console.log('REGISTROS OCR:', registros);

  // 3. Validación
  const resultado = await validarRegistros(db, registros);

  // 4. RESPUESTA FINAL
  await sock.sendMessage(from, {
    text:
`📋 Registros encontrados: ${resultado.total}

✅ Afiliados: ${resultado.afiliados.length}
⚠️ No afiliados: ${resultado.noAfiliados.length}`
  });
}

module.exports = async function flujoOCR(sock, db, from, msg) {
  // tu lógica OCR aquí
};