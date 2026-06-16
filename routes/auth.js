const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {getDb} = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const {authRequired} = require('../auth');

router.post('/register', async (req, res) => {
  const {name, email, password} = req.body;
  if (!email || !password) return res.status(400).json({error: 'email and password required'});
  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    db.close();
    return res.status(400).json({error: 'user exists'});
  }
  const hash = await bcrypt.hash(password, 10);
  const info = db.prepare('INSERT INTO users (name,email,password,is_admin,balance) VALUES (?,?,?,?,?)').run(name||'', email, hash, 0, 0);
  const user = db.prepare('SELECT id,name,email,is_admin,balance FROM users WHERE id = ?').get(info.lastInsertRowid);
  db.close();
  const token = jwt.sign({id: user.id, is_admin: user.is_admin}, JWT_SECRET);
  res.json({user, token});
});

router.post('/login', async (req, res) => {
  const {email, password} = req.body;
  if (!email || !password) return res.status(400).json({error: 'email and password required'});
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    db.close();
    return res.status(400).json({error: 'invalid credentials'});
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    db.close();
    return res.status(400).json({error: 'invalid credentials'});
  }
  const result = {id: user.id, name: user.name, email: user.email, is_admin: user.is_admin, balance: user.balance};
  const token = jwt.sign({id: user.id, is_admin: user.is_admin}, JWT_SECRET);
  db.close();
  res.json({user: result, token});
});

router.get('/me', authRequired, (req, res) => {
  res.json({user: req.user});
});

module.exports = router;
