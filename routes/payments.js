const express = require('express');
const router = express.Router();
const {getDb} = require('../db');
const {authRequired} = require('../auth');

router.post('/record', authRequired, (req, res) => {
  const {amount, provider, provider_ref, status} = req.body;
  const db = getDb();
  db.prepare('INSERT INTO payments (user_id,amount,provider,provider_ref,status) VALUES (?,?,?,?,?)')
    .run(req.user.id, amount || 4700, provider || 'opay', provider_ref || null, status || 'paid');
  db.close();
  res.json({ok: true});
});

router.get('/history', authRequired, (req, res) => {
  const db = getDb();
  const payments = db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const withdrawals = db.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const winners = db.prepare('SELECT * FROM winners WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  db.close();
  res.json({payments, withdrawals, winners});
});

router.post('/withdraw', authRequired, (req, res) => {
  const {amount} = req.body;
  const value = Number(amount);
  if (!value || value <= 0) return res.status(400).json({error: 'Invalid amount'});
  if (value > req.user.balance) return res.status(400).json({error: 'Insufficient balance'});
  const db = getDb();
  db.prepare('INSERT INTO withdrawals (user_id,amount,status) VALUES (?,?,?)').run(req.user.id, value, 'pending');
  db.close();
  res.json({ok: true});
});

router.post('/opay-webhook', (req, res) => {
  const {provider_ref, status} = req.body;
  if (!provider_ref) return res.status(400).end();
  const db = getDb();
  db.prepare('UPDATE payments SET status = ? WHERE provider_ref = ?').run(status, provider_ref);
  db.close();
  res.json({ok: true});
});

module.exports = router;
