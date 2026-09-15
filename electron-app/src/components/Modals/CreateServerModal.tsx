import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Plus, Server as ServerIcon, Globe, X } from 'lucide-react';

export const CreateServerModal: React.FC = () => {
  const {
    isCreateServerOpen,
    setCreateServerOpen,
    serverUrl,
    setServerUrl,
    addServer,
    setCurrentServerId
  } = useAppStore();

  const [mode, setMode] = useState<'create' | 'connect'>('create');
  const [serverName, setServerName] = useState('');
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isCreateServerOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'create') {
      const cleanName = serverName.trim();
      if (cleanName.length < 2) {
        setError('O nome do servidor deve ter pelo menos 2 caracteres.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${serverUrl}/api/servers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanName })
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || 'Erro ao criar servidor.');
          setLoading(false);
          return;
        }

        addServer(data);
        setCurrentServerId(data.id);
        setCreateServerOpen(false);
      } catch {
        setError('Falha ao comunicar com o servidor.');
      } finally {
        setLoading(false);
      }
    } else {
      // Connect to another server URL
      const cleanUrl = customServerUrl.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        setError('A URL deve começar por http:// ou https://');
        return;
      }

      setServerUrl(cleanUrl);
      setCreateServerOpen(false);
      // Reload page to connect to new server
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="bg-[#313338] border border-[#232428] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232428] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Adicionar Servidor</h3>
          <button
            onClick={() => setCreateServerOpen(false)}
            className="text-[#949ba4] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#232428] px-6 gap-6 pt-2">
          <button
            onClick={() => setMode('create')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              mode === 'create'
                ? 'border-[#5865F2] text-white'
                : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'
            }`}
          >
            <Plus size={14} /> Criar Novo Servidor
          </button>
          <button
            onClick={() => setMode('connect')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              mode === 'connect'
                ? 'border-[#5865F2] text-white'
                : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'
            }`}
          >
            <Globe size={14} /> Conectar a outro Servidor
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {error && (
            <div className="bg-[#f23f43]/20 border border-[#f23f43] rounded p-2.5 text-xs text-[#f23f43]">
              {error}
            </div>
          )}

          {mode === 'create' ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[#b5bac1]">Nome do Servidor</label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="ex: Servidor de Jogos"
                required
                autoFocus
                className="w-full bg-[#1e1f22] border border-[#232428] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
              />
              <p className="text-[11px] text-[#949ba4]">Cria um novo espaço no servidor com os canais padrão # geral e 🔊 Conversa Geral.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[#b5bac1]">URL do Outro Servidor</label>
              <input
                type="url"
                value={customServerUrl}
                onChange={(e) => setCustomServerUrl(e.target.value)}
                placeholder="https://outro-servidor.onrender.com"
                required
                autoFocus
                className="w-full bg-[#1e1f22] border border-[#232428] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
              />
              <p className="text-[11px] text-[#949ba4]">Permite alternar entre diferentes servidores hospedados no Render ou Railway.</p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateServerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-white hover:underline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (mode === 'create' ? !serverName.trim() : !customServerUrl.trim())}
              className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded text-xs font-semibold shadow transition-colors"
            >
              {loading ? 'A processar...' : mode === 'create' ? 'Criar Servidor' : 'Conectar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
