// Simple in-memory limit per IP, 10 requests per hour.
// Resets when the server restarts; good enough to stop someone spamming a route.
function rateLimit(max, minutes) {
  const hits = new Map() 

  return (req, res, next) => {
    const now = Date.now()
    let entry = hits.get(req.ip)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + minutes * 60 * 1000 }
      hits.set(req.ip, entry)
    }
    entry.count++
    if (entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000))
      return res.status(429).json({ error: 'Too many tries, please wait a bit and try again' })
    }
    next()
  }
}

module.exports = { rateLimit }
