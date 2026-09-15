export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private isSpeaking = false;
  private silenceTimer: any = null;
  private onSpeakingChange: (isSpeaking: boolean) => void;
  private threshold = 0.02; // Threshold for speaking detection

  public onVolumeSample?: (rms: number) => void;

  constructor(onSpeakingChange: (isSpeaking: boolean) => void, threshold = 0.02) {
    this.onSpeakingChange = onSpeakingChange;
    this.threshold = threshold;
  }

  setThreshold(newThreshold: number) {
    this.threshold = Math.max(0.001, Math.min(0.2, newThreshold));
  }

  getThreshold(): number {
    return this.threshold;
  }

  start(stream: MediaStream) {
    this.stop();

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      const buffer = new Float32Array(this.analyser.fftSize);

      const checkVolume = () => {
        if (!this.analyser) return;

        this.analyser.getFloatTimeDomainData(buffer);

        // Compute Root Mean Square (RMS) volume
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          sumSquares += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sumSquares / buffer.length);

        if (this.onVolumeSample) {
          this.onVolumeSample(rms);
        }

        if (rms > this.threshold) {
          if (!this.isSpeaking) {
            this.isSpeaking = true;
            this.onSpeakingChange(true);
          }
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else if (this.isSpeaking && !this.silenceTimer) {
          // Delay turning off speaking indicator to prevent flickering
          this.silenceTimer = setTimeout(() => {
            this.isSpeaking = false;
            this.onSpeakingChange(false);
            this.silenceTimer = null;
          }, 350);
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      this.animFrameId = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.error('[VAD] Erro ao inicializar deteção de voz:', err);
    }
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.onSpeakingChange(false);
    }
    if (this.onVolumeSample) {
      this.onVolumeSample(0);
    }
  }
}
