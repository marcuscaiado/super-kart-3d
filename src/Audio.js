/**
 * Pure Web Audio API Sound Synthesizer.
 * Synthesizes engine audio, race soundtrack music, coin pickups,
 * hop jumps, drift sparks, boost bursts, and weapon SFX.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.noiseBuffer = null;

    this.driftGain = null;
    this.driftFilter = null;
    this.driftSource = null;

    // Music
    this.isMusicPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;

    this.initAudioContext();
  }

  initAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.generateNoiseBuffer();

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (!this.isInitialized && this.ctx) {
        this.setupContinuousSounds();
        this.startRaceMusic();
        this.isInitialized = true;
      }
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('mousedown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  unlock() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.isInitialized && this.ctx) {
      this.setupContinuousSounds();
      this.startRaceMusic();
      this.isInitialized = true;
    }
  }

  generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  setupContinuousSounds() {
    if (!this.ctx) return;

    // Engine sound chain
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(65, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(32.5, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Drift spark sound chain
    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.driftFilter = this.ctx.createBiquadFilter();
    this.driftFilter.type = 'bandpass';
    this.driftFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
    this.driftFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    if (this.noiseBuffer) {
      this.driftSource = this.ctx.createBufferSource();
      this.driftSource.buffer = this.noiseBuffer;
      this.driftSource.loop = true;
      this.driftSource.connect(this.driftFilter);
      this.driftFilter.connect(this.driftGain);
      this.driftGain.connect(this.ctx.destination);
      this.driftSource.start();
    }
  }

  startRaceMusic() {
    if (this.isMusicPlaying || !this.ctx) return;
    this.isMusicPlaying = true;

    // Fun upbeat retro arcade Mario Kart style synth groove
    const tempo = 136;
    const beatSec = 60 / tempo / 2; // 16th notes

    // Bass & melody sequences
    const bassline = [
      130.81, 130.81, 155.56, 174.61,  // C3, C3, Eb3, F3
      196.00, 196.00, 174.61, 155.56,  // G3, G3, F3, Eb3
      116.54, 116.54, 130.81, 146.83,  // Bb2, Bb2, C3, D3
      174.61, 196.00, 220.00, 196.00,  // F3, G3, A3, G3
    ];

    const melody = [
      523.25, 0, 587.33, 659.25, 783.99, 0, 659.25, 0,
      523.25, 0, 392.00, 440.00, 523.25, 0, 0, 0,
      440.00, 0, 493.88, 523.25, 587.33, 0, 523.25, 0,
      392.00, 0, 329.63, 349.23, 392.00, 0, 0, 0,
    ];

    const playStep = () => {
      if (!this.isMusicPlaying || this.isMuted || !this.ctx) return;

      const t = this.ctx.currentTime;
      const bNote = bassline[this.musicStep % bassline.length];
      const mNote = melody[this.musicStep % melody.length];

      // Bass synth note
      if (bNote) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bNote, t);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + beatSec * 0.9);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + beatSec);
      }

      // Melody lead note
      if (mNote) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(mNote, t);
        gain.gain.setValueAtTime(0.025, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + beatSec * 0.85);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + beatSec);
      }

      this.musicStep++;
      this.musicTimer = setTimeout(playStep, beatSec * 1000);
    };

    playStep();
  }

  updateEngine(normalizedSpeed, isAccelerating, isDrifting) {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const t = this.ctx.currentTime;
    const clampedSpeed = Math.max(0, Math.min(1.4, normalizedSpeed));

    const baseFreq = 58 + clampedSpeed * 230 + (isAccelerating ? 25 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

    const cutoff = 260 + clampedSpeed * 1300 + (isAccelerating ? 400 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.06);

    const targetVol = 0.06 + clampedSpeed * 0.12 + (isAccelerating ? 0.04 : 0);
    this.engineGain.gain.setTargetAtTime(targetVol, t, 0.08);

    if (this.driftGain) {
      const driftVol = isDrifting ? Math.min(0.18, 0.08 + clampedSpeed * 0.1) : 0.0;
      this.driftGain.gain.setTargetAtTime(driftVol, t, 0.05);
      if (isDrifting && this.driftFilter) {
        this.driftFilter.frequency.setTargetAtTime(1900 + clampedSpeed * 1500, t, 0.05);
      }
    }
  }

  playCoinChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Authentic Mario coin two-tone chime (B5 -> E6)
    const notes = [987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.2, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.3);
    });
  }

  playHopSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playItemBoxChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.045);

      gain.gain.setValueAtTime(0.16, t + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.045 + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.045);
      osc.stop(t + idx * 0.045 + 0.2);
    });
  }

  playBoostBurst() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    if (this.noiseBuffer) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3600, t);
      filter.frequency.exponentialRampToValueAtTime(180, t + 0.8);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noiseSource.start(t);
      noiseSource.stop(t + 0.9);
    }

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.2);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.7);

    oscGain.gain.setValueAtTime(0.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.8);
  }

  playShellLaunch() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playShellHit() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  playBananaSlip() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(850, t);
    osc.frequency.exponentialRampToValueAtTime(170, t + 0.35);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.42);
  }

  playCountdownBeep(isGo = false) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isGo ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, t);

    gain.gain.setValueAtTime(isGo ? 0.35 : 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.6 : 0.25));

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + (isGo ? 0.65 : 0.3));
  }

  playLapFanfare() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);

      gain.gain.setValueAtTime(0.2, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.6);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      if (this.driftGain) this.driftGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
