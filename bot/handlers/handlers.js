const axios = require('axios');
const qs = require('querystring');

// =========================
// ESTADOS
// =========================
const usuariosEnRegistro = {};
const usuariosAfiliado = {};

// =========================
// MENÚ
// =========================
function menu(sock, from) {
  return sock.sendMessage(from, {
    text: `👋 Hola
Bienvenido al equipo de Renzo Benítez 🇵🇾

1⃣ Propuestas
2⃣ Sumarme al Equipo
3⃣ Recorrido Semanal
4⃣ Carga de Planillas
5⃣ Redes Oficiales
6⃣ Compartir Campaña
7⃣ Simulador Renzo Benítez
8⃣ Consulta Afiliados`
  });
}

// =========================
// PROPUESTAS
// =========================
function propuestas(sock, from) {
  return sock.sendMessage(from, {
    text: `📌 *Propuestas de Renzo Benítez:*
- Seguridad para todos
- Generación de empleo
- Oportunidades para la juventud`
  });
}

// =========================
// VOLUNTARIOS
// =========================
async function voluntarios(sock, db, from, text) {
  if (!usuariosEnRegistro[from]) {
    usuariosEnRegistro[from] = { tipo: 'voluntario', paso: 1 };
    return sock.sendMessage(from, { text: '🤝 Escribe tu nombre completo' });
  }

  const estado = usuariosEnRegistro[from];

  if (estado.paso === 1) {
    estado.nombre = text;
    estado.paso = 2;
    return sock.sendMessage(from, { text: '📱 Escribe tu número de contacto' });
  }

  if (estado.paso === 2) {
    db.get("SELECT * FROM voluntarios WHERE contacto =?", [text], (err, row) => {
      if (err) {
        console.log('ERROR DB:', err.message);
        return sock.sendMessage(from, { text: '❌ Error en base de datos' });
      }

      if (row) {
        delete usuariosEnRegistro[from];
        return sock.sendMessage(from, { text: "⚠ Ya estás registrado como voluntario" });
      }

      db.run(
        `INSERT INTO voluntarios (nombre, contacto, fecha) VALUES (?,?, datetime('now'))`,
        [estado.nombre, text],
        (err) => {
          if (err) {
            console.log('ERROR INSERT:', err.message);
            return sock.sendMessage(from, { text: '❌ Error al guardar' });
          }
          delete usuariosEnRegistro[from];
          sock.sendMessage(from, { text: "✅ ¡Gracias! Te sumaste al equipo de voluntarios" });
        }
      );
    });
  }
}

// =========================
// SIMPATIZANTES
// =========================
async function simpatizantes(sock, db, from, text) {
  if (!usuariosEnRegistro[from]) {
    usuariosEnRegistro[from] = { tipo: 'simpatizante', paso: 1 };
    return sock.sendMessage(from, { text: '✍ Escribe tu nombre completo' });
  }

  const estado = usuariosEnRegistro[from];

  if (estado.paso === 1) {
    estado.nombre = text;
    estado.paso = 2;
    return sock.sendMessage(from, { text: '📍 Escribe tu barrio o ciudad' });
  }

  if (estado.paso === 2) {
    estado.barrio = text;
    estado.paso = 3;
    return sock.sendMessage(from, { text: '📱 Escribe tu número de contacto' });
  }

  if (estado.paso === 3) {
    db.get("SELECT * FROM simpatizantes WHERE contacto =?", [text], (err, row) => {
      if (err) {
        console.log('ERROR DB:', err.message);
        return sock.sendMessage(from, { text: '❌ Error en base de datos' });
      }

      if (row) {
        delete usuariosEnRegistro[from];
        return sock.sendMessage(from, { text: "⚠ Ya estás registrado" });
      }

      db.run(
        `INSERT INTO simpatizantes (nombre, barrio, contacto, fecha) VALUES (?,?,?, datetime('now'))`,
        [estado.nombre, estado.barrio, text],
        (err) => {
          if (err) {
            console.log('ERROR INSERT:', err.message);
            return sock.sendMessage(from, { text: '❌ Error al guardar' });
          }
          delete usuariosEnRegistro[from];
          sock.sendMessage(from, { text: "✅ Registro exitoso. ¡Gracias por sumarte!" });
        }
      );
    });
  }
}

