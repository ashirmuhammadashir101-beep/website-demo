const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const DB_PATH = process.env.DB_PATH || 'data/db.sqlite';

function ensureDb(){
  const dir = path.dirname(DB_PATH);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
  const db = new Database(DB_PATH);
  const initSQL = fs.readFileSync(path.join(__dirname,'init_db.sql'),'utf8');
  db.exec(initSQL);
  db.close();
}

function getDb(){
  return new Database(DB_PATH);
}

module.exports = {ensureDb, getDb};