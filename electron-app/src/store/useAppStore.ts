import { create } from 'zustand';
import { User, Server, Channel, Message, VoiceParticipant, ScreenShareSource } from '@discord-mini/shared';

interface AppState {
  // Authentication & Settings
  currentUser: User | null;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  setCurrentUser: (user: User | null) => void;

  // Servers & Channels
  servers: Server[];
  currentServerId: string | null;
  currentChannelId: string | null;
  setServers: (servers: Server[]) => void;
  setCurrentServerId: (id: string | null) => void;
  setCurrentChannelId: (id: string | null) => void;

  // Messages
  messages: Record<string, Message[]>; // channelId -> Message[]
  addMessage: (message: Message) => void;
  setChannelMessages: (channelId: string, messages: Message[]) => void;

  // Members / Presence
  members: User[];
  setMembers: (members: User[]) => void;

  // Voice & WebRTC
  activeVoiceChannelId: string | null;
  voiceParticipants: VoiceParticipant[];
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  screenShareStream: MediaStream | null;
  screenSharerName: string | null;

  setActiveVoiceChannel: (channelId: string | null, participants?: VoiceParticipant[]) => void;
  setVoiceParticipants: (participants: VoiceParticipant[]) => void;
  updateVoiceParticipant: (participant: VoiceParticipant) => void;
  removeVoiceParticipant: (userId: string) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setScreenSharing: (isSharing: boolean, stream?: MediaStream | null, sharerName?: string | null) => void;

  // Modals
  isScreenPickerOpen: boolean;
  availableScreenSources: ScreenShareSource[];
  setScreenPickerOpen: (open: boolean, sources?: ScreenShareSource[]) => void;
}

const savedServerUrl = localStorage.getItem('discord_mini_server_url') || 'http://localhost:3001';
const savedUser = localStorage.getItem('discord_mini_user');

export const useAppStore = create<AppState>((set) => ({
  currentUser: savedUser ? JSON.parse(savedUser) : null,
  serverUrl: savedServerUrl,
  setServerUrl: (url) => {
    localStorage.setItem('discord_mini_server_url', url);
    set({ serverUrl: url });
  },
  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem('discord_mini_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('discord_mini_user');
    }
    set({ currentUser: user });
  },

  servers: [],
  currentServerId: null,
  currentChannelId: null,
  setServers: (servers) => set({ servers }),
  setCurrentServerId: (id) => set({ currentServerId: id }),
  setCurrentChannelId: (id) => set({ currentChannelId: id }),

  messages: {},
  addMessage: (message) =>
    set((state) => {
      const channelMsgs = state.messages[message.channelId] || [];
      // Prevent duplicates
      if (channelMsgs.some((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [message.channelId]: [...channelMsgs, message]
        }
      };
    }),
  setChannelMessages: (channelId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: messages
      }
    })),

  members: [],
  setMembers: (members) => set({ members }),

  activeVoiceChannelId: null,
  voiceParticipants: [],
  isMuted: false,
  isDeafened: false,
  isSpeaking: false,
  isScreenSharing: false,
  screenShareStream: null,
  screenSharerName: null,

  setActiveVoiceChannel: (channelId, participants = []) =>
    set({
      activeVoiceChannelId: channelId,
      voiceParticipants: participants,
      isScreenSharing: false,
      screenShareStream: null,
      screenSharerName: null
    }),

  setVoiceParticipants: (participants) => set({ voiceParticipants: participants }),

  updateVoiceParticipant: (participant) =>
    set((state) => {
      const exists = state.voiceParticipants.some((p) => p.userId === participant.userId);
      const updated = exists
        ? state.voiceParticipants.map((p) => (p.userId === participant.userId ? participant : p))
        : [...state.voiceParticipants, participant];
      return { voiceParticipants: updated };
    }),

  removeVoiceParticipant: (userId) =>
    set((state) => ({
      voiceParticipants: state.voiceParticipants.filter((p) => p.userId !== userId)
    })),

  setMuted: (muted) => set({ isMuted: muted }),
  setDeafened: (deafened) => set({ isDeafened: deafened }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),
  setScreenSharing: (isSharing, stream = null, sharerName = null) =>
    set({
      isScreenSharing: isSharing,
      screenShareStream: stream,
      screenSharerName: sharerName
    }),

  isScreenPickerOpen: false,
  availableScreenSources: [],
  setScreenPickerOpen: (open, sources = []) =>
    set({
      isScreenPickerOpen: open,
      availableScreenSources: sources
    })
}));
