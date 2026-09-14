import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Shield, Server as ServerIcon, User as UserIcon, KeyRound, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { currentUser, setCurrentUser, serverUrl, setServerUrl } = useAppStore();

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [customUrl, setCustomUrl] = useState(serverUrl);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 2) {
      setError('O nome de utilizador deve ter pelo menos 2 caracteres.');
      return;
    }

    if (!/^\d{4,6}$/.test(pin.trim())) {
      setError('O PIN deve conter entre 4 e 6 números.');
      return;
    }

    setLoading(true);
    try {
      // Save server URL
      setServerUrl(customUrl);

      const res = await fetch(`${customUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, pin: pin.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Erro ao autenticar. Verifica o PIN ou nome de utilizador.');
        setLoading(false);
        return;
      }

      setCurrentUser(data.user);
    } catch (err: any) {
      console.error('Erro de conexão:', err);
      setError(`Falha na ligação ao servidor (${customUrl}). Verifica se o servidor está ativo.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#313338] border border-[#232428] rounded-lg shadow-2xl w-full max-w-md p-7 text-[#dbdee1] flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white shadow-lg shadow-[#5865F2]/20 mb-1">
            <Shield size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Bem-vindo ao Discord Mini</h2>
          <p className="text-xs text-[#949ba4]">
            Acesso privado para amigos. Introduz o teu username e PIN numérico.
          </p>
        </div>

        {error && (
          <div className="bg-[#da373c]/15 border border-[#da373c]/30 rounded-md p-3 text-xs text-[#fa777c] flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
              <UserIcon size={13} />
              Nome de Utilizador
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: Gabriel"
              required
              autoFocus
              className="bg-[#1e1f22] border border-[#232428] rounded-md px-3 py-2.5 text-sm text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865F2] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
              <KeyRound size={13} />
              PIN (4 a 6 dígitos)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              required
              className="bg-[#1e1f22] border border-[#232428] rounded-md px-3 py-2.5 text-sm text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865F2] tracking-widest transition-colors font-mono"
            />
            <span className="text-[10px] text-[#949ba4]">
              Se for a tua primeira vez, este PIN criará a tua conta automaticamente.
            </span>
          </div>

          {/* Server Config Accordion */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="text-xs text-[#5865F2] hover:underline flex items-center gap-1"
            >
              <ServerIcon size={12} />
              {showServerConfig ? 'Ocultar configurações de servidor' : 'Configurar servidor (Render / Railway / Local)'}
            </button>

            {showServerConfig && (
              <div className="mt-2.5 p-3 rounded-md bg-[#2b2d31] border border-[#1e1f22] flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-[#b5bac1] uppercase">URL do Servidor</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="http://localhost:3001"
                  className="bg-[#1e1f22] border border-[#3b3e45] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865F2]"
                />
                <span className="text-[10px] text-[#949ba4]">
                  Usa <code className="text-white">http://localhost:3001</code> em local ou a URL gratuita do teu Render.com / Railway.
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-all shadow-md active:scale-[0.98]"
          >
            {loading ? 'A autenticar...' : 'Entrar / Registar'}
          </button>
        </form>
      </div>
    </div>
  );
};
