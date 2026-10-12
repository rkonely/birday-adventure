import { gameState } from './GameState.js';
import { events } from './EventManager.js';

/**
 * AudioManager — управление звуками и музыкой.
 * Включает встроенный ретро-синтезатор звуков (Web Audio API)
 * для работы сразу без внешних файлов + поддержку загрузки реальных MP3/WAV/OGG.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.ambientOsc = null;
    this.ambientGain = null;

    events.on('sound:toggled', (enabled) => {
      if (!enabled && this.ambientGain) {
        this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } else if (enabled && this.ambientGain) {
        this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      }
    });
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
        this.startCabinAmbient();
      }
    } catch (e) {
      console.warn('[AudioManager] Web Audio API недоступен:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Фоновый гул двигателей самолета (процедурный)
  startCabinAmbient() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, this.ctx.currentTime); // Низкий рокот самолета

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.035, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      this.ambientOsc = osc;
      this.ambientGain = gain;
    } catch (e) {
      // Игнорируем
    }
  }

  // Ретро-звук клика кнопки
  playClick() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Звук символа печатной машинки в диалоге
  playBlip() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = 600 + Math.random() * 200;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Звук ошибки / отказа доступа
  playError() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.setValueAtTime(110, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // Звук успешного подтверждения (фанфара допуска)
  playSuccess() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  // Звук взмаха крыла птицы (мягкий шелест/свист воздуха)
  playFlap() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.14);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.14);
    } catch (e) {}
  }

  // Звук парения / планирования в потоке воздуха
  startGlide() {
    if (!this.ctx || !gameState.data.soundEnabled || this.glideOsc) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, this.ctx.currentTime);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.4, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      this.glideOsc = osc;
      this.glideGain = gain;
    } catch (e) {}
  }

  stopGlide() {
    if (!this.glideOsc || !this.glideGain || !this.ctx) return;
    try {
      this.glideGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.1);
      const osc = this.glideOsc;
      setTimeout(() => {
        try { osc.stop(); } catch (e) {}
      }, 120);
      this.glideOsc = null;
      this.glideGain = null;
    } catch (e) {
      this.glideOsc = null;
      this.glideGain = null;
    }
  }

  // Звук удара о землю / оглушения
  playBonk() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.32, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);

      const dOsc = this.ctx.createOscillator();
      const dGain = this.ctx.createGain();
      dOsc.type = 'sine';
      dOsc.frequency.setValueAtTime(920, this.ctx.currentTime);
      dOsc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.35);

      dGain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      dGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      dOsc.connect(dGain);
      dGain.connect(this.ctx.destination);
      dOsc.start();
      dOsc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  // Звук входа в слоумо / замедление времени
  playSloMoEnter() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // Звук броска яйца (выстрел/щелчок)
  playEggThrow() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {}
  }

  // Звук разбития яйца (шлепок)
  playEggSplat() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  // Звук золотого яйца (магический звон)
  playGoldJingle() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const freqs = [784, 987, 1318, 1568]; // G5, B5, E6, G6
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.05;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch (e) {}
  }

  // Клевание зерен в кормушке (хруст / поклев)
  playPeckSeed() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      [0, 0.07, 0.14].forEach((tOff) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + tOff;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800 + Math.random() * 300, t);
        osc.frequency.exponentialRampToValueAtTime(250, t + 0.04);

        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.04);
      });
    } catch (e) {}
  }

  // Успешная кладка яйца в гнездо (праздничный аккорд)
  playNestScored() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.06;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch (e) {}
  }

  // Жужжание злой пчелы
  playBeeBuzz() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(290, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // Крик вороны (caw)
  playCrowScreech() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(320, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch (e) {}
  }

  // Попадание яйцом во врага
  playEnemyHit() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  // Урон птицы (ай!)
  playHurt() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.24, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {}
  }

  // Бросок желудя белкой
  playAcornThrow() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(540, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  // Победный триумф прохождения этапа
  playLevelComplete() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const chords = [
        [523.25, 659.25, 783.99],       // C
        [587.33, 739.99, 880.00],       // D
        [659.25, 830.61, 987.77],       // E
        [1046.50, 1318.51, 1567.98]     // High C Major!
      ];
      chords.forEach((chord, step) => {
        chord.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = this.ctx.currentTime + step * 0.18;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);

          const dur = step === 3 ? 0.8 : 0.22;
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + dur);
        });
      });
    } catch (e) {}
  }
}

export const audio = new AudioManager();
