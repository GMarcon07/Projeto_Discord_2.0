import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Volume2 } from 'lucide-react';

export const MemberList: React.FC = () => {
  const { members, voiceParticipants } = useAppStore();

  const onlineMembers = members.filter((m) => m.isOnline);
  const offlineMembers = members.filter((m) => !m.isOnline);

  const isUserSpeakingInVoice = (userId: string) => {
    return voiceParticipants.some((p) => p.userId === userId && p.isSpeaking);
  };

  return (
    <aside className="w-60 bg-[#2b2d31] flex flex-col shrink-0 select-none border-l border-[#1f2023] overflow-y-auto px-3 py-4 space-y-4">
      {/* Online Section */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] px-2 mb-1">
          Online — {onlineMembers.length}
        </h4>
        <div className="space-y-0.5">
          {onlineMembers.map((member) => {
            const speaking = isUserSpeakingInVoice(member.id);
            return (
              <div
                key={member.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-[#35373c] transition-colors cursor-pointer group"
              >
                {/* Avatar with Online badge */}
                <div className="relative shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm ${
                      speaking ? 'speaking-ring' : ''
                    }`}
                    style={{ backgroundColor: member.color }}
                  >
                    {member.username[0]?.toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23a55a] border-2 border-[#2b2d31]" />
                </div>

                {/* Member Info */}
                <div className="flex items-center justify-between min-w-0 flex-1">
                  <span className="text-sm font-medium text-[#dbdee1] group-hover:text-white truncate">
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
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] px-2 mb-1">
            Offline — {offlineMembers.length}
          </h4>
          <div className="space-y-0.5 opacity-60">
            {offlineMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-[#35373c] transition-colors cursor-default"
              >
                {/* Avatar with Offline badge */}
                <div className="relative shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.username[0]?.toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#80848e] border-2 border-[#2b2d31]" />
                </div>

                {/* Member Info */}
                <span className="text-sm font-medium text-[#949ba4] truncate">
                  {member.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
