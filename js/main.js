import { VideoManager } from './core/VideoManager.js';
import { UIManager } from './ui/UIManager.js';
import { GameLoop } from './core/GameLoop.js';
import { gameState } from './core/GameState.js';
import { audio } from './core/AudioManager.js';
import { events } from './core/EventManager.js';
import { Stage1Flight } from './stage1/Stage1Flight.js';
import { Stage1Level } from './stage1/Stage1Level.js';
import { Stage1Editor } from './stage1/Stage1Editor.js';
import { Stage2Board } from './stage2/Stage2Board.js';
import { Stage2Editor } from './stage2/Stage2Editor.js';

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
    this.stage1Editor = null; // Конструктор / Редактор уровней
    this.stage2Board = null;  // Настольная игра (Этап 2)
    this.stage2Editor = null; // Конструктор карты настольной игры (Этап 2)

    this.screenLevel2Start = document.getElementById('screen-level2-start');
    this.level2BoardCard = document.getElementById('level2-board-card');
    this.level2Backdrop = document.getElementById('level2-backdrop');
    this.btnLevel2Continue = document.getElementById('btn-level2-continue');
    this.btnSkipVideo = document.getElementById('btn-skip-video');

    this.init();
  }

  init() {
    console.log('🚀 [BirDay Adventure] Инициализация архитектуры...');

    // 1. Менеджер видео
    this.videoManager = new VideoManager();

    // 2. Менеджер UI и форм
    this.uiManager = new UIManager(this.videoManager);

    // 3. Модули:
    // - Тестовая калибровочная комната (сохранена)
    this.stage1Flight = new Stage1Flight();
    // - Полноценный уровень 1 с лесом, животными, врагами, кормушками и гнездами
    this.stage1Level = new Stage1Level();
    // - Конструктор / Редактор уровней Этапа 1
    this.stage1Editor = new Stage1Editor(this.stage1Level);
    // - Настольная игра (Этап 2)
    this.stage2Board = new Stage2Board(this.videoManager);
    // - Конструктор карты настольной игры (Этап 2)
    this.stage2Editor = new Stage2Editor(this.stage2Board);

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

    // 7. Подписки на переключение между сценами
    events.on('stage:switch_to_calibration', () => {
      this.startStage1Calibration();
    });

    events.on('stage:switch_to_level1', () => {
      this.startStage1Level();
    });

    events.on('stage:switch_to_editor', () => {
      this.startStage1Editor();
    });

    events.on('stage:switch_to_stage2_board', () => {
      this.startStage2Board();
    });

    events.on('stage:switch_to_stage2_editor', () => {
      this.startStage2Editor();
    });

    // 8. Возврат в Главное меню
    events.on('stage:exit_to_title', () => {
      this.exitToTitle();
    });

    // 9. Финиш Уровня 1 -> запуск видео End First Level и экрана LEVEL 2 START
    events.on('stage1:victory', (stats) => {
      this.handleStage1Victory(stats);
    });

    // 10. Кнопка пропуска видео
    if (this.btnSkipVideo) {
      this.btnSkipVideo.addEventListener('click', () => {
        audio.playClick();
        this.videoManager.skipVideo();
      });
    }

    // 11. Кнопки экрана LEVEL 2 START
    // Кнопка "УРОВЕНЬ 2 ▶" скрывает статистику и показывает кнопку "Продолжить приключение" в центре снизу
    const btnL2StartNext = document.getElementById('btn-level2-start-next');
    if (btnL2StartNext) {
      btnL2StartNext.addEventListener('click', () => {
        audio.playClick();
        this.showLevel2ContinueButton();
      });
    }

    // Кнопка "ПРОДОЛЖИТЬ ПРИКЛЮЧЕНИЕ!" в центре снизу -> переход на Настольную игру (Этап 2)
    if (this.btnLevel2Continue) {
      this.btnLevel2Continue.addEventListener('click', () => {
        audio.playClick();
        this.hideLevel2StartScreen();
        this.startStage2Board();
      });
    }

    const btnL2Replay = document.getElementById('btn-level2-replay');
    if (btnL2Replay) {
      btnL2Replay.addEventListener('click', () => {
        audio.playClick();
        this.hideLevel2StartScreen();
        this.startStage1Level();
      });
    }

    const btnL2Menu = document.getElementById('btn-level2-menu');
    if (btnL2Menu) {
      btnL2Menu.addEventListener('click', () => {
        audio.playClick();
        this.hideLevel2StartScreen();
        this.exitToTitle();
      });
    }

    // 12. Кнопки быстрого доступа в верхнем баре
    const btnStage2Board = document.getElementById('btn-stage2-board');
    if (btnStage2Board) {
      btnStage2Board.addEventListener('click', () => {
        if (this.stage2Board.isActive) {
          this.exitToTitle();
        } else {
          this.startStage2Board();
        }
      });
    }

    const btnStage2Editor = document.getElementById('btn-stage2-editor');
    if (btnStage2Editor) {
      btnStage2Editor.addEventListener('click', () => {
        if (this.stage2Editor.isActive) {
          this.exitToTitle();
        } else {
          this.startStage2Editor();
        }
      });
    }

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

    const btnStage1Editor = document.getElementById('btn-stage1-editor');
    if (btnStage1Editor) {
      btnStage1Editor.addEventListener('click', () => {
        if (this.stage1Editor.isActive) {
          this.exitToTitle();
        } else {
          this.startStage1Editor();
        }
      });
    }

    // Горячие клавиши:
    // F1 — Уровень 1 (Лесной полёт)
    // F2 — Калибровочная тестовая комната
    // F3 — Конструктор уровня 1
    // F4 — Настольная игра (Этап 2)
    // F5 — Конструктор карты настолки (Этап 2)
    // Escape — Выход в меню
    window.addEventListener('keydown', (e) => {
      // Игнорируем функциональные клавиши, если пользователь вводит текст
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

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
      } else if (e.code === 'F3') {
        e.preventDefault();
        if (this.stage1Editor.isActive) {
          this.exitToTitle();
        } else {
          this.startStage1Editor();
        }
      } else if (e.code === 'F4') {
        e.preventDefault();
        if (this.stage2Board.isActive) {
          this.exitToTitle();
        } else {
          this.startStage2Board();
        }
      } else if (e.code === 'F5') {
        e.preventDefault();
        if (this.stage2Editor.isActive) {
          this.exitToTitle();
        } else {
          this.startStage2Editor();
        }
      } else if (e.code === 'Escape') {
        if (this.stage1Level.isActive || this.stage1Flight.isActive || this.stage1Editor.isActive || this.stage2Board.isActive || this.stage2Editor.isActive) {
          e.preventDefault();
          this.exitToTitle();
        }
      }
    });

    console.log('✨ [BirDay Adventure] Готово к старту! [🎲 НАСТОЛКА F4] [🗺️ РЕДАКТОР 2 F5] [🛠️ РЕДАКТОР 1 F3] [🌲 УРОВЕНЬ 1 F1] [🪶 ПОЛЁТ F2].');
  }

  hideMenuScreens() {
    this.hideLevel2StartScreen();

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

  /* ==========================================================================
     Завершение 1 уровня: Видео End First Level -> Экран LEVEL 2 START
     ========================================================================== */
  handleStage1Victory(stats) {
    console.log('🏆 [BirDayApp] Финиш 1 уровня! Запуск видео "End First Level"...', stats);

    // 1. Останавливаем игровой процесс и скрываем холст
    if (this.stage1Level) {
      this.stage1Level.stop();
    }

    // 2. Скрываем экран итогов (если был открыт)
    this.hideLevel2StartScreen();

    // 3. Открываем видео-обертку
    const videoWrapper = document.getElementById('video-wrapper');
    if (videoWrapper) {
      videoWrapper.style.display = 'block';
    }

    // 4. Показываем кнопку "ПРОПУСТИТЬ ВИДЕО"
    if (this.btnSkipVideo) {
      this.btnSkipVideo.classList.remove('hidden');
    }

    // 5. Запускаем видео "End First Level .mp4"
    this.videoManager.playVideo('END_FIRST_LEVEL', () => {
      console.log('🎬 [BirDayApp] Видео завершено -> открываем экран LEVEL 2 START со статистикой!');
      this.showLevel2StartScreen(stats);
    });
  }

  showLevel2StartScreen(stats) {
    // 1. Скрываем кнопку пропуска
    if (this.btnSkipVideo) {
      this.btnSkipVideo.classList.add('hidden');
    }

    // 2. Восстанавливаем видимость доски со статистикой и подложки
    if (this.level2BoardCard) {
      this.level2BoardCard.classList.remove('hidden');
    }
    if (this.level2Backdrop) {
      this.level2Backdrop.classList.remove('hidden');
    }
    if (this.btnLevel2Continue) {
      this.btnLevel2Continue.classList.add('hidden');
    }

    // 3. Заполняем статистику персонажа за 1 уровень
    const elEggs = document.getElementById('l2-stat-eggs');
    if (elEggs) elEggs.textContent = String(stats.eggsLaid ?? 0);

    const elFeeders = document.getElementById('l2-stat-feeders');
    if (elFeeders) elFeeders.textContent = `${stats.feedersEaten ?? 0} / ${stats.totalFeeders ?? 4}`;

    const elFalls = document.getElementById('l2-stat-falls');
    if (elFalls) elFalls.textContent = String(stats.fallsCount ?? 0);

    const elTime = document.getElementById('l2-stat-time');
    if (elTime) {
      const totalSecs = Math.max(0, Math.floor(stats.levelTime || 0));
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      elTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    const elScore = document.getElementById('l2-stat-score');
    if (elScore) elScore.textContent = String(stats.score ?? 0);

    const elNests = document.getElementById('l2-stat-nests');
    if (elNests) elNests.textContent = `${stats.nestsCompleted ?? 0} / ${stats.totalNests ?? 5}`;

    const elPilot = document.getElementById('l2-pilot-name');
    if (elPilot) elPilot.textContent = stats.playerName || gameState.data.playerName || 'Пилот';

    // 4. Ставим на фон зацикленное видео "Sesond Level IDE.mp4" из папки assets/videos
    const videoWrapper = document.getElementById('video-wrapper');
    if (videoWrapper) {
      videoWrapper.style.display = 'block';
    }
    this.videoManager.playVideo('SECOND_LEVEL_IDE');

    // 5. Открываем экран LEVEL 2 START на весь экран
    if (this.screenLevel2Start) {
      this.screenLevel2Start.classList.remove('hidden');
      this.screenLevel2Start.classList.add('active');
    }

    // Звук фанфар / успеха
    audio.playSuccess();
  }

  showLevel2ContinueButton() {
    // Скрываем окно со статистикой и подложку
    if (this.level2BoardCard) {
      this.level2BoardCard.classList.add('hidden');
    }
    if (this.level2Backdrop) {
      this.level2Backdrop.classList.add('hidden');
    }

    // Показываем кнопку "ПРОДОЛЖИТЬ ПРИКЛЮЧЕНИЕ!" в центре снизу (расположение как на начальном экране)
    if (this.btnLevel2Continue) {
      this.btnLevel2Continue.classList.remove('hidden');
    }
  }

  hideLevel2StartScreen() {
    if (this.screenLevel2Start) {
      this.screenLevel2Start.classList.remove('active');
      this.screenLevel2Start.classList.add('hidden');
    }
    if (this.btnSkipVideo) {
      this.btnSkipVideo.classList.add('hidden');
    }
    if (this.btnLevel2Continue) {
      this.btnLevel2Continue.classList.add('hidden');
    }
    if (this.level2BoardCard) {
      this.level2BoardCard.classList.remove('hidden');
    }
    if (this.level2Backdrop) {
      this.level2Backdrop.classList.remove('hidden');
    }
  }

  startStage1Level() {
    // Останавливаем калибровку и редактор
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Editor) this.stage1Editor.stop();

    this.hideMenuScreens();

    // Запускаем игровой Уровень 1
    this.stage1Level.start();

    // Обновляем состояние кнопок верхнего бара
    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) btnLvl.classList.add('active');

    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) btnDev.classList.remove('active');

    const btnEd = document.getElementById('btn-stage1-editor');
    if (btnEd) btnEd.classList.remove('active');
  }

  startStage1Calibration() {
    // Останавливаем игровой уровень и редактор
    if (this.stage1Level) this.stage1Level.stop();
    if (this.stage1Editor) this.stage1Editor.stop();

    this.hideMenuScreens();

    // Запускаем калибровочную сцену на Canvas
    this.stage1Flight.start();

    // Обновляем кнопки
    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) {
      btnDev.classList.add('active');
      btnDev.querySelector('.dev-flight-text').textContent = 'В МЕНЮ';
    }

    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) btnLvl.classList.remove('active');

    const btnEd = document.getElementById('btn-stage1-editor');
    if (btnEd) btnEd.classList.remove('active');
  }

  startStage1Editor() {
    // Останавливаем калибровку и игру
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Level) this.stage1Level.stop();

    this.hideMenuScreens();

    // Запускаем Конструктор Уровня
    this.stage1Editor.start();

    const btnEd = document.getElementById('btn-stage1-editor');
    if (btnEd) btnEd.classList.add('active');

    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) btnLvl.classList.remove('active');

    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) btnDev.classList.remove('active');
  }

  startStage2Board() {
    // Останавливаем все другие сцены
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Level) this.stage1Level.stop();
    if (this.stage1Editor) this.stage1Editor.stop();
    if (this.stage2Editor) this.stage2Editor.stop();

    this.hideMenuScreens();

    // Запускаем Настольную игру
    if (this.stage2Board) {
      this.stage2Board.start();
    }

    const btnBoard = document.getElementById('btn-stage2-board');
    if (btnBoard) btnBoard.classList.add('active');

    const btnEd2 = document.getElementById('btn-stage2-editor');
    if (btnEd2) btnEd2.classList.remove('active');

    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) btnLvl.classList.remove('active');

    const btnEd = document.getElementById('btn-stage1-editor');
    if (btnEd) btnEd.classList.remove('active');

    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) btnDev.classList.remove('active');
  }

  startStage2Editor() {
    // Останавливаем все другие сцены
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Level) this.stage1Level.stop();
    if (this.stage1Editor) this.stage1Editor.stop();
    if (this.stage2Board) this.stage2Board.stop();

    this.hideMenuScreens();

    // Запускаем Конструктор карты настолки
    if (this.stage2Editor) {
      this.stage2Editor.start();
    }

    const btnEd2 = document.getElementById('btn-stage2-editor');
    if (btnEd2) btnEd2.classList.add('active');

    const btnBoard = document.getElementById('btn-stage2-board');
    if (btnBoard) btnBoard.classList.remove('active');

    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) btnLvl.classList.remove('active');

    const btnEd = document.getElementById('btn-stage1-editor');
    if (btnEd) btnEd.classList.remove('active');

    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) btnDev.classList.remove('active');
  }

  exitToTitle() {
    this.hideLevel2StartScreen();

    // Останавливаем все сцены
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Level) this.stage1Level.stop();
    if (this.stage1Editor) this.stage1Editor.stop();
    if (this.stage2Board) this.stage2Board.stop();
    if (this.stage2Editor) this.stage2Editor.stop();

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
    if (btnLvl) btnLvl.classList.remove('active');

    const btnEd = document.getElementById('btn-stage1-editor');
    if (btnEd) btnEd.classList.remove('active');

    const btnBoard = document.getElementById('btn-stage2-board');
    if (btnBoard) btnBoard.classList.remove('active');

    const btnEd2 = document.getElementById('btn-stage2-editor');
    if (btnEd2) btnEd2.classList.remove('active');
  }

  update(dt) {
    if (this.stage2Editor && this.stage2Editor.isActive) {
      this.stage2Editor.update(dt);
    } else if (this.stage2Board && this.stage2Board.isActive) {
      this.stage2Board.update(dt);
    } else if (this.stage1Editor && this.stage1Editor.isActive) {
      this.stage1Editor.update(dt);
    } else if (this.stage1Level && this.stage1Level.isActive) {
      this.stage1Level.update(dt);
    } else if (this.stage1Flight && this.stage1Flight.isActive) {
      this.stage1Flight.update(dt);
    }
  }

  render(alpha) {
    if (this.stage2Editor && this.stage2Editor.isActive) {
      this.stage2Editor.render(alpha);
    } else if (this.stage2Board && this.stage2Board.isActive) {
      this.stage2Board.render(alpha);
    } else if (this.stage1Editor && this.stage1Editor.isActive) {
      this.stage1Editor.render(alpha);
    } else if (this.stage1Level && this.stage1Level.isActive) {
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
