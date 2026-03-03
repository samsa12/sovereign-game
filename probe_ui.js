const db = require('better-sqlite3')('db/game.db');
const http = require('http');

console.log("== ADMIN CHECK ==");
console.log(db.prepare("SELECT id, username, is_admin FROM users WHERE username = 'Oisann'").get());

console.log("\n== MESSAGES CHECK ==");
const nation = db.prepare("SELECT id FROM nations WHERE user_id = (SELECT id FROM users WHERE username = 'Oisann')").get();
if (nation) {
    const msgs = db.prepare(`
        SELECT m.*, 
            CASE WHEN m.to_nation_id = 0 THEN 0 
                    WHEN m.from_nation_id = ? THEN m.to_nation_id 
                    ELSE m.from_nation_id END as other_nation_id,
            CASE WHEN m.to_nation_id = 0 THEN 'GLOBAL CHAT' ELSE n.name END as other_name
        FROM messages m
        LEFT JOIN nations n ON 
            (CASE WHEN m.to_nation_id = 0 THEN NULL 
                    WHEN m.from_nation_id = ? THEN m.to_nation_id 
                    ELSE m.from_nation_id END) = n.id
        WHERE m.id IN (
            SELECT MAX(id) FROM messages 
            WHERE from_nation_id = ? OR to_nation_id = ? OR to_nation_id = 0
            GROUP BY CASE WHEN to_nation_id = 0 THEN 0 
                            WHEN from_nation_id = ? THEN to_nation_id 
                            ELSE from_nation_id END
        )
        ORDER BY (m.to_nation_id = 0) DESC, m.created_at DESC
    `).all(nation.id, nation.id, nation.id, nation.id, nation.id);
    console.log(msgs);
}

console.log("\n== FETCHING /api/market ==");
http.get('http://localhost:3000/api/market', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', raw.substring(0, 200)));
}).on('error', e => console.error("HTTP ERROR:", e));
