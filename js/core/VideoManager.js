import { gameState } from './GameState.js';

/**
 * VideoManager — управление фоновыми видео игры
 *
 * Использует реальные видео из assets/videos/:
 * - WAITING: "MainMenu - Waiting.mp4" (Зацикленное видео в главном меню)
 * - TYPING:  "MainMenu - Typing.mp4"  (Инструктор печатает / форма ввода)
 * - START:   "MainMenu - Start .mp4"  (Старт полета / подтверждение допуска)
 * - END_FIRST_LEVEL: "End First Level .mp4" (Завершение 1 уровня)
 * - SECOND_LEVEL_IDE: "Sesond Level IDE.mp4" (Тизер 2 уровня)
 */
export class VideoManager {
  constructor() {
    this.videoEl = document.getElementById('bg-video');

    // Пути к загруженным видеофайлам
    this.videoSources = {
      WAITING: 'assets/videos/MainMenu - Waiting.mp4',
      TYPING: 'assets/videos/MainMenu - Typing.mp4',
      START: 'assets/videos/MainMenu - Start .mp4',
      END_FIRST_LEVEL: 'assets/videos/End First Level .mp4',
      SECOND_LEVEL_IDE: 'assets/videos/Sesond Level IDE.mp4',
      BOARD_BEAVER: 'assets/videos/BoardGame - Center-beaver.mp4',
      BOARD_BEAVER_SPAWN: 'assets/videos/BoardGame - Center-beaver.mp4',
      BOARD_BEAVER_IDLE1: 'assets/videos/BoardGame-Center-IDE1.mp4',
      BOARD_BEAVER_IDLE2: 'assets/videos/BoardGame-Center-IDE2.mp4'
    };

    this.currentState = 'WAITING';
    this.isBoardGameMode = false;
    this._activeEndedHandler = null;

    this.initVideo();
  }

  initVideo() {
    if (!this.videoEl) return;

    this.videoEl.muted = true;
    this.videoEl.loop = true;
    this.videoEl.playsInline = true;
    this.videoEl.setAttribute('playsinline', '');

    // Запускаем видео ожидания по умолчанию
    this.playVideo('WAITING');

    // Разблокировка автоплея при первом взаимодействии пользователя
    const unlockAutoplay = () => {
      if (this.videoEl.paused) {
        this.videoEl.play().catch(() => {});
      }
      window.removeEventListener('click', unlockAutoplay);
      window.removeEventListener('keydown', unlockAutoplay);
      window.removeEventListener('touchstart', unlockAutoplay);
    };

    window.addEventListener('click', unlockAutoplay, { once: true });
    window.addEventListener('keydown', unlockAutoplay, { once: true });
    window.addEventListener('touchstart', unlockAutoplay, { once: true });
  }

  /* ==========================================================================
     Последовательность видео бобра на доске (Этап 2 Настолка)
     1. BoardGame - Center-beaver.mp4 (появление босса)
     2. Зацикленный рандом между BoardGame-Center-IDE1 и BoardGame-Center-IDE2
     ========================================================================== */
  startBoardGameBossSequence() {
    this.isBoardGameMode = true;
    const wrapper = document.getElementById('video-wrapper');
    if (wrapper) {
      wrapper.classList.add('board-game-mode');
      wrapper.style.display = 'block';
    }

    console.log('🎬 [VideoManager] Запуск босса: появление (BoardGame - Center-beaver.mp4)');
    this.playVideo('BOARD_BEAVER_SPAWN', () => {
      this.playNextBoardGameIdle();
    });
  }

  playNextBoardGameIdle() {
    if (!this.isBoardGameMode) return;

    const idleOptions = ['BOARD_BEAVER_IDLE1', 'BOARD_BEAVER_IDLE2'];
    const randomKey = idleOptions[Math.floor(Math.random() * idleOptions.length)];

    console.log(`🎬 [VideoManager] Следующая зацикленная анимация босса: ${randomKey}`);
    this.playVideo(randomKey, () => {
      if (this.isBoardGameMode) {
        this.playNextBoardGameIdle();
      }
    });
  }

  stopBoardGameBossSequence() {
    this.isBoardGameMode = false;
    const wrapper = document.getElementById('video-wrapper');
    if (wrapper) {
      wrapper.classList.remove('board-game-mode');
    }

    if (this._activeEndedHandler && this.videoEl) {
      this.videoEl.removeEventListener('ended', this._activeEndedHandler);
      this._activeEndedHandler = null;
    }
  }

  playVideo(stateKey, onEnded = null) {
    if (!this.videoEl) return;
    this.currentState = stateKey;

    const isBossVideo = stateKey === 'BOARD_BEAVER' ||
                        stateKey === 'BOARD_BEAVER_SPAWN' ||
                        stateKey === 'BOARD_BEAVER_IDLE1' ||
                        stateKey === 'BOARD_BEAVER_IDLE2';

    // Если играется любое не-боссовое видео, сбрасываем стили board-game-mode
    if (!isBossVideo && this.isBoardGameMode) {
      this.stopBoardGameBossSequence();
    }

    const src = this.videoSources[stateKey];
    if (!src) return;

    // Снимаем предыдущий обработчик ended, если был
    if (this._activeEndedHandler) {
      this.videoEl.removeEventListener('ended', this._activeEndedHandler);
      this._activeEndedHandler = null;
    }

    // Проверяем, не играет ли уже то же самое видео
    const currentSrc = decodeURIComponent(this.videoEl.currentSrc || this.videoEl.src || '');
    if (!currentSrc.includes(src)) {
      this.videoEl.src = encodeURI(src);
    }

    // Зацикливаем только стандартные меню / тизеры
    this.videoEl.loop = (stateKey === 'WAITING' || stateKey === 'TYPING' || stateKey === 'SECOND_LEVEL_IDE');

    // Управление звуком: катсцены и босс озвучиваются, если звук включен
    if (stateKey === 'END_FIRST_LEVEL' || stateKey === 'START' || stateKey === 'SECOND_LEVEL_IDE' || isBossVideo) {
      this.videoEl.muted = !gameState.data.soundEnabled;
      this.videoEl.volume = 1.0;
    } else {
      this.videoEl.muted = true;
    }

    if (onEnded && !this.videoEl.loop) {
      this._activeEndedHandler = () => {
        if (this._activeEndedHandler) {
          this.videoEl.removeEventListener('ended', this._activeEndedHandler);
          this._activeEndedHandler = null;
        }
        onEnded();
      };
      this.videoEl.addEventListener('ended', this._activeEndedHandler);
    }

    const playPromise = this.videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn(`[VideoManager] Автовоспроизведение "${stateKey}" со звуком заблокировано:`, err);
        // Запасной запуск без звука, если браузер заблокировал
        if (!this.videoEl.muted) {
          this.videoEl.muted = true;
          this.videoEl.play().catch(() => {});
        }
      });
    }
  }

  skipVideo() {
    if (this._activeEndedHandler) {
      const handler = this._activeEndedHandler;
      this.videoEl.removeEventListener('ended', handler);
      this._activeEndedHandler = null;
      try {
        this.videoEl.pause();
      } catch (e) {}
      handler();
    }
  }

  // Заглушка render для обратной совместимости с GameLoop
  render() {}
}
