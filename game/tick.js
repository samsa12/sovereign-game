/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — Tick Processor  (Phase 2 Rebalanced)
   Processes world turns: resource production, consumption,
   income/expenses, population growth, market fluctuation,
   war exhaustion, desertion, improvement upkeep
   ═══════════════════════════════════════════════════════════════ */

const { GAME_DATA } = require('./data');

function processTick(db) {
    // Increment turn (1-48 cycle)
    db.prepare("UPDATE game_state SET value = CAST(((CAST(value AS INTEGER) % 48) + 1) AS TEXT) WHERE key = 'current_turn'").run();
    const turn = parseInt(db.prepare("SELECT value FROM game_state WHERE key = 'current_turn'").get().value);

    console.log(`[TICK] Processing turn ${turn}...`);

    // Get all nations
    const nations = db.prepare('SELECT * FROM nations').all();

    for (const nation of nations) {
        try {
            processNationTurn(db, nation, turn);
        } catch (err) {
            console.error(`[TICK] Error processing nation ${nation.name}:`, err);
        }
    }

    // Fluctuate market prices & save history
    fluctuateMarket(db, turn);

    // Process Research Progress
    const activeResearch = db.prepare('SELECT * FROM research WHERE completed = 0').all();
    for (const res of activeResearch) {
        const tech = GAME_DATA.research[res.tech_id];
        if (!tech) continue;

        // Research Buffs
        const nationId = res.nation_id;
        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements ci JOIN cities c ON ci.city_id = c.id WHERE c.nation_id = ?').all(nationId);
        let bonus = 1.0;
        for (const imp of imps) {
            if (imp.improvement_type === 'university') bonus += imp.quantity * 0.05;
            if (imp.improvement_type === 'research_lab') bonus += imp.quantity * 0.15;
        }

        const incr = (100 / tech.turns) * bonus;
        const newProgress = Math.min(100, res.progress + incr);
        if (newProgress >= 100) {
            db.prepare('UPDATE research SET progress = 100, completed = 1 WHERE id = ?').run(res.id);
            // Optional: News announcement
            const nation = db.prepare('SELECT name FROM nations WHERE id = ?').get(res.nation_id);
            if (nation) {
                db.prepare('INSERT INTO news (icon, headline, body, turn, turn_only_nation_id) VALUES (?, ?, ?, ?, ?)')
                    .run(tech.icon, `Research Complete: ${tech.name}`, `${nation.name} has completed research on ${tech.name}!`, turn, res.nation_id);
            }
        } else {
            db.prepare('UPDATE research SET progress = ? WHERE id = ?').run(newProgress, res.id);
        }
    }

    // Refresh war action points
    db.prepare("UPDATE wars SET attacker_action_points = MIN(3, attacker_action_points + 1), defender_action_points = MIN(3, defender_action_points + 1) WHERE status = 'active'").run();

    // End stale wars (> 120 turns = ~10 days)
    const staleWars = db.prepare("SELECT * FROM wars WHERE status = 'active' AND ? - start_turn > 120").all(turn);
    for (const war of staleWars) {
        db.prepare("UPDATE wars SET status = 'stalemate', end_turn = ? WHERE id = ?").run(turn, war.id);
    }

    // Auto-end wars at max war score
    const maxScore = GAME_DATA.balance.warScoreAutoEnd;
    const autoEndWars = db.prepare("SELECT * FROM wars WHERE status = 'active' AND (attacker_war_score >= ? OR defender_war_score >= ?)").all(maxScore, maxScore);
    for (const war of autoEndWars) {
        const winner = war.attacker_war_score >= maxScore ? 'attacker_victory' : 'defender_victory';
        db.prepare("UPDATE wars SET status = ?, end_turn = ? WHERE id = ?").run(winner, turn, war.id);

        // Apply loot
        applyWarLoot(db, war, winner);

        // News
        const attacker = db.prepare('SELECT name FROM nations WHERE id = ?').get(war.attacker_id);
        const defender = db.prepare('SELECT name FROM nations WHERE id = ?').get(war.defender_id);
        const winnerName = winner === 'attacker_victory' ? attacker?.name : defender?.name;
        db.prepare('INSERT INTO news (icon, headline, body, turn) VALUES (?, ?, ?, ?)').run(
            '🏆', `War Ended: ${winnerName} Victorious`,
            `The war between ${attacker?.name} and ${defender?.name} has ended with ${winnerName}'s victory.`,
            turn
        );
    }

    // Restore 1 spy per nation every 12 turns (~1 day)
    // Intelligence Agency: Higher cap, faster restore
    for (const nation of nations) {
        const intelAgencyCount = db.prepare("SELECT SUM(quantity) as q FROM city_improvements ci JOIN cities c ON ci.city_id = c.id WHERE c.nation_id = ? AND ci.improvement_type = ?").get(nation.id, 'intel_agency').q || 0;
        const maxSpies = 5 + (intelAgencyCount * 2);
        const restoreInterval = intelAgencyCount > 0 ? 6 : 12;

        if (turn % restoreInterval === 0) {
            db.prepare('UPDATE nations SET spies = MIN(spies + 1, ?) WHERE id = ?').run(maxSpies, nation.id);
        }
    }

    console.log(`[TICK] Turn ${turn} complete. Processed ${nations.length} nations.`);
}

