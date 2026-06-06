const { handleMessage } = require('./bot/handlers/handlers');
const { loadConfig } = require('./config/env');
const { createDatabase } = require('./db');
const { connectToWhatsApp } = require('./whatsapp/connect');
const requireLogin = require('./middleware/requireLogin');
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const multer = require('multer');
const fs = require('fs');

const config = loadConfig();

const app = express();
const PORT = config.port;

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]);
    const isExcelName = /\.(xlsx|xls)$/i.test(file.originalname || '');
    if (allowedMimeTypes.has(file.mimetype) || isExcelName) {
      return cb(null, true);
    }
    return cb(new Error('Solo se permiten archivos Excel .xlsx o .xls'));
  }
});

// =========================
// CONFIGURACIÓN DE BASE DE DATOS
// =========================
const db = createDatabase();

// =========================
// CONFIGURACIÓN EXPRESS
// =========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production'
  }
}));

// =========================
// LOGIN
// =========================
app.get('/login', (req, res) => {
  if (req.session.loggedIn) return res.redirect('/panel');

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - Panel Renzo</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap" rel="stylesheet">
      <style>
        * { font-family: 'Inter', sans-serif; }
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
      </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-4">
      <div class="glass rounded-3xl p-8 md:p-12 w-full max-w-md shadow-2xl">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-black text-gray-800 mb-2">Panel Renzo</h1>
          <p class="text-gray-600">Ingresa tus credenciales</p>
        </div>
        <form method="POST" action="/login">
          <div class="mb-6">
            <label class="block text-gray-700 font-bold mb-2">Usuario</label>
            <input type="text" name="username" required class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-600 focus:outline-none">
          </div>
          <div class="mb-6">
            <label class="block text-gray-700 font-bold mb-2">Contraseña</label>
            <input type="password" name="password" required class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-600 focus:outline-none">
          </div>
          <button type="submit" class="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold text-lg shadow-lg">
            Ingresar
          </button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).send('Solicitud invalida. <a href="/login">Volver</a>');
  }

  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  const providedUser = Buffer.from(cleanUsername, 'utf8');
  const expectedUser = Buffer.from(config.adminUser, 'utf8');
  const providedPass = Buffer.from(cleanPassword, 'utf8');
  const expectedPass = Buffer.from(config.adminPass, 'utf8');

  const userOk =
    providedUser.length === expectedUser.length &&
    crypto.timingSafeEqual(providedUser, expectedUser);
  const passOk =
    providedPass.length === expectedPass.length &&
    crypto.timingSafeEqual(providedPass, expectedPass);

  if (userOk && passOk) {
    req.session.loggedIn = true;
    req.session.username = cleanUsername;
    res.redirect('/panel');
  } else {
    res.status(401).send('Credenciales incorrectas. <a href="/login">Volver</a>');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// =========================
// PANEL PRINCIPAL
// =========================
app.get('/panel', requireLogin, (req, res) => {
  db.all("SELECT COUNT(*) as total FROM voluntarios", (err, vol) => {
    db.all("SELECT COUNT(*) as total FROM simpatizantes", (err, sim) => {
      db.all("SELECT COUNT(*) as total FROM afiliados", (err, afi) => {
        const totalVol = vol[0]?.total || 0;
        const totalSim = sim[0]?.total || 0;
        const totalAfi = afi[0]?.total || 0;
        const total = totalVol + totalSim + totalAfi;

        res.send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Panel - Renzo Benítez</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap" rel="stylesheet">
            <style>
              * { font-family: 'Inter', sans-serif; }
              body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
.glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
            </style>
          </head>
          <body>
            <div class="min-h-screen p-4 md:p-6">
              <div class="glass rounded-2xl p-6 mb-6 shadow-2xl">
                <div class="flex justify-between items-center">
                  <div>
                    <h1 class="text-3xl font-black text-gray-800">Panel de Control RENZO BENITEZ</h1>
                    <p class="text-gray-600">Renzo Benítez - Campaña 2026</p>
                  </div>
                  <a href="/logout" class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">Salir</a>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div class="glass rounded-2xl p-6 shadow-xl">
                  <div class="text-sm text-gray-600 mb-2">Total General</div>
                  <div class="text-4xl font-black text-gray-800">${total}</div>
                </div>
                <div class="glass rounded-2xl p-6 shadow-xl">
                  <div class="text-sm text-gray-600 mb-2">Voluntarios</div>
                  <div class="text-4xl font-black text-blue-600">${totalVol}</div>
                </div>
                <div class="glass rounded-2xl p-6 shadow-xl">
                  <div class="text-sm text-gray-600 mb-2">Simpatizantes</div>
                  <div class="text-4xl font-black text-green-600">${totalSim}</div>
                </div>
                <div class="glass rounded-2xl p-6 shadow-xl">
                  <div class="text-sm text-gray-600 mb-2">Afiliados</div>
                  <div class="text-4xl font-black text-purple-600">${totalAfi}</div>
                </div>
              </div>

              <div class="glass rounded-2xl p-6 shadow-xl">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">Acciones Rápidas</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <a href="/afiliados" class="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z"></path>
                    </svg>
                    Gestionar Afiliados
                  </a>
                  <a href="/votantes" class="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 0 00-.723 1.745 3.066 0 01-2.812 2.812 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                    Control Votantes
                  </a>
                  <a href="/ranking" class="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                    </svg>
                    Ranking Comités
                  </a>
                  <a href="/export/excel" class="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"></path>
                    </svg>
                    Exportar Excel
                  </a>
                  <a href="/export/pdf" class="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path>
                    </svg>
                    Exportar PDF
                  </a>
                  <a href="/panel" class="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"></path>
                    </svg>
                    Actualizar Datos
                  </a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `);
      });
    });
  });
});

// =========================
// DASHBOARD VOTANTES
// =========================
app.get('/votantes', requireLogin, (req, res) => {
  const query = `
    SELECT
      a.cedula,
      a.nombres_apellido,
      a.comite_nombre,
      a.mesa,
      a.distrito_nombre,
      a.contacto,
      COALESCE(v.votado, 0) as votado,
      v.hora_voto
    FROM afiliados a
    LEFT JOIN votos v ON a.cedula = v.cedula
    ORDER BY a.comite_nombre, a.mesa
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).send('Error DB');

    const totalAfiliados = rows.length;
    const votaron = rows.filter(r => r.votado === 1).length;
    const pendientes = totalAfiliados - votaron;
    const porcentaje = totalAfiliados > 0 ? ((votaron / totalAfiliados) * 100).toFixed(1) : 0;

    const porComite = {};
    rows.forEach(r => {
      if (!porComite[r.comite_nombre]) {
        porComite[r.comite_nombre] = { total: 0, votaron: 0 };
      }
      porComite[r.comite_nombre].total++;
      if (r.votado === 1) porComite[r.comite_nombre].votaron++;
    });

    const filas = rows.map(r => `
      <tr>
        <td>${r.cedula}</td>
        <td>${r.nombres_apellido}</td>
        <td>${r.comite_nombre}</td>
        <td>${r.mesa}</td>
        <td>${r.contacto || '-'}</td>
        <td>
          ${r.votado === 1
            ? `<span class="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Voto ${r.hora_voto ? r.hora_voto.substring(11,16) : ''}</span>`
            : `<button onclick="marcarVoto('${r.cedula}', this)" class="btn-voto px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm">
                Ya Voto
               </button>`
          }
        </td>
      </tr>
    `).join('');

    res.send(`<!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Control de Votantes - Renzo</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdn.datatables.net/1.13.8/css/jquery.dataTables.min.css">
      <style>
        body { background: #f3f4f6; font-family: 'Inter', sans-serif; }
        #tablaVotantes_wrapper .dataTables_filter input {
          border: 2px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.4rem 0.75rem;
          margin-left: 0.5rem;
          outline: none;
        }
        #tablaVotantes_wrapper .dataTables_filter input:focus {
          border-color: #7c3aed;
        }
        #tablaVotantes_wrapper .dataTables_length select {
          border: 2px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.3rem 0.5rem;
        }
        #tablaVotantes_wrapper .dataTables_paginate .paginate_button {
          border-radius: 0.5rem !important;
          padding: 0.3rem 0.75rem !important;
          margin: 0 2px;
        }
        #tablaVotantes_wrapper .dataTables_paginate .paginate_button.current {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
          color: white !important;
        }
        #tablaVotantes thead th {
          background: #f9fafb;
          font-weight: 700;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          padding: 0.75rem 1rem;
        }
        #tablaVotantes tbody td {
          padding: 0.65rem 1rem;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }
        #tablaVotantes tbody tr:hover { background: #faf5ff; }
      </style>
    </head>
    <body>
      <div class="min-h-screen p-4 md:p-6">

        <!-- HEADER -->
        <div class="bg-white rounded-2xl p-6 mb-6 shadow-xl">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 class="text-3xl font-black text-gray-800">Control de Votantes</h1>
              <p class="text-gray-500 text-sm mt-1">Datos en tiempo real &mdash; <span id="ultimaActualizacion"></span></p>
            </div>
            <div class="flex gap-3 flex-wrap">
              <button onclick="location.reload()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm">Actualizar</button>
              <a href="/votantes/pendientes/excel" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm">Excel Pendientes</a>
              <a href="/panel" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm">Panel</a>
            </div>
          </div>
        </div>

        <!-- CARDS RESUMEN -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
            <div class="text-xs uppercase tracking-wide opacity-80 mb-1">Total Padron</div>
            <div class="text-4xl font-black">${totalAfiliados}</div>
          </div>
          <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
            <div class="text-xs uppercase tracking-wide opacity-80 mb-1">Ya Votaron</div>
            <div class="text-4xl font-black">${votaron}</div>
            <div class="text-sm mt-1 opacity-90">${porcentaje}%</div>
          </div>
          <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
            <div class="text-xs uppercase tracking-wide opacity-80 mb-1">Pendientes</div>
            <div class="text-4xl font-black">${pendientes}</div>
          </div>
          <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
            <div class="text-xs uppercase tracking-wide opacity-80 mb-1">Participacion</div>
            <div class="text-4xl font-black">${porcentaje}%</div>
            <div class="w-full bg-purple-400 rounded-full h-2 mt-2">
              <div class="bg-white rounded-full h-2" style="width:${porcentaje}%"></div>
            </div>
          </div>
        </div>

        <!-- POR COMITE -->
        <div class="bg-white rounded-2xl p-6 mb-6 shadow-xl">
          <h2 class="text-xl font-bold text-gray-800 mb-4">Por Comite</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            ${Object.entries(porComite).map(([comite, data]) => {
              const pct = ((data.votaron / data.total) * 100).toFixed(0);
              return `
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div class="font-bold text-gray-700 text-sm mb-1 truncate" title="${comite}">${comite}</div>
                  <div class="text-2xl font-black text-blue-600">${data.votaron}<span class="text-gray-400 text-base font-normal">/${data.total}</span></div>
                  <div class="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div class="bg-blue-500 rounded-full h-1.5" style="width:${pct}%"></div>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">${pct}%</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- TABLA CON DATATABLES -->
        <div class="bg-white rounded-2xl p-6 shadow-xl">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-800">Listado de Votantes</h2>
            <div class="flex gap-2 text-xs">
              <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">Voto: ${votaron}</span>
              <span class="px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold">Pendiente: ${pendientes}</span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table id="tablaVotantes" class="w-full text-sm" style="width:100%">
              <thead>
                <tr>
                  <th>Cedula</th>
                  <th>Nombre</th>
                  <th>Comite</th>
                  <th>Mesa</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${filas}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
      <script src="https://cdn.datatables.net/1.13.8/js/jquery.dataTables.min.js"></script>
      <script>
        document.getElementById('ultimaActualizacion').textContent =
          'Actualizado: ' + new Date().toLocaleTimeString('es-PY');

        $(document).ready(function () {
          $('#tablaVotantes').DataTable({
            pageLength: 25,
            lengthMenu: [10, 25, 50, 100, 250],
            order: [[2, 'asc'], [3, 'asc']],
            language: {
              url: 'https://cdn.datatables.net/plug-ins/1.13.8/i18n/es-ES.json'
            },
            columnDefs: [
              { orderable: false, targets: 5 }
            ]
          });
        });

        function marcarVoto(cedula, btn) {
          if (!confirm('Confirmar que cedula ' + cedula + ' ya voto?')) return;
          btn.disabled = true;
          btn.textContent = '...';
          fetch('/votantes/marcar/' + cedula, { method: 'POST' })
            .then(r => {
              if (r.ok) {
                const td = btn.closest('td');
                td.innerHTML = '<span class="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Voto</span>';
              } else {
                btn.disabled = false;
                btn.textContent = 'Ya Voto';
                alert('Error al marcar. Intenta de nuevo.');
              }
            })
            .catch(() => {
              btn.disabled = false;
              btn.textContent = 'Ya Voto';
              alert('Error de conexion.');
            });
        }
      </script>
    </body>
    </html>`);
  });
});

