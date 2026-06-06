const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

/**
 * Procesa imagen recibida por WhatsApp y extrae texto con OCR
 */
async function procesarOCR(msg) {
  try {
    // =========================
    // DESCARGAR IMAGEN
    // =========================
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      {
        logger: undefined,
        reuploadRequest: undefined
      }
    );

    // =========================
    // GUARDAR IMAGEN LOCAL
    // =========================
    const fileName = `planilla_${Date.now()}.jpg`;

    const filePath = path.join(
      __dirname,
      '../public/uploads',
      fileName
    );

    fs.writeFileSync(filePath, buffer);

    console.log('📸 Imagen guardada:', filePath);

    // =========================
    // OCR (TESSERACT)
    // =========================
    const result = await Tesseract.recognize(
      filePath,
      'spa'
    );

    const texto = result.data.text;

    // =========================
    // LOG PARA DEPURACIÓN
    // =========================
    console.log('========== TEXTO OCR ==========');
    console.log(texto);
    console.log('===============================');

    // =========================
    // RESPUESTA LIMPIA
    // =========================
    return {
      texto,
      filePath
    };

  } catch (error) {
    console.error('❌ Error en OCR:', error);

    return {
      texto: '',
      filePath: null,
      error: error.message
    };
  }
}

module.exports = {
  procesarOCR
};