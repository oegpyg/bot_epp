function extraerRegistros(texto) {
  const lineas = texto.split("\n");

  return lineas
    .map(l => {
      const partes = l.trim().split(/\s{2,}|\t+/);

      return {
        nombre: partes[0],
        ci: partes[1]
      };
    })
    .filter(r => r.nombre && r.ci);
}

module.exports = {
  extraerRegistros
};