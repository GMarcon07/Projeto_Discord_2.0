import { create } from 'zustand';
import { User, Server, Channel, Message, VoiceParticipant, ScreenShareSource, StreamQuality, ThemeMode } from '@discord-mini/shared';

interface AppState {
  // Authentication & Server URL
  currentUser: User | null;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  setCurrentUser: (user: User | null) => void;

  // Servers & Channels
  servers: Server[];
  currentServerId: string | null;
  currentChannelId: string | null;
  setServers: (servers: Server[]) => void;
  addServer: (server: Server) => void;
  setCurrentServerId: (id: string | null) => void;
  setCurrentChannelId: (id: string | null) => void;
  addChannelToServer: (channel: Channel) => void;
  setServerChannels: (serverId: string, channels: Channel[]) => void;

  // Messages
  messages: Record<string, Message[]>;
  addMessage: (message: Message) => void;
  markMessageError: (clientMessageId: string) => void;
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

  // Multi-stream screen shares: userId -> MediaStream
  remoteScreenStreams: Record<string, MediaStream>;
  activeViewingScreenUserId: string | null;
  setRemoteScreenStreams: (streams: Map<string, MediaStream>) => void;
  setActiveViewingScreenUserId: (userId: string | null) => void;

  // Audio & Mic Settings
  inputDeviceId: string;
  outputDeviceId: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  micSensitivity: number; // 0.005 to 0.1
  liveMicVolume: number;  // 0.0 to 1.0
  userVolumes: Record<string, number>; // userId -> 0 to 200%
  screenShareVolume: number; // 0 to 100%

  setInputDeviceId: (id: string) => void;
  setOutputDeviceId: (id: string) => void;
  setNoiseSuppression: (enabled: boolean) => void;
  setEchoCancellation: (enabled: boolean) => void;
  setMicSensitivity: (sensitivity: number) => void;
  setLiveMicVolume: (vol: number) => void;
  setUserVolume: (userId: string, volume: number) => void;
  setScreenShareVolume: (volume: number) => void;

  // Screen Quality & System Audio Settings
  streamQuality: StreamQuality;
  includeSystemAudio: boolean;
  setStreamQuality: (quality: StreamQuality) => void;
  setIncludeSystemAudio: (enabled: boolean) => void;

  // Individual Screen Share Volumes: userId -> 0 to 100%
  screenShareVolumes: Record<string, number>;
  setScreenShareUserVolume: (userId: string, volume: number) => void;

  // Local Mute: userId -> boolean
  localMutedUsers: Record<string, boolean>;
  toggleLocalMuteUser: (userId: string) => void;

  // Channel deletion & User color update
  removeChannelFromServer: (serverId: string, channelId: string) => void;
  updateUserColor: (userId: string, color: string) => void;

  // Context Menu
  contextMenu: {
    isOpen: boolean;
    x: number;
    y: number;
    targetUser: {
      id: string;
      username: string;
      color?: string;
      avatarUrl?: string;
      isScreenSharing?: boolean;
    } | null;
  };
  openContextMenu: (
    x: number,
    y: number,
    targetUser: { id: string; username: string; color?: string; avatarUrl?: string; isScreenSharing?: boolean }
  ) => void;
  closeContextMenu: () => void;

  // Appearance & Themes
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  updateUserColor: (userId: string, color: string) => void;
  updateUserAvatar: (userId: string, avatarUrl: string) => void;

  // System Settings
  minimizeToTray: boolean;
  disableGpu: boolean;
  setMinimizeToTray: (enabled: boolean) => void;
  setDisableGpu: (enabled: boolean) => void;

  // Ping Map: userId -> ping in ms
  peerPings: Record<string, number>;
  setPeerPing: (userId: string, pingMs: number) => void;

  setActiveVoiceChannel: (channelId: string | null, participants?: VoiceParticipant[]) => void;
  setVoiceParticipants: (participants: VoiceParticipant[]) => void;
  updateVoiceParticipant: (participant: VoiceParticipant) => void;
  removeVoiceParticipant: (userId: string) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setScreenSharing: (isSharing: boolean, stream?: MediaStream | null, sharerName?: string | null) => void;

  // Modals
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  isScreenPickerOpen: boolean;
  availableScreenSources: ScreenShareSource[];
  setScreenPickerOpen: (open: boolean, sources?: ScreenShareSource[]) => void;

  isCreateChannelOpen: boolean;
  createChannelType: 'text' | 'voice';
  setCreateChannelOpen: (open: boolean, type?: 'text' | 'voice') => void;

  isCreateServerOpen: boolean;
  setCreateServerOpen: (open: boolean) => void;
}

