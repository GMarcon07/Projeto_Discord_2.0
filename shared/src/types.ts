export interface User {
  id: string;
  username: string;
  color: string;
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
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  userColor: string;
  content: string;
  createdAt: string;
}

export interface VoiceParticipant {
  userId: string;
  username: string;
  color: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
}

export interface ScreenShareSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon?: string;
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
