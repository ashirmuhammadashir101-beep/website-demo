const jwt = require('jsonwebtoken');
const {getDb} = require('./db');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if(!authHeader) return res.status(401).json({error:'Authorization header required'});
  const token = authHeader.split(' ')[1];
  if(!token) return res.status(401).json({error:'Token missing'});
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id,name,email,is_admin,balance FROM users WHERE id = ?').get(payload.id);
    db.close();
    if(!user) return res.status(401).json({error:'Invalid token'});
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({error:'Invalid token'});
  }
}

function adminRequired(req, res, next) {
  if(!req.user || !req.user.is_admin) return res.status(403).json({error:'Admin access required'});
  next();
}

module.exports = {authRequired, adminRequired};