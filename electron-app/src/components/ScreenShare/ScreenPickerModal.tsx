import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Monitor, AppWindow, X } from 'lucide-react';
import { ScreenShareSource } from '@discord-mini/shared';

interface ScreenPickerModalProps {
  onSelectSource: (sourceId: string) => void;
}

export const ScreenPickerModal: React.FC<ScreenPickerModalProps> = ({ onSelectSource }) => {
  const { isScreenPickerOpen, setScreenPickerOpen, availableScreenSources } = useAppStore();
  const [activeTab, setActiveTab] = useState<'screen' | 'window'>('screen');

  if (!isScreenPickerOpen) return null;

  const screens = availableScreenSources.filter((s) => s.id.startsWith('screen:'));
  const windows = availableScreenSources.filter((s) => !s.id.startsWith('screen:'));
  const currentList = activeTab === 'screen' ? (screens.length > 0 ? screens : availableScreenSources) : windows;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#313338] border border-[#232428] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232428] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Partilhar Ecrã em 1080p a 60fps</h3>
            <p className="text-xs text-[#949ba4]">
              Seleciona o ecrã completo ou uma janela de aplicação para transmitir aos teus amigos.
            </p>
          </div>
          <button
            onClick={() => setScreenPickerOpen(false)}
            className="text-[#b5bac1] hover:text-white p-1 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#232428] px-6 gap-6 pt-2">
          <button
            onClick={() => setActiveTab('screen')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'screen'
                ? 'border-[#5865F2] text-white'
                : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'
            }`}
          >
            <Monitor size={16} />
            Ecrãs ({screens.length})
          </button>
          <button
            onClick={() => setActiveTab('window')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'window'
                ? 'border-[#5865F2] text-white'
                : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'
            }`}
          >
            <AppWindow size={16} />
            Janelas de Aplicações ({windows.length})
          </button>
        </div>

        {/* Source Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4">
          {currentList.map((source) => (
            <div
              key={source.id}
              onClick={() => {
                onSelectSource(source.id);
                setScreenPickerOpen(false);
              }}
              className="group bg-[#2b2d31] hover:bg-[#383a40] border border-[#1f2023] hover:border-[#5865F2] rounded-lg p-2.5 flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02] shadow-md"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-[#1e1f22] rounded overflow-hidden flex items-center justify-center border border-[#18191c]">
                {source.thumbnail ? (
                  <img src={source.thumbnail} alt={source.name} className="w-full h-full object-cover" />
                ) : (
                  <Monitor size={32} className="text-[#80848e]" />
                )}
                <div className="absolute top-1 right-1 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-bold text-[#57F287]">
                  1080p 60fps
                </div>
              </div>

              {/* Title */}
              <div className="flex items-center gap-2 min-w-0">
                {source.appIcon && (
                  <img src={source.appIcon} alt="" className="w-4 h-4 rounded shrink-0" />
                )}
                <span className="text-xs font-medium text-[#dbdee1] group-hover:text-white truncate">
                  {source.name}
                </span>
              </div>
            </div>
          ))}

          {currentList.length === 0 && (
            <div className="col-span-2 text-center py-12 text-[#949ba4] text-xs">
              Nenhuma fonte encontrada nesta categoria.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#2b2d31] border-t border-[#232428] flex justify-end gap-3">
          <button
            onClick={() => setScreenPickerOpen(false)}
            className="px-4 py-2 rounded text-xs font-semibold text-white hover:underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
