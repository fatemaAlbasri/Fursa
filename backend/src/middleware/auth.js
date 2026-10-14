const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing.');
}

// Creates the token sent to the frontend after sign up / sign in
function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Use on any route that needs a logged-in user.
// Reads "Authorization: Bearer <token>" and puts { id, role } on req.user
function requireAuth(req, res, next) {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please sign in' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}

// Use after requireAuth, e.g. router.post('/', requireAuth, requireRole('employer'), ...)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have access to this' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