const savedServerUrl = localStorage.getItem('a_resenha_server_url') || localStorage.getItem('discord_mini_server_url') || 'https://projeto-discord-2-0.onrender.com';
const savedUser = localStorage.getItem('discord_mini_user');
const savedTheme = (localStorage.getItem('discord_mini_theme') as ThemeMode) || 'dark';
const savedInputDev = localStorage.getItem('discord_mini_input_device') || '';
const savedOutputDev = localStorage.getItem('discord_mini_output_device') || '';
const savedNoiseSupp = localStorage.getItem('discord_mini_noise_supp') !== 'false';
const savedEchoCanc = localStorage.getItem('discord_mini_echo_canc') !== 'false';
const savedSensitivity = parseFloat(localStorage.getItem('discord_mini_mic_sens') || '0.02');
const savedStreamQuality = (localStorage.getItem('discord_mini_stream_quality') as StreamQuality) || '1080p60';
const savedIncludeAudio = localStorage.getItem('discord_mini_stream_audio') !== 'false';
const savedUserVolumes = JSON.parse(localStorage.getItem('discord_mini_user_volumes') || '{}');
const savedScreenVol = parseFloat(localStorage.getItem('discord_mini_screen_vol') || '100');

export const useAppStore = create<AppState>((set) => ({
  currentUser: savedUser ? JSON.parse(savedUser) : null,
  serverUrl: savedServerUrl,
  setServerUrl: (url) => {
    localStorage.setItem('a_resenha_server_url', url);
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
  addServer: (server) =>
    set((state) => {
      if (state.servers.some((s) => s.id === server.id)) return state;
      return { servers: [...state.servers, server] };
    }),
  setCurrentServerId: (id) => set({ currentServerId: id }),
  setCurrentChannelId: (id) => set({ currentChannelId: id }),
  addChannelToServer: (channel) =>
    set((state) => ({
      servers: state.servers.map((s) => {
        if (s.id !== channel.serverId) return s;
        if (s.channels.some((c) => c.id === channel.id)) return s;
        return { ...s, channels: [...s.channels, channel] };
      })
    })),
  setServerChannels: (serverId, channels) =>
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === serverId ? { ...s, channels } : s
      )
    })),
  removeChannelFromServer: (serverId, channelId) =>
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === serverId ? { ...s, channels: s.channels.filter((c) => c.id !== channelId) } : s
      ),
      currentChannelId: state.currentChannelId === channelId ? null : state.currentChannelId
    })),
  updateUserColor: (userId, color) =>
    set((state) => {
      const nextUser = state.currentUser?.id === userId ? { ...state.currentUser, color } : state.currentUser;
      if (state.currentUser?.id === userId && nextUser) {
        localStorage.setItem('discord_mini_user', JSON.stringify(nextUser));
      }
      return {
        currentUser: nextUser,
        members: state.members.map((m) => (m.id === userId ? { ...m, color } : m)),
        voiceParticipants: state.voiceParticipants.map((p) =>
          p.userId === userId ? { ...p, color } : p
        )
      };
    }),
  updateUserAvatar: (userId, avatarUrl) =>
    set((state) => {
      const nextUser = state.currentUser?.id === userId ? { ...state.currentUser, avatarUrl } : state.currentUser;
      if (state.currentUser?.id === userId && nextUser) {
        localStorage.setItem('discord_mini_user', JSON.stringify(nextUser));
      }
      return {
        currentUser: nextUser,
        members: state.members.map((m) => (m.id === userId ? { ...m, avatarUrl } : m)),
        voiceParticipants: state.voiceParticipants.map((p) =>
          p.userId === userId ? { ...p, avatarUrl } : p
        )
      };
    }),

  messages: {},
  addMessage: (message) =>
    set((state) => {
      const channelMsgs = state.messages[message.channelId] || [];

      // 1. Exact ID already present
      if (channelMsgs.some((m) => m.id === message.id)) return state;

      // 2. Reconcile optimistic message by clientMessageId
      if (message.clientMessageId) {
        const tempIdx = channelMsgs.findIndex(
          (m) => m.id === message.clientMessageId || m.clientMessageId === message.clientMessageId
        );
        if (tempIdx !== -1) {
          const updated = [...channelMsgs];
          updated[tempIdx] = { ...message, status: 'sent' };
          return {
            messages: {
              ...state.messages,
              [message.channelId]: updated
            }
          };
        }
      }

      // 3. Fallback reconciliation: matching temp- ID, sender, and content
      const recentTempIdx = channelMsgs.findIndex(
        (m) =>
          m.id.startsWith('temp-') &&
          m.userId === message.userId &&
          m.content === message.content &&
          Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 15000
      );
      if (recentTempIdx !== -1) {
        const updated = [...channelMsgs];
        updated[recentTempIdx] = { ...message, status: 'sent' };
        return {
          messages: {
            ...state.messages,
            [message.channelId]: updated
          }
        };
      }

      return {
        messages: {
          ...state.messages,
          [message.channelId]: [...channelMsgs, message]
        }
      };
    }),
  markMessageError: (clientMessageId) =>
    set((state) => {
      const nextMessages: Record<string, Message[]> = {};
      for (const [chanId, msgs] of Object.entries(state.messages)) {
        nextMessages[chanId] = msgs.map((m) =>
          m.id === clientMessageId || m.clientMessageId === clientMessageId
            ? { ...m, status: 'error' }
            : m
        );
      }
      return { messages: nextMessages };
    }),
  setChannelMessages: (channelId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: Array.isArray(messages) ? messages : []
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

  remoteScreenStreams: {},
  activeViewingScreenUserId: null,
  setRemoteScreenStreams: (streamsMap) => {
    const obj: Record<string, MediaStream> = {};
    streamsMap.forEach((stream, userId) => {
      obj[userId] = stream;
    });
    set({ remoteScreenStreams: obj });
  },
  setActiveViewingScreenUserId: (userId) => set({ activeViewingScreenUserId: userId }),

  // Audio settings
  inputDeviceId: savedInputDev,
  outputDeviceId: savedOutputDev,
  noiseSuppression: savedNoiseSupp,
  echoCancellation: savedEchoCanc,
  micSensitivity: savedSensitivity,
  liveMicVolume: 0,
  userVolumes: savedUserVolumes,
  screenShareVolume: savedScreenVol,

  setInputDeviceId: (id) => {
    localStorage.setItem('discord_mini_input_device', id);
    set({ inputDeviceId: id });
  },
  setOutputDeviceId: (id) => {
    localStorage.setItem('discord_mini_output_device', id);
    set({ outputDeviceId: id });
  },
  setNoiseSuppression: (enabled) => {
    localStorage.setItem('discord_mini_noise_supp', String(enabled));
    set({ noiseSuppression: enabled });
  },
  setEchoCancellation: (enabled) => {
    localStorage.setItem('discord_mini_echo_canc', String(enabled));
    set({ echoCancellation: enabled });
  },
  setMicSensitivity: (sensitivity) => {
    localStorage.setItem('discord_mini_mic_sens', String(sensitivity));
    set({ micSensitivity: sensitivity });
  },
  setLiveMicVolume: (vol) => set({ liveMicVolume: vol }),
  setUserVolume: (userId, volume) =>
    set((state) => {
      const next = { ...state.userVolumes, [userId]: volume };
      localStorage.setItem('discord_mini_user_volumes', JSON.stringify(next));
      return { userVolumes: next };
    }),
  setScreenShareVolume: (volume) => {
    localStorage.setItem('discord_mini_screen_vol', String(volume));
    set({ screenShareVolume: volume });
  },

  screenShareVolumes: JSON.parse(localStorage.getItem('discord_mini_screen_user_vols') || '{}'),
  setScreenShareUserVolume: (userId, volume) =>
    set((state) => {
      const next = { ...state.screenShareVolumes, [userId]: volume };
      localStorage.setItem('discord_mini_screen_user_vols', JSON.stringify(next));
      return { screenShareVolumes: next };
    }),

  localMutedUsers: {},
  toggleLocalMuteUser: (userId) =>
    set((state) => ({
      localMutedUsers: {
        ...state.localMutedUsers,
        [userId]: !state.localMutedUsers[userId]
      }
    })),

  contextMenu: {
    isOpen: false,
    x: 0,
    y: 0,
    targetUser: null
  },
  openContextMenu: (x, y, targetUser) =>
    set({
      contextMenu: { isOpen: true, x, y, targetUser }
    }),
  closeContextMenu: () =>
    set({
      contextMenu: { isOpen: false, x: 0, y: 0, targetUser: null }
    }),

  // Stream Quality
  streamQuality: savedStreamQuality,
  includeSystemAudio: savedIncludeAudio,
  setStreamQuality: (quality) => {
    localStorage.setItem('discord_mini_stream_quality', quality);
    set({ streamQuality: quality });
  },
  setIncludeSystemAudio: (enabled) => {
    localStorage.setItem('discord_mini_stream_audio', String(enabled));
    set({ includeSystemAudio: enabled });
  },

  // Theme
  theme: savedTheme,
  setTheme: (theme) => {
    localStorage.setItem('discord_mini_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  // System
  minimizeToTray: false,
  disableGpu: false,
  setMinimizeToTray: (enabled) => set({ minimizeToTray: enabled }),
  setDisableGpu: (enabled) => set({ disableGpu: enabled }),

  // Peer pings
  peerPings: {},
  setPeerPing: (userId, pingMs) =>
    set((state) => ({
      peerPings: { ...state.peerPings, [userId]: pingMs }
    })),

  setActiveVoiceChannel: (channelId, participants = []) =>
    set({
      activeVoiceChannelId: channelId,
      voiceParticipants: participants,
      isScreenSharing: false,
      screenShareStream: null,
      screenSharerName: null,
      remoteScreenStreams: {},
      activeViewingScreenUserId: null,
      peerPings: {}
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

  isSettingsOpen: false,
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  isScreenPickerOpen: false,
  availableScreenSources: [],
  setScreenPickerOpen: (open, sources = []) =>
    set({
      isScreenPickerOpen: open,
      availableScreenSources: sources
    }),

  isCreateChannelOpen: false,
  createChannelType: 'text',
  setCreateChannelOpen: (open, type = 'text') =>
    set({ isCreateChannelOpen: open, createChannelType: type }),

  isCreateServerOpen: false,
  setCreateServerOpen: (open) => set({ isCreateServerOpen: open })
}));
