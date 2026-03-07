const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'db', 'game.db'));

try {
    db.prepare('UPDATE users SET is_admin = 0 WHERE username = ?').run('YutopiaUser');
    console.log('Successfully demoted YutopiaUser');

    // Safety check: ensure Oisann is admin
    db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run('Oisann');
    console.log('Ensured Oisann is admin');
} catch (err) {
    console.error('Error updating DB:', err.message);
} finally {
    db.close();
}
