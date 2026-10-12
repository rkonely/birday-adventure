import { VideoManager } from './core/VideoManager.js';
import { UIManager } from './ui/UIManager.js';
import { GameLoop } from './core/GameLoop.js';
import { gameState } from './core/GameState.js';
import { events } from './core/EventManager.js';
import { Stage1Flight } from './stage1/Stage1Flight.js';

/**
 * Главная точка входа приложения BirDay Adventure
 */
class BirDayApp {
  constructor() {
    this.videoManager = null;
    this.uiManager = null;
    this.gameLoop = null;
    this.stage1Flight = null;

    this.init();
  }

  init() {
    console.log('🚀 [BirDay Adventure] Инициализация архитектуры...');

    // 1. Менеджер видео
    this.videoManager = new VideoManager();

    // 2. Менеджер UI и форм
    this.uiManager = new UIManager(this.videoManager);

    // 3. Модуль Этапа I (Движок полета Кукушки)
    this.stage1Flight = new Stage1Flight();

    // 4. Игровой цикл
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha)
    );
    this.gameLoop.start();

    // 5. Запуск видео ожидания
    this.videoManager.playVideo('WAITING');

    // 6. Подписка на переход к Этапу I после видео старта
    events.on('stage:ready', (stage) => {
      console.log(`[BirDayApp] Переход к этапу: ${stage}`);
      if (stage === 'STAGE_1') {
        this.startStage1();
      }
    });

    // 7. Возврат из теста в Главное меню
    events.on('stage:exit_to_title', () => {
      this.exitToTitle();
    });

    // 8. Кнопка быстрого тестирования полёта в верхнем баре
    const btnDevFlight = document.getElementById('btn-dev-flight');
    if (btnDevFlight) {
      btnDevFlight.addEventListener('click', () => {
        if (this.stage1Flight.isActive) {
          this.exitToTitle();
        } else {
          this.startStage1();
        }
      });
    }

    // Горячая клавиша F2 для быстрого переключения в режим калибровки полёта
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F2') {
        e.preventDefault();
        if (this.stage1Flight.isActive) {
          this.exitToTitle();
        } else {
          this.startStage1();
        }
      }
    });

    console.log('✨ [BirDay Adventure] Готово к старту! Нажмите [ПОЛЁТ] или F2 для быстрого теста физики.');
  }

  startStage1() {
    // Скрываем видео и экраны меню
    const videoWrapper = document.getElementById('video-wrapper');
    if (videoWrapper) videoWrapper.style.display = 'none';

    const screenTitle = document.getElementById('screen-title');
    if (screenTitle) {
      screenTitle.classList.remove('active');
      screenTitle.classList.add('hidden');
    }

    const screenForm = document.getElementById('screen-form');
    if (screenForm) {
      screenForm.classList.remove('active');
      screenForm.classList.add('hidden');
    }

    // Запускаем калибровочную сцену на Canvas
    this.stage1Flight.start();

    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) {
      btnDev.classList.add('active');
      btnDev.querySelector('.dev-flight-text').textContent = 'В МЕНЮ';
    }
  }

  exitToTitle() {
    // Останавливаем Этап 1
    this.stage1Flight.stop();

    // Возвращаем фоновое видео ожидания
    const videoWrapper = document.getElementById('video-wrapper');
    if (videoWrapper) videoWrapper.style.display = 'block';
    this.videoManager.playVideo('WAITING');

    // Возвращаем титульный экран
    const screenTitle = document.getElementById('screen-title');
    if (screenTitle) {
      screenTitle.classList.remove('hidden');
      screenTitle.classList.add('active');
    }

    const screenForm = document.getElementById('screen-form');
    if (screenForm) {
      screenForm.classList.remove('active');
      screenForm.classList.add('hidden');
    }

    gameState.setStage('TITLE');

    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) {
      btnDev.classList.remove('active');
      btnDev.querySelector('.dev-flight-text').textContent = 'ПОЛЁТ';
    }
  }

  update(dt) {
    if (this.stage1Flight && this.stage1Flight.isActive) {
      this.stage1Flight.update(dt);
    }
  }

  render(alpha) {
    if (this.stage1Flight && this.stage1Flight.isActive) {
      this.stage1Flight.render(alpha);
    }
  }
}

// Запуск после загрузки DOM
window.addEventListener('DOMContentLoaded', () => {
  window.app = new BirDayApp();
});
