import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { getAllUsers } from '../auth/auth';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  User,
  VoiceParticipant,
  Message,
  SignalData
} from '@discord-mini/shared';

export function setupSocketHandlers(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
  // Presence state
  const socketToUser = new Map<string, { userId: string; username: string; color: string }>();
  const userSockets = new Map<string, Set<string>>();

  // Voice rooms state: channelId -> Map<userId, VoiceParticipant>
  const voiceChannels = new Map<string, Map<string, VoiceParticipant>>();
  // userId -> channelId
  const userVoiceLocation = new Map<string, string>();

  function getOnlineUserIds(): Set<string> {
    const ids = new Set<string>();
    for (const [userId, sockets] of userSockets.entries()) {
      if (sockets.size > 0) {
        ids.add(userId);
      }
    }
    return ids;
  }

  function broadcastPresence() {
    const onlineIds = getOnlineUserIds();
    const allUsers = getAllUsers(onlineIds);
    io.emit('presence:update', { users: allUsers });
  }

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[SOCKET] Conexão estabelecida: ${socket.id}`);

    // Initial presence push
    socket.emit('presence:update', { users: getAllUsers(getOnlineUserIds()) });

    // User authentication / identification
    socket.on('user:auth', ({ userId, username }) => {
      const userRow = db.prepare('SELECT id, username, color FROM users WHERE id = ?').get(userId) as any;
      if (!userRow) return;

      socketToUser.set(socket.id, {
        userId: userRow.id,
        username: userRow.username,
        color: userRow.color
      });

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);

      console.log(`[SOCKET] Utilizador autenticado no socket: ${userRow.username} (${userId})`);
      broadcastPresence();
    });

    // Chat messaging
    socket.on('chat:send_message', ({ channelId, content }) => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;

      const trimmed = content.trim();
      if (!trimmed || trimmed.length > 2000) return;

      const messageId = uuidv4();
      const createdAt = new Date().toISOString();

      try {
        db.prepare(`
          INSERT INTO messages (id, channel_id, user_id, username, user_color, content, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(messageId, channelId, userInfo.userId, userInfo.username, userInfo.color, trimmed, createdAt);

        const newMsg: Message = {
          id: messageId,
          channelId,
          userId: userInfo.userId,
          username: userInfo.username,
          userColor: userInfo.color,
          content: trimmed,
          createdAt
        };

        io.emit('chat:new_message', newMsg);
      } catch (err) {
        console.error('[CHAT] Erro ao gravar mensagem:', err);
      }
    });

    // WebRTC Voice Join
    socket.on('voice:join', ({ channelId }) => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;

      // If already in a voice channel, leave first
      const currentChannel = userVoiceLocation.get(userInfo.userId);
      if (currentChannel) {
        handleUserLeaveVoice(userInfo.userId, currentChannel);
      }

      if (!voiceChannels.has(channelId)) {
        voiceChannels.set(channelId, new Map());
      }

      const participantsMap = voiceChannels.get(channelId)!;
      const participant: VoiceParticipant = {
        userId: userInfo.userId,
        username: userInfo.username,
        color: userInfo.color,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        isScreenSharing: false
      };

      // Existing participants before adding newcomer
      const existingParticipants = Array.from(participantsMap.values());

      // Add newcomer
      participantsMap.set(userInfo.userId, participant);
      userVoiceLocation.set(userInfo.userId, channelId);

      socket.join(`voice_${channelId}`);

      // Send list of existing participants to the joining user
      socket.emit('voice:room_participants', {
        channelId,
        participants: existingParticipants
      });

      // Broadcast to all other participants that this user joined
      socket.to(`voice_${channelId}`).emit('voice:user_joined', {
        channelId,
        participant
      });

      console.log(`[VOICE] ${userInfo.username} entrou no canal de voz ${channelId}`);
    });

    // Voice State Change (Mute, Deafen, Speaking, ScreenShare)
    socket.on('voice:state_change', (changes) => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;

      const channelId = userVoiceLocation.get(userInfo.userId);
      if (!channelId || !voiceChannels.has(channelId)) return;

      const participantsMap = voiceChannels.get(channelId)!;
      const participant = participantsMap.get(userInfo.userId);
      if (!participant) return;

      if (typeof changes.isMuted === 'boolean') participant.isMuted = changes.isMuted;
      if (typeof changes.isDeafened === 'boolean') participant.isDeafened = changes.isDeafened;
      if (typeof changes.isSpeaking === 'boolean') participant.isSpeaking = changes.isSpeaking;
      if (typeof changes.isScreenSharing === 'boolean') participant.isScreenSharing = changes.isScreenSharing;

      io.to(`voice_${channelId}`).emit('voice:state_updated', {
        channelId,
        participant
      });
    });

    // WebRTC Voice Leave
    socket.on('voice:leave', () => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;

      const channelId = userVoiceLocation.get(userInfo.userId);
      if (channelId) {
        handleUserLeaveVoice(userInfo.userId, channelId);
      }
    });

    // WebRTC Signaling Relay (Mesh P2P)
    socket.on('webrtc:signal', ({ toUserId, signal }) => {
      const sender = socketToUser.get(socket.id);
      if (!sender) return;

      const targetSockets = userSockets.get(toUserId);
      if (targetSockets && targetSockets.size > 0) {
        for (const targetSocketId of targetSockets) {
          io.to(targetSocketId).emit('webrtc:signal', {
            fromUserId: sender.userId,
            signal
          });
        }
      }
    });

    function handleUserLeaveVoice(userId: string, channelId: string) {
      userVoiceLocation.delete(userId);
      const participantsMap = voiceChannels.get(channelId);
      if (participantsMap) {
        participantsMap.delete(userId);
        if (participantsMap.size === 0) {
          voiceChannels.delete(channelId);
        }
      }
      socket.leave(`voice_${channelId}`);
      io.to(`voice_${channelId}`).emit('voice:user_left', { channelId, userId });
      console.log(`[VOICE] Utilizador ${userId} saiu do canal ${channelId}`);
    }

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`[SOCKET] Desconectado: ${socket.id}`);
      const userInfo = socketToUser.get(socket.id);
      if (userInfo) {
        socketToUser.delete(socket.id);

        const sockets = userSockets.get(userInfo.userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userInfo.userId);

            // Clean up voice if user disconnected completely
            const channelId = userVoiceLocation.get(userInfo.userId);
            if (channelId) {
              handleUserLeaveVoice(userInfo.userId, channelId);
            }

            broadcastPresence();
          }
        }
      }
    });
  });
}
