const express = require('express');
const router = express.Router();
const {getDb} = require('../db');
const {authRequired} = require('../auth');

router.get('/questions', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id,title,choices FROM questions').all();
  db.close();
  res.json(rows.map(r => ({id: r.id, title: r.title, choices: JSON.parse(r.choices)})));
});

router.post('/attempt', authRequired, (req, res) => {
  const {answers} = req.body;
  const userId = req.user.id;
  const db = getDb();
  const payment = db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
  if (!payment || payment.status !== 'paid') {
    db.close();
    return res.status(402).json({error: 'entry fee not paid'});
  }
  const existing = db.prepare('SELECT id FROM attempts WHERE user_id = ?').get(userId);
  if (existing) {
    db.close();
    return res.status(400).json({error: 'already attempted'});
  }
  const questions = db.prepare('SELECT id,answer FROM questions').all();
  let correct = 0;
  for (const q of questions) {
    if (String(answers?.[q.id]) === String(q.answer)) correct += 1;
  }
  db.prepare('INSERT INTO attempts (user_id,answers,correct) VALUES (?,?,?)').run(userId, JSON.stringify(answers||{}), correct);
  if (correct === questions.length) {
    db.prepare('INSERT INTO winners (user_id,amount) VALUES (?,?)').run(userId, 2300000);
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(2300000, userId);
  }
  db.close();
  res.json({correct, total: questions.length});
});

module.exports = router;
