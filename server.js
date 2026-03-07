/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — Main Server
   Express + SQLite + WebSocket
   ═══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const Database = require('better-sqlite3');
const fs = require('fs');
const nodemailer = require('nodemailer');
const compression = require('compression');
const { GAME_DATA } = require('./game/data');

// Create Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ─── Network Usage Tracker ───
global.networkUsage = {
    received: 0,
    sent: 0
};

// ─── Database Setup ───
const dbPath = process.env.DB_PATH || path.join(__dirname, 'db', 'game.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
db.exec(schema);

// ─── Market Initialization ───
// Ensure all resources in GAME_DATA have market pools and prices
Object.keys(GAME_DATA.resources).forEach(res => {
    if (res === 'money') return;
    db.prepare('INSERT OR IGNORE INTO game_state (key, value) VALUES (?, ?)').run(`market_${res}`, '10');
    db.prepare('INSERT OR IGNORE INTO game_state (key, value) VALUES (?, ?)').run(`pool_${res}`, '5000');
});

// Make db available globally
global.db = db;

// ─── Mailer Setup ───
// We now dynamically pull SMTP settings from the database instead of .env
// so admins can configure it from the in-game dashboard.
global.isSmtpConfigured = () => {
    try {
        const rows = db.prepare('SELECT key_name, key_value FROM server_settings').all();
        const settings = {};
        rows.forEach(r => settings[r.key_name] = r.key_value);
        return !!(settings.smtp_host && settings.smtp_user && settings.smtp_pass);
    } catch (err) {
        return false;
    }
};

global.getMailer = () => {
    const rows = db.prepare('SELECT key_name, key_value FROM server_settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key_name] = r.key_value);

    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
        return null; // No mailer available
    }

    return nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port) || 465,
        secure: settings.smtp_secure === '1',
        auth: {
            user: settings.smtp_user,
            pass: settings.smtp_pass
        }
    });
};

global.getSmtpFrom = () => {
    try {
        const row = db.prepare('SELECT key_value FROM server_settings WHERE key_name = "smtp_from"').get();
        return row ? row.key_value : '"SOVEREIGN" <noreply@sovereigngame.local>';
    } catch (err) {
        return '"SOVEREIGN" <noreply@sovereigngame.local>';
    }
};