// =========================
// CONSULTA RCP PLRA - VERSIÓN JSON
// =========================
async function consultarRCP(cedula) {
  try {
    const cedulaLimpia = cedula.toString().replace(/\D/g, '');

    // La página nueva usa buscar_padron_simple.php que devuelve JSON directo
    const res = await axios.get(
      'https://plra.org.py/public/buscar_padron_simple.php',
      {
        params: {
          cedula: cedulaLimpia,
          recaptcha: 'dev_test_' + Math.random().toString(36).substring(7)
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://plra.org.py/public/buscar_padron_simple.php'
        },
        timeout: 15000
      }
    );

    const data = res.data;

    // Si devuelve error
    if (data.error) {
      return { error: data.error };
    }

    // Si devuelve array vacío
    if (!Array.isArray(data) || data.length === 0) {
      return { error: 'No figura en el Registro Cívico Permanente' };
    }

    const p = data[0]; // Primer resultado

    const limpiar = (str) => {
      if (!str || str === null || str === undefined) return 'No disponible';
      return String(str).trim() || 'No disponible';
    };

    return {
      cedula: cedulaLimpia,
      nombres_apellido: limpiar(p.nombresYApellido || `${p.nombre || ''} ${p.apellido || ''}`.trim()),
      comite_nombre: limpiar(p.comite_nombre),
      mesa: limpiar(p.mesa),
      distrito_nombre: limpiar(p.distrito_nombre || p.local),
      orden: limpiar(p.orden || p.nro_orden),
      departamento: limpiar(p.departamento_nombre),
      zona: limpiar(p.zona_nombre),
      local_interna: limpiar(p.local_inerna),
      local_generales: limpiar(p.local_genrales)
    };

  } catch (err) {
    console.error('ERROR API:', err.response?.status, err.message);
    console.error('Detalle:', err.response?.data?.toString().substring(0, 500));

    if (err.code === 'ECONNABORTED') {
      return { error: 'Timeout: el servidor del PLRA no responde' };
    }
    if (err.response?.status === 403) {
      return { error: 'Acceso denegado. Reintenta en unos minutos' };
    }
    return { error: 'Error al consultar. Intenta de nuevo' };
  }
}

// =========================
// AFILIACIÓN
// =========================
async function afiliacion(sock, db, from, text) {
  usuariosAfiliado[from] = false;
  const cedula = text.replace(/\D/g, '');

  if (!cedula || cedula.length < 6 || cedula.length > 8) {
    return sock.sendMessage(from, { text: '❌ Cédula inválida. Debe tener 6 a 8 números' });
  }

  console.log('Consultando cédula:', cedula);
  await sock.sendMessage(from, { text: '⏳ Consultando padrón...' });

  const p = await consultarRCP(cedula);

  if (p.error) {
    return sock.sendMessage(from, { text: `❌ ${p.error}` });
  }

  db.run(`
    INSERT INTO afiliados (cedula, nombres_apellido, comite_nombre, mesa, distrito_nombre, fecha)
    VALUES (?,?,?,?,?, datetime('now'))
    ON CONFLICT(cedula) DO UPDATE SET
      nombres_apellido = excluded.nombres_apellido,
      comite_nombre = excluded.comite_nombre,
      mesa = excluded.mesa,
      distrito_nombre = excluded.distrito_nombre,
      fecha = excluded.fecha
  `, [p.cedula, p.nombres_apellido, p.comite_nombre, p.mesa, p.distrito_nombre], function(err) {
    if (err) {
      console.log('❌ ERROR BD:', err.message);
      return sock.sendMessage(from, { text: '❌ Error al guardar en base de datos' });
    }

    console.log(`✅ Guardado: ${p.cedula} - Cambios: ${this.changes}`);

    let mensaje = `👤 *${p.nombres_apellido}*\n\n`;
    mensaje += `🪪 *Cédula:* ${p.cedula}\n`;
    mensaje += `🏛 *Comité:* ${p.comite_nombre}\n`;
    mensaje += `🗳 *Mesa:* ${p.mesa}\n`;
    mensaje += `📍 *Local:* ${p.distrito_nombre}\n`;
    if (p.orden!== 'No disponible') mensaje += `📋 *Orden:* ${p.orden}\n`;
    mensaje += `\n✅ *Afiliado PLRA*`;

    return sock.sendMessage(from, { text: mensaje });
  });
}

// =========================
// HANDLER PRINCIPAL
// =========================
async function handleMessage(sock, db, m) {
  const msg = m.messages[0];
  if (!msg.message || msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
  const messageText = text.toLowerCase().trim();

  // Si está en medio de un registro
  if (usuariosEnRegistro[from]) {
    if (usuariosEnRegistro[from].tipo === 'voluntario') {
      return voluntarios(sock, db, from, text);
    }
    if (usuariosEnRegistro[from].tipo === 'simpatizante') {
      return simpatizantes(sock, db, from, text);
    }
  }

  // Si está esperando cédula
  if (usuariosAfiliado[from]) {
    return afiliacion(sock, db, from, text);
  }

  // Comandos del menú
  if (messageText === 'menu' || messageText === 'hola') return menu(sock, from);
  if (messageText === '1') return propuestas(sock, from);
  if (messageText === '2') return simpatizantes(sock, db, from, text);
  if (messageText === '3') return sock.sendMessage(from, { text: '📅 Recorrido semanal: Pronto compartiremos las fechas' });
  if (messageText === '4') return voluntarios(sock, db, from, text);
  if (messageText === '5') return sock.sendMessage(from, { text: '📲 Redes: https://facebook.com/renzobenitez' });
  if (messageText === '6') return sock.sendMessage(from, { text: '🔗 Compartí: https://wa.me/' });
  if (messageText === '7') return sock.sendMessage(from, { text: '🤖 Simulador: Próximamente' });
  if (messageText === '8') {
    usuariosAfiliado[from] = true;
    return sock.sendMessage(from, { text: '🔎 Ingresa tu número de cédula sin puntos ni guiones' });
  }

  return sock.sendMessage(from, {
    text: 'Escribe *menu* para ver las opciones disponibles'
  });
}

module.exports = { handleMessage };