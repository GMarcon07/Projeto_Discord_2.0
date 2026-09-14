import React from 'react';
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
  ChevronDown
} from 'lucide-react';

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
    isDeafened
  } = useAppStore();

  const currentServer = servers.find((s) => s.id === currentServerId) || servers[0];
  const textChannels = currentServer?.channels.filter((c) => c.type === 'text') || [];
  const voiceChannels = currentServer?.channels.filter((c) => c.type === 'voice') || [];

  const activeVoiceChannel = voiceChannels.find((c) => c.id === activeVoiceChannelId);

  const handleLogout = () => {
    onLeaveVoice();
    setCurrentUser(null);
  };

  return (
    <aside className="w-60 bg-[#2b2d31] flex flex-col shrink-0 select-none border-r border-[#1f2023]">
      {/* Server Header */}
      <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between font-bold text-white text-sm shadow-sm cursor-pointer hover:bg-[#35373c] transition-colors">
        <span className="truncate">{currentServer?.name || 'Servidor'}</span>
        <ChevronDown size={16} className="text-[#949ba4]" />
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Text Channels */}
        <div>
          <div className="px-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-[#949ba4] flex items-center justify-between">
            <span>Canais de Texto</span>
          </div>
          <div className="space-y-0.5">
            {textChannels.map((channel) => {
              const isSelected = currentChannelId === channel.id;
              return (
                <button
                  key={channel.id}
                  onClick={() => setCurrentChannelId(channel.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#404249] text-white'
                      : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                  }`}
                >
                  <Hash size={18} className="shrink-0 text-[#80848e]" />
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Channels */}
        <div>
          <div className="px-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-[#949ba4] flex items-center justify-between">
            <span>Canais de Voz</span>
          </div>
          <div className="space-y-1">
            {voiceChannels.map((channel) => {
              const isConnected = activeVoiceChannelId === channel.id;
              return (
                <div key={channel.id} className="space-y-0.5">
                  <button
                    onClick={() => {
                      if (!isConnected) {
                        onJoinVoice(channel.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isConnected
                        ? 'bg-[#35373c] text-[#23a55a]'
                        : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Volume2 size={18} className={`shrink-0 ${isConnected ? 'text-[#23a55a]' : 'text-[#80848e]'}`} />
                      <span className="truncate">{channel.name}</span>
                    </div>
                    {isConnected && (
                      <span className="text-[10px] bg-[#23a55a]/20 text-[#23a55a] px-1.5 py-0.5 rounded font-bold">
                        Ligado
                      </span>
                    )}
                  </button>

                  {/* Connected participants list under this channel */}
                  {isConnected && voiceParticipants.length > 0 && (
                    <div className="pl-6 pr-2 py-1 space-y-1">
                      {voiceParticipants.map((p) => (
                        <div
                          key={p.userId}
                          className="flex items-center justify-between py-0.5 text-xs text-[#dbdee1]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                p.isSpeaking ? 'speaking-ring' : ''
                              }`}
                              style={{ backgroundColor: p.color }}
                            >
                              {p.username[0]?.toUpperCase()}
                            </div>
                            <span className="truncate">{p.username}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[#80848e]">
                            {p.isMuted && <MicOff size={12} className="text-[#f23f43]" />}
                            {p.isScreenSharing && (
                              <span className="text-[9px] bg-[#5865F2] text-white px-1 rounded font-semibold">
                                AO VIVO
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
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
        <div className="bg-[#232428] border-t border-[#1f2023] p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Radio size={16} className="text-[#23a55a] animate-pulse" />
            <div className="flex flex-col">
              <span className="font-semibold text-[#23a55a] text-[11px] leading-tight">Voz Ligada</span>
              <span className="text-[10px] text-[#949ba4] truncate max-w-[120px]">
                {activeVoiceChannel.name} / RTC Mesh
              </span>
            </div>
          </div>
          <button
            onClick={onLeaveVoice}
            className="p-1.5 rounded hover:bg-[#35373c] text-[#f23f43] hover:text-[#da373c] transition-colors"
            title="Desconectar do canal de voz"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      )}

      {/* User Bar */}
      {currentUser && (
        <div className="h-[52px] bg-[#232428] px-2 flex items-center justify-between border-t border-[#1f2023]">
          {/* User info */}
          <div className="flex items-center gap-2 min-w-0 pr-1">
            <div className="relative">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.username[0]?.toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23a55a] border-2 border-[#232428]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate leading-tight">
                {currentUser.username}
              </span>
              <span className="text-[10px] text-[#949ba4] leading-tight">Online</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5 text-[#b5bac1]">
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded hover:bg-[#35373c] transition-colors ${
                isMuted ? 'text-[#f23f43]' : 'hover:text-white'
              }`}
              title={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={onToggleDeafen}
              className={`p-1.5 rounded hover:bg-[#35373c] transition-colors ${
                isDeafened ? 'text-[#f23f43]' : 'hover:text-white'
              }`}
              title={isDeafened ? 'Ativar som' : 'Ensurdecer'}
            >
              <Headphones size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-[#35373c] hover:text-[#f23f43] transition-colors"
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
