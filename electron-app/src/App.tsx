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

export const App: React.FC = () => {
  const {
    currentUser,
    serverUrl,
    servers,
    currentServerId,
    currentChannelId,
    setServers,
    setCurrentServerId,
    setCurrentChannelId,
    addMessage,
    setChannelMessages,
    setMembers,
    activeVoiceChannelId,
    setActiveVoiceChannel,
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
    setScreenPickerOpen
  } = useAppStore();

  const socketRef = useRef<Socket | null>(null);
  const voiceManagerRef = useRef<VoiceManager | null>(null);
  const screenShareManagerRef = useRef<ScreenShareManager>(new ScreenShareManager());

  // 1. Initial Load & Fetch Servers
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

  // 2. Fetch Channel Messages
  useEffect(() => {
    if (!currentChannelId || !currentUser) return;

    fetch(`${serverUrl}/api/channels/${currentChannelId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setChannelMessages(currentChannelId, data);
      })
      .catch((err) => console.error('Erro ao carregar histórico de mensagens:', err));
  }, [currentChannelId, currentUser, serverUrl]);

  // 3. Socket.io Connection & Event Listeners
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
      setMembers(users);
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
      setVoiceParticipants(participants);
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser, serverUrl]);

  // 4. Voice Handlers
  const handleJoinVoice = async (channelId: string) => {
    if (!currentUser || !socketRef.current) return;

    // Leave any prior voice
    if (activeVoiceChannelId) {
      handleLeaveVoice();
    }

    sounds.playJoinVoice();

    const vm = new VoiceManager(currentUser.id);
    voiceManagerRef.current = vm;

    vm.sendSignal = (toUserId, signal) => {
      socketRef.current?.emit('webrtc:signal', { toUserId, signal });
    };

    vm.onSpeakingChange = (speaking) => {
      setSpeaking(speaking);
      socketRef.current?.emit('voice:state_change', { isSpeaking: speaking });
    };

    vm.onRemoteScreenStream = (remoteUserId, stream) => {
      if (stream) {
        const participant = useAppStore.getState().voiceParticipants.find((p) => p.userId === remoteUserId);
        setScreenSharing(false, stream, participant?.username || 'Amigo');
      } else {
        setScreenSharing(false, null, null);
      }
    };

    setActiveVoiceChannel(channelId);
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

  // 5. Screen Share Handlers (1080p 60fps)
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
      const stream = await screenShareManagerRef.current.startCapture(sourceId, () => {
        handleStopScreenShare();
      });

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

  // 6. Chat Handlers
  const handleSendMessage = (content: string) => {
    if (!currentChannelId || !socketRef.current) return;
    socketRef.current.emit('chat:send_message', {
      channelId: currentChannelId,
      content
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#313338] text-[#dbdee1]">
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
        <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
          {/* Active Voice Stage */}
          <VoiceArea
            onToggleScreenShare={handleToggleScreenShare}
            onToggleMute={handleToggleMute}
            onToggleDeafen={handleToggleDeafen}
            onLeaveVoice={handleLeaveVoice}
          />

          {/* 1080p 60fps Screen Share Viewer */}
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
    </div>
  );
};
