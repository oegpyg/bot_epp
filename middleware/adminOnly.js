function adminOnly(req, res, next) {
  if (req.session?.rol === 'admin') return next()
  return res.status(403).send('⛔ No autorizado')
}

module.exports = adminOnly