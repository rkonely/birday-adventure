/**
 * VideoManager — управление фоновыми видео игры
 *
 * Использует реальные видео из assets/videos/:
 * - WAITING: "MainMenu - Waiting.mp4" (Зацикленное видео в главном меню)
 * - TYPING:  "MainMenu - Typing.mp4"  (Инструктор печатает / форма ввода)
 * - START:   "MainMenu - Start .mp4"  (Старт полета / подтверждение допуска)
 */
export class VideoManager {
  constructor() {
    this.videoEl = document.getElementById('bg-video');

    // Пути к загруженным видеофайлам
    this.videoSources = {
      WAITING: 'assets/videos/MainMenu - Waiting.mp4',
      TYPING: 'assets/videos/MainMenu - Typing.mp4',
      START: 'assets/videos/MainMenu - Start .mp4'
    };

    this.currentState = 'WAITING';

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

  playVideo(stateKey, onEnded = null) {
    if (!this.videoEl) return;
    this.currentState = stateKey;

    const src = this.videoSources[stateKey];
    if (!src) return;

    // Проверяем, не играет ли уже то же самое видео
    const currentSrc = decodeURIComponent(this.videoEl.currentSrc || this.videoEl.src || '');
    if (!currentSrc.includes(src)) {
      this.videoEl.src = encodeURI(src);
    }

    this.videoEl.loop = (stateKey === 'WAITING' || stateKey === 'TYPING');

    if (onEnded && !this.videoEl.loop) {
      const handler = () => {
        this.videoEl.removeEventListener('ended', handler);
        onEnded();
      };
      this.videoEl.addEventListener('ended', handler);
    }

    const playPromise = this.videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn(`[VideoManager] Автовоспроизведение "${stateKey}" ожидает клика пользователя:`, err);
      });
    }
  }

  // Заглушка render для обратной совместимости с GameLoop
  render() {}
}
