import React, { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  Sparkles,
  Server as ServerIcon,
  Globe
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
    setServerUrl,
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
    setDisableGpu,
    updateUserColor
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'voice' | 'stream' | 'appearance' | 'connection' | 'system' | 'account'>('voice');

  // Staged Settings state
  const [stagedInputDev, setStagedInputDev] = useState(inputDeviceId);
  const [stagedOutputDev, setStagedOutputDev] = useState(outputDeviceId);
  const [stagedNoiseSupp, setStagedNoiseSupp] = useState(noiseSuppression);
  const [stagedEchoCanc, setStagedEchoCanc] = useState(echoCancellation);
  const [stagedSensitivity, setStagedSensitivity] = useState(micSensitivity);
  const [stagedQuality, setStagedQuality] = useState(streamQuality);
  const [stagedIncAudio, setStagedIncAudio] = useState(includeSystemAudio);
  const [stagedTheme, setStagedTheme] = useState(theme);
  const [stagedTray, setStagedTray] = useState(minimizeToTray);
  const [stagedGpu, setStagedGpu] = useState(disableGpu);
  const [stagedUserColor, setStagedUserColor] = useState(currentUser?.color || '#5865F2');
  const [stagedUrl, setStagedUrl] = useState(serverUrl);

  // Device lists
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfoItem[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfoItem[]>([]);

  // Mic test state
  const [isTestingMic, setIsTestingMic] = useState(false);
  const testStreamRef = useRef<MediaStream | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Save feedback state
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Initialize staged state when modal opens
  useEffect(() => {
    if (isSettingsOpen) {
      setStagedInputDev(inputDeviceId);
      setStagedOutputDev(outputDeviceId);
      setStagedNoiseSupp(noiseSuppression);
      setStagedEchoCanc(echoCancellation);
      setStagedSensitivity(micSensitivity);
      setStagedQuality(streamQuality);
      setStagedIncAudio(includeSystemAudio);
      setStagedTheme(theme);
      setStagedTray(minimizeToTray);
      setStagedGpu(disableGpu);
      setStagedUserColor(currentUser?.color || '#5865F2');
      setStagedUrl(serverUrl);
      setSavedSuccess(false);
    }
  }, [isSettingsOpen]);

  // Load hardware devices
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

        if (!stagedInputDev && inputs.length > 0) setStagedInputDev(inputs[0].deviceId);
        if (!stagedOutputDev && outputs.length > 0) setStagedOutputDev(outputs[0].deviceId);
      } catch (err) {
        console.warn('Erro ao listar dispositivos:', err);
      }
    };

    loadDevices();
  }, [isSettingsOpen]);

  // Mic test loopback
  const toggleMicTest = async () => {
    if (isTestingMic) {
      testStreamRef.current?.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
      if (testAudioRef.current) testAudioRef.current.srcObject = null;
      setIsTestingMic(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: stagedInputDev ? { exact: stagedInputDev } : undefined,
            noiseSuppression: stagedNoiseSupp,
            echoCancellation: stagedEchoCanc
          }
        });
        testStreamRef.current = stream;
        if (!testAudioRef.current) {
          testAudioRef.current = new Audio();
        }
        testAudioRef.current.srcObject = stream;
        testAudioRef.current.play();
        setIsTestingMic(true);
      } catch (err) {
        console.error('Falha ao iniciar teste do microfone:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      testStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Apply All Settings
  const handleApplySettings = async () => {
    // 1. Audio
    setInputDeviceId(stagedInputDev);
    setOutputDeviceId(stagedOutputDev);
    setNoiseSuppression(stagedNoiseSupp);
    setEchoCancellation(stagedEchoCanc);
    setMicSensitivity(stagedSensitivity);

    // 2. Stream
    setStreamQuality(stagedQuality);
    setIncludeSystemAudio(stagedIncAudio);

    // 3. Theme
    setTheme(stagedTheme);

    // 4. System (Electron)
    setMinimizeToTray(stagedTray);
    setDisableGpu(stagedGpu);
    if (window.electronAPI?.setConfig) {
      window.electronAPI.setConfig({
        minimizeToTray: stagedTray,
        disableGpu: stagedGpu
      });
    }

    // 5. User Color / Profile
    if (currentUser && stagedUserColor !== currentUser.color) {
      try {
        await fetch(`${serverUrl}/api/users/${currentUser.id}/color`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color: stagedUserColor })
        });
        updateUserColor(currentUser.id, stagedUserColor);
      } catch (err) {
        console.error('Erro ao atualizar cor do utilizador:', err);
      }
    }

    // 6. Server URL
    if (stagedUrl !== serverUrl) {
      setServerUrl(stagedUrl);
      window.location.reload();
    }

    sounds.playMessageNotification();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleRestartApp = () => {
    if (window.electronAPI?.restartApp) {
      window.electronAPI.restartApp();
    } else {
      window.location.reload();
    }
  };

  // Change PIN handler
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'O novo PIN e a confirmação não coincidem.' });
      return;
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      setPinMessage({ type: 'error', text: 'O PIN deve conter entre 4 e 6 dígitos numéricos.' });
      return;
    }

    if (!currentUser) return;

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
        setPinMessage({ type: 'error', text: data.message || 'Erro ao alterar o PIN.' });
      } else {
        setPinMessage({ type: 'success', text: 'PIN alterado com sucesso!' });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      }
    } catch {
      setPinMessage({ type: 'error', text: 'Falha ao ligar ao servidor.' });
    } finally {
      setPinLoading(false);
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="bg-app-primary border border-app-border rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex overflow-hidden relative">
        {/* Left Sidebar navigation */}
        <aside className="w-56 bg-app-tertiary flex flex-col p-4 border-r border-app-border shrink-0 select-none">
          <div className="px-2 pb-4 mb-2 border-b border-app-border">
            <h3 className="font-bold text-app-textHeader text-sm tracking-wide flex items-center gap-1.5">
              Definições
            </h3>
            <span className="text-[11px] text-app-textMuted">A resenha Desktop</span>
          </div>

          <nav className="flex-1 space-y-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('voice')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'voice'
                  ? 'bg-app-hover text-white font-bold'
                  : 'text-app-textMuted hover:bg-app-hover hover:text-app-textNormal'
              }`}
            >
              <Mic size={16} /> Voz & Áudio
            </button>

            <button
              onClick={() => setActiveTab('stream')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'stream'
                  ? 'bg-app-hover text-white font-bold'
                  : 'text-app-textMuted hover:bg-app-hover hover:text-app-textNormal'
              }`}
            >
              <Monitor size={16} /> Transmissão & Ecrã
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-app-hover text-white font-bold'
                  : 'text-app-textMuted hover:bg-app-hover hover:text-app-textNormal'
              }`}
            >
              <Palette size={16} /> Temas & Perfil
            </button>

            <button
              onClick={() => setActiveTab('connection')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'connection'
                  ? 'bg-app-hover text-white font-bold'
                  : 'text-app-textMuted hover:bg-app-hover hover:text-app-textNormal'
              }`}
            >
              <Globe size={16} /> Rede & Servidor
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'system'
                  ? 'bg-app-hover text-white font-bold'
                  : 'text-app-textMuted hover:bg-app-hover hover:text-app-textNormal'
              }`}
            >
              <Laptop size={16} /> Sistema Windows
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'account'
                  ? 'bg-app-hover text-white font-bold'
                  : 'text-app-textMuted hover:bg-app-hover hover:text-app-textNormal'
              }`}
            >
              <Lock size={16} /> Conta & Segurança
            </button>
          </nav>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-app-primary">
          {/* Top header with close button */}
          <div className="h-12 border-b border-app-border px-6 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
              {activeTab === 'voice' && 'Definições de Voz e Áudio'}
              {activeTab === 'stream' && 'Definições de Transmissão'}
              {activeTab === 'appearance' && 'Personalização e Temas'}
              {activeTab === 'connection' && 'Configuração de Servidor'}
              {activeTab === 'system' && 'Definições do Windows'}
              {activeTab === 'account' && 'Segurança da Conta'}
            </span>

            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1.5 rounded-full hover:bg-app-hover text-app-textMuted hover:text-white transition-colors"
              title="Fechar (ESC)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. ABA VOZ & ÁUDIO */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-app-textHeader">Definições de Voz & Microfone</h2>
                  <p className="text-xs text-app-textMuted">Configura a tua captação de som, auscultadores e filtros de ruído.</p>
                </div>

                {/* Dispositivos de Entrada e Saída */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
                      Dispositivo de Entrada (Microfone)
                    </label>
                    <select
                      value={stagedInputDev}
                      onChange={(e) => setStagedInputDev(e.target.value)}
                      className="w-full bg-app-input border border-app-border rounded-lg px-3 py-2 text-sm text-app-textNormal focus:outline-none focus:border-app-accent"
                    >
                      {audioInputs.map((dev) => (
                        <option key={dev.deviceId} value={dev.deviceId}>
                          {dev.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
                      Dispositivo de Saída (Auscultadores)
                    </label>
                    <select
                      value={stagedOutputDev}
                      onChange={(e) => setStagedOutputDev(e.target.value)}
                      className="w-full bg-app-input border border-app-border rounded-lg px-3 py-2 text-sm text-app-textNormal focus:outline-none focus:border-app-accent"
                    >
                      {audioOutputs.map((dev) => (
                        <option key={dev.deviceId} value={dev.deviceId}>
                          {dev.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Teste de Microfone & Medidor ao Vivo */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-app-textHeader">Teste de Microfone</h4>
                      <p className="text-xs text-app-textMuted">Fala para testares o teu microfone e ouvires o teu retorno.</p>
                    </div>
                    <button
                      onClick={toggleMicTest}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-colors ${
                        isTestingMic ? 'bg-[#da373c] text-white' : 'bg-app-accent text-white hover:bg-app-accentHover'
                      }`}
                    >
                      <Play size={12} className={isTestingMic ? 'hidden' : 'block'} />
                      {isTestingMic ? 'Parar Teste' : 'Iniciar Teste'}
                    </button>
                  </div>

                  {/* Barra de volume ao vivo */}
                  <div className="space-y-1">
                    <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-[#23a55a] transition-all duration-75 rounded-full"
                        style={{ width: `${Math.min(100, (isTestingMic ? liveMicVolume : liveMicVolume) * 100 * 2.5)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sensibilidade do Microfone (VAD) */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-app-textHeader">Sensibilidade de Entrada</h4>
                      <p className="text-xs text-app-textMuted">Ajusta o volume necessário para ativar a tua voz no canal.</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-app-accent">{stagedSensitivity}</span>
                  </div>
                  <input
                    type="range"
                    min="0.005"
                    max="0.08"
                    step="0.005"
                    value={stagedSensitivity}
                    onChange={(e) => setStagedSensitivity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#5865F2]"
                  />
                  <div className="flex justify-between text-[10px] text-app-textMuted">
                    <span>Mais sensível</span>
                    <span>Padrão (0.02)</span>
                    <span>Menos sensível</span>
                  </div>
                </div>

                {/* Supressão de Ruído & Cancelamento de Eco */}
                <div className="space-y-3">
                  <div className="bg-app-card p-3.5 rounded-xl border border-app-border flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-app-textHeader">Supressão de Ruído</h4>
                      <p className="text-xs text-app-textMuted">Filtra ruídos de fundo como teclado e vento.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={stagedNoiseSupp}
                      onChange={(e) => setStagedNoiseSupp(e.target.checked)}
                      className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-app-card p-3.5 rounded-xl border border-app-border flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-app-textHeader">Cancelamento de Eco</h4>
                      <p className="text-xs text-app-textMuted">Impede que o áudio dos altifalantes entre de novo no microfone.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={stagedEchoCanc}
                      onChange={(e) => setStagedEchoCanc(e.target.checked)}
                      className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. ABA TRANSMISSÃO & ECRÃ */}
            {activeTab === 'stream' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-app-textHeader">Transmissão de Ecrã & Qualidade</h2>
                  <p className="text-xs text-app-textMuted">Personaliza a resolução, fps e partilha de áudio do sistema/jogo.</p>
                </div>

                {/* Qualidade de Transmissão */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
                    Predefinição de Qualidade (Resolução e Taxa de Quadros)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: '720p30', label: '720p 30fps', desc: 'Leve • Ideal para conexões lentas' },
                      { id: '1080p30', label: '1080p 30fps', desc: 'Full HD • Equilíbrio perfeito' },
                      { id: '1080p60', label: '1080p 60fps', desc: 'Ultra Fluido • Perfeito para jogos' },
                      { id: '1440p60', label: '1440p 60fps (2K)', desc: 'Qualidade Máxima • Alto desempenho' }
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setStagedQuality(preset.id as StreamQuality)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          stagedQuality === preset.id
                            ? 'border-app-accent bg-app-accent/10 shadow'
                            : 'border-app-border bg-app-card hover:bg-app-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-app-textHeader">{preset.label}</span>
                          {stagedQuality === preset.id && <Check size={16} className="text-app-accent" />}
                        </div>
                        <p className="text-xs text-app-textMuted mt-1">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Áudio do Sistema / Jogo */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-app-textHeader">Partilha de Áudio do Jogo / Sistema</h4>
                    <p className="text-xs text-app-textMuted">
                      Captura o som de jogos, músicas e vídeos do teu computador durante a partilha de ecrã.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={stagedIncAudio}
                    onChange={(e) => setStagedIncAudio(e.target.checked)}
                    className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 3. ABA TEMAS & PERFIL */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-app-textHeader">Temas & Personalização de Perfil</h2>
                  <p className="text-xs text-app-textMuted">Escolhe o teu tema visual favorito e personaliza a cor do teu avatar.</p>
                </div>

                {/* Seleção de Temas */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
                    Tema da Aplicação
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'dark', name: 'Escuro Clássico', desc: 'Aparência familiar inspirada no Discord', bg: '#313338' },
                      { id: 'oled', name: 'OLED Preto Puro', desc: 'Preto absoluto (#000000) e alto contraste', bg: '#000000' },
                      { id: 'navy', name: 'Midnight Navy', desc: 'Tons de azul espacial profundo', bg: '#090d16' },
                      { id: 'light', name: 'Claro Limpo', desc: 'Fundo branco nítido para ambientes luminosos', bg: '#f2f3f5' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setStagedTheme(t.id as ThemeMode);
                          document.documentElement.setAttribute('data-theme', t.id);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          stagedTheme === t.id
                            ? 'border-app-accent bg-app-accent/10 shadow'
                            : 'border-app-border bg-app-card hover:bg-app-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: t.bg }} />
                            <span className="text-sm font-bold text-app-textHeader">{t.name}</span>
                          </div>
                          {stagedTheme === t.id && <Check size={16} className="text-app-accent" />}
                        </div>
                        <p className="text-xs text-app-textMuted mt-1">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cor do Perfil & Modo Arco-Íris */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-app-textHeader">Cor do Perfil & Avatar</h4>
                    <p className="text-xs text-app-textMuted">Define como o teu avatar e o teu nome aparecem para os teus amigos.</p>
                  </div>

                  {/* Preview do Avatar */}
                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md ${
                        stagedUserColor === 'rainbow' ? 'avatar-rainbow' : ''
                      }`}
                      style={stagedUserColor !== 'rainbow' ? { backgroundColor: stagedUserColor } : {}}
                    >
                      {currentUser?.username[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <span className={`text-sm font-bold text-app-textHeader ${stagedUserColor === 'rainbow' ? 'text-rainbow' : ''}`}>
                        {currentUser?.username || 'Utilizador'}
                      </span>
                      <p className="text-xs text-app-textMuted">
                        {stagedUserColor === 'rainbow' ? '🌈 Modo Arco-Íris RGB Ativado' : `Cor: ${stagedUserColor}`}
                      </p>
                    </div>
                  </div>

                  {/* Paleta rápida + Botão Arco-Íris */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
                      Escolher Cor ou Efeito
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        '#5865F2', '#23a55a', '#f23f43', '#f0b232', '#00ccff', '#9b59b6', '#e91e63', '#e67e22'
                      ].map((hex) => (
                        <button
                          key={hex}
                          onClick={() => setStagedUserColor(hex)}
                          className={`w-8 h-8 rounded-full transition-transform hover:scale-110 shadow ${
                            stagedUserColor === hex ? 'ring-2 ring-white scale-110' : ''
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}

                      {/* Seletor HEX Livre */}
                      <input
                        type="color"
                        value={stagedUserColor !== 'rainbow' ? stagedUserColor : '#5865F2'}
                        onChange={(e) => setStagedUserColor(e.target.value)}
                        className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0"
                        title="Cor personalizada"
                      />

                      {/* Botão Especial Arco-Íris */}
                      <button
                        onClick={() => setStagedUserColor('rainbow')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow transition-all ${
                          stagedUserColor === 'rainbow'
                            ? 'ring-2 ring-white scale-105 avatar-rainbow'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                        title="Ativar Efeito Arco-Íris RGB"
                      >
                        <Sparkles size={14} className="text-yellow-300 animate-spin" />
                        <span>🌈 Efeito Arco-Íris (RGB)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ABA REDE & SERVIDOR (LITE vs HOST) */}
            {activeTab === 'connection' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-app-textHeader">Rede & Servidor de Conexão</h2>
                  <p className="text-xs text-app-textMuted">
                    Escolhe onde a aplicação se conecta (Nuvem Render.com ou Servidor Local Host).
                  </p>
                </div>

                <div className="space-y-3">
                  <div
                    onClick={() => setStagedUrl('https://projeto-discord-2-0.onrender.com')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      stagedUrl === 'https://projeto-discord-2-0.onrender.com'
                        ? 'border-app-accent bg-app-accent/10 shadow'
                        : 'border-app-border bg-app-card hover:bg-app-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={18} className="text-blue-400" />
                        <h4 className="text-sm font-bold text-app-textHeader">Modo Nuvem (Versão Lite - Render.com)</h4>
                      </div>
                      {stagedUrl === 'https://projeto-discord-2-0.onrender.com' && <Check size={16} className="text-app-accent" />}
                    </div>
                    <p className="text-xs text-app-textMuted mt-1">
                      Conecta-se ao servidor na nuvem sem precisar de executar nada no teu computador.
                    </p>
                    <code className="text-[11px] text-app-accent block mt-1">https://projeto-discord-2-0.onrender.com</code>
                  </div>

                  <div
                    onClick={() => setStagedUrl('http://localhost:3001')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      stagedUrl === 'http://localhost:3001'
                        ? 'border-app-accent bg-app-accent/10 shadow'
                        : 'border-app-border bg-app-card hover:bg-app-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ServerIcon size={18} className="text-green-400" />
                        <h4 className="text-sm font-bold text-app-textHeader">Modo Host Local (Versão Normal)</h4>
                      </div>
                      {stagedUrl === 'http://localhost:3001' && <Check size={16} className="text-app-accent" />}
                    </div>
                    <p className="text-xs text-app-textMuted mt-1">
                      Conecta-se ao teu servidor local rodando no teu próprio PC para máxima velocidade e zero limites.
                    </p>
                    <code className="text-[11px] text-app-accent block mt-1">http://localhost:3001</code>
                  </div>

                  {/* URL Personalizada */}
                  <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
                      Endereço Personalizado (IP do Amigo ou Domínio)
                    </label>
                    <input
                      type="text"
                      value={stagedUrl}
                      onChange={(e) => setStagedUrl(e.target.value)}
                      placeholder="http://192.168.1.100:3001"
                      className="w-full bg-app-input border border-app-border rounded-lg px-3 py-2 text-sm text-app-textNormal font-mono focus:outline-none focus:border-app-accent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. ABA SISTEMA WINDOWS */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-app-textHeader">Integração do Sistema Windows</h2>
                  <p className="text-xs text-app-textMuted">Comportamento nativo na barra de tarefas e desempenho da placa gráfica.</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-app-card p-4 rounded-xl border border-app-border flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-app-textHeader">Minimizar para a Área de Notificação (Tray)</h4>
                      <p className="text-xs text-app-textMuted">
                        Ao clicar no 'X', a aplicação continua em execução na bandeja do Windows ao pé do relógio.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={stagedTray}
                      onChange={(e) => setStagedTray(e.target.checked)}
                      className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-app-textHeader">Aceleração de Hardware por GPU</h4>
                        <p className="text-xs text-app-textMuted">
                          Usa a placa gráfica para renderizar a interface.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!stagedGpu}
                        onChange={(e) => setStagedGpu(!e.target.checked)}
                        className="w-4 h-4 accent-[#5865F2] rounded cursor-pointer"
                      />
                    </div>
                    <div className="pt-2 border-t border-app-border flex items-center justify-between">
                      <span className="text-xs text-[#f0b232]">Requer reinício da app após aplicar.</span>
                      <button
                        onClick={handleRestartApp}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-app-hover hover:bg-app-accent text-white rounded text-xs font-semibold transition-colors"
                      >
                        <RotateCcw size={13} /> Reiniciar Agora
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ABA CONTA & SEGURANÇA */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-app-textHeader">A Minha Conta & Segurança</h2>
                  <p className="text-xs text-app-textMuted">Gere o teu PIN de acesso e credenciais privadas.</p>
                </div>

                {currentUser && (
                  <div className="bg-app-card p-4 rounded-xl border border-app-border flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-md ${
                        currentUser.color === 'rainbow' ? 'avatar-rainbow' : ''
                      }`}
                      style={currentUser.color !== 'rainbow' ? { backgroundColor: currentUser.color } : {}}
                    >
                      {currentUser.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className={`text-base font-bold text-app-textHeader ${currentUser.color === 'rainbow' ? 'text-rainbow' : ''}`}>
                        {currentUser.username}
                      </h4>
                      <p className="text-xs text-app-textMuted">ID: <code className="text-xs text-app-accent">{currentUser.id}</code></p>
                    </div>
                  </div>
                )}

                {/* Formulário Mudar de PIN */}
                <form onSubmit={handleChangePin} className="bg-app-card p-5 rounded-xl border border-app-border space-y-4">
                  <h4 className="text-sm font-bold text-app-textHeader uppercase tracking-wider">Alterar PIN de Acesso</h4>

                  {pinMessage && (
                    <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
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
                      <label className="text-[11px] font-bold uppercase text-app-textMuted">PIN Atual</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        required
                        className="w-full bg-app-input border border-app-border rounded-lg px-3 py-2 text-sm text-app-textNormal font-mono tracking-widest focus:outline-none focus:border-app-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-app-textMuted">Novo PIN (4-6 dígitos)</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        required
                        className="w-full bg-app-input border border-app-border rounded-lg px-3 py-2 text-sm text-app-textNormal font-mono tracking-widest focus:outline-none focus:border-app-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-app-textMuted">Confirmar Novo PIN</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        required
                        className="w-full bg-app-input border border-app-border rounded-lg px-3 py-2 text-sm text-app-textNormal font-mono tracking-widest focus:outline-none focus:border-app-accent"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={pinLoading || !currentPin || !newPin || !confirmPin}
                      className="px-4 py-2 bg-app-accent hover:bg-app-accentHover disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      {pinLoading ? 'A guardar...' : 'Guardar Novo PIN'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Bottom Action Footer with "APLICAR" Button */}
          <div className="h-16 border-t border-app-border px-6 flex items-center justify-between bg-app-tertiary shrink-0">
            <div className="flex items-center gap-2">
              {savedSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-[#23a55a] font-semibold animate-in fade-in">
                  <Check size={16} />
                  <span>Definições aplicadas com sucesso!</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setStagedTheme(theme);
                  document.documentElement.setAttribute('data-theme', theme);
                  setStagedInputDev(inputDeviceId);
                  setStagedOutputDev(outputDeviceId);
                  setStagedNoiseSupp(noiseSuppression);
                  setStagedEchoCanc(echoCancellation);
                  setStagedSensitivity(micSensitivity);
                  setStagedQuality(streamQuality);
                  setStagedIncAudio(includeSystemAudio);
                  setStagedTray(minimizeToTray);
                  setStagedGpu(disableGpu);
                  setStagedUserColor(currentUser?.color || '#5865F2');
                  setStagedUrl(serverUrl);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-app-textMuted hover:text-white hover:bg-app-hover transition-colors"
              >
                Repor
              </button>

              <button
                onClick={handleApplySettings}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-app-accent hover:bg-app-accentHover shadow-md transition-all active:scale-95"
              >
                <Check size={15} />
                <span>Aplicar Alterações</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
