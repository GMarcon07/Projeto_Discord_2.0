import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Volume2 } from 'lucide-react';

export const MemberList: React.FC = () => {
  const { members, voiceParticipants, currentUser, openContextMenu } = useAppStore();

  const onlineMembers = members.filter((m) => m.isOnline);
  const offlineMembers = members.filter((m) => !m.isOnline);

  const isUserSpeakingInVoice = (userId: string) => {
    return voiceParticipants.some((p) => p.userId === userId && p.isSpeaking);
  };

  const handleContextMenu = (e: React.MouseEvent, member: any) => {
    e.preventDefault();
    if (member.id === currentUser?.id) return;
    openContextMenu(e.clientX, e.clientY, {
      id: member.id,
      username: member.username,
      color: member.color,
      avatarUrl: member.avatarUrl
    });
  };

  return (
    <aside className="w-60 bg-app-secondary flex flex-col shrink-0 select-none border-l border-app-border overflow-y-auto px-3 py-4 space-y-4 transition-colors duration-200">
      {/* Online Section */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-app-textMuted px-2 mb-1">
          Disponível — {onlineMembers.length}
        </h4>
        <div className="space-y-0.5">
          {onlineMembers.map((member) => {
            const speaking = isUserSpeakingInVoice(member.id);
            return (
              <div
                key={member.id}
                onContextMenu={(e) => handleContextMenu(e, member)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-app-hover transition-colors cursor-pointer group"
                title={member.id !== currentUser?.id ? 'Clique c/ botão direito para opções' : undefined}
              >
                {/* Avatar with Online badge */}
                <div className="relative shrink-0">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.username}
                      className={`w-8 h-8 rounded-full object-cover shadow-sm ${
                        speaking ? 'speaking-ring' : ''
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm ${
                        speaking ? 'speaking-ring' : ''
                      }`}
                      style={{ backgroundColor: member.color || '#5865F2' }}
                    >
                      {member.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23a55a] border-2 border-app-secondary" />
                </div>

                {/* Member Info */}
                <div className="flex items-center justify-between min-w-0 flex-1">
                  <span className="text-sm font-medium text-app-textNormal group-hover:text-white truncate">
                    {member.username}
                  </span>
                  {speaking && (
                    <Volume2 size={14} className="text-[#23a55a] shrink-0 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Offline Section */}
      {offlineMembers.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-app-textMuted px-2 mb-1">
            Indisponível — {offlineMembers.length}
          </h4>
          <div className="space-y-0.5 opacity-60">
            {offlineMembers.map((member) => {
              return (
                <div
                  key={member.id}
                  onContextMenu={(e) => handleContextMenu(e, member)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-app-hover transition-colors cursor-default"
                >
                  {/* Avatar with Offline badge */}
                  <div className="relative shrink-0">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.username}
                        className="w-8 h-8 rounded-full object-cover shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm"
                        style={{ backgroundColor: member.color || '#5865F2' }}
                      >
                        {member.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#80848e] border-2 border-app-secondary" />
                  </div>

                  {/* Member Info */}
                  <span className="text-sm font-medium text-app-textMuted truncate">
                    {member.username}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
