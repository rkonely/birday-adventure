import { VideoManager } from './core/VideoManager.js';
import { UIManager } from './ui/UIManager.js';
import { GameLoop } from './core/GameLoop.js';
import { gameState } from './core/GameState.js';
import { events } from './core/EventManager.js';

/**
 * Главная точка входа приложения BirDay Adventure
 */
class BirDayApp {
  constructor() {
    this.videoManager = null;
    this.uiManager = null;
    this.gameLoop = null;

    this.init();
  }

  init() {
    console.log('🚀 [BirDay Adventure] Инициализация архитектуры...');

    // 1. Создаем менеджер фонового видео/плейсхолдеров
    this.videoManager = new VideoManager();

    // 2. Создаем менеджер UI и форм
    this.uiManager = new UIManager(this.videoManager);

    // 3. Запускаем игровой цикл (пока обслуживает отрисовку плейсхолдеров и анимации)
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha)
    );
    this.gameLoop.start();

    // 4. Запускаем зацикленное главное видео ожидания
    this.videoManager.playVideo('WAITING');

    // 5. Обработка готовности к этапу I
    events.on('stage:ready', (stage) => {
      console.log(`[BirDayApp] Переход к этапу: ${stage}`);
      // Здесь будет плавное переключение на Canvas платформера (Модуль 2)
    });

    console.log('✨ [BirDay Adventure] Запущено зацикленное видео ожидания!');
  }

  update(dt) {
    // В будущих модулях здесь будет обсчет физики платформера и логика босса
  }

  render(alpha) {
    // Рендер игровых слоев
  }
}

// Запуск после загрузки DOM
window.addEventListener('DOMContentLoaded', () => {
  window.app = new BirDayApp();
});