app.post('/votantes/marcar/:cedula', requireLogin, (req, res) => {
  db.run(`
    INSERT INTO votos (cedula, votado, hora_voto, marcado_por)
    VALUES (?, 1, datetime('now'),?)
    ON CONFLICT(cedula) DO UPDATE SET votado=1, hora_voto=datetime('now')
  `, [req.params.cedula, req.session.username || 'sistema'], (err) => {
    if (err) return res.status(500).send('Error');
    res.sendStatus(200);
  });
});

app.get('/votantes/pendientes/excel', requireLogin, (req, res) => {
  const query = `
    SELECT a.cedula, a.nombres_apellido, a.comite_nombre, a.mesa, a.contacto
    FROM afiliados a
    LEFT JOIN votos v ON a.cedula = v.cedula
    WHERE COALESCE(v.votado, 0) = 0
    ORDER BY a.comite_nombre
  `;

  db.all(query, [], async (err, rows) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pendientes');
    sheet.columns = [
      { header: 'Cédula', key: 'cedula', width: 15 },
      { header: 'Nombre', key: 'nombres_apellido', width: 35 },
      { header: 'Comité', key: 'comite_nombre', width: 25 },
      { header: 'Mesa', key: 'mesa', width: 10 },
      { header: 'Contacto', key: 'contacto', width: 20 }
    ];
    rows.forEach(row => sheet.addRow(row));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pendientes_votar.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  });
});

