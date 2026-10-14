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
import { BossArena } from './stage3/BossArena.js';
import { CardMarket } from './stage3/CardMarket.js';

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
    this.cardMarket = null;   // Магазин карт / Альбом перед боссом (Этап 3)
    this.bossArena = null;    // Финальная битва с Бобром (Этап 3)

    this.screenLevel2Start = document.getElementById('screen-level2-start');
    this.level2BoardCard = document.getElementById('level2-board-card');
    this.level2Backdrop = document.getElementById('level2-backdrop');
    this.btnLevel2Continue = document.getElementById('btn-level2-continue');
    this.btnSkipVideo = document.getElementById('btn-skip-video');

    this.screenMarketIntro = document.getElementById('screen-market-intro');
    this.btnMarketIntroContinue = document.getElementById('btn-market-intro-continue');
    this.screenMarket = document.getElementById('screen-market');

    this.isAdmin = false;

    this.init();
  }

  init() {
    console.log('🚀 [BirDay Adventure] Инициализация архитектуры...');

    // 0. Секретный режим разработчика / админ-панели
    this.initAdminMode();

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
    // - Магазин карт перед боссом (Этап 3)
    this.cardMarket = new CardMarket();
    // - Финальная битва с Бобром (Этап 3)
    this.bossArena = new BossArena(this.videoManager);

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

    // Переход после настолки в экран ожидания IDE-Waiting player
    events.on('stage:switch_to_market_intro', () => {
      this.startMarketIntro();
    });

    // Переход непосредственно в магазин карт
    events.on('stage:switch_to_market', () => {
      this.startMarketScreen();
    });

    // Переход на арену босса
    events.on('stage:switch_to_boss_arena', (deck) => {
      this.startBossArena(deck);
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
        const current = this.videoManager.currentState;
        this.videoManager.skipVideo();
        if (current === 'MARKET_START') {
          this.btnSkipVideo.classList.add('hidden');
          this.startMarketScreen();
        }
      });
    }

    // Обработчик кнопки "ПРОДОЛЖИТЬ ПРИКЛЮЧЕНИЕ!" после зацикленного IDE-Waiting player
    if (this.btnMarketIntroContinue) {
      this.btnMarketIntroContinue.addEventListener('click', () => {
        audio.playClick();
        this.hideMarketIntro();
        if (this.btnSkipVideo) {
          this.btnSkipVideo.classList.remove('hidden');
        }
        const videoWrapper = document.getElementById('video-wrapper');
        if (videoWrapper) videoWrapper.style.display = 'block';
        this.videoManager.playVideo('MARKET_START', () => {
          if (this.btnSkipVideo) this.btnSkipVideo.classList.add('hidden');
          this.startMarketScreen();
        });
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
    const btnBossArena = document.getElementById('btn-boss-arena');
    if (btnBossArena) {
      btnBossArena.addEventListener('click', () => {
        if (this.bossArena.isActive) {
          this.exitToTitle();
        } else {
          this.startBossArena();
        }
      });
    }

    const btnStageMarket = document.getElementById('btn-stage-market');
    if (btnStageMarket) {
      btnStageMarket.addEventListener('click', () => {
        if (this.cardMarket && this.cardMarket.isActive) {
          this.exitToTitle();
        } else {
          this.startMarketScreen();
        }
      });
    }

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

    // Горячие клавиши (F1-F7 работают только при включенном режиме разработчика):
    window.addEventListener('keydown', (e) => {
      // Игнорируем функциональные клавиши, если пользователь вводит текст
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      // Клавиша Escape всегда открывает/закрывает Настройки
      if (e.code === 'Escape') {
        e.preventDefault();
        if (this.uiManager && this.uiManager.settingsModal) {
          this.uiManager.settingsModal.toggle();
        }
        return;
      }

      // F1-F7 защищены: работают ТОЛЬКО если активен режим разработчика (isAdmin === true)
      if (!this.isAdmin) {
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
      } else if (e.code === 'F6') {
        e.preventDefault();
        if (this.cardMarket && this.cardMarket.isActive) {
          this.exitToTitle();
        } else {
          this.startMarketScreen();
        }
      } else if (e.code === 'F7') {
        e.preventDefault();
        if (this.bossArena.isActive) {
          this.exitToTitle();
        } else {
          this.startBossArena();
        }
      }
    });

    console.log('✨ [BirDay Adventure] Готово к старту! Вход в панель разработчика: ?admin, #admin или [Ctrl+Shift+A].');
  }

  /* ==========================================================================
     Секретный режим Администратора / Разработчика (?admin, #admin, Ctrl+Shift+A)
     ========================================================================== */
  initAdminMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAdminParam = urlParams.has('admin') || urlParams.has('dev') || urlParams.get('admin') === '1' || urlParams.get('dev') === '1';
    const hasAdminHash = window.location.hash.toLowerCase().includes('admin') || window.location.hash.toLowerCase().includes('dev');
    const savedAdmin = localStorage.getItem('birday_admin_mode') === '1';

    this.isAdmin = hasAdminParam || hasAdminHash || savedAdmin;
    this.updateAdminVisibility();

    // Секретная комбинация клавиш: Ctrl + Shift + A или Shift + ~ (Тильда)
    window.addEventListener('keydown', (e) => {
      const isCtrlShiftA = e.ctrlKey && e.shiftKey && (e.code === 'KeyA' || e.key === 'A' || e.key === 'a' || e.key === 'Ф' || e.key === 'ф');
      const isTilde = e.shiftKey && (e.code === 'Backquote' || e.key === '~' || e.key === '`');
      if (isCtrlShiftA || isTilde) {
        e.preventDefault();
        this.toggleAdminMode();
      }
    });

    // Кнопка закрытия панели разработчика
    const btnAdminClose = document.getElementById('btn-admin-close');
    if (btnAdminClose) {
      btnAdminClose.addEventListener('click', () => {
        this.toggleAdminMode(false);
      });
    }

    // Слушатель смены хеша URL (#admin)
    window.addEventListener('hashchange', () => {
      if (window.location.hash.toLowerCase().includes('admin')) {
        this.toggleAdminMode(true);
      }
    });
  }

  toggleAdminMode(forceState = null) {
    this.isAdmin = forceState !== null ? forceState : !this.isAdmin;
    localStorage.setItem('birday_admin_mode', this.isAdmin ? '1' : '0');
    this.updateAdminVisibility();
    if (this.uiManager && this.uiManager.showToast) {
      this.uiManager.showToast(this.isAdmin ? '🛠️ Режим разработчика ВКЛЮЧЕН' : '🔒 Режим разработчика СКРЫТ');
    }
  }

  updateAdminVisibility() {
    const devGroup = document.getElementById('dev-buttons-group');
    if (devGroup) {
      if (this.isAdmin) {
        devGroup.classList.remove('hidden');
      } else {
        devGroup.classList.add('hidden');
      }
    }
  }

  hideMenuScreens() {
    this.hideLevel2StartScreen();
    this.hideMarketIntro();
    if (this.cardMarket) this.cardMarket.stop();

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
     Переход к Магазину Карт (IDE-Waiting player.mp4 -> Market-Start.mp4)
     ========================================================================== */
  startMarketIntro() {
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Level) this.stage1Level.stop();
    if (this.stage1Editor) this.stage1Editor.stop();
    if (this.stage2Board) this.stage2Board.stop();
    if (this.stage2Editor) this.stage2Editor.stop();
    if (this.cardMarket) this.cardMarket.stop();
    if (this.bossArena) this.bossArena.stop();

    this.hideMenuScreens();

    // Зацикленное видео IDE-Waiting player.mp4
    const videoWrapper = document.getElementById('video-wrapper');
    if (videoWrapper) videoWrapper.style.display = 'block';
    this.videoManager.playVideo('IDE_WAITING_PLAYER');

    if (this.screenMarketIntro) {
      this.screenMarketIntro.classList.remove('hidden');
      this.screenMarketIntro.classList.add('active');
    }
  }

  hideMarketIntro() {
    if (this.screenMarketIntro) {
      this.screenMarketIntro.classList.remove('active');
      this.screenMarketIntro.classList.add('hidden');
    }
  }

  startMarketScreen() {
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Level) this.stage1Level.stop();
    if (this.stage1Editor) this.stage1Editor.stop();
    if (this.stage2Board) this.stage2Board.stop();
    if (this.stage2Editor) this.stage2Editor.stop();
    if (this.bossArena) this.bossArena.stop();

    this.hideMenuScreens();
    this.hideMarketIntro();

    const videoWrapper = document.getElementById('video-wrapper');
    if (videoWrapper) videoWrapper.style.display = 'none';

    if (this.btnSkipVideo) this.btnSkipVideo.classList.add('hidden');

    if (this.cardMarket) {
      this.cardMarket.start();
    }

    const btnMkt = document.getElementById('btn-stage-market');
    if (btnMkt) btnMkt.classList.add('active');

    const btnBoss = document.getElementById('btn-boss-arena');
    if (btnBoss) btnBoss.classList.remove('active');
    const btnBoard = document.getElementById('btn-stage2-board');
    if (btnBoard) btnBoard.classList.remove('active');
    const btnEd2 = document.getElementById('btn-stage2-editor');
    if (btnEd2) btnEd2.classList.remove('active');
    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) btnLvl.classList.remove('active');
    const btnEd = document.getElementById('btn-stage1-editor');
    if (btnEd) btnEd.classList.remove('active');
    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) btnDev.classList.remove('active');
  }

  startBossArena(customDeck = null) {
    // Останавливаем все другие сцены
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Level) this.stage1Level.stop();
    if (this.stage1Editor) this.stage1Editor.stop();
    if (this.stage2Board) this.stage2Board.stop();
    if (this.stage2Editor) this.stage2Editor.stop();
    if (this.cardMarket) this.cardMarket.stop();

    this.hideMenuScreens();
    this.hideMarketIntro();

    // Запускаем Арену Босса
    if (this.bossArena) {
      this.bossArena.start(customDeck);
    }

    const btnBoss = document.getElementById('btn-boss-arena');
    if (btnBoss) btnBoss.classList.add('active');

    const btnMkt = document.getElementById('btn-stage-market');
    if (btnMkt) btnMkt.classList.remove('active');
    const btnBoard = document.getElementById('btn-stage2-board');
    if (btnBoard) btnBoard.classList.remove('active');
    const btnEd2 = document.getElementById('btn-stage2-editor');
    if (btnEd2) btnEd2.classList.remove('active');
    const btnLvl = document.getElementById('btn-stage1-forest');
    if (btnLvl) btnLvl.classList.remove('active');
    const btnEd = document.getElementById('btn-stage1-editor');
    if (btnEd) btnEd.classList.remove('active');
    const btnDev = document.getElementById('btn-dev-flight');
    if (btnDev) btnDev.classList.remove('active');
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
    this.hideMarketIntro();

    // Останавливаем все сцены
    if (this.stage1Flight) this.stage1Flight.stop();
    if (this.stage1Level) this.stage1Level.stop();
    if (this.stage1Editor) this.stage1Editor.stop();
    if (this.stage2Board) this.stage2Board.stop();
    if (this.stage2Editor) this.stage2Editor.stop();
    if (this.cardMarket) this.cardMarket.stop();
    if (this.bossArena) this.bossArena.stop();

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

    const btnMkt = document.getElementById('btn-stage-market');
    if (btnMkt) btnMkt.classList.remove('active');

    const btnBoss = document.getElementById('btn-boss-arena');
    if (btnBoss) btnBoss.classList.remove('active');
  }

  update(dt) {
    if (this.bossArena && this.bossArena.isActive) {
      this.bossArena.update(dt);
    } else if (this.stage2Editor && this.stage2Editor.isActive) {
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
    if (this.bossArena && this.bossArena.isActive) {
      this.bossArena.render(alpha);
    } else if (this.stage2Editor && this.stage2Editor.isActive) {
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
