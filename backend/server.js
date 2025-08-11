// WebSocket + HTTP Server
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

// Sign up and login
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
  });

// Initialize server
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Sign up
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    try {
        await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
            [username, hashed]
        );
        res.json({ message: 'User created' });
    } catch (err) {
        res.status(400).json({ error: 'Username taken' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid username' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token });
});

// Chat history (for now)
app.get('/rooms/:room/messages', async (req, res) => {
    const { room } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 200);
    try {
      const result = await pool.query(
        `SELECT m.id, m.room, m.content, m.created_at, u.username AS sender
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.room = $1
         ORDER BY m.id DESC
         LIMIT $2`,
        [room, limit]
      );
      res.json(result.rows.reverse()); // oldest to newest order
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });  

// Room handling
const rooms = new Map();
const roomUsers = new Map();

// Room handling functions
// Join room
function joinRoom(ws, room) {
    // Remove from previous room first
    const prev = rooms.get(ws);
    if (prev && roomUsers.get(prev)) roomUsers.get(prev).delete(ws);

    // Add to new room
    rooms.set(ws, room);
    if (!roomUsers.get(room)) roomUsers.set(room, new Set());
    roomUsers.get(room).add(ws);
}

// Send message to room
function sendToRoom(room, payload) {
    // Get users in room
    const users = roomUsers.get(room);
    if (!users) return;

    // Send to each user
    users.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    });
}

wss.on('connection', (ws, req) => {
    // JWT verification
    try {
        const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
        const token = searchParams.get('token');
        if (!token) {
            ws.close(1008, 'Missing auth token');
            return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ws.user = { id: decoded.id, username: decoded.username };
        console.log('Client connected:', ws.user.username);
    } catch (err) {
        ws.close(1008, 'Invalid/expired token');
        return;
    }

    // Join room, default to general
    joinRoom(ws, 'general');

    // Chat message handling (for now)
    ws.on('message', async (message) => {
        // Parse message
        const raw = message.toString();
        let data;
        try { data = JSON.parse(raw); }
        catch { data = { type: 'chat', content: raw }; }
      
        // Join room
        if (data.type === 'join') {
          const room = String(data.room || 'general').trim();
          joinRoom(ws, room);
          sendToRoom(room, JSON.stringify({
            type: 'system', event: 'join', user: ws.user.username, room, time: new Date().toISOString()
          }));
          return;
        }
      
        // Chat message
        if (data.type === 'chat') {
          const room = rooms.get(ws) || 'general';
          const content = String(data.content ?? '').slice(0, 4000);
      
          // save message to database for history
          try {
            await pool.query(
              'INSERT INTO messages (room, sender_id, content) VALUES ($1, $2, $3)',
              [room, ws.user.id, content]
            );
          } catch (e) {
            console.error('Error saving message:', e);
          }
      
          // broadcast message only to this room 
          const payload = JSON.stringify({
            type: 'chat', room, user: ws.user.username, content,
            time: new Date().toISOString()
          });
          sendToRoom(room, payload);
          return;
        }
      });      
      
    // Client disconnected
    const room = rooms.get(ws);
    if (room && roomUsers.get(room)) {
      roomUsers.get(room).delete(ws);
      sendToRoom(room, JSON.stringify({
        type: 'system', event: 'leave', user: ws.user?.username, room,
        time: new Date().toISOString()
      }));
    }
    rooms.delete(ws);
    });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
