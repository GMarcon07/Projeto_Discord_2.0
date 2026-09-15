import { SignalData, VoiceParticipant, StreamQuality } from '@discord-mini/shared';
import { VoiceActivityDetector } from './vad';
import { ScreenShareManager } from './screenShareManager';

export const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Open Relay Project (Free public STUN/TURN fallback)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export interface PeerItem {
  userId: string;
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  gainNode?: GainNode;
  audioCtx?: AudioContext;
  screenTrackSender?: RTCRtpSender;
  screenAudioSender?: RTCRtpSender;
  pingMs?: number;
}

export class VoiceManager {
  private localAudioStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private peers: Map<string, PeerItem> = new Map();
  private vad: VoiceActivityDetector | null = null;
  private currentUserId: string = '';

  private isMuted = false;
  private isDeafened = false;
  private audioOutputDeviceId = '';
  private audioInputOptions: {
    deviceId?: string;
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
  } = {};
  private userVolumes: Map<string, number> = new Map(); // userId -> 0 to 200%

  // Multi-stream screenshare map: userId -> MediaStream
  private remoteScreenStreams: Map<string, MediaStream> = new Map();

  // Ping interval timer
  private pingIntervalId: any = null;

  public onSpeakingChange?: (isSpeaking: boolean) => void;
  public onRemoteScreenStreamsChange?: (streams: Map<string, MediaStream>) => void;
  public onPingUpdate?: (userId: string, pingMs: number) => void;
  public sendSignal?: (toUserId: string, signal: SignalData) => void;

  constructor(currentUserId: string, vadThreshold = 0.02) {
    this.currentUserId = currentUserId;
    this.vad = new VoiceActivityDetector((speaking) => {
      if (!this.isMuted && this.onSpeakingChange) {
        this.onSpeakingChange(speaking);
      }
    }, vadThreshold);

    this.startPingMonitor();
  }

  getVad(): VoiceActivityDetector | null {
    return this.vad;
  }

  setAudioInputOptions(options: {
    deviceId?: string;
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
  }) {
    this.audioInputOptions = { ...this.audioInputOptions, ...options };
  }

  async initLocalMicrophone(options?: {
    deviceId?: string;
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
  }): Promise<MediaStream> {
    if (options) {
      this.audioInputOptions = { ...this.audioInputOptions, ...options };
    }
    const opts = this.audioInputOptions;

    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach((t) => t.stop());
      this.localAudioStream = null;
    }

