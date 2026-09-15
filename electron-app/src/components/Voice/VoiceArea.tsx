import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Mic, MicOff, Headphones, Monitor, PhoneOff, Radio } from 'lucide-react';

interface VoiceAreaProps {
  onToggleScreenShare: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onLeaveVoice: () => void;
}

export const VoiceArea: React.FC<VoiceAreaProps> = ({
  onToggleScreenShare,
  onToggleMute,
  onToggleDeafen,
  onLeaveVoice
}) => {
  const {
    activeVoiceChannelId,
    servers,
    currentServerId,
    voiceParticipants,
    isMuted,
    isDeafened,
    isScreenSharing,
    peerPings,
    currentUser,
    openContextMenu
  } = useAppStore();

  if (!activeVoiceChannelId) return null;

  const currentServer = servers.find((s) => s.id === currentServerId) || servers[0];
  const channel = currentServer?.channels.find((c) => c.id === activeVoiceChannelId);

  return (
    <div className="bg-app-tertiary border-b border-app-border p-4 flex flex-col gap-4 select-none transition-colors duration-200">
      {/* Voice Channel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={18} className="text-[#23a55a] animate-pulse" />
          <h4 className="font-bold text-app-textHeader text-sm">
            {channel?.name || 'Canal de Voz'}
          </h4>
          <span className="text-xs text-app-textMuted">
            • {voiceParticipants.length} participante{voiceParticipants.length !== 1 ? 's' : ''} conectado{voiceParticipants.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Quick Voice Bar Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleScreenShare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow transition-all ${
              isScreenSharing
                ? 'bg-[#da373c] text-white hover:bg-[#a1282c]'
                : 'bg-app-accent text-white hover:bg-app-accentHover'
            }`}
          >
            <Monitor size={14} />
            {isScreenSharing ? 'Parar Ecrã' : 'Partilhar Ecrã (1080p 60fps)'}
          </button>

          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-md transition-colors ${
              isMuted ? 'bg-[#da373c] text-white' : 'bg-app-secondary text-app-textNormal hover:bg-app-hover'
            }`}
            title={isMuted ? 'Desativar Mute' : 'Silenciar'}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button
            onClick={onToggleDeafen}
            className={`p-1.5 rounded-md transition-colors ${
              isDeafened ? 'bg-[#da373c] text-white' : 'bg-app-secondary text-app-textNormal hover:bg-app-hover'
            }`}
            title={isDeafened ? 'Desativar Ensurdecer' : 'Ensurdecer'}
          >
            <Headphones size={16} />
          </button>

          <button
            onClick={onLeaveVoice}
            className="p-1.5 rounded-md bg-[#da373c] hover:bg-[#a1282c] text-white transition-colors"
            title="Sair do canal de voz"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {voiceParticipants.map((participant) => {
          const isLocal = participant.userId === currentUser?.id;
          const pingMs = !isLocal ? peerPings[participant.userId] : undefined;

          return (
            <div
              key={participant.userId}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!isLocal) {
                  openContextMenu(e.clientX, e.clientY, {
                    id: participant.userId,
                    username: participant.username,
                    color: participant.color,
                    avatarUrl: participant.avatarUrl,
                    isScreenSharing: participant.isScreenSharing
                  });
                }
              }}
              className={`bg-app-card rounded-xl p-3.5 flex flex-col items-center justify-center gap-2 border transition-all relative cursor-pointer ${
                participant.isSpeaking
                  ? 'border-[#23a55a] shadow-[0_0_12px_rgba(35,165,90,0.4)]'
                  : 'border-transparent hover:border-white/10'
              }`}
              title={isLocal ? participant.username : `${participant.username} (Clique c/ botão direito para ajustar volume)`}
            >
              {/* WebRTC Ping Badge */}
              {pingMs !== undefined && (
                <div
                  className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono text-white/90"
                  title={`Ping WebRTC: ${pingMs} ms`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      pingMs < 60 ? 'bg-[#23a55a]' : pingMs < 130 ? 'bg-[#f0b232]' : 'bg-[#f23f43]'
                    }`}
                  />
                  <span>{pingMs}ms</span>
                </div>
              )}

              {/* Speaking / Live Badge */}
              {participant.isScreenSharing && (
                <span className="absolute top-2 right-2 bg-app-accent text-[9px] font-bold text-white px-1.5 py-0.5 rounded tracking-wider">
                  AO VIVO
                </span>
              )}

              {/* Avatar with speaking ring */}
              {participant.avatarUrl ? (
                <img
                  src={participant.avatarUrl}
                  alt={participant.username}
                  className={`w-16 h-16 rounded-full object-cover shadow-md transition-transform ${
                    participant.isSpeaking ? 'scale-105 speaking-ring' : ''
                  }`}
                />
              ) : (
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md transition-transform ${
                    participant.isSpeaking ? 'scale-105 speaking-ring' : ''
                  }`}
                  style={{ backgroundColor: participant.color || '#5865F2' }}
                >
                  {participant.username[0]?.toUpperCase()}
                </div>
              )}

              {/* Username & Audio status */}
              <div className="flex items-center gap-1.5 max-w-full">
                <span className="text-xs font-semibold text-app-textNormal truncate">
                  {participant.username}
                </span>
                {participant.isMuted && (
                  <MicOff size={12} className="text-[#f23f43] shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
