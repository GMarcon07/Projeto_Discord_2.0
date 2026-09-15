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
  Square,
  RotateCcw,
  Server as ServerIcon,
  Globe,
  Upload,
  Trash2,
  FolderOpen,
  Database,
  RefreshCw,
  Power,
  PowerOff,
  Copy,
  ExternalLink,
  HardDrive,
  ShieldCheck,
  Radio
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
    setCurrentUser,
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
    updateUserColor,
    updateUserAvatar
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'voice' | 'stream' | 'appearance' | 'connection' | 'system' | 'account' | 'host'>('voice');

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

  // Mic test & Live meter state with Gating
  const [isTestingMic, setIsTestingMic] = useState(false);
  const isTestingMicRef = useRef(isTestingMic);
  useEffect(() => {
    isTestingMicRef.current = isTestingMic;
  }, [isTestingMic]);

  const stagedSensitivityRef = useRef(stagedSensitivity);
  useEffect(() => {
    stagedSensitivityRef.current = stagedSensitivity;
  }, [stagedSensitivity]);

  const [micVolume, setMicVolume] = useState(0);
  const testStreamRef = useRef<MediaStream | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const micAnimRef = useRef<number | null>(null);

  // Output test audio state
  const [isPlayingOutputTest, setIsPlayingOutputTest] = useState(false);

  // Host Server Management State
  const [hostStatus, setHostStatus] = useState<{
    status: string;
    uptimeSeconds: number;
    port: number;
    databasePath: string;
    uploadsPath: string;
    uploadsSizeBytes: number;
    fileCount: number;
    userCount: number;
    msgCount: number;
    channelCount: number;
    maxUploadMB: number;
  } | null>(null);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostActionMsg, setHostActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [networkIps, setNetworkIps] = useState<Array<{ name: string; address: string; family: string }>>([]);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Stop live meter and loopback
  const stopLiveMicMeter = () => {
    if (micAnimRef.current) {
      cancelAnimationFrame(micAnimRef.current);
      micAnimRef.current = null;
    }
    if (micGainRef.current) {
      try { micGainRef.current.disconnect(); } catch {}
      micGainRef.current = null;
    }
    if (micAnalyserRef.current) {
      try { micAnalyserRef.current.disconnect(); } catch {}
      micAnalyserRef.current = null;
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    if (micContextRef.current) {
      micContextRef.current.close().catch(() => {});
      micContextRef.current = null;
    }
    if (testAudioRef.current) {
      testAudioRef.current.srcObject = null;
      testAudioRef.current.pause();
    }
    setMicVolume(0);
    setIsTestingMic(false);
  };

  // Start live meter for mic with sensitivity gating
  const startLiveMicMeter = async (deviceId?: string) => {
    stopLiveMicMeter();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          noiseSuppression: stagedNoiseSupp,
          echoCancellation: stagedEchoCanc,
          autoGainControl: true
        }
      });
      testStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      micContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.25;
      micAnalyserRef.current = analyser;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      micGainRef.current = gain;

      // Connect: source -> analyser -> gain -> MediaStreamDestination -> testAudioEl
      source.connect(analyser);
      analyser.connect(gain);

      const dest = ctx.createMediaStreamDestination();
      gain.connect(dest);

      if (!testAudioRef.current) {
        testAudioRef.current = new Audio();
        testAudioRef.current.autoplay = true;
      }
      testAudioRef.current.srcObject = dest.stream;

      if ((testAudioRef.current as any).setSinkId && stagedOutputDev) {
        try {
          await (testAudioRef.current as any).setSinkId(stagedOutputDev);
        } catch (e) {
          console.warn('setSinkId no retorno falhou:', e);
        }
      }
      testAudioRef.current.play().catch(() => {});

      const buffer = new Float32Array(analyser.fftSize);
      const updateLevel = () => {
        if (!micAnalyserRef.current || !micContextRef.current) return;
        micAnalyserRef.current.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);
        setMicVolume(rms);

        // Real-time audio gating according to stagedSensitivity and echo/noise suppression
        if (micGainRef.current && micContextRef.current) {
          const now = micContextRef.current.currentTime;
          if (isTestingMicRef.current) {
            if (rms >= stagedSensitivityRef.current) {
              // Voice is above dB threshold -> open audio gate smoothly
              micGainRef.current.gain.setTargetAtTime(1.0, now, 0.015);
            } else {
              // Voice is below dB threshold -> cut audio cleanly
              micGainRef.current.gain.setTargetAtTime(0.0, now, 0.04);
            }
          } else {
            micGainRef.current.gain.setTargetAtTime(0.0, now, 0.02);
          }
        }

        micAnimRef.current = requestAnimationFrame(updateLevel);
      };
      micAnimRef.current = requestAnimationFrame(updateLevel);
    } catch (err) {
      console.warn('Erro ao ler microfone para medidor:', err);
    }
  };

  useEffect(() => {
    if (isSettingsOpen && activeTab === 'voice') {
      startLiveMicMeter(stagedInputDev);
    } else {
      stopLiveMicMeter();
    }
    return () => {
      stopLiveMicMeter();
    };
  }, [isSettingsOpen, activeTab, stagedInputDev]);

  // Update output device on the live test audio element if user switches
  useEffect(() => {
    if (testAudioRef.current && (testAudioRef.current as any).setSinkId && stagedOutputDev) {
      (testAudioRef.current as any).setSinkId(stagedOutputDev).catch(() => {});
    }
  }, [stagedOutputDev]);

  // Mic test loopback toggle (listen to own voice with gate and filters)
  const toggleMicTest = async () => {
    if (isTestingMic) {
      setIsTestingMic(false);
    } else {
      if (!micContextRef.current) {
        await startLiveMicMeter(stagedInputDev);
      }
      setIsTestingMic(true);
    }
  };

  // Host info loader
  const fetchHostInfo = async () => {
    setHostLoading(true);
    try {
      const targetUrl = serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')
        ? serverUrl
        : 'http://localhost:3001';

      const res = await fetch(`${targetUrl}/api/server/host-info`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        setHostStatus(data);
      } else {
        setHostStatus(null);
      }
    } catch {
      setHostStatus(null);
    } finally {
      setHostLoading(false);
    }

    if (window.electronAPI?.getNetworkIps) {
      try {
        const ips = await window.electronAPI.getNetworkIps();
        setNetworkIps(ips);
      } catch (err) {
        console.warn('Erro ao obter IPs de rede:', err);
      }
    }
  };

  useEffect(() => {
    if (isSettingsOpen && activeTab === 'host') {
      fetchHostInfo();
    }
  }, [isSettingsOpen, activeTab]);

  const handleStartHostServer = async () => {
    setHostActionMsg(null);
    if (window.electronAPI?.controlLocalServer) {
      const res = await window.electronAPI.controlLocalServer('start', 3001);
      if (res.success) {
        setHostActionMsg({ type: 'success', text: 'Servidor iniciado com sucesso! A ligar...' });
        setTimeout(() => fetchHostInfo(), 2000);
      } else {
        setHostActionMsg({ type: 'error', text: res.message || 'Falha ao iniciar servidor.' });
      }
    }
  };

  const handleStopHostServer = async () => {
    setHostActionMsg(null);
    if (window.electronAPI?.controlLocalServer) {
      await window.electronAPI.controlLocalServer('stop', 3001);
      setHostActionMsg({ type: 'success', text: 'Servidor local encerrado.' });
      setHostStatus(null);
    }
  };

  const handleRestartHostServer = async () => {
    setHostActionMsg(null);
    if (window.electronAPI?.controlLocalServer) {
      await window.electronAPI.controlLocalServer('restart', 3001);
      setHostActionMsg({ type: 'success', text: 'Servidor reiniciado.' });
      setTimeout(() => fetchHostInfo(), 2000);
    }
  };

  const handleConnectToLocalHost = () => {
    setStagedUrl('http://localhost:3001');
    setServerUrl('http://localhost:3001');
    setHostActionMsg({ type: 'success', text: 'Conectado a http://localhost:3001!' });
  };

  const handleOpenFolder = (folder: string) => {
    if (window.electronAPI?.openFolder) {
      window.electronAPI.openFolder(folder);
    }
  };

  const handleClearUploads = async () => {
    if (!confirm('Tens a certeza que queres limpar os ficheiros de uploads antigos?')) return;
    try {
      const res = await fetch(`${serverUrl}/api/server/clear-uploads`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setHostActionMsg({ type: 'success', text: 'Ficheiros de uploads limpos!' });
        fetchHostInfo();
      }
    } catch {
      setHostActionMsg({ type: 'error', text: 'Falha ao comunicar com o servidor.' });
    }
  };

  const handleBackupDatabase = async () => {
    if (window.electronAPI?.backupDatabase) {
      const res = await window.electronAPI.backupDatabase();
      if (res.success) {
        setHostActionMsg({ type: 'success', text: `Backup criado com sucesso em: ${res.backupPath}` });
      } else {
        setHostActionMsg({ type: 'error', text: res.error || 'Erro ao criar backup.' });
      }
    }
  };

  const handleCopyIp = (ip: string) => {
    const fullUrl = `http://${ip}:3001`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedIp(fullUrl);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Test output device sound (play two-tone chime)
  const handleTestOutputDevice = async () => {
    if (isPlayingOutputTest) return;
    setIsPlayingOutputTest(true);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      if ((ctx as any).setSinkId && stagedOutputDev) {
        try {
          await (ctx as any).setSinkId(stagedOutputDev);
        } catch (e) {
          console.warn('setSinkId no AudioContext falhou:', e);
        }
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15); // A5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.2);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.6);

      setTimeout(() => {
        setIsPlayingOutputTest(false);
        ctx.close();
      }, 700);
    } catch (err) {
      console.error('Erro ao testar som de saída:', err);
      setIsPlayingOutputTest(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleciona um ficheiro de imagem (PNG, JPG, GIF ou WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 15MB.');
      return;
    }

    setAvatarUploading(true);
    setAvatarSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${serverUrl}/api/users/${currentUser.id}/avatar`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        updateUserAvatar(currentUser.id, data.avatarUrl);
        setAvatarSuccess(true);
        setTimeout(() => setAvatarSuccess(false), 3000);
      } else {
        alert(data.message || 'Erro ao carregar foto de perfil.');
      }
    } catch (err) {
      console.error('Erro no upload de avatar:', err);
      alert('Falha na comunicação com o servidor para enviar a foto.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser) return;
    try {
      await fetch(`${serverUrl}/api/users/${currentUser.id}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: '' })
      });
      updateUserAvatar(currentUser.id, '');
    } catch (err) {
      console.error('Erro ao remover avatar:', err);
    }
  };

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
            <h3 className="font-bold text-app-textHeader text-sm tracking-wide flex items-center justify-between">
              <span>Definições</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-app-accent/20 text-app-accent rounded font-mono font-bold">v2.0.0</span>
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

            <button
              onClick={() => setActiveTab('host')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'host'
                  ? 'bg-app-hover text-white font-bold'
                  : 'text-app-textMuted hover:bg-app-hover hover:text-app-textNormal'
              }`}
            >
              <ServerIcon size={16} className="text-[#23a55a]" /> Servidor Host Local
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
              {activeTab === 'connection' && 'Rede e Servidor'}
              {activeTab === 'system' && 'Sistema e Desempenho'}
              {activeTab === 'account' && 'A Minha Conta e Segurança'}
              {activeTab === 'host' && 'Configurações de Servidor Host Local'}
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
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
                        Dispositivo de Saída (Auscultadores)
                      </label>
                      <button
                        type="button"
                        onClick={handleTestOutputDevice}
                        disabled={isPlayingOutputTest}
                        className="flex items-center gap-1 text-[11px] font-semibold text-app-accent hover:underline disabled:opacity-50 transition-colors"
                      >
                        <Volume2 size={13} className={isPlayingOutputTest ? 'animate-bounce text-green-400' : ''} />
                        <span>{isPlayingOutputTest ? 'A reproduzir...' : 'Testar Áudio'}</span>
                      </button>
                    </div>
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

                {/* Teste de Microfone & Retorno com Corte de Sensibilidade */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-app-textHeader flex items-center gap-2">
                        <span>Retorno de Microfone (Ouvir a Minha Voz)</span>
                        {isTestingMic && (
                          <span className="text-[10px] bg-[#23a55a]/20 text-[#23a55a] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            RETORNO ATIVO
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-app-textMuted">
                        Ouve o teu microfone nos auscultadores com o limite de corte (gate), supressão de ruído e cancelamento de eco ativos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleMicTest}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow transition-all ${
                        isTestingMic ? 'bg-[#da373c] text-white' : 'bg-app-accent text-white hover:bg-app-accentHover'
                      }`}
                    >
                      {isTestingMic ? <Square size={13} fill="white" /> : <Play size={13} fill="white" />}
                      {isTestingMic ? 'Parar Retorno' : 'Ouvir a Minha Voz'}
                    </button>
                  </div>

                  {/* Barra de volume ao vivo com indicador de corte de sensibilidade */}
                  <div className="space-y-1.5">
                    <div className="relative w-full h-4 bg-black/50 rounded-full overflow-hidden border border-white/10">
                      {/* Live level fill */}
                      <div
                        className={`h-full transition-all duration-75 rounded-full ${
                          micVolume >= stagedSensitivity ? 'bg-[#23a55a] shadow-[0_0_12px_#23a55a]' : 'bg-[#23a55a]/50'
                        }`}
                        style={{ width: `${Math.min(100, micVolume * 100 * 3.5)}%` }}
                      />

                      {/* Sensitivity Cutoff Line Marker */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_5px_white] z-10"
                        style={{ left: `${Math.min(100, stagedSensitivity * 100 * 3.5)}%` }}
                        title={`Limite de ativação: ${stagedSensitivity}`}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-app-textMuted">
                      <span>Silêncio</span>
                      <span className={`font-semibold ${micVolume >= stagedSensitivity ? 'text-[#23a55a]' : 'text-app-textMuted'}`}>
                        {micVolume >= stagedSensitivity ? '🟢 Som Ativo (A transmitir voz)' : '⚪ Som Cortado (Abaixo do limite de dB)'}
                      </span>
                      <span>Máximo</span>
                    </div>

                    {isTestingMic && (
                      <p className="text-[11px] text-[#f0b232] bg-[#f0b232]/10 border border-[#f0b232]/20 rounded-lg p-2 mt-1">
                        🎧 <strong>Aviso:</strong> Certifica-te de que estás a usar auscultadores para evitar feedback/eco no retorno.
                      </p>
                    )}
                  </div>
                </div>

                {/* Sensibilidade do Microfone (VAD) */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-app-textHeader">Sensibilidade de Entrada</h4>
                      <p className="text-xs text-app-textMuted">Ajusta a linha branca acima para definir o volume mínimo que ativa o microfone.</p>
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

                {/* Foto de Perfil & Cor do Perfil */}
                <div className="bg-app-card p-5 rounded-xl border border-app-border space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-app-textHeader">Foto de Perfil & Avatar</h4>
                    <p className="text-xs text-app-textMuted">Carrega uma foto de perfil ou personaliza a cor da tua bolha.</p>
                  </div>

                  {/* Preview do Avatar com botão de upload */}
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="relative group shrink-0">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl text-white shadow-lg overflow-hidden ring-2 ring-white/10"
                        style={{ backgroundColor: stagedUserColor }}
                      >
                        {currentUser?.avatarUrl ? (
                          <img
                            src={currentUser.avatarUrl.startsWith('http') ? currentUser.avatarUrl : `${serverUrl}${currentUser.avatarUrl}`}
                            alt={currentUser.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          currentUser?.username[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <span className="text-sm font-bold text-app-textHeader">
                          {currentUser?.username || 'Utilizador'}
                        </span>
                        <p className="text-xs text-app-textMuted">
                          {currentUser?.avatarUrl ? 'Foto de perfil ativa' : `Cor do avatar: ${stagedUserColor}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleAvatarUpload}
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-app-accent hover:bg-app-accentHover disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
                        >
                          <Upload size={13} />
                          <span>{avatarUploading ? 'A enviar...' : 'Carregar Foto de Perfil'}</span>
                        </button>

                        {currentUser?.avatarUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg text-xs font-semibold transition-colors"
                            title="Remover foto de perfil"
                          >
                            <Trash2 size={13} />
                            <span>Remover Foto</span>
                          </button>
                        )}
                      </div>

                      {avatarSuccess && (
                        <p className="text-xs text-[#23a55a] font-semibold flex items-center gap-1 animate-in fade-in">
                          <Check size={14} /> Foto de perfil atualizada com sucesso!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Seletor de Cores de Perfil (Conforme print com espectro e RGB/HEX) */}
                  <div className="space-y-3 pt-3 border-t border-app-border">
                    <label className="text-xs font-bold uppercase tracking-wider text-app-textMuted">
                      Cor do Perfil & Identificação
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                      {[
                        '#5865F2', '#23a55a', '#f23f43', '#f0b232', '#00ccff', '#9b59b6', '#e91e63', '#e67e22', '#546e7a', '#2c3e50'
                      ].map((hex) => (
                        <button
                          key={hex}
                          onClick={() => setStagedUserColor(hex)}
                          className={`w-8 h-8 rounded-full transition-transform hover:scale-110 shadow ${
                            stagedUserColor.toLowerCase() === hex.toLowerCase() ? 'ring-2 ring-white scale-110' : ''
                          }`}
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}

                      {/* Seletor Customizado com Espectro / Slider / RGB (Print 2) */}
                      <label
                        className="flex items-center gap-2.5 px-3 py-1.5 bg-app-input hover:bg-app-hover border border-app-border rounded-xl cursor-pointer transition-colors shadow-sm"
                        title="Abrir Seletor com Espectro e RGB"
                      >
                        <input
                          type="color"
                          value={stagedUserColor.startsWith('#') ? stagedUserColor : '#5865F2'}
                          onChange={(e) => setStagedUserColor(e.target.value)}
                          className="w-6 h-6 rounded-md cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-xs font-mono font-bold text-app-textHeader uppercase">
                          {stagedUserColor}
                        </span>
                        <span className="text-[10px] text-app-textMuted bg-white/5 px-1.5 py-0.5 rounded">
                          RGB / HEX
                        </span>
                      </label>
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
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.username}
                        className="w-14 h-14 rounded-full object-cover shadow-md"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-md"
                        style={{ backgroundColor: currentUser.color || '#5865F2' }}
                      >
                        {currentUser.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-bold text-app-textHeader">
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

            {/* TAB: SERVIDOR HOST LOCAL */}
            {activeTab === 'host' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-app-textHeader flex items-center gap-2">
                    <ServerIcon className="text-[#23a55a]" size={22} />
                    <span>Servidor Host Local (Criar & Gerir Servidor no PC)</span>
                  </h2>
                  <p className="text-xs text-app-textMuted">
                    Tudo o que precisas para hospedar o teu próprio servidor d'A resenha no teu PC e jogar com amigos.
                  </p>
                </div>

                {hostActionMsg && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    hostActionMsg.type === 'success' ? 'bg-[#23a55a]/15 text-[#23a55a] border border-[#23a55a]/30' : 'bg-[#da373c]/15 text-[#f23f43] border border-[#da373c]/30'
                  }`}>
                    <AlertCircle size={15} />
                    <span>{hostActionMsg.text}</span>
                  </div>
                )}

                {/* Status Card */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full ${hostStatus ? 'bg-[#23a55a] shadow-[0_0_10px_#23a55a]' : 'bg-[#da373c]'}`} />
                      <div>
                        <h4 className="text-sm font-bold text-app-textHeader">
                          {hostStatus ? 'Servidor Local Ativo' : 'Servidor Local Inativo ou Inacessível'}
                        </h4>
                        <p className="text-xs text-app-textMuted">
                          {hostStatus ? `Em execução na porta ${hostStatus.port} • Uptime: ${formatUptime(hostStatus.uptimeSeconds)}` : 'Clica abaixo para iniciar o servidor local neste PC.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={fetchHostInfo}
                      disabled={hostLoading}
                      className="p-1.5 rounded-lg bg-app-tertiary hover:bg-app-hover text-app-textMuted hover:text-white transition-colors"
                      title="Atualizar Estado"
                    >
                      <RefreshCw size={14} className={hostLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-app-border/40">
                    <button
                      type="button"
                      onClick={handleStartHostServer}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#23a55a] hover:bg-[#1f934f] text-white rounded-lg text-xs font-semibold shadow transition-all"
                    >
                      <Power size={13} />
                      <span>Iniciar Servidor Local</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRestartHostServer}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-app-tertiary hover:bg-app-hover text-app-textNormal rounded-lg text-xs font-semibold transition-colors"
                    >
                      <RefreshCw size={13} />
                      <span>Reiniciar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStopHostServer}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#da373c]/20 hover:bg-[#da373c]/30 text-[#f23f43] rounded-lg text-xs font-semibold transition-colors"
                    >
                      <PowerOff size={13} />
                      <span>Parar Servidor</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConnectToLocalHost}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-app-accent hover:bg-app-accentHover text-white rounded-lg text-xs font-semibold shadow ml-auto transition-colors"
                    >
                      <Globe size={13} />
                      <span>Ligar App a Localhost</span>
                    </button>
                  </div>
                </div>

                {/* Conexão para Amigos (IPs da Rede) */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-app-textHeader flex items-center gap-2">
                      <Radio size={16} className="text-[#23a55a]" />
                      <span>Endereços de Conexão para Amigos</span>
                    </h4>
                    <p className="text-xs text-app-textMuted">
                      Partilha estes endereços com quem quiser entrar no teu servidor:
                    </p>
                  </div>

                  <div className="space-y-2">
                    {/* Localhost (Este PC) */}
                    <div className="flex items-center justify-between p-2.5 bg-app-tertiary rounded-lg border border-app-border/40">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-app-accent tracking-wider">Este Computador</span>
                        <p className="font-mono text-xs font-bold text-white">http://localhost:3001</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyIp('localhost')}
                        className="px-2.5 py-1 text-xs bg-app-card hover:bg-app-hover border border-app-border rounded text-white flex items-center gap-1 transition-colors"
                      >
                        {copiedIp === 'http://localhost:3001' ? <Check size={12} className="text-[#23a55a]" /> : <Copy size={12} />}
                        <span>{copiedIp === 'http://localhost:3001' ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    {/* IPs de Rede Local (Wi-Fi / LAN) */}
                    {networkIps.map((net) => {
                      const url = `http://${net.address}:3001`;
                      const isCopied = copiedIp === url;
                      return (
                        <div key={net.address} className="flex items-center justify-between p-2.5 bg-app-tertiary rounded-lg border border-app-border/40">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-[#23a55a] tracking-wider">
                              Rede Wi-Fi / Cabo ({net.name})
                            </span>
                            <p className="font-mono text-xs font-bold text-white">{url}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyIp(net.address)}
                            className="px-2.5 py-1 text-xs bg-[#23a55a]/20 hover:bg-[#23a55a]/30 text-[#23a55a] rounded font-semibold flex items-center gap-1 transition-colors"
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{isCopied ? 'Copiado!' : 'Copiar para Amigos'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Como jogar com amigos pela Internet (Fora de casa) */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-3">
                  <h4 className="text-sm font-bold text-app-textHeader flex items-center gap-2">
                    <Globe size={16} className="text-app-accent" />
                    <span>Como convidar amigos fora da tua rede Wi-Fi</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 bg-app-tertiary rounded-lg border border-app-border/40 space-y-1">
                      <p className="font-bold text-white">1. Radmin VPN ou Hamachi</p>
                      <p className="text-[11px] text-app-textMuted leading-relaxed">
                        Cria uma sala no Radmin VPN (grátis) com os teus amigos. Eles colam o teu IP do Radmin na app e entram direto!
                      </p>
                    </div>
                    <div className="p-3 bg-app-tertiary rounded-lg border border-app-border/40 space-y-1">
                      <p className="font-bold text-white">2. Ngrok / Cloudflare</p>
                      <p className="text-[11px] text-app-textMuted leading-relaxed">
                        Executa <code>ngrok http 3001</code> no CMD para ter um link HTTPS público sem mexer em nenhuma porta de router.
                      </p>
                    </div>
                    <div className="p-3 bg-app-tertiary rounded-lg border border-app-border/40 space-y-1">
                      <p className="font-bold text-white">3. Port Forwarding</p>
                      <p className="text-[11px] text-app-textMuted leading-relaxed">
                        Abre a porta TCP <code>3001</code> no teu router doméstico direcionada para o teu IP local.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Armazenamento & Ficheiros */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-app-textHeader flex items-center gap-2">
                        <FolderOpen size={16} className="text-[#f0b232]" />
                        <span>Ficheiros, Fotos & Vídeos (Armazenamento)</span>
                      </h4>
                      <p className="text-xs text-app-textMuted">
                        Espaço ocupado: <strong className="text-white">{formatBytes(hostStatus?.uploadsSizeBytes)}</strong> ({hostStatus?.fileCount || 0} ficheiros) • Limite por ficheiro: 100MB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenFolder('server/uploads')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-app-tertiary hover:bg-app-hover border border-app-border rounded-lg text-xs font-semibold text-white transition-colors"
                      >
                        <FolderOpen size={13} className="text-[#f0b232]" />
                        <span>Abrir Pasta de Uploads</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearUploads}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#da373c]/15 hover:bg-[#da373c]/25 border border-[#da373c]/30 rounded-lg text-xs font-semibold text-[#f23f43] transition-colors"
                      >
                        <Trash2 size={13} />
                        <span>Limpar Uploads</span>
                      </button>
                    </div>
                  </div>
                  {hostStatus?.uploadsPath && (
                    <p className="text-[10px] font-mono text-app-textMuted bg-app-tertiary p-2 rounded truncate">
                      {hostStatus.uploadsPath}
                    </p>
                  )}
                </div>

                {/* Base de Dados & Backup */}
                <div className="bg-app-card p-4 rounded-xl border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-app-textHeader flex items-center gap-2">
                        <Database size={16} className="text-[#5865F2]" />
                        <span>Base de Dados SQLite</span>
                      </h4>
                      <p className="text-xs text-app-textMuted">
                        {hostStatus?.userCount || 0} utilizadores • {hostStatus?.msgCount || 0} mensagens guardadas • {hostStatus?.channelCount || 0} canais
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenFolder('server/data')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-app-tertiary hover:bg-app-hover border border-app-border rounded-lg text-xs font-semibold text-white transition-colors"
                      >
                        <FolderOpen size={13} />
                        <span>Abrir Pasta de Dados</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleBackupDatabase}
                        className="flex items-center gap-1 px-3 py-1.5 bg-app-accent hover:bg-app-accentHover text-white rounded-lg text-xs font-semibold shadow transition-colors"
                      >
                        <ShieldCheck size={13} />
                        <span>Criar Backup da BD</span>
                      </button>
                    </div>
                  </div>
                  {hostStatus?.databasePath && (
                    <p className="text-[10px] font-mono text-app-textMuted bg-app-tertiary p-2 rounded truncate">
                      {hostStatus.databasePath}
                    </p>
                  )}
                </div>
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