// =========================
// RANKING COMITÉS N°1 VS N°2 - CON DATOS REALES
// =========================
app.get('/ranking', requireLogin, (req, res) => {
  const queryTotales = `
    SELECT
      comite_nombre,
      COUNT(*) as total
    FROM afiliados
    WHERE comite_nombre LIKE '%SALDIVAR%'
    GROUP BY comite_nombre
  `;

  const queryEvolucion = `
    SELECT
      comite_nombre,
      DATE(fecha) as dia,
      COUNT(*) as cantidad_dia
    FROM afiliados
    WHERE comite_nombre LIKE '%SALDIVAR%'
      AND DATE(fecha) >= DATE('now', '-6 days')
    GROUP BY comite_nombre, DATE(fecha)
    ORDER BY dia ASC
  `;

  db.all(queryTotales, [], (err, totales) => {
    if (err) {
      console.error('Error totales:', err);
      return res.status(500).send('Error al cargar datos');
    }

    const n1 = totales.find(r =>
      r.comite_nombre.includes('N°1') ||
      r.comite_nombre.includes('Nº1') ||
      r.comite_nombre.includes('N1')
    )?.total || 0;

    const n2 = totales.find(r =>
      r.comite_nombre.includes('N°2') ||
      r.comite_nombre.includes('Nº2') ||
      r.comite_nombre.includes('N2')
    )?.total || 0;

    db.all(queryEvolucion, [], (err2, evolucion) => {
      if (err2) {
        console.error('Error evolucion:', err2);
        return res.status(500).send('Error al cargar evolución');
      }

      const dias = [];
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        dias.push(fecha.toISOString().split('T')[0]);
      }

      const evoN1 = dias.map(dia => {
        const registro = evolucion.find(e =>
          (e.comite_nombre.includes('N°1') || e.comite_nombre.includes('Nº1') || e.comite_nombre.includes('N1'))
          && e.dia === dia
        );
        return registro? registro.cantidad_dia : 0;
      });

      const evoN2 = dias.map(dia => {
        const registro = evolucion.find(e =>
          (e.comite_nombre.includes('N°2') || e.comite_nombre.includes('Nº2') || e.comite_nombre.includes('N2'))
          && e.dia === dia
        );
        return registro? registro.cantidad_dia : 0;
      });

      for (let i = 1; i < evoN1.length; i++) {
        evoN1[i] += evoN1[i-1];
        evoN2[i] += evoN2[i-1];
      }

      fs.readFile(__dirname + '/ranking-comites.html', 'utf8', (err, html) => {
        if (err) {
          console.error('Error leyendo HTML:', err);
          return res.status(500).send('No se encuentra ranking-comites.html');
        }

        html = html.replace(/const datos = \{[\s\S]*?\};/, `const datos = {
      comite1: {
        total: ${n1},
        evolucion: [${evoN1.join(', ')}]
      },
      comite2: {
        total: ${n2},
        evolucion: [${evoN2.join(', ')}]
      }
    };`);

        res.send(html);
      });
    });
  });
});
// FIN PARTE 1
// =========================
// RUTA GESTIÓN AFILIADOS
// =========================
app.get('/afiliados', requireLogin, (req, res) => {
  const buscar = req.query.buscar || '';
  let query = "SELECT * FROM afiliados";
  let params = [];

  if (buscar) {
    query += " WHERE cedula LIKE? OR nombres_apellido LIKE?";
    params = [`%${buscar}%`, `%${buscar}%`];
  }

  query += " ORDER BY fecha DESC LIMIT 100";

  db.all(query, params, (err, rows) => {
    const tabla = rows? rows.map(r => `
      <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
        <td class="px-4 py-3 font-mono">${r.cedula}</td>
        <td class="px-4 py-3">${r.nombres_apellido}</td>
        <td class="px-4 py-3">${r.comite_nombre}</td>
        <td class="px-4 py-3">${r.mesa}</td>
        <td class="px-4 py-3">${r.distrito_nombre}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${r.fecha}</td>
        <td class="px-4 py-3">
          <button onclick="eliminarAfiliado('${r.cedula}')" class="text-red-600 hover:text-red-800 font-bold">🗑</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">Sin registros</td></tr>';

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Afiliados - Panel</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap" rel="stylesheet">
        <style>
          * { font-family: 'Inter', sans-serif; }
          body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
.glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
        </style>
      </head>
      <body>
        <div class="min-h-screen p-4 md:p-6">
          <div class="glass rounded-2xl p-6 mb-6 shadow-2xl">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h1 class="text-3xl font-black text-gray-800">Gestión de Afiliados</h1>
                <p class="text-gray-600">Total: ${rows?.length || 0} registros</p>
              </div>
              <div class="flex gap-3">
                <a href="/export/excel" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm">
                  📊 Exportar Excel
                </a>
                <a href="/panel" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                  ← Volver
                </a>
              </div>
            </div>

            <form method="GET" action="/afiliados" class="mb-6">
              <div class="flex gap-3">
                <input type="text" name="buscar" value="${buscar}" placeholder="Buscar por cédula o nombre..."
                       class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none">
                <button type="submit" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                  🔍 Buscar
                </button>
                ${buscar? '<a href="/afiliados" class="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold">Limpiar</a>' : ''}
              </div>
            </form>

            <div class="mb-6 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h3 class="text-xl font-bold mb-4">📂 Carga Masiva desde Excel</h3>
              <p class="text-sm text-gray-600 mb-4">Subí un Excel con columnas: Cedula, Nombres_Apellido, Comite, Mesa, Distrito, Contacto</p>
              <form method="POST" action="/afiliados/upload" enctype="multipart/form-data" class="flex gap-3">
                <input type="file" name="excel" accept=".xlsx,.xls" required
                       class="flex-1 px-4 py-2 border-2 rounded-lg bg-white">
                <button type="submit" class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold">
                  Subir y Procesar
                </button>
              </form>
              <a href="/afiliados/plantilla" class="text-sm text-blue-600 hover:underline mt-2 inline-block">
                ⬇ Descargar plantilla Excel
              </a>
            </div>

            <form method="POST" action="/afiliados/add" class="mb-6 p-6 bg-gray-50 rounded-xl">
              <h3 class="text-xl font-bold mb-4">✍ Carga Manual</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input name="cedula" placeholder="Cédula" required class="px-4 py-2 border-2 rounded-lg">
                <input name="nombres_apellido" placeholder="Nombres y Apellido" required class="px-4 py-2 border-2 rounded-lg">
                <input name="comite_nombre" placeholder="Comité" required class="px-4 py-2 border-2 rounded-lg">
                <input name="mesa" placeholder="Mesa" required class="px-4 py-2 border-2 rounded-lg">
                <input name="distrito_nombre" placeholder="Distrito/Local" required class="px-4 py-2 border-2 rounded-lg">
                <input name="contacto" placeholder="Contacto/WhatsApp" class="px-4 py-2 border-2 rounded-lg">
              </div>
              <button type="submit" class="mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold">
                Guardar Afiliado
              </button>
            </form>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-4 py-3 text-left">Cédula</th>
                    <th class="px-4 py-3 text-left">Nombre</th>
                    <th class="px-4 py-3 text-left">Comité</th>
                    <th class="px-4 py-3 text-left">Mesa</th>
                    <th class="px-4 py-3 text-left">Distrito</th>
                    <th class="px-4 py-3 text-left">Fecha</th>
                    <th class="px-4 py-3 text-left">Acción</th>
                  </tr>
                </thead>
                <tbody>${tabla}</tbody>
              </table>
            </div>
          </div>
        </div>

        <script>
          function eliminarAfiliado(cedula) {
            if(confirm('¿Eliminar afiliado ' + cedula + '?')) {
              fetch('/afiliados/delete/' + cedula, { method: 'DELETE' })
  .then(() => location.reload());
            }
          }
        </script>
      </body>
      </html>
    `);
  });
});

