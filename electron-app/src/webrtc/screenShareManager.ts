import { StreamQuality } from '@discord-mini/shared';

export interface QualityConfig {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number; // bps
}

export const QUALITY_PRESETS: Record<StreamQuality, QualityConfig> = {
  '720p30': { width: 1280, height: 720, frameRate: 30, bitrate: 3_000_000 },
  '1080p30': { width: 1920, height: 1080, frameRate: 30, bitrate: 6_000_000 },
  '1080p60': { width: 1920, height: 1080, frameRate: 60, bitrate: 10_000_000 },
  '1440p60': { width: 2560, height: 1440, frameRate: 60, bitrate: 15_000_000 }
};

export class ScreenShareManager {
  private screenStream: MediaStream | null = null;
  private onStopCallback: (() => void) | null = null;
  private currentQuality: StreamQuality = '1080p60';

  async startCapture(
    sourceId: string,
    quality: StreamQuality = '1080p60',
    includeSystemAudio = true,
    onStop?: () => void
  ): Promise<MediaStream> {
    this.stopCapture();
    this.onStopCallback = onStop || null;
    this.currentQuality = quality;

    const q = QUALITY_PRESETS[quality] || QUALITY_PRESETS['1080p60'];

    try {
      const constraints: any = {
        audio: includeSystemAudio
          ? {
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            }
          : false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: q.width,
            maxWidth: q.width,
            minHeight: q.height,
            maxHeight: q.height,
            minFrameRate: Math.min(30, q.frameRate),
            maxFrameRate: q.frameRate
          }
        }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (audioErr) {
        // If system audio capture fails, fallback to video only
        console.warn('[SCREEN-SHARE] Falha ao capturar áudio do sistema, tentando apenas vídeo:', audioErr);
        constraints.audio = false;
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      this.screenStream = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        if ('contentHint' in videoTrack) {
          (videoTrack as any).contentHint = 'detail';
        }

        videoTrack.onended = () => {
          this.stopCapture();
        };
      }

      return stream;
    } catch (err) {
      console.error('[SCREEN-SHARE] Erro ao iniciar captura de ecrã:', err);
      throw err;
    }
  }

  stopCapture() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    if (this.onStopCallback) {
      this.onStopCallback();
      this.onStopCallback = null;
    }
  }

  getStream(): MediaStream | null {
    return this.screenStream;
  }

  getCurrentQuality(): StreamQuality {
    return this.currentQuality;
  }

  static async configureHighQualityVideoSender(
    sender: RTCRtpSender,
    transceiver?: RTCRtpTransceiver,
    quality: StreamQuality = '1080p60'
  ) {
    const q = QUALITY_PRESETS[quality] || QUALITY_PRESETS['1080p60'];
    try {
      // 1. Codec preference (VP9 and AV1 prioritized)
      if (transceiver && 'setCodecPreferences' in transceiver && typeof RTCRtpReceiver.getCapabilities === 'function') {
        const capabilities = RTCRtpReceiver.getCapabilities('video');
        if (capabilities && capabilities.codecs) {
          const preferredCodecs = [...capabilities.codecs].sort((a, b) => {
            const aMime = a.mimeType.toLowerCase();
            const bMime = b.mimeType.toLowerCase();
            if (aMime.includes('vp9') || aMime.includes('av1')) return -1;
            if (bMime.includes('vp9') || bMime.includes('av1')) return 1;
            return 0;
          });
          transceiver.setCodecPreferences(preferredCodecs);
        }
      }

      // 2. High Bitrate & framerate based on quality preset
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = q.bitrate;
      params.encodings[0].maxFramerate = q.frameRate;
      await sender.setParameters(params);
      console.log(`[SCREEN-SHARE] Configurado para ${quality} (${q.width}x${q.height} @ ${q.frameRate}fps, ${q.bitrate / 1_000_000} Mbps)`);
    } catch (e) {
      console.warn('[SCREEN-SHARE] Não foi possível aplicar setParameters no sender:', e);
    }
  }

  static applyHighBitrateSdp(sdp: string, bitrateKbps = 10000): string {
    const lines = sdp.split('\r\n');
    let mVideoFound = false;
    const modifiedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      modifiedLines.push(line);

      if (line.startsWith('m=video')) {
        mVideoFound = true;
        modifiedLines.push(`b=AS:${bitrateKbps}`);
        modifiedLines.push(`b=TIAS:${bitrateKbps * 1000}`);
      } else if (mVideoFound && line.startsWith('m=')) {
        mVideoFound = false;
      }
    }

    return modifiedLines.join('\r\n');
  }
}
