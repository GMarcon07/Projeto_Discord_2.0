import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MessageSquare, Compass, Shield } from 'lucide-react';

export const ServerSidebar: React.FC = () => {
  const { servers, currentServerId, setCurrentServerId, setCurrentChannelId } = useAppStore();

  const handleSelectServer = (serverId: string) => {
    setCurrentServerId(serverId);
    const server = servers.find((s) => s.id === serverId);
    if (server && server.channels.length > 0) {
      // Pick first text channel by default
      const firstText = server.channels.find((c) => c.type === 'text') || server.channels[0];
      setCurrentChannelId(firstText.id);
    }
  };

  return (
    <nav className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 shrink-0 border-r border-[#18191c]">
      {/* Home / Discord button */}
      <div className="relative group flex items-center justify-center w-full">
        <div
          className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
            !currentServerId ? 'h-10' : 'h-2 group-hover:h-5'
          }`}
        />
        <button
          onClick={() => {
            if (servers.length > 0) handleSelectServer(servers[0].id);
          }}
          className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-white shadow-md ${
            !currentServerId ? 'bg-[#5865F2] rounded-[16px]' : 'bg-[#313338] group-hover:bg-[#5865F2]'
          }`}
          title="Início"
        >
          <Shield size={24} />
        </button>
      </div>

      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-1" />

      {/* Server List */}
      <div className="flex flex-col gap-2 w-full overflow-y-auto overflow-x-hidden items-center">
        {servers.map((server) => {
          const isSelected = currentServerId === server.id;
          const initials = server.name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* White Pill Indicator */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                  isSelected ? 'h-10' : 'h-0 group-hover:h-5'
                }`}
              />
              <button
                onClick={() => handleSelectServer(server.id)}
                className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center font-bold text-sm tracking-wide shadow-md ${
                  isSelected
                    ? 'bg-[#5865F2] text-white rounded-[16px]'
                    : 'bg-[#313338] text-[#dbdee1] group-hover:bg-[#5865F2] group-hover:text-white'
                }`}
                title={server.name}
              >
                {initials || 'DM'}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
};
