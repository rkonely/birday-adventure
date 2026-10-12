import { VideoManager } from './core/VideoManager.js';
import { UIManager } from './ui/UIManager.js';
import { GameLoop } from './core/GameLoop.js';
import { gameState } from './core/GameState.js';
import { events } from './core/EventManager.js';
import { Stage1Flight } from './stage1/Stage1Flight.js';
import { Stage1Level } from './stage1/Stage1Level.js';

/**
 * Главная точка входа приложения BirDay Adventure
 */
class BirDayApp {
  constructor() {
    this.videoManager = null;
    this.uiManager = null;
    this.gameLoop = null;
    this.stage1Flight = null; // Калибровочная тестовая комната
    this.stage1Level = null;  // Полноценный уровень 1 (Лесной Полёт)

    this.init();
  }

  init() {
    console.log('🚀 [BirDay Adventure] Инициализация архитектуры...');

    // 1. Менеджер видео
    this.videoManager = new VideoManager();

    // 2. Менеджер UI и форм
    this.uiManager = new UIManager(this.videoManager);

    // 3. Модули Этапа I:
    // - Тестовая калибровочная комната (сохранена)
    this.stage1Flight = new Stage1Flight();
    // - Полноценный уровень 1 с лесом, животными, врагами, кормушками и гнездами
    this.stage1Level = new Stage1Level();

    // 4. Игровой цикл
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha)
    );
    this.gameLoop.start();

    // 5. Запуск видео ожидания
    this.videoManager.playVideo('WAITING');

    // 6. Подписка на переход к Этапу I после видео старта (сюжетный запуск)
    events.on('stage:ready', (stage) => {
      console.log(`[BirDayApp] Переход к этапу: ${stage}`);
      if (stage === 'STAGE_1' || stage === 'STAGE_1_LEVEL') {
        this.startStage1Level();
      }
    });

    // 7. Подписки на переключение между тестовой комнатой и уровнем 1
    events.on('stage:switch_to_calibration', () => {
      this.startStage1Calibration();
    });

    events.on('stage:switch_to_level1', () => {
      this.startStage1Level();
    });

    // 8. Возврат в Главное меню
    events.on('stage:exit_to_title', () => {
      this.exitToTitle();
    });

    // 9. Кнопки быстрого тестирования в верхнем баре
    const btnDevFlight = document.getElementById('btn-dev-flight');
    if (btnDevFlight) {
      btnDevFlight.addEventListener('click', () => {
        if (this.stage1Flight.isActive) {
          this.exitToTitle();
        } else {
          this.startStage1Calibration();
        }
      });
    }

    const btnStage1Forest = document.getElementById('btn-stage1-forest');
    if (btnStage1Forest) {
      btnStage1Forest.addEventListener('click', () => {
        if (this.stage1Level.isActive) {
          this.exitToTitle();
        } else {
          this.startStage1Level();
        }
      });
    }

    // Горячие клавиши:
    // F1 — Уровень 1 (Лесной полёт)
    // F2 — Калибровочная тестовая комната
    // Escape — Выход в меню
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F1') {
        e.preventDefault();
        if (this.stage1Level.isActive) {
          this.exitToTitle();
        } else {
          this.startStage1Level();
        }
      } else if (e.code === 'F2') {
        e.preventDefault();
        if (this.stage1Flight.isActive) {
          this.exitToTitle();
        } else {
          this.startStage1Calibration();
        }
      } else if (e.code === 'Escape') {
        if (this.stage1Level.isActive || this.stage1Flight.isActive) {
          e.preventDefault();
          this.exitToTitle();
        }
      }
    });

    console.log('✨ [BirDay Adventure] Готово к старту! [🌲 УРОВЕНЬ 1] или [🪶 ПОЛЁТ] (F1 / F2).');
  }

  hideMenuScreens() {
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
  }

  startStage1Level() {
    // Останавливаем калибровочную сцену, если была активна
    if (this.stage1Flight && this.stage1Flight.isActive) {
      this.stage1Flight.stop();
    }

    this.hideMenuScreens();

    // Запускаем игровой Уровень 1
    this.stage1Level.start();

    // Обновляем состояние кнопок верхнего бара
    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) btnLvl.classList.add('active');

    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) btnDev.classList.remove('active');
  }

  startStage1Calibration() {
    // Останавливаем игровой уровень, если был активен
    if (this.stage1Level && this.stage1Level.isActive) {
      this.stage1Level.stop();
    }

    this.hideMenuScreens();

    // Запускаем калибровочную сцену на Canvas
    this.stage1Flight.start();

    // Обновляем состояние кнопок верхнего бара
    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) {
      btnDev.classList.add('active');
      btnDev.querySelector('.dev-flight-text').textContent = 'В МЕНЮ';
    }

    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) btnLvl.classList.remove('active');
  }

  exitToTitle() {
    // Останавливаем обе сцены
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Level) this.stage1Level.stop();

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

    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) {
      btnLvl.classList.remove('active');
    }
  }

  update(dt) {
    if (this.stage1Level && this.stage1Level.isActive) {
      this.stage1Level.update(dt);
    } else if (this.stage1Flight && this.stage1Flight.isActive) {
      this.stage1Flight.update(dt);
    }
  }

  render(alpha) {
    if (this.stage1Level && this.stage1Level.isActive) {
      this.stage1Level.render(alpha);
    } else if (this.stage1Flight && this.stage1Flight.isActive) {
      this.stage1Flight.render(alpha);
    }
  }
}

// Запуск после загрузки DOM
window.addEventListener('DOMContentLoaded', () => {
  window.app = new BirDayApp();
});
