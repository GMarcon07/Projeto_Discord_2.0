export class ScreenShareManager {
  private screenStream: MediaStream | null = null;
  private onStopCallback: (() => void) | null = null;

  async startCapture(sourceId: string, onStop?: () => void): Promise<MediaStream> {
    this.stopCapture();
    this.onStopCallback = onStop || null;

    try {
      // 1080p @ 60fps desktopCapturer constraints
      const constraints: any = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1920,
            maxWidth: 1920,
            minHeight: 1080,
            maxHeight: 1080,
            minFrameRate: 60,
            maxFrameRate: 60
          }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.screenStream = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // High quality content hint for screenshare (maintains text sharpness)
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

  /**
   * Prioritizes VP9/AV1 codecs on a video transceiver and sets high bitrate (10 Mbps)
   */
  static async configureHighQualityVideoSender(sender: RTCRtpSender, transceiver?: RTCRtpTransceiver) {
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

      // 2. High Bitrate (10 Mbps for 1080p 60fps)
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = 10_000_000; // 10 Mbps
      params.encodings[0].maxFramerate = 60;
      await sender.setParameters(params);
      console.log('[SCREEN-SHARE] Transceiver configurado com 10Mbps e prioridade VP9/AV1.');
    } catch (e) {
      console.warn('[SCREEN-SHARE] Não foi possível aplicar setParameters no sender:', e);
    }
  }

  /**
   * SDP munging fallback to guarantee high video bitrate (10 Mbps) on older/strict WebRTC implementations
   */
  static applyHighBitrateSdp(sdp: string, bitrateKbps = 10000): string {
    const lines = sdp.split('\r\n');
    let mVideoFound = false;
    const modifiedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      modifiedLines.push(line);

      if (line.startsWith('m=video')) {
        mVideoFound = true;
        // Inject bitrate after m=video line
        modifiedLines.push(`b=AS:${bitrateKbps}`);
        modifiedLines.push(`b=TIAS:${bitrateKbps * 1000}`);
      } else if (mVideoFound && line.startsWith('m=')) {
        mVideoFound = false;
      }
    }

    return modifiedLines.join('\r\n');
  }
}
