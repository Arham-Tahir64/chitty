// WebSocket + HTTP Server
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

// Room codes
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

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

// Redis setup (pub/sub + simple cache)
const { createClient } = require('redis');
const INSTANCE_ID = Math.random().toString(36).slice(2);
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPub = createClient({ url: redisUrl });
const redisSub = createClient({ url: redisUrl });

redisPub.on('error', err => console.error('Redis error (pub):', err));
redisSub.on('error', err => console.error('Redis error (sub):', err));

(async () => {
  try {
    await redisPub.connect();
    await redisSub.connect();
    console.log('Connected to Redis');

    // Subscribe to room channels and rebroadcast to local clients
    await redisSub.pSubscribe('room:*', (message, channel) => {
      try {
        const payload = JSON.parse(message);
        if (payload.instanceId === INSTANCE_ID) return; // avoid echo
        const { room, user, content, time } = payload;
        const msg = JSON.stringify({ type: 'chat', room, user, content, time });
        sendToRoom(room, msg);
      } catch {}
    });
  } catch (err) {
    console.error('Failed to connect to Redis:', err?.message || err);
  }
})();

// Sign up
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    // Simple NOT NULL + empty string check
    if (!username || !password || username.trim() === '' || password.trim() === '') {
        return res.status(400).json({ error: 'Username and password are required' });
    }

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

    // Simple NOT NULL + empty string check
    if (!username || !password || username.trim() === '' || password.trim() === '') {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid username' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token });
});

// Create room
app.post('/rooms', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // generate room code
    let code;
    while (true) {
      code = nanoid();
      const result = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
      if (result.rows.length === 0) break;
    }

    // create room in database
    const name = (req.body?.name || '').trim() || `Room ${code}`;

    const roomResult = await pool.query(
      'INSERT INTO rooms (code, name, created_by) VALUES ($1,$2,$3) RETURNING id, code, name',
      [code, name, decoded.id]
    );
    const room = roomResult.rows[0];

    await pool.query(
      'INSERT INTO memberships (user_id, room_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [decoded.id, room.id]
    );

    res.json(room);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Join room
app.post('/rooms/join', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const roomResult = await pool.query(
      'SELECT * FROM rooms WHERE code = $1',
      [code]
    );
    const room = roomResult.rows[0];

    if (!room) return res.status(404).json({ error: 'Room not found' });

    await pool.query('INSERT INTO memberships (user_id, room_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [decoded.id, room.id]);
    res.json({ message: 'Joined room' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List rooms that the user is a member of
app.get('/me/rooms', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      `SELECT r.id, r.code, r.name, r.created_at
         FROM memberships m
         JOIN rooms r ON r.id = m.room_id
        WHERE m.user_id = $1
        ORDER BY r.created_at DESC`,
      [decoded.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Chat history (for now)
app.get('/rooms/:room/messages', async (req, res) => {
    const { room } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 200);
    try {
      // attempt to serve from Redis cache
      try {
        if (redisPub?.isOpen) {
          const cached = await redisPub.lRange(`history:${room}`, -limit, -1);
          if (cached && cached.length > 0) {
            const rows = cached.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
            return res.json(rows);
          }
        }
      } catch {}

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

// Get room members
app.get('/rooms/:room/members', async (req, res) => {
  try {
    const { room } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.username as name
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       JOIN rooms r ON r.id = m.room_id
       WHERE r.code = $1
       ORDER BY u.username`,
      [room]
    );
    
    // Add online status based on current WebSocket connections
    const membersWithStatus = result.rows.map(user => ({
      ...user,
      online: connectedUsers.has(user.id)
    }));
    
    res.json(membersWithStatus);
  } catch (e) {
    console.error('Failed to fetch room members:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Room handling
const rooms = new Map();
const roomUsers = new Map();
const connectedUsers = new Set(); // Track all connected users

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
    
    // Add to connected users set
    connectedUsers.add(ws.user.id);
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
    ws.on('message', async (raw) => {
      let data; try { data = JSON.parse(raw.toString()); } catch { data = {}; }
  
      if (data.type === 'join') {
        // support { room: "general" } or { code: "Q7K9Z2NA" }
        const code = String((data.code ?? data.room ?? '')).trim().toUpperCase();
        if (!code) return ws.send(JSON.stringify({ type: 'error', code: 'BAD_JOIN', message: 'Missing room code' }));
  
        // ensure membership (either require prior join or auto-join if code exists)
        const exists = await pool.query('SELECT id FROM rooms WHERE code=$1', [code]);
        if (exists.rowCount === 0) {
          return ws.send(JSON.stringify({ type: 'error', code: 'NO_SUCH_ROOM' }));
        }
  
        // auto-join if not a member
        const roomId = exists.rows[0].id;
        await pool.query(
          'INSERT INTO memberships (user_id, room_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [ws.user.id, roomId]
        );
  
        joinRoom(ws, code); // store/join by code; messages.room stays as text code
  
        ws.send(JSON.stringify({ type: 'joined', code }));
        return;
      }
  
      if (data.type === 'chat') {
        const code = rooms.get(ws) || 'general';
        const content = String(data.content || '').slice(0, 4000);

        const nowIso = new Date().toISOString();
        const outgoing = { type: 'chat', room: code, user: ws.user.username, content, time: nowIso };

        // persist using code as the "room" text
        await pool.query(
          'INSERT INTO messages (room, sender_id, content) VALUES ($1,$2,$3)',
          [code, ws.user.id, content]
        );

        // local broadcast
        sendToRoom(code, JSON.stringify(outgoing));

        // publish to other instances + cache recent history
        (async () => {
          try {
            if (redisPub.isOpen) {
              await redisPub.publish(`room:${code}`, JSON.stringify({ ...outgoing, instanceId: INSTANCE_ID }));
              const cacheRow = { room: code, content, created_at: nowIso, sender: ws.user.username };
              await redisPub.rPush(`history:${code}`, JSON.stringify(cacheRow));
              await redisPub.lTrim(`history:${code}`, -500, -1);
            }
          } catch {}
        })();
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      // Remove user from online status when they disconnect
      if (ws.user && ws.user.id) {
        connectedUsers.delete(ws.user.id);
        
        // Also remove from room tracking
        const room = rooms.get(ws);
        if (room && roomUsers.get(room)) {
          roomUsers.get(room).delete(ws);
        }
        rooms.delete(ws);
      }
    });
  });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
