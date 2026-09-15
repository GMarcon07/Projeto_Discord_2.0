import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Plus } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';

export const ServerSidebar: React.FC = () => {
  const { servers, currentServerId, setCurrentServerId, setCurrentChannelId, setCreateServerOpen } = useAppStore();

  const handleSelectServer = (serverId: string) => {
    setCurrentServerId(serverId);
    const server = servers.find((s) => s.id === serverId);
    if (server && server.channels.length > 0) {
      // Pick first text channel by default
      const firstText = server.channels.find((c) => c.type === 'text') || server.channels[0];
      setCurrentChannelId(firstText.id);
    }
  };

  const isHomeSelected = servers.length > 0 && currentServerId === servers[0]?.id;

  return (
    <nav className="w-[72px] bg-app-tertiary flex flex-col items-center py-3 gap-2 shrink-0 border-r border-app-border select-none transition-colors duration-200">
      {/* Brand / Home "A resenha" button */}
      <div className="relative group flex items-center justify-center w-full">
        <div
          className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
            isHomeSelected ? 'h-10' : 'h-2 group-hover:h-5'
          }`}
        />
        <button
          onClick={() => {
            if (servers.length > 0) handleSelectServer(servers[0].id);
          }}
          className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-white shadow-md overflow-hidden p-1 ${
            isHomeSelected ? 'bg-app-accent rounded-[16px] ring-2 ring-white/20' : 'bg-app-secondary hover:bg-app-accent'
          }`}
          title="A resenha - Início"
        >
          <img
            src={logoImg}
            alt="A resenha"
            className="w-full h-full object-cover rounded-[20px] group-hover:rounded-[14px] transition-all duration-200"
          />
        </button>
      </div>

      <div className="w-8 h-[2px] bg-white/10 rounded-full my-1" />

      {/* Server List */}
      <div className="flex flex-col gap-2 w-full overflow-y-auto overflow-x-hidden items-center">
        {servers.map((server, idx) => {
          // Skip the first server if it's the home server or show all
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
                    ? 'bg-app-accent text-white rounded-[16px]'
                    : 'bg-app-secondary text-app-normal group-hover:bg-app-accent group-hover:text-white'
                }`}
                title={server.name}
              >
                {initials || 'AR'}
              </button>
            </div>
          );
        })}

        {/* Add Server Button */}
        <div className="relative group flex items-center justify-center w-full mt-1">
          <button
            onClick={() => setCreateServerOpen(true)}
            className="w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center bg-app-secondary text-[#23a55a] group-hover:bg-[#23a55a] group-hover:text-white shadow-md"
            title="Adicionar Servidor"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>
    </nav>
  );
};
