import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Hash, Send, Sparkles } from 'lucide-react';
import { Message } from '@discord-mini/shared';

interface ChatAreaProps {
  onSendMessage: (content: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onSendMessage }) => {
  const { currentChannelId, servers, currentServerId, messages, currentUser } = useAppStore();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentServer = servers.find((s) => s.id === currentServerId) || servers[0];
  const channel = currentServer?.channels.find((c) => c.id === currentChannelId);
  const channelMessages: Message[] = (currentChannelId && messages[currentChannelId]) || [];

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [currentChannelId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [channelMessages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!channel) {
    return (
      <main className="flex-1 bg-app-primary flex items-center justify-center text-app-textMuted text-sm select-none">
        Seleciona um canal para começar a conversar.
      </main>
    );
  }

  return (
    <main className="flex-1 bg-app-primary flex flex-col min-w-0 h-full transition-colors duration-200">
      {/* Channel Header */}
      <div className="h-12 border-b border-app-border px-4 flex items-center gap-2 font-semibold text-app-textHeader shadow-sm shrink-0">
        <Hash size={22} className="text-app-textMuted" />
        <span className="text-sm">{channel.name}</span>
        <div className="h-4 w-[1px] bg-app-border mx-2" />
        <span className="text-xs text-app-textMuted font-normal truncate">
          Canal de texto do servidor. Mensagens são guardadas por 7 dias.
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome banner inside channel */}
        <div className="pt-8 pb-4 flex flex-col gap-2">
          <div className="w-16 h-16 rounded-full bg-app-hover flex items-center justify-center text-white">
            <Hash size={40} />
          </div>
          <h3 className="text-2xl font-bold text-app-textHeader">Bem-vindo a #{channel.name}!</h3>
          <p className="text-xs text-app-textMuted">
            Este é o início do canal #{channel.name}. As mensagens aqui são privadas e apagadas automaticamente após 7 dias.
          </p>
          <div className="w-full h-[1px] bg-app-border my-2" />
        </div>

        {/* Message Items */}
        {channelMessages.map((msg, index) => {
          const prevMsg = channelMessages[index - 1];
          const isSameUser = prevMsg && prevMsg.userId === msg.userId;
          const timeDiff = prevMsg ? Math.abs(new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) : Infinity;
          const isCompact = isSameUser && timeDiff < 5 * 60 * 1000;
          const isRainbow = msg.userColor === 'rainbow';

          if (isCompact) {
            return (
              <div key={msg.id} className="group flex pl-14 py-0.5 hover:bg-app-hover -mx-4 px-4 rounded transition-colors relative">
                <span className="absolute left-4 opacity-0 group-hover:opacity-100 text-[10px] text-app-textMuted select-none pt-0.5">
                  {formatMessageTime(msg.createdAt)}
                </span>
                <p className="text-sm text-app-textNormal leading-relaxed break-words whitespace-pre-wrap select-text">
                  {msg.content}
                </p>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex gap-3 hover:bg-app-hover -mx-4 px-4 py-1.5 rounded transition-colors">
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 select-none shadow-sm ${
                  isRainbow ? 'avatar-rainbow' : ''
                }`}
                style={!isRainbow ? { backgroundColor: msg.userColor } : {}}
              >
                {msg.username[0]?.toUpperCase()}
              </div>

              {/* Message Content */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`font-semibold text-sm text-app-textHeader hover:underline cursor-pointer ${isRainbow ? 'text-rainbow' : ''}`}>
                    {msg.username}
                  </span>
                  <span className="text-[11px] text-app-textMuted">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-app-textNormal leading-relaxed break-words whitespace-pre-wrap select-text mt-0.5">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="px-4 pb-5 pt-1">
        <form onSubmit={handleSubmit} className="bg-app-input rounded-lg flex items-center px-4 py-2.5 gap-3 shadow-inner border border-app-border">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Conversar em #${channel.name} (Enter para enviar)`}
            className="bg-transparent flex-1 text-sm text-app-textNormal placeholder-app-textMuted focus:outline-none resize-none max-h-32 select-text"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="text-app-accent hover:text-white disabled:opacity-30 transition-colors p-1"
            title="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </main>
  );
};
