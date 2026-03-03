/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — Admin Routes
   Admin-only API endpoints (requires is_admin = 1)
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

// Admin middleware: check is_admin
function adminMiddleware(req, res, next) {
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.userId);
    if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
}

router.use(authMiddleware);
router.use(adminMiddleware);

// ─── Server Overview ───
router.get('/overview', (req, res) => {
    try {
        const players = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
        const nations = db.prepare('SELECT COUNT(*) as c FROM nations').get().c;
        const activeWars = db.prepare("SELECT COUNT(*) as c FROM wars WHERE status = 'active'").get().c;
        const alliances = db.prepare('SELECT COUNT(*) as c FROM alliances').get().c;
        const currentTurn = parseInt(db.prepare("SELECT value FROM game_state WHERE key = 'current_turn'").get()?.value || '1');
        const banned = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_banned = 1').get().c;

        const topNations = db.prepare('SELECT id, name, score, population, military_strength FROM nations ORDER BY score DESC LIMIT 10').all();
        const recentNews = db.prepare('SELECT * FROM news ORDER BY created_at DESC LIMIT 10').all();

        res.json({ players, nations, activeWars, alliances, currentTurn, banned, topNations, recentNews });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Download Backup ───
router.get('/backup', (req, res) => {
    try {
        const path = require('path');
        const dbPath = path.join(__dirname, '..', 'db', 'game.db');
        // Set headers so browser prompts to download
        res.download(dbPath, `sovereign_backup_${Date.now()}.sqlite3`);
    } catch (err) { res.status(500).json({ error: 'Server error during backup.' }); }
});

// ─── List all users ───
router.get('/users', (req, res) => {
    try {
        const users = db.prepare(`SELECT u.id, u.username, u.email, u.is_admin, u.is_banned, u.created_at, u.last_login,
            n.id as nation_id, n.name as nation_name, n.score
            FROM users u LEFT JOIN nations n ON u.id = n.user_id ORDER BY u.id`).all();
        res.json({ users });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Ban / Unban ───
router.post('/ban/:userId', (req, res) => {
    try {
        const { ban } = req.body; // true = ban, false = unban
        const targetId = parseInt(req.params.userId);
        if (targetId === req.userId) return res.status(400).json({ error: 'Cannot ban yourself.' });

        db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(ban ? 1 : 0, targetId);
        const user = db.prepare('SELECT username FROM users WHERE id = ?').get(targetId);

        if (ban) {
            db.prepare('INSERT INTO news (icon, headline, body, turn) VALUES (?, ?, ?, ?)').run(
                '🔨', `Player Banned: ${user?.username || 'Unknown'}`, 'Banned by admin for rule violations.',
                parseInt(db.prepare("SELECT value FROM game_state WHERE key = 'current_turn'").get()?.value || '1')
            );
        }

        res.json({ success: true, message: ban ? 'User banned.' : 'User unbanned.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Edit nation resources/stats ───
router.post('/nation/:id/edit', (req, res) => {
    try {
        const { money, food, steel, oil, aluminum, munitions, uranium, rare, approval, stability } = req.body;
        const nationId = parseInt(req.params.id);
        const nation = db.prepare('SELECT id FROM nations WHERE id = ?').get(nationId);
        if (!nation) return res.status(404).json({ error: 'Nation not found.' });

        const updates = [];
        const values = [];
        if (money !== undefined) { updates.push('money = ?'); values.push(money); }
        if (food !== undefined) { updates.push('food = ?'); values.push(food); }
        if (steel !== undefined) { updates.push('steel = ?'); values.push(steel); }
        if (oil !== undefined) { updates.push('oil = ?'); values.push(oil); }
        if (aluminum !== undefined) { updates.push('aluminum = ?'); values.push(aluminum); }
        if (munitions !== undefined) { updates.push('munitions = ?'); values.push(munitions); }
        if (uranium !== undefined) { updates.push('uranium = ?'); values.push(uranium); }
        if (rare !== undefined) { updates.push('rare = ?'); values.push(rare); }
        if (approval !== undefined) { updates.push('approval = ?'); values.push(approval); }
        if (stability !== undefined) { updates.push('stability = ?'); values.push(stability); }

        if (updates.length > 0) {
            values.push(nationId);
            db.prepare(`UPDATE nations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }

        res.json({ success: true, message: 'Nation updated.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Delete nation ───
router.delete('/nation/:id', (req, res) => {
    try {
        const nationId = parseInt(req.params.id);
        const nation = db.prepare('SELECT name, user_id FROM nations WHERE id = ?').get(nationId);
        if (!nation) return res.status(404).json({ error: 'Nation not found.' });

        // Cascade: cities, improvements, military, alliance membership
        const cities = db.prepare('SELECT id FROM cities WHERE nation_id = ?').all(nationId);
        for (const c of cities) db.prepare('DELETE FROM city_improvements WHERE city_id = ?').run(c.id);
        db.prepare('DELETE FROM cities WHERE nation_id = ?').run(nationId);
        db.prepare('DELETE FROM military WHERE nation_id = ?').run(nationId);
        db.prepare('DELETE FROM alliance_members WHERE nation_id = ?').run(nationId);
        db.prepare("UPDATE wars SET status = 'cancelled' WHERE attacker_id = ? OR defender_id = ?").run(nationId, nationId);
        db.prepare('DELETE FROM nations WHERE id = ?').run(nationId);

        db.prepare('INSERT INTO news (icon, headline, body, turn) VALUES (?, ?, ?, ?)').run(
            '💀', `Nation Dissolved: ${nation.name}`, 'Removed by admin.',
            parseInt(db.prepare("SELECT value FROM game_state WHERE key = 'current_turn'").get()?.value || '1')
        );

        res.json({ success: true, message: `Nation ${nation.name} deleted.` });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Force tick ───
router.post('/tick', (req, res) => {
    try {
        const { processTick } = require('../game/tick');
        processTick(db);
        res.json({ success: true, message: 'Tick processed.' });
    } catch (err) {
        console.error('[ADMIN] Force tick error:', err);
        res.status(500).json({ error: 'Tick failed: ' + err.message });
    }
});

// ─── Broadcast system message ───
router.post('/broadcast', (req, res) => {
    try {
        const { headline, body } = req.body;
        if (!headline) return res.status(400).json({ error: 'Headline required.' });

        const turn = parseInt(db.prepare("SELECT value FROM game_state WHERE key = 'current_turn'").get()?.value || '1');
        db.prepare('INSERT INTO news (icon, headline, body, turn) VALUES (?, ?, ?, ?)').run('📢', headline, body || '', turn);

        // Send to all connected players
        if (global.wss) {
            const msg = JSON.stringify({ type: 'system_broadcast', headline, body });
            global.wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
        }

        res.json({ success: true, message: 'Broadcast sent.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Promote / Demote ───
router.post('/promote', (req, res) => {
    try {
        const { userId, promote } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID required.' });
        if (userId === req.userId) return res.status(400).json({ error: 'Cannot change your own admin status.' });

        db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(promote ? 1 : 0, userId);
        res.json({ success: true, message: promote ? 'User promoted to admin.' : 'Admin privileges removed.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Reset Nation ───
router.post('/reset-nation', (req, res) => {
    try {
        const { userId } = req.body;
        const nation = db.prepare('SELECT id FROM nations WHERE user_id = ?').get(userId);
        if (!nation) return res.status(404).json({ error: 'User has no nation to reset.' });

        db.transaction(() => {
            db.prepare('DELETE FROM city_improvements WHERE city_id IN (SELECT id FROM cities WHERE nation_id = ?)').run(nation.id);
            db.prepare('DELETE FROM cities WHERE nation_id = ?').run(nation.id);
            db.prepare('DELETE FROM military WHERE nation_id = ?').run(nation.id);
            db.prepare('DELETE FROM trade_offers WHERE nation_id = ?').run(nation.id);
            db.prepare('DELETE FROM treaties WHERE nation_a_id = ? OR nation_b_id = ?').run(nation.id, nation.id);
            db.prepare('DELETE FROM wars WHERE attacker_id = ? OR defender_id = ?').run(nation.id, nation.id);
            db.prepare('DELETE FROM spy_missions WHERE nation_id = ? OR target_nation_id = ?').run(nation.id, nation.id);
            db.prepare('DELETE FROM nations WHERE id = ?').run(nation.id);
        })();

        res.json({ success: true, message: 'Nation wiped. User can create a new one.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Delete User ───
router.delete('/delete-user', (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID required.' });
        if (userId === req.userId) return res.status(400).json({ error: 'Cannot delete yourself.' });

        const nation = db.prepare('SELECT id FROM nations WHERE user_id = ?').get(userId);

        db.transaction(() => {
            if (nation) {
                db.prepare('DELETE FROM city_improvements WHERE city_id IN (SELECT id FROM cities WHERE nation_id = ?)').run(nation.id);
                db.prepare('DELETE FROM cities WHERE nation_id = ?').run(nation.id);
                db.prepare('DELETE FROM military WHERE nation_id = ?').run(nation.id);
                db.prepare('DELETE FROM trade_offers WHERE nation_id = ?').run(nation.id);
                db.prepare('DELETE FROM treaties WHERE nation_a_id = ? OR nation_b_id = ?').run(nation.id, nation.id);
                db.prepare('DELETE FROM wars WHERE attacker_id = ? OR defender_id = ?').run(nation.id, nation.id);
                db.prepare('DELETE FROM spy_missions WHERE nation_id = ? OR target_nation_id = ?').run(nation.id, nation.id);
                db.prepare('DELETE FROM nations WHERE id = ?').run(nation.id);
            }
            db.prepare('DELETE FROM tokens WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM messages WHERE from_nation_id IN (SELECT id FROM nations WHERE user_id = ?) OR to_nation_id IN (SELECT id FROM nations WHERE user_id = ?)').run(userId, userId);
            db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        })();

        res.json({ success: true, message: 'User and all data permanently deleted.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Grant Resources ───
router.post('/grant-resources', (req, res) => {
    try {
        const { nationId, resource, amount } = req.body;
        if (!nationId || !resource || !amount) return res.status(400).json({ error: 'nationId, resource, and amount required.' });

        const nation = db.prepare('SELECT id FROM nations WHERE id = ?').get(nationId);
        if (!nation) return res.status(404).json({ error: 'Nation not found.' });

        const validResources = ['money', 'food', 'steel', 'oil', 'uranium', 'rare', 'consumer_goods', 'tech_points'];
        if (!validResources.includes(resource)) return res.status(400).json({ error: 'Invalid resource.' });

        db.prepare(`UPDATE nations SET ${resource} = ${resource} + ? WHERE id = ?`).run(Math.floor(amount), nationId);
        res.json({ success: true, message: `Granted ${Math.floor(amount)} ${resource} to nation #${nationId}.` });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── SMTP Settings ───
router.get('/settings', (req, res) => {
    try {
        const rows = db.prepare('SELECT key_name, key_value FROM server_settings').all();
        const settings = {};
        rows.forEach(r => settings[r.key_name] = r.key_value);
        res.json({ settings });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/settings', (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'Invalid payload.' });

        const stmt = db.prepare('INSERT OR REPLACE INTO server_settings (key_name, key_value) VALUES (?, ?)');
        db.transaction(() => {
            for (const [key, val] of Object.entries(settings)) {
                stmt.run(key, val);
            }
        })();
        res.json({ success: true, message: 'Settings saved.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/test-email', async (req, res) => {
    try {
        const { to } = req.body;
        if (!to) return res.status(400).json({ error: 'Recipient email required.' });

        if (!global.isSmtpConfigured()) {
            return res.status(400).json({ error: 'SMTP is not configured.' });
        }

        const mailer = global.getMailer();
        if (!mailer) return res.status(400).json({ error: 'Failed to create mailer.' });

        await mailer.sendMail({
            from: global.getSmtpFrom(),
            to,
            subject: 'SOVEREIGN — Test Email',
            text: 'If you can read this, your SMTP configuration is working correctly! 🎉'
        });

        res.json({ success: true, message: 'Test email sent.' });
    } catch (err) { res.status(500).json({ error: 'Failed to send: ' + err.message }); }
});

module.exports = router;
