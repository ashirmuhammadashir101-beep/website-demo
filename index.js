require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const authRoutes = require('./routes/auth');
const contestRoutes = require('./routes/contest');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');
const {ensureDb} = require('./db');

const app = express();
app.use(morgan('dev'));
app.use(express.json());

ensureDb();

app.use('/api/auth', authRoutes);
app.use('/api/contest', contestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));