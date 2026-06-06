function auth(req, res, next) {
  if (req.session && (req.session.loggedIn || req.session.logged)) return next()
  return res.redirect('/login')
}

module.exports = auth