app.post('/afiliados/add', requireLogin, (req, res) => {
  const { cedula, nombres_apellido, comite_nombre, mesa, distrito_nombre, contacto } = req.body;

  db.run(`
    INSERT INTO afiliados (cedula, nombres_apellido, comite_nombre, mesa, distrito_nombre, contacto, fecha)
    VALUES (?,?,?,?,?,?, datetime('now'))
    ON CONFLICT(cedula) DO UPDATE SET
      nombres_apellido = excluded.nombres_apellido,
      comite_nombre = excluded.comite_nombre,
      mesa = excluded.mesa,
      distrito_nombre = excluded.distrito_nombre,
      contacto = excluded.contacto,
      fecha = excluded.fecha
  `, [cedula, nombres_apellido, comite_nombre, mesa, distrito_nombre, contacto || ''], (err) => {
    if (err) {
      console.log('Error:', err);
      return res.send('Error al guardar');
    }
    res.redirect('/afiliados');
  });
});

app.delete('/afiliados/delete/:cedula', requireLogin, (req, res) => {
  db.run("DELETE FROM afiliados WHERE cedula =?", [req.params.cedula], (err) => {
    if (err) return res.status(500).send('Error');
    res.sendStatus(200);
  });
});

app.get('/afiliados/plantilla', requireLogin, (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Afiliados');

  sheet.columns = [
    { header: 'Cedula', key: 'cedula', width: 15 },
    { header: 'Nombres_Apellido', key: 'nombres_apellido', width: 35 },
    { header: 'Comite', key: 'comite_nombre', width: 25 },
    { header: 'Mesa', key: 'mesa', width: 10 },
    { header: 'Distrito', key: 'distrito_nombre', width: 25 },
    { header: 'Contacto', key: 'contacto', width: 20 }
  ];

  sheet.addRow(['1234567', 'Juan Perez', 'J. A. SALDIVAR N°1', '5', 'Itá', '0981123456']);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_afiliados.xlsx');
  workbook.xlsx.write(res).then(() => res.end());
});

