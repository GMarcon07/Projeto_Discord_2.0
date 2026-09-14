import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Maximize2, Minimize2, Radio, StopCircle } from 'lucide-react';

interface ScreenShareViewerProps {
  onStopShare: () => void;
}

export const ScreenShareViewer: React.FC<ScreenShareViewerProps> = ({ onStopShare }) => {
  const { screenShareStream, screenSharerName, isScreenSharing } = useAppStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current && screenShareStream) {
      videoRef.current.srcObject = screenShareStream;
      videoRef.current.play().catch((e) => console.warn('Erro autoplay video:', e));
    }
  }, [screenShareStream]);

  if (!screenShareStream) return null;

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

  return (
    <div
      ref={containerRef}
      className="relative bg-black border-b border-[#1f2023] w-full flex items-center justify-center overflow-hidden max-h-[60vh] aspect-video group"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      {/* Overlay controls */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-white">
        <Radio size={14} className="text-[#f23f43] animate-pulse" />
        <span>{screenSharerName || 'Transmissão de Ecrã'}</span>
        <span className="bg-[#23a55a] text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
          1080p 60fps
        </span>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isScreenSharing && (
          <button
            onClick={onStopShare}
            className="flex items-center gap-1.5 bg-[#da373c] hover:bg-[#a1282c] text-white px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors"
          >
            <StopCircle size={14} />
            Parar Transmissão
          </button>
        )}
        <button
          onClick={toggleFullscreen}
          className="bg-black/60 hover:bg-black/80 text-white p-2 rounded backdrop-blur-md transition-colors"
          title={isFullscreen ? 'Sair de ecrã inteiro' : 'Ecrã inteiro'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
};
