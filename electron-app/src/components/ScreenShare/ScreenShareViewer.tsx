import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Maximize2, Minimize2, Radio, StopCircle, Volume2, Monitor } from 'lucide-react';

interface ScreenShareViewerProps {
  onStopShare: () => void;
}

export const ScreenShareViewer: React.FC<ScreenShareViewerProps> = ({ onStopShare }) => {
  const {
    screenShareStream,
    isScreenSharing,
    remoteScreenStreams,
    activeViewingScreenUserId,
    setActiveViewingScreenUserId,
    voiceParticipants,
    currentUser,
    screenShareVolumes,
    setScreenShareUserVolume,
    peerPings,
    streamQuality
  } = useAppStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build the list of all available streams
  const streamEntries: Array<{
    id: string;
    stream: MediaStream;
    name: string;
    isLocal: boolean;
  }> = [];

  // Local stream
  if (isScreenSharing && screenShareStream) {
    streamEntries.push({
      id: 'local',
      stream: screenShareStream,
      name: `${currentUser?.username || 'Você'} (Ecrã)`,
      isLocal: true
    });
  }

  // Remote streams
  Object.entries(remoteScreenStreams).forEach(([userId, stream]) => {
    const participant = voiceParticipants.find((p) => p.userId === userId);
    streamEntries.push({
      id: userId,
      stream,
      name: participant ? `${participant.username} (Ecrã)` : 'Ecrã Remoto',
      isLocal: false
    });
  });

  // Select active stream
  const activeEntry =
    streamEntries.find((e) => e.id === activeViewingScreenUserId) ||
    streamEntries[0] ||
    null;

  const currentStreamVolume = activeEntry && !activeEntry.isLocal
    ? (screenShareVolumes[activeEntry.id] ?? 100)
    : 0;

  // Sync active stream with <video> element
  useEffect(() => {
    if (videoRef.current && activeEntry) {
      videoRef.current.srcObject = activeEntry.stream;
      videoRef.current.play().catch((e) => console.warn('Erro autoplay video:', e));
    }
  }, [activeEntry?.stream, activeEntry?.id]);

  // Adjust volume for remote screen audio individually per user
  useEffect(() => {
    if (videoRef.current && activeEntry) {
      if (activeEntry.isLocal) {
        videoRef.current.muted = true;
      } else {
        videoRef.current.muted = false;
        videoRef.current.volume = Math.max(0, Math.min(1, currentStreamVolume / 100));
      }
    }
  }, [currentStreamVolume, activeEntry?.isLocal, activeEntry?.id]);

  if (!activeEntry) return null;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  const pingMs = !activeEntry.isLocal ? peerPings[activeEntry.id] : undefined;

  return (
    <div
      ref={containerRef}
      className="relative bg-black border-b border-app-border w-full flex flex-col items-center justify-center overflow-hidden max-h-[60vh] aspect-video group select-none transition-colors duration-200"
    >
      {/* Stream Tabs if multiple streams exist */}
      {streamEntries.length > 1 && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1 rounded-lg border border-white/10">
          {streamEntries.map((entry) => {
            const isSelected = entry.id === activeEntry.id;
            return (
              <button
                key={entry.id}
                onClick={() => setActiveViewingScreenUserId(entry.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-app-accent text-white shadow'
                    : 'text-app-textMuted hover:text-white hover:bg-white/10'
                }`}
              >
                <Monitor size={12} />
                <span className="truncate max-w-[120px]">{entry.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={activeEntry.isLocal}
        className="w-full h-full object-contain"
      />

      {/* Info Badge (when only 1 stream is present) */}
      {streamEntries.length === 1 && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-white z-20 border border-white/10">
          <Radio size={14} className="text-[#f23f43] animate-pulse" />
          <span>{activeEntry.name}</span>
          <span className="bg-[#23a55a] text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
            {streamQuality || '1080p 60fps'}
          </span>
        </div>
      )}

      {/* Controls Overlay (top right) */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {/* Ping MS Badge (for remote streams) */}
        {pingMs !== undefined && (
          <div
            className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium text-white border border-white/10"
            title={`Latência RTT estimada: ${pingMs} ms`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                pingMs < 60 ? 'bg-[#23a55a]' : pingMs < 130 ? 'bg-[#f0b232]' : 'bg-[#f23f43]'
              }`}
            />
            <span>{pingMs}ms</span>
          </div>
        )}

        {/* Remote Screen Audio Individual Volume Slider */}
        {!activeEntry.isLocal && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs text-white border border-white/10">
            <Volume2 size={13} className="text-app-textMuted" />
            <input
              type="range"
              min="0"
              max="100"
              value={currentStreamVolume}
              onChange={(e) => setScreenShareUserVolume(activeEntry.id, Number(e.target.value))}
              className="w-16 h-1 bg-[#4e5058] rounded-lg appearance-none cursor-pointer accent-[#23a55a]"
              title={`Volume do som desta partilha: ${currentStreamVolume}%`}
            />
            <span className="text-[10px] w-6 text-right font-mono">{currentStreamVolume}%</span>
          </div>
        )}

        {/* Stop Local Share Button */}
        {isScreenSharing && (
          <button
            onClick={onStopShare}
            className="flex items-center gap-1.5 bg-[#da373c] hover:bg-[#a1282c] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <StopCircle size={14} />
            Parar Transmissão
          </button>
        )}

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-md transition-colors border border-white/10"
          title={isFullscreen ? 'Sair de ecrã inteiro' : 'Ecrã inteiro'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
};
