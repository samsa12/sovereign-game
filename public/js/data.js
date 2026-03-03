/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — Game Data & Constants
   All static game data: government types, resources, units, etc.
   ═══════════════════════════════════════════════════════════════ */

const DATA = {

    // ─── Government Types ───
    governments: {
        democracy: {
            name: 'Democracy',
            icon: '🗳️',
            desc: 'A government elected by the people, with individual freedoms and market economy.',
            bonuses: [
                { stat: 'commerce', value: 20, label: '+20% Commerce Income' },
                { stat: 'approval', value: 10, label: '+10 Approval Rating' }
            ],
            penalties: [
                { stat: 'militaryCost', value: 10, label: '+10% Military Cost' },
                { stat: 'warApproval', value: -15, label: '-15 War Approval Penalty' }
            ]
        },
        monarchy: {
            name: 'Monarchy',
            icon: '👑',
            desc: 'A hereditary ruler with centralized authority and strong traditions.',
            bonuses: [
                { stat: 'taxIncome', value: 15, label: '+15% Tax Income' },
                { stat: 'stability', value: 10, label: '+10 Stability' }
            ],
            penalties: [
                { stat: 'techRate', value: -10, label: '-10% Research Speed' },
                { stat: 'approval', value: -5, label: '-5 Approval Rating' }
            ]
        },
        communist: {
            name: 'Communist State',
            icon: '⭐',
            desc: 'State-controlled economy with collective ownership and centralized planning.',
            bonuses: [
                { stat: 'resourceProd', value: 20, label: '+20% Resource Production' },
                { stat: 'militaryStr', value: 10, label: '+10% Unit Strength' }
            ],
            penalties: [
                { stat: 'commerce', value: -25, label: '-25% Commerce Income' },
                { stat: 'approval', value: -10, label: '-10 Approval Rating' }
            ]
        },
        dictatorship: {
            name: 'Dictatorship',
            icon: '🦅',
            desc: 'An authoritarian regime with absolute control and swift decision-making.',
            bonuses: [
                { stat: 'militaryCost', value: -20, label: '-20% Military Cost' },
                { stat: 'warApproval', value: 0, label: 'No War Approval Penalty' }
            ],
            penalties: [
                { stat: 'commerce', value: -15, label: '-15% Commerce Income' },
                { stat: 'approval', value: -20, label: '-20 Approval Rating' }
            ]
        },
        theocracy: {
            name: 'Theocracy',
            icon: '🕌',
            desc: 'A government guided by religious principles and spiritual authority.',
            bonuses: [
                { stat: 'approval', value: 20, label: '+20 Approval Rating' },
                { stat: 'stability', value: 15, label: '+15 Stability' }
            ],
            penalties: [
                { stat: 'techRate', value: -20, label: '-20% Research Speed' },
                { stat: 'commerce', value: -10, label: '-10% Commerce Income' }
            ]
        },
        anarchy: {
            name: 'Anarchy',
            icon: 'Ⓐ',
            desc: 'No central government. Maximum freedom but minimal organization.',
            bonuses: [
                { stat: 'militaryCost', value: -15, label: '-15% Military Cost' },
                { stat: 'raidLoot', value: 25, label: '+25% Raid Loot' }
            ],
            penalties: [
                { stat: 'taxIncome', value: -30, label: '-30% Tax Income' },
                { stat: 'stability', value: -25, label: '-25 Stability' }
            ]
        }
    },

    // ─── Continents ───
    continents: {
        north_america: {
            name: 'North America',
            icon: '🌎',
            bonus: '+10% Commerce',
            bonusStat: 'commerce',
            bonusValue: 10
        },
        south_america: {
            name: 'South America',
            icon: '🌎',
            bonus: '+10% Food Production',
            bonusStat: 'food',
            bonusValue: 10
        },
        europe: {
            name: 'Europe',
            icon: '🌍',
            bonus: '+10% Research Speed',
            bonusStat: 'techRate',
            bonusValue: 10
        },
        africa: {
            name: 'Africa',
            icon: '🌍',
            bonus: '+15% Mining Output',
            bonusStat: 'mining',
            bonusValue: 15
        },
        asia: {
            name: 'Asia',
            icon: '🌏',
            bonus: '+10% Manufacturing',
            bonusStat: 'manufacturing',
            bonusValue: 10
        },
        oceania: {
            name: 'Oceania',
            icon: '🌏',
            bonus: '+15% Naval Strength',
            bonusStat: 'navalStr',
            bonusValue: 15
        }
    },

    // ─── Resources ───
    resources: {
        money: { name: 'Money', icon: '💵', color: '#f59e0b', unit: '$' },
        food: { name: 'Food', icon: '🌾', color: '#10b981', unit: 'tons' },
        steel: { name: 'Steel', icon: '🔩', color: '#94a3b8', unit: 'tons' },
        oil: { name: 'Oil', icon: '🛢️', color: '#1e293b', unit: 'bbl' },
        aluminum: { name: 'Aluminum', icon: '⚙️', color: '#cbd5e1', unit: 'tons' },
        munitions: { name: 'Munitions', icon: '💣', color: '#ef4444', unit: 'tons' },
        uranium: { name: 'Uranium', icon: '☢️', color: '#8b5cf6', unit: 'kg' },
        rare: { name: 'Rare Minerals', icon: '💎', color: '#06b6d4', unit: 'kg' }
    },

    // ─── City Improvements ───
    improvements: {
        // Power
        coal_plant: { name: 'Coal Power Plant', category: 'power', icon: '🏭', cost: 5000, power: 1200, pollution: 20, maxPerCity: 5, desc: 'Generates power from coal. Causes pollution.' },
        oil_plant: { name: 'Oil Power Plant', category: 'power', icon: '⚡', cost: 7000, power: 2000, pollution: 15, maxPerCity: 3, desc: 'Efficient power from oil refining.' },
        nuclear_plant: { name: 'Nuclear Power Plant', category: 'power', icon: '☢️', cost: 30000, power: 8000, pollution: 0, maxPerCity: 1, requires: 'uranium', desc: 'Clean enormous energy. Requires uranium.' },
        wind_farm: { name: 'Wind Farm', category: 'power', icon: '💨', cost: 8000, power: 600, pollution: 0, maxPerCity: 4, desc: 'Clean but moderate power output.' },

        // Resource Production
        farm: { name: 'Farm', category: 'resource', icon: '🌾', cost: 1500, produces: 'food', rate: 50, maxPerCity: 10, desc: 'Produces food to feed your population.' },
        iron_mine: { name: 'Iron Mine', category: 'resource', icon: '⛏️', cost: 3000, produces: 'steel', rate: 20, maxPerCity: 5, desc: 'Extracts iron ore for steel production.' },
        oil_well: { name: 'Oil Well', category: 'resource', icon: '🛢️', cost: 4000, produces: 'oil', rate: 15, maxPerCity: 4, desc: 'Extracts crude oil.' },
        bauxite_mine: { name: 'Bauxite Mine', category: 'resource', icon: '🏔️', cost: 3500, produces: 'aluminum', rate: 15, maxPerCity: 4, desc: 'Mines bauxite for aluminum refining.' },
        lead_mine: { name: 'Lead Mine', category: 'resource', icon: '💀', cost: 2500, produces: 'munitions', rate: 18, maxPerCity: 4, desc: 'Produces lead for munitions manufacturing.' },
        uranium_mine: { name: 'Uranium Mine', category: 'resource', icon: '☢️', cost: 12000, produces: 'uranium', rate: 3, maxPerCity: 2, desc: 'Extracts enriched uranium. Very expensive.' },
        rare_mine: { name: 'Rare Earth Mine', category: 'resource', icon: '💎', cost: 10000, produces: 'rare', rate: 5, maxPerCity: 2, desc: 'Mines rare minerals for advanced tech.' },

        // Manufacturing
        steel_mill: { name: 'Steel Mill', category: 'manufacture', icon: '🔩', cost: 5000, produces: 'steel', rate: 15, consumes: { steel: 5 }, powerUsage: 400, maxPerCity: 3, desc: 'Refines raw iron into high-grade steel.' },
        munitions_fac: { name: 'Munitions Factory', category: 'manufacture', icon: '💣', cost: 4500, produces: 'munitions', rate: 12, consumes: { munitions: 5 }, powerUsage: 300, maxPerCity: 3, desc: 'Manufactures ammunition and explosives.' },
        aluminum_ref: { name: 'Aluminum Refinery', category: 'manufacture', icon: '⚙️', cost: 5500, produces: 'aluminum', rate: 10, consumes: { aluminum: 5 }, powerUsage: 500, maxPerCity: 3, desc: 'Refines bauxite into usable aluminum.' },

        // Commerce
        bank: { name: 'Bank', category: 'commerce', icon: '🏦', cost: 6000, income: 500, maxPerCity: 5, desc: 'Generates steady income through financial services.' },
        supermarket: { name: 'Supermarket', category: 'commerce', icon: '🏪', cost: 2000, income: 150, maxPerCity: 6, desc: 'Retail commerce that boosts GDP.' },
        mall: { name: 'Shopping Mall', category: 'commerce', icon: '🏬', cost: 8000, income: 800, powerUsage: 200, maxPerCity: 3, desc: 'Large commercial center with high revenue.' },
        stadium: { name: 'Stadium', category: 'commerce', icon: '🏟️', cost: 10000, income: 600, approval: 5, powerUsage: 300, maxPerCity: 1, desc: 'Entertainment venue. Boosts income and approval.' },

        // Military
        barracks: { name: 'Barracks', category: 'military', icon: '🎖️', cost: 3000, enables: 'infantry', capacity: 5000, maxPerCity: 5, desc: 'Trains infantry and mechanized units.' },
        tank_factory: { name: 'Tank Factory', category: 'military', icon: '🏗️', cost: 8000, enables: 'armor', capacity: 250, maxPerCity: 3, desc: 'Produces armored vehicles and tanks.' },
        hangar: { name: 'Air Hangar', category: 'military', icon: '✈️', cost: 10000, enables: 'air', capacity: 50, maxPerCity: 3, desc: 'Houses and maintains aircraft.' },
        drydock: { name: 'Drydock', category: 'military', icon: '⚓', cost: 15000, enables: 'naval', capacity: 10, maxPerCity: 2, desc: 'Builds and repairs naval vessels.' },
        missile_pad: { name: 'Missile Launch Pad', category: 'military', icon: '🚀', cost: 25000, enables: 'missile', capacity: 5, maxPerCity: 1, desc: 'Strategic missile launch facility.' },
        nuke_facility: { name: 'Nuclear Research Lab', category: 'military', icon: '☢️', cost: 100000, enables: 'nuke', capacity: 1, maxPerCity: 1, desc: 'Develops nuclear weapons. Extremely expensive.' },

        // Infrastructure
        hospital: { name: 'Hospital', category: 'civil', icon: '🏥', cost: 4000, approval: 5, powerUsage: 100, maxPerCity: 3, desc: 'Provides healthcare and boosts approval.' },
        university: { name: 'University', category: 'civil', icon: '🎓', cost: 6000, techBonus: 5, maxPerCity: 2, desc: 'Research institution that accelerates technology.' },
        police_station: { name: 'Police Station', category: 'civil', icon: '🚔', cost: 2500, stability: 5, maxPerCity: 3, desc: 'Maintains law and order. Reduces crime.' },
        subway: { name: 'Subway System', category: 'civil', icon: '🚇', cost: 12000, approval: 8, pollution: -10, maxPerCity: 1, desc: 'Mass transit reduces pollution and boosts approval.' }
    },

    // ─── Military Units ───
    units: {
        // Army
        infantry: {
            name: 'Infantry',
            branch: 'Army',
            icon: '🎖️',
            cost: { money: 50, food: 2 },
            maintenance: { money: 5, food: 1 },
            strength: 1,
            defense: 1.2,
            speed: 2,
            requires: 'barracks',
            desc: 'Standard ground troops. Cheap and versatile.'
        },
        mech_infantry: {
            name: 'Mechanized Infantry',
            branch: 'Army',
            icon: '🚗',
            cost: { money: 150, steel: 1, munitions: 1 },
            maintenance: { money: 12, oil: 1 },
            strength: 2.5,
            defense: 2,
            speed: 4,
            requires: 'barracks',
            desc: 'Mobile infantry with armored transports.'
        },
        tanks: {
            name: 'Main Battle Tanks',
            branch: 'Army',
            icon: '🛡️',
            cost: { money: 500, steel: 5 },
            maintenance: { money: 40, oil: 3 },
            strength: 8,
            defense: 6,
            speed: 3,
            requires: 'tank_factory',
            desc: 'Heavy armored fighting vehicles. Devastating in open terrain.'
        },
        artillery: {
            name: 'Artillery',
            branch: 'Army',
            icon: '💥',
            cost: { money: 300, steel: 3, munitions: 2 },
            maintenance: { money: 25, munitions: 1 },
            strength: 6,
            defense: 1,
            speed: 1,
            requires: 'barracks',
            desc: 'Long-range bombardment. Powerful but vulnerable.'
        },
        special_forces: {
            name: 'Special Forces',
            branch: 'Army',
            icon: '🥷',
            cost: { money: 800, munitions: 3 },
            maintenance: { money: 60 },
            strength: 5,
            defense: 3,
            speed: 5,
            requires: 'barracks',
            desc: 'Elite covert operatives. Excellent for raids and sabotage.'
        },
        anti_air: {
            name: 'Anti-Air Battery',
            branch: 'Army',
            icon: '🔫',
            cost: { money: 400, steel: 2, munitions: 2 },
            maintenance: { money: 30 },
            strength: 2,
            defense: 8,
            speed: 1,
            antiAir: true,
            requires: 'barracks',
            desc: 'Shoots down enemy aircraft. Pure defensive role.'
        },

        // Air Force
        fighters: {
            name: 'Fighter Aircraft',
            branch: 'Air Force',
            icon: '✈️',
            cost: { money: 2000, aluminum: 5 },
            maintenance: { money: 100, oil: 3 },
            strength: 10,
            defense: 4,
            speed: 10,
            requires: 'hangar',
            desc: 'Air superiority fighters. Control the skies.'
        },
        bombers: {
            name: 'Strategic Bombers',
            branch: 'Air Force',
            icon: '🛩️',
            cost: { money: 5000, aluminum: 8 },
            maintenance: { money: 200, oil: 5 },
            strength: 15,
            defense: 2,
            speed: 6,
            requires: 'hangar',
            desc: 'Heavy bombers. Devastating to infrastructure.'
        },
        helicopters: {
            name: 'Attack Helicopters',
            branch: 'Air Force',
            icon: '🚁',
            cost: { money: 1500, aluminum: 3, steel: 2 },
            maintenance: { money: 80, oil: 2 },
            strength: 7,
            defense: 3,
            speed: 7,
            requires: 'hangar',
            desc: 'Close air support. Effective against ground units.'
        },
        drones: {
            name: 'Combat Drones',
            branch: 'Air Force',
            icon: '🤖',
            cost: { money: 1000, aluminum: 2, rare: 3 },
            maintenance: { money: 50 },
            strength: 6,
            defense: 1,
            speed: 8,
            requires: 'hangar',
            desc: 'Unmanned aerial vehicles. Low risk, high precision.'
        },

        // Navy
        destroyers: {
            name: 'Destroyers',
            branch: 'Navy',
            icon: '🚢',
            cost: { money: 8000, steel: 20 },
            maintenance: { money: 300, oil: 5 },
            strength: 15,
            defense: 10,
            speed: 6,
            requires: 'drydock',
            desc: 'Versatile warships. The backbone of any fleet.'
        },
        frigates: {
            name: 'Frigates',
            branch: 'Navy',
            icon: '⛵',
            cost: { money: 5000, steel: 12 },
            maintenance: { money: 180, oil: 3 },
            strength: 8,
            defense: 7,
            speed: 7,
            requires: 'drydock',
            desc: 'Light warships. Good for patrol and escort.'
        },
        submarines: {
            name: 'Submarines',
            branch: 'Navy',
            icon: '🐟',
            cost: { money: 12000, steel: 25 },
            maintenance: { money: 400, oil: 4 },
            strength: 20,
            defense: 5,
            speed: 4,
            stealth: true,
            requires: 'drydock',
            desc: 'Stealth vessels. Devastating first-strike capability.'
        },
        carriers: {
            name: 'Aircraft Carriers',
            branch: 'Navy',
            icon: '🛳️',
            cost: { money: 50000, steel: 80, aluminum: 30 },
            maintenance: { money: 1500, oil: 15 },
            strength: 5,
            defense: 15,
            speed: 3,
            carrierCapacity: 20,
            requires: 'drydock',
            desc: 'Floating airbases. Projects air power over oceans.'
        },

        // Strategic
        cruise_missile: {
            name: 'Cruise Missiles',
            branch: 'Strategic',
            icon: '🚀',
            cost: { money: 5000, aluminum: 5, munitions: 10 },
            maintenance: { money: 0 },
            strength: 25,
            defense: 0,
            speed: 20,
            singleUse: true,
            requires: 'missile_pad',
            desc: 'Precision strike weapons. Consumed on use.'
        },
        ballistic_missile: {
            name: 'Ballistic Missiles',
            branch: 'Strategic',
            icon: '☄️',
            cost: { money: 15000, aluminum: 10, munitions: 20 },
            maintenance: { money: 100 },
            strength: 50,
            defense: 0,
            speed: 25,
            singleUse: true,
            requires: 'missile_pad',
            desc: 'Long-range devastation. Destroys infrastructure.'
        },
        nuclear_warhead: {
            name: 'Nuclear Warhead',
            branch: 'Strategic',
            icon: '☢️',
            cost: { money: 100000, uranium: 50, aluminum: 20 },
            maintenance: { money: 500 },
            strength: 500,
            defense: 0,
            speed: 25,
            singleUse: true,
            nuclear: true,
            requires: 'nuke_facility',
            desc: 'Weapon of mass destruction. Catastrophic damage.'
        },
        missile_defense: {
            name: 'Missile Defense System',
            branch: 'Strategic',
            icon: '🛡️',
            cost: { money: 20000, steel: 15, rare: 10 },
            maintenance: { money: 300 },
            strength: 0,
            defense: 30,
            speed: 0,
            antiMissile: true,
            requires: 'missile_pad',
            desc: 'Intercepts incoming missiles. Pure defense.'
        }
    },

    // ─── Battle Types ───
    battleTypes: {
        ground_assault: {
            name: 'Ground Assault',
            icon: '🎖️',
            desc: 'Full ground invasion. Soldiers, tanks, and artillery advance.',
            primaryBranch: 'Army',
            terrainMod: { plains: 1.2, mountain: 0.6, forest: 0.8, desert: 1.0, coastal: 0.9, urban: 0.7 }
        },
        air_strike: {
            name: 'Air Strike',
            icon: '✈️',
            desc: 'Aerial bombardment targeting military and infrastructure.',
            primaryBranch: 'Air Force',
            terrainMod: { plains: 1.0, mountain: 1.0, forest: 0.9, desert: 1.1, coastal: 1.0, urban: 1.2 }
        },
        naval_bombardment: {
            name: 'Naval Bombardment',
            icon: '🚢',
            desc: 'Offshore shelling of coastal targets.',
            primaryBranch: 'Navy',
            terrainMod: { plains: 0.5, mountain: 0.0, forest: 0.3, desert: 0.2, coastal: 1.5, urban: 0.8 }
        },
        combined_arms: {
            name: 'Combined Arms',
            icon: '⚔️',
            desc: 'Coordinated attack using all available branches.',
            primaryBranch: 'all',
            terrainMod: { plains: 1.1, mountain: 0.8, forest: 0.9, desert: 1.0, coastal: 1.1, urban: 0.9 }
        }
    },

    // ─── Defensive Postures ───
    defensivePostures: {
        dig_in: {
            name: 'Dig In',
            icon: '🏰',
            desc: 'Fortify positions. Massive defense boost but no counter-attack.',
            defenseMultiplier: 2.0,
            counterChance: 0
        },
        counter_attack: {
            name: 'Counter Attack',
            icon: '⚔️',
            desc: 'Meet the enemy head-on. Risky but can deal heavy damage.',
            defenseMultiplier: 0.8,
            counterChance: 0.6
        },
        guerrilla: {
            name: 'Guerrilla Warfare',
            icon: '🌿',
            desc: 'Asymmetric warfare. Low casualties but prolonged conflict.',
            defenseMultiplier: 1.3,
            counterChance: 0.3,
            attrition: true
        },
        retreat: {
            name: 'Strategic Retreat',
            icon: '🏃',
            desc: 'Withdraw forces to preserve units. Lose territory.',
            defenseMultiplier: 0.3,
            counterChance: 0,
            preserveUnits: 0.9
        }
    },

    // ─── Treaty Types ───
    treatyTypes: {
        mdp: { name: 'Mutual Defense Pact', abbr: 'MDP', icon: '🛡️', desc: 'Both parties obligated to defend each other if attacked.' },
        odp: { name: 'Optional Defense Pact', abbr: 'ODP', icon: '🤝', desc: 'Both parties may choose to defend each other.' },
        nap: { name: 'Non-Aggression Pact', abbr: 'NAP', icon: '✌️', desc: 'Both parties agree not to attack each other.' },
        trade: { name: 'Trade Agreement', abbr: 'TRADE', icon: '📦', desc: 'Preferential trade rates between nations.' },
        embargo: { name: 'Embargo', abbr: 'EMB', icon: '🚫', desc: 'Block all trade with a target nation.' }
    },

    // ─── Spy Missions ───
    spyMissions: {
        gather_intel: { name: 'Gather Intelligence', icon: '🔍', cost: 5000, risk: 0.15, desc: 'Reveal enemy military strength and resources.' },
        sabotage: { name: 'Sabotage', icon: '💥', cost: 10000, risk: 0.30, desc: 'Destroy enemy improvements or military units.' },
        steal_tech: { name: 'Steal Technology', icon: '💾', cost: 15000, risk: 0.40, desc: 'Steal research progress from the target.' },
        propaganda: { name: 'Spread Propaganda', icon: '📢', cost: 8000, risk: 0.20, desc: 'Reduce enemy approval rating.' },
        assassinate: { name: 'Assassination Attempt', icon: '🗡️', cost: 50000, risk: 0.60, desc: 'Attempt to assassinate enemy leader. High risk.' }
    },

    // ─── Flag Patterns ───
    flagPatterns: [
        { id: 'horizontal_2', name: 'Horizontal Bicolor' },
        { id: 'horizontal_3', name: 'Horizontal Tricolor' },
        { id: 'vertical_2', name: 'Vertical Bicolor' },
        { id: 'vertical_3', name: 'Vertical Tricolor' },
        { id: 'diagonal', name: 'Diagonal' },
        { id: 'cross', name: 'Nordic Cross' },
        { id: 'saltire', name: 'Saltire (X)' },
        { id: 'quarters', name: 'Quarters' }
    ],

    // ─── AI Nation Names ───
    aiNationNames: [
        'Republic of Valdoria', 'Kingdom of Eastmere', 'Federated States of Novarsk',
        'People\'s Republic of Zenith', 'Empire of Kaelthon', 'Sultanate of Rashadi',
        'Commonwealth of Brynhold', 'Union of Corvalis', 'Grand Duchy of Aetheris',
        'Democratic Republic of Tessara', 'Confederation of Iron Coast',
        'Holy See of Luminas', 'Free State of Tiberion', 'Princedom of Ashvale',
        'Socialist Republic of Drayen', 'Dominion of Stormward', 'Republic of Serenia',
        'Kingdom of Meridia', 'Federation of Northshield', 'Empire of Crimson Reach',
        'Republic of Argentum', 'Kingdom of Solanthis', 'People\'s Union of Moravia',
        'Caliphate of Al-Zahara', 'Grand Republic of Vexaria', 'Tsardom of Krivosti',
        'Free City of Portheim', 'Republic of Cascara', 'Shogunate of Kenzai',
        'Order of the Iron Throne'
    ],

    aiLeaderNames: [
        'President Elena Vargas', 'King Harold III', 'Chairman Wei Chen',
        'Premier Alexei Petrov', 'Emperor Maximilian', 'Sultan Ahmed bin Rashid',
        'Chancellor Ingrid Holst', 'Consul Marcus Drake', 'Archduke Friedrich',
        'President Amara Osei', 'Admiral Jonas Korr', 'Pontiff Celestine V',
        'President Lucius Vane', 'Prince Aldric Ash', 'Comrade Yuri Volkov',
        'High Commander Thane', 'President Isabella Cruz', 'Queen Seraphina',
        'Marshal Viktor Hartmann', 'Empress Scarlet Drayne',
        'President Ricardo Moss', 'King Darius IV', 'Chairman Li Feng',
        'Caliph Omar al-Din', 'President Valeria Rex', 'Tsar Nikolas II',
        'Mayor Friedrich Stein', 'President Lucia Montoya', 'Shogun Kenji Takeda',
        'Grand Master Orion'
    ],

    // ─── Starting Resources ───
    startingResources: {
        money: 50000,
        food: 500,
        steel: 200,
        oil: 100,
        aluminum: 100,
        munitions: 50,
        uranium: 0,
        rare: 10
    },

    // ─── Starting City ───
    startingCity: {
        population: 50000,
        infrastructure: 100,
        land: 250,
        improvements: {
            farm: 2,
            iron_mine: 1,
            coal_plant: 1,
            supermarket: 1,
            barracks: 1,
            police_station: 1
        }
    },

    // ─── Game Balance ───
    balance: {
        baseTaxRate: 0.25,
        maxTaxRate: 0.40,
        minTaxRate: 0.0,
        popGrowthRate: 0.02,
        baseApproval: 60,
        newCityCost: 50000,
        cityInfrastructureCostPer: 100,
        maxCities: 20,
        warScoreRange: 0.75,  // Can attack nations between 75% and 175% of your score
        spyBaseCost: 5000,
        tradeMarkup: 0.05
    }
};
