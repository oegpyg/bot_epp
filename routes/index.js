// =========================
// INDEX PRINCIPAL LIMPIO
// =========================

const express = require('express');
const path = require('path');
const fs = require('fs');

// =========================
// IMPORTAR SERVER
// =========================
const app = express();

// =========================
// CONFIGURACIÓN BÁSICA
// =========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// VISTAS
// =========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =========================
// ARCHIVOS ESTÁTICOS
// =========================
app.use(express.static(path.join(__dirname, 'public')));

// =========================
// RUTAS
// =========================
const rutas = require('./routes');
app.use('/', rutas);

// =========================
// BASE DE DATOS (SQLite)
// =========================
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('❌ Error DB:', err.message);
  } else {
    console.log('✅ Base de datos conectada');
  }
});

// Crear tablas si no existen
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS voluntario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      telefono TEXT,
      barrio TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS simpatizante (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      telefono TEXT
    )
  `);
});

// =========================
// WHATSAPP BOT (Baileys)
// =========================
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        startBot();
      }
    }

    if (connection === 'open') {
      console.log('🤖 Bot conectado correctamente');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text;

    console.log('📩 MENSAJE:', text);

    if (text === 'hola') {
      await sock.sendMessage(from, { text: '👋 Hola! Bot activo' });
    }
  });
}

// =========================
// INICIAR TODO
// =========================
app.listen(3000, () => {
  console.log('🌐 Servidor corriendo en http://localhost:3000');
  startBot();
});