    try {
      const audioConstraints: any = {
        echoCancellation: opts.echoCancellation !== false,
        noiseSuppression: opts.noiseSuppression !== false,
        autoGainControl: true
      };

      if (opts.deviceId) {
        audioConstraints.deviceId = { exact: opts.deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });

      this.localAudioStream = stream;
      this.vad?.start(stream);

      // If already connected to peers, replace track
      const newTrack = stream.getAudioTracks()[0];
      if (newTrack) {
        newTrack.enabled = !this.isMuted;
        this.peers.forEach((peer) => {
          const senders = peer.pc.getSenders();
          const audioSender = senders.find((s) => s.track && s.track.kind === 'audio' && s !== peer.screenAudioSender);
          if (audioSender) {
            audioSender.replaceTrack(newTrack).catch((e) => console.warn('Erro replaceTrack:', e));
          }
        });
      }

      return stream;
    } catch (err) {
      console.error('[VOICE] Erro ao aceder ao microfone:', err);
      throw err;
    }
  }

  setOutputDevice(deviceId: string) {
    this.audioOutputDeviceId = deviceId;
    this.peers.forEach((peer) => {
      if (typeof (peer.audioEl as any).setSinkId === 'function') {
        (peer.audioEl as any).setSinkId(deviceId).catch((e: any) => {
          console.warn('[VOICE] Erro ao mudar dispositivo de saída:', e);
        });
      }
    });
  }

  setUserVolume(userId: string, volumePercent: number) {
    const vol = Math.max(0, Math.min(200, volumePercent));
    this.userVolumes.set(userId, vol);

    const peer = this.peers.get(userId);
    if (peer) {
      if (peer.gainNode) {
        peer.gainNode.gain.setValueAtTime(vol / 100, peer.audioCtx?.currentTime || 0);
      } else {
        peer.audioEl.volume = Math.min(1, vol / 100);
      }
    }
  }

  setLocalMuted(userId: string, muted: boolean) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.audioEl.muted = muted || this.isDeafened;
      if (peer.gainNode) {
        const vol = muted ? 0 : (this.userVolumes.get(userId) ?? 100) / 100;
        peer.gainNode.gain.setValueAtTime(vol, peer.audioCtx?.currentTime || 0);
      }
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
    }
    if (mute && this.onSpeakingChange) {
      this.onSpeakingChange(false);
    }
  }

  setDeafen(deafen: boolean) {
    this.isDeafened = deafen;
    if (deafen && !this.isMuted) {
      this.setMute(true);
    }
    this.peers.forEach((peer) => {
      peer.audioEl.muted = deafen;
    });
  }

  async connectToParticipants(existingParticipants: VoiceParticipant[]) {
    await this.initLocalMicrophone();

    for (const participant of existingParticipants) {
      if (participant.userId === this.currentUserId) continue;
      this.createPeerConnection(participant.userId, true);
    }
  }

  handleUserJoined(userId: string) {
    if (userId === this.currentUserId) return;
    if (!this.peers.has(userId)) {
      this.createPeerConnection(userId, false);
    }
  }

  handleUserLeft(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.pc.close();
      peer.audioEl.remove();
      peer.audioCtx?.close().catch(() => {});
      this.peers.delete(userId);
    }

    if (this.remoteScreenStreams.has(userId)) {
      this.remoteScreenStreams.delete(userId);
      this.onRemoteScreenStreamsChange?.(new Map(this.remoteScreenStreams));
    }
  }

  private createPeerConnection(remoteUserId: string, isInitiator: boolean): RTCPeerConnection {
    if (this.peers.has(remoteUserId)) {
      return this.peers.get(remoteUserId)!.pc;
    }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    const audioEl = new Audio();
    audioEl.autoplay = true;
    audioEl.muted = this.isDeafened;

    // Apply saved output device
    if (this.audioOutputDeviceId && typeof (audioEl as any).setSinkId === 'function') {
      (audioEl as any).setSinkId(this.audioOutputDeviceId).catch(() => {});
    }

    const peerItem: PeerItem = {
      userId: remoteUserId,
      pc,
      audioEl
    };

    // Apply saved volume (0% to 200%)
    const userVol = this.userVolumes.get(remoteUserId) ?? 100;
    audioEl.volume = Math.min(1, userVol / 100);

    this.peers.set(remoteUserId, peerItem);

    // Add local mic track
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localAudioStream!);
      });
    }

    // Add local screen share tracks (video + desktop audio)
    if (this.localScreenStream) {
      const videoTrack = this.localScreenStream.getVideoTracks()[0];
      if (videoTrack) {
        const sender = pc.addTrack(videoTrack, this.localScreenStream);
        peerItem.screenTrackSender = sender;
        ScreenShareManager.configureHighQualityVideoSender(sender);
      }
      const audioTrack = this.localScreenStream.getAudioTracks()[0];
      if (audioTrack) {
        const audioSender = pc.addTrack(audioTrack, this.localScreenStream);
        peerItem.screenAudioSender = audioSender;
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.sendSignal) {
        this.sendSignal(remoteUserId, {
          type: 'ice-candidate',
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      if (event.track.kind === 'audio') {
        // Setup Web Audio GainNode for volume boost if desired
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(event.streams[0]);
          const gain = ctx.createGain();
          const targetVol = (this.userVolumes.get(remoteUserId) ?? 100) / 100;
          gain.gain.value = targetVol;
          source.connect(gain);
          gain.connect(ctx.destination);

          peerItem.audioCtx = ctx;
          peerItem.gainNode = gain;
        } catch {
          // Fallback to audioEl
          audioEl.srcObject = event.streams[0];
        }
      } else if (event.track.kind === 'video') {
        const stream = event.streams[0];
        this.remoteScreenStreams.set(remoteUserId, stream);
        this.onRemoteScreenStreamsChange?.(new Map(this.remoteScreenStreams));

        event.track.onended = () => {
          this.remoteScreenStreams.delete(remoteUserId);
          this.onRemoteScreenStreamsChange?.(new Map(this.remoteScreenStreams));
        };
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          const finalSdp = this.localScreenStream
            ? ScreenShareManager.applyHighBitrateSdp(offer.sdp || '')
            : offer.sdp;

          await pc.setLocalDescription({ type: 'offer', sdp: finalSdp });

          if (this.sendSignal) {
            this.sendSignal(remoteUserId, {
              type: 'offer',
              sdp: pc.localDescription?.toJSON()
            });
          }
        } catch (err) {
          console.error(`[WEBRTC] Erro ao criar oferta para ${remoteUserId}:`, err);
        }
      };
    }

    return pc;
  }

  async handleSignal(fromUserId: string, signal: SignalData) {
    let peer = this.peers.get(fromUserId);
    if (!peer) {
      this.createPeerConnection(fromUserId, false);
      peer = this.peers.get(fromUserId)!;
    }
    const pc = peer.pc;

    try {
      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        const answer = await pc.createAnswer();
        const finalSdp = this.localScreenStream
          ? ScreenShareManager.applyHighBitrateSdp(answer.sdp || '')
          : answer.sdp;

        await pc.setLocalDescription({ type: 'answer', sdp: finalSdp });

        if (this.sendSignal) {
          this.sendSignal(fromUserId, {
            type: 'answer',
            sdp: pc.localDescription?.toJSON()
          });
        }
      } else if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'ice-candidate' && signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error(`[WEBRTC] Erro ao processar sinal de ${fromUserId}:`, err);
    }
  }

  // Screen share with dynamic quality & audio
  async startScreenShare(screenStream: MediaStream, quality: StreamQuality = '1080p60') {
    this.localScreenStream = screenStream;
    const videoTrack = screenStream.getVideoTracks()[0];
    const audioTrack = screenStream.getAudioTracks()[0];

    for (const [userId, peer] of this.peers.entries()) {
      try {
        if (videoTrack) {
          const sender = peer.pc.addTrack(videoTrack, screenStream);
          peer.screenTrackSender = sender;
          await ScreenShareManager.configureHighQualityVideoSender(sender, undefined, quality);
        }
        if (audioTrack) {
          const audioSender = peer.pc.addTrack(audioTrack, screenStream);
          peer.screenAudioSender = audioSender;
        }

        const offer = await peer.pc.createOffer();
        const finalSdp = ScreenShareManager.applyHighBitrateSdp(offer.sdp || '');
        await peer.pc.setLocalDescription({ type: 'offer', sdp: finalSdp });

        if (this.sendSignal) {
          this.sendSignal(userId, {
            type: 'offer',
            sdp: peer.pc.localDescription?.toJSON()
          });
        }
      } catch (err) {
        console.error(`[WEBRTC] Erro ao partilhar ecrã com utilizador ${userId}:`, err);
      }
    }
  }

  async stopScreenShare() {
    if (!this.localScreenStream) return;

    for (const [userId, peer] of this.peers.entries()) {
      try {
        if (peer.screenTrackSender) {
          peer.pc.removeTrack(peer.screenTrackSender);
          peer.screenTrackSender = undefined;
        }
        if (peer.screenAudioSender) {
          peer.pc.removeTrack(peer.screenAudioSender);
          peer.screenAudioSender = undefined;
        }

        const offer = await peer.pc.createOffer();
        await peer.pc.setLocalDescription(offer);
        if (this.sendSignal) {
          this.sendSignal(userId, {
            type: 'offer',
            sdp: peer.pc.localDescription?.toJSON()
          });
        }
      } catch (e) {
        console.warn('[WEBRTC] Erro ao remover tracks de ecrã:', e);
      }
    }

    this.localScreenStream = null;
  }

  // Periodic Ping (ms) monitor via WebRTC getStats()
  private startPingMonitor() {
    this.pingIntervalId = setInterval(async () => {
      for (const [userId, peer] of this.peers.entries()) {
        try {
          const stats = await peer.pc.getStats();
          let pingMs = 0;

          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.nominated)) {
              if (report.currentRoundTripTime != null) {
                pingMs = Math.round(report.currentRoundTripTime * 1000);
              }
            }
          });

          if (pingMs > 0) {
            peer.pingMs = pingMs;
            this.onPingUpdate?.(userId, pingMs);
          }
        } catch {
          // stats error ignore
        }
      }
    }, 2500);
  }

  leave() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    this.vad?.stop();

    this.peers.forEach((peer) => {
      peer.pc.close();
      peer.audioEl.remove();
      peer.audioCtx?.close().catch(() => {});
    });
    this.peers.clear();
    this.remoteScreenStreams.clear();

    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach((t) => t.stop());
      this.localAudioStream = null;
    }

    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((t) => t.stop());
      this.localScreenStream = null;
    }
  }
}
