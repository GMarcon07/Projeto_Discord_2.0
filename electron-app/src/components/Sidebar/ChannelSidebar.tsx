import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  Hash,
  Volume2,
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Radio,
  LogOut,
  ChevronDown,
  Plus,
  Settings,
  GripVertical,
  Trash2
} from 'lucide-react';
import { Channel } from '@discord-mini/shared';

interface ChannelSidebarProps {
  onJoinVoice: (channelId: string) => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onToggleDeafen
}) => {
  const {
    servers,
    currentServerId,
    currentChannelId,
    setCurrentChannelId,
    currentUser,
    setCurrentUser,
    activeVoiceChannelId,
    voiceParticipants,
    isMuted,
    isDeafened,
    serverUrl,
    setServerChannels,
    removeChannelFromServer,
    setSettingsOpen,
    setCreateChannelOpen
  } = useAppStore();

  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);

  const currentServer = servers.find((s) => s.id === currentServerId) || servers[0];
  const allChannels = currentServer?.channels || [];
  const textChannels = allChannels.filter((c) => c.type === 'text');
  const voiceChannels = allChannels.filter((c) => c.type === 'voice');

  const activeVoiceChannel = voiceChannels.find((c) => c.id === activeVoiceChannelId);

  const handleLogout = () => {
    onLeaveVoice();
    setCurrentUser(null);
  };

  // Drag & Drop Reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedChannelId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedChannelId;
    setDraggedChannelId(null);
    if (!sourceId || sourceId === targetId || !currentServer) return;

    const sourceChan = allChannels.find((c) => c.id === sourceId);
    const targetChan = allChannels.find((c) => c.id === targetId);
    if (!sourceChan || !targetChan || sourceChan.type !== targetChan.type) return;

    // Reorder array
    const filtered = allChannels.filter((c) => c.id !== sourceId);
    const targetIdx = filtered.findIndex((c) => c.id === targetId);
    filtered.splice(targetIdx, 0, sourceChan);

    setServerChannels(currentServer.id, filtered);

    // Save to server
    try {
      await fetch(`${serverUrl}/api/channels/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServer.id,
          channelIds: filtered.map((c) => c.id)
        })
      });
    } catch (err) {
      console.error('Erro ao reordenar canais no servidor:', err);
    }
  };

  const handleDeleteChannel = async (e: React.MouseEvent, channel: Channel) => {
    e.stopPropagation();
    if (!currentServer) return;
    if (confirm(`Tens a certeza que pretendes eliminar o canal "#${channel.name}"?`)) {
      try {
        const res = await fetch(`${serverUrl}/api/channels/${channel.id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          removeChannelFromServer(currentServer.id, channel.id);
        }
      } catch (err) {
        console.error('Erro ao eliminar canal:', err);
      }
    }
  };

  const isRainbowUser = currentUser?.color === 'rainbow';

  return (
    <aside className="w-60 bg-app-secondary flex flex-col shrink-0 select-none border-r border-app-border transition-colors duration-200">
      {/* Server Header */}
      <div className="h-12 border-b border-app-border px-4 flex items-center justify-between font-bold text-app-textHeader text-sm shadow-sm cursor-pointer hover:bg-app-hover transition-colors">
        <span className="truncate">{currentServer?.name || 'Servidor'}</span>
        <ChevronDown size={16} className="text-app-textMuted" />
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Text Channels */}
        <div>
          <div className="px-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-app-textMuted flex items-center justify-between group">
            <span>Canais de Texto</span>
            <button
              onClick={() => setCreateChannelOpen(true, 'text')}
              className="opacity-60 hover:opacity-100 hover:text-white p-0.5 rounded transition-opacity"
              title="Criar Canal de Texto"
            >
              <Plus size={15} />
            </button>
          </div>
          <div className="space-y-0.5">
            {textChannels.map((channel) => {
              const isSelected = currentChannelId === channel.id;
              return (
                <div
                  key={channel.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, channel.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, channel.id)}
                  className="group relative flex items-center"
                >
                  <button
                    onClick={() => setCurrentChannelId(channel.id)}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-app-hover text-white font-semibold'
                        : 'text-app-textMuted hover:bg-app-hover hover:text-app-textNormal'
                    }`}
                  >
                    <GripVertical size={12} className="opacity-0 group-hover:opacity-40 -ml-1 shrink-0 cursor-grab" />
                    <Hash size={18} className="shrink-0 text-app-textMuted" />
                    <span className="truncate flex-1 text-left">{channel.name}</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteChannel(e, channel)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-app-textMuted hover:text-[#f23f43] rounded transition-all mr-1"
                    title="Eliminar canal"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Voice Channels */}
        <div>
          <div className="px-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-app-textMuted flex items-center justify-between group">
            <span>Canais de Voz</span>
            <button
              onClick={() => setCreateChannelOpen(true, 'voice')}
              className="opacity-60 hover:opacity-100 hover:text-white p-0.5 rounded transition-opacity"
              title="Criar Canal de Voz"
            >
              <Plus size={15} />
            </button>
          </div>
          <div className="space-y-1">
            {voiceChannels.map((channel) => {
              const isConnected = activeVoiceChannelId === channel.id;
              return (
                <div
                  key={channel.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, channel.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, channel.id)}
                  className="space-y-0.5 group"
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        if (!isConnected) {
                          onJoinVoice(channel.id);
                        }
                      }}
                      className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isConnected
                          ? 'bg-app-hover text-[#23a55a] font-semibold'
                          : 'text-app-textMuted hover:bg-app-hover hover:text-app-textNormal'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <GripVertical size={12} className="opacity-0 group-hover:opacity-40 -ml-1 shrink-0 cursor-grab" />
                        <Volume2 size={18} className={`shrink-0 ${isConnected ? 'text-[#23a55a]' : 'text-app-textMuted'}`} />
                        <span className="truncate">{channel.name}</span>
                      </div>
                      {isConnected && (
                        <span className="text-[10px] bg-[#23a55a]/20 text-[#23a55a] px-1.5 py-0.5 rounded font-bold">
                          Ligado
                        </span>
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteChannel(e, channel)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-app-textMuted hover:text-[#f23f43] rounded transition-all mr-1"
                      title="Eliminar canal"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Connected participants list under this channel */}
                  {isConnected && voiceParticipants.length > 0 && (
                    <div className="pl-6 pr-2 py-1 space-y-1">
                      {voiceParticipants.map((p) => {
                        const pIsRainbow = p.color === 'rainbow';
                        return (
                          <div
                            key={p.userId}
                            className="flex items-center justify-between py-0.5 text-xs text-app-textNormal"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                  p.isSpeaking ? 'speaking-ring' : ''
                                } ${pIsRainbow ? 'avatar-rainbow' : ''}`}
                                style={!pIsRainbow ? { backgroundColor: p.color } : {}}
                              >
                                {p.username[0]?.toUpperCase()}
                              </div>
                              <span className={`truncate ${pIsRainbow ? 'text-rainbow' : ''}`}>
                                {p.username}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-app-textMuted">
                              {p.isMuted && <MicOff size={12} className="text-[#f23f43]" />}
                              {p.isScreenSharing && (
                                <span className="text-[9px] bg-app-accent text-white px-1 rounded font-semibold">
                                  AO VIVO
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Voice Connection Status Bar (when connected) */}
      {activeVoiceChannel && (
        <div className="bg-app-tertiary border-t border-app-border p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Radio size={16} className="text-[#23a55a] animate-pulse" />
            <div className="flex flex-col">
              <span className="font-semibold text-[#23a55a] text-[11px] leading-tight">Voz Ligada</span>
              <span className="text-[10px] text-app-textMuted truncate max-w-[120px]">
                {activeVoiceChannel.name} / RTC Mesh
              </span>
            </div>
          </div>
          <button
            onClick={onLeaveVoice}
            className="p-1.5 rounded hover:bg-app-hover text-[#f23f43] hover:text-[#da373c] transition-colors"
            title="Desconectar do canal de voz"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      )}

      {/* User Bar with Settings Button */}
      {currentUser && (
        <div className="h-[52px] bg-app-tertiary px-2 flex items-center justify-between border-t border-app-border">
          {/* User info */}
          <div
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 min-w-0 pr-1 cursor-pointer hover:opacity-90 rounded p-1 -ml-1 transition-opacity"
            title="Definições de Utilizador"
          >
            <div className="relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow ${
                  isRainbowUser ? 'avatar-rainbow' : ''
                }`}
                style={!isRainbowUser ? { backgroundColor: currentUser.color } : {}}
              >
                {currentUser.username[0]?.toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23a55a] border-2 border-app-tertiary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`text-xs font-semibold text-app-textHeader truncate leading-tight ${isRainbowUser ? 'text-rainbow' : ''}`}>
                {currentUser.username}
              </span>
              <span className="text-[10px] text-app-textMuted leading-tight">Online</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5 text-app-textMuted">
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded hover:bg-app-hover transition-colors ${
                isMuted ? 'text-[#f23f43]' : 'hover:text-white'
              }`}
              title={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={onToggleDeafen}
              className={`p-1.5 rounded hover:bg-app-hover transition-colors ${
                isDeafened ? 'text-[#f23f43]' : 'hover:text-white'
              }`}
              title={isDeafened ? 'Ativar som' : 'Ensurdecer'}
            >
              <Headphones size={16} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded hover:bg-app-hover hover:text-white transition-colors"
              title="Definições"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-app-hover hover:text-[#f23f43] transition-colors"
              title="Terminar sessão"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
