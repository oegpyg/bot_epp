const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const { handleMessage } = require('./handlers')

async function startBot(db) {

  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  })

  // =========================
  // CONEXIÓN
  // =========================
  sock.ev.on('connection.update', (update) => {

    const { connection, lastDisconnect } = update

    if (connection === 'close') {

      const reason = lastDisconnect?.error?.output?.statusCode

      if (reason !== DisconnectReason.loggedOut) {
        startBot(db)
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot WhatsApp conectado')
    }

  })

  sock.ev.on('creds.update', saveCreds)

  // =========================
  // MENSAJES
  // =========================
  sock.ev.on('messages.upsert', async ({ messages }) => {

    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''

    await handleMessage(sock, db, from, text)

  })

}

module.exports = { startBot }