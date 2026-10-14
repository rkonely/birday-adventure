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
    this.masterGain = null;
    this.sfxGain = null;

    this.musicVolume = 0.8;
    this.sfxVolume = 0.9;
    try {
      const savedMusic = localStorage.getItem('birday_music_volume');
      if (savedMusic !== null) this.musicVolume = parseFloat(savedMusic);
      const savedSfx = localStorage.getItem('birday_sfx_volume');
      if (savedSfx !== null) this.sfxVolume = parseFloat(savedSfx);
    } catch (e) {}

    // 1. Саундтреки (Soundtrack/)
    this.musicSources = {
      WAITING: 'assets/Sound/Soundtrack/Ambient Waiting Start btn.mp3',
      START_MENU: 'assets/Sound/Soundtrack/Start Menu Btn-Presed.mp3',
      LEVEL1: 'assets/Sound/Soundtrack/Ambient Lofi Level1.mp3',
      BOARD_LEVEL2: 'assets/Sound/Soundtrack/Gameboard Level2.mp3',
      CARD_MARKET: 'assets/Sound/Soundtrack/Card Market Level 3.mp3'
    };

    // 2. Диалоги (Dialog/)
    this.dialogSources = {
      DIALOG1: 'assets/Sound/Dialog/Dialog1.mp3',
      DIALOG2: 'assets/Sound/Dialog/Dialog2.mp3',
      DIALOG3: 'assets/Sound/Dialog/Dialog3.mp3'
    };

    // 3. Звуковые эффекты (VFX/)
    this.vfxSources = {
      eatFeeder: 'assets/Sound/VFX/eat feeder.mp3',
      hitNest: 'assets/Sound/VFX/hit the nest.mp3',
      throwEgg: 'assets/Sound/VFX/throw egg.mp3',
      dropDamage: 'assets/Sound/VFX/Drop-damage taken.mp3'
    };

    this.currentMusic = null;
    this.currentMusicKey = null;
    this.pendingMusicKey = null;

    this.currentDialog = null;
    this.currentDialogKey = null;

    events.on('sound:toggled', (enabled) => {
      this.updateAllVolumes();
    });

    this.setupAutoplayUnlock();
  }

  setupAutoplayUnlock() {
    const unlock = () => {
      this.ensureContext();
      if (this.pendingMusicKey) {
        const key = this.pendingMusicKey;
        this.pendingMusicKey = null;
        this.playMusic(key);
      } else if (this.currentMusic && this.currentMusic.paused && gameState.data.soundEnabled) {
        this.currentMusic.play().catch(() => {});
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  playMusic(key, loop = true) {
    const src = this.musicSources[key];
    if (!src) {
      console.warn(`[AudioManager] Неизвестный трек музыки: ${key}`);
      return;
    }

    if (this.currentMusicKey === key && this.currentMusic && !this.currentMusic.paused) {
      return;
    }

    this.currentMusicKey = key;

    if (!this.initialized && !this.ctx) {
      this.pendingMusicKey = key;
    }

    if (this.currentMusic) {
      try {
        this.currentMusic.pause();
        this.currentMusic.currentTime = 0;
      } catch (e) {}
      this.currentMusic = null;
    }

    try {
      const audio = new Audio(encodeURI(src));
      audio.loop = loop;
      audio.volume = gameState.data.soundEnabled ? this.musicVolume : 0;
      audio.muted = !gameState.data.soundEnabled;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          this.pendingMusicKey = key;
        });
      }
      this.currentMusic = audio;
    } catch (e) {
      console.warn('[AudioManager] Ошибка воспроизведения музыки:', e);
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      try {
        this.currentMusic.pause();
        this.currentMusic.currentTime = 0;
      } catch (e) {}
      this.currentMusic = null;
      this.currentMusicKey = null;
    }
    this.pendingMusicKey = null;
  }

  pauseMusic() {
    if (this.currentMusic) {
      try {
        this.currentMusic.pause();
      } catch (e) {}
    }
  }

  resumeMusic() {
    if (this.currentMusic && gameState.data.soundEnabled) {
      this.currentMusic.play().catch(() => {});
    }
  }

  playDialog(key, onEnded = null) {
    const src = this.dialogSources[key] || key;
    if (!src) return;

    this.stopDialog();

    this.currentDialogKey = key;

    try {
      const dialog = new Audio(encodeURI(src));
      dialog.loop = false; // Диалоги всегда проигрываются 1 раз без повтора
      dialog.volume = gameState.data.soundEnabled ? this.sfxVolume : 0;
      dialog.muted = !gameState.data.soundEnabled;

      const finishHandler = () => {
        this.currentDialog = null;
        this.currentDialogKey = null;
        if (onEnded) onEnded();
      };

      dialog.addEventListener('ended', finishHandler, { once: true });
      dialog.addEventListener('error', finishHandler, { once: true });

      const playPromise = dialog.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[AudioManager] Автовоспроизведение диалога заблокировано:', err);
          finishHandler();
        });
      }

      this.currentDialog = dialog;
    } catch (e) {
      console.warn('[AudioManager] Ошибка запуска диалога:', e);
      if (onEnded) onEnded();
    }
  }

  stopDialog() {
    if (this.currentDialog) {
      try {
        this.currentDialog.pause();
        this.currentDialog.currentTime = 0;
      } catch (e) {}
      this.currentDialog = null;
      this.currentDialogKey = null;
    }
  }

  playVfxFile(vfxKey, fallback = null) {
    if (!gameState.data.soundEnabled) return;
    const src = this.vfxSources[vfxKey];
    if (!src) {
      if (fallback) fallback();
      return;
    }

    try {
      const audio = new Audio(encodeURI(src));
      audio.volume = this.sfxVolume;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (fallback) fallback();
        });
      }
    } catch (e) {
      if (fallback) fallback();
    }
  }

  updateAllVolumes() {
    const enabled = gameState.data.soundEnabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, this.ctx.currentTime);
    }
    if (this.currentMusic) {
      this.currentMusic.muted = !enabled;
      this.currentMusic.volume = enabled ? this.musicVolume : 0;
      if (enabled && this.currentMusic.paused && this.currentMusicKey) {
        this.currentMusic.play().catch(() => {});
      }
    }
    if (this.currentDialog) {
      this.currentDialog.muted = !enabled;
      this.currentDialog.volume = enabled ? this.sfxVolume : 0;
    }
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(gameState.data.soundEnabled ? 1.0 : 0.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.initialized = true;
      }
    } catch (e) {
      console.warn('[AudioManager] Web Audio API недоступен:', e);
    }
  }

  getSfxDestination() {
    return this.sfxGain || (this.ctx ? this.ctx.destination : null);
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    try { localStorage.setItem('birday_music_volume', this.musicVolume.toString()); } catch (e) {}
    events.emit('music:volume_changed', this.musicVolume);
    if (this.currentMusic) {
      this.currentMusic.volume = gameState.data.soundEnabled ? this.musicVolume : 0;
    }
  }

  getMusicVolume() {
    return this.musicVolume;
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    try { localStorage.setItem('birday_sfx_volume', this.sfxVolume.toString()); } catch (e) {}
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
    if (this.currentDialog) {
      this.currentDialog.volume = gameState.data.soundEnabled ? this.sfxVolume : 0;
    }
  }

  getSfxVolume() {
    return this.sfxVolume;
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
      gain.connect(this.getSfxDestination());

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
    gain.connect(this.getSfxDestination());

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
    gain.connect(this.getSfxDestination());

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
    gain.connect(this.getSfxDestination());

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
      gain.connect(this.getSfxDestination());

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
      gain.connect(this.getSfxDestination());

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
      gain.connect(this.getSfxDestination());

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

  // Звук броска кубика в воздух
  playDiceThrow() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.getSfxDestination());
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  // Звук удара кубика о деревянную поверхность карты
  playDiceBounce(intensity = 1) {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420 + Math.random() * 80, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.09);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.25 * intensity, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {}
  }

  // Звук удара о землю / оглушения (Drop-damage taken.mp3)
  playDropDamage() {
    this.playVfxFile('dropDamage', () => this.playBonkSynth());
  }

  playBonk() {
    this.playDropDamage();
  }

  playBonkSynth() {
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
      gain.connect(this.getSfxDestination());
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

  // Звук монеты / розыгрыша карты
  playCoin() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.getSfxDestination());

      osc1.start(this.ctx.currentTime);
      osc1.stop(this.ctx.currentTime + 0.08);
      osc2.start(this.ctx.currentTime + 0.08);
      osc2.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }

  // Звук перелистывания страницы альбома карт
  playPageFlip() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(95, this.ctx.currentTime + 0.12);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination());
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  // Звук сокрушительного удара / взрыва атаки босса
  playImpact() {
    if (!this.ctx || !gameState.data.soundEnabled) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.28);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.28);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start();
      osc.stop(this.ctx.currentTime + 0.28);
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
      gain.connect(this.getSfxDestination());
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // Звук броска яйца (throw egg.mp3)
  playEggThrow() {
    this.playVfxFile('throwEgg', () => this.playEggThrowSynth());
  }

  playEggThrowSynth() {
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
      gain.connect(this.getSfxDestination());
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
      gain.connect(this.getSfxDestination());
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
        gain.connect(this.getSfxDestination());
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch (e) {}
  }

  // Клевание зерен в кормушке (eat feeder.mp3)
  playEatFeeder() {
    this.playVfxFile('eatFeeder', () => this.playPeckSeedSynth());
  }

  playPeckSeed() {
    this.playEatFeeder();
  }

  playPeckSeedSynth() {
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
        gain.connect(this.getSfxDestination());
        osc.start(t);
        osc.stop(t + 0.04);
      });
    } catch (e) {}
  }

  // Успешная кладка / попадание яйцом в гнездо (hit the nest.mp3)
  playNestHit() {
    this.playVfxFile('hitNest', () => this.playNestScoredSynth());
  }

  playNestScored() {
    this.playNestHit();
  }

  playNestScoredSynth() {
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
        gain.connect(this.getSfxDestination());
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
      gain.connect(this.getSfxDestination());
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
      gain.connect(this.getSfxDestination());
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
      gain.connect(this.getSfxDestination());
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
      gain.connect(this.getSfxDestination());
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
      gain.connect(this.getSfxDestination());
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
          gain.connect(this.getSfxDestination());
          osc.start(t);
          osc.stop(t + dur);
        });
      });
    } catch (e) {}
  }
}

export const audio = new AudioManager();
