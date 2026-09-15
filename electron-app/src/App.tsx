import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from './store/useAppStore';
import { VoiceManager } from './webrtc/voiceManager';
import { ScreenShareManager } from './webrtc/screenShareManager';
import { sounds } from './utils/soundEffects';

// Components
import { TitleBar } from './components/TitleBar/TitleBar';
import { AuthModal } from './components/Auth/AuthModal';
import { ServerSidebar } from './components/Sidebar/ServerSidebar';
import { ChannelSidebar } from './components/Sidebar/ChannelSidebar';
import { ChatArea } from './components/Chat/ChatArea';
import { VoiceArea } from './components/Voice/VoiceArea';
import { ScreenPickerModal } from './components/ScreenShare/ScreenPickerModal';
import { ScreenShareViewer } from './components/ScreenShare/ScreenShareViewer';
import { MemberList } from './components/MemberList/MemberList';
import { SettingsModal } from './components/Settings/SettingsModal';
import { CreateChannelModal } from './components/Modals/CreateChannelModal';
import { CreateServerModal } from './components/Modals/CreateServerModal';
import { UserContextMenu } from './components/User/UserContextMenu';

export const App: React.FC = () => {
  const {
    currentUser,
    serverUrl,
    servers,
    currentServerId,
    currentChannelId,
    setServers,
    addServer,
    setCurrentServerId,
    setCurrentChannelId,
    addChannelToServer,
    removeChannelFromServer,
    setServerChannels,
    updateUserColor,
    updateUserAvatar,
    localMutedUsers,
    addMessage,
    setChannelMessages,
    setMembers,
    activeVoiceChannelId,
    setActiveVoiceChannel,
    voiceParticipants,
    setVoiceParticipants,
    updateVoiceParticipant,
    removeVoiceParticipant,
    isMuted,
    setMuted,
    isDeafened,
    setDeafened,
    setSpeaking,
    isScreenSharing,
    setScreenSharing,
    setScreenPickerOpen,
    setRemoteScreenStreams,
    setPeerPing,
    theme,
    inputDeviceId,
    outputDeviceId,
    noiseSuppression,
    echoCancellation,
    micSensitivity,
    setLiveMicVolume,
    userVolumes,
    streamQuality,
    includeSystemAudio,
    setMinimizeToTray,
    setDisableGpu
  } = useAppStore();

  const socketRef = useRef<Socket | null>(null);
  const voiceManagerRef = useRef<VoiceManager | null>(null);
  const screenShareManagerRef = useRef<ScreenShareManager>(new ScreenShareManager());

  // 1. Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 2. Load Native Windows / Electron Config
  useEffect(() => {
    if (window.electronAPI?.getConfig) {
      window.electronAPI.getConfig().then((cfg) => {
        if (cfg) {
          if (cfg.minimizeToTray !== undefined) setMinimizeToTray(cfg.minimizeToTray);
          if (cfg.disableGpu !== undefined) setDisableGpu(cfg.disableGpu);
        }
      });
    }
  }, []);

  // 3. Initial Load & Fetch Servers
  useEffect(() => {
    if (!currentUser) return;

    fetch(`${serverUrl}/api/servers`)
      .then((res) => res.json())
      .then((data) => {
        setServers(data);
        if (data.length > 0 && !currentServerId) {
          setCurrentServerId(data[0].id);
          const firstText = data[0].channels.find((c: any) => c.type === 'text') || data[0].channels[0];
          if (firstText) setCurrentChannelId(firstText.id);
        }
      })
      .catch((err) => console.error('Erro ao carregar servidores:', err));
  }, [currentUser, serverUrl]);

  // 4. Fetch Channel Messages
  useEffect(() => {
    if (!currentChannelId || !currentUser) return;

    fetch(`${serverUrl}/api/channels/${currentChannelId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setChannelMessages(currentChannelId, data);
      })
      .catch((err) => console.error('Erro ao carregar histórico de mensagens:', err));
  }, [currentChannelId, currentUser, serverUrl]);

  // 5. Socket.io Connection & Event Listeners
  useEffect(() => {
    if (!currentUser) return;

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SOCKET] Ligado ao servidor de sinalização!');
      socket.emit('user:auth', {
        userId: currentUser.id,
        username: currentUser.username
      });
    });

    // Online Presence updates
    socket.on('presence:update', ({ users }) => {
      if (currentUser && !users.some((u) => u.id === currentUser.id)) {
        setMembers([...users, { ...currentUser, isOnline: true }]);
      } else {
        setMembers(users);
      }
    });

    // Session synchronization & invalidation
    socket.on('auth:synced', ({ user }) => {
      console.log('[AUTH] Sessão sincronizada com o servidor:', user);
      setCurrentUser(user);
    });

    socket.on('auth:required', ({ message }) => {
      console.warn('[AUTH] Autenticação necessária:', message);
      setCurrentUser(null);
    });

    // Chat Messages
    socket.on('chat:new_message', (message) => {
      addMessage(message);

      // Notification and sound for other users' messages
      if (message.userId !== currentUser.id) {
        sounds.playMessageNotification();

        // Native Windows Notification
        if (window.electronAPI?.showNotification) {
          window.electronAPI.showNotification({
            title: `${message.username}`,
            body: message.content
          });
        }
      }
    });

    // WebRTC Voice Signaling
    socket.on('voice:room_participants', ({ channelId, participants }) => {
      let finalParticipants = participants;
      if (!participants.some((p) => p.userId === currentUser.id)) {
        finalParticipants = [
          ...participants,
          {
            userId: currentUser.id,
            username: currentUser.username,
            color: currentUser.color,
            avatarUrl: currentUser.avatarUrl,
            isMuted,
            isDeafened,
            isSpeaking: false,
            isScreenSharing
          }
        ];
      }
      setVoiceParticipants(finalParticipants);
      voiceManagerRef.current?.connectToParticipants(participants);
    });

    socket.on('voice:user_joined', ({ channelId, participant }) => {
      updateVoiceParticipant(participant);
      voiceManagerRef.current?.handleUserJoined(participant.userId);
    });

    socket.on('voice:user_left', ({ channelId, userId }) => {
      removeVoiceParticipant(userId);
      voiceManagerRef.current?.handleUserLeft(userId);
    });

    socket.on('voice:state_updated', ({ channelId, participant }) => {
      updateVoiceParticipant(participant);
    });

    socket.on('webrtc:signal', ({ fromUserId, signal }) => {
      voiceManagerRef.current?.handleSignal(fromUserId, signal);
    });

    // Dynamic Server & Channel Sync
    socket.on('server:created', ({ server }) => {
      addServer(server);
    });

    socket.on('channel:created', ({ channel }) => {
      addChannelToServer(channel);
    });

    socket.on('channel:deleted', ({ serverId, channelId }) => {
      removeChannelFromServer(serverId, channelId);
    });

    socket.on('channel:reordered', ({ serverId, channels }) => {
      setServerChannels(serverId, channels);
    });

    socket.on('user:color_updated', ({ userId, color }) => {
      updateUserColor(userId, color);
    });

    socket.on('user:avatar_updated', ({ userId, avatarUrl }) => {
      updateUserAvatar(userId, avatarUrl);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser, serverUrl]);

  // 6. Reactive Audio & Settings updates while connected to voice
  useEffect(() => {
    if (voiceManagerRef.current && activeVoiceChannelId) {
      voiceManagerRef.current
        .initLocalMicrophone({
          deviceId: inputDeviceId,
          noiseSuppression,
          echoCancellation
        })
        .catch((e) => console.warn('Erro ao atualizar microfone:', e));
    }
  }, [inputDeviceId, noiseSuppression, echoCancellation]);

  useEffect(() => {
    if (voiceManagerRef.current && activeVoiceChannelId) {
      voiceManagerRef.current.setOutputDevice(outputDeviceId);
    }
  }, [outputDeviceId]);

  useEffect(() => {
    if (voiceManagerRef.current && activeVoiceChannelId) {
      Object.entries(userVolumes).forEach(([userId, vol]) => {
        voiceManagerRef.current?.setUserVolume(userId, vol);
      });
    }
  }, [userVolumes]);

  useEffect(() => {
    if (voiceManagerRef.current && activeVoiceChannelId) {
      Object.entries(localMutedUsers).forEach(([userId, isMuted]) => {
        voiceManagerRef.current?.setLocalMuted(userId, isMuted);
      });
    }
  }, [localMutedUsers, activeVoiceChannelId]);

  useEffect(() => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.getVad()?.setThreshold(micSensitivity);
    }
  }, [micSensitivity]);

  // 7. Voice Handlers
  const handleJoinVoice = async (channelId: string) => {
    if (!currentUser || !socketRef.current) return;

    // Leave any prior voice
    if (activeVoiceChannelId) {
      handleLeaveVoice();
    }

    sounds.playJoinVoice();

    const vm = new VoiceManager(currentUser.id, micSensitivity);
    voiceManagerRef.current = vm;

    vm.setAudioInputOptions({
      deviceId: inputDeviceId,
      noiseSuppression,
      echoCancellation
    });

    if (outputDeviceId) {
      vm.setOutputDevice(outputDeviceId);
    }

    Object.entries(userVolumes).forEach(([userId, vol]) => {
      vm.setUserVolume(userId, vol);
    });

    if (vm.getVad()) {
      vm.getVad()!.onVolumeSample = (vol) => {
        setLiveMicVolume(vol);
      };
    }

    vm.sendSignal = (toUserId, signal) => {
      socketRef.current?.emit('webrtc:signal', { toUserId, signal });
    };

    vm.onSpeakingChange = (speaking) => {
      setSpeaking(speaking);
      socketRef.current?.emit('voice:state_change', { isSpeaking: speaking });
    };

    vm.onRemoteScreenStreamsChange = (streamsMap) => {
      setRemoteScreenStreams(streamsMap);
    };

    vm.onPingUpdate = (userId, pingMs) => {
      setPeerPing(userId, pingMs);
    };

    const localParticipant: VoiceParticipant = {
      userId: currentUser.id,
      username: currentUser.username,
      color: currentUser.color,
      avatarUrl: currentUser.avatarUrl,
      isMuted,
      isDeafened,
      isSpeaking: false,
      isScreenSharing
    };

    setActiveVoiceChannel(channelId, [localParticipant]);
    socketRef.current.emit('voice:join', { channelId });
  };

  const handleLeaveVoice = () => {
    if (!activeVoiceChannelId) return;

    sounds.playLeaveVoice();

    if (isScreenSharing) {
      handleStopScreenShare();
    }

    voiceManagerRef.current?.leave();
    voiceManagerRef.current = null;
    setLiveMicVolume(0);

    socketRef.current?.emit('voice:leave');
    setActiveVoiceChannel(null);
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setMuted(nextMute);
    voiceManagerRef.current?.setMute(nextMute);
    socketRef.current?.emit('voice:state_change', { isMuted: nextMute });
  };

  const handleToggleDeafen = () => {
    const nextDeafen = !isDeafened;
    setDeafened(nextDeafen);
    voiceManagerRef.current?.setDeafen(nextDeafen);
    socketRef.current?.emit('voice:state_change', { isDeafened: nextDeafen });
  };

  // 8. Screen Share Handlers (with dynamic quality & loopback audio)
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      handleStopScreenShare();
      return;
    }

    if (!window.electronAPI?.getScreenSources) {
      alert('A partilha de ecrã requer a aplicação desktop Electron.');
      return;
    }

    try {
      const sources = await window.electronAPI.getScreenSources();
      setScreenPickerOpen(true, sources);
    } catch (err) {
      console.error('Erro ao listar fontes de ecrã:', err);
    }
  };

  const handleSelectScreenSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      const stream = await screenShareManagerRef.current.startCapture(
        sourceId,
        streamQuality,
        includeSystemAudio,
        () => {
          handleStopScreenShare();
        }
      );

      if (voiceManagerRef.current) {
        await voiceManagerRef.current.startScreenShare(stream);
      }

      setScreenSharing(true, stream, currentUser.username);
      socketRef.current?.emit('voice:state_change', { isScreenSharing: true });
    } catch (err) {
      console.error('Falha ao iniciar partilha de ecrã:', err);
    }
  };

  const handleStopScreenShare = async () => {
    screenShareManagerRef.current.stopCapture();
    if (voiceManagerRef.current) {
      await voiceManagerRef.current.stopScreenShare();
    }
    setScreenSharing(false, null, null);
    socketRef.current?.emit('voice:state_change', { isScreenSharing: false });
  };

  // 9. Chat Handlers
  const handleSendMessage = (
    content: string,
    attachment?: { fileUrl: string; fileName: string; fileType: string; fileSize: number }
  ) => {
    if (!currentChannelId || !socketRef.current) return;
    socketRef.current.emit('chat:send_message', {
      channelId: currentChannelId,
      content,
      fileUrl: attachment?.fileUrl,
      fileName: attachment?.fileName,
      fileType: attachment?.fileType,
      fileSize: attachment?.fileSize
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-app-primary text-app-textNormal transition-colors duration-200">
      {/* Native Windows TitleBar */}
      <TitleBar />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Server Rail */}
        <ServerSidebar />

        {/* Channels & User Control Sidebar */}
        <ChannelSidebar
          onJoinVoice={handleJoinVoice}
          onLeaveVoice={handleLeaveVoice}
          onToggleMute={handleToggleMute}
          onToggleDeafen={handleToggleDeafen}
        />

        {/* Center Main Stage (Voice Grid + Screen Share + Text Chat) */}
        <div className="flex-1 flex flex-col min-w-0 bg-app-primary">
          {/* Active Voice Stage */}
          <VoiceArea
            onToggleScreenShare={handleToggleScreenShare}
            onToggleMute={handleToggleMute}
            onToggleDeafen={handleToggleDeafen}
            onLeaveVoice={handleLeaveVoice}
          />

          {/* Screen Share Viewer (Multi-screen + Loopback Audio + Ping Overlay) */}
          <ScreenShareViewer onStopShare={handleStopScreenShare} />

          {/* Text Chat Feed */}
          <ChatArea onSendMessage={handleSendMessage} />
        </div>

        {/* Right Members Sidebar */}
        <MemberList />
      </div>

      {/* Auth Modal (Username + PIN) */}
      <AuthModal />

      {/* Screen & Window Picker Modal */}
      <ScreenPickerModal onSelectSource={handleSelectScreenSource} />

      {/* Settings Modal */}
      <SettingsModal />

      {/* Create Channel Modal */}
      <CreateChannelModal />

      {/* Create Server Modal */}
      <CreateServerModal />

      {/* Friend Context Menu (Right-Click) */}
      <UserContextMenu />
    </div>
  );
};
