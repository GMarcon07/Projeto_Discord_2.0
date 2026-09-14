import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = !!window.electronAPI?.isElectron;

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI?.isWindowMaximized().then(setIsMaximized);
  }, [isElectron]);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = async () => {
    window.electronAPI?.maximizeWindow();
    const max = await window.electronAPI?.isWindowMaximized();
    if (typeof max === 'boolean') setIsMaximized(max);
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <header className="h-7 w-full bg-[#202225] flex items-center justify-between px-3 select-none drag-region text-xs font-semibold text-[#96989d] border-b border-[#18191c] z-50">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#5865F2] inline-block"></span>
        <span className="text-[#dcddde] tracking-wide text-xs">Discord Mini</span>
      </div>

      {isElectron && (
        <div className="flex items-center no-drag h-full">
          <button
            onClick={handleMinimize}
            className="h-full px-3.5 hover:bg-[#36393f] text-[#dcddde] flex items-center justify-center transition-colors"
            title="Minimizar"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full px-3.5 hover:bg-[#36393f] text-[#dcddde] flex items-center justify-center transition-colors"
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
          >
            {isMaximized ? <Copy size={11} /> : <Square size={11} />}
          </button>
          <button
            onClick={handleClose}
            className="h-full px-3.5 hover:bg-[#ed4245] hover:text-white text-[#dcddde] flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </header>
  );
};
