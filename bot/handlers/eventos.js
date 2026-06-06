async function eventos(sock, from) {

  return sock.sendMessage(from, {
    text:
`📅 RECORRIDO SEMANAL

🗓️ Martes 26
⏰ 18:00 hs
📍 J. Augusto Saldívar`
  });

}