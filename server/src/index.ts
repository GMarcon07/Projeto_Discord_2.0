import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase, db } from './db/database';
import { startCleanupScheduler } from './db/cleanup';
import { authenticateOrRegister } from './auth/auth';
import { setupSocketHandlers } from './socket/socketHandler';
import { ClientToServerEvents, ServerToClientEvents, Server as ServerType } from '@discord-mini/shared';

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS for local Electron dev & remote client connections
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Initialize SQLite tables & seed
initDatabase();

// Start 7-day message cleaner (runs every 1 hour)
startCleanupScheduler();

// Socket.io initialization
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 15000
});

setupSocketHandlers(io);

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) {
    return res.status(400).json({ success: false, message: 'Username e PIN são obrigatórios.' });
  }

  const result = authenticateOrRegister(username, pin);
  if (!result.success) {
    return res.status(401).json(result);
  }

  return res.json(result);
});

// Get Servers with channels
app.get('/api/servers', (req, res) => {
  try {
    const servers = db.prepare('SELECT id, name, created_at as createdAt FROM servers ORDER BY created_at ASC').all() as any[];
    const channels = db.prepare('SELECT id, server_id as serverId, name, type, created_at as createdAt FROM channels ORDER BY created_at ASC').all() as any[];

    const result: ServerType[] = servers.map(s => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
      channels: channels.filter(c => c.serverId === s.id)
    }));

    res.json(result);
  } catch (err) {
    console.error('Erro ao listar servidores:', err);
    res.status(500).json({ error: 'Erro interno ao obter servidores.' });
  }
});

// Get Channel Messages (last 100)
app.get('/api/channels/:channelId/messages', (req, res) => {
  const { channelId } = req.params;
  try {
    const rows = db.prepare(`
      SELECT id, channel_id as channelId, user_id as userId, username, user_color as userColor, content, created_at as createdAt
      FROM messages
      WHERE channel_id = ?
      ORDER BY created_at ASC
      LIMIT 100
    `).all(channelId);

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar mensagens do canal:', err);
    res.status(500).json({ error: 'Erro ao buscar mensagens.' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Servidor Discord-Mini ativo na porta ${PORT}`);
  console.log(`📡 URL local: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
