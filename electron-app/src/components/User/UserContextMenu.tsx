import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Volume2, MicOff, Mic, Monitor, Copy, Check } from 'lucide-react';

export const UserContextMenu: React.FC = () => {
  const {
    contextMenu,
    closeContextMenu,
    currentUser,
    userVolumes,
    setUserVolume,
    localMutedUsers,
    toggleLocalMuteUser,
    screenShareVolumes,
    setScreenShareUserVolume,
    remoteScreenStreams
  } = useAppStore();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.isOpen, closeContextMenu]);

  if (!contextMenu.isOpen || !contextMenu.targetUser) return null;

  const target = contextMenu.targetUser;
  const isSelf = target.id === currentUser?.id;
  if (isSelf) return null; // Don't show friend context menu for oneself

  const currentVol = userVolumes[target.id] ?? 100;
  const isMutedLocally = !!localMutedUsers[target.id];
  const isStreaming = !!remoteScreenStreams[target.id] || target.isScreenSharing;
  const currentStreamVol = screenShareVolumes[target.id] ?? 100;
  const isRainbow = target.color === 'rainbow';

  // Clamp menu position to stay inside viewport
  const menuWidth = 240;
  const menuHeight = 280;
  const posX = Math.min(contextMenu.x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(contextMenu.y, window.innerHeight - menuHeight - 10);

  const handleCopy = () => {
    navigator.clipboard.writeText(target.username);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(10, posX)}px`, top: `${Math.max(10, posY)}px` }}
      className="fixed z-50 w-60 bg-[#18191c]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-2.5 text-xs text-[#dbdee1] flex flex-col gap-2 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Target User Info Header */}
      <div className="flex items-center gap-2.5 px-2 py-1.5 bg-white/5 rounded-lg">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow text-sm shrink-0 ${
            isRainbow ? 'avatar-rainbow' : ''
          }`}
          style={!isRainbow ? { backgroundColor: target.color || '#5865F2' } : {}}
        >
          {target.username[0]?.toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className={`font-bold truncate text-white ${isRainbow ? 'text-rainbow' : ''}`}>
            {target.username}
          </span>
          <span className="text-[10px] text-[#949ba4]">Utilizador</span>
        </div>
      </div>

      <div className="h-[1px] bg-white/10 my-0.5" />

      {/* User Voice Volume Slider */}
      <div className="flex flex-col gap-1.5 px-2 py-1">
        <div className="flex items-center justify-between text-[#949ba4] text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-white">
            <Volume2 size={13} className="text-[#5865F2]" />
            Volume do Amigo
          </span>
          <span className="font-mono text-white font-bold">{currentVol}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="200"
          value={currentVol}
          onChange={(e) => setUserVolume(target.id, Number(e.target.value))}
          className="w-full h-1.5 bg-[#4e5058] rounded-lg appearance-none cursor-pointer accent-[#5865F2]"
        />
        <div className="flex justify-between text-[9px] text-[#949ba4]">
          <span>0%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>

      {/* Mute Locally Button */}
      <button
        onClick={() => toggleLocalMuteUser(target.id)}
        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg font-medium transition-colors ${
          isMutedLocally
            ? 'bg-[#da373c]/20 text-[#f23f43] hover:bg-[#da373c]/30'
            : 'hover:bg-white/10 text-white'
        }`}
      >
        {isMutedLocally ? <MicOff size={14} className="text-[#f23f43]" /> : <Mic size={14} />}
        <span>{isMutedLocally ? 'Reativar Áudio Local' : 'Silenciar Localmente'}</span>
      </button>

      {/* Stream Audio Volume Slider (if user is streaming) */}
      {isStreaming && (
        <div className="flex flex-col gap-1.5 px-2 py-1.5 bg-white/5 rounded-lg border border-white/5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-white">
              <Monitor size={13} className="text-[#23a55a]" />
              Volume da Partilha
            </span>
            <span className="font-mono text-white font-bold">{currentStreamVol}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentStreamVol}
            onChange={(e) => setScreenShareUserVolume(target.id, Number(e.target.value))}
            className="w-full h-1.5 bg-[#4e5058] rounded-lg appearance-none cursor-pointer accent-[#23a55a]"
          />
        </div>
      )}

      <div className="h-[1px] bg-white/10 my-0.5" />

      {/* Copy Username */}
      <button
        onClick={handleCopy}
        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-white font-medium transition-colors"
      >
        <span className="flex items-center gap-2">
          <Copy size={13} />
          <span>Copiar Nome</span>
        </span>
        {copied && <Check size={13} className="text-[#23a55a]" />}
      </button>
    </div>
  );
};
