import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';

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
    <header className="h-8 w-full bg-app-tertiary flex items-center justify-between px-3 select-none drag-region text-xs font-semibold text-app-textMuted border-b border-app-border z-50 transition-colors duration-200">
      <div className="flex items-center gap-2">
        <img
          src={logoImg}
          alt="A resenha"
          className="w-4 h-4 rounded object-cover shadow-sm inline-block"
        />
        <span className="text-app-textHeader font-bold tracking-wide text-xs">A resenha</span>
      </div>

      {isElectron && (
        <div className="flex items-center no-drag h-full">
          <button
            onClick={handleMinimize}
            className="h-full px-3.5 hover:bg-app-hover text-app-textNormal flex items-center justify-center transition-colors"
            title="Minimizar"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full px-3.5 hover:bg-app-hover text-app-textNormal flex items-center justify-center transition-colors"
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
          >
            {isMaximized ? <Copy size={11} /> : <Square size={11} />}
          </button>
          <button
            onClick={handleClose}
            className="h-full px-3.5 hover:bg-[#ed4245] hover:text-white text-app-textNormal flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </header>
  );
};
