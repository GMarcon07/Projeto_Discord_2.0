import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { getAvatarColor, User } from '@discord-mini/shared';

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: User;
}

export function authenticateOrRegister(username: string, pin: string, isRegisterOnly = false): AuthResult {
  const trimmedUsername = username.trim();
  if (!trimmedUsername || trimmedUsername.length < 2 || trimmedUsername.length > 25) {
    return { success: false, message: 'O username deve ter entre 2 e 25 caracteres.' };
  }

  const cleanPin = pin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return { success: false, message: 'O PIN deve conter exatamente entre 4 e 6 dígitos numéricos.' };
  }

  const existingUser = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(trimmedUsername) as any;

  if (existingUser) {
    if (isRegisterOnly) {
      return { success: false, message: 'Este nome de utilizador já se encontra registado.' };
    }
    const isPinValid = bcrypt.compareSync(cleanPin, existingUser.pin_hash);
    if (!isPinValid) {
      return { success: false, message: 'PIN incorreto.' };
    }

    return {
      success: true,
      user: {
        id: existingUser.id,
        username: existingUser.username,
        color: existingUser.color,
        isOnline: true,
        createdAt: existingUser.created_at
      }
    };
  }

  // Register new user
  const pinHash = bcrypt.hashSync(cleanPin, 10);
  const color = getAvatarColor(trimmedUsername);
  const id = uuidv4();

  db.prepare(`
    INSERT INTO users (id, username, pin_hash, color)
    VALUES (?, ?, ?, ?)
  `).run(id, trimmedUsername, pinHash, color);

  return {
    success: true,
    user: {
      id,
      username: trimmedUsername,
      color,
      isOnline: true,
      createdAt: new Date().toISOString()
    }
  };
}

export function getAllUsers(onlineUserIds: Set<string>): User[] {
  const rows = db.prepare('SELECT id, username, color, created_at FROM users ORDER BY username ASC').all() as any[];
  return rows.map(r => ({
    id: r.id,
    username: r.username,
    color: r.color,
    isOnline: onlineUserIds.has(r.id),
    createdAt: r.created_at
  }));
}

export function changePin(userId: string, currentPin: string, newPin: string): { success: boolean; message: string } {
  const user = db.prepare('SELECT id, pin_hash FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return { success: false, message: 'Utilizador não encontrado.' };
  }

  const isCurrentPinValid = bcrypt.compareSync(currentPin.trim(), user.pin_hash);
  if (!isCurrentPinValid) {
    return { success: false, message: 'O PIN atual está incorreto.' };
  }

  const cleanNewPin = newPin.trim();
  if (!/^\d{4,6}$/.test(cleanNewPin)) {
    return { success: false, message: 'O novo PIN deve conter entre 4 e 6 dígitos numéricos.' };
  }

  const newHash = bcrypt.hashSync(cleanNewPin, 10);
  db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(newHash, userId);

  return { success: true, message: 'PIN alterado com sucesso!' };
}

export function updateUserColor(userId: string, color: string): { success: boolean; message: string; color?: string } {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return { success: false, message: 'Utilizador não encontrado.' };
  }

  const cleanColor = (color || '').trim();
  if (!cleanColor) {
    return { success: false, message: 'Cor inválida.' };
  }

  db.prepare('UPDATE users SET color = ? WHERE id = ?').run(cleanColor, userId);
  return { success: true, message: 'Cor atualizada com sucesso!', color: cleanColor };
}

