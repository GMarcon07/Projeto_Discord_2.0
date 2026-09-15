import { Message, User, VoiceParticipant, Channel, Server } from './types';

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate' | 'screen-offer' | 'screen-answer' | 'screen-ice-candidate';
  sdp?: any;
  candidate?: any;
  target?: string;
  hasAudio?: boolean;
}

export interface ClientToServerEvents {
  'user:auth': (data: { userId: string; username: string }) => void;
  'chat:send_message': (data: { channelId: string; content: string }) => void;
  'voice:join': (data: { channelId: string }) => void;
  'voice:leave': () => void;
  'voice:state_change': (data: {
    isMuted?: boolean;
    isDeafened?: boolean;
    isSpeaking?: boolean;
    isScreenSharing?: boolean;
    pingMs?: number;
  }) => void;
  'webrtc:signal': (data: { toUserId: string; signal: SignalData }) => void;
  'channel:create': (data: { serverId: string; name: string; type: 'text' | 'voice' }) => void;
  'channel:reorder': (data: { serverId: string; channelIds: string[] }) => void;
  'server:create': (data: { name: string }) => void;
}

export interface ServerToClientEvents {
  'presence:update': (data: { users: User[] }) => void;
  'chat:new_message': (message: Message) => void;
  'voice:user_joined': (data: { channelId: string; participant: VoiceParticipant }) => void;
  'voice:user_left': (data: { channelId: string; userId: string }) => void;
  'voice:state_updated': (data: { channelId: string; participant: VoiceParticipant }) => void;
  'voice:room_participants': (data: { channelId: string; participants: VoiceParticipant[] }) => void;
  'webrtc:signal': (data: { fromUserId: string; signal: SignalData }) => void;
  'channel:created': (data: { channel: Channel }) => void;
  'channel:deleted': (data: { channelId: string; serverId: string }) => void;
  'channel:reordered': (data: { serverId: string; channels: Channel[] }) => void;
  'server:created': (data: { server: Server }) => void;
  'user:color_updated': (data: { userId: string; color: string }) => void;
}