function processNationTurn(db, nation, turn) {
    const cities = db.prepare('SELECT * FROM cities WHERE nation_id = ?').all(nation.id);

    // ─── CITY STATS & TOTALS ───
    const allImps = {};
    const cityStats = {};
    let totalPowerProd = 0;
    let totalPowerUsage = 0;
    let totalUpkeep = 0;

    // We need to track global fuel consumption for power plants and deduct it from the stockpile
    let availableFuel = { ...nation };
    const powerConsumption = {};

    for (const city of cities) {
        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);
        const stats = { powerProd: 0, powerUsage: 0, production: {}, commerce: 0, milCapacity: 0, upkeep: 0 };

        for (const imp of imps) {
            const impData = GAME_DATA.improvements[imp.improvement_type];
            if (!impData) continue;

            allImps[imp.improvement_type] = (allImps[imp.improvement_type] || 0) + imp.quantity;
            const upkeep = (impData.upkeep || 0) * imp.quantity;
            totalUpkeep += upkeep;
            stats.upkeep += upkeep;

            let powerPct = 1.0;
            // Power fuel check
            if (impData.consumes && impData.category === 'power') {
                for (const [res, req] of Object.entries(impData.consumes)) {
                    const needed = req * imp.quantity;
                    const avail = availableFuel[res] || 0;
                    if (avail < needed) {
                        powerPct = Math.min(powerPct, avail / needed);
                    }
                }
                for (const [res, req] of Object.entries(impData.consumes)) {
                    const consumed = req * imp.quantity * powerPct;
                    availableFuel[res] = Math.max(0, (availableFuel[res] || 0) - consumed);
                    powerConsumption[res] = (powerConsumption[res] || 0) + consumed;
                }
            }

            if (impData.power) stats.powerProd += imp.quantity * impData.power * powerPct;
            if (impData.powerUsage) stats.powerUsage += imp.quantity * impData.powerUsage;
            if (impData.commerce) stats.commerce += imp.quantity * impData.commerce;
            if (impData.capacity) stats.milCapacity += imp.quantity * impData.capacity;
        }
        totalPowerProd += stats.powerProd;
        totalPowerUsage += stats.powerUsage;
        cityStats[city.id] = stats;
    }

    const powerRatio = totalPowerUsage > 0 ? Math.min(1.0, totalPowerProd / totalPowerUsage) : 1.0;
    const powerPenalty = powerRatio < 1.0 ? 0.5 : 1.0; // 50% production penalty if power is insufficient

    // ─── INCOME ───
    let taxBase = 0;
    let commerce = 0;
    for (const city of cities) {
        const isCapital = city.id === nation.capital_city_id;
        const capitalMultiplier = isCapital ? 1.1 : 1.0; // 10% bonus for capital
        const crimePenalty = Math.max(0.5, 1 - (city.crime / 100)); // Crime maxes out at halving income

        taxBase += (city.population * 0.5) * capitalMultiplier * crimePenalty;
        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);
        for (const imp of imps) {
            const impData = GAME_DATA.improvements[imp.improvement_type];
            if (impData && impData.commerce) commerce += (imp.quantity * impData.commerce) * capitalMultiplier * crimePenalty;
        }
    }

    const taxIncome = Math.floor(taxBase * nation.tax_rate);
    const govTaxMod = getGovMod(nation.government, 'taxIncome');
    const totalTaxIncome = Math.floor(taxIncome * (1 + govTaxMod / 100));

    const govCommMod = getGovMod(nation.government, 'commerce');
    const totalCommerce = Math.floor(commerce * (1 + govCommMod / 100));

    // Continent money bonus
    const continent = GAME_DATA.continents[nation.continent];
    let continentMoneyBonus = 0;
    if (continent && continent.bonusStat === 'money') {
        continentMoneyBonus = Math.floor((totalTaxIncome + totalCommerce) * (continent.bonusValue / 100));
    }

    const warPolicyData = GAME_DATA.warPolicies[nation.war_policy] || GAME_DATA.warPolicies.normal;

    let totalIncome = totalTaxIncome + totalCommerce + continentMoneyBonus;
    totalIncome = Math.floor(totalIncome * warPolicyData.ecoMod);

    // ─── EXPENSES ───
    let milExpenses = 0;
    const units = db.prepare('SELECT unit_type, quantity FROM military WHERE nation_id = ?').all(nation.id);
    for (const u of units) {
        const unitData = GAME_DATA.units[u.unit_type];
        if (unitData && unitData.maintenance.money) {
            milExpenses += u.quantity * unitData.maintenance.money;
        }
    }

    const govMilMod = getGovMod(nation.government, 'militaryCost');
    milExpenses = Math.floor(milExpenses * (1 + govMilMod / 100));

    const socialExpenses = Math.floor(totalIncome * nation.social_spending);
    let infraExpenses = 0;
    for (const city of cities) infraExpenses += Math.floor(city.infrastructure * 2);

    // Apply Research Bonuses
    const completedResearch = db.prepare('SELECT tech_id FROM research WHERE nation_id = ? AND completed = 1').all(nation.id).map(r => r.tech_id);
    const hasAutomation = completedResearch.includes('industrial_automation');

    // Apply Logistics Bonus (-20% infra expenses)
    if (completedResearch.includes('advanced_logistics')) {
        infraExpenses = Math.floor(infraExpenses * 0.8);
    }

    const totalExpenses = milExpenses + socialExpenses + infraExpenses + totalUpkeep;

    // ─── RESOURCE PRODUCTION ───
    const production = {};
    const govResMod = getGovMod(nation.government, 'resourceProd');

    for (const city of cities) {
        // Land Efficiency: +2% production for every 500 units of land in the city
        const cityLandEfficiency = 1 + (Math.floor(city.land / 500) * 0.02);

        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);
        for (const imp of imps) {
            const impData = GAME_DATA.improvements[imp.improvement_type];
            if (impData && impData.produces && impData.rate) {
                let actualRate = imp.quantity * impData.rate * cityLandEfficiency;

                // --- CONSUMPTION CHECK ---
                if (impData.consumes) {
                    let canProducePct = 1.0;
                    for (const [res, req] of Object.entries(impData.consumes)) {
                        const needed = req * imp.quantity;
                        const available = (availableFuel[res] || 0) + (production[res] || 0);
                        if (available < needed) {
                            canProducePct = Math.min(canProducePct, available / needed);
                        }
                    }
                    actualRate *= canProducePct;
                    // Deduct consumed resources
                    for (const [res, req] of Object.entries(impData.consumes)) {
                        const consumed = req * imp.quantity * canProducePct;
                        production[res] = (production[res] || 0) - consumed;
                    }
                }

                actualRate = Math.floor(actualRate * (1 + govResMod / 100));
                if (hasAutomation) actualRate = Math.floor(actualRate * 1.10);
                actualRate = Math.floor(actualRate * warPolicyData.ecoMod);
                actualRate = Math.floor(actualRate * powerPenalty); // Apply power penalty

                production[impData.produces] = (production[impData.produces] || 0) + actualRate;
            }
        }
    }

    // Apply continent resource bonuses
    if (continent && continent.bonusStat !== 'money' && production[continent.bonusStat] > 0) {
        production[continent.bonusStat] = Math.floor(production[continent.bonusStat] * (1 + continent.bonusValue / 100));
    }

    // Apply national specialization bonus (+10% to chosen resource)
    if (nation.bonus_resource && production[nation.bonus_resource] > 0) {
        production[nation.bonus_resource] = Math.floor(production[nation.bonus_resource] * 1.10);
    }

    // Apply capital city production bonus (+10% to all resources produced in capital)
    const capitalId = nation.capital_city_id;
    if (capitalId) {
        const capitalImps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(capitalId);
        for (const imp of capitalImps) {
            const impData = GAME_DATA.improvements[imp.improvement_type];
            if (impData && impData.produces && production[impData.produces]) {
                const baseProdInCapital = Math.floor(imp.quantity * impData.rate * (1 + govResMod / 100) * warPolicyData.ecoMod);
                const bonus = Math.floor(baseProdInCapital * 0.10);
                production[impData.produces] += bonus;
            }
        }
    }

    // ─── RESOURCE CONSUMPTION ───
    const totalPop = cities.reduce((s, c) => s + c.population, 0);
    const foodConsumption = Math.floor(totalPop / 5000);

    const consumption = { food: foodConsumption };

    // Merge power consumption into global consumption so it renders in the UI
    for (const [res, amt] of Object.entries(powerConsumption)) {
        consumption[res] = (consumption[res] || 0) + amt;
    }

    for (const u of units) {
        const unitData = GAME_DATA.units[u.unit_type];
        if (unitData && unitData.maintenance) {
            for (const [res, rate] of Object.entries(unitData.maintenance)) {
                if (res !== 'money') {
                    consumption[res] = (consumption[res] || 0) + (u.quantity * rate);
                }
            }
        }
    }

    // ─── APPLY CHANGES ───
    let money = nation.money + totalIncome - totalExpenses;

    // Negative money penalty: military deserts
    if (money < 0) {
        const desertRate = GAME_DATA.balance.desertionRate;
        for (const u of units) {
            if (u.quantity > 0) {
                const lost = Math.max(1, Math.floor(u.quantity * desertRate));
                db.prepare('UPDATE military SET quantity = MAX(0, quantity - ?) WHERE nation_id = ? AND unit_type = ?')
                    .run(lost, nation.id, u.unit_type);
            }
        }
        money = 0; // Floor at 0
    }

    let food = Math.max(0, nation.food + (production.food || 0) - (consumption.food || 0));
    let steel = Math.max(0, nation.steel + (production.steel || 0) - (consumption.steel || 0));
    let oil = Math.max(0, nation.oil + (production.oil || 0) - (consumption.oil || 0));
    let aluminum = Math.max(0, nation.aluminum + (production.aluminum || 0) - (consumption.aluminum || 0));
    let munitions = Math.max(0, nation.munitions + (production.munitions || 0) - (consumption.munitions || 0));
    let uranium = Math.max(0, nation.uranium + (production.uranium || 0) - (consumption.uranium || 0));
    let rare = Math.max(0, nation.rare + (production.rare || 0) - (consumption.rare || 0));
    let iron = Math.max(0, nation.iron + (production.iron || 0) - (consumption.iron || 0));
    let bauxite = Math.max(0, nation.bauxite + (production.bauxite || 0) - (consumption.bauxite || 0));

    db.prepare(`UPDATE nations SET 
        money = ?, food = ?, steel = ?, oil = ?, aluminum = ?, munitions = ?, uranium = ?, rare = ?, iron = ?, bauxite = ?
        WHERE id = ?`).run(money, food, steel, oil, aluminum, munitions, uranium, rare, iron, bauxite, nation.id);

    // ─── POPULATION GROWTH ───
    for (const city of cities) {
        const isCapital = city.id === nation.capital_city_id;
        const hasFoodSurplus = (production.food || 0) > (consumption.food || 0);
        let growthRate = GAME_DATA.balance.popGrowthRate * (hasFoodSurplus ? 1 : -0.5);

        // Tax Growth Penalty: High taxes stifle growth
        if (nation.tax_rate > 0.20) {
            growthRate *= (1 - (nation.tax_rate - 0.20) * 2);
        }

        if (isCapital) growthRate *= 1.2; // 20% faster growth in capital

        const approvalMod = nation.approval / 100;
        const diseasePenalty = Math.max(0.1, 1 - (city.disease / 100));

        // Smart City Mechanics: Population cap based on Infrastructure and Land
        const totalImps = db.prepare('SELECT SUM(quantity) as count FROM city_improvements WHERE city_id = ?').get(city.id).count || 0;
        const b = GAME_DATA.balance;
        const maxPop = Math.max(100, (city.infrastructure * b.popCapPerInfra) + (city.land * b.popCapPerLand) - (totalImps * b.popCapImpPenalty));

        let newPop = city.population;

        if (city.population > maxPop) {
            // Overpopulated: Citizens leave due to lack of housing infrastructure
            const overpop = city.population - maxPop;
            const flightRate = 0.05; // 5% leave per tick
            newPop -= Math.floor(overpop * flightRate);
            if (newPop < maxPop) newPop = maxPop;
        } else {
            // Normal Growth under the cap
            const landGrowthBonus = 1 + (Math.floor(city.land / 500) * 0.01);
            const growth = Math.floor(city.population * growthRate * approvalMod * diseasePenalty * landGrowthBonus);
            newPop = Math.max(10, city.population + growth);
            if (newPop > maxPop) newPop = maxPop; // Hard cap on normal growth
        }

        // ─── CRIME, DISEASE, & POLLUTION DRIFT ───

        // Base drift logic: High population density breeds crime/disease. Improvements reduce it.
        const density = newPop / Math.max(1, city.land); // Pop per unit of land.
        let newPollution = city.pollution;
        let newCrime = city.crime;
        let newDisease = city.disease;

        // Tally up countering buildings
        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);
        let pollutionModifier = 0;
        let crimeModifier = 0;
        let diseaseModifier = 0;

        for (const imp of imps) {
            const impData = GAME_DATA.improvements[imp.improvement_type];
            if (impData) {
                if (impData.pollution) pollutionModifier += imp.quantity * impData.pollution;
                if (impData.crime) crimeModifier += imp.quantity * impData.crime;
                if (impData.disease) diseaseModifier += imp.quantity * impData.disease;
            }
        }

        // Calculate Natural Targets based on density and buildings
        const densityLog = Math.max(0, Math.log10(density + 1));

        const targetPollution = (densityLog * 15) + pollutionModifier;
        const targetCrime = (densityLog * 15) + crimeModifier;
        const targetDisease = (densityLog * 15) + (newPollution / 5) + diseaseModifier;

        // Apply 15% drift toward target each turn
        const DRIFT_RATE = 0.15;
        newPollution += (targetPollution - newPollution) * DRIFT_RATE;
        newCrime += (targetCrime - newCrime) * DRIFT_RATE;
        newDisease += (targetDisease - newDisease) * DRIFT_RATE;

        // Normalize bounds (0 to 100)
        newPollution = Math.max(0, Math.min(100, Math.round(newPollution)));
        newCrime = Math.max(0, Math.min(100, Math.round(newCrime)));
        newDisease = Math.max(0, Math.min(100, Math.round(newDisease)));

        db.prepare('UPDATE cities SET population = ?, pollution = ?, crime = ?, disease = ? WHERE id = ?')
            .run(newPop, newPollution, newCrime, newDisease, city.id);
    }

    // ─── APPROVAL UPDATE ───
    let approval = GAME_DATA.balance.baseApproval;
    const gov = GAME_DATA.governments[nation.government];
    if (gov) {
        for (const b of gov.bonuses) { if (b.stat === 'approval') approval += b.value; }
        for (const p of gov.penalties) { if (p.stat === 'approval') approval += p.value; }
    }
    if (completedResearch.includes('green_energy')) approval += 5;

    approval += warPolicyData.approvalMod || 0;

    // Quadratic Tax Penalty: Higher taxes = exponentially more anger
    const taxDiff = Math.max(0, nation.tax_rate - GAME_DATA.balance.baseTaxRate);
    approval -= (taxDiff * 100) * (1 + taxDiff * 10);

    approval += nation.social_spending * 50;

    // War exhaustion
    const activeWars = db.prepare("SELECT COUNT(*) as c FROM wars WHERE status = 'active' AND (attacker_id = ? OR defender_id = ?)").get(nation.id, nation.id).c;
    approval -= activeWars * GAME_DATA.balance.warExhaustionApproval;

    // City improvements (National Approval Bonus)
    for (const city of cities) {
        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);

        for (const imp of imps) {
            if (imp.improvement_type === 'stadium') {
                approval += imp.quantity * 5;
            }
            if (imp.improvement_type === 'hospital') {
                approval += imp.quantity * 3;
            }
            if (imp.improvement_type === 'subway') {
                approval += imp.quantity * 4;
            }
        }
    }

    // Negative money = unhappy citizens
    if (nation.money <= 0) approval -= 15;

    approval = Math.max(0, Math.min(100, Math.round(approval)));

    // ─── STABILITY ───
    let stability = 70;
    if (gov) {
        for (const b of gov.bonuses) { if (b.stat === 'stability') stability += b.value; }
        for (const p of gov.penalties) { if (p.stat === 'stability') stability += p.value; }
    }

    // High Tax Stability Penalty: Over 25% starts hitting stability
    if (nation.tax_rate > 0.25) {
        stability -= (nation.tax_rate - 0.25) * 100;
    }
    for (const city of cities) {
        const policeRow = db.prepare('SELECT quantity FROM city_improvements WHERE city_id = ? AND improvement_type = ?').get(city.id, 'police_station');
        if (policeRow) stability += policeRow.quantity * 3;
    }
    if (approval < 30) stability -= 20;
    else if (approval < 50) stability -= 10;
    stability -= activeWars * GAME_DATA.balance.warExhaustionStability;
    if (nation.money <= 0) stability -= 10;
    stability = Math.max(0, Math.min(100, Math.round(stability)));

    db.prepare('UPDATE nations SET approval = ?, stability = ? WHERE id = ?').run(approval, stability, nation.id);

    // ─── CITY HAPPINESS SYNC ───
    for (const city of cities) {
        // Fetch the local stats we just updated in the pop loop
        const local = db.prepare('SELECT pollution, crime, disease FROM cities WHERE id = ?').get(city.id);
        const cityQuality = 100 - (local.pollution * 0.4 + local.crime * 0.3 + local.disease * 0.3);

        // Fetch improvements for local happiness boost
        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);
        let buildingHappinessBonus = 0;
        for (const imp of imps) {
            if (imp.improvement_type === 'stadium') buildingHappinessBonus += imp.quantity * 5;
            if (imp.improvement_type === 'hospital') buildingHappinessBonus += imp.quantity * 2;
            if (imp.improvement_type === 'subway') buildingHappinessBonus += imp.quantity * 4;
        }

        const baseHappiness = (approval * 0.7) + (cityQuality * 0.3);
        const targetHappiness = baseHappiness + buildingHappinessBonus;

        let cityHappiness = city.happiness || 50;
        const drift = (targetHappiness - cityHappiness) * 0.1;
        cityHappiness += drift;

        db.prepare('UPDATE cities SET happiness = ? WHERE id = ?').run(Math.max(0, Math.min(100, Math.round(cityHappiness))), city.id);
    }

    // ─── RECALC STATS ───
    const newPop = db.prepare('SELECT SUM(population) as p FROM cities WHERE nation_id = ?').get(nation.id).p || 0;
    let milStr = 0;
    const freshUnits = db.prepare('SELECT unit_type, quantity FROM military WHERE nation_id = ?').all(nation.id);
    for (const u of freshUnits) {
        const unitData = GAME_DATA.units[u.unit_type];
        if (unitData) milStr += u.quantity * unitData.strength;
    }
    let gdp = Math.floor(newPop * 0.5) + totalCommerce;
    const score = Math.floor(newPop / 100) + Math.floor(milStr / 10) + (cities.length * 50) + Math.floor(gdp / 100);

    db.prepare('UPDATE nations SET population = ?, military_strength = ?, gdp = ?, score = ?, last_turn_processed = ? WHERE id = ?')
        .run(newPop, milStr, gdp, score, turn, nation.id);

    // ─── STORE INCOME BREAKDOWN (for UI) ───
    const breakdown = JSON.stringify({
        taxIncome: totalTaxIncome,
        commerce: totalCommerce,
        continentBonus: continentMoneyBonus,
        totalIncome,
        milExpenses,
        socialExpenses,
        infraExpenses,
        improvementUpkeep: totalUpkeep,
        totalExpenses,
        netIncome: totalIncome - totalExpenses,
        production,
        consumption,
        cityStats // New per-city stats
    });
    const bKey = `income_${nation.id}`;
    const existing = db.prepare('SELECT key FROM game_state WHERE key = ?').get(bKey);
    if (existing) {
        db.prepare('UPDATE game_state SET value = ? WHERE key = ?').run(breakdown, bKey);
    } else {
        db.prepare('INSERT INTO game_state (key, value) VALUES (?, ?)').run(bKey, breakdown);
    }
}

