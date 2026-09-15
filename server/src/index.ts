import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase, db, dbPath } from './db/database';
import { startCleanupScheduler } from './db/cleanup';
import { authenticateOrRegister, changePin, updateUserColor, updateUserAvatar } from './auth/auth';
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure uploads directories exist (resolved relative to server directory)
const serverRoot = path.resolve(__dirname, '..');
export const uploadsDir = process.env.UPLOADS_DIR || path.join(serverRoot, 'uploads');
export const filesDir = path.join(uploadsDir, 'files');
export const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));

// Multer storage for chat files (Photos & Videos up to 100MB)
const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, filesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});
const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Multer storage for user avatars (Images up to 15MB)
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}-${uuidv4()}${ext}`);
  }
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

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

// Update User Avatar
app.post('/api/users/:userId/avatar', uploadAvatar.single('avatar'), (req, res) => {
  const { userId } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro de imagem enviado.' });
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const result = updateUserAvatar(userId, avatarUrl);
  if (!result.success) {
    return res.status(400).json(result);
  }

  io.emit('user:avatar_updated', { userId, avatarUrl });
  res.json({ success: true, avatarUrl });
});

// Upload File (Photos / Videos up to 100MB)
app.post('/api/upload', uploadFile.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
  }

  const fileUrl = `/uploads/files/${req.file.filename}`;
  res.json({
    success: true,
    fileUrl,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    fileSize: req.file.size
  });
});

// Get Channel Messages (last 100)
app.get('/api/channels/:channelId/messages', (req, res) => {
  const { channelId } = req.params;
  try {
    const rows = db.prepare(`
      SELECT 
        id, 
        channel_id as channelId, 
        user_id as userId, 
        username, 
        user_color as userColor, 
        content,
        file_url as fileUrl,
        file_name as fileName,
        file_type as fileType,
        file_size as fileSize,
        created_at as createdAt
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

// Host Info endpoint for local server management
app.get('/api/server/host-info', (_req, res) => {
  try {
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
    const msgCount = (db.prepare('SELECT COUNT(*) as count FROM messages').get() as any)?.count || 0;
    const channelCount = (db.prepare('SELECT COUNT(*) as count FROM channels').get() as any)?.count || 0;

    let uploadsSizeBytes = 0;
    let fileCount = 0;
    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else {
          try {
            uploadsSizeBytes += fs.statSync(fullPath).size;
            fileCount++;
          } catch {}
        }
      }
    };
    scanDir(uploadsDir);

    res.json({
      status: 'running',
      uptimeSeconds: Math.floor(process.uptime()),
      port: PORT,
      databasePath: dbPath,
      uploadsPath: uploadsDir,
      uploadsSizeBytes,
      fileCount,
      userCount,
      msgCount,
      channelCount,
      maxUploadMB: 100
    });
  } catch (err) {
    console.error('Erro ao recolher host-info:', err);
    res.status(500).json({ error: 'Erro ao recolher informações do servidor.' });
  }
});

// Clear uploads endpoint
app.post('/api/server/clear-uploads', (_req, res) => {
  try {
    if (fs.existsSync(filesDir)) {
      const files = fs.readdirSync(filesDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(filesDir, file));
        } catch {}
      }
    }
    res.json({ success: true, message: 'Pasta de ficheiros limpa com sucesso.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Falha ao limpar ficheiros.' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Servidor Discord-Mini ativo na porta ${PORT}`);
  console.log(`📡 URL local: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
