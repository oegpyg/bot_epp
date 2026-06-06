function auth(req, res, next) {
  if (req.session && req.session.logged) return next()
  return res.redirect('/login')
}

module.exports = auth