/**
 * Flame Studio - Web Audio Procedural Flame & Gas Sound Synthesizer
 * Synthesizes dynamic gas hiss, roaring combustion, and salt crackle without external assets.
 * Zero-CJK compliant.
 */

export class FlameAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Audio nodes
    this.gasGain = null;
    this.gasFilter = null;
    this.crackleGain = null;
    this.masterGain = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  init() {
    if (this.isInitialized) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    // 1. Gas Flow Noise Generator (Continuous pink-ish noise)
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    const whiteNoiseSource = ctx.createBufferSource();
    whiteNoiseSource.buffer = noiseBuffer;
    whiteNoiseSource.loop = true;

    this.gasFilter = ctx.createBiquadFilter();
    this.gasFilter.type = "lowpass";
    this.gasFilter.frequency.setValueAtTime(400, ctx.currentTime);
    this.gasFilter.Q.setValueAtTime(2.5, ctx.currentTime);

    this.gasGain = ctx.createGain();
    this.gasGain.gain.setValueAtTime(0.2, ctx.currentTime);

    whiteNoiseSource.connect(this.gasFilter);
    this.gasFilter.connect(this.gasGain);
    this.gasGain.connect(this.masterGain);
    whiteNoiseSource.start(0);

    // 2. Crackle / Sizzle Gain
    this.crackleGain = ctx.createGain();
    this.crackleGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.crackleGain.connect(this.masterGain);

    this.isInitialized = true;
  }

  updateBurner(airHole, gasFlow = 1.0) {
    if (!this.isInitialized || !this.ctx) return;
    const ctx = this.ctx;
    // Map airHole (0.0 closed -> 1.0 open) to frequency and gain
    // Safety flame: quiet, low-pass around 300Hz
    // Roaring flame: roaring, low-pass up to 1400Hz with higher gain
    const targetFreq = 300 + airHole * 1100;
    const targetGain = (0.15 + airHole * 0.35) * gasFlow;

    this.gasFilter.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.15);
    this.gasGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.15);
  }

  playCrackle(intensity = 0.5, duration = 3.0) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;
    const ctx = this.ctx;

    const count = Math.floor(intensity * 18);
    for (let i = 0; i < count; i++) {
      const delay = Math.random() * duration;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = Math.random() > 0.5 ? "sawtooth" : "square";
      osc.frequency.setValueAtTime(150 + Math.random() * 800, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.08 * intensity, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.05 + Math.random() * 0.08);

      osc.connect(gain);
      gain.connect(this.crackleGain);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime, 0.08);
    }
    return this.isMuted;
  }
}
