/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — API Routes  (Phase 2 Rebalanced)
   All game action endpoints with rate limiting, anti-griefing,
   war cooldowns, NAP enforcement, trade caps, input sanitization
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { GAME_DATA } = require('../game/data');

// ═══════════════════════════════════════
// RATE LIMITER (in-memory)
// ═══════════════════════════════════════
const rateLimitMap = new Map();
const actionLogMap = new Map(); // tracks trades, messages, spy missions per user

function rateLimit(req, res, next) {
    const userId = req.userId;
    if (!userId) return next();
    const now = Date.now();
    const windowMs = 60_000;
    const max = GAME_DATA.balance.rateLimitPerMinute;

    let entry = rateLimitMap.get(userId);
    if (!entry || now - entry.start > windowMs) {
        entry = { start: now, count: 0 };
        rateLimitMap.set(userId, entry);
    }
    entry.count++;
    if (entry.count > max) {
        return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
    }
    next();
}

function checkActionLimit(userId, action, maxPerHour) {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const hourMs = 3_600_000;
    let entries = actionLogMap.get(key) || [];
    entries = entries.filter(t => now - t < hourMs);
    if (entries.length >= maxPerHour) return false;
    entries.push(now);
    actionLogMap.set(key, entries);
    return true;
}

// Input sanitization: strip HTML tags
function sanitize(str) {
    if (!str) return str;
    return String(str).replace(/<[^>]*>/g, '').trim();
}

// Safe resource column names (prevents SQL injection via dynamic column names)
const RESOURCE_COLUMNS = ['money', 'food', 'steel', 'oil', 'aluminum', 'munitions', 'uranium', 'rare', 'iron', 'bauxite'];
function safeResourceColumn(col) {
    if (!RESOURCE_COLUMNS.includes(col)) throw new Error(`Invalid resource column: ${col}`);
    return col;
}

