const qrcode = require('qrcode-terminal');
const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const axios = require('axios');
const path = require('path');

// =========================
// DB
// =========================
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.log('❌ Error SQLite:', err.message);
  } else {
    console.log('✅ SQLite conectado');
  }
});

// =========================
// API KEY
// =========================
const API_KEY = 'antijakerclavesecreta321';

// =========================
// MEMORIA USUARIOS
// =========================
const usuariosEnRegistro = {};
const usuariosAfiliado = {};

// =========================
// START BOT
// =========================
async function startBot() {

  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });
  global.sock = sock

  sock.ev.on('creds.update', saveCreds);

  // =========================
  // MENSAJES
  // =========================
  sock.ev.on('messages.upsert', async ({ messages }) => {

    try {

      const msg = messages[0];

      if (!msg.message || msg.key.fromMe) return;

      const from = msg.key.remoteJid;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      const mensaje = text.toLowerCase().trim();

      console.log('📩 MENSAJE:', mensaje);

      const estado = usuariosEnRegistro[from];

      // =========================
      // FLUJO VOLUNTARIO
      // =========================
      if (estado?.tipo === 'voluntario') {

        if (estado.paso === 1) {

          estado.nombre = text;
          estado.paso = 2;

          return sock.sendMessage(from, {
            text: '📱 Escribe tu número de contacto'
          });
        }

        if (estado.paso === 2) {

   db.run(
  `INSERT INTO voluntario (nombre, contacto, fecha)
   VALUES (?, ?, ?)`,
  [
    estado.nombre,
    text,
    new Date().toLocaleString()
  ],
  async (err) => {

    if (err) {
      console.log(err)

      return sock.sendMessage(from, {
        text: '❌ Error al guardar voluntario'
      })
    }

    // 🔥 UPDATE REALTIME
    global.io.emit('updateDashboard')

    delete usuariosEnRegistro[from]

    return sock.sendMessage(from, {
      text: '✅ REGISTRO COMPLETADO'
    })
  }
);

          return;
        }
      }

      // =========================
      // FLUJO SIMPATIZANTE
      // =========================
      if (estado?.tipo === 'simpatizante') {

        if (estado.paso === 1) {

          estado.nombre = text;
          estado.paso = 2;

          return sock.sendMessage(from, {
            text: '📍 Escribe tu barrio'
          });
        }

        if (estado.paso === 2) {

          estado.barrio = text;
          estado.paso = 3;

          return sock.sendMessage(from, {
            text: '📱 Escribe tu contacto'
          });
        }

        if (estado.paso === 3) {

       db.run(
  `INSERT INTO simpatizantes (nombre, barrio, contacto, fecha)
   VALUES (?, ?, ?, ?)`,
  [
    estado.nombre,
    estado.barrio,
    text,
    new Date().toLocaleString()
  ],
  async (err) => {

    if (err) {
      console.log(err)

      return sock.sendMessage(from, {
        text: '❌ Error al guardar simpatizante'
      })
    }

    // 🔥 UPDATE REALTIME
    global.io.emit('updateDashboard')

    delete usuariosEnRegistro[from]

    return sock.sendMessage(from, {
      text: '✅ REGISTRO COMPLETADO'
    })
  }
);

          return;
        }
      }

      // =========================
      // MENU
      // =========================
      if (['menu', 'hola', 'renzo', 'buenas'].includes(mensaje)) {

        return sock.sendMessage(from, {
          text:
`👋 Hola
Bienvenido al equipo 🇵🇾

1️⃣ Propuestas
2️⃣ Sumarme al Equipo
3️⃣ Recorrido Semanal
4️⃣ Voluntario
8️⃣ Consulta Afiliados`
        });
      }

      // =========================
// OPCIONES
// =========================

// 1️⃣ PROPUESTAS
if (mensaje === '1') {

  const file = path.join(__dirname, 'public', 'imagenes', 'propuestas.png');

  if (!fs.existsSync(file)) {
    return sock.sendMessage(from, {
      text: '❌ Imagen de propuestas no encontrada'
    });
  }

  return sock.sendMessage(from, {
    image: { url: file },
    caption: '📌 PROPUESTAS'
  });
}

// 2️⃣ SUMARME
if (mensaje === '2') {

  usuariosEnRegistro[from] = {
    tipo: 'simpatizante',
    paso: 1
  };

  return sock.sendMessage(from, {
    text: '✍️ Escribe tu nombre completo'
  });
}

// 3️⃣ RECORRIDO
if (mensaje === '3') {

  const file = path.join(__dirname, 'public', 'imagenes', 'recorrido.png');

  if (!fs.existsSync(file)) {
    return sock.sendMessage(from, {
      text: '❌ Imagen de recorrido no encontrada'
    });
  }

  return sock.sendMessage(from, {
    image: { url: file },
    caption: '📅 RECORRIDO SEMANAL'
  });
}

// 4️⃣ VOLUNTARIO
if (mensaje === '4') {

  usuariosEnRegistro[from] = {
    tipo: 'voluntario',
    paso: 1
  };

  return sock.sendMessage(from, {
    text: '🤝 Escribe tu nombre completo'
  });
}

// 5️⃣ REDES OFICIALES
if (mensaje === '5') {

  return sock.sendMessage(from, {
    text:
`🌐 REDES OFICIALES

📘 Facebook:
https://facebook.com/

📸 Instagram:
https://instagram.com/

🎵 TikTok:
https://tiktok.com/

▶️ YouTube:
https://youtube.com/`
  });
}

// 6️⃣ COMPARTIR CAMPAÑA
if (mensaje === '6') {

  return sock.sendMessage(from, {
    text:
`📢 COMPARTE LA CAMPAÑA

Ayúdanos compartiendo este mensaje con tus contactos 🇵🇾

"Apoyemos juntos el proyecto de Renzo Benítez para un mejor futuro."

🙏 Gracias por apoyar`
  });
}

// 7️⃣ SIMULADOR
if (mensaje === '7') {

  return sock.sendMessage(from, {
    text:
`🗳️ SIMULADOR RENZO BENÍTEZ

📊 Encuesta rápida:

1️⃣ Excelente
2️⃣ Buena
3️⃣ Regular
4️⃣ Mala

Responde con un número`
  });
}

// 8️⃣ AFILIADOS
if (mensaje === '8') {

  usuariosAfiliado[from] = true;

  setTimeout(() => {
    delete usuariosAfiliado[from];
  }, 30000);

  return sock.sendMessage(from, {
    text: '🔎 Ingresa tu número de cédula'
  });
}
      // =========================
      // CONSULTA AFILIADO
      // =========================

      if (mensaje === '8') {

        usuariosAfiliado[from] = true;

        return sock.sendMessage(from, {
          text: '🔎 Ingresa tu número de cédula'
        });
      }

      if (usuariosAfiliado[from]) {

        usuariosAfiliado[from] = false;

        const cedula = mensaje.replace(/\D/g, '');

        if (!cedula) {

          return sock.sendMessage(from, {
            text: '❌ Cédula inválida'
          });
        }

        try {

          const response = await axios.get(
            `https://plra.org.py/public/buscar_padron.php?cedula=${cedula}`,
            {
              headers: {
                Authorization: `Bearer ${API_KEY}`,
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0'
              }
            }
          );

          const data = response.data;

          if (!Array.isArray(data) || data.length === 0) {

            return sock.sendMessage(from, {
              text: '❌ No encontrado'
            });
          }

          const persona = data[0];

          return sock.sendMessage(from, {
            text:
`👤 ${persona.nombresYApellido || 'Sin nombre'}

🪪 Cédula: ${cedula}
🏛️ Comité: ${persona.comite_nombre || 'No disponible'}
🗳️ Mesa: ${persona.mesa || 'No disponible'}
📍 Distrito: ${persona.distrito_nombre || 'No disponible'}

✅ Afiliado PLRA`
          });

        } catch (error) {

          console.log('❌ ERROR AFILIADO:', error.response?.data || error.message);

          return sock.sendMessage(from, {
            text: '❌ Error al consultar afiliado'
          });
        }
      }

    } catch (err) {

      console.log('❌ ERROR BOT:', err);
    }
  });

  // =========================
  // CONEXION
  // =========================
  sock.ev.on('connection.update', (update) => {

    const { connection, lastDisconnect } = update;

    if (update.qr) {
      qrcode.generate(update.qr, { small: true });
    }

    if (connection === 'close') {

      const reason =
        lastDisconnect?.error?.output?.statusCode;

      console.log('❌ Conexión cerrada:', reason);

      if (reason !== DisconnectReason.loggedOut) {
        startBot();
      }
    }

    if (connection === 'open') {
      console.log('🤖 Bot conectado correctamente');
    }
  });
}

startBot();