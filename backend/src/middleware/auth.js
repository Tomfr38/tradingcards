const supabase = require('../db/supabase')

// Verifies the caller's Supabase session JWT and attaches req.userId.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }

  req.userId = data.user.id
  req.userEmail = data.user.email
  next()
}

module.exports = { requireAuth }
