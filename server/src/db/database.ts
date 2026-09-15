import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'discord.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      pin_hash TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Servers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Channels table
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'voice')),
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    );
  `);

  // Migration: ensure order_index column exists on existing databases
  try {
    db.exec('ALTER TABLE channels ADD COLUMN order_index INTEGER DEFAULT 0');
  } catch {
    // Column already exists
  }

  // Migration: avatar_url in users
  try {
    db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  } catch {
    // Column already exists
  }

  // 4. Messages table (7-day retention)
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      user_color TEXT NOT NULL,
      content TEXT NOT NULL,
      file_url TEXT,
      file_name TEXT,
      file_type TEXT,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migration: ensure file columns exist on existing messages table
  try {
    db.exec('ALTER TABLE messages ADD COLUMN file_url TEXT');
  } catch {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN file_name TEXT');
  } catch {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN file_type TEXT');
  } catch {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN file_size INTEGER');
  } catch {}

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  `);

  // Seed default server and channels if empty
  const serverCount = db.prepare('SELECT COUNT(*) as count FROM servers').get() as { count: number };
  if (serverCount.count === 0) {
    const defaultServerId = 'default-server';
    db.prepare('INSERT INTO servers (id, name) VALUES (?, ?)').run(defaultServerId, 'Comunidade dos Amigos');

    const insertChannel = db.prepare('INSERT INTO channels (id, server_id, name, type, order_index) VALUES (?, ?, ?, ?, ?)');
    // Text channels
    insertChannel.run('chan-geral', defaultServerId, 'geral', 'text', 0);
    insertChannel.run('chan-jogos', defaultServerId, 'jogos', 'text', 1);
    insertChannel.run('chan-memes', defaultServerId, 'memes', 'text', 2);
    // Voice channels
    insertChannel.run('voice-geral', defaultServerId, 'Conversa Geral', 'voice', 3);
    insertChannel.run('voice-jogos', defaultServerId, 'Sala de Jogos', 'voice', 4);

    console.log('[DB] Base de dados inicializada com servidor e canais padrão.');
  } else {
    console.log('[DB] Base de dados carregada com sucesso.');
  }
}