// Validate that a value is a positive integer
function positiveInt(val) {
    const n = parseInt(val);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

// All API routes require authentication + rate limiting
router.use(authMiddleware);
router.use(rateLimit);

// ═══════════════════════════════════════
// NATION
// ═══════════════════════════════════════

router.post('/nation', (req, res) => {
    try {
        const existing = db.prepare('SELECT id FROM nations WHERE user_id = ?').get(req.userId);
        if (existing) return res.status(409).json({ error: 'You already have a nation.' });

        let { name, leaderName, motto, currencyName, government, continent, flag } = req.body;
        name = sanitize(name);
        leaderName = sanitize(leaderName);
        motto = sanitize(motto);
        currencyName = sanitize(currencyName);

        if (!name || !leaderName) return res.status(400).json({ error: 'Name and leader name required.' });
        if (name.length < 3 || name.length > 50) return res.status(400).json({ error: 'Nation name must be 3-50 chars.' });
        if (!GAME_DATA.governments[government]) return res.status(400).json({ error: 'Invalid government.' });
        if (!GAME_DATA.continents[continent]) return res.status(400).json({ error: 'Invalid continent.' });

        const dupName = db.prepare('SELECT id FROM nations WHERE name = ?').get(name);
        if (dupName) return res.status(409).json({ error: 'Nation name already taken.' });

        const currentTurn = getCurrentTurn();
        const beigeUntil = currentTurn + 168;

        const result = db.prepare(`INSERT INTO nations 
            (user_id, name, leader_name, motto, currency_name, government, continent, 
             flag_pattern, flag_color1, flag_color2, flag_color3, beige_until)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
            req.userId, name, leaderName, motto || '', currencyName || 'Dollar',
            government, continent,
            flag?.pattern || 'horizontal_3',
            flag?.colors?.[0] || '#1a5276',
            flag?.colors?.[1] || '#c0392b',
            flag?.colors?.[2] || '#f1c40f',
            beigeUntil
        );

        const nationId = result.lastInsertRowid;

        const terrains = ['plains', 'mountain', 'forest', 'desert', 'coastal', 'urban'];
        const terrain = terrains[Math.floor(Math.random() * terrains.length)];
        db.prepare(`INSERT INTO cities (nation_id, name, is_capital, terrain, population, infrastructure, land)
            VALUES (?, ?, 1, ?, 8000, 100, 250)`)
            .run(nationId, name.split(' ').pop() + ' City', terrain);

        const cityId = db.prepare('SELECT id FROM cities WHERE nation_id = ? AND is_capital = 1').get(nationId).id;

        const startingImps = { farm: 3, coal_plant: 1, iron_mine: 1, police_station: 1, barracks: 1, bank: 1, supermarket: 1 };
        const impStmt = db.prepare('INSERT INTO city_improvements (city_id, improvement_type, quantity) VALUES (?, ?, ?)');
        for (const [imp, qty] of Object.entries(startingImps)) impStmt.run(cityId, imp, qty);

        const milStmt = db.prepare('INSERT INTO military (nation_id, unit_type, quantity) VALUES (?, ?, ?)');
        milStmt.run(nationId, 'infantry', 5000);

        db.prepare('INSERT INTO news (icon, headline, body, turn) VALUES (?, ?, ?, ?)').run(
            '🏛️', `New Nation: ${name}`, `${leaderName} has established ${name} on the world stage.`, currentTurn
        );

        recalcNationStats(nationId);
        res.status(201).json({ nationId, message: 'Nation created!' });
    } catch (err) {
        console.error('[API] Create nation error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.get('/nation', (req, res) => {
    try {
        const nation = db.prepare('SELECT * FROM nations WHERE user_id = ?').get(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation found. Create one first.' });

        const cities = db.prepare('SELECT * FROM cities WHERE nation_id = ?').all(nation.id);
        for (const city of cities) {
            city.improvements = {};
            const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);
            for (const imp of imps) city.improvements[imp.improvement_type] = imp.quantity;
        }

        const military = {};
        const milRows = db.prepare('SELECT unit_type, quantity FROM military WHERE nation_id = ?').all(nation.id);
        for (const m of milRows) military[m.unit_type] = m.quantity;

        const treaties = db.prepare(`SELECT t.*, 
            na.name as nation_a_name, nb.name as nation_b_name
            FROM treaties t 
            JOIN nations na ON t.nation_a_id = na.id
            JOIN nations nb ON t.nation_b_id = nb.id
            WHERE t.status = 'active' AND (t.nation_a_id = ? OR t.nation_b_id = ?)`).all(nation.id, nation.id);

        const wars = db.prepare(`SELECT w.*, 
            na.name as attacker_name, nd.name as defender_name
            FROM wars w 
            JOIN nations na ON w.attacker_id = na.id
            JOIN nations nd ON w.defender_id = nd.id
            WHERE w.status = 'active' AND (w.attacker_id = ? OR w.defender_id = ?)`).all(nation.id, nation.id);

        const allianceInfo = nation.alliance_id ? getFullAlliance(nation.alliance_id) : null;
        const currentTurn = getCurrentTurn();

        // Income breakdown from last tick
        const breakdownRow = db.prepare('SELECT value FROM game_state WHERE key = ?').get(`income_${nation.id}`);
        const incomeBreakdown = breakdownRow ? JSON.parse(breakdownRow.value) : null;

        const unreadMessages = db.prepare('SELECT COUNT(*) as c FROM messages WHERE to_nation_id = ? AND is_read = 0').get(nation.id).c;

        res.json({
            nation: formatNation(nation),
            cities, military, treaties, wars,
            alliance: allianceInfo,
            currentTurn,
            isBeige: nation.beige_until > currentTurn,
            incomeBreakdown,
            unreadMessages
        });
    } catch (err) {
        console.error('[API] Get nation error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.get('/nation/:id', (req, res) => {
    try {
        const nation = db.prepare('SELECT * FROM nations WHERE id = ?').get(req.params.id);
        if (!nation) return res.status(404).json({ error: 'Nation not found.' });

        const cities = db.prepare('SELECT name, is_capital, population, terrain FROM cities WHERE nation_id = ?').all(nation.id);
        const allianceName = nation.alliance_id ?
            db.prepare('SELECT name FROM alliances WHERE id = ?').get(nation.alliance_id)?.name : null;

        res.json({
            nation: formatNation(nation),
            cities,
            militaryStrength: nation.military_strength,
            alliance: allianceName
        });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ═══════════════════════════════════════
// NATION CUSTOMIZATION
// ═══════════════════════════════════════

router.post('/nation/customize', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const { bio, leaderTitle, accentColor, bonusResource, leaderPortrait, nationalAnthem, name, leaderName, motto, flagColor1, flagColor2, flagColor3, flagPattern } = req.body;
        const updates = [];
        const values = [];

        if (name !== undefined) {
            const cleanName = sanitize(name).substring(0, 40);
            if (cleanName) { updates.push('name = ?'); values.push(cleanName); }
        }
        if (leaderName !== undefined) {
            const cleanLeader = sanitize(leaderName).substring(0, 40);
            if (cleanLeader) { updates.push('leader_name = ?'); values.push(cleanLeader); }
        }
        if (motto !== undefined) {
            const cleanMotto = sanitize(motto).substring(0, 60);
            updates.push('motto = ?'); values.push(cleanMotto);
        }
        if (bio !== undefined) {
            const cleanBio = sanitize(bio).substring(0, 500);
            updates.push('bio = ?');
            values.push(cleanBio);
        }
        if (leaderTitle !== undefined) {
            const cleanTitle = sanitize(leaderTitle).substring(0, 50);
            updates.push('leader_title = ?');
            values.push(cleanTitle || 'Leader');
        }
        if (accentColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
            updates.push('accent_color = ?');
            values.push(accentColor);
        }
        if (flagColor1 !== undefined && /^#[0-9a-fA-F]{6}$/.test(flagColor1)) {
            updates.push('flag_color1 = ?'); values.push(flagColor1);
        }
        if (flagColor2 !== undefined && /^#[0-9a-fA-F]{6}$/.test(flagColor2)) {
            updates.push('flag_color2 = ?'); values.push(flagColor2);
        }
        if (flagColor3 !== undefined && /^#[0-9a-fA-F]{6}$/.test(flagColor3)) {
            updates.push('flag_color3 = ?'); values.push(flagColor3);
        }
        if (bonusResource !== undefined && GAME_DATA.bonusResources[bonusResource]) {
            updates.push('bonus_resource = ?');
            values.push(bonusResource);
        }
        if (flagPattern !== undefined) {
            const cleanPattern = sanitize(flagPattern).substring(0, 30);
            updates.push('flag_pattern = ?');
            values.push(cleanPattern);
        }
        if (leaderPortrait !== undefined) {
            const cleanPortrait = sanitize(leaderPortrait).substring(0, 255);
            updates.push('leader_portrait = ?');
            values.push(cleanPortrait);
        }
        if (nationalAnthem !== undefined) {
            const cleanAnthem = sanitize(nationalAnthem).substring(0, 255);
            updates.push('national_anthem = ?');
            values.push(cleanAnthem);
        }

        if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

        values.push(nation.id);
        db.prepare(`UPDATE nations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        res.json({ message: 'Nation customization updated!' });
    } catch (err) {
        console.error('[API] Customize nation error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ═══════════════════════════════════════
// CITIES & IMPROVEMENTS
// ═══════════════════════════════════════

router.post('/city/build', (req, res) => {
    try {
        const { cityName } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const cityCount = db.prepare('SELECT COUNT(*) as c FROM cities WHERE nation_id = ?').get(nation.id).c;
        if (cityCount >= GAME_DATA.balance.maxCities) return res.status(400).json({ error: 'Max cities reached.' });

        // Escalating cost
        const cost = (cityCount + 1) * GAME_DATA.balance.newCityBaseCost;
        if (nation.money < cost) return res.status(400).json({ error: `Not enough money. Cost: $${Math.floor(cost).toLocaleString()}` });

        db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(cost, nation.id);

        const terrains = ['plains', 'mountain', 'forest', 'desert', 'coastal', 'urban'];
        const terrain = terrains[Math.floor(Math.random() * terrains.length)];
        const safeName = sanitize(cityName) || 'New City';
        const result = db.prepare('INSERT INTO cities (nation_id, name, terrain, population, infrastructure, land, happiness, crime, disease, pollution) VALUES (?, ?, ?, 10000, 200, 200, 50, 0, 0, 0)')
            .run(nation.id, safeName, terrain);

        const cityId = result.lastInsertRowid;
        db.prepare('INSERT INTO city_improvements (city_id, improvement_type, quantity) VALUES (?, ?, ?)').run(cityId, 'farm', 1);
        db.prepare('INSERT INTO city_improvements (city_id, improvement_type, quantity) VALUES (?, ?, ?)').run(cityId, 'coal_plant', 1);

        recalcNationStats(nation.id);
        res.json({ success: true, message: `City founded! Cost: $${Math.floor(cost).toLocaleString()}` });
    } catch (err) {
        console.error('[API] Build city error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.post('/city/:cityId/improve', (req, res) => {
    try {
        const { improvementType } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.cityId, nation.id);
        if (!city) return res.status(404).json({ error: 'City not found.' });

        const imp = GAME_DATA.improvements[improvementType];
        if (!imp) return res.status(400).json({ error: 'Invalid improvement.' });

        // Smart City Limit Check (1 improvement requires 1 Land AND 1 Infra)
        const totalBuildings = db.prepare('SELECT SUM(quantity) as count FROM city_improvements WHERE city_id = ?').get(city.id).count || 0;
        const maxImps = Math.min(city.land || 100, city.infrastructure || 1);
        if (totalBuildings >= maxImps) {
            if (city.land <= city.infrastructure) {
                return res.status(400).json({ error: `Not enough land (${totalBuildings}/${maxImps}). Buy more land.` });
            } else {
                return res.status(400).json({ error: `Not enough infrastructure (${totalBuildings}/${maxImps}). Buy more infrastructure.` });
            }
        }

        if (nation.money < imp.cost) return res.status(400).json({ error: 'Not enough money.' });

        const current = db.prepare('SELECT quantity FROM city_improvements WHERE city_id = ? AND improvement_type = ?').get(city.id, improvementType);
        let maxAllowed = imp.maxPerCity;

        if (current && current.quantity >= (maxAllowed || 999)) return res.status(400).json({ error: `Max reached for this improvement (${maxAllowed}).` });

        db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(imp.cost, nation.id);

        if (current) {
            db.prepare('UPDATE city_improvements SET quantity = quantity + 1 WHERE city_id = ? AND improvement_type = ?').run(city.id, improvementType);
        } else {
            db.prepare('INSERT INTO city_improvements (city_id, improvement_type, quantity) VALUES (?, ?, 1)').run(city.id, improvementType);
        }

        recalcNationStats(nation.id);
        res.json({ success: true, message: `${imp.name} built!` });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/city/:cityId/improve/remove', (req, res) => {
    try {
        const { improvementType } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.cityId, nation.id);
        if (!city) return res.status(404).json({ error: 'City not found.' });

        const imp = GAME_DATA.improvements[improvementType];
        if (!imp) return res.status(400).json({ error: 'Invalid improvement.' });

        const current = db.prepare('SELECT quantity FROM city_improvements WHERE city_id = ? AND improvement_type = ?').get(city.id, improvementType);
        if (!current || current.quantity <= 0) return res.status(400).json({ error: 'No such improvement in this city.' });

        // 50% refund
        const refund = Math.floor(imp.cost * 0.5);
        db.prepare('UPDATE nations SET money = money + ? WHERE id = ?').run(refund, nation.id);

        if (current.quantity > 1) {
            db.prepare('UPDATE city_improvements SET quantity = quantity - 1 WHERE city_id = ? AND improvement_type = ?').run(city.id, improvementType);
        } else {
            db.prepare('DELETE FROM city_improvements WHERE city_id = ? AND improvement_type = ?').run(city.id, improvementType);
        }

        recalcNationStats(nation.id);
        res.json({ success: true, message: `${imp.name} removed. Refunded $${refund.toLocaleString()}.` });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/city/:cityId/infrastructure', (req, res) => {
    try {
        let { amount } = req.body;
        amount = parseInt(amount);
        if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount.' });

        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation found.' });

        const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.cityId, nation.id);
        if (!city) return res.status(404).json({ error: 'City not found or does not belong to your nation.' });

        // Scaling cost: base × (1 + currentInfra/500)
        const baseCost = amount * GAME_DATA.balance.cityInfrastructureCostPer;
        const cost = Math.floor(baseCost * (1 + city.infrastructure / 500));

        if (nation.money < cost) {
            return res.status(400).json({ error: `Insufficient Treasury Funds. Required: $${cost.toLocaleString()}.` });
        }

        db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(cost, nation.id);
        db.prepare('UPDATE cities SET infrastructure = infrastructure + ? WHERE id = ?').run(amount, city.id);

        recalcNationStats(nation.id);
        res.json({ success: true, cost });
    } catch (err) {
        console.error('[INFRA ERROR]', err);
        res.status(500).json({ error: 'Execution failed: ' + err.message });
    }
});

router.post('/city/:cityId/land', (req, res) => {
    try {
        let { amount } = req.body;
        amount = parseInt(amount);
        if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount.' });

        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation found.' });

        const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.cityId, nation.id);
        if (!city) return res.status(404).json({ error: 'City not found or does not belong to your nation.' });

        // Base Land cost $500 per unit, scales slightly with current land size
        const baseCost = amount * 500;
        const cost = Math.floor(baseCost * (1 + city.land / 1000));

        if (nation.money < cost) {
            return res.status(400).json({ error: `Insufficient Treasury Funds. Required: $${cost.toLocaleString()}.` });
        }

        db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(cost, nation.id);
        db.prepare('UPDATE cities SET land = land + ? WHERE id = ?').run(amount, city.id);

        recalcNationStats(nation.id);
        res.json({ success: true, cost });
    } catch (err) {
        console.error('[LAND ERROR]', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.post('/city/:cityId/make-capital', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });
        const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.cityId, nation.id);
        if (!city) return res.status(404).json({ error: 'City not found.' });

        db.prepare('UPDATE nations SET capital_city_id = ? WHERE id = ?').run(city.id, nation.id);

        recalcNationStats(nation.id);
        res.json({ success: true, message: `${city.name} is now your capital!` });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/city/:cityId/rename', (req, res) => {
    try {
        const { newName } = req.body;
        const nation = getNation(req.userId);
        if (!nation || !newName) return res.status(400).json({ error: 'Invalid request.' });

        const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.cityId, nation.id);
        if (!city) return res.status(404).json({ error: 'City not found.' });

        const safeName = sanitize(newName).substring(0, 50);
        db.prepare('UPDATE cities SET name = ? WHERE id = ?').run(safeName, city.id);

        res.json({ success: true, message: `City renamed to ${safeName}!` });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ═══════════════════════════════════════
// MILITARY
// ═══════════════════════════════════════

router.post('/military/recruit', (req, res) => {
    try {
        const { unitType } = req.body;
        const amount = positiveInt(req.body.amount);
        if (!amount) return res.status(400).json({ error: 'Invalid amount.' });
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const unit = GAME_DATA.units[unitType];
        if (!unit) return res.status(400).json({ error: 'Invalid unit.' });

        const capacity = getUnitCapacity(nation.id, unitType);
        const currentRow = db.prepare('SELECT quantity FROM military WHERE nation_id = ? AND unit_type = ?').get(nation.id, unitType);
        const current = currentRow ? currentRow.quantity : 0;

        if (current + amount > capacity) return res.status(400).json({ error: `Capacity exceeded. Max: ${capacity}` });

        for (const [res_name, cost] of Object.entries(unit.cost)) {
            const have = nation[res_name] || 0;
            if (have < cost * amount) return res.status(400).json({ error: `Not enough ${res_name}.` });
        }

        for (const [res_name, cost] of Object.entries(unit.cost)) {
            const col = safeResourceColumn(res_name);
            db.prepare(`UPDATE nations SET ${col} = ${col} - ? WHERE id = ?`).run(cost * amount, nation.id);
        }

        if (currentRow) {
            db.prepare('UPDATE military SET quantity = quantity + ? WHERE nation_id = ? AND unit_type = ?').run(amount, nation.id, unitType);
        } else {
            db.prepare('INSERT INTO military (nation_id, unit_type, quantity) VALUES (?, ?, ?)').run(nation.id, unitType, amount);
        }

        recalcNationStats(nation.id);
        res.json({ success: true, message: `Recruited ${amount} ${unit.name}!` });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Upgrade is now handled automatically in combat via payloads
router.post('/military/upgrade', (req, res) => {
    res.status(410).json({ error: 'Upgrade system deprecated. Nuclear warheads are now auto-applied payloads.' });
});


// ═══════════════════════════════════════
// WAR (Phase 2: cooldowns, limits, NAP)
// ═══════════════════════════════════════

router.post('/war/declare', (req, res) => {
    try {
        const { targetId, casusBelli } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const target = db.prepare('SELECT * FROM nations WHERE id = ?').get(targetId);
        if (!target) return res.status(404).json({ error: 'Target not found.' });
        if (target.id === nation.id) return res.status(400).json({ error: 'Cannot declare war on yourself.' });

        const currentTurn = getCurrentTurn();

        // Beige protection
        if (target.beige_until > currentTurn) return res.status(400).json({ error: 'Target is under new player protection.' });
        if (nation.beige_until > currentTurn) return res.status(400).json({ error: 'You cannot attack while under protection.' });

        // Score range check
        const minScore = nation.score * GAME_DATA.balance.warScoreRange;
        const maxScore = nation.score * (2 - GAME_DATA.balance.warScoreRange);
        if (target.score < minScore || target.score > maxScore) {
            return res.status(400).json({ error: 'Target is outside your war range.' });
        }

        // Max offensive wars
        const offensiveWars = db.prepare("SELECT COUNT(*) as c FROM wars WHERE status = 'active' AND attacker_id = ?").get(nation.id).c;
        if (offensiveWars >= GAME_DATA.balance.maxOffensiveWars) {
            return res.status(400).json({ error: `Max ${GAME_DATA.balance.maxOffensiveWars} offensive wars.` });
        }

        // Already at war?
        const existingWar = db.prepare(`SELECT id FROM wars WHERE status = 'active' AND 
            ((attacker_id = ? AND defender_id = ?) OR (attacker_id = ? AND defender_id = ?))`
        ).get(nation.id, targetId, targetId, nation.id);
        if (existingWar) return res.status(400).json({ error: 'Already at war with this nation.' });

        // War cooldown
        const recentWar = db.prepare(`SELECT end_turn FROM wars WHERE status IN ('attacker_victory','defender_victory','stalemate','peace')
            AND ((attacker_id = ? AND defender_id = ?) OR (attacker_id = ? AND defender_id = ?))
            ORDER BY end_turn DESC LIMIT 1`
        ).get(nation.id, targetId, targetId, nation.id);
        if (recentWar && currentTurn - recentWar.end_turn < GAME_DATA.balance.warCooldownTurns) {
            const remaining = GAME_DATA.balance.warCooldownTurns - (currentTurn - recentWar.end_turn);
            return res.status(400).json({ error: `War cooldown: ${remaining} turns remaining.` });
        }

        // NAP enforcement
        const nap = db.prepare(`SELECT id FROM treaties WHERE status = 'active' AND type = 'nap' AND
            ((nation_a_id = ? AND nation_b_id = ?) OR (nation_a_id = ? AND nation_b_id = ?))`
        ).get(nation.id, targetId, targetId, nation.id);
        if (nap) return res.status(400).json({ error: 'Non-Aggression Pact prevents war. Cancel it first.' });

        const validCasus = casusBelli || 'unprovoked';
        if (validCasus === 'unprovoked') {
            db.prepare('UPDATE nations SET approval = MAX(0, approval - 30) WHERE id = ?').run(nation.id);
        }

        const result = db.prepare(`INSERT INTO wars (attacker_id, defender_id, status, casus_belli, start_turn)
            VALUES (?, ?, 'active', ?, ?)`).run(nation.id, targetId, validCasus, currentTurn);

        db.prepare('INSERT INTO news (icon, headline, body, turn) VALUES (?, ?, ?, ?)').run(
            '⚔️', `WAR: ${nation.name} vs ${target.name}`,
            `${nation.leader_name} has declared war on ${target.name}. Casus belli: ${validCasus}.`,
            currentTurn
        );

        broadcastToNation(targetId, { type: 'war_declared', attackerName: nation.name, warId: result.lastInsertRowid });
        res.json({ success: true, warId: result.lastInsertRowid });
    } catch (err) {
        console.error('[API] War declare error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.post('/war/:warId/battle', (req, res) => {
    try {
        const { attackType, commitment, defensePosture } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const war = db.prepare('SELECT * FROM wars WHERE id = ? AND status = ?').get(req.params.warId, 'active');
        if (!war) return res.status(404).json({ error: 'War not found.' });

        const isAttacker = war.attacker_id === nation.id;
        const isDefender = war.defender_id === nation.id;
        if (!isAttacker && !isDefender) return res.status(403).json({ error: 'Not your war.' });

        const ap = isAttacker ? war.attacker_action_points : war.defender_action_points;
        if (ap <= 0) return res.status(400).json({ error: 'No action points remaining.' });

        const enemyId = isAttacker ? war.defender_id : war.attacker_id;
        const enemy = db.prepare('SELECT * FROM nations WHERE id = ?').get(enemyId);
        if (!enemy) return res.status(400).json({ error: 'Enemy nation not found.' });

        const result = executeBattle(nation, enemy, war, attackType, commitment, defensePosture || 'dig_in', isAttacker);

        if (isAttacker) {
            db.prepare('UPDATE wars SET attacker_action_points = attacker_action_points - 1 WHERE id = ?').run(war.id);
        } else {
            db.prepare('UPDATE wars SET defender_action_points = defender_action_points - 1 WHERE id = ?').run(war.id);
        }

        // Auto-end at max war score
        const updatedWar = db.prepare('SELECT * FROM wars WHERE id = ?').get(war.id);
        const maxWS = GAME_DATA.balance.warScoreAutoEnd;
        if (updatedWar.attacker_war_score >= maxWS || updatedWar.defender_war_score >= maxWS) {
            const winner = updatedWar.attacker_war_score >= maxWS ? 'attacker_victory' : 'defender_victory';
            db.prepare("UPDATE wars SET status = ?, end_turn = ? WHERE id = ?").run(winner, getCurrentTurn(), war.id);

            const { applyWarLoot } = require('../game/tick');
            // Inline loot
            const winnerId = winner === 'attacker_victory' ? war.attacker_id : war.defender_id;
            const loserId = winner === 'attacker_victory' ? war.defender_id : war.attacker_id;
            const loser = db.prepare('SELECT * FROM nations WHERE id = ?').get(loserId);
            if (loser) {
                const pct = GAME_DATA.balance.lootPercentage;
                for (const r of ['money', 'food', 'steel', 'oil', 'aluminum', 'munitions', 'uranium', 'rare']) {
                    const loot = Math.floor((loser[r] || 0) * pct);
                    if (loot > 0) {
                        db.prepare(`UPDATE nations SET ${r} = ${r} - ? WHERE id = ?`).run(loot, loserId);
                        db.prepare(`UPDATE nations SET ${r} = ${r} + ? WHERE id = ?`).run(loot, winnerId);
                    }
                }
            }
            result.warEnded = true;
            result.warOutcome = winner;
        }

        recalcNationStats(nation.id);
        recalcNationStats(enemyId);

        broadcastToNation(enemyId, { type: 'battle_result', warId: war.id, winner: result.winner });
        res.json({ success: true, battle: result });
    } catch (err) {
        console.error('[API] Battle error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.post('/war/:warId/peace', (req, res) => {
    try {
        const { demands } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const war = db.prepare('SELECT * FROM wars WHERE id = ? AND status = ?').get(req.params.warId, 'active');
        if (!war) return res.status(404).json({ error: 'War not found.' });

        const isAttacker = war.attacker_id === nation.id;
        const winner = war.attacker_war_score > war.defender_war_score ? 'attacker_victory' :
            war.defender_war_score > war.attacker_war_score ? 'defender_victory' : 'stalemate';

        const currentTurn = getCurrentTurn();
        db.prepare('UPDATE wars SET status = ?, end_turn = ? WHERE id = ?').run(winner, currentTurn, war.id);

        // Apply loot on non-stalemate
        if (winner !== 'stalemate') {
            const winnerId = winner === 'attacker_victory' ? war.attacker_id : war.defender_id;
            const loserId = winner === 'attacker_victory' ? war.defender_id : war.attacker_id;
            const loser = db.prepare('SELECT * FROM nations WHERE id = ?').get(loserId);
            if (loser) {
                const pct = GAME_DATA.balance.lootPercentage;
                for (const r of ['money', 'food', 'steel', 'oil', 'aluminum', 'munitions', 'uranium', 'rare']) {
                    const loot = Math.floor((loser[r] || 0) * pct);
                    if (loot > 0) {
                        db.prepare(`UPDATE nations SET ${r} = ${r} - ? WHERE id = ?`).run(loot, loserId);
                        db.prepare(`UPDATE nations SET ${r} = ${r} + ? WHERE id = ?`).run(loot, winnerId);
                    }
                }
            }
        }

        const enemyId = isAttacker ? war.defender_id : war.attacker_id;
        broadcastToNation(enemyId, { type: 'peace', warId: war.id });

        db.prepare('INSERT INTO news (icon, headline, body, turn) VALUES (?, ?, ?, ?)').run(
            '🕊️', `Peace: ${nation.name}`, `The war has ended. Outcome: ${winner}.`, currentTurn
        );

        res.json({ success: true, outcome: winner });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ═══════════════════════════════════════
// DIPLOMACY
// ═══════════════════════════════════════

router.post('/treaty', (req, res) => {
    try {
        const { targetId, type } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });
        if (!GAME_DATA.treatyTypes[type]) return res.status(400).json({ error: 'Invalid treaty type.' });

        const existing = db.prepare(`SELECT id FROM treaties WHERE status = 'active' AND type = ? AND
            ((nation_a_id = ? AND nation_b_id = ?) OR (nation_a_id = ? AND nation_b_id = ?))`
        ).get(type, nation.id, targetId, targetId, nation.id);
        if (existing) return res.status(400).json({ error: 'Treaty already exists.' });

        const currentTurn = getCurrentTurn();
        db.prepare('INSERT INTO treaties (type, nation_a_id, nation_b_id, start_turn) VALUES (?, ?, ?, ?)')
            .run(type, nation.id, targetId, currentTurn);

        broadcastToNation(targetId, { type: 'treaty_signed', fromName: nation.name, treatyType: type });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/treaty/:id', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });
        db.prepare(`UPDATE treaties SET status = 'cancelled' WHERE id = ? AND (nation_a_id = ? OR nation_b_id = ?)`).run(req.params.id, nation.id, nation.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ═══════════════════════════════════════
// ALLIANCE
// ═══════════════════════════════════════

function hasAlliancePermission(nationId, permission) {
    const member = db.prepare('SELECT role FROM alliance_members WHERE nation_id = ?').get(nationId);
    if (!member) return false;
    const perm = GAME_DATA.alliancePermissions[permission];
    if (!perm) return false;
    return perm.roles.includes(member.role);
}

router.post('/alliance', (req, res) => {
    try {
        const { name } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });
        if (nation.alliance_id) return res.status(400).json({ error: 'Already in an alliance.' });

        const safeName = sanitize(name);
        if (!safeName || safeName.length < 2) return res.status(400).json({ error: 'Alliance name too short.' });

        const result = db.prepare('INSERT INTO alliances (name, founder_id) VALUES (?, ?)').run(safeName, nation.id);
        db.prepare('INSERT INTO alliance_members (alliance_id, nation_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, nation.id, 'founder');
        db.prepare('UPDATE nations SET alliance_id = ? WHERE id = ?').run(result.lastInsertRowid, nation.id);

        res.json({ success: true, allianceId: result.lastInsertRowid });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/alliance/:id/join', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });
        if (nation.alliance_id) return res.status(400).json({ error: 'Already in an alliance.' });

        db.prepare('INSERT INTO alliance_members (alliance_id, nation_id) VALUES (?, ?)').run(req.params.id, nation.id);
        db.prepare('UPDATE nations SET alliance_id = ? WHERE id = ?').run(req.params.id, nation.id);

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/alliance/leave', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation || !nation.alliance_id) return res.status(400).json({ error: 'Not in an alliance.' });

        db.prepare('DELETE FROM alliance_members WHERE nation_id = ?').run(nation.id);
        const allianceId = nation.alliance_id;
        db.prepare('UPDATE nations SET alliance_id = NULL WHERE id = ?').run(nation.id);

        const remaining = db.prepare('SELECT COUNT(*) as c FROM alliance_members WHERE alliance_id = ?').get(allianceId).c;
        if (remaining === 0) db.prepare('DELETE FROM alliances WHERE id = ?').run(allianceId);

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/alliance/update', (req, res) => {
    try {
        const { description } = req.body;
        const nation = getNation(req.userId);
        if (!nation || !nation.alliance_id) return res.status(400).json({ error: 'Not in an alliance.' });

        if (!hasAlliancePermission(nation.id, 'MANAGE_BIO')) return res.status(403).json({ error: 'Insufficient permission.' });

        db.prepare('UPDATE alliances SET description = ? WHERE id = ?').run(sanitize(description).substring(0, 1000), nation.alliance_id);
        res.json({ success: true, message: 'Alliance updated!' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/alliance/member/:nationId/role', (req, res) => {
    try {
        const { role } = req.body;
        const nation = getNation(req.userId);
        if (!nation || !nation.alliance_id) return res.status(400).json({ error: 'Not in an alliance.' });

        if (!hasAlliancePermission(nation.id, 'PROMOTE')) return res.status(403).json({ error: 'Insufficient permission.' });
        if (!GAME_DATA.allianceRoles[role]) return res.status(400).json({ error: 'Invalid role.' });

        const target = db.prepare('SELECT role FROM alliance_members WHERE nation_id = ? AND alliance_id = ?').get(req.params.nationId, nation.alliance_id);
        if (!target) return res.status(404).json({ error: 'Member not found in your alliance.' });

        // Logic: Can only promote/demote if target power < self power
        const selfRole = db.prepare('SELECT role FROM alliance_members WHERE nation_id = ?').get(nation.id).role;
        const selfPower = GAME_DATA.allianceRoles[selfRole].power;
        const targetPower = GAME_DATA.allianceRoles[target.role].power;
        const newPower = GAME_DATA.allianceRoles[role].power;

        if (targetPower >= selfPower) return res.status(403).json({ error: 'Cannot manage someone of equal or higher rank.' });
        if (newPower >= selfPower && role !== 'founder') return res.status(403).json({ error: 'Cannot promote someone to your own rank or higher.' });

        db.prepare('UPDATE alliance_members SET role = ? WHERE nation_id = ?').run(role, req.params.nationId);
        res.json({ success: true, message: 'Member rank updated!' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/alliance/member/:nationId/kick', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation || !nation.alliance_id) return res.status(400).json({ error: 'Not in an alliance.' });

        if (!hasAlliancePermission(nation.id, 'KICK')) return res.status(403).json({ error: 'Insufficient permission.' });

        const target = db.prepare('SELECT role FROM alliance_members WHERE nation_id = ? AND alliance_id = ?').get(req.params.nationId, nation.alliance_id);
        if (!target) return res.status(404).json({ error: 'Member not found in your alliance.' });

        const selfRole = db.prepare('SELECT role FROM alliance_members WHERE nation_id = ?').get(nation.id).role;
        const selfPower = GAME_DATA.allianceRoles[selfRole].power;
        const targetPower = GAME_DATA.allianceRoles[target.role].power;

        if (targetPower >= selfPower) return res.status(403).json({ error: 'Cannot kick someone of equal or higher rank.' });

        db.prepare('DELETE FROM alliance_members WHERE nation_id = ?').run(req.params.nationId);
        db.prepare('UPDATE nations SET alliance_id = NULL WHERE id = ?').run(req.params.nationId);

        res.json({ success: true, message: 'Member kicked!' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ESPIONAGE (Phase 2: cooldown per target)
// ═══════════════════════════════════════

router.post('/spy', (req, res) => {
    try {
        const { targetId, missionType } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const mission = GAME_DATA.spyMissions[missionType];
        if (!mission) return res.status(400).json({ error: 'Invalid mission.' });
        if (nation.spies <= 0) return res.status(400).json({ error: 'No spies available.' });
        if (nation.money < mission.cost) return res.status(400).json({ error: 'Not enough money.' });
        if (targetId === nation.id) return res.status(400).json({ error: 'Cannot spy on yourself.' });

        // Spy cooldown per target
        const spyKey = `spy:${nation.id}:${targetId}`;
        const lastSpy = db.prepare('SELECT value FROM game_state WHERE key = ?').get(spyKey);
        const currentTurn = getCurrentTurn();
        if (lastSpy && currentTurn - parseInt(lastSpy.value) < GAME_DATA.balance.spyCooldownTurns) {
            const remaining = GAME_DATA.balance.spyCooldownTurns - (currentTurn - parseInt(lastSpy.value));
            return res.status(400).json({ error: `Spy cooldown: ${remaining} turns remaining vs this target.` });
        }

        db.prepare('UPDATE nations SET money = money - ?, spies = spies - 1 WHERE id = ?').run(mission.cost, nation.id);

        // Record cooldown
        if (lastSpy) {
            db.prepare('UPDATE game_state SET value = ? WHERE key = ?').run(String(currentTurn), spyKey);
        } else {
            db.prepare('INSERT INTO game_state (key, value) VALUES (?, ?)').run(spyKey, String(currentTurn));
        }

        const success = Math.random() > mission.risk;
        let message;

        if (success) {
            const target = db.prepare('SELECT * FROM nations WHERE id = ?').get(targetId);
            switch (missionType) {
                case 'gather_intel': {
                    const mil = db.prepare('SELECT unit_type, quantity FROM military WHERE nation_id = ?').all(targetId);
                    message = { success: true, intel: { military: mil, money: target.money, score: target.score } };
                    break;
                }
                case 'sabotage': {
                    const targetCities = db.prepare('SELECT id FROM cities WHERE nation_id = ?').all(targetId);
                    if (targetCities.length > 0) {
                        const cityId = targetCities[Math.floor(Math.random() * targetCities.length)].id;
                        db.prepare('UPDATE cities SET infrastructure = MAX(10, infrastructure - 5) WHERE id = ?').run(cityId);
                    }
                    message = { success: true, text: 'Sabotage successful! Infrastructure destroyed.' };
                    break;
                }
                case 'propaganda':
                    db.prepare('UPDATE nations SET approval = MAX(0, approval - 10) WHERE id = ?').run(targetId);
                    message = { success: true, text: 'Propaganda reduced target approval by 10!' };
                    break;
                case 'steal_tech':
                    db.prepare('UPDATE nations SET rare = rare + 10 WHERE id = ?').run(nation.id);
                    message = { success: true, text: 'Stole technology! +10 Rare Minerals.' };
                    break;
                case 'assassinate':
                    db.prepare('UPDATE nations SET stability = MAX(0, stability - 30), approval = MAX(0, approval - 20) WHERE id = ?').run(targetId);
                    message = { success: true, text: 'Assassination successful! Target destabilized.' };
                    break;
            }
        } else {
            message = { success: false, text: 'Spy caught! Mission failed.' };
            db.prepare('INSERT INTO news (icon, headline, body, turn) VALUES (?, ?, ?, ?)')
                .run('🕵️', 'Spy Caught!', `A spy from ${nation.name} was caught in a foreign nation.`, currentTurn);
        }

        res.json(message);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ═══════════════════════════════════════
// ═══════════════════════════════════════
// POLICIES
// ═══════════════════════════════════════

router.post('/policies', (req, res) => {
    try {
        const { taxRate, socialSpending, warPolicy, militaryDoctrine } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        if (taxRate !== undefined) db.prepare('UPDATE nations SET tax_rate = ? WHERE id = ?').run(Math.max(0, Math.min(0.4, taxRate)), nation.id);
        if (socialSpending !== undefined) db.prepare('UPDATE nations SET social_spending = ? WHERE id = ?').run(Math.max(0, Math.min(0.3, socialSpending)), nation.id);

        if (warPolicy) {
            const valid = ['normal', 'aggressive', 'defensive', 'pacifist'];
            if (valid.includes(warPolicy)) db.prepare('UPDATE nations SET war_policy = ? WHERE id = ?').run(warPolicy, nation.id);
        }
        if (militaryDoctrine) {
            const valid = ['balanced', 'blitzkrieg', 'guerrilla', 'fortified', 'firepower'];
            if (valid.includes(militaryDoctrine)) db.prepare('UPDATE nations SET military_doctrine = ? WHERE id = ?').run(militaryDoctrine, nation.id);
        }

        recalcNationStats(nation.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ═══════════════════════════════════════
// RESEARCH
// ═══════════════════════════════════════

router.get('/research', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const research = db.prepare('SELECT * FROM research WHERE nation_id = ?').all();
        res.json({ research });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/research/start', (req, res) => {
    try {
        const { techId } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const tech = GAME_DATA.research[techId];
        if (!tech) return res.status(400).json({ error: 'Invalid technology.' });

        if (nation.money < tech.cost) return res.status(400).json({ error: 'Not enough money.' });
        if (nation.approval < tech.minApproval) return res.status(400).json({ error: `Approval too low (need ${tech.minApproval}%).` });

        // Check if already researching or completed
        const existing = db.prepare('SELECT * FROM research WHERE nation_id = ? AND tech_id = ?').get(nation.id, techId);
        if (existing && existing.completed) return res.status(400).json({ error: 'Already completed.' });
        if (existing && existing.progress > 0) return res.status(400).json({ error: 'Already researching.' });

        // Only one active research at a time
        const active = db.prepare('SELECT * FROM research WHERE nation_id = ? AND completed = 0').get(nation.id);
        if (active) return res.status(400).json({ error: 'Already have an active research project.' });

        db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(tech.cost, nation.id);
        db.prepare('INSERT OR REPLACE INTO research (nation_id, tech_id, progress, completed) VALUES (?, ?, ?, ?)')
            .run(nation.id, techId, 1, 0); // Start with 1% progress to mark as active

        res.json({ success: true, cost: tech.cost });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ═══════════════════════════════════════
// WORLD
// ═══════════════════════════════════════

router.get('/rankings', (req, res) => {
    try {
        const nations = db.prepare(`SELECT id, name, leader_name, government, continent, score, population, 
            military_strength, gdp, alliance_id, flag_pattern, flag_color1, flag_color2, flag_color3
            FROM nations ORDER BY score DESC LIMIT 100`).all();
        res.json({ nations: nations.map(formatNation) });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/nations', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        const nations = db.prepare(`SELECT id, name, leader_name, government, continent, score, population,
            military_strength, alliance_id, flag_pattern, flag_color1, flag_color2, flag_color3
            FROM nations ORDER BY score DESC LIMIT ? OFFSET ?`).all(limit, offset);
        const total = db.prepare('SELECT COUNT(*) as c FROM nations').get().c;
        res.json({ nations: nations.map(formatNation), total, page, pages: Math.ceil(total / limit) });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/news', (req, res) => {
    try {
        const news = db.prepare('SELECT * FROM news ORDER BY created_at DESC LIMIT 50').all();
        res.json({ news });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/alliances', (req, res) => {
    try {
        const alliances = db.prepare('SELECT * FROM alliances ORDER BY id DESC').all();
        for (const a of alliances) {
            a.members = db.prepare(`SELECT am.role, n.id, n.name, n.score FROM alliance_members am
                JOIN nations n ON am.nation_id = n.id WHERE am.alliance_id = ?`).all(a.id);
        }
        res.json({ alliances });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// War history
router.get('/wars/history', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'No nation.' });

        const wars = db.prepare(`SELECT w.*, 
            na.name as attacker_name, nd.name as defender_name
            FROM wars w 
            JOIN nations na ON w.attacker_id = na.id
            JOIN nations nd ON w.defender_id = nd.id
            WHERE w.attacker_id = ? OR w.defender_id = ?
            ORDER BY w.created_at DESC LIMIT 50`).all(nation.id, nation.id);

        res.json({ wars });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Battle details
router.get('/war/:warId/battles', (req, res) => {
    try {
        const battles = db.prepare(`SELECT b.*, 
            na.name as attacker_name
            FROM battles b
            JOIN nations na ON b.attacker_nation_id = na.id
            WHERE b.war_id = ? ORDER BY b.created_at DESC`).all(req.params.warId);
        res.json({ battles });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ═══════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════

function getNation(userId) {
    return db.prepare('SELECT * FROM nations WHERE user_id = ?').get(userId);
}

function getCurrentTurn() {
    return parseInt(db.prepare('SELECT value FROM game_state WHERE key = ?').get('current_turn')?.value || '1');
}

function formatNation(n) {
    return {
        ...n,
        flag: { pattern: n.flag_pattern, colors: [n.flag_color1, n.flag_color2, n.flag_color3] }
    };
}

function getFullAlliance(id) {
    const a = db.prepare('SELECT * FROM alliances WHERE id = ?').get(id);
    if (!a) return null;
    a.members = db.prepare(`SELECT am.role, n.id, n.name, n.score FROM alliance_members am
        JOIN nations n ON am.nation_id = n.id WHERE am.alliance_id = ?`).all(id);
    return a;
}

function getUnitCapacity(nationId, unitType) {
    const unit = GAME_DATA.units[unitType];
    if (!unit) return 0;
    const cities = db.prepare('SELECT id FROM cities WHERE nation_id = ?').all(nationId);
    let cap = 0;
    for (const city of cities) {
        const imp = db.prepare('SELECT quantity FROM city_improvements WHERE city_id = ? AND improvement_type = ?').get(city.id, unit.requires);
        if (imp) cap += imp.quantity * (GAME_DATA.improvements[unit.requires]?.capacity || 5000);
    }
    return cap;
}

function recalcNationStats(nationId) {
    const nation = db.prepare('SELECT * FROM nations WHERE id = ?').get(nationId);
    if (!nation) return;

    const pop = db.prepare('SELECT SUM(population) as p FROM cities WHERE nation_id = ?').get(nationId);
    const population = pop?.p || 0;

    let milStr = 0;
    const units = db.prepare('SELECT unit_type, quantity FROM military WHERE nation_id = ?').all(nationId);
    for (const u of units) {
        const unitData = GAME_DATA.units[u.unit_type];
        if (unitData) milStr += u.quantity * unitData.strength;
    }

    let gdp = Math.floor(population * 0.5);
    const cities = db.prepare('SELECT id FROM cities WHERE nation_id = ?').all(nationId);
    for (const city of cities) {
        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);
        for (const imp of imps) {
            const impData = GAME_DATA.improvements[imp.improvement_type];
            if (impData && impData.commerce) gdp += imp.quantity * impData.commerce;
        }
    }

    const cityCount = cities.length;
    // Score includes pop, military strength, city count and GDP
    const score = Math.floor(population / 100) + Math.floor(milStr / 10) + (cityCount * 50) + Math.floor(gdp / 100);

    // Note: Stability and Approval are updated in game/tick.js to reflect turn-based changes
    db.prepare('UPDATE nations SET population = ?, military_strength = ?, gdp = ?, score = ? WHERE id = ?')
        .run(population, milStr, gdp, score, nationId);
}

function executeBattle(attacker, defender, war, attackType, commitment, defensePosture, isAttacker) {
    const typeData = GAME_DATA.battleTypes[attackType] || GAME_DATA.battleTypes.combined_arms;
    const postureData = GAME_DATA.defensivePostures[defensePosture] || GAME_DATA.defensivePostures.dig_in;

    // Calculate attacker strength
    let attackStr = 0;
    const attackerUnits = db.prepare('SELECT unit_type, quantity FROM military WHERE nation_id = ?').all(attacker.id);
    const casualties = { attacker: {}, defender: {} };

    // Attacker stance modifiers
    const aPolicy = GAME_DATA.warPolicies[attacker.war_policy || 'normal'] || GAME_DATA.warPolicies.normal;
    const aDoctrine = GAME_DATA.militaryDoctrines[attacker.military_doctrine || 'balanced'] || GAME_DATA.militaryDoctrines.balanced;

    for (const u of attackerUnits) {
        const pct = commitment?.[u.unit_type] || 0;
        if (pct <= 0) continue;
        const committed = Math.floor(u.quantity * (pct / 100));
        const unitData = GAME_DATA.units[u.unit_type];
        if (!unitData) continue;

        let eff = 1.0;
        if (typeData.primaryBranch !== 'all' && unitData.branch !== typeData.primaryBranch) eff = 0.5;

        // Specialized Battleship logic: Massive bonus for land bombardment, penalty for ship-to-ship
        if (u.unit_type === 'battleships') {
            if (attackType === 'naval_bombardment') eff *= 2.0; // Anti-land specialization
            else eff *= 0.6; // Obsolete against other targets
        }

        attackStr += committed * unitData.strength * eff;
    }

    // Apply attacker modifiers
    attackStr *= (aPolicy.attackMod || 1.0) * (aDoctrine.attackBonus || 1.0);

    // Calculate defender strength
    let defendStr = 0;
    const defenderUnits = db.prepare('SELECT unit_type, quantity FROM military WHERE nation_id = ?').all(defender.id);

    // Defender stance modifiers
    const dPolicy = GAME_DATA.warPolicies[defender.war_policy || 'normal'] || GAME_DATA.warPolicies.normal;
    const dDoctrine = GAME_DATA.militaryDoctrines[defender.military_doctrine || 'balanced'] || GAME_DATA.militaryDoctrines.balanced;

    for (const u of defenderUnits) {
        const unitData = GAME_DATA.units[u.unit_type];
        if (unitData) {
            defendStr += u.quantity * unitData.defense * postureData.defenseMultiplier;
        }
    }

    // Apply defender modifiers
    defendStr *= (dPolicy.defenseMod || 1.0) * (dDoctrine.defenseBonus || 1.0);

    // Random factor
    attackStr *= 0.8 + Math.random() * 0.4;
    defendStr *= 0.8 + Math.random() * 0.4;

    const ratio = attackStr / Math.max(1, defendStr);
    let winner, aCasRate, dCasRate;

    if (ratio > 1.5) { winner = 'attacker'; aCasRate = 0.05 + Math.random() * 0.1; dCasRate = 0.15 + Math.random() * 0.2; }
    else if (ratio > 1.0) { winner = 'attacker'; aCasRate = 0.1 + Math.random() * 0.15; dCasRate = 0.1 + Math.random() * 0.15; }
    else if (ratio > 0.7) { winner = 'defender'; aCasRate = 0.15 + Math.random() * 0.2; dCasRate = 0.05 + Math.random() * 0.1; }
    else { winner = 'defender'; aCasRate = 0.2 + Math.random() * 0.25; dCasRate = 0.03 + Math.random() * 0.07; }

    // Counter-attack bonus
    if (postureData.counterChance > 0 && Math.random() < postureData.counterChance) {
        aCasRate += 0.1; // Bonus attacker losses on counter
    }

    // Apply casualties with detailed tracking
    for (const u of attackerUnits) {
        const pct = commitment?.[u.unit_type] || 0;
        if (pct <= 0) continue;
        const committed = Math.floor(u.quantity * (pct / 100));
        const lost = Math.floor(committed * aCasRate);
        if (lost > 0) {
            db.prepare('UPDATE military SET quantity = MAX(0, quantity - ?) WHERE nation_id = ? AND unit_type = ?').run(lost, attacker.id, u.unit_type);
            casualties.attacker[u.unit_type] = lost;
        }
    }
    for (const u of defenderUnits) {
        const preserveRate = postureData.preserveUnits || 0;
        const effectiveCasRate = dCasRate * (1 - preserveRate);
        const lost = Math.floor(u.quantity * effectiveCasRate);
        if (lost > 0) {
            db.prepare('UPDATE military SET quantity = MAX(0, quantity - ?) WHERE nation_id = ? AND unit_type = ?').run(lost, defender.id, u.unit_type);
            casualties.defender[u.unit_type] = lost;
        }
    }

    // Infrastructure damage
    let infraDamage = 0;
    if (winner === 'attacker') {
        infraDamage = Math.floor(ratio * 5);
        const defCities = db.prepare('SELECT id FROM cities WHERE nation_id = ?').all(defender.id);
        if (defCities.length > 0) {
            const targetCity = defCities[Math.floor(Math.random() * defCities.length)];
            db.prepare('UPDATE cities SET infrastructure = MAX(10, infrastructure - ?) WHERE id = ?').run(infraDamage, targetCity.id);
        }
    }

    // War score
    const wsGain = winner === 'attacker' ? Math.floor(ratio * 10) : Math.floor((1 / ratio) * 10);
    if (isAttacker) {
        if (winner === 'attacker') db.prepare('UPDATE wars SET attacker_war_score = attacker_war_score + ? WHERE id = ?').run(wsGain, war.id);
        else db.prepare('UPDATE wars SET defender_war_score = defender_war_score + ? WHERE id = ?').run(wsGain, war.id);
    } else {
        if (winner === 'defender') db.prepare('UPDATE wars SET defender_war_score = defender_war_score + ? WHERE id = ?').run(wsGain, war.id);
        else db.prepare('UPDATE wars SET attacker_war_score = attacker_war_score + ? WHERE id = ?').run(wsGain, war.id);
    }

    // Save battle record with detailed casualties
    db.prepare(`INSERT INTO battles (war_id, attacker_nation_id, attack_type, defense_posture, winner, attack_strength, defense_strength, infra_damage, turn, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(war.id, attacker.id, attackType, defensePosture, winner,
        Math.floor(attackStr), Math.floor(defendStr), infraDamage, getCurrentTurn(),
        JSON.stringify(casualties));

    return {
        winner,
        attackStr: Math.floor(attackStr),
        defendStr: Math.floor(defendStr),
        infraDamage,
        ratio: ratio.toFixed(2),
        casualties
    };
}

function broadcastToNation(nationId, data) {
    if (!global.wss) return;
    global.wss.clients.forEach(client => {
        if (client.readyState === 1 && client.nationId === nationId) {
            client.send(JSON.stringify(data));
        }
    });
}

// ═══════════════════════════════════════
// MARKET & TRADE
// ═══════════════════════════════════════

router.get('/market', (req, res) => {
    try {
        const rows = db.prepare("SELECT key, value FROM game_state WHERE key LIKE 'market_%' OR key LIKE 'pool_%'").all();
        const resources = {
            food: { price: 10, pool: 1000 },
            steel: { price: 10, pool: 1000 },
            oil: { price: 10, pool: 1000 },
            aluminum: { price: 10, pool: 1000 },
            munitions: { price: 10, pool: 1000 },
            uranium: { price: 10, pool: 1000 },
            rare: { price: 10, pool: 1000 },
            iron: { price: 10, pool: 1000 },
            bauxite: { price: 10, pool: 1000 }
        };
        for (const r of rows) {
            const isPrice = r.key.startsWith('market_');
            const resName = r.key.replace(isPrice ? 'market_' : 'pool_', '');
            if (!resources[resName]) resources[resName] = { price: 10, pool: 1000 };
            if (isPrice) resources[resName].price = parseFloat(r.value);
            else resources[resName].pool = parseFloat(r.value);
        }
        const historyRows = db.prepare("SELECT * FROM market_history ORDER BY turn DESC LIMIT 500").all().reverse();
        res.json({ resources, history: historyRows });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/market/buy', (req, res) => {
    try {
        const { resource, amount } = req.body;
        const amt = parseInt(amount);
        if (!resource || amt <= 0) return res.status(400).json({ error: 'Invalid trade request.' });

        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'Nation not found.' });

        const priceRow = db.prepare("SELECT value FROM game_state WHERE key = ?").get('market_' + resource);
        const poolRow = db.prepare("SELECT value FROM game_state WHERE key = ?").get('pool_' + resource);
        if (!priceRow || !poolRow) return res.status(400).json({ error: 'Resource unavailable.' });

        const price = parseFloat(priceRow.value) * (1 + GAME_DATA.balance.tradeMarkup);
        const pool = parseFloat(poolRow.value);
        const cost = Math.floor(amt * price);

        if (pool < amt) return res.status(400).json({ error: 'Not enough resource in the global market pool.' });
        if (nation.money < cost) return res.status(400).json({ error: 'Insufficient funds.' });

        db.prepare('UPDATE nations SET money = money - ?, ' + resource + ' = ' + resource + ' + ? WHERE id = ?').run(cost, amt, nation.id);
        db.prepare('UPDATE game_state SET value = ? WHERE key = ?').run(String(pool - amt), 'pool_' + resource);

        res.json({ success: true, cost, amount: amt, resource });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/market/sell', (req, res) => {
    try {
        const { resource, amount } = req.body;
        const amt = parseInt(amount);
        if (!resource || amt <= 0) return res.status(400).json({ error: 'Invalid trade request.' });

        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'Nation not found.' });

        if ((nation[resource] || 0) < amt) return res.status(400).json({ error: 'Not enough of this resource to sell.' });

        const priceRow = db.prepare("SELECT value FROM game_state WHERE key = ?").get('market_' + resource);
        const poolRow = db.prepare("SELECT value FROM game_state WHERE key = ?").get('pool_' + resource);
        if (!priceRow || !poolRow) return res.status(400).json({ error: 'Resource unmarketable.' });

        const price = parseFloat(priceRow.value) * (1 - GAME_DATA.balance.tradeMarkup);
        const pool = parseFloat(poolRow.value);
        const earnings = Math.floor(amt * price);

        db.prepare('UPDATE nations SET money = money + ?, ' + resource + ' = ' + resource + ' - ? WHERE id = ?').run(earnings, amt, nation.id);
        db.prepare('UPDATE game_state SET value = ? WHERE key = ?').run(String(pool + amt), 'pool_' + resource);

        res.json({ success: true, earnings, amount: amt, resource });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════

router.get('/messages', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'Nation not found.' });

        // Get latest message per conversation, including global chat (to_nation_id = 0)
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

        res.json({
            messages: msgs.map(m => ({
                id: m.id,
                other_nation_id: m.other_nation_id,
                other_name: m.other_name,
                subject: m.subject,
                last_message: m.body.substring(0, 50) + '...',
                unread: (m.to_nation_id === nation.id && m.is_read === 0)
            }))
        });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/messages/read', (req, res) => {
    try {
        const { otherNationId } = req.body;
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'Nation not found.' });

        if (otherNationId !== undefined) {
            db.prepare("UPDATE messages SET is_read = 1 WHERE to_nation_id = ? AND from_nation_id = ? AND is_read = 0").run(nation.id, otherNationId);
        } else {
            db.prepare("UPDATE messages SET is_read = 1 WHERE to_nation_id = ? AND is_read = 0").run(nation.id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/messages/conversation/:otherId', (req, res) => {
    try {
        const nation = getNation(req.userId);
        if (!nation) return res.status(404).json({ error: 'Nation not found.' });

        const otherId = parseInt(req.params.otherId);
        let msgs;
        if (otherId === 0) {
            msgs = db.prepare(`
                SELECT m.*, n.name as from_name 
                FROM messages m
                LEFT JOIN nations n ON m.from_nation_id = n.id
                WHERE m.to_nation_id = 0
                ORDER BY m.created_at ASC
            `).all();
        } else {
            msgs = db.prepare(`
                SELECT m.*, n.name as from_name 
                FROM messages m
                JOIN nations n ON m.from_nation_id = n.id
                WHERE (m.from_nation_id = ? AND m.to_nation_id = ?) 
                   OR (m.from_nation_id = ? AND m.to_nation_id = ?)
                ORDER BY m.created_at ASC
            `).all(nation.id, otherId, otherId, nation.id);
        }

        res.json({
            messages: msgs.map(m => ({
                id: m.id,
                is_sender: m.from_nation_id === nation.id,
                from_name: m.from_name,
                subject: m.subject,
                body: m.body,
                turn: getCurrentTurn()
            }))
        });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/messages', (req, res) => {
    try {
        const { toNationId, subject, body } = req.body;
        if (toNationId === undefined || !body) return res.status(400).json({ error: 'Recipient and body required.' });

        const fromNation = getNation(req.userId);
        if (!fromNation) return res.status(404).json({ error: 'Nation not found.' });
        if (toNationId === fromNation.id) return res.status(400).json({ error: 'Cannot message yourself.' });

        const cleanSubject = sanitize(subject || 'No Subject').substring(0, 100);
        const cleanBody = sanitize(body).substring(0, 2000);

        db.prepare('INSERT INTO messages (from_nation_id, to_nation_id, subject, body) VALUES (?, ?, ?, ?)')
            .run(fromNation.id, toNationId, cleanSubject, cleanBody);

        broadcastToNation(toNationId, { type: 'new_message', fromName: fromNation.name });

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/messages/read', (req, res) => {
    try {
        const { otherNationId } = req.body;
        const nation = getNation(req.userId);
        if (nation && otherNationId) {
            db.prepare('UPDATE messages SET is_read = 1 WHERE to_nation_id = ? AND from_nation_id = ?').run(nation.id, otherNationId);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════
// RANKINGS & NEWS
// ═══════════════════════════════════════

router.get('/rankings', (req, res) => {
    try {
        const nations = db.prepare(`
            SELECT 
                n.id, n.name, n.leader_name, n.motto, n.government, n.score, 
                n.population, n.military_strength, n.gdp, n.stability, n.import_reliance,
                n.flag_pattern, n.flag_color1, n.flag_color2, n.flag_color3,
                a.name as alliance_name,
                (SELECT COUNT(*) FROM cities c WHERE c.nation_id = n.id) as city_count
            FROM nations n
            LEFT JOIN alliances a ON n.alliance_id = a.id
            ORDER BY n.score DESC
            LIMIT 100
        `).all();
        res.json({ rankings: nations });
    } catch (err) {
        console.error('[API] Rankings error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/news', (req, res) => {
    try {
        const news = db.prepare('SELECT * FROM news ORDER BY id DESC LIMIT 50').all();
        res.json({ news });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/admin/backup', (req, res) => {
    try {
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
        if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized.' });

        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(__dirname, '../db/game.db');
        const backupPath = path.join(__dirname, `../db/game_backup_${Date.now()}.db`);
        fs.copyFileSync(dbPath, backupPath);
        res.json({ success: true, message: 'Backup created.' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
