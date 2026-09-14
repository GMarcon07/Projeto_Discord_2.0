import { Message, User, VoiceParticipant } from './types';

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate' | 'screen-offer' | 'screen-answer' | 'screen-ice-candidate';
  sdp?: any;
  candidate?: any;
  target?: string;
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
  }) => void;
  'webrtc:signal': (data: { toUserId: string; signal: SignalData }) => void;
}

export interface ServerToClientEvents {
  'presence:update': (data: { users: User[] }) => void;
  'chat:new_message': (message: Message) => void;
  'voice:user_joined': (data: { channelId: string; participant: VoiceParticipant }) => void;
  'voice:user_left': (data: { channelId: string; userId: string }) => void;
  'voice:state_updated': (data: { channelId: string; participant: VoiceParticipant }) => void;
  'voice:room_participants': (data: { channelId: string; participants: VoiceParticipant[] }) => void;
  'webrtc:signal': (data: { fromUserId: string; signal: SignalData }) => void;
}
