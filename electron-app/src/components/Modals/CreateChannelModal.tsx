import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Hash, Volume2, X } from 'lucide-react';

export const CreateChannelModal: React.FC = () => {
  const {
    isCreateChannelOpen,
    setCreateChannelOpen,
    createChannelType,
    currentServerId,
    servers,
    serverUrl,
    addChannelToServer,
    setCurrentChannelId
  } = useAppStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>(createChannelType || 'text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync type when modal opens
  React.useEffect(() => {
    setType(createChannelType);
    setName('');
    setError('');
  }, [isCreateChannelOpen, createChannelType]);

  if (!isCreateChannelOpen) return null;

  const currentServer = servers.find((s) => s.id === currentServerId) || servers[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleanName || cleanName.length < 2) {
      setError('O nome do canal deve ter pelo menos 2 caracteres.');
      return;
    }

    if (!currentServer) {
      setError('Nenhum servidor selecionado.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServer.id,
          name: cleanName,
          type
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Erro ao criar canal.');
        setLoading(false);
        return;
      }

      addChannelToServer(data);
      if (data.type === 'text') {
        setCurrentChannelId(data.id);
      }
      setCreateChannelOpen(false);
    } catch {
      setError('Falha na ligação ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="bg-[#313338] border border-[#232428] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232428] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Criar Canal</h3>
          <button
            onClick={() => setCreateChannelOpen(false)}
            className="text-[#949ba4] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-[#f23f43]/20 border border-[#f23f43] rounded p-2.5 text-xs text-[#f23f43]">
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase text-[#b5bac1]">Tipo de Canal</label>
            <div className="space-y-2">
              <div
                onClick={() => setType('text')}
                className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${
                  type === 'text'
                    ? 'bg-[#404249] border-[#5865F2] text-white'
                    : 'bg-[#2b2d31] border-[#1f2023] text-[#949ba4] hover:bg-[#35373c]'
                }`}
              >
                <Hash size={24} className="text-[#5865F2]" />
                <div>
                  <div className="text-sm font-semibold text-white">Canal de Texto</div>
                  <div className="text-xs text-[#949ba4]">Partilha mensagens, imagens, memes e discussões.</div>
                </div>
              </div>

              <div
                onClick={() => setType('voice')}
                className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${
                  type === 'voice'
                    ? 'bg-[#404249] border-[#5865F2] text-white'
                    : 'bg-[#2b2d31] border-[#1f2023] text-[#949ba4] hover:bg-[#35373c]'
                }`}
              >
                <Volume2 size={24} className="text-[#23a55a]" />
                <div>
                  <div className="text-sm font-semibold text-white">Canal de Voz</div>
                  <div className="text-xs text-[#949ba4]">Conversa por voz com os teus amigos e transmite ecrã em 1080p.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-[#b5bac1]">Nome do Canal</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#949ba4] font-bold">
                {type === 'text' ? '#' : '🔊'}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="novo-canal"
                required
                autoFocus
                className="w-full bg-[#1e1f22] border border-[#232428] rounded-md pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateChannelOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-white hover:underline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded text-xs font-semibold shadow transition-colors"
            >
              {loading ? 'A criar...' : 'Criar Canal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
