const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'db', 'game.db'));

const users = db.prepare('SELECT id, username, is_admin FROM users').all();
console.log(JSON.stringify(users, null, 2));