function getGovMod(government, stat) {
    const gov = GAME_DATA.governments[government];
    if (!gov) return 0;
    let mod = 0;
    for (const b of gov.bonuses) { if (b.stat === stat) mod += b.value; }
    for (const p of gov.penalties) { if (p.stat === stat) mod += p.value; }
    return mod;
}

function applyWarLoot(db, war, outcome) {
    const winnerId = outcome === 'attacker_victory' ? war.attacker_id : war.defender_id;
    const loserId = outcome === 'attacker_victory' ? war.defender_id : war.attacker_id;
    const loser = db.prepare('SELECT * FROM nations WHERE id = ?').get(loserId);
    if (!loser) return;

    const pct = GAME_DATA.balance.lootPercentage;
    const resources = ['money', 'food', 'steel', 'oil', 'aluminum', 'munitions', 'uranium', 'rare'];
    for (const r of resources) {
        const loot = Math.floor((loser[r] || 0) * pct);
        if (loot > 0) {
            db.prepare(`UPDATE nations SET ${r} = ${r} - ? WHERE id = ?`).run(loot, loserId);
            db.prepare(`UPDATE nations SET ${r} = ${r} + ? WHERE id = ?`).run(loot, winnerId);
        }
    }
}

function fluctuateMarket(db, turn) {
    const resources = ['food', 'steel', 'oil', 'aluminum', 'munitions', 'uranium', 'rare'];
    for (const r of resources) {
        const rowPrice = db.prepare('SELECT value FROM game_state WHERE key = ?').get('market_' + r);
        let currentPrice = parseFloat(rowPrice?.value || '10');
        const rowPool = db.prepare('SELECT value FROM game_state WHERE key = ?').get('pool_' + r);
        let currentPool = parseFloat(rowPool?.value || '1000');

        const change = (Math.random() - 0.5) * 0.1;
        const newPrice = Math.max(1, Math.round(currentPrice * (1 + change)));

        // Supply slowly increases base pool slightly if it's very low, or shifts naturally
        const poolShift = Math.floor((Math.random() - 0.4) * 0.05 * currentPool);
        const newPool = Math.max(0, currentPool + poolShift);

        db.prepare('UPDATE game_state SET value = ? WHERE key = ?').run(String(newPrice), 'market_' + r);
        db.prepare('UPDATE game_state SET value = ? WHERE key = ?').run(String(newPool), 'pool_' + r);

        // Save history with both price and pool
        db.prepare('INSERT INTO market_history (resource, pool, price, turn) VALUES (?, ?, ?, ?)').run(r, newPool, newPrice, turn);
    }
}

module.exports = { processTick };
