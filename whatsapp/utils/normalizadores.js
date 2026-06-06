function normalizarTexto(texto) {
  return String(texto)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizarCI(ci) {
  return String(ci)
    .replace(/\D/g, '')
    .trim();
}

module.exports = {
  normalizarTexto,
  normalizarCI
};