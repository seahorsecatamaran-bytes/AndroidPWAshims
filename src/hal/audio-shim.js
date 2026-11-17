/**
 * DualMode PWA Toolkit - Audio Alert & Background Sound Engine
 * Synthesizes alarms, siren beeps, and nautical chime tones using Web Audio API oscillators.
 * Also handles browser autoplay unlocking via initial user gesture.
 */
export class AudioShim {
  constructor() {
    this.ctx = null;
    this.isUnlocked = false;
  }

  ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
      });
    } else if (this.ctx && this.ctx.state === 'running') {
      this.isUnlocked = true;
    }
    return this.ctx;
  }

  /**
   * Unlock AudioContext on first user interaction (pointerdown, click, touch)
   */
  attachUnlockGesture(target = window) {
    const unlock = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'running') {
        target.removeEventListener('pointerdown', unlock);
        target.removeEventListener('keydown', unlock);
      }
    };
    target.addEventListener('pointerdown', unlock, { passive: true });
    target.addEventListener('keydown', unlock, { passive: true });
  }

  /**
   * Play an alert tone
   * @param {Object} options { type: 'sine'|'square'|'sawtooth', frequency: 880, duration: 0.4, pattern: 'beep'|'siren'|'chime' }
   */
  playTone({ type = 'sine', frequency = 880, duration = 0.35, gain = 0.3 } = {}) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  /**
   * Two-tone marine warning or alarm sequence
   */
  playSiren(cycles = 2) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    for (let i = 0; i < cycles; i++) {
      const t = now + i * 0.6;
      this._scheduleTone(t, 960, 0.28, 'sawtooth', 0.25);
      this._scheduleTone(t + 0.3, 720, 0.28, 'sawtooth', 0.25);
    }
  }

  _scheduleTone(startTime, freq, duration, type, gainVal) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Generate an in-memory WAV Blob from synthesized tones (useful for saving to IndexedDB)
   */
  generateWavBlob(frequency = 440, durationSeconds = 1, sampleRate = 44100) {
    const totalSamples = Math.floor(sampleRate * durationSeconds);
    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true);  // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true);  // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, totalSamples * 2, true);

    // PCM Samples (sine wave with fade-out)
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - t / durationSeconds);
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.7;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, intSample, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }
}
