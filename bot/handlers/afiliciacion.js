async function afiliacion(sock, from, text) {

  return sock.sendMessage(from, {
    text: '🔎 Consulta afiliados '
  });

}