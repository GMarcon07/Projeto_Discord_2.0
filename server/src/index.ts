import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase, db } from './db/database';
import { startCleanupScheduler } from './db/cleanup';
import { authenticateOrRegister, changePin, updateUserColor } from './auth/auth';
import { setupSocketHandlers } from './socket/socketHandler';
import { ClientToServerEvents, ServerToClientEvents, Server as ServerType, Channel } from '@discord-mini/shared';

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

// Change PIN endpoint
app.post('/api/auth/change-pin', (req, res) => {
  const { userId, currentPin, newPin } = req.body;
  if (!userId || !currentPin || !newPin) {
    return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
  }

  const result = changePin(userId, currentPin, newPin);
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

// Get Servers with channels
app.get('/api/servers', (req, res) => {
  try {
    const servers = db.prepare('SELECT id, name, created_at as createdAt FROM servers ORDER BY created_at ASC').all() as any[];
    const channels = db.prepare(`
      SELECT id, server_id as serverId, name, type, order_index as orderIndex, created_at as createdAt 
      FROM channels 
      ORDER BY order_index ASC, created_at ASC
    `).all() as any[];

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

// Create Server
app.post('/api/servers', (req, res) => {
  const { name } = req.body;
  const trimmedName = (name || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    return res.status(400).json({ error: 'O nome do servidor deve ter pelo menos 2 caracteres.' });
  }

  try {
    const serverId = uuidv4();
    const createdAt = new Date().toISOString();
    db.prepare('INSERT INTO servers (id, name, created_at) VALUES (?, ?, ?)').run(serverId, trimmedName, createdAt);

    // Create default text & voice channel for new server
    const generalChanId = uuidv4();
    const voiceChanId = uuidv4();
    const insertChannel = db.prepare('INSERT INTO channels (id, server_id, name, type, order_index) VALUES (?, ?, ?, ?, ?)');
    insertChannel.run(generalChanId, serverId, 'geral', 'text', 0);
    insertChannel.run(voiceChanId, serverId, 'Conversa Geral', 'voice', 1);

    const newServer: ServerType = {
      id: serverId,
      name: trimmedName,
      createdAt,
      channels: [
        { id: generalChanId, serverId, name: 'geral', type: 'text', orderIndex: 0, createdAt },
        { id: voiceChanId, serverId, name: 'Conversa Geral', type: 'voice', orderIndex: 1, createdAt }
      ]
    };

    io.emit('server:created', { server: newServer });
    res.json(newServer);
  } catch (err) {
    console.error('Erro ao criar servidor:', err);
    res.status(500).json({ error: 'Erro ao criar servidor.' });
  }
});

// Create Channel
app.post('/api/channels', (req, res) => {
  const { serverId, name, type } = req.body;
  const trimmedName = (name || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!trimmedName || trimmedName.length < 2) {
    return res.status(400).json({ error: 'O nome do canal deve ter pelo menos 2 caracteres.' });
  }

  if (type !== 'text' && type !== 'voice') {
    return res.status(400).json({ error: 'Tipo de canal inválido.' });
  }

  try {
    const maxOrder = db.prepare('SELECT MAX(order_index) as maxOrder FROM channels WHERE server_id = ?').get(serverId) as any;
    const nextOrder = (maxOrder?.maxOrder != null ? maxOrder.maxOrder : -1) + 1;
    const channelId = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO channels (id, server_id, name, type, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(channelId, serverId, trimmedName, type, nextOrder, createdAt);

    const newChannel: Channel = {
      id: channelId,
      serverId,
      name: trimmedName,
      type,
      orderIndex: nextOrder,
      createdAt
    };

    io.emit('channel:created', { channel: newChannel });
    res.json(newChannel);
  } catch (err) {
    console.error('Erro ao criar canal:', err);
    res.status(500).json({ error: 'Erro ao criar canal.' });
  }
});

// Reorder Channels
app.put('/api/channels/reorder', (req, res) => {
  const { serverId, channelIds } = req.body;
  if (!serverId || !Array.isArray(channelIds)) {
    return res.status(400).json({ error: 'Dados inválidos para reordenar canais.' });
  }

  try {
    const updateStmt = db.prepare('UPDATE channels SET order_index = ? WHERE id = ? AND server_id = ?');
    const updateTransaction = db.transaction((ids: string[]) => {
      ids.forEach((id, index) => {
        updateStmt.run(index, id, serverId);
      });
    });

    updateTransaction(channelIds);

    const updatedChannels = db.prepare(`
      SELECT id, server_id as serverId, name, type, order_index as orderIndex, created_at as createdAt
      FROM channels
      WHERE server_id = ?
      ORDER BY order_index ASC, created_at ASC
    `).all(serverId) as Channel[];

    io.emit('channel:reordered', { serverId, channels: updatedChannels });
    res.json(updatedChannels);
  } catch (err) {
    console.error('Erro ao reordenar canais:', err);
    res.status(500).json({ error: 'Erro ao reordenar canais.' });
  }
});

// Delete Channel
app.delete('/api/channels/:channelId', (req, res) => {
  const { channelId } = req.params;
  try {
    const channel = db.prepare('SELECT id, server_id FROM channels WHERE id = ?').get(channelId) as any;
    if (!channel) {
      return res.status(404).json({ error: 'Canal não encontrado.' });
    }

    db.prepare('DELETE FROM messages WHERE channel_id = ?').run(channelId);
    db.prepare('DELETE FROM channels WHERE id = ?').run(channelId);

    io.emit('channel:deleted', { channelId, serverId: channel.server_id });
    res.json({ success: true, channelId, serverId: channel.server_id });
  } catch (err) {
    console.error('Erro ao eliminar canal:', err);
    res.status(500).json({ error: 'Erro ao eliminar canal.' });
  }
});

// Update User Color / Profile
app.put('/api/users/:userId/color', (req, res) => {
  const { userId } = req.params;
  const { color } = req.body;
  if (!color) {
    return res.status(400).json({ error: 'Cor não fornecida.' });
  }

  const result = updateUserColor(userId, color);
  if (!result.success) {
    return res.status(400).json(result);
  }

  io.emit('user:color_updated', { userId, color });
  res.json(result);
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
