const Database = require('better-sqlite3');
const db = new Database('./db/game.db');
db.prepare("UPDATE users SET role = 'admin' WHERE username = 'Oisann'").run();
console.log("Admin role set for Oisann.");
