import { SignalData, VoiceParticipant } from '@discord-mini/shared';
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
  screenTrackSender?: RTCRtpSender;
}

export class VoiceManager {
  private localAudioStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private peers: Map<string, PeerItem> = new Map();
  private vad: VoiceActivityDetector | null = null;
  private currentUserId: string = '';

  private isMuted = false;
  private isDeafened = false;

  public onSpeakingChange?: (isSpeaking: boolean) => void;
  public onRemoteScreenStream?: (userId: string, stream: MediaStream | null) => void;
  public sendSignal?: (toUserId: string, signal: SignalData) => void;

  constructor(currentUserId: string) {
    this.currentUserId = currentUserId;
    this.vad = new VoiceActivityDetector((speaking) => {
      if (!this.isMuted && this.onSpeakingChange) {
        this.onSpeakingChange(speaking);
      }
    });
  }

  async initLocalMicrophone(): Promise<MediaStream> {
    if (this.localAudioStream) return this.localAudioStream;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      this.localAudioStream = stream;
      this.vad?.start(stream);
      return stream;
    } catch (err) {
      console.error('[VOICE] Erro ao aceder ao microfone:', err);
      throw err;
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
    // When deafened, also mute microphone
    if (deafen && !this.isMuted) {
      this.setMute(true);
    }
    this.peers.forEach((peer) => {
      peer.audioEl.muted = deafen;
    });
  }

  // Connect to existing participants when entering a channel
  async connectToParticipants(existingParticipants: VoiceParticipant[]) {
    await this.initLocalMicrophone();

    for (const participant of existingParticipants) {
      if (participant.userId === this.currentUserId) continue;
      this.createPeerConnection(participant.userId, true);
    }
  }

  // Handle incoming new participant
  handleUserJoined(userId: string) {
    if (userId === this.currentUserId) return;
    // Wait for the newcomer to initiate the offer, or initiate if not exists
    if (!this.peers.has(userId)) {
      this.createPeerConnection(userId, false);
    }
  }

  handleUserLeft(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.pc.close();
      peer.audioEl.remove();
      this.peers.delete(userId);
    }
    if (this.onRemoteScreenStream) {
      this.onRemoteScreenStream(userId, null);
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

    const peerItem: PeerItem = {
      userId: remoteUserId,
      pc,
      audioEl
    };
    this.peers.set(remoteUserId, peerItem);

    // Add local mic audio track
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localAudioStream!);
      });
    }

    // Add local screen share track if already active
    if (this.localScreenStream) {
      const videoTrack = this.localScreenStream.getVideoTracks()[0];
      if (videoTrack) {
        const sender = pc.addTrack(videoTrack, this.localScreenStream);
        peerItem.screenTrackSender = sender;
        ScreenShareManager.configureHighQualityVideoSender(sender);
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
        audioEl.srcObject = event.streams[0];
      } else if (event.track.kind === 'video') {
        if (this.onRemoteScreenStream) {
          this.onRemoteScreenStream(remoteUserId, event.streams[0]);
        }
        event.track.onended = () => {
          if (this.onRemoteScreenStream) {
            this.onRemoteScreenStream(remoteUserId, null);
          }
        };
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          // Apply high bitrate SDP if video is present
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

  // Screen sharing integration
  async startScreenShare(screenStream: MediaStream) {
    this.localScreenStream = screenStream;
    const videoTrack = screenStream.getVideoTracks()[0];
    if (!videoTrack) return;

    for (const [userId, peer] of this.peers.entries()) {
      try {
        const sender = peer.pc.addTrack(videoTrack, screenStream);
        peer.screenTrackSender = sender;
        await ScreenShareManager.configureHighQualityVideoSender(sender);

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
      if (peer.screenTrackSender) {
        try {
          peer.pc.removeTrack(peer.screenTrackSender);
          peer.screenTrackSender = undefined;

          // Renegotiate removal
          const offer = await peer.pc.createOffer();
          await peer.pc.setLocalDescription(offer);
          if (this.sendSignal) {
            this.sendSignal(userId, {
              type: 'offer',
              sdp: peer.pc.localDescription?.toJSON()
            });
          }
        } catch (e) {
          console.warn('[WEBRTC] Erro ao remover track de ecrã:', e);
        }
      }
    }

    this.localScreenStream = null;
  }

  leave() {
    this.vad?.stop();

    this.peers.forEach((peer) => {
      peer.pc.close();
      peer.audioEl.remove();
    });
    this.peers.clear();

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
