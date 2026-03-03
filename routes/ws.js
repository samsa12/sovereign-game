/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — WebSocket Handler
   Real-time notifications to connected players
   ═══════════════════════════════════════════════════════════════ */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });
    const connectionCounts = new Map(); // userId -> count
    const MAX_CONNECTIONS_PER_USER = 3;

    wss.on('connection', (ws, req) => {
        // Parse token from URL
        const url = new URL(req.url, 'ws://localhost');
        const token = url.searchParams.get('token');

        if (!token) {
            ws.close(4001, 'Authentication required');
            return;
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            ws.userId = decoded.userId;
            ws.username = decoded.username;

            // Connection limit per user
            const currentCount = connectionCounts.get(ws.userId) || 0;
            if (currentCount >= MAX_CONNECTIONS_PER_USER) {
                ws.close(4002, 'Too many connections');
                return;
            }
            connectionCounts.set(ws.userId, currentCount + 1);

            // Get nation ID
            const nation = db.prepare('SELECT id FROM nations WHERE user_id = ?').get(decoded.userId);
            if (nation) ws.nationId = nation.id;

            console.log(`[WS] Connected: ${decoded.username} (nation: ${ws.nationId || 'none'})`);
        } catch (err) {
            ws.close(4001, 'Invalid token');
            return;
        }

        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                // Handle client messages if needed
                if (msg.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            } catch (e) { /* ignore */ }
        });

        ws.on('close', () => {
            if (ws.userId) {
                const count = connectionCounts.get(ws.userId) || 1;
                if (count <= 1) connectionCounts.delete(ws.userId);
                else connectionCounts.set(ws.userId, count - 1);
            }
            console.log(`[WS] Disconnected: ${ws.username || 'unknown'}`);
        });
    });

    // Heartbeat to clean up dead connections
    setInterval(() => {
        wss.clients.forEach(ws => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    return wss;
}

module.exports = { setupWebSocket };