app.post('/afiliados/upload', requireLogin, upload.single('excel'), async (req, res) => {
  if (!req.file) return res.status(400).send('No se subio archivo');

  let insertados = 0;
  let errores = 0;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.getWorksheet(1);

    const promesas = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const cedula = row.getCell(1).value?.toString();
      const nombres = row.getCell(2).value?.toString();
      const comite = row.getCell(3).value?.toString();
      const mesa = row.getCell(4).value?.toString();
      const distrito = row.getCell(5).value?.toString();
      const contacto = row.getCell(6).value?.toString() || '';

      if (cedula && nombres) {
        promesas.push(new Promise((resolve) => {
          db.run(`
            INSERT INTO afiliados (cedula, nombres_apellido, comite_nombre, mesa, distrito_nombre, contacto, fecha)
            VALUES (?,?,?,?,?,?, datetime('now'))
            ON CONFLICT(cedula) DO UPDATE SET
              nombres_apellido = excluded.nombres_apellido,
              comite_nombre = excluded.comite_nombre,
              mesa = excluded.mesa,
              distrito_nombre = excluded.distrito_nombre,
              contacto = excluded.contacto,
              fecha = excluded.fecha
          `, [cedula, nombres, comite, mesa, distrito, contacto], (err) => {
            if (err) errores++;
            else insertados++;
            resolve();
          });
        }));
      }
    });

    await Promise.all(promesas);

    res.send(`
      <script>
        alert('Carga completada: ${insertados} registros procesados, ${errores} errores');
        window.location.href = '/afiliados';
      </script>
    `);
  } catch (err) {
    console.error('Error procesando Excel:', err.message);
    res.status(500).send('Error al procesar Excel');
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

// =========================
// EXPORT EXCEL
// =========================
app.get('/export/excel', requireLogin, async (req, res) => {
  const workbook = new ExcelJS.Workbook();

  const volSheet = workbook.addWorksheet('Voluntarios');
  volSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Contacto', key: 'contacto', width: 20 },
    { header: 'Fecha', key: 'fecha', width: 20 }
  ];

  const simSheet = workbook.addWorksheet('Simpatizantes');
  simSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Barrio', key: 'barrio', width: 20 },
    { header: 'Contacto', key: 'contacto', width: 20 },
    { header: 'Fecha', key: 'fecha', width: 20 }
  ];

  const afiSheet = workbook.addWorksheet('Afiliados');
  afiSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Cédula', key: 'cedula', width: 15 },
    { header: 'Nombres y Apellido', key: 'nombres_apellido', width: 35 },
    { header: 'Comité', key: 'comite_nombre', width: 25 },
    { header: 'Mesa', key: 'mesa', width: 10 },
    { header: 'Distrito', key: 'distrito_nombre', width: 25 },
    { header: 'Contacto', key: 'contacto', width: 20 },
    { header: 'Fecha', key: 'fecha', width: 20 }
  ];

  db.all("SELECT * FROM voluntarios", (err, rows) => {
    rows.forEach(row => volSheet.addRow(row));
    db.all("SELECT * FROM simpatizantes", (err, rows) => {
      rows.forEach(row => simSheet.addRow(row));
      db.all("SELECT * FROM afiliados", (err, rows) => {
        rows.forEach(row => afiSheet.addRow(row));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=renzo_datos.xlsx');
        workbook.xlsx.write(res).then(() => res.end());
      });
    });
  });
});

