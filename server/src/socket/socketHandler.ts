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
  const socketToUser = new Map<string, { userId: string; username: string; color: string; avatarUrl?: string }>();
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
      let userRow = db.prepare('SELECT id, username, color, avatar_url, created_at FROM users WHERE id = ?').get(userId) as any;
      if (!userRow && username) {
        // Fallback: match by username (e.g. if user connected to another server with same username)
        userRow = db.prepare('SELECT id, username, color, avatar_url, created_at FROM users WHERE username = ? COLLATE NOCASE').get(username) as any;
      }

      if (!userRow) {
        console.warn(`[SOCKET] Utilizador não reconhecido neste servidor: ${username} (${userId})`);
        socket.emit('auth:required', { message: 'Sessão inválida neste servidor. Por favor entra com o teu PIN.' });
        return;
      }

      const canonicalUserId = userRow.id;

      socketToUser.set(socket.id, {
        userId: canonicalUserId,
        username: userRow.username,
        color: userRow.color,
        avatarUrl: userRow.avatar_url || undefined
      });

      if (!userSockets.has(canonicalUserId)) {
        userSockets.set(canonicalUserId, new Set());
      }
      userSockets.get(canonicalUserId)!.add(socket.id);

      // If user ID was different from the requested one, sync client store
      if (canonicalUserId !== userId) {
        socket.emit('auth:synced', {
          user: {
            id: userRow.id,
            username: userRow.username,
            color: userRow.color,
            avatarUrl: userRow.avatar_url || undefined,
            isOnline: true,
            createdAt: userRow.created_at
          }
        });
      }

      console.log(`[SOCKET] Utilizador autenticado no socket: ${userRow.username} (${canonicalUserId})`);
      broadcastPresence();
    });

    // Chat messaging
    socket.on('chat:send_message', ({ channelId, content, fileUrl, fileName, fileType, fileSize }) => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) {
        console.warn(`[CHAT] Mensagem rejeitada: socket ${socket.id} não autenticado`);
        socket.emit('auth:required', { message: 'Precisas de estar autenticado para enviar mensagens.' });
        return;
      }

      const trimmed = (content || '').trim();
      if (!trimmed && !fileUrl) return;
      if (trimmed.length > 2000) return;

      const messageId = uuidv4();
      const createdAt = new Date().toISOString();

      try {
        db.prepare(`
          INSERT INTO messages (id, channel_id, user_id, username, user_color, content, file_url, file_name, file_type, file_size, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          messageId,
          channelId,
          userInfo.userId,
          userInfo.username,
          userInfo.color,
          trimmed,
          fileUrl || null,
          fileName || null,
          fileType || null,
          fileSize || null,
          createdAt
        );

        const newMsg: Message = {
          id: messageId,
          channelId,
          userId: userInfo.userId,
          username: userInfo.username,
          userColor: userInfo.color,
          content: trimmed,
          fileUrl: fileUrl || undefined,
          fileName: fileName || undefined,
          fileType: fileType || undefined,
          fileSize: fileSize || undefined,
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
      if (!userInfo) {
        console.warn(`[VOICE] Entrada em voz rejeitada: socket ${socket.id} não autenticado`);
        socket.emit('auth:required', { message: 'Precisas de estar autenticado para entrar em chamadas.' });
        return;
      }

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
        avatarUrl: userInfo.avatarUrl,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        isScreenSharing: false
      };

      // Add newcomer to participants map
      participantsMap.set(userInfo.userId, participant);
      userVoiceLocation.set(userInfo.userId, channelId);

      socket.join(`voice_${channelId}`);

      // Send list of ALL participants in the channel (including the newcomer) to the joining user
      const allParticipants = Array.from(participantsMap.values());
      socket.emit('voice:room_participants', {
        channelId,
        participants: allParticipants
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