// ─── Middleware ───
app.use(helmet({
    contentSecurityPolicy: false // disabled so inline scripts in game pages still work
}));
app.use(compression());
app.use(cors({
    origin: function (origin, callback) {
        callback(null, origin || '*');
    },
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Track HTTP traffic
app.use((req, res, next) => {
    // Track incoming (approximate header size + content length)
    const headerSize = (req.method + req.url + req.httpVersion).length +
        Object.entries(req.headers).reduce((acc, [k, v]) => acc + k.length + (v ? String(v).length : 0), 0);
    const bodySize = parseInt(req.headers['content-length'] || '0');
    global.networkUsage.received += headerSize + bodySize;

    // Track outgoing by wrapping res.write and res.end
    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk) {
        if (chunk) global.networkUsage.sent += chunk.length || 0;
        return originalWrite.apply(res, arguments);
    };

    res.end = function (chunk) {
        if (chunk) global.networkUsage.sent += chunk.length || 0;
        return originalEnd.apply(res, arguments);
    };
    next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ───
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Serve the game for any unmatched route
app.use((req, res) => {
    // If it looks like an API call (starts with /api/ or /auth/), don't serve index.html
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── WebSocket Setup ───
const { setupWebSocket } = require('./routes/ws');
const wss = setupWebSocket(server);
global.wss = wss;

// ─── Turn Tick System ───
const { processTick } = require('./game/tick');

const TICK_INTERVAL_MS = 30 * 60 * 1000;
// ─── Interactive CLI ───
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

const handleCommand = (line) => {
    const cmd = line.trim().toLowerCase();
    switch (cmd) {
        case 'help':
            console.log('\n--- Available Commands ---');
            console.log('  help    - Show this help menu');
            console.log('  tick    - Manually trigger a world tick');
            console.log('  stats   - Show server stats');
            console.log('  live    - Enter live monitoring mode');
            console.log('  clear   - Clear terminal screen');
            console.log('  exit    - Stop the server');
            console.log('---------------------------\n');
            break;
        case 'tick':
            console.log('[CLI] Manually triggered world tick...');
            processTick(db);
            db.prepare('UPDATE game_state SET value = ? WHERE key = ?').run(String(Date.now()), 'last_tick');
            if (global.wss) {
                global.wss.clients.forEach(c => c.readyState === 1 && c.send(JSON.stringify({ type: 'tick', message: 'Manual tick' })));
            }
            break;
        case 'stats':
            const mem = process.memoryUsage();
            const formatBytes = (bytes) => {
                if (bytes < 1024) return bytes + ' B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };

            console.log('\n--- Server Stats ---');
            console.log(`  Uptime:   ${Math.floor(process.uptime())}s`);
            console.log(`  Memory:   ${Math.floor(mem.rss / 1024 / 1024)}MB RSS`);
            console.log(`  Players:  ${global.wss ? global.wss.clients.size : 0} online`);
            console.log(`  Network:  Incoming: ${formatBytes(global.networkUsage.received)} | Outgoing: ${formatBytes(global.networkUsage.sent)}`);
            console.log(`  Total:    ${formatBytes(global.networkUsage.received + global.networkUsage.sent)}`);
            console.log('--------------------\n');
            break;
        case 'live':
        case 'monitor':
            console.log('\n[!] Entering Live Monitor (Press ENTER to exit)');
            const monitorInterval = setInterval(() => {
                const rx = formatBytes(global.networkUsage.received);
                const tx = formatBytes(global.networkUsage.sent);
                const total = formatBytes(global.networkUsage.received + global.networkUsage.sent);
                const players = global.wss ? global.wss.clients.size : 0;
                process.stdout.write(`\r[LIVE] RX: ${rx} | TX: ${tx} | Total: ${total} | Online: ${players}      `);
            }, 500);

            rl.once('line', () => {
                clearInterval(monitorInterval);
                console.log('\n[!] Live monitor stopped.');
            });
            break;
        case 'clear':
            process.stdout.write('\x1Bc'); // Better clear
            break;
        case 'exit':
        case 'stop':
            console.log('🛑 Stopping server...');
            process.exit(0);
            break;
        default:
            if (cmd) console.log(`[CLI] Unknown command: "${cmd}". Type "help" for options.`);
            break;
    }
};

rl.on('line', (line) => {
    handleCommand(line);
}).on('close', () => {
    process.exit(0);
});

// Start checking for ticks
setInterval(() => {
    const lastTick = parseInt(db.prepare('SELECT value FROM game_state WHERE key = ?').get('last_tick')?.value || '0');
    const now = Date.now();
    if (now - lastTick >= TICK_INTERVAL_MS) {
        console.log('[TICK] Processing world turn...');
        processTick(db);
        db.prepare('UPDATE game_state SET value = ? WHERE key = ?').run(String(now), 'last_tick');

        // Notify all connected clients
        if (global.wss) {
            global.wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({ type: 'tick', message: 'Turn processed' }));
                }
            });
        }
    }
}, 60000);

// Initialize last tick if first run
const lastTick = db.prepare('SELECT value FROM game_state WHERE key = ?').get('last_tick');
if (lastTick && lastTick.value === '0') {
    db.prepare('UPDATE game_state SET value = ? WHERE key = ?').run(String(Date.now()), 'last_tick');
}

// ─── Live Title Monitor ───
const formatBytesSimple = (bytes) => {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'K', 'M', 'G'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
};

setInterval(() => {
    const rx = formatBytesSimple(global.networkUsage.received);
    const tx = formatBytesSimple(global.networkUsage.sent);
    const players = global.wss ? global.wss.clients.size : 0;
    // Set CMD window title live
    process.stdout.write(`\x1b]0;SOVEREIGN | RX: ${rx} | TX: ${tx} | Online: ${players}\x07`);
}, 2000);

// ─── Start Server ───
server.listen(PORT, () => {
    console.log(`\n  [*] SOVEREIGN Server running at http://localhost:${PORT}\n`);
    console.log(`  [D] Database: ${dbPath}`);
    console.log(`  [T] Tick interval: ${TICK_INTERVAL_MS / 1000 / 60} minutes`);
    console.log(`  [W] WebSocket: ws://localhost:${PORT}\n`);
});

// Error logging to file
const logStream = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });
process.on('uncaughtException', (err) => {
    logStream.write(`[UNCAUGHT] ${new Date().toISOString()}: ${err.stack}\n`);
});
process.on('unhandledRejection', (reason, promise) => {
    logStream.write(`[REJECTION] ${new Date().toISOString()}: ${reason}\n`);
});

module.exports = { app, db, server };
