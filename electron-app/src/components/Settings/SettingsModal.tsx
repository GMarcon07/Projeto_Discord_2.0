import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  X,
  Mic,
  Volume2,
  Monitor,
  Palette,
  Laptop,
  Lock,
  Check,
  AlertCircle,
  Play,
  RotateCcw
} from 'lucide-react';
import { StreamQuality, ThemeMode } from '@discord-mini/shared';
import { sounds } from '../../utils/soundEffects';

interface MediaDeviceInfoItem {
  deviceId: string;
  label: string;
}

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    currentUser,
    serverUrl,
    inputDeviceId,
    setInputDeviceId,
    outputDeviceId,
    setOutputDeviceId,
    noiseSuppression,
    setNoiseSuppression,
    echoCancellation,
    setEchoCancellation,
    micSensitivity,
    setMicSensitivity,
    liveMicVolume,
    userVolumes,
    setUserVolume,
    voiceParticipants,
    screenShareVolume,
    setScreenShareVolume,
    streamQuality,
    setStreamQuality,
    includeSystemAudio,
    setIncludeSystemAudio,
    theme,
    setTheme,
    minimizeToTray,
    setMinimizeToTray,
    disableGpu,
    setDisableGpu
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'voice' | 'stream' | 'appearance' | 'system' | 'account'>('voice');

  // Device lists
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfoItem[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfoItem[]>([]);

  // Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Load devices
  useEffect(() => {
    if (!isSettingsOpen) return;

    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microfone ${d.deviceId.slice(0, 5)}` }));
        const outputs = devices
          .filter((d) => d.kind === 'audiooutput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Auscultadores ${d.deviceId.slice(0, 5)}` }));

        setAudioInputs(inputs);
        setAudioOutputs(outputs);

        if (!inputDeviceId && inputs.length > 0) {
          setInputDeviceId(inputs[0].deviceId);
        }
        if (!outputDeviceId && outputs.length > 0) {
          setOutputDeviceId(outputs[0].deviceId);
        }
      } catch (err) {
        console.warn('Erro ao listar dispositivos:', err);
      }
    };

    loadDevices();

    // Load system config from Electron if available
    if (window.electronAPI?.getConfig) {
      window.electronAPI.getConfig().then((cfg) => {
        if (cfg) {
          setMinimizeToTray(!!cfg.minimizeToTray);
          setDisableGpu(!!cfg.disableGpu);
        }
      });
    }
  }, [isSettingsOpen]);

  // Handle ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    if (isSettingsOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const testOutputSound = () => {
    sounds.playMessageNotification();
  };

  const handleToggleTray = (enabled: boolean) => {
    setMinimizeToTray(enabled);
    window.electronAPI?.setConfig({ minimizeToTray: enabled });
  };

  const handleToggleGpu = (disabled: boolean) => {
    setDisableGpu(disabled);
    window.electronAPI?.setConfig({ disableGpu: disabled });
  };

  const handleRestartApp = () => {
    window.electronAPI?.restartApp();
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (!currentUser) return;
    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'O novo PIN e a confirmação não coincidem.' });
      return;
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinMessage({ type: 'error', text: 'O novo PIN deve conter entre 4 e 6 números.' });
      return;
    }

    setPinLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/auth/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPin,
          newPin
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPinMessage({ type: 'error', text: data.message || 'Erro ao alterar PIN.' });
      } else {
        setPinMessage({ type: 'success', text: 'PIN alterado com sucesso!' });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      }
    } catch {
      setPinMessage({ type: 'error', text: 'Falha na comunicação com o servidor.' });
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="bg-[#313338] border border-[#232428] rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex overflow-hidden">
        
        {/* Left Tabs Sidebar */}
        <aside className="w-60 bg-[#2b2d31] p-4 flex flex-col justify-between border-r border-[#1f2023] shrink-0">
          <div className="space-y-1">
            <h3 className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">
              Definições do Utilizador
            </h3>

            <button
              onClick={() => setActiveTab('voice')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'voice'
                  ? 'bg-[#404249] text-white font-semibold'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Mic size={18} />
              Voz & Áudio
            </button>

            <button
              onClick={() => setActiveTab('stream')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stream'
                  ? 'bg-[#404249] text-white font-semibold'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Monitor size={18} />
              Transmissão & Ecrã
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-[#404249] text-white font-semibold'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Palette size={18} />
              Aparência & Temas
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'system'
                  ? 'bg-[#404249] text-white font-semibold'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Laptop size={18} />
              Sistema & Windows
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'account'
                  ? 'bg-[#404249] text-white font-semibold'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Lock size={18} />
              Conta & Segurança
            </button>
          </div>

          <div className="px-3 text-[11px] text-[#949ba4]">
            Discord Mini v1.0.0
          </div>
        </aside>

        {/* Right Tab Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#313338] relative overflow-hidden">
          {/* Header Close button */}
          <div className="absolute top-4 right-5 z-10 flex flex-col items-center gap-1">
            <button
              onClick={() => setSettingsOpen(false)}
              className="w-8 h-8 rounded-full border border-[#4e5058] flex items-center justify-center text-[#b5bac1] hover:text-white hover:border-white transition-colors"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
            <span className="text-[10px] text-[#949ba4] font-semibold">ESC</span>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pr-12 space-y-6">
            
            {/* 1. ABA VOZ & ÁUDIO */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Definições de Voz e Áudio</h2>
                  <p className="text-xs text-[#949ba4]">Configura os teus periféricos, calibração de microfone e volumes.</p>
                </div>

                {/* Dispositivos Entrada & Saída */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-[#b5bac1]">Dispositivo de Entrada (Microfone)</label>
                    <select
                      value={inputDeviceId}
                      onChange={(e) => setInputDeviceId(e.target.value)}
                      className="w-full bg-[#1e1f22] border border-[#232428] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                    >
                      {audioInputs.map((dev) => (
                        <option key={dev.deviceId} value={dev.deviceId}>{dev.label}</option>
                      ))}
                      {audioInputs.length === 0 && <option value="">Microfone Padrão do Windows</option>}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase text-[#b5bac1]">Dispositivo de Saída (Auscultadores)</label>
                      <button
                        onClick={testOutputSound}
                        className="text-xs text-[#5865F2] hover:underline flex items-center gap-1"
                      >
                        <Play size={10} /> Testar Som
                      </button>
                    </div>
                    <select
                      value={outputDeviceId}
                      onChange={(e) => setOutputDeviceId(e.target.value)}
                      className="w-full bg-[#1e1f22] border border-[#232428] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                    >
                      {audioOutputs.map((dev) => (
                        <option key={dev.deviceId} value={dev.deviceId}>{dev.label}</option>
                      ))}
                      {audioOutputs.length === 0 && <option value="">Auscultadores Padrão</option>}
                    </select>
                  </div>
                </div>

                {/* Barra de Calibração de Sensibilidade do Microfone */}
                <div className="bg-[#2b2d31] p-4 rounded-lg border border-[#1f2023] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Sensibilidade de Entrada (Gate de Ruído)</h4>
                      <p className="text-xs text-[#949ba4]">Fala ao microfone. Ajusta o slider para a direita para cortar barulho de fundo.</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#5865F2]">
                      {Math.round(micSensitivity * 1000)} / 100
                    </span>
                  </div>

                  {/* Volume Meter Visualizer */}
                  <div className="relative h-4 bg-[#1e1f22] rounded-full overflow-hidden border border-[#18191c]">
                    <div
                      className="h-full bg-gradient-to-r from-[#23a55a] via-[#f0b232] to-[#f23f43] transition-all duration-75"
                      style={{ width: `${Math.min(100, liveMicVolume * 300)}%` }}
                    />
                    {/* Threshold needle indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10"
                      style={{ left: `${Math.min(95, Math.max(5, (micSensitivity / 0.08) * 100))}%` }}
                      title="Limiar de ativação"
                    />
                  </div>

                  <input
                    type="range"
                    min="0.005"
                    max="0.08"
                    step="0.002"
                    value={micSensitivity}
                    onChange={(e) => setMicSensitivity(parseFloat(e.target.value))}
                    className="w-full accent-[#5865F2] cursor-pointer"
                  />
                </div>

                {/* Filtros de Ruído e Eco */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#2b2d31] p-3.5 rounded-lg border border-[#1f2023] flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Supressão de Ruído</h4>
                      <p className="text-[11px] text-[#949ba4]">Filtra cliques de teclado e ventoinhas.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={noiseSuppression}
                      onChange={(e) => setNoiseSuppression(e.target.checked)}
                      className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-[#2b2d31] p-3.5 rounded-lg border border-[#1f2023] flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Cancelamento de Eco</h4>
                      <p className="text-[11px] text-[#949ba4]">Evita retorno do som das tuas colunas.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={echoCancellation}
                      onChange={(e) => setEchoCancellation(e.target.checked)}
                      className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Volume do Ecrã Partilhado */}
                <div className="bg-[#2b2d31] p-4 rounded-lg border border-[#1f2023] space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">Volume do Som do Ecrã dos Amigos</h4>
                    <span className="text-xs font-mono font-bold text-white">{screenShareVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={screenShareVolume}
                    onChange={(e) => setScreenShareVolume(parseInt(e.target.value))}
                    className="w-full accent-[#5865F2] cursor-pointer"
                  />
                </div>

                {/* Volumes Individuais de Participantes */}
                {voiceParticipants.length > 0 && (
                  <div className="bg-[#2b2d31] p-4 rounded-lg border border-[#1f2023] space-y-3">
                    <h4 className="text-sm font-semibold text-white">Volume dos Participantes em Voz (até 200%)</h4>
                    <div className="space-y-3">
                      {voiceParticipants.map((p) => {
                        if (p.userId === currentUser?.id) return null;
                        const vol = userVolumes[p.userId] ?? 100;
                        return (
                          <div key={p.userId} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: p.color }}
                              >
                                {p.username[0]?.toUpperCase()}
                              </div>
                              <span className="text-xs text-white truncate">{p.username}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="200"
                              value={vol}
                              onChange={(e) => setUserVolume(p.userId, parseInt(e.target.value))}
                              className="flex-1 accent-[#5865F2] cursor-pointer"
                            />
                            <span className="text-xs font-mono font-bold text-white w-12 text-right">{vol}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. ABA TRANSMISSÃO & ECRÃ */}
            {activeTab === 'stream' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Qualidade e Transmissão de Ecrã</h2>
                  <p className="text-xs text-[#949ba4]">Configura a resolução padrão e o som de transmissão.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-[#b5bac1]">Qualidade da Transmissão</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: '720p30', label: '720p @ 30fps', desc: 'Poupança de dados (3 Mbps)' },
                      { id: '1080p30', label: '1080p @ 30fps', desc: 'Equilibrado (6 Mbps)' },
                      { id: '1080p60', label: '1080p @ 60fps (Recomendado)', desc: 'Ultra Fluidez & Nitidez (10 Mbps)' },
                      { id: '1440p60', label: '1440p @ 60fps', desc: 'Resolução 2K Máxima (15 Mbps)' }
                    ].map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setStreamQuality(item.id as StreamQuality)}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between ${
                          streamQuality === item.id
                            ? 'bg-[#5865F2]/15 border-[#5865F2] text-white'
                            : 'bg-[#2b2d31] border-[#1f2023] text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-white">{item.label}</div>
                          <div className="text-[11px] mt-0.5">{item.desc}</div>
                        </div>
                        {streamQuality === item.id && <Check size={16} className="text-[#5865F2] shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#2b2d31] p-4 rounded-lg border border-[#1f2023] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Partilhar Áudio do Jogo / Sistema</h4>
                    <p className="text-xs text-[#949ba4]">Transmite o áudio do jogo ou do Windows em direto junto com o ecrã.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeSystemAudio}
                    onChange={(e) => setIncludeSystemAudio(e.target.checked)}
                    className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 3. ABA APARÊNCIA & TEMAS */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Aparência da Aplicação</h2>
                  <p className="text-xs text-[#949ba4]">Escolhe o tema visual que melhor se adapta a ti.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'dark', name: 'Escuro Clássico', desc: 'O visual clássico do Discord Dark.', preview: '#313338' },
                    { id: 'oled', name: 'OLED Black', desc: 'Preto puro (0% luz) para alto contraste.', preview: '#000000' },
                    { id: 'navy', name: 'Midnight Navy', desc: 'Tons azulados escuros e modernos.', preview: '#0f172a' },
                    { id: 'light', name: 'Claro (Light)', desc: 'Tema claro e limpo para ambientes iluminados.', preview: '#ffffff' }
                  ].map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setTheme(t.id as ThemeMode)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-3 ${
                        theme === t.id
                          ? 'border-[#5865F2] shadow-[0_0_12px_rgba(88,101,242,0.3)]'
                          : 'border-[#1f2023] bg-[#2b2d31] hover:border-[#4e5058]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{t.name}</span>
                        {theme === t.id && <Check size={16} className="text-[#5865F2]" />}
                      </div>
                      <div
                        className="h-16 w-full rounded-md border border-white/10 flex items-center justify-center text-xs font-semibold"
                        style={{ backgroundColor: t.preview, color: t.id === 'light' ? '#000' : '#fff' }}
                      >
                        Pré-visualização
                      </div>
                      <p className="text-[11px] text-[#949ba4]">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. ABA SISTEMA & WINDOWS */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Sistema e Windows</h2>
                  <p className="text-xs text-[#949ba4]">Comportamento do executável nativo no Windows.</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#2b2d31] p-4 rounded-lg border border-[#1f2023] flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Minimizar para a Barra de Tarefas (System Tray)</h4>
                      <p className="text-xs text-[#949ba4]">
                        Ao fechar ou minimizar a janela, a app continua ativa junto ao relógio do Windows para não perderes chamadas de voz.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={minimizeToTray}
                      onChange={(e) => handleToggleTray(e.target.checked)}
                      className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-[#2b2d31] p-4 rounded-lg border border-[#1f2023] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Aceleração de Hardware por GPU</h4>
                        <p className="text-xs text-[#949ba4]">
                          Usa a placa gráfica para renderizar o ecrã. Se tiveres lag em jogos, podes desativar.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!disableGpu}
                        onChange={(e) => handleToggleGpu(!e.target.checked)}
                        className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                      />
                    </div>
                    <div className="pt-2 border-t border-[#1f2023] flex items-center justify-between">
                      <span className="text-xs text-[#f0b232]">Requer reinicialização da app para aplicar alterações na GPU.</span>
                      <button
                        onClick={handleRestartApp}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#404249] hover:bg-[#5865F2] text-white rounded text-xs font-semibold transition-colors"
                      >
                        <RotateCcw size={13} /> Reiniciar Agora
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ABA CONTA & SEGURANÇA */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">A Minha Conta & Segurança</h2>
                  <p className="text-xs text-[#949ba4]">Gere o teu PIN de acesso e credenciais privadas.</p>
                </div>

                {currentUser && (
                  <div className="bg-[#2b2d31] p-4 rounded-lg border border-[#1f2023] flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-md"
                      style={{ backgroundColor: currentUser.color }}
                    >
                      {currentUser.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{currentUser.username}</h4>
                      <p className="text-xs text-[#949ba4]">ID: <code className="text-xs text-white">{currentUser.id}</code></p>
                    </div>
                  </div>
                )}

                {/* Formulário Mudar de PIN */}
                <form onSubmit={handleChangePin} className="bg-[#2b2d31] p-5 rounded-lg border border-[#1f2023] space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Alterar PIN de Acesso</h4>

                  {pinMessage && (
                    <div className={`p-3 rounded text-xs flex items-center gap-2 ${
                      pinMessage.type === 'success'
                        ? 'bg-[#23a55a]/20 border border-[#23a55a] text-[#23a55a]'
                        : 'bg-[#f23f43]/20 border border-[#f23f43] text-[#f23f43]'
                    }`}>
                      {pinMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                      <span>{pinMessage.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-[#b5bac1]">PIN Atual</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        required
                        className="w-full bg-[#1e1f22] border border-[#383a40] rounded px-3 py-2 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-[#5865F2]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-[#b5bac1]">Novo PIN (4-6 dígitos)</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        required
                        className="w-full bg-[#1e1f22] border border-[#383a40] rounded px-3 py-2 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-[#5865F2]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-[#b5bac1]">Confirmar Novo PIN</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        required
                        className="w-full bg-[#1e1f22] border border-[#383a40] rounded px-3 py-2 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-[#5865F2]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={pinLoading || !currentPin || !newPin || !confirmPin}
                      className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded text-sm font-semibold transition-colors"
                    >
                      {pinLoading ? 'A guardar...' : 'Guardar Novo PIN'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
