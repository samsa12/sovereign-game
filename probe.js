const Database = require('better-sqlite3');
const db = new Database('./db/game.db');
console.log("GAME STATE ROWS:");
console.log(db.prepare("SELECT key, value FROM game_state WHERE key LIKE 'market_%' OR key LIKE 'pool_%'").all());
console.log("NATION ID 1:", db.prepare("SELECT * FROM nations WHERE id=1").get());
console.log("ALL MESSAGES:");
console.log(db.prepare("SELECT * FROM messages").all());
