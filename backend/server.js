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

    // Chat message handling (for now)
    ws.on('message', async (message) => {
        const raw = message.toString();
      
        // Accept JSON or plain text
        let data;
        try { data = JSON.parse(raw); }
        catch { data = { type: 'chat', content: raw }; }
      
        if (data.type !== 'chat') {
          console.log('Ignoring non-chat message:', data.type);
          return;
        }
      
        const room = 'general';
        const content = String(data.content ?? '').trim();
      
        // Log the chat event
        console.log(`CHAT <- user=${ws.user?.username} room=${room} content="${content}"`);
      
        try {
          const result = await pool.query(
            'INSERT INTO messages (room, sender_id, content) VALUES ($1, $2, $3) RETURNING id',
            [room, ws.user.id, content]
          );
          console.log(`Saved message id=${result.rows[0].id}`);
        } catch (err) {
          console.error('Error saving message:', err);
        }
      
        // Broadcast and log fanout
        const payload = JSON.stringify({
          type: 'chat',
          room,
          user: ws.user.username,
          content,
          time: new Date().toISOString()
        });
      
        let sent = 0;
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
            sent++;
          }
        });
        console.log(`Broadcasted to ${sent} client(s)`);
      });
      

    ws.on('close', () => console.log('Client disconnected:', ws.user?.username));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
