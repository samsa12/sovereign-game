const db = require('better-sqlite3')('db/sovereign.db');
const { GAME_DATA } = require('./game/data');

function getGovMod(govType, stat) {
    const gov = GAME_DATA.governments[govType];
    if (!gov) return 0;
    let mod = 0;
    for (const b of gov.bonuses) { if (b.stat === stat) mod += b.value; }
    for (const p of gov.penalties) { if (p.stat === stat) mod += p.value; }
    return mod;
}

const nations = db.prepare('SELECT * FROM nations').all();
const turnsToRevert = 10;

console.log(`Reverting resources for ${nations.length} nations...`);

for (const nation of nations) {
    const cities = db.prepare('SELECT * FROM cities WHERE nation_id = ?').all(nation.id);
    const research = db.prepare('SELECT tech_id FROM research WHERE nation_id = ? AND completed = 1').all(nation.id).map(r => r.tech_id);
    const hasAutomation = research.includes('industrial_automation');
    const hasLogistics = research.includes('advanced_logistics');
    const warPolicyData = GAME_DATA.warPolicies[nation.war_policy] || GAME_DATA.warPolicies.normal;

    let totalIncome = 0;
    let totalExpenses = 0;
    const production = {};
    const powerPenalty = 1.0;

    for (const city of cities) {
        const isCapital = city.id === nation.capital_city_id;
        const capitalMultiplier = isCapital ? 1.1 : 1.0;
        const crimePenalty = Math.max(0.5, 1 - (city.crime / 100));

        // Tax Base (rough)
        const taxBase = (city.population * 0.5) * capitalMultiplier * crimePenalty;
        totalIncome += taxBase * nation.tax_rate;

        const cityLandEfficiency = 1 + (Math.floor(city.land / 500) * 0.02);

        const imps = db.prepare('SELECT improvement_type, quantity FROM city_improvements WHERE city_id = ?').all(city.id);
        for (const imp of imps) {
            const impData = GAME_DATA.improvements[imp.improvement_type];
            if (!impData) continue;

            if (impData.commerce) {
                totalIncome += (imp.quantity * impData.commerce) * capitalMultiplier * crimePenalty;
            }

            if (impData.produces && impData.rate) {
                let actualRate = imp.quantity * impData.rate * cityLandEfficiency;
                actualRate = Math.floor(actualRate * (1 + getGovMod(nation.government, 'resourceProd') / 100));
                if (hasAutomation) actualRate = Math.floor(actualRate * 1.10);
                actualRate = Math.floor(actualRate * warPolicyData.ecoMod);
                actualRate = Math.floor(actualRate * powerPenalty);

                production[impData.produces] = (production[impData.produces] || 0) + actualRate;

                if (isCapital) {
                    const bonus = Math.floor(actualRate * 0.10);
                    production[impData.produces] += bonus;
                }
            }

            if (impData.upkeep) totalExpenses += imp.quantity * impData.upkeep;
        }

        let cityInfraExpense = Math.floor(city.infrastructure * 2);
        if (hasLogistics) cityInfraExpense = Math.floor(cityInfraExpense * 0.8);
        totalExpenses += cityInfraExpense;
    }

    totalIncome = Math.floor(totalIncome * (1 + getGovMod(nation.government, 'commerce') / 100));

    const continent = GAME_DATA.continents[nation.continent];
    if (continent && continent.bonusStat === 'money') {
        totalIncome += Math.floor(totalIncome * (continent.bonusValue / 100));
    }
    totalIncome = Math.floor(totalIncome * warPolicyData.ecoMod);

    const milUnits = db.prepare('SELECT unit_type, quantity FROM military WHERE nation_id = ?').all(nation.id);
    for (const u of milUnits) {
        const uData = GAME_DATA.units[u.unit_type];
        if (uData && uData.maintenance.money) {
            totalExpenses += u.quantity * uData.maintenance.money;
        }
    }
    totalExpenses = Math.floor(totalExpenses * (1 + getGovMod(nation.government, 'militaryCost') / 100));

    const netMoney = Math.floor((totalIncome - totalExpenses) * turnsToRevert);

    if (netMoney > 0) {
        db.prepare('UPDATE nations SET money = MAX(0, money - ?) WHERE id = ?').run(netMoney, nation.id);
    }

    for (const [res, rate] of Object.entries(production)) {
        const total = Math.floor(rate * turnsToRevert);
        if (total > 0) {
            db.prepare(`UPDATE nations SET ${res} = MAX(0, ${res} - ?) WHERE id = ?`).run(total, nation.id);
        }
    }

    // Population Reversion (rough estimate 1.5% per turn)
    for (const city of cities) {
        const oldPop = Math.floor(city.population / Math.pow(1.015, turnsToRevert));
        db.prepare('UPDATE cities SET population = ? WHERE id = ?').run(Math.max(1000, oldPop), city.id);
    }
}

console.log("Reversion complete.");
