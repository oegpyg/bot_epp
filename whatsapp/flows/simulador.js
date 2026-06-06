module.exports = async function simulador(sock, from) {

  return sock.sendMessage(from, {
    text:
`🗳️ SIMULADOR RENZO BENÍTEZ

Ingresá al simulador oficial:

https://simulador.sondeosparaguay.com/Renzo_BenitezConcejal2026Lista20`
  });

};