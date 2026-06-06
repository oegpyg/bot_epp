const { normalizarCI } = require('../utils/normalizadores');

function verificarAfiliado(db, ci) {
  return new Promise((resolve, reject) => {
    const ciLimpio = normalizarCI(ci);

    db.get(
      "SELECT * FROM afiliados WHERE ci = ?",
      [ciLimpio],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

async function validarRegistros(db, registros) {
  const afiliados = [];
  const noAfiliados = [];

  for (const r of registros) {
    const ci = normalizarCI(r.ci || r.cedula);

    const existe = await verificarAfiliado(db, ci);

    if (existe) {
      afiliados.push({ ...r, estado: "AFILIADO" });
    } else {
      noAfiliados.push({ ...r, estado: "NO AFILIADO" });
    }
  }

  return {
    total: registros.length,
    afiliados,
    noAfiliados
  };
}

module.exports = {
  validarRegistros
};