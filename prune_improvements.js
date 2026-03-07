const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'db', 'game.db'));

// Import modern data
const { GAME_DATA } = require('./game/data');

try {
    const cities = db.prepare('SELECT id, name FROM cities').all();
    let totalRemoved = 0;

    for (const city of cities) {
        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);

        for (const imp of imps) {
            const data = GAME_DATA.improvements[imp.improvement_type];
            if (!data) {
                // If improvement doesn't exist in data.js, remove it entirely
                const info = db.prepare('DELETE FROM city_improvements WHERE city_id = ? AND improvement_type = ?').run(city.id, imp.improvement_type);
                totalRemoved += imp.quantity;
                console.log(`Deleted unknown improvement ${imp.improvement_type} from ${city.name} (${imp.quantity} total).`);
                continue;
            }

            if (imp.quantity > data.maxPerCity) {
                const excess = imp.quantity - data.maxPerCity;
                db.prepare('UPDATE city_improvements SET quantity = ? WHERE city_id = ? AND improvement_type = ?')
                    .run(data.maxPerCity, city.id, imp.improvement_type);
                totalRemoved += excess;
                console.log(`Pruned ${excess}x ${imp.improvement_type} from ${city.name} (Now: ${data.maxPerCity}/${data.maxPerCity}).`);
            }
        }
    }
    console.log(`\nSuccess: Total of ${totalRemoved} excess improvements removed from the world.`);
} catch (err) {
    console.error('Pruning failed:', err.message);
} finally {
    db.close();
}
