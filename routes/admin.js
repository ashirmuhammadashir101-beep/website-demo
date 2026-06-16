const express = require('express');
const router = express.Router();
const {getDb} = require('../db');
const {authRequired, adminRequired} = require('../auth');

router.get('/withdrawals', authRequired, adminRequired, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT w.*, u.name, u.email FROM withdrawals w JOIN users u ON u.id = w.user_id').all();
  db.close();
  res.json(rows);
});

router.post('/withdrawals/:id/approve', authRequired, adminRequired, (req, res) => {
  const id = req.params.id;
  const db = getDb();
  const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id);
  if (!withdrawal) {
    db.close();
    return res.status(404).json({error: 'not found'});
  }
  if (withdrawal.status !== 'pending') {
    db.close();
    return res.status(400).json({error: 'invalid status'});
  }
  db.prepare('UPDATE withdrawals SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?').run('paid', id);
  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(withdrawal.amount, withdrawal.user_id);
  db.close();
  res.json({ok: true});
});

router.get('/analytics', authRequired, adminRequired, (req, res) => {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const payments = db.prepare("SELECT COUNT(*) AS count, SUM(amount) AS total FROM payments WHERE status='paid'").get();
  const winners = db.prepare('SELECT COUNT(*) AS count FROM winners').get().count;
  db.close();
  res.json({totalUsers, payments, winners});
});

module.exports = router;