// =========================
// EXPORT PDF
// =========================
app.get('/export/pdf', requireLogin, (req, res) => {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=renzo_datos.pdf');
  doc.pipe(res);

  doc.fontSize(20).text('Reporte Renzo Benítez', { align: 'center' });
  doc.moveDown();

  db.all("SELECT COUNT(*) as total FROM voluntarios", (err, vol) => {
    db.all("SELECT COUNT(*) as total FROM simpatizantes", (err, sim) => {
      db.all("SELECT COUNT(*) as total FROM afiliados", (err, afi) => {
        doc.fontSize(14).text(`Voluntarios: ${vol[0]?.total || 0}`);
        doc.text(`Simpatizantes: ${sim[0]?.total || 0}`);
        doc.text(`Afiliados: ${afi[0]?.total || 0}`);
        doc.end();
      });
    });
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send('El archivo supera el limite de 5MB');
    }
    return res.status(400).send(`Error de carga: ${err.message}`);
  }

  if (err && err.message && err.message.includes('Solo se permiten archivos Excel')) {
    return res.status(400).send(err.message);
  }

  return next(err);
});

// =========================
// INICIAR SERVIDOR
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor web corriendo en http://localhost:${PORT}`);
  console.log(`📱 Panel: http://localhost:${PORT}/panel`);
  console.log(`🏆 Ranking: http://localhost:${PORT}/ranking`);
  console.log(`🗳️ Control Votantes: http://localhost:${PORT}/votantes`);
});
connectToWhatsApp({
  handleMessage,
  db,
  authDir: config.waAuthDir
});