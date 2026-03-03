-- ═══════════════════════════════════════════════════════════════
-- SOVEREIGN — Database Schema
-- ═══════════════════════════════════════════════════════════════

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_admin INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0
);

-- Verification/Password Reset Tokens
CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    type TEXT NOT NULL, -- 'verify_email' or 'reset_password'
    expires_at DATETIME NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Server Settings (Dynamic Admin Config)
CREATE TABLE IF NOT EXISTS server_settings (
    key_name TEXT PRIMARY KEY,
    key_value TEXT
);

-- Default Settings Insert
INSERT OR IGNORE INTO server_settings (key_name, key_value) VALUES 
('smtp_host', ''),
('smtp_port', '2525'),
('smtp_user', ''),
('smtp_pass', ''),
('smtp_secure', '0'),
('smtp_from', '"SOVEREIGN" <noreply@sovereigngame.local>');

-- Nations
CREATE TABLE IF NOT EXISTS nations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    name TEXT UNIQUE NOT NULL,
    leader_name TEXT NOT NULL,
    motto TEXT DEFAULT '',
    currency_name TEXT DEFAULT 'Dollar',
    government TEXT NOT NULL DEFAULT 'democracy',
    continent TEXT NOT NULL DEFAULT 'north_america',
    capital_city_id INTEGER,
    flag_pattern TEXT DEFAULT 'horizontal_3',
    flag_color1 TEXT DEFAULT '#1a5276',
    flag_color2 TEXT DEFAULT '#c0392b',
    flag_color3 TEXT DEFAULT '#f1c40f',
    
    -- Customization
    bio TEXT DEFAULT '',
    leader_title TEXT DEFAULT 'Leader',
    accent_color TEXT DEFAULT '#3498db',
    
    -- Resources
    money REAL DEFAULT 50000,
    food REAL DEFAULT 500,
    steel REAL DEFAULT 200,
    oil REAL DEFAULT 100,
    aluminum REAL DEFAULT 100,
    munitions REAL DEFAULT 50,
    uranium REAL DEFAULT 0,
    rare REAL DEFAULT 10,
    iron REAL DEFAULT 0,
    bauxite REAL DEFAULT 0,
    
    -- Policies
    tax_rate REAL DEFAULT 0.15,
    war_policy TEXT DEFAULT 'normal',
    military_doctrine TEXT DEFAULT 'balanced',
    social_spending REAL DEFAULT 0.10,
    
    -- Stats (recalculated each turn)
    approval INTEGER DEFAULT 60,
    stability INTEGER DEFAULT 70,
    score INTEGER DEFAULT 0,
    military_strength INTEGER DEFAULT 0,
    population INTEGER DEFAULT 50000,
    gdp INTEGER DEFAULT 0,
    
    -- Protection
    beige_until INTEGER DEFAULT 0, -- turn number when protection ends
    
    -- Diplomacy
    alliance_id INTEGER,
    spies INTEGER DEFAULT 3,
    
    -- Customization v2
    bonus_resource TEXT DEFAULT 'food',
    leader_portrait TEXT DEFAULT '',
    national_anthem TEXT DEFAULT '',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_turn_processed INTEGER DEFAULT 0,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (alliance_id) REFERENCES alliances(id)
);

-- Cities
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_capital INTEGER DEFAULT 0,
    population INTEGER DEFAULT 50000,
    infrastructure INTEGER DEFAULT 100,
    land INTEGER DEFAULT 250,
    terrain TEXT DEFAULT 'plains',
    pollution INTEGER DEFAULT 0,
    crime INTEGER DEFAULT 10,
    disease INTEGER DEFAULT 5,
    happiness INTEGER DEFAULT 60,
    
    -- Districts (unlock slots for improvements)
    district_industrial INTEGER DEFAULT 1,
    district_commercial INTEGER DEFAULT 1,
    district_residential INTEGER DEFAULT 1,
    district_military INTEGER DEFAULT 1,
    district_government INTEGER DEFAULT 0,
    
    FOREIGN KEY (nation_id) REFERENCES nations(id) ON DELETE CASCADE
);

-- City Improvements (each row = one built improvement in a city)
CREATE TABLE IF NOT EXISTS city_improvements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id INTEGER NOT NULL,
    improvement_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    UNIQUE(city_id, improvement_type),
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

-- Military Units
CREATE TABLE IF NOT EXISTS military (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_id INTEGER NOT NULL,
    unit_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    UNIQUE(nation_id, unit_type),
    FOREIGN KEY (nation_id) REFERENCES nations(id) ON DELETE CASCADE
);

