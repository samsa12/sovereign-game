/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — Server Game Data  (Phase 2 Rebalanced)
   Shared constants for backend processing (mirrors client data.js)
   ═══════════════════════════════════════════════════════════════ */

const GAME_DATA = {
    governments: {
        democracy: {
            name: 'Democracy', icon: '🗳️', desc: 'Government by the people.',
            bonuses: [{ stat: 'approval', value: 10, label: '+10 Approval' }, { stat: 'commerce', value: 10, label: '+10% Commerce' }],
            penalties: [{ stat: 'militaryCost', value: 10, label: '+10% Military Cost' }]
        },
        republic: {
            name: 'Republic', icon: '🏛️', desc: 'Elected representatives govern.',
            bonuses: [{ stat: 'taxIncome', value: 10, label: '+10% Tax Income' }, { stat: 'stability', value: 5, label: '+5 Stability' }],
            penalties: [{ stat: 'approval', value: -5, label: '-5 Approval' }]
        },
        monarchy: {
            name: 'Monarchy', icon: '👑', desc: 'Hereditary rule by a sovereign.',
            bonuses: [{ stat: 'stability', value: 15, label: '+15 Stability' }],
            penalties: [{ stat: 'approval', value: -10, label: '-10 Approval' }, { stat: 'commerce', value: -5, label: '-5% Commerce' }]
        },
        communist: {
            name: 'Communist State', icon: '☭', desc: 'State controls all means of production.',
            bonuses: [{ stat: 'resourceProd', value: 15, label: '+15% Resource Production' }, { stat: 'militaryCost', value: -15, label: '-15% Military Cost' }],
            penalties: [{ stat: 'commerce', value: -20, label: '-20% Commerce' }]
        },
        dictatorship: {
            name: 'Dictatorship', icon: '🦅', desc: 'Absolute rule by one leader.',
            bonuses: [{ stat: 'militaryCost', value: -20, label: '-20% Military Cost' }, { stat: 'stability', value: 10, label: '+10 Stability' }],
            penalties: [{ stat: 'approval', value: -15, label: '-15 Approval' }, { stat: 'commerce', value: -10, label: '-10% Commerce' }]
        },
        theocracy: {
            name: 'Theocracy', icon: '⛪', desc: 'Religious authority governs.',
            bonuses: [{ stat: 'approval', value: 5, label: '+5 Approval' }, { stat: 'stability', value: 10, label: '+10 Stability' }],
            penalties: [{ stat: 'commerce', value: -15, label: '-15% Commerce' }, { stat: 'resourceProd', value: -5, label: '-5% Resource Production' }]
        }
    },

    continents: {
        north_america: { name: 'North America', icon: '🌎', bonusStat: 'money', bonusValue: 5, bonus: '+5% Money Income' },
        south_america: { name: 'South America', icon: '🌎', bonusStat: 'food', bonusValue: 10, bonus: '+10% Food Production' },
        europe: { name: 'Europe', icon: '🌍', bonusStat: 'steel', bonusValue: 10, bonus: '+10% Steel Production' },
        africa: { name: 'Africa', icon: '🌍', bonusStat: 'oil', bonusValue: 10, bonus: '+10% Oil Production' },
        asia: { name: 'Asia', icon: '🌏', bonusStat: 'munitions', bonusValue: 10, bonus: '+10% Munitions Production' },
        oceania: { name: 'Oceania', icon: '🌏', bonusStat: 'aluminum', bonusValue: 10, bonus: '+10% Aluminum Production' }
    },

    improvements: {
        coal_plant: { name: 'Coal Plant', icon: '🏭', category: 'power', cost: 5000, maxPerCity: 5, power: 1200, pollution: 5, upkeep: 150, desc: 'Generates 1,200 MW. High pollution.' },
        oil_plant: { name: 'Oil Power Plant', icon: '🛢️', category: 'power', cost: 8000, maxPerCity: 3, consumes: { oil: 10 }, power: 2000, pollution: 3, upkeep: 250, desc: 'Generates 2,000 MW. Consumes 10 Oil/turn.' },
        nuclear_plant: { name: 'Nuclear Plant', icon: '☢️', category: 'power', cost: 100000, maxPerCity: 1, power: 6000, pollution: 1, upkeep: 1000, desc: 'Generates 6,000 MW. Ultra-clean and powerful.' },
        wind_farm: { name: 'Wind Farm', icon: '🌬️', category: 'power', cost: 12000, maxPerCity: 50, power: 800, pollution: 0, upkeep: 100, desc: 'Generates 800 MW. Silent and zero pollution.' },

        farm: { name: 'Farm', icon: '🌾', category: 'resource', cost: 2000, maxPerCity: 5, produces: 'food', rate: 100, upkeep: 20, powerUsage: 100, desc: 'Produces 100 Food/turn.' },
        iron_mine: { name: 'Iron Mine', icon: '⛏️', category: 'resource', cost: 4000, maxPerCity: 3, produces: 'iron', rate: 40, upkeep: 50, powerUsage: 200, desc: 'Produces 40 Iron/turn.' },
        steel_mill: { name: 'Steel Mill', icon: '🔩', category: 'manufacture', cost: 8000, maxPerCity: 2, consumes: { iron: 20 }, produces: 'steel', rate: 20, upkeep: 150, powerUsage: 500, desc: 'Consumes 20 Iron, Produces 20 Steel/turn.' },
        bauxite_mine: { name: 'Bauxite Mine', icon: '🪨', category: 'resource', cost: 5000, maxPerCity: 3, produces: 'bauxite', rate: 30, upkeep: 60, powerUsage: 250, desc: 'Produces 30 Bauxite/turn.' },
        lead_mine: { name: 'Lead Mine', icon: '💀', category: 'resource', cost: 4000, maxPerCity: 4, produces: 'munitions', rate: 18, upkeep: 50, powerUsage: 200, desc: 'Produces 18 Munitions/turn.' },
        aluminum_ref: { name: 'Aluminum Refinery', icon: '⚙️', category: 'manufacture', cost: 10000, maxPerCity: 2, consumes: { bauxite: 15 }, produces: 'aluminum', rate: 15, upkeep: 200, powerUsage: 600, desc: 'Consumes 15 Bauxite, Produces 15 Aluminum/turn.' },
        oil_well: { name: 'Oil Well', icon: '🛢️', category: 'resource', cost: 6000, maxPerCity: 3, produces: 'oil', rate: 25, upkeep: 100, powerUsage: 300, desc: 'Produces 25 Oil/turn.' },
        munitions_fac: { name: 'Munitions Factory', icon: '💥', category: 'manufacture', cost: 12000, maxPerCity: 2, consumes: { steel: 10, oil: 5 }, produces: 'munitions', rate: 20, upkeep: 250, powerUsage: 800, desc: 'Consumes 10 Steel & 5 Oil, Produces 20 Munitions/turn.' },
        uranium_mine: { name: 'Uranium Mine', icon: '☢️', category: 'resource', cost: 50000, maxPerCity: 1, produces: 'uranium', rate: 5, upkeep: 500, powerUsage: 1000, desc: 'Produces 5 Uranium/turn.' },
        rare_mine: { name: 'Rare Minerals Mine', icon: '💎', category: 'resource', cost: 40000, maxPerCity: 1, produces: 'rare', rate: 4, upkeep: 400, powerUsage: 800, desc: 'Produces 4 Rare Minerals/turn.' },

        bank: { name: 'Bank', icon: '🏦', category: 'commerce', cost: 10000, maxPerCity: 3, upkeep: 200, commerce: 1000, powerUsage: 200, desc: 'Increases city commerce by $1,000/turn.' },
        supermarket: { name: 'Supermarket', icon: '🏪', category: 'commerce', cost: 5000, maxPerCity: 3, upkeep: 100, commerce: 400, powerUsage: 150, desc: 'Increases city commerce by $400/turn.' },
        mall: { name: 'Shopping Mall', icon: '🏬', category: 'commerce', cost: 30000, maxPerCity: 2, upkeep: 500, commerce: 2500, powerUsage: 500, desc: 'Increases city commerce by $2,500/turn.' },
        stadium: { name: 'Stadium', icon: '🏟️', category: 'commerce', cost: 60000, maxPerCity: 1, upkeep: 1000, commerce: 5000, powerUsage: 1500, desc: 'Increases city commerce by $5,000 and Happiness by 5/turn.' },

        hospital: { name: 'Hospital', icon: '🏥', category: 'civil', cost: 15000, maxPerCity: 2, upkeep: 400, powerUsage: 400, disease: -10, desc: 'Reduces Disease significantly and improves local Happiness.' },
        police_station: { name: 'Police Station', icon: '🚔', category: 'civil', cost: 8000, maxPerCity: 3, upkeep: 200, powerUsage: 100, crime: -10, desc: 'Reduces Crime and increases local Stability.' },
        subway: { name: 'Subway System', icon: '🚇', category: 'civil', cost: 50000, maxPerCity: 1, upkeep: 1200, powerUsage: 2000, pollution: -5, desc: 'Increases city Happiness by 4/turn.' },
        recycling_center: { name: 'Recycling Center', icon: '♻️', category: 'civil', cost: 12000, maxPerCity: 2, pollution: -10, upkeep: 300, powerUsage: 300, desc: 'Reduces Pollution by 10/turn.' },
        university: { name: 'University', icon: '🎓', category: 'civil', cost: 30000, maxPerCity: 2, upkeep: 600, powerUsage: 500, desc: 'Increases national Research Speed by 5%.' },
        research_lab: { name: 'Research Lab', icon: '🔬', category: 'civil', cost: 80000, maxPerCity: 1, upkeep: 1500, powerUsage: 1200, desc: 'Increases national Research Speed by 15%.' },

        barracks: { name: 'Barracks', icon: '🏗️', category: 'military', cost: 6000, maxPerCity: 5, capacity: 5000, upkeep: 150, powerUsage: 100, desc: 'Provides 5,000 supply for Infantry/Soldiers.' },
        tank_factory: { name: 'Arms Factory', icon: '🏭', category: 'military', cost: 20000, maxPerCity: 3, capacity: 100, upkeep: 400, powerUsage: 500, desc: 'Provides 100 supply for Tanks and Artillery.' },
        hangar: { name: 'Air Hangar', icon: '✈️', category: 'military', cost: 50000, maxPerCity: 2, capacity: 30, upkeep: 1000, powerUsage: 1000, desc: 'Provides 30 supply for Aircraft.' },
        drydock: { name: 'Drydock', icon: '⚓', category: 'military', cost: 80000, maxPerCity: 2, capacity: 10, upkeep: 1500, powerUsage: 1500, desc: 'Provides 10 supply for Navy ships.' },
        missile_pad: { name: 'Missile Launch Pad', icon: '🚀', category: 'military', cost: 200000, maxPerCity: 1, capacity: 5, upkeep: 3000, powerUsage: 3000, desc: 'Provides 5 supply for Strategic missiles.' },
        nuke_facility: { name: 'Nuclear Research Lab', icon: '☢️', category: 'military', cost: 100000, maxPerCity: 1, capacity: 1, upkeep: 5000, powerUsage: 2000, desc: 'Develops nuclear weapons. Extremely expensive.' },
        intel_agency: { name: 'Intelligence Agency', icon: '🕵️', category: 'military', cost: 100000, maxPerCity: 1, upkeep: 2000, powerUsage: 1000, desc: 'Increases Spy Capacity by 2 and halves mission restoration time.' }
    },

    units: {
        infantry: { name: 'Infantry', icon: '🪖', branch: 'Army', strength: 1, defense: 2, speed: 1, cost: { money: 5, munitions: 0.01 }, maintenance: { money: 0.5 }, requires: 'barracks' },
        mech_infantry: { name: 'Mechanized Infantry', icon: '🚛', branch: 'Army', strength: 3, defense: 3, speed: 3, cost: { money: 40, steel: 1, oil: 0.5 }, maintenance: { money: 3, oil: 0.01 }, requires: 'barracks' },
        tanks: { name: 'Tanks', icon: '🛡️', branch: 'Army', strength: 10, defense: 8, speed: 2, cost: { money: 200, steel: 5, munitions: 2 }, maintenance: { money: 10, oil: 0.1 }, requires: 'tank_factory' },
        artillery: { name: 'Artillery', icon: '💣', branch: 'Army', strength: 12, defense: 2, speed: 1, cost: { money: 150, steel: 3, munitions: 3 }, maintenance: { money: 8, munitions: 0.05 }, requires: 'tank_factory' },
        special_forces: { name: 'Special Forces', icon: '🎯', branch: 'Army', strength: 8, defense: 6, speed: 5, cost: { money: 100, munitions: 1 }, maintenance: { money: 15 }, requires: 'barracks' },
        anti_air: { name: 'Anti-Air Battery', icon: '🔫', branch: 'Army', strength: 3, defense: 15, speed: 1, cost: { money: 100, steel: 2, munitions: 2 }, maintenance: { money: 5, munitions: 0.05 }, requires: 'tank_factory' },
        fighters: { name: 'Fighter Jets', icon: '✈️', branch: 'Air Force', strength: 15, defense: 10, speed: 10, cost: { money: 500, aluminum: 5, oil: 3 }, maintenance: { money: 25, oil: 0.2 }, requires: 'hangar' },
        bombers: { name: 'Bombers', icon: '💥', branch: 'Air Force', strength: 25, defense: 5, speed: 6, cost: { money: 800, aluminum: 8, oil: 5, munitions: 5 }, maintenance: { money: 40, oil: 0.3 }, requires: 'hangar' },
        helicopters: { name: 'Helicopters', icon: '🚁', branch: 'Air Force', strength: 8, defense: 5, speed: 7, cost: { money: 300, aluminum: 3, oil: 2 }, maintenance: { money: 15, oil: 0.15 }, requires: 'hangar' },
        drones: { name: 'Combat Drones', icon: '🤖', branch: 'Air Force', strength: 6, defense: 2, speed: 8, cost: { money: 200, aluminum: 2, rare: 1 }, maintenance: { money: 10 }, requires: 'hangar' },
        destroyers: { name: 'Destroyers', icon: '🚢', branch: 'Navy', strength: 20, defense: 15, speed: 4, cost: { money: 1000, steel: 20, oil: 10 }, maintenance: { money: 50, oil: 0.5 }, requires: 'drydock' },
        frigates: { name: 'Frigates', icon: '⛵', branch: 'Navy', strength: 12, defense: 10, speed: 5, cost: { money: 600, steel: 10, oil: 5 }, maintenance: { money: 30, oil: 0.3 }, requires: 'drydock' },
        submarines: { name: 'Submarines', icon: '🐟', branch: 'Navy', strength: 18, defense: 12, speed: 3, cost: { money: 1500, steel: 25, oil: 8 }, maintenance: { money: 60, oil: 0.4 }, requires: 'drydock' },
        carriers: { name: 'Aircraft Carriers', icon: '🛳️', branch: 'Navy', strength: 30, defense: 20, speed: 2, cost: { money: 5000, steel: 50, oil: 20, aluminum: 15 }, maintenance: { money: 200, oil: 1 }, requires: 'drydock' },
        battleships: { name: 'Battleships', icon: '🛳️', branch: 'Navy', strength: 35, defense: 25, speed: 3, cost: { money: 2500, steel: 40, oil: 15, munitions: 10 }, maintenance: { money: 100, oil: 0.8 }, requires: 'drydock' },
        cruise_missile: { name: 'Cruise Missiles', icon: '🚀', branch: 'Strategic', strength: 40, defense: 0, speed: 10, cost: { money: 500, steel: 5, munitions: 10 }, maintenance: { money: 5 }, requires: 'missile_pad', singleUse: true },
        ballistic_missile: { name: 'Ballistic Missiles', icon: '☄️', branch: 'Strategic', strength: 80, defense: 0, speed: 10, cost: { money: 2000, steel: 10, munitions: 20, uranium: 1 }, maintenance: { money: 20 }, requires: 'missile_pad', singleUse: true },
        nuclear_warhead: { name: 'Nuclear Warhead Payload', icon: '☢️', branch: 'Strategic', strength: 0, defense: 0, speed: 0, cost: { money: 10000, uranium: 10, rare: 5 }, maintenance: { money: 0 }, requires: 'missile_pad', isPayload: true },
        missile_defense: { name: 'Missile Defense', icon: '🛡️', branch: 'Strategic', strength: 0, defense: 100, speed: 10, cost: { money: 10000, steel: 10, rare: 5 }, maintenance: { money: 50 }, requires: 'missile_pad' }
    },

    battleTypes: {
        ground_assault: { name: 'Ground Assault', icon: '🪖', desc: 'Full ground attack', primaryBranch: 'Army', terrainMod: { mountain: 0.6, forest: 0.8, urban: 0.7 } },
        air_strike: { name: 'Air Strike', icon: '✈️', desc: 'Air superiority attack', primaryBranch: 'Air Force', terrainMod: { forest: 0.9, urban: 0.8 } },
        naval_bombardment: { name: 'Naval Bombardment', icon: '🛳️', desc: 'Naval attack', primaryBranch: 'Navy', terrainMod: { coastal: 1.3, mountain: 0.3 } },
        missile_strike: { name: 'Missile Strike', icon: '🚀', desc: 'Precision missile attack', primaryBranch: 'Strategic', terrainMod: {} },
        combined_arms: { name: 'Combined Arms', icon: '⚔️', desc: 'Multi-branch assault', primaryBranch: 'all', terrainMod: {} }
    },

    defensivePostures: {
        dig_in: { name: 'Dig In', defenseMultiplier: 1.5, counterChance: 0, preserveUnits: 0 },
        counter_attack: { name: 'Counter Attack', defenseMultiplier: 1.0, counterChance: 0.4, preserveUnits: 0 },
        guerrilla: { name: 'Guerrilla', defenseMultiplier: 1.2, counterChance: 0.2, preserveUnits: 0.3 },
        retreat: { name: 'Strategic Retreat', defenseMultiplier: 0.5, counterChance: 0, preserveUnits: 0.7 }
    },

    treatyTypes: {
        mdp: { name: 'Mutual Defense Pact', abbr: 'MDP' },
        odp: { name: 'Optional Defense Pact', abbr: 'ODP' },
        nap: { name: 'Non-Aggression Pact', abbr: 'NAP' },
        trade: { name: 'Trade Agreement', abbr: 'TRADE' },
        embargo: { name: 'Embargo', abbr: 'EMBARGO' }
    },

    spyMissions: {
        gather_intel: { name: 'Gather Intel', icon: '🔍', desc: 'Reveal enemy military and resources', cost: 5000, risk: 0.1 },
        sabotage: { name: 'Sabotage', icon: '💣', desc: 'Destroy enemy infrastructure', cost: 10000, risk: 0.3 },
        steal_tech: { name: 'Steal Tech', icon: '🔬', desc: 'Steal rare minerals', cost: 15000, risk: 0.4 },
        propaganda: { name: 'Propaganda', icon: '📢', desc: 'Reduce enemy approval', cost: 8000, risk: 0.2 },
        assassinate: { name: 'Assassinate', icon: '🗡️', desc: 'Destabilize enemy leadership', cost: 50000, risk: 0.6 }
    },

    resources: {
        money: { name: 'Money', icon: '💰' },
        food: { name: 'Food', icon: '🌾' },
        steel: { name: 'Steel', icon: '🔩' },
        oil: { name: 'Oil', icon: '🛢️' },
        aluminum: { name: 'Aluminum', icon: '⚙️' },
        munitions: { name: 'Munitions', icon: '💣' },
        uranium: { name: 'Uranium', icon: '☢️' },
        rare: { name: 'Rare Minerals', icon: '💎' },
        iron: { name: 'Iron', icon: '⛓️' },
        bauxite: { name: 'Bauxite', icon: '🪨' }
    },

    // ─── War Policies ───
    warPolicies: {
        normal: {
            name: 'Normal', icon: '⚖️', desc: 'Balanced approach to foreign affairs.',
            attackMod: 1.0, defenseMod: 1.0, ecoMod: 1.0, approvalMod: 0
        },
        aggressive: {
            name: 'Aggressive', icon: '🗡️', desc: 'Focus on expansion and offense.',
            attackMod: 1.2, defenseMod: 0.9, ecoMod: 0.95, approvalMod: -10
        },
        defensive: {
            name: 'Defensive', icon: '🛡️', desc: 'Focus on protecting the homeland.',
            attackMod: 0.8, defenseMod: 1.25, ecoMod: 1.0, approvalMod: 5
        },
        pacifist: {
            name: 'Pacifist', icon: '🕊️', desc: 'Focus completely on the economy. Very weak military.',
            attackMod: 0.5, defenseMod: 0.7, ecoMod: 1.15, approvalMod: 10
        }
    },

    // ─── National Bonus Resources ───
    bonusResources: {
        food: { name: 'Agricultural Surplus', icon: '🍞', bonus: 10, desc: '+10% Food Production' },
        steel: { name: 'Industrial Might', icon: '⛓️', bonus: 10, desc: '+10% Steel Production' },
        oil: { name: 'Energy Independence', icon: '🛢️', bonus: 10, desc: '+10% Oil Production' },
        aluminum: { name: 'Aviation Focus', icon: '📎', bonus: 10, desc: '+10% Aluminum Production' },
        munitions: { name: 'Arms Manufacturer', icon: '📦', bonus: 10, desc: '+10% Munitions Production' },
        uranium: { name: 'Nuclear Energy', icon: '☢️', bonus: 10, desc: '+10% Uranium Production' },
        rare: { name: 'High-Tech Exports', icon: '💎', bonus: 10, desc: '+10% Rare Production' },
        iron: { name: 'Mining Giants', icon: '⛏️', bonus: 10, desc: '+10% Iron Production' },
        bauxite: { name: 'Resource Richness', icon: '🪨', bonus: 10, desc: '+10% Bauxite Production' }
    },

    balance: {
        baseTaxRate: 0.15,
        maxTaxRate: 0.40,
        minTaxRate: 0.0,
        maxCities: 999,
        newCityBaseCost: 75000,             // escalates: baseCost * 2^(cityCount-1)
        cityInfrastructureCostPer: 200,     // scales with current infra level
        popCapPerInfra: 500,                // population capacity per unit of infrastructure
        popCapPerLand: 25,                  // population capacity per unit of land
        popCapImpPenalty: 100,              // population capacity lost per built improvement
        popGrowthRate: 0.02,
        baseApproval: 60,
        warScoreRange: 0.4,                 // min/max score ratio for declaring war
        warScoreAutoEnd: 100,               // auto-peace at this war score
        maxOffensiveWars: 3,                // max concurrent offensive wars
        warCooldownTurns: 12,               // turns before re-declaring on same nation
        tradeMarkup: 0.05,
        maxTradeAmount: 999999,             // no practical limit
        maxTradesPerHour: 9999,
        maxMessagesPerHour: 9999,
        spyCooldownTurns: 6,                // turns between spy missions vs same target
        rateLimitPerMinute: 30,             // API calls per minute per user
        desertionRate: 0.05,                // 5% military lost if treasury < 0
        warExhaustionApproval: 2,           // approval lost per active war per turn
        warExhaustionStability: 3,          // stability lost per active war per turn
        lootPercentage: 0.10                // 10% of loser treasury/resources on peace
    },
    research: {
        industrial_automation: {
            name: 'Industrial Automation',
            icon: '🤖',
            desc: 'Increases all resource production by 10%.',
            cost: 50000,
            minApproval: 50,
            turns: 12, // ~1 day
            bonus: { type: 'production', value: 0.10 }
        },
        green_energy: {
            name: 'Green Energy',
            icon: '🍃',
            desc: 'Reduces power plant upkeep and increases happiness.',
            cost: 30000,
            minApproval: 60,
            turns: 8,
            bonus: { type: 'happiness', value: 5 }
        },
        advanced_logistics: {
            name: 'Advanced Logistics',
            icon: '🚛',
            desc: 'Reduces infrastructure upkeep by 20%.',
            cost: 40000,
            minApproval: 55,
            turns: 10,
            bonus: { type: 'upkeep', value: -0.20 }
        }
    }
};

module.exports = { GAME_DATA };
