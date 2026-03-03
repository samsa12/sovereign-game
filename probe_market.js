const db = require('better-sqlite3')('db/game.db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const token = jwt.sign({ userId: 1, username: 'Oisann' }, JWT_SECRET, { expiresIn: '1h' });

const http = require('http');
const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/market',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
}, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:\n', raw));
});
req.on('error', console.error);
req.end();
