const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'game.db');
const backupPath = path.join(__dirname, 'db', 'sovereign.db');

const db = new Database(dbPath);

console.log('Restoring Infrastructure and Land Area from backup (db/sovereign.db)...');

try {
    // Attach the backup database
    db.exec(`ATTACH '${backupPath}' AS backup`);

    // Perform the update based on matching city names
    const result = db.prepare(`
        UPDATE cities 
        SET 
            infrastructure = (SELECT b.infrastructure FROM backup.cities b WHERE LOWER(b.name) = LOWER(cities.name)),
            land = (SELECT b.land FROM backup.cities b WHERE LOWER(b.name) = LOWER(cities.name))
        WHERE EXISTS (SELECT 1 FROM backup.cities b WHERE LOWER(b.name) = LOWER(cities.name))
    `).run();

    console.log(`Successfully restored stats for ${result.changes} cities.`);
} catch (err) {
    console.error('Error during restoration:', err);
} finally {
    db.close();
}
