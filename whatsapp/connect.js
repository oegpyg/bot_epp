const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function connectToWhatsApp({ handleMessage, db, authDir }) {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Bot Renzo', 'Chrome', '120.0.0']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\nEscanea este QR con WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\nQR activo por tiempo limitado\n');
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log('Conexion cerrada. Reconectando:', shouldReconnect);

      if (shouldReconnect) {
        setTimeout(() => {
          connectToWhatsApp({ handleMessage, db, authDir });
        }, 3000);
      } else {
        console.log('Sesion cerrada. Borra auth y vuelve a vincular.');
      }
    } else if (connection === 'open') {
      console.log('WhatsApp conectado correctamente');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];

    if (!msg?.key?.fromMe && msg?.message) {
      console.log(
        'Mensaje recibido:',
        msg.message.conversation || msg.message.extendedTextMessage?.text || '(sin texto)'
      );
    }

    await handleMessage(sock, db, m);
  });
}

module.exports = { connectToWhatsApp };