-- Wars
CREATE TABLE IF NOT EXISTS wars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attacker_id INTEGER NOT NULL,
    defender_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active', -- active, attacker_victory, defender_victory, stalemate, peace
    casus_belli TEXT DEFAULT 'unprovoked',
    attacker_war_score INTEGER DEFAULT 0,
    defender_war_score INTEGER DEFAULT 0,
    attacker_action_points INTEGER DEFAULT 3,
    defender_action_points INTEGER DEFAULT 3,
    start_turn INTEGER,
    end_turn INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (attacker_id) REFERENCES nations(id),
    FOREIGN KEY (defender_id) REFERENCES nations(id)
);

-- Battles (individual engagements within a war)
CREATE TABLE IF NOT EXISTS battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    war_id INTEGER NOT NULL,
    attacker_nation_id INTEGER NOT NULL,
    attack_type TEXT NOT NULL,
    defense_posture TEXT DEFAULT 'dig_in',
    winner TEXT, -- 'attacker' or 'defender'
    attack_strength REAL,
    defense_strength REAL,
    infra_damage INTEGER DEFAULT 0,
    turn INTEGER,
    details TEXT, -- JSON blob for casualties etc
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (war_id) REFERENCES wars(id),
    FOREIGN KEY (attacker_nation_id) REFERENCES nations(id)
);

-- Alliances
CREATE TABLE IF NOT EXISTS alliances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    founder_id INTEGER NOT NULL,
    bank REAL DEFAULT 0,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (founder_id) REFERENCES nations(id)
);

-- Alliance Members
CREATE TABLE IF NOT EXISTS alliance_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alliance_id INTEGER NOT NULL,
    nation_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member', -- founder, officer, member
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(alliance_id, nation_id),
    
    FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE CASCADE,
    FOREIGN KEY (nation_id) REFERENCES nations(id) ON DELETE CASCADE
);

-- Treaties
CREATE TABLE IF NOT EXISTS treaties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- mdp, odp, nap, trade, embargo
    nation_a_id INTEGER NOT NULL,
    nation_b_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active', -- active, cancelled, expired
    start_turn INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (nation_a_id) REFERENCES nations(id),
    FOREIGN KEY (nation_b_id) REFERENCES nations(id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_nation_id INTEGER NOT NULL,
    to_nation_id INTEGER, -- NULL = alliance chat
    to_alliance_id INTEGER, -- NULL = direct message
    subject TEXT DEFAULT '',
    body TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    message_type TEXT DEFAULT 'normal', -- normal, war_demand, trade_offer, system
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (from_nation_id) REFERENCES nations(id),
    FOREIGN KEY (to_nation_id) REFERENCES nations(id),
    FOREIGN KEY (to_alliance_id) REFERENCES alliances(id)
);

-- World News
CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icon TEXT DEFAULT '📰',
    headline TEXT NOT NULL,
    body TEXT,
    turn INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Market History (for price charts)
CREATE TABLE IF NOT EXISTS market_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource TEXT NOT NULL,
    price REAL NOT NULL,
    turn INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS market_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource TEXT NOT NULL,
    pool INTEGER NOT NULL,
    price REAL NOT NULL,
    turn INTEGER NOT NULL
);

-- Trade Offers
CREATE TABLE IF NOT EXISTS trade_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    resource TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_per_unit REAL NOT NULL,
    status TEXT DEFAULT 'open', -- open, filled, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (seller_id) REFERENCES nations(id)
);

-- Research / Tech Tree
CREATE TABLE IF NOT EXISTS research (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_id INTEGER NOT NULL,
    tech_id TEXT NOT NULL,
    progress REAL DEFAULT 0, -- 0 to 100
    completed INTEGER DEFAULT 0,
    UNIQUE(nation_id, tech_id),
    
    FOREIGN KEY (nation_id) REFERENCES nations(id) ON DELETE CASCADE
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_id INTEGER NOT NULL,
    achievement_id TEXT NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nation_id, achievement_id),
    
    FOREIGN KEY (nation_id) REFERENCES nations(id) ON DELETE CASCADE
);

-- Game State (global config)
CREATE TABLE IF NOT EXISTS game_state (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Initialize game state
INSERT OR IGNORE INTO game_state (key, value) VALUES ('current_turn', '1');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('last_tick', '0');

-- Initialize market prices
INSERT OR IGNORE INTO game_state (key, value) VALUES ('market_food', '10');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('market_steel', '50');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('market_oil', '80');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('market_aluminum', '60');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('market_munitions', '40');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('market_uranium', '500');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('market_rare', '200');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('market_iron', '15');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('market_bauxite', '12');

-- Initialize global pools
INSERT OR IGNORE INTO game_state (key, value) VALUES ('pool_food', '10000');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('pool_steel', '5000');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('pool_oil', '5000');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('pool_aluminum', '3000');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('pool_munitions', '2000');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('pool_uranium', '100');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('pool_rare', '500');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('pool_iron', '8000');
INSERT OR IGNORE INTO game_state (key, value) VALUES ('pool_bauxite', '8000');
