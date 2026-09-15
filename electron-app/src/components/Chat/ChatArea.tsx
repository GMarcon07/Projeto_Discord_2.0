import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Hash, Send, Plus, X, File, Download, Film, Image as ImageIcon } from 'lucide-react';
import { Message } from '@discord-mini/shared';

interface ChatAreaProps {
  onSendMessage: (
    content: string,
    attachment?: { fileUrl: string; fileName: string; fileType: string; fileSize: number },
    clientMessageId?: string
  ) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onSendMessage }) => {
  const {
    currentChannelId,
    setCurrentChannelId,
    servers,
    currentServerId,
    messages,
    addMessage,
    markMessageError,
    currentUser,
    members,
    serverUrl
  } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState<{ file: File; previewUrl?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentServer = servers.find((s) => s.id === currentServerId) || servers[0];
  const channel =
    currentServer?.channels.find((c) => c.id === currentChannelId) ||
    currentServer?.channels.find((c) => c.type === 'text') ||
    currentServer?.channels[0];

  const activeChannelId = channel?.id || currentChannelId;
  const channelMessages: Message[] = (activeChannelId && messages[activeChannelId]) || [];

  // Auto-sync channelId if desynchronized
  useEffect(() => {
    if (channel && currentChannelId !== channel.id) {
      setCurrentChannelId(channel.id);
    }
  }, [channel?.id, currentChannelId, setCurrentChannelId]);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeChannelId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [channelMessages.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert('O ficheiro ultrapassa o limite máximo permitido de 100MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setPendingFile({ file, previewUrl });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = () => {
    if (pendingFile?.previewUrl) {
      URL.revokeObjectURL(pendingFile.previewUrl);
    }
    setPendingFile(null);
  };

  const getAssetUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    const cleanServer = (serverUrl || '').replace(/\/+$/, '');
    const cleanPath = url.replace(/^\/+/, '');
    return `${cleanServer}/${cleanPath}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && !pendingFile) return;
    if (!channel) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const currentText = trimmed;
    const fileToSend = pendingFile;

    // Reset input form immediately for fluid UI response
    setInputText('');
    setPendingFile(null);

    // 1. Optimistic insertion in chat feed
    const optimisticMsg: Message = {
      id: tempId,
      channelId: channel.id,
      userId: currentUser?.id || 'me',
      username: currentUser?.username || 'Eu',
      userColor: currentUser?.color || '#5865F2',
      content: currentText,
      fileUrl: fileToSend?.previewUrl,
      fileName: fileToSend?.file.name,
      fileType: fileToSend?.file.type,
      fileSize: fileToSend?.file.size,
      createdAt: new Date().toISOString(),
      clientMessageId: tempId,
      status: fileToSend ? 'sending' : 'sent'
    };
    addMessage(optimisticMsg);

    // 2. Upload file if attached
    let attachmentData: { fileUrl: string; fileName: string; fileType: string; fileSize: number } | undefined;

    if (fileToSend) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', fileToSend.file);

        const cleanServer = (serverUrl || '').replace(/\/+$/, '');
        const res = await fetch(`${cleanServer}/api/upload`, {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.success) {
          attachmentData = {
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize
          };
        } else {
          console.error('[UPLOAD ERROR]', data);
          markMessageError(tempId);
          alert(data.error || 'Erro ao enviar ficheiro.');
          setIsUploading(false);
          return;
        }
      } catch (err) {
        console.error('[UPLOAD NETWORK ERROR]', err);
        markMessageError(tempId);
        alert('Falha ao comunicar com o servidor para enviar o anexo.');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // 3. Emit via socket with clientMessageId
    onSendMessage(currentText, attachmentData, tempId);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!channel) {
    return (
      <main className="flex-1 bg-app-primary flex items-center justify-center text-app-textMuted text-sm select-none">
        Seleciona um canal para começar a conversar.
      </main>
    );
  }

  return (
    <main className="flex-1 bg-app-primary flex flex-col min-w-0 h-full transition-colors duration-200 relative">
      {/* Channel Header */}
      <div className="h-12 border-b border-app-border px-4 flex items-center gap-2 font-semibold text-app-textHeader shadow-sm shrink-0">
        <Hash size={22} className="text-app-textMuted" />
        <span className="text-sm">{channel.name}</span>
        <div className="h-4 w-[1px] bg-app-border mx-2" />
        <span className="text-xs text-app-textMuted font-normal truncate">
          Canal de texto do servidor. Envio de fotos e vídeos até 100MB ativado.
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
            Este é o início do canal #{channel.name}. Podes enviar mensagens, fotos e vídeos de até 100MB.
          </p>
          <div className="w-full h-[1px] bg-app-border my-2" />
        </div>

        {/* Message Items */}
        {channelMessages.map((msg, index) => {
          const prevMsg = channelMessages[index - 1];
          const isSameUser = prevMsg && prevMsg.userId === msg.userId;
          const timeDiff = prevMsg ? Math.abs(new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) : Infinity;
          const isCompact = isSameUser && timeDiff < 5 * 60 * 1000 && !msg.fileUrl && !prevMsg.fileUrl;

          // Find sender avatar
          const sender = msg.userId === currentUser?.id ? currentUser : members.find((m) => m.id === msg.userId);
          const avatarSrc = getAssetUrl(sender?.avatarUrl);

          const fileSrc = getAssetUrl(msg.fileUrl);
          const isImage = msg.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl || '');
          const isVideo = msg.fileType?.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(msg.fileUrl || '');

          if (isCompact) {
            return (
              <div key={msg.id} className="group flex pl-14 py-0.5 hover:bg-app-hover -mx-4 px-4 rounded transition-colors relative">
                <span className="absolute left-4 opacity-0 group-hover:opacity-100 text-[10px] text-app-textMuted select-none pt-0.5">
                  {formatMessageTime(msg.createdAt)}
                </span>
                <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap select-text ${msg.status === 'sending' ? 'text-app-textNormal/70' : msg.status === 'error' ? 'text-red-400' : 'text-app-textNormal'}`}>
                  {msg.content}
                </p>
                {msg.status === 'sending' && (
                  <span className="ml-2 text-[10px] text-app-textMuted animate-pulse">a enviar...</span>
                )}
                {msg.status === 'error' && (
                  <span className="ml-2 text-[10px] text-red-400 font-bold">falhou</span>
                )}
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex gap-3 hover:bg-app-hover -mx-4 px-4 py-1.5 rounded transition-colors ${msg.status === 'sending' ? 'opacity-80' : ''}`}>
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 select-none shadow-sm overflow-hidden"
                style={{ backgroundColor: msg.userColor || '#5865F2' }}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt={msg.username} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                ) : (
                  (msg.username || 'U')[0]?.toUpperCase()
                )}
              </div>

              {/* Message Content */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm text-app-textHeader hover:underline cursor-pointer">
                    {msg.username}
                  </span>
                  <span className="text-[11px] text-app-textMuted">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                  {msg.status === 'sending' && (
                    <span className="text-[10px] text-app-textMuted flex items-center gap-1 animate-pulse">
                      <span className="w-2 h-2 rounded-full border border-app-textMuted border-t-white animate-spin" />
                      A enviar...
                    </span>
                  )}
                  {msg.status === 'error' && (
                    <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                      Falha no envio
                    </span>
                  )}
                </div>

                {msg.content && (
                  <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap select-text mt-0.5 ${msg.status === 'error' ? 'text-red-400' : 'text-app-textNormal'}`}>
                    {msg.content}
                  </p>
                )}

                {/* File Attachment Rendering */}
                {fileSrc && (
                  <div className="mt-2">
                    {isImage && (
                      <div
                        onClick={() => setLightboxImage(fileSrc)}
                        className="max-w-md max-h-96 rounded-xl overflow-hidden border border-app-border cursor-pointer hover:opacity-95 transition-opacity inline-block bg-black/20"
                        title="Clica para ampliar"
                      >
                        <img
                          src={fileSrc}
                          alt={msg.fileName || 'Imagem'}
                          className="max-h-96 w-auto object-cover rounded-xl"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {isVideo && (
                      <div className="max-w-lg rounded-xl overflow-hidden border border-app-border bg-black shadow-lg">
                        <video
                          src={fileSrc}
                          controls
                          className="max-h-96 w-full rounded-xl"
                          preload="metadata"
                        />
                        {msg.fileName && (
                          <div className="p-2 text-[11px] text-app-textMuted bg-app-tertiary flex items-center justify-between">
                            <span className="truncate">{msg.fileName}</span>
                            <span>{formatFileSize(msg.fileSize)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!isImage && !isVideo && (
                      <a
                        href={fileSrc}
                        download={msg.fileName || 'ficheiro'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 bg-app-card hover:bg-app-hover border border-app-border rounded-xl max-w-sm transition-colors text-app-textHeader group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-app-accent/15 text-app-accent flex items-center justify-center shrink-0">
                          <File size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate group-hover:underline">{msg.fileName || 'Ficheiro'}</p>
                          <p className="text-[10px] text-app-textMuted">{formatFileSize(msg.fileSize)}</p>
                        </div>
                        <Download size={16} className="text-app-textMuted group-hover:text-white shrink-0" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field with Attachment Support */}
      <div className="px-4 pb-5 pt-1">
        {/* Pending File Preview Chip */}
        {pendingFile && (
          <div className="mb-2 p-2.5 bg-app-card border border-app-border rounded-xl flex items-center justify-between max-w-md animate-in fade-in">
            <div className="flex items-center gap-2.5 truncate">
              {pendingFile.previewUrl ? (
                <img src={pendingFile.previewUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-app-accent/20 text-app-accent flex items-center justify-center shrink-0">
                  {pendingFile.file.type.startsWith('video/') ? <Film size={20} /> : <File size={20} />}
                </div>
              )}
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-app-textHeader truncate">{pendingFile.file.name}</span>
                <span className="text-[10px] text-app-textMuted">{formatFileSize(pendingFile.file.size)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={removePendingFile}
              className="p-1 rounded-full hover:bg-app-hover text-app-textMuted hover:text-white"
              title="Remover anexo"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-app-input rounded-xl flex items-center px-3 py-2 gap-2 shadow-inner border border-app-border">
          {/* File Picker Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-app-textMuted hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Enviar Foto ou Vídeo (até 100MB)"
          >
            <Plus size={18} />
          </button>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Conversar em #${channel.name} (Enter para enviar)`}
            className="bg-transparent flex-1 text-sm text-app-textNormal placeholder-app-textMuted focus:outline-none resize-none max-h-32 select-text py-1"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !pendingFile) || isUploading}
            className="w-8 h-8 rounded-full bg-app-accent hover:bg-app-accentHover disabled:opacity-30 text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
            title="Enviar mensagem"
          >
            {isUploading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </form>
      </div>

      {/* Lightbox Modal for Full-Size Image Preview */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 backdrop-blur-md cursor-pointer animate-in fade-in"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Ampliada"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95"
          />
        </div>
      )}
    </main>
  );
};
