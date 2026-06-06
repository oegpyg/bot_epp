const fs = require('fs');

function loadEnvFile(filePath = '.env') {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) return;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['\"]|['\"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function loadConfig() {
  loadEnvFile();

  const config = {
    port: Number(process.env.PORT || 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET,
    adminUser: process.env.ADMIN_USER,
    adminPass: process.env.ADMIN_PASS,
    waAuthDir: process.env.WA_AUTH_DIR || 'auth_info_baileys'
  };

  const required = [
    ['SESSION_SECRET', config.sessionSecret],
    ['ADMIN_USER', config.adminUser],
    ['ADMIN_PASS', config.adminPass]
  ].filter(([, value]) => !value);

  if (required.length > 0) {
    const missing = required.map(([name]) => name).join(', ');
    throw new Error(`Faltan variables requeridas: ${missing}`);
  }

  return config;
}

module.exports = { loadConfig };
