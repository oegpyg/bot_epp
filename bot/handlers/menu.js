async function menu(sock, from) {

  return sock.sendMessage(from, {
    text:
`👋 Hola
Bienvenido al equipo de Renzo Benítez 🇵🇾

1️⃣ Propuestas
2️⃣ Sumarme al Equipo
3️⃣ Recorrido Semanal
4️⃣ Voluntarios
5️⃣ Redes
6️⃣ Compartir
7️⃣ Simulador Renzo
8️⃣ Consulta Afiliados`
  });

}