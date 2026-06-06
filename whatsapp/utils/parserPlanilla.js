function extraerCedulas(texto) {

  const regex = /\b\d{5,8}\b/g;

  return texto.match(regex) || [];
}

module.exports = {
  extraerCedulas
};