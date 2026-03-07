const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'db', 'game.db');
const db = new Database(dbPath);

console.log('Standardizing all cities to 100 Infrastructure and 100 Land Area...');

try {
    const result = db.prepare(`
        UPDATE cities 
        SET infrastructure = 100, land = 100
    `).run();

    console.log(`Successfully updated ${result.changes} cities.`);
} catch (err) {
    console.error('Error during standardization:', err);
} finally {
    db.close();
}
