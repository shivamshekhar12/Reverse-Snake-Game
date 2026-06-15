/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bType: 'sine' | 'triangle' = 'triangle';
  private isMusicPlaying = false;
  private isMuted = false;
  private musicInterval: any = null;
  private currentTrackId = 1;

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  private resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (!this.masterGain) return;
    this.masterGain.gain.setValueAtTime(muted ? 0 : 0.3, this.ctx?.currentTime || 0);
  }

  toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  getMute() {
    return this.isMuted;
  }

  playClick() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playSlither() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playSlice() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    // A metallic swoop + a noise crunch
    const now = this.ctx.currentTime;
    
    // Part 1: Oscillator sweep
    const osc = this.ctx.createOscillator();
    const gainOsc = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);

    gainOsc.gain.setValueAtTime(0.2, now);
    gainOsc.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gainOsc);
    gainOsc.connect(this.sfxGain);
    osc.start();
    osc.stop(now + 0.15);

    // Part 2: Quick noise burst
    try {
      const bufferSize = this.ctx.sampleRate * 0.1; // 100ms noise
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1000, now);

      const gainNoise = this.ctx.createGain();
      gainNoise.gain.setValueAtTime(0.15, now);
      gainNoise.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      noise.connect(noiseFilter);
      noiseFilter.connect(gainNoise);
      gainNoise.connect(this.sfxGain);
      noise.start();
      noise.stop(now + 0.11);
    } catch (e) {
      // Fallback if buffer creation fails
    }
  }

  playGatePass() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(330, now); // E4
    osc.frequency.setValueAtTime(440, now + 0.08); // A4
    osc.frequency.setValueAtTime(554, now + 0.16); // C#5
    osc.frequency.setValueAtTime(659, now + 0.24); // E5

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.setValueAtTime(0.08, now + 0.24);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(now + 0.35);
  }

  playGateBlocked() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(now + 0.22);
  }

  playFail() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(now + 0.45);
  }

  playWin() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  playWarp() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(now + 0.25);
  }

  playBonus() {
    this.resume();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (classic reward)
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.15, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.2);
    });
  }

  getCurrentTrackId(): number {
    return this.currentTrackId;
  }

  getTrackName(trackId: number): string {
    switch (trackId) {
      case 1: return "Alpha Core Atmos";
      case 2: return "Beta Cyber Pulse";
      case 3: return "Gamma Celestial Orbit";
      default: return "Alpha Core Atmos";
    }
  }

  setTrack(trackId: number) {
    this.currentTrackId = trackId;
    if (this.isMusicPlaying) {
      this.stopMusic();
      this.startMusic();
    }
  }

  autoSelectTrack(levelId: number) {
    let targetTrack = 1;
    if (levelId === 99) {
      targetTrack = 2; // Sandbox is Cyber Pulse
    } else if (levelId >= 7) {
      targetTrack = 3; // Celestial Orbit
    } else if (levelId >= 4) {
      targetTrack = 2; // Cyber Pulse
    } else {
      targetTrack = 1; // Alpha Core
    }
    // Only switch if different to prevent interrupting a track currently playing
    if (this.currentTrackId !== targetTrack) {
      this.setTrack(targetTrack);
    }
  }

  startMusic() {
    this.resume();
    this.isMusicPlaying = true;
    if (!this.ctx || this.musicInterval) return;

    let beat = 0;
    
    // Choose track properties dynamically
    let chords: number[][];
    let melody: number[][];
    let intervalTime = 280; // milliseconds
    let waveType: 'sine' | 'square' | 'triangle' = 'sine';
    let melodyVolume = 0.04;
    let baseVolume = 0.08;

    if (this.currentTrackId === 2) {
      // Track 2: Beta Cyber Pulse (Fast, high tension cyber deck vibe)
      intervalTime = 210;
      waveType = 'triangle';
      melodyVolume = 0.05;
      baseVolume = 0.09;

      chords = [
        [110.00, 130.81, 164.81], // A2, C3, E3 (Am)
        [116.54, 138.59, 174.61], // Bb2, Db3, F3 (Bbm)
        [130.81, 155.56, 196.00], // C3, Eb3, G3 (Cm)
        [116.54, 146.83, 174.61], // Bb2, D3, F3 (Bb)
      ];

      melody = [
        [220.00, 261.63, 329.63, 440.00], 
        [233.08, 277.18, 349.23, 466.16],
        [261.63, 311.13, 392.00, 523.25],
        [233.08, 293.66, 349.23, 466.16],
      ];
    } else if (this.currentTrackId === 3) {
      // Track 3: Gamma Celestial Orbit (Ethereal space ambient chimes)
      intervalTime = 340;
      waveType = 'sine';
      melodyVolume = 0.06;
      baseVolume = 0.06;

      chords = [
        [146.83, 196.00, 246.94], // D3, G3, B3 (G Major)
        [130.81, 164.81, 220.00], // C3, E3, A3 (Am7)
        [164.81, 220.00, 261.63], // E3, A3, C4 (Asus)
        [146.83, 174.61, 220.00], // D3, F3, A3 (Dm)
      ];

      melody = [
        [392.00, 493.88, 587.33, 783.99], // High pentatonic
        [440.00, 523.25, 659.25, 880.00],
        [440.00, 587.33, 698.46, 880.00],
        [293.66, 349.23, 440.00, 587.33],
      ];
    } else {
      // Track 1: Alpha Core Atmos (Symmetric, calm)
      intervalTime = 280;
      waveType = 'sine';
      melodyVolume = 0.04;
      baseVolume = 0.08;

      chords = [
        [130.81, 164.81, 196.00], // C3, E3, G3
        [146.83, 174.61, 220.00], // D3, F3, A3
        [164.81, 196.00, 246.94], // E3, G3, B3
        [130.81, 174.61, 220.00], // C3, F3, A3
      ];

      melody = [
        [261.63, 329.63, 392.00, 523.25], 
        [293.66, 349.23, 440.00, 587.33],
        [329.63, 392.00, 493.88, 659.25],
        [349.23, 440.00, 523.25, 698.46],
      ];
    }

    this.musicInterval = setInterval(() => {
      if (this.isMuted || !this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const chordIdx = Math.floor(beat / 8) % chords.length;
      const step = beat % 8;

      // Play background bass/drone on step 0 and 4
      if (step === 0 || step === 4) {
        const rootNote = chords[chordIdx][0];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(rootNote, now);
        
        gain.gain.setValueAtTime(baseVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + (intervalTime * 4.2) / 1000);
        
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start();
        osc.stop(now + (intervalTime * 4.2) / 1000);
      }

      // Play soft arpeggiated synth melody
      if (step % 2 === 0) {
        const melodyPool = melody[chordIdx];
        const melodyNote = melodyPool[(step / 2 + (chordIdx % 2)) % melodyPool.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = waveType;
        osc.frequency.setValueAtTime(melodyNote, now);
        
        gain.gain.setValueAtTime(melodyVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (intervalTime * 1.6) / 1000);
        
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start();
        osc.stop(now + (intervalTime * 1.6) / 1000);
      }

      beat++;
    }, intervalTime);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  getMusicState() {
    return this.isMusicPlaying;
  }
}

export const audioSystem = new AudioController();
