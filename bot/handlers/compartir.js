async function compartir(sock, from) {

  return sock.sendMessage(from, {
    text:
`📲 COMPARTE LA CAMPAÑA

Invita a tus amigos a sumarse 🇵🇾

https://wa.me/?text=Sumate%20a%20la%20campaña%20de%20Renzo%20Benítez`
  });

}