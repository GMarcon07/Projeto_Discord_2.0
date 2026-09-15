import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Server as ServerIcon, User as UserIcon, KeyRound, AlertCircle, Globe } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';

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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-app-primary border border-app-border rounded-2xl shadow-2xl w-full max-w-md p-8 text-app-textNormal flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl ring-2 ring-app-accent/50 shadow-app-accent/20 mb-1">
            <img src={logoImg} alt="A resenha" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-app-textHeader tracking-tight">A resenha</h2>
            <p className="text-xs text-app-textMuted mt-1">
              Comunicação privada para a tua malta. Introduz o teu username e PIN numérico.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-app-textMuted flex items-center gap-1.5">
              <UserIcon size={13} className="text-app-accent" />
              Nome de Utilizador
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: Gabriel"
              required
              autoFocus
              className="bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-sm text-app-textHeader placeholder-app-textMuted focus:outline-none focus:border-app-accent transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-app-textMuted flex items-center gap-1.5">
              <KeyRound size={13} className="text-app-accent" />
              PIN Numérico (4 a 6 dígitos)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              required
              className="bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-sm text-app-textHeader placeholder-app-textMuted focus:outline-none focus:border-app-accent tracking-widest transition-colors font-mono"
            />
            <span className="text-[11px] text-app-textMuted">
              Se for a tua primeira vez, este PIN criará a tua conta automaticamente.
            </span>
          </div>

          {/* Quick Server Switcher (Lite vs Host) */}
          <div className="pt-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-textMuted">Servidor de Destino</span>
              <button
                type="button"
                onClick={() => setShowServerConfig(!showServerConfig)}
                className="text-xs text-app-accent hover:underline flex items-center gap-1"
              >
                <ServerIcon size={12} />
                {showServerConfig ? 'Ocultar' : 'Personalizar URL'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomUrl('https://projeto-discord-2-0.onrender.com')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold border transition-all ${
                  customUrl === 'https://projeto-discord-2-0.onrender.com'
                    ? 'border-app-accent bg-app-accent/15 text-white shadow-sm'
                    : 'border-app-border bg-app-card text-app-textMuted hover:bg-app-hover'
                }`}
              >
                <Globe size={13} className="text-blue-400" />
                <span>Nuvem (Lite)</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomUrl('http://localhost:3001')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold border transition-all ${
                  customUrl === 'http://localhost:3001'
                    ? 'border-app-accent bg-app-accent/15 text-white shadow-sm'
                    : 'border-app-border bg-app-card text-app-textMuted hover:bg-app-hover'
                }`}
              >
                <ServerIcon size={13} className="text-green-400" />
                <span>Host Local</span>
              </button>
            </div>

            {showServerConfig && (
              <div className="mt-1 p-3 rounded-xl bg-app-card border border-app-border flex flex-col gap-1.5 animate-in fade-in">
                <label className="text-[10px] font-semibold text-app-textMuted uppercase">URL Personalizada</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="http://localhost:3001"
                  className="bg-app-input border border-app-border rounded-lg px-2.5 py-1.5 text-xs text-app-textHeader placeholder-app-textMuted focus:outline-none focus:border-app-accent"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full bg-app-accent hover:bg-app-accentHover disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-[0.98]"
          >
            {loading ? 'A ligar...' : 'Entrar na Resenha'}
          </button>
        </form>
      </div>
    </div>
  );
};

