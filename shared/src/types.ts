export interface User {
  id: string;
  username: string;
  color: string;
  avatarUrl?: string;
  isOnline: boolean;
  createdAt: string;
}

export interface Server {
  id: string;
  name: string;
  createdAt: string;
  channels: Channel[];
}

export type ChannelType = 'text' | 'voice';

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  orderIndex: number;
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  userColor: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  clientMessageId?: string;
  status?: 'sending' | 'sent' | 'error';
}

export interface VoiceParticipant {
  userId: string;
  username: string;
  color: string;
  avatarUrl?: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  pingMs?: number;
}

export interface ScreenShareSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon?: string;
}

export type StreamQuality = '720p30' | '1080p30' | '1080p60' | '1440p60';

export type ThemeMode = 'dark' | 'oled' | 'light' | 'navy';

export interface AudioSettings {
  inputDeviceId: string;
  outputDeviceId: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  sensitivityThreshold: number; // 0.005 to 0.1
}

export interface ActiveScreenShare {
  userId: string;
  username: string;
  stream: MediaStream;
}

export const AVATAR_COLORS = [
  '#5865F2', // Discord Blurple
  '#57F287', // Green
  '#FEE75C', // Yellow
  '#EB459E', // Fuchsia
  '#ED4245', // Red
  '#3BA55D', // Emerald
  '#FAA81A', // Amber
  '#00AFF0', // Skype Blue
  '#9B59B6', // Purple
  '#1ABC9C'  // Turquoise
];

export function getAvatarColor(username: string): string {
  if (!username) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
