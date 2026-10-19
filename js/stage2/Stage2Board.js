import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';
import { gameState } from '../core/GameState.js';
import { BoardEventManager } from './BoardEventManager.js';
import { BoardGenerator } from './BoardGenerator.js';
import { EVENT_TEMPLATES } from './boardEventsData.js';

/**
 * Stage2Board — Игровой уровень Настольной Игры (Этап 2).
 * 
 * Архитектура:
 * - Слой 0 (фон): Зацикленное видео босса в центре (BoardGame - Center-beaver.mp4)
 * - Слой 1 (карта): Холст с Board.png (прозрачный центр открывает видео босса)
 * - Слой 2 (геймплей): Клетки поля, соединительные пути, фишка игрока, эффекты свечения
 * - Слой 3 (UI): Бросок кубика, модальные квесты с Cut-Scene-Boardgame.png и Big Frame.png
 */
/**
 * Вариации доски настольной игры (легко расширяется до 5 и более вариантов)
 */
export const BOARD_VARIATIONS = [
  {
    id: 'autumn-board',
    name: 'Осенняя доска',
    jsonFile: 'Board 2.json',
    altJsonFile: 'Board2.json',
    textureFile: 'autumn-board.png'
  }
];

export class Stage2Board {
  constructor(videoManager) {
    this.videoManager = videoManager;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Менеджер событий, инвентаря и квестов
    this.eventManager = new BoardEventManager(this);

    // Виртуальное разрешение игрового стола (соответствует Board.png 1376x768)
    this.boardWidth = 1376;
    this.boardHeight = 768;

    this.isActive = false;
    this.isLoaded = false;

    // Ассет карты стола — всегда используется autumn-board.png
    this.currentVariationId = 'autumn-board';
    this.currentBoardFilename = 'autumn-board.png';

    this.boardImage = new Image();
    this.boardImage.src = `assets/Second Level/Main Board/${this.currentBoardFilename}`;
    this.boardImage.onload = () => {
      this.isLoaded = true;
      console.log(`🎲 [Stage2Board] Карта настолки ${this.currentBoardFilename} (${this.currentVariationId}) успешно загружена!`);
    };

    // Данные клеток
    this.cells = [];
    this.startCellId = 'cell_1';

    // Состояние игрока
    this.currentCellIndex = 0; // индекс в массиве cells (0 = первая клетка)
    this.playerVisualPos = { x: 100, y: 620 };
    this.targetVisualPos = { x: 100, y: 620 };
    this.isMoving = false;
    this.movePath = []; // очередь шагов для плавной анимации
    this.moveTimer = 0;

    // 4 изометрические модели фигурки игрока (поворот по 4 сторонам стола)
    // 1-9: Back-Right | 10-18: Up-Right | 19-27: Up-Left | 28-36: Back-Left
    this.figureImages = {
      backRight: new Image(),
      upRight: new Image(),
      upLeft: new Image(),
      backLeft: new Image()
    };
    this.figureImages.backRight.src = 'assets/Second Level/Figure/Back-Right.png';
    this.figureImages.upRight.src = 'assets/Second Level/Figure/Up-Right.png';
    this.figureImages.upLeft.src = 'assets/Second Level/Figure/Up-Left.png';
    this.figureImages.backLeft.src = 'assets/Second Level/Figure/Back-Left.png';
    this.currentDirectionKey = 'backRight';
    this.turnEffectTimer = 0;

    // Кубик
    this.diceValue = 1;
    this.isRollingDice = false;
    this.isDiceSettled = false;
    this.diceRollAnimTimer = 0;

    // Наведение и выбор
    this.hoveredCell = null;
    this.selectedCell = null;
    this.activeEventModal = null; // если открыта карточка клетки
    this.showDebugCells = false; // В игре контуры, клеточки и иконки скрыты (видны только в редакторе)

    // Анимации и время
    this.animTime = 0;

    // Спрайты клеток из assets/Second Level/Event - Title
    this.tileImages = {};
    const savedTilesToggle = localStorage.getItem('birday_show_tile_sprites');
    this.showTileSprites = savedTilesToggle !== null ? savedTilesToggle === 'true' : true;
    this.tileTargetWidth = 64;   // целевая ширина клетки на столе (под ромб 60-64px)
    this.tileAnchorBottom = 78;  // отступ в px от низа картинки до центра ромба (для 260px высоты)
    this.preloadTileSprites();

    // Режим тестирования карты и мини-игр
    this.isTestMode = false;

    // DOM UI элементы настолки
    this.uiContainer = null;

    this.bindEvents();
    this.loadBoardData();
  }

  getVariationByIdOrTexture(key) {
    if (!key) return BOARD_VARIATIONS[0];
    return BOARD_VARIATIONS.find(v => v.id === key || v.textureFile === key || v.jsonFile === key) || BOARD_VARIATIONS[0];
  }

  setBoardTexture(filename) {
    if (!filename) return;
    this.currentBoardFilename = filename;
    try {
      localStorage.setItem('birday_board_texture', filename);
    } catch (e) { }
    this.boardImage.src = `assets/Second Level/Main Board/${filename}`;
    console.log(`🎲 [Stage2Board] Текстура доски: ${filename}`);
  }

  async setBoardVariation(variationIdOrTexture, syncPlayer = true) {
    const variation = this.getVariationByIdOrTexture(variationIdOrTexture);
    this.currentVariationId = variation.id;
    this.currentBoardFilename = variation.textureFile;

    try {
      localStorage.setItem('birday_board_variation', variation.id);
      localStorage.setItem('birday_board_texture', variation.textureFile);
    } catch (e) { }

    this.setBoardTexture(variation.textureFile);
    await this.loadBoardVariationData(variation, syncPlayer);

    events.emit('stage2:board_variation_changed', variation);
    return variation;
  }

  async toggleBoardVariation() {
    const currentIndex = BOARD_VARIATIONS.findIndex(v => v.id === this.currentVariationId);
    const nextIndex = (currentIndex + 1) % BOARD_VARIATIONS.length;
    return await this.setBoardVariation(BOARD_VARIATIONS[nextIndex].id, false);
  }

  async selectRandomBoardVariation() {
    const randomIndex = Math.floor(Math.random() * BOARD_VARIATIONS.length);
    const picked = BOARD_VARIATIONS[randomIndex];
    await this.setBoardVariation(picked.id, true);
    return picked;
  }

  async loadBoardVariationData(variation, syncPlayer = true) {
    const filesToTry = [
      `assets/Second Level/Main Board/${variation.jsonFile}`,
      variation.altJsonFile ? `assets/Second Level/Main Board/${variation.altJsonFile}` : null
    ].filter(Boolean);

    for (const fileUrl of filesToTry) {
      try {
        const resp = await fetch(fileUrl).catch(() => null);
        if (resp && resp.ok) {
          const data = await resp.json();
          if (data && Array.isArray(data.cells)) {
            this.cells = data.cells;
            this.startCellId = data.startCellId || (this.cells[0] ? this.cells[0].id : 'cell_1');
            console.log(`🎲 [Stage2Board] Загружена карта вариации "${variation.name}" (${fileUrl}): ${this.cells.length} клеток`);
            if (syncPlayer) this.syncPlayerToStart();
            return true;
          }
        }
      } catch (e) {
        console.warn(`[Stage2Board] Ошибка загрузки ${fileUrl}:`, e);
      }
    }
    return false;
  }

  async loadBoardData() {
    const curVar = this.getVariationByIdOrTexture('autumn-board');
    const loaded = await this.loadBoardVariationData(curVar, true);
    if (loaded) {
      this.generateRandomBoard(true);
      return;
    }

    try {
      let resp = await fetch('/api/load-board').catch(() => null);
      if (!resp || !resp.ok) {
        resp = await fetch('data/board_level.json').catch(() => null);
      }
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.cells)) {
          this.cells = data.cells;
          this.startCellId = data.startCellId || (this.cells[0] ? this.cells[0].id : 'cell_1');
          console.log(`🎲 [Stage2Board] Загружено ${this.cells.length} клеток из data/board_level.json`);
          this.syncPlayerToStart();
          return;
        }
      }
    } catch (e) {
      console.warn('⚠️ [Stage2Board] Ошибка загрузки с сервера, пробуем localStorage...', e);
    }

    const local = localStorage.getItem('birday_board_data');
    if (local) {
      try {
        const data = JSON.parse(local);
        if (data && Array.isArray(data.cells)) {
          this.cells = data.cells;
          this.startCellId = data.startCellId || (this.cells[0] ? this.cells[0].id : 'cell_1');
          this.syncPlayerToStart();
          return;
        }
      } catch (e) { }
    }

    // Если данных ещё нет — дефолтный набор
    this.cells = this.getDefaultCells();
    this.syncPlayerToStart();
  }

  syncPlayerToStart() {
    if (this.cells.length > 0) {
      const startCell = this.cells[0];
      this.currentCellIndex = 0;
      const center = this.getCellCenter(startCell);
      this.playerVisualPos = { x: center.x, y: center.y };
      this.targetVisualPos = { ...this.playerVisualPos };
      this.updateDirection();
    }
  }

  getFigureDirectionKey(stepNumber) {
    const total = Math.max(4, this.cells.length || 54);
    const quarter = total / 4;
    const step = Math.max(1, Math.min(total, stepNumber));

    if (step <= quarter) return 'backRight';
    if (step <= quarter * 2) return 'upRight';
    if (step <= quarter * 3) return 'upLeft';
    return 'backLeft';
  }

  showCellInfoCard(cell) {
    if (!cell || this.isMoving || this.isRollingDice) return;
    const stepNum = cell.index || (this.cells.indexOf(cell) + 1);
    const title = cell.title || `Клетка #${stepNum}`;
    const desc = cell.description || '';

    let type = 'info';
    if (cell.type === 'GOOD' || cell.type === 'DICE_BONUS') type = 'good';
    else if (cell.type === 'BAD') type = 'bad';
    else if (cell.type === 'MINIGAME') type = 'gold';

    this.showGameToast(`КЛЕТКА ${stepNum}: ${title}`, type, desc);
  }

  getFigureImage() {
    const cell = this.cells[this.currentCellIndex];
    const stepNumber = (cell && typeof cell.index === 'number') ? cell.index : (this.currentCellIndex + 1);
    const key = this.getFigureDirectionKey(stepNumber);
    return this.figureImages[key] || this.figureImages.backRight;
  }

  updateDirection() {
    const cell = this.cells[this.currentCellIndex];
    const stepNumber = (cell && typeof cell.index === 'number') ? cell.index : (this.currentCellIndex + 1);
    const newDir = this.getFigureDirectionKey(stepNumber);
    if (this.currentDirectionKey && this.currentDirectionKey !== newDir) {
      this.turnEffectTimer = 0.22; // сочный пружинящий поворот на углах
    }
    this.currentDirectionKey = newDir;
  }

  getCellPoints(cell) {
    if (cell.points && Array.isArray(cell.points) && cell.points.length === 4) {
      return cell.points;
    }
    // По умолчанию строим изометрический ромб (diamond 2:1) из x, y, width, height
    const cx = cell.x + cell.width / 2;
    const cy = cell.y + cell.height / 2;
    const hw = cell.width / 2;
    const hh = cell.height / 2;
    return [
      { x: cx, y: cy - hh }, // Верхняя вершина
      { x: cx + hw, y: cy }, // Правая вершина
      { x: cx, y: cy + hh }, // Нижняя вершина
      { x: cx - hw, y: cy }  // Левая вершина
    ];
  }

  getCellCenter(cell) {
    if (cell.points && Array.isArray(cell.points) && cell.points.length === 4) {
      return {
        x: (cell.points[0].x + cell.points[1].x + cell.points[2].x + cell.points[3].x) / 4,
        y: (cell.points[0].y + cell.points[1].y + cell.points[2].y + cell.points[3].y) / 4
      };
    }
    return {
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2
    };
  }

  isPointInPolygon(px, py, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  bindEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isActive) return;
      const pos = this.getCanvasCoords(e);
      this.hoveredCell = this.findCellAt(pos.x, pos.y);
    });

    this.canvas.addEventListener('click', (e) => {
      if (!this.isActive) return;
      const pos = this.getCanvasCoords(e);
      const clicked = this.findCellAt(pos.x, pos.y);
      if (clicked) {
        audio.playClick();
        this.selectedCell = clicked;
        const cellIdx = this.cells.indexOf(clicked);

        // В режиме тест-игры (или с зажатым Shift) клик по клетке МГНОВЕННО переносит игрока и запускает мини-игру/событие!
        if (this.isTestMode || e.shiftKey) {
          if (cellIdx !== -1) {
            this.teleportToCell(cellIdx, true);
            return;
          }
        }

        this.showCellInfoCard(clicked);
      }
    });

    // Управление клавишами
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      // Горячая клавиша [T]: скрыть / показать панель тест-режима
      if (e.code === 'KeyT' || e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') {
        e.preventDefault();
        this.toggleTestMode();
        return;
      }

      // Управление клавишей Пробел (Space): Бросок кубика -> Походить
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();

        // 1. Если открыто модальное окно события клетки — подтверждаем по Пробелу
        const questModal = document.getElementById('board-quest-modal');
        if (questModal && !questModal.classList.contains('hidden')) {
          const questBtn = document.querySelector('#board-quest-bottom-bar .btn-quest-main-btn, #board-quest-interactive .btn-board-answer');
          if (questBtn) {
            questBtn.click();
            return;
          }
        }

        // 2. Если кубик уже брошен и лежит на столе — делаем ход
        if (this.isDiceSettled && !this.isMoving) {
          this.confirmStep();
          return;
        }

        // 3. Если кубик готов к броску — бросаем
        if (!this.isRollingDice && !this.isMoving && !this.isDiceSettled) {
          this.rollDice();
          return;
        }
      }
    });

    // Глобальное отслеживание руки при зажатом кубике
    window.addEventListener('mousemove', (e) => {
      if (!this.isActive) return;
      if (this.isHoldingDice) {
        this.onDiceMouseMove(e);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isActive) return;
      if (this.isHoldingDice) {
        this.onDiceMouseUp(e);
      }
    });
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.boardWidth / rect.width;
    const scaleY = this.boardHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  findCellAt(x, y) {
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const c = this.cells[i];
      if (c.shape === 'iso' || c.points) {
        if (this.isPointInPolygon(x, y, this.getCellPoints(c))) {
          return c;
        }
      } else {
        if (x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height) {
          return c;
        }
      }
    }
    return null;
  }

  /* ==========================================================================
     Запуск и Остановка уровня
     ========================================================================== */
  start(options = {}) {
    console.log('🎲 [Stage2Board] Запуск настольной игры...', options);
    this.isActive = true;

    const isTestMode = Boolean(options && (options.isTestMode || options.testMode));
    this.isTestMode = isTestMode;
    const keepCells = Boolean(options && options.keepCells);
    const targetCellIndex = (options && typeof options.targetCellIndex === 'number') ? options.targetCellIndex : null;

    // 1. Устанавливаем статус
    gameState.setStage('STAGE_2_BOARD');
    this.isDiceSettled = false;
    this.isRollingDice = false;
    this.isMoving = false;

    // Всегда включаем отображение тайлов в настольном режиме
    this.showTileSprites = true;

    // Случайно генерируем клетки только в обычной игре (не в редакторе и не при keepCells/testMode)
    if (this.cells && this.cells.length > 0 && !keepCells && !isTestMode) {
      this.generateRandomBoard(true);
    }

    // 2. Включаем видеоряд босса в центре стола (появление -> случайный цикл IDE1 / IDE2)
    if (this.videoManager) {
      this.videoManager.startBoardGameBossSequence();
    }

    // 3. Настраиваем холст
    if (this.canvas) {
      this.canvas.style.display = 'block';
      this.canvas.width = this.boardWidth;
      this.canvas.height = this.boardHeight;
    }

    // Режим тестирования: выдаем стартовые ресурсы для комфортного тестирования всех мини-игр и покупок
    if (isTestMode) {
      if (!this.eventManager.stats.eggs || this.eventManager.stats.eggs < 30) {
        this.eventManager.stats.eggs = 30;
      }
      if (!this.eventManager.stats.rerollDice || this.eventManager.stats.rerollDice < 5) {
        this.eventManager.stats.rerollDice = 5;
      }
      if (!this.eventManager.stats.boosterPacks || this.eventManager.stats.boosterPacks < 2) {
        this.eventManager.stats.boosterPacks = 2;
      }
      this.eventManager.saveStats();
    }

    // Режим тестирования всех эффектов (?test_statuses)
    if (new URLSearchParams(window.location.search).has('test_statuses')) {
      this.eventManager.stats.poisonTurns = 4;
      this.eventManager.stats.bleedTurns = 3;
      this.eventManager.stats.bossHpPenalty = 5;
      this.eventManager.stats.reverseNextMove = true;
      this.eventManager.stats.isImmune = true;
      this.eventManager.stats.eggMultiplier = 2;
      this.eventManager.stats.isBlessed = true;
      this.eventManager.stats.hasGoldenWings = true;
      this.eventManager.stats.hasGoldenKey = true;
      this.eventManager.saveStats();
    }

    // 4. Создаем UI слой настолки (Кубик, статус, кнопки)
    this.createUI();
    this.eventManager.updateHUD();

    // Музыка для всей настольной игры (Gameboard Level2.mp3)
    audio.playMusic('BOARD_LEVEL2');

    // Если был указан целевой индекс клетки — телепортируем и запускаем событие
    if (targetCellIndex !== null && targetCellIndex >= 0 && targetCellIndex < this.cells.length) {
      setTimeout(() => {
        this.teleportToCell(targetCellIndex, true);
      }, 120);
    }
  }

  setInitialEggs(eggs) {
    const finalEggs = typeof eggs === 'number' ? Math.max(0, eggs) : 0;
    this.eventManager.stats.eggs = finalEggs;
    this.eventManager.saveStats();
    this.eventManager.updateHUD();
    console.log(`🥚 [Stage2Board] Игроку перенесено яиц из 1 этапа: ${finalEggs}`);
  }

  resetProgress(initialEggs = 0) {
    this.currentCellIndex = 0;
    this.isMoving = false;
    this.movePath = [];
    this.isDiceSettled = false;
    this.isRollingDice = false;
    if (this.cells && this.cells.length > 0) {
      const startCell = this.cells[0];
      const center = this.getCellCenter(startCell);
      this.playerVisualPos = { x: center.x, y: center.y - 25 };
      this.targetVisualPos = { x: center.x, y: center.y - 25 };
    }
    this.eventManager.resetStats(initialEggs);
  }

  stop() {
    this.isActive = false;
    this.isDiceSettled = false;
    this.isRollingDice = false;
    this.isMoving = false;
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    if (this.videoManager) {
      this.videoManager.stopBoardGameBossSequence();
    }
    if (this.eventManager && this.eventManager.modal) {
      this.eventManager.modal.close();
    }
    this.removeUI();
  }

  /* ==========================================================================
     Пользовательский интерфейс (Кубик, Панель статуса, Модальные карточки)
     ========================================================================== */
  createUI() {
    this.removeUI();

    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'stage2-board-ui';
    this.uiContainer.className = 'stage2-board-ui';

    this.uiContainer.innerHTML = `
      <!-- Верхняя панель тестирования клеток и мини-игр -->
      <div id="s2-test-mode-bar" class="s2-test-mode-bar ${this.isTestMode ? '' : 'hidden'}">
        <div class="s2-test-header-line">
          <div class="s2-test-badge">🧪 ТЕСТ-РЕЖИМ</div>
          <div class="s2-test-tip">💡 Клик по ЛЮБОЙ клетке поля сразу переносит туда и запускает мини-игру!</div>
          <button id="btn-s2-test-toggle" class="s2-test-btn s2-test-btn-close" title="Свернуть панель (горячая клавиша: T)">✕</button>
        </div>
        <div class="s2-test-controls">
          <div class="s2-test-cell-pick">
            <label class="s2-test-label" for="s2-test-cell-select">Клетка:</label>
            <select id="s2-test-cell-select" class="s2-test-select"></select>
          </div>
          <button id="btn-s2-test-jump" class="s2-test-btn s2-test-btn-jump" title="Переместиться на выбранную клетку и активировать событие">🚀 ПЕРЕЙТИ</button>
          <div class="s2-test-btn-group">
            <button id="btn-s2-test-prev" class="s2-test-btn s2-test-btn-nav" title="Предыдущая клетка (Шаг назад)">◀</button>
            <button id="btn-s2-test-next" class="s2-test-btn s2-test-btn-nav" title="Следующая клетка (Шаг вперед)">▶</button>
          </div>
          <button id="btn-s2-test-res" class="s2-test-btn s2-test-btn-res" title="+30 яиц, +5 кубиков, +3 бустера">+🥚/🎲 Ресурсы</button>
          <button id="btn-s2-test-to-editor" class="s2-test-btn s2-test-btn-editor" title="Вернуться в редактор карт">🛠️ В РЕДАКТОР</button>
        </div>
      </div>
      <button id="btn-s2-test-open" class="s2-test-float-btn ${this.isTestMode ? 'hidden' : 'hidden'}" title="Развернуть панель тестирования (T)">🧪 ТЕСТ КЛЕТОК</button>

      <!-- Левый верхний угол: Активные статусы (Баффы и Дебаффы) и Компактные уведомления -->
      <div class="s2-top-left-rack">
        <div id="s2-status-effects" class="s2-status-effects"></div>
        <div id="s2-toast-container" class="s2-toast-container"></div>
      </div>

      <!-- Верхний статус игрока (Status Frame) -->
      <div class="s2-status-card">
        <div class="s2-status-header">
          <span class="s2-status-title">${gameState.data.playerName || 'Игрок'}</span>
        </div>
        <div class="s2-status-rows">
          <div class="s2-status-row">
            <div class="s2-icon-box">
              <img src="assets/First-Level/Item/Egg/Default-Egg.png" class="s2-row-icon" alt="Яйца" />
            </div>
            <span class="s2-row-cross">X</span>
            <span id="s2-status-eggs" class="s2-row-val">${this.eventManager.stats.eggs}</span>
          </div>
          <div class="s2-status-row">
            <div class="s2-icon-box">
              <img src="assets/UI/Status-Icon-CardCount.png" class="s2-row-icon" alt="Карты" />
            </div>
            <span class="s2-row-cross">X</span>
            <span id="s2-status-cards" class="s2-row-val">${this.eventManager.stats.boosterPacks}</span>
          </div>
          <div class="s2-status-row">
            <div class="s2-icon-box">
              <img src="assets/UI/Status-Icon-DiceCount.png" class="s2-row-icon" alt="Кубики" />
            </div>
            <span class="s2-row-cross">X</span>
            <span id="s2-status-dice" class="s2-row-val">${this.eventManager.stats.rerollDice}</span>
          </div>
        </div>
      </div>

      <!-- 3D Арена броска кубика прямо на игровое поле -->
      <div id="s2-dice-3d-arena" class="s2-dice-3d-arena hidden">
        <div id="s2-dice-shadow" class="s2-dice-shadow"></div>
        <div id="s2-dice-cube" class="s2-dice-cube">
          <div class="dice-face face-front" data-face="1">
            <span class="pip pip-center"></span>
          </div>
          <div class="dice-face face-back" data-face="6">
            <span class="pip pip-tl"></span><span class="pip pip-tr"></span>
            <span class="pip pip-ml"></span><span class="pip pip-mr"></span>
            <span class="pip pip-bl"></span><span class="pip pip-br"></span>
          </div>
          <div class="dice-face face-right" data-face="2">
            <span class="pip pip-tl"></span><span class="pip pip-br"></span>
          </div>
          <div class="dice-face face-left" data-face="5">
            <span class="pip pip-tl"></span><span class="pip pip-tr"></span>
            <span class="pip pip-center"></span>
            <span class="pip pip-bl"></span><span class="pip pip-br"></span>
          </div>
          <div class="dice-face face-top" data-face="3">
            <span class="pip pip-tl"></span><span class="pip pip-center"></span><span class="pip pip-br"></span>
          </div>
          <div class="dice-face face-bottom" data-face="4">
            <span class="pip pip-tl"></span><span class="pip pip-tr"></span>
            <span class="pip pip-bl"></span><span class="pip pip-br"></span>
          </div>
        </div>
        <div id="s2-dice-result-badge" class="s2-dice-result-badge hidden">
          <span>ВЫПАЛО:</span>
          <span id="s2-dice-result-num">5</span>
        </div>
      </div>

      <!-- Нижняя контрольная панель -->
      <div class="s2-bottom-bar">
        <div class="s2-dice-widget-box" id="s2-dice-box" title="Нажмите или бросьте кубик мышкой!">
          <div class="s2-dice" id="s2-dice-face">
            <span id="s2-dice-num"></span>
          </div>
        </div>
        <button id="btn-s2-roll" class="btn-s2-throw" title="Бросить кубик (или нажмите Пробел)">
          <div class="btn-s2-throw-content">
            <span id="s2-roll-btn-text" class="btn-s2-throw-text">БРОСОК</span>
            <span class="btn-s2-sub-key">Пробел</span>
          </div>
        </button>
        <div class="s2-last-turn-wrap">
          <div class="s2-last-turn-bubble">
            <span id="s2-last-turn-num">${(this.eventManager.stats.lastRoll !== null && this.eventManager.stats.lastRoll !== undefined) ? this.eventManager.stats.lastRoll : '-'}</span>
          </div>
          <span class="s2-last-turn-label">Последний бросок</span>
        </div>
      </div>
    `;

    uiLayer.appendChild(this.uiContainer);

    // Привязка событий UI: Кнопка "БРОСОК / ПОХОДИТЬ"
    const btnRoll = document.getElementById('btn-s2-roll');
    if (btnRoll) {
      btnRoll.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isMoving || this.isRollingDice) return;
        if (this.isDiceSettled) {
          this.confirmStep();
        } else {
          this.rollDice();
        }
      });
    }

    // Виджет кубика около кнопки: зажатие ЛКМ берёт кубик в руку, чтобы потрясти и швырнуть!
    const diceBox = document.getElementById('s2-dice-box');
    if (diceBox) {
      diceBox.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Только левая кнопка мыши
        e.stopPropagation();
        if (this.isMoving || this.isRollingDice) return;

        // Если кубик уже брошен, проверяем наличие перебросов перед захватом
        if (this.isDiceSettled) {
          const rollsLeft = this.eventManager?.stats?.rerollDice || 0;
          if (rollsLeft <= 0) {
            if (audio.playError) audio.playError();
            return;
          }
          this.isConsumingRerollOnRelease = true;
        } else {
          this.isConsumingRerollOnRelease = false;
        }

        this.startHoldingDice(e);
      });
    }

    // Сам 3D-кубик на столе: тоже можно схватить мышкой и потрясти для переброса!
    const cube = document.getElementById('s2-dice-cube');
    if (cube) {
      cube.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (this.isDiceSettled && !this.isMoving && !this.isRollingDice) {
          const rollsLeft = this.eventManager?.stats?.rerollDice || 0;
          if (rollsLeft <= 0) {
            if (audio.playError) audio.playError();
            return;
          }
          this.isConsumingRerollOnRelease = true;
          this.startHoldingDice(e);
        }
      });
    }

    const badge = document.getElementById('s2-dice-result-badge');
    if (badge) {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isDiceSettled && !this.isMoving && !this.isRollingDice) {
          this.rerollDice();
        }
      });
    }

    // Клик по статусу кубиков в левом верхнем углу (X 4) тоже делает бросок/переброс
    const diceStatusRow = document.getElementById('s2-status-dice')?.closest('.s2-status-row');
    if (diceStatusRow) {
      diceStatusRow.style.cursor = 'pointer';
      diceStatusRow.title = 'Бросить / Перебросить кубик 🎲';
      diceStatusRow.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isMoving || this.isRollingDice) return;
        if (this.isDiceSettled) {
          this.rerollDice();
        } else {
          this.rollDice();
        }
      });
    }

    // Инициализируем отрисовку активных баффов и дебаффов в левом верхнем углу
    this.renderStatusEffects();

    // Инициализация панели тест-режима
    this.populateTestCellSelect();
    this.bindTestBarEvents();
  }

  populateTestCellSelect() {
    const select = document.getElementById('s2-test-cell-select');
    if (!select || !this.cells || this.cells.length === 0) return;

    select.innerHTML = '';
    this.cells.forEach((cell, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      const icon = cell.icon || '📍';
      const cellNum = cell.index || (idx + 1);
      const title = cell.title || cell.id || `Клетка #${cellNum}`;
      opt.textContent = `#${cellNum} ${icon} ${title}`;
      if (idx === this.currentCellIndex) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  }

  bindTestBarEvents() {
    const testBar = document.getElementById('s2-test-mode-bar');
    const floatBtn = document.getElementById('btn-s2-test-open');
    const select = document.getElementById('s2-test-cell-select');
    const btnJump = document.getElementById('btn-s2-test-jump');
    const btnPrev = document.getElementById('btn-s2-test-prev');
    const btnNext = document.getElementById('btn-s2-test-next');
    const btnRes = document.getElementById('btn-s2-test-res');
    const btnToEditor = document.getElementById('btn-s2-test-to-editor');
    const btnToggle = document.getElementById('btn-s2-test-toggle');

    if (btnJump) {
      btnJump.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!select) return;
        const targetIdx = parseInt(select.value, 10);
        if (!isNaN(targetIdx)) {
          audio.playClick();
          this.teleportToCell(targetIdx, true);
        }
      });
    }

    if (select) {
      select.addEventListener('change', () => {
        const targetIdx = parseInt(select.value, 10);
        if (!isNaN(targetIdx)) {
          audio.playClick();
          this.teleportToCell(targetIdx, true);
        }
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.playClick();
        const prevIdx = (this.currentCellIndex - 1 + this.cells.length) % this.cells.length;
        this.teleportToCell(prevIdx, true);
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.playClick();
        const nextIdx = (this.currentCellIndex + 1) % this.cells.length;
        this.teleportToCell(nextIdx, true);
      });
    }

    if (btnRes) {
      btnRes.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.playSuccess();
        this.eventManager.stats.eggs = (this.eventManager.stats.eggs || 0) + 30;
        this.eventManager.stats.rerollDice = (this.eventManager.stats.rerollDice || 0) + 5;
        this.eventManager.stats.boosterPacks = (this.eventManager.stats.boosterPacks || 0) + 3;
        this.eventManager.saveStats();
        this.eventManager.updateHUD();
        this.showToastNotification('🎁 Выдано: +30 яиц, +5 кубиков, +3 бустера!');
      });
    }

    if (btnToEditor) {
      btnToEditor.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.playClick();
        events.emit('stage:switch_to_stage2_editor');
      });
    }

    const toggleBar = (show) => {
      if (testBar && floatBtn) {
        if (show) {
          testBar.classList.remove('hidden');
          floatBtn.classList.add('hidden');
        } else {
          testBar.classList.add('hidden');
          floatBtn.classList.remove('hidden');
        }
      }
    };

    if (btnToggle) {
      btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBar(false);
      });
    }

    if (floatBtn) {
      floatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBar(true);
      });
    }
  }

  toggleTestMode(forcedState = null) {
    this.isTestMode = forcedState !== null ? forcedState : !this.isTestMode;
    const testBar = document.getElementById('s2-test-mode-bar');
    const floatBtn = document.getElementById('btn-s2-test-open');
    if (this.isTestMode) {
      if (testBar) testBar.classList.remove('hidden');
      if (floatBtn) floatBtn.classList.add('hidden');
      this.populateTestCellSelect();
      this.showToastNotification('🧪 Тест-режим ВКЛЮЧЕН! Клик по клеткам переносит персонажа.');
    } else {
      if (testBar) testBar.classList.add('hidden');
      if (floatBtn) floatBtn.classList.add('hidden');
      this.showToastNotification('Режим обычной игры.');
    }
  }

  removeUI() {
    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
      this.uiContainer = null;
    }
  }

  /* ==========================================================================
     Интерактивный захват, тряска в руке со звуком костей и бросок (Drag, Shake & Flick)
     ========================================================================== */
  startHoldingDice(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (this.isRollingDice || this.isMoving || this.cells.length === 0) return;

    this.isHoldingDice = true;
    this.mouseHistory = [];

    // Состояние вращения и тряски в руке
    this.handRot = { x: 25, y: -20, z: 0 };
    this.handRotVel = { x: 0, y: 0, z: 0 };
    this.shakeEnergy = 0;       // Накопленная сила тряски (0..100)
    this.lastRattleSoundTime = 0; // Кулдаун звука стука костей
    this.lastShakeSignX = 0;
    this.lastShakeSignY = 0;

    const arena = document.getElementById('s2-dice-3d-arena');
    const cube = document.getElementById('s2-dice-cube');
    const shadow = document.getElementById('s2-dice-shadow');
    const badge = document.getElementById('s2-dice-result-badge');
    const diceBox = document.getElementById('s2-dice-box');

    const arenaRect = arena ? arena.getBoundingClientRect() : { left: 0, top: 0 };
    const curX = e.clientX - arenaRect.left;
    const curY = e.clientY - arenaRect.top;

    this.mouseHistory.push({ x: curX, y: curY, time: performance.now() });

    if (arena) {
      arena.classList.remove('hidden', 'settled');
      arena.classList.add('grabbing');
    }
    if (diceBox) diceBox.classList.add('holding');
    if (badge) badge.classList.add('hidden');

    // Поднимаем кубик в воздух под курсор мыши
    if (cube && shadow) {
      cube.style.transition = 'none';
      cube.style.left = `${curX}px`;
      cube.style.top = `${curY - 55}px`;
      cube.style.transform = `translate(-50%, -50%) scale(1.28) rotateX(${this.handRot.x}deg) rotateY(${this.handRot.y}deg) rotateZ(0deg)`;

      shadow.style.left = `${curX + 10}px`;
      shadow.style.top = `${curY + 15}px`;
      shadow.style.transform = `translate(-50%, -50%) scale(0.75)`;
      shadow.style.opacity = '0.5';
      shadow.style.filter = 'blur(8px)';
    }

    // Приятный звук взятия кости в руку
    audio.playDiceBounce(0.35);

    // Запускаем цикл инерционного вращения кубика в зажатой руке
    if (this._handShakeLoopId) cancelAnimationFrame(this._handShakeLoopId);
    let lastTick = performance.now();

    const updateHandShake = (now) => {
      if (!this.isHoldingDice) return;
      const dt = Math.min(0.04, (now - lastTick) / 1000);
      lastTick = now;

      // Плавное затухание угловой скорости, если рука остановилась
      this.handRot.x += this.handRotVel.x * dt;
      this.handRot.y += this.handRotVel.y * dt;
      this.handRot.z += this.handRotVel.z * dt;

      this.handRotVel.x *= 0.88;
      this.handRotVel.y *= 0.88;
      this.handRotVel.z *= 0.88;
      this.shakeEnergy = Math.max(0, this.shakeEnergy - dt * 25);

      if (cube) {
        // Небольшая вибрация масштаба при сильной тряске
        const pulseScale = 1.28 + Math.min(0.14, this.shakeEnergy * 0.0015) * Math.sin(now * 0.04);
        cube.style.transform = `translate(-50%, -50%) scale(${pulseScale.toFixed(3)}) rotateX(${this.handRot.x.toFixed(1)}deg) rotateY(${this.handRot.y.toFixed(1)}deg) rotateZ(${this.handRot.z.toFixed(1)}deg)`;
      }

      this._handShakeLoopId = requestAnimationFrame(updateHandShake);
    };

    this._handShakeLoopId = requestAnimationFrame(updateHandShake);
  }

  onDiceMouseMove(e) {
    if (!this.isActive || !this.isHoldingDice) return;

    const arena = document.getElementById('s2-dice-3d-arena');
    const arenaRect = arena ? arena.getBoundingClientRect() : { left: 0, top: 0 };
    const curX = e.clientX - arenaRect.left;
    const curY = e.clientY - arenaRect.top;

    const now = performance.now();
    const prevPoint = this.mouseHistory.length > 0 ? this.mouseHistory[this.mouseHistory.length - 1] : null;

    this.mouseHistory.push({ x: curX, y: curY, time: now });
    if (this.mouseHistory.length > 7) this.mouseHistory.shift();

    const cube = document.getElementById('s2-dice-cube');
    const shadow = document.getElementById('s2-dice-shadow');

    if (prevPoint) {
      const dx = curX - prevPoint.x;
      const dy = curY - prevPoint.y;
      const dist = Math.hypot(dx, dy);

      // Подкручиваем кубик в ладони от каждого движения мыши
      this.handRotVel.x -= dy * 28;
      this.handRotVel.y += dx * 28;
      this.handRotVel.z += (dx - dy) * 14;

      // Проверяем смену направления движения (настоящая тряска туда-сюда!)
      const signX = Math.sign(dx);
      const signY = Math.sign(dy);
      const isDirectionFlip = (signX !== 0 && signX !== this.lastShakeSignX) ||
                              (signY !== 0 && signY !== this.lastShakeSignY);

      if (signX !== 0) this.lastShakeSignX = signX;
      if (signY !== 0) this.lastShakeSignY = signY;

      if (dist > 6) {
        this.shakeEnergy = Math.min(100, this.shakeEnergy + dist * (isDirectionFlip ? 0.8 : 0.35));
      }

      // Звук перестука костей в руке при резком движении или смене направления
      const rattleCooldown = isDirectionFlip ? 75 : 120;
      if (dist > 14 && (now - this.lastRattleSoundTime > rattleCooldown)) {
        this.lastRattleSoundTime = now;
        const rattleVolume = Math.min(0.85, Math.max(0.2, dist / 65));
        audio.playDiceBounce(rattleVolume);
      }
    }

    if (cube && shadow) {
      // Небольшой люфт кубика внутри кулака при тряске
      const jitterX = (Math.random() - 0.5) * Math.min(8, this.shakeEnergy * 0.08);
      const jitterY = (Math.random() - 0.5) * Math.min(8, this.shakeEnergy * 0.08);

      cube.style.left = `${curX + jitterX}px`;
      cube.style.top = `${curY - 55 + jitterY}px`;

      shadow.style.left = `${curX + 10}px`;
      shadow.style.top = `${curY + 15}px`;
    }
  }

  onDiceMouseUp(e) {
    if (!this.isActive || !this.isHoldingDice) return;

    this.isHoldingDice = false;
    if (this._handShakeLoopId) {
      cancelAnimationFrame(this._handShakeLoopId);
      this._handShakeLoopId = null;
    }

    const arena = document.getElementById('s2-dice-3d-arena');
    const diceBox = document.getElementById('s2-dice-box');
    if (arena) arena.classList.remove('grabbing');
    if (diceBox) diceBox.classList.remove('holding');

    // Если игрок схватил уже лежащий кубик для переброса — списываем 1 переброс
    if (this.isConsumingRerollOnRelease) {
      this.isConsumingRerollOnRelease = false;
      if (this.eventManager?.stats?.rerollDice > 0) {
        this.eventManager.stats.rerollDice--;
        this.eventManager.updateHUD();
      }
      this.isDiceSettled = false;
    }

    const arenaRect = arena ? arena.getBoundingClientRect() : { left: 0, top: 0 };
    const curX = e.clientX - arenaRect.left;
    const curY = e.clientY - arenaRect.top;
    const now = performance.now();

    // Вычисляем вектор и скорость броска (flick velocity)
    let vx = 0;
    let vy = 0;
    if (this.mouseHistory.length >= 2) {
      const oldest = this.mouseHistory[0];
      const dt = Math.max(0.016, (now - oldest.time) / 1000);
      vx = (curX - oldest.x) / dt;
      vy = (curY - oldest.y) / dt;
    }

    const flingSpeed = Math.hypot(vx, vy);
    // Бонус к подбросу от того, насколько сильно игрок тряс кубик перед броском
    const shakeBoost = (this.shakeEnergy || 0) * 3.5;

    if (flingSpeed > 160) {
      // Игрок метнул кубик движением мыши
      const clampedSpeed = Math.min(2300, Math.max(380, flingSpeed + shakeBoost));
      const factor = clampedSpeed / flingSpeed;
      const launchVx = vx * factor * 0.85;
      const launchVy = vy * factor * 0.85;
      const launchVz = Math.min(1450, 520 + clampedSpeed * 0.42 + shakeBoost);

      this.launchDicePhysics(curX, curY, launchVx, launchVy, launchVz, true);
    } else {
      // Игрок потряс кубик на месте и просто разжал ладонь -> бросок в центр стола
      this.launchDicePhysics(curX, curY, null, null, 850 + shakeBoost, false);
    }
  }

  rerollDice() {
    if (this.isRollingDice || this.isMoving) return;

    const rollsLeft = (this.eventManager && this.eventManager.stats) ? (this.eventManager.stats.rerollDice || 0) : 0;
    if (rollsLeft <= 0) {
      // Перебросы закончились! Не даем бросать кубик заново
      if (typeof audio !== 'undefined' && audio.playError) {
        audio.playError();
      }
      const statusRow = document.getElementById('s2-status-dice')?.closest('.s2-status-row');
      if (statusRow) {
        statusRow.classList.add('error-pulse');
        setTimeout(() => statusRow.classList.remove('error-pulse'), 500);
      }
      return;
    }

    this.eventManager.stats.rerollDice--;
    this.eventManager.updateHUD();
    this.rollDice();
  }

  rollDice() {
    if (this.isRollingDice || this.isMoving) return;
    this.isDiceSettled = false;

    const badge = document.getElementById('s2-dice-result-badge');
    if (badge) badge.classList.add('hidden');

    const arena = document.getElementById('s2-dice-3d-arena');
    if (arena) {
      arena.classList.remove('settled');
      arena.classList.remove('hidden');
    }

    const diceBox = document.getElementById('s2-dice-box');
    const arenaRect = arena ? arena.getBoundingClientRect() : { left: 0, top: 0, width: 1366, height: 768 };
    let startX = (arena && arena.clientWidth > 0 ? arena.clientWidth : 1366) * 0.5 - 120;
    let startY = (arena && arena.clientHeight > 0 ? arena.clientHeight : 768) - 70;
    if (diceBox) {
      diceBox.classList.remove('can-reroll');
      const boxRect = diceBox.getBoundingClientRect();
      if (boxRect.width > 0) {
        startX = boxRect.left + boxRect.width / 2 - arenaRect.left;
        startY = boxRect.top + boxRect.height / 2 - arenaRect.top;
      }
    }
    this.launchDicePhysics(startX, startY, null, null, null, false);
  }

  /* ==========================================================================
     Улучшенное ядро 3D-физики кубика (Перспектива, угловые отскоки, естественный докат)
     ========================================================================== */
  launchDicePhysics(startX, startY, customVx = null, customVy = null, customVz = null, isFlick = false) {
    if (this.isRollingDice) return;
    this.isRollingDice = true;

    if (this._diceSafetyTimeout) {
      clearTimeout(this._diceSafetyTimeout);
      this._diceSafetyTimeout = null;
    }

    // 1. Выпавшее число (1..6)
    const finalValue = Math.floor(Math.random() * 6) + 1;
    this.diceValue = finalValue;

    // Страховочный таймер
    this._diceSafetyTimeout = setTimeout(() => {
      this.onDiceSettled(finalValue);
    }, 2600);

    const btnRoll = document.getElementById('btn-s2-roll');
    if (btnRoll) {
      btnRoll.disabled = true;
      btnRoll.classList.remove('state-step');
    }

    const diceBox = document.getElementById('s2-dice-box');
    if (diceBox) {
      diceBox.classList.remove('can-reroll');
      diceBox.title = 'Кубик катится...';
    }

    const arena = document.getElementById('s2-dice-3d-arena');
    const cube = document.getElementById('s2-dice-cube');
    const shadow = document.getElementById('s2-dice-shadow');
    const badge = document.getElementById('s2-dice-result-badge');

    if (!arena || !cube || !shadow) {
      this.advancePlayer(finalValue);
      return;
    }

    arena.classList.remove('hidden');
    if (badge) badge.classList.add('hidden');
    cube.style.transition = 'none';

    audio.playDiceThrow();

    const arenaWidth = arena.clientWidth || window.innerWidth || 1366;
    const arenaHeight = arena.clientHeight || window.innerHeight || 768;

    let posX = Math.max(90, Math.min(arenaWidth - 90, startX));
    let posY = Math.max(90, Math.min(arenaHeight - 90, startY));
    let posZ = 45;

    let velX, velY, velZ;

    if (isFlick && customVx !== null) {
      velX = customVx;
      velY = customVy;
      velZ = customVz || 780;
    } else {
      // Целевая зона в центре стола с приятным разбросом
      const targetLandingX = (arenaWidth * 0.5) + (Math.random() - 0.5) * 200;
      const targetLandingY = (arenaHeight * 0.48) + (Math.random() - 0.5) * 120;
      const flightDuration = 0.52;
      velX = (targetLandingX - posX) / flightDuration;
      velY = (targetLandingY - posY) / flightDuration;
      velZ = 820 + Math.random() * 140;
    }

    const gravity = -2650;
    const airDrag = 0.992; // Сопротивление воздуха

    // Точные базовые углы граней с учётом изометрического наклона стола (35°)
    // и случайным разворотом кубика на плоскости стола (tableYaw), чтобы он не лежал по линейке
    const tableYaw = (Math.random() - 0.5) * 55; // Случайный поворот от -27° до +27°
    const baseFaceAngles = {
      1: { rx: 35,  ry: 0,   rz: tableYaw },
      2: { rx: 35,  ry: -90, rz: tableYaw },
      3: { rx: -55, ry: 0,   rz: tableYaw },
      4: { rx: 125, ry: 0,   rz: tableYaw },
      5: { rx: 35,  ry: 90,  rz: tableYaw },
      6: { rx: 215, ry: 0,   rz: tableYaw }
    };
    const targetAngles = baseFaceAngles[finalValue] || baseFaceAngles[1];

    // Начальное вращение
    const speed = Math.hypot(velX, velY);
    let rotX = Math.random() * 360;
    let rotY = Math.random() * 360;
    let rotZ = Math.random() * 360;

    let rotVelX = (velY * 1.6) + (Math.random() > 0.5 ? 650 : -650);
    let rotVelY = (-velX * 1.6) + (Math.random() > 0.5 ? 650 : -650);
    let rotVelZ = (speed * 0.9) + (Math.random() - 0.5) * 700;

    let bounces = 0;
    let isSettlingPhase = false;
    let settleProgress = 0;
    let settleStartRot = null;
    let settleTargetRot = null;
    let lastTime = performance.now();

    const minBoundX = 85, maxBoundX = arenaWidth - 85;
    const minBoundY = 75, maxBoundY = arenaHeight - 75;

    // Вспомогательная функция поиска ближайшего кратного 360 угла для плавного доката
    const getNearestAngle = (current, target, extraSpins = 0) => {
      const diff = ((target - current) % 360 + 540) % 360 - 180;
      const sign = diff >= 0 ? 1 : -1;
      return current + diff + (extraSpins * 360 * sign);
    };

    const animatePhysics = (now) => {
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;

      // Фаза финального "доката и покачивания на ребре" (последние 220 мс)
      if (isSettlingPhase) {
        settleProgress = Math.min(1, settleProgress + dt / 0.24);
        // Эффект упругой остановки на ребре (OutBack / Wobble)
        const easeOutBack = 1 + 1.8 * Math.pow(settleProgress - 1, 3) + 0.8 * Math.pow(settleProgress - 1, 2);

        posX += velX * dt;
        posY += velY * dt;
        velX *= 0.82;
        velY *= 0.82;

        // Микро-подскок ребра при перекате
        const tipHop = Math.sin(settleProgress * Math.PI) * 9 * (1 - settleProgress);

        const curRx = settleStartRot.rx + (settleTargetRot.rx - settleStartRot.rx) * easeOutBack;
        const curRy = settleStartRot.ry + (settleTargetRot.ry - settleStartRot.ry) * easeOutBack;
        const curRz = settleStartRot.rz + (settleTargetRot.rz - settleStartRot.rz) * easeOutBack;

        shadow.style.left = `${posX}px`;
        shadow.style.top = `${posY}px`;
        shadow.style.transform = `translate(-50%, -50%) scale(0.98)`;
        shadow.style.opacity = '0.82';
        shadow.style.filter = 'blur(2px)';

        cube.style.left = `${posX}px`;
        cube.style.top = `${posY - tipHop}px`;
        cube.style.transform = `translate(-50%, -50%) scale(1) rotateX(${curRx}deg) rotateY(${curRy}deg) rotateZ(${curRz}deg)`;

        if (settleProgress >= 1) {
          this.onDiceSettled(finalValue);
          return;
        }
        requestAnimationFrame(animatePhysics);
        return;
      }

      // Обычный полёт и отскоки
      velZ += gravity * dt;
      velX *= airDrag;
      velY *= airDrag;

      posX += velX * dt;
      posY += velY * dt;
      posZ += velZ * dt;

      rotX += rotVelX * dt;
      rotY += rotVelY * dt;
      rotZ += rotVelZ * dt;

      // Отскоки от деревянных бортиков стола с подкруткой
      if (posX <= minBoundX || posX >= maxBoundX) {
        posX = posX <= minBoundX ? minBoundX : maxBoundX;
        velX = -velX * 0.62;
        rotVelY = -rotVelY * 0.7 + (Math.random() - 0.5) * 250;
        rotVelZ += velY * 0.5;
        audio.playDiceBounce(0.45);
      }

      if (posY <= minBoundY || posY >= maxBoundY) {
        posY = posY <= minBoundY ? minBoundY : maxBoundY;
        velY = -velY * 0.62;
        rotVelX = -rotVelX * 0.7 + (Math.random() - 0.5) * 250;
        rotVelZ -= velX * 0.5;
        audio.playDiceBounce(0.45);
      }

      // Столкновение со столом
      if (posZ <= 0) {
        posZ = 0;
        bounces++;

        const impactStrength = Math.min(1, Math.abs(velZ) / 750);
        audio.playDiceBounce(Math.max(0.2, impactStrength));

        if (bounces < 4 && Math.abs(velZ) > 170) {
          // Упругий отскок с физическим разбросом от удара углом кубика
          velZ = -velZ * (0.46 - bounces * 0.05);

          // Кубик ударился углом — траектория слегка виляет!
          const cornerKickAngle = Math.random() * Math.PI * 2;
          const kickPower = Math.abs(velZ) * 0.22;
          velX = (velX * 0.64) + Math.cos(cornerKickAngle) * kickPower;
          velY = (velY * 0.64) + Math.sin(cornerKickAngle) * kickPower;

          // Трение стола связывает линейную скорость и вращение
          rotVelX = (velY * 1.8) + (Math.random() - 0.5) * 420;
          rotVelY = (-velX * 1.8) + (Math.random() - 0.5) * 420;
          rotVelZ *= 0.55;

          // На 3-м отскоке начинаем мягко направлять кубик к нужной грани
          if (bounces === 3) {
            const targetSnapRx = getNearestAngle(rotX, targetAngles.rx, 0);
            const targetSnapRy = getNearestAngle(rotY, targetAngles.ry, 0);
            const remainTime = Math.max(0.14, (velZ * 2) / Math.abs(gravity));
            rotVelX = (targetSnapRx - rotX) / remainTime;
            rotVelY = (targetSnapRy - rotY) / remainTime;
          }
        } else {
          // Переход в фазу финального переката на грань (без резкого CSS transition!)
          isSettlingPhase = true;
          settleProgress = 0;
          velX *= 0.35;
          velY *= 0.35;
          settleStartRot = { rx: rotX, ry: rotY, rz: rotZ };
          settleTargetRot = {
            rx: getNearestAngle(rotX, targetAngles.rx, 0),
            ry: getNearestAngle(rotY, targetAngles.ry, 0),
            rz: getNearestAngle(rotZ, targetAngles.rz, 0)
          };
          requestAnimationFrame(animatePhysics);
          return;
        }
      }

      // Перспективное увеличение кубика по мере приближения к камере (по высоте posZ)
      const perspectiveScale = 1 + Math.min(0.42, posZ / 520);

      // Динамическая тень (чем выше кубик, тем дальше и размытее тень)
      const shadowOffset = Math.min(28, posZ * 0.12);
      shadow.style.left = `${posX + shadowOffset * 0.5}px`;
      shadow.style.top = `${posY + shadowOffset}px`;
      const shadowScale = Math.max(0.32, 1 - (posZ / 420));
      shadow.style.transform = `translate(-50%, -50%) scale(${shadowScale})`;
      shadow.style.opacity = String(Math.max(0.14, 0.85 - (posZ / 360)));
      shadow.style.filter = `blur(${Math.min(16, 2 + posZ / 20)}px)`;

      // Позиция и 3D-трансформация самого куба
      cube.style.left = `${posX}px`;
      cube.style.top = `${posY - posZ}px`;
      cube.style.transform = `translate(-50%, -50%) scale(${perspectiveScale.toFixed(3)}) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg)`;

      requestAnimationFrame(animatePhysics);
    };

    requestAnimationFrame(animatePhysics);
  }

  advancePlayer(steps) {
    if (this.cells.length === 0) return;

    // Учитываем бафф ускорения хода (Попутный ветер)
    const bonusSpeed = this.eventManager.stats.speedBoost || 0;
    if (bonusSpeed > 0) {
      steps += bonusSpeed;
      this.eventManager.stats.speedBoost = 0;
      this.eventManager.saveStats();
    }

    // Проверяем реверс хода (сбитый ориентир в тумане Cell 10)
    const isReverse = this.eventManager.stats.reverseNextMove;
    let targetIndex;
    this.movePath = [];

    if (isReverse) {
      targetIndex = Math.max(0, this.currentCellIndex - steps);
      for (let i = this.currentCellIndex - 1; i >= targetIndex; i--) {
        this.movePath.push(i);
      }
      this.eventManager.setReverseNextMove(false);
    } else {
      targetIndex = Math.min(this.cells.length - 1, this.currentCellIndex + steps);
      for (let i = this.currentCellIndex + 1; i <= targetIndex; i++) {
        this.movePath.push(i);
      }
    }

    this.isMoving = true;
    this.processNextMoveStep();
  }

  stepBackward(count = 1) {
    if (this.cells.length === 0) return;
    const targetIndex = Math.max(0, this.currentCellIndex - count);
    this.movePath = [];
    for (let i = this.currentCellIndex - 1; i >= targetIndex; i--) {
      this.movePath.push(i);
    }
    this.isMoving = true;
    this.processNextMoveStep();
  }

  stepForward(count = 1) {
    if (this.cells.length === 0) return;
    const targetIndex = Math.min(this.cells.length - 1, this.currentCellIndex + count);
    this.movePath = [];
    for (let i = this.currentCellIndex + 1; i <= targetIndex; i++) {
      this.movePath.push(i);
    }
    this.isMoving = true;
    this.processNextMoveStep();
  }

  teleportToCell(index, triggerEvent = true) {
    if (!this.cells || this.cells.length === 0) return;
    this.currentCellIndex = Math.max(0, Math.min(this.cells.length - 1, index));
    this.isMoving = false;
    this.movePath = [];
    this.isRollingDice = false;
    this.isDiceSettled = false;
    this.resetDiceButtonToRoll();

    const cell = this.cells[this.currentCellIndex];
    if (cell) {
      const center = this.getCellCenter(cell);
      this.playerVisualPos = { x: center.x, y: center.y - 25 };
      this.targetVisualPos = { x: center.x, y: center.y - 25 };
      this.updateDirection();

      const elStep = document.getElementById('s2-current-step');
      if (elStep) elStep.textContent = `${this.currentCellIndex + 1} / ${this.cells.length}`;

      const selectEl = document.getElementById('s2-test-cell-select');
      if (selectEl) {
        selectEl.value = String(this.currentCellIndex);
      }

      if (triggerEvent) {
        if (this.eventManager && this.eventManager.modal) {
          this.eventManager.modal.close();
        }
        this.triggerCellEvent(cell);
      }
    }
  }

  processNextMoveStep() {
    if (this.movePath.length === 0) {
      this.isMoving = false;
      this.resetDiceButtonToRoll();

      // Прибыли на целевую клетку -> активируем квест/кат-сцену!
      const currentCell = this.cells[this.currentCellIndex];
      if (currentCell) {
        this.triggerCellEvent(currentCell);
      }
      return;
    }

    const nextIndex = this.movePath.shift();
    this.currentCellIndex = nextIndex;
    this.updateDirection();

    const elStep = document.getElementById('s2-current-step');
    if (elStep) {
      elStep.textContent = `${this.currentCellIndex + 1} / ${this.cells.length}`;
    }

    const cell = this.cells[nextIndex];
    if (cell) {
      const center = this.getCellCenter(cell);
      this.targetVisualPos = {
        x: center.x,
        y: center.y
      };
      audio.playFlap();
    }

    setTimeout(() => {
      if (this.isActive) {
        this.processNextMoveStep();
      }
    }, 320);
  }

  /* ==========================================================================
     Состояния кнопки и этапы броска кубика
     1. Бросок (кубик летит и приземляется на стол)
     2. Ожидание хода (кубик лежит, игрок видит число, кнопка "ПОХОДИТЬ")
     3. Походить (пешка шагает, кубик убирается)
     ========================================================================== */
  onDiceSettled(finalValue) {
    if (this._diceSafetyTimeout) {
      clearTimeout(this._diceSafetyTimeout);
      this._diceSafetyTimeout = null;
    }

    this.isRollingDice = false;
    this.isDiceSettled = true;

    audio.playSuccess();

    // Обновляем статистику последнего броска
    this.eventManager.setLastRoll(finalValue);
    const lastTurnEl = document.getElementById('s2-last-turn-num');
    if (lastTurnEl) lastTurnEl.textContent = String(finalValue);

    // Обновляем кнопку на "ПОХОДИТЬ"
    const btnText = document.getElementById('s2-roll-btn-text');
    if (btnText) btnText.textContent = 'ПОХОДИТЬ';

    const btnRoll = document.getElementById('btn-s2-roll');
    if (btnRoll) {
      btnRoll.disabled = false;
      btnRoll.classList.add('state-step');
      btnRoll.title = 'Сделать ход (или нажмите Пробел)';
    }

    const hudDiceNum = document.getElementById('s2-dice-num');
    if (hudDiceNum) hudDiceNum.textContent = String(finalValue);

    const rerollsLeft = (this.eventManager && this.eventManager.stats) ? (this.eventManager.stats.rerollDice || 0) : 0;
    const diceBox = document.getElementById('s2-dice-box');
    if (diceBox) {
      if (rerollsLeft > 0) {
        diceBox.classList.add('can-reroll');
        diceBox.title = `Нажмите на кубик, чтобы перебросить! (Осталось: ${rerollsLeft}) 🎲`;
      } else {
        diceBox.classList.remove('can-reroll');
        diceBox.title = 'Перебросов нет (нажмите ПОХОДИТЬ)';
      }
    }

    const arena = document.getElementById('s2-dice-3d-arena');
    if (arena) {
      if (rerollsLeft > 0) {
        arena.classList.add('settled');
        arena.title = `Нажмите на кубик, чтобы перебросить! (Осталось: ${rerollsLeft}) 🎲`;
      } else {
        arena.classList.remove('settled');
        arena.title = '';
      }
    }
  }

  confirmStep() {
    if (!this.isDiceSettled || this.isMoving) return;
    this.isDiceSettled = false;

    // Прячем кубик со стола перед началом хода
    const arena = document.getElementById('s2-dice-3d-arena');
    const cube = document.getElementById('s2-dice-cube');
    if (arena) arena.classList.add('hidden');
    if (cube) cube.style.transition = '';

    const diceBox = document.getElementById('s2-dice-box');
    if (diceBox) {
      diceBox.classList.remove('can-reroll');
      diceBox.title = 'Нажмите или бросьте кубик мышкой!';
    }

    // Блокируем кнопку на время хода пешки
    const btnRoll = document.getElementById('btn-s2-roll');
    if (btnRoll) btnRoll.disabled = true;

    // Эффекты начала хода (например, яд снимает яйцо)
    this.eventManager.onTurnStart();

    // Запускаем ход пешки по клеткам
    this.advancePlayer(this.diceValue);
  }

  resetDiceButtonToRoll() {
    this.isDiceSettled = false;
    this.isRollingDice = false;

    const btnText = document.getElementById('s2-roll-btn-text');
    if (btnText) btnText.textContent = 'БРОСОК';

    const btnRoll = document.getElementById('btn-s2-roll');
    if (btnRoll) {
      btnRoll.disabled = false;
      btnRoll.classList.remove('state-step');
      btnRoll.title = 'Бросить кубик (или нажмите Пробел)';
    }

    const diceBox = document.getElementById('s2-dice-box');
    if (diceBox) {
      diceBox.classList.remove('can-reroll');
      diceBox.title = 'Нажмите или бросьте кубик мышкой!';
    }
  }

  /* ==========================================================================
     События клеток (Квесты в Big Frame и Видео в Cut-Scene-Boardgame)
     ========================================================================== */
  triggerCellEvent(cell) {
    audio.playSuccess();
    const stepNumber = (cell && typeof cell.index === 'number') ? cell.index : (this.currentCellIndex + 1);
    this.eventManager.triggerEventForCell(cell || stepNumber, () => {
      this.resetDiceButtonToRoll();
    });
  }

  /* ==========================================================================
     Обновление и Рендеринг (Игровой цикл)
     ========================================================================== */
  update(dt) {
    if (!this.isActive) return;

    this.animTime += dt;

    if (this.turnEffectTimer > 0) {
      this.turnEffectTimer = Math.max(0, this.turnEffectTimer - dt);
    }

    // Плавное приближение фишки игрока к целевой позиции
    const dx = this.targetVisualPos.x - this.playerVisualPos.x;
    const dy = this.targetVisualPos.y - this.playerVisualPos.y;
    this.playerVisualPos.x += dx * Math.min(1, dt * 9);
    this.playerVisualPos.y += dy * Math.min(1, dt * 9);
  }

  render(alpha) {
    if (!this.isActive || !this.ctx) return;

    // 1. Очищаем холст — благодаря этому видео снизу просвечивает сквозь дырку
    this.ctx.clearRect(0, 0, this.boardWidth, this.boardHeight);

    // 2. Отрисовываем чистую карту Board.png
    if (this.isLoaded && this.boardImage.complete) {
      this.ctx.drawImage(this.boardImage, 0, 0, this.boardWidth, this.boardHeight);
    }

    // 3. Отрисовка динамических спрайтов клеток из Event - Title (01.png, 02.png, 03.png, 04.png)
    if (this.showTileSprites && this.cells.length > 0) {
      this.renderTileSprites();
    }

    // 4. Отладочные контуры, клетки и иконки (отображаются в режиме отладки/настройки)
    if (this.showDebugCells) {
      this.renderTrackLines();
      for (let i = 0; i < this.cells.length; i++) {
        this.renderCell(this.cells[i], i);
      }
    }

    // 5. Отрисовка фишки игрока
    this.renderPlayerPawn();
  }

  /* ==========================================================================
     Отрисовка и Предзагрузка Спрайтов Клеток (Event - Title)
     ========================================================================== */
  getTileImage(spriteName) {
    if (!spriteName) return null;
    if (!this.tileImages[spriteName]) {
      const img = new Image();
      let src = spriteName;
      if (!src.startsWith('assets/')) {
        src = `assets/Second Level/Event - Title/Forest/${spriteName}`;
      }
      img.src = src;
      img.onerror = () => {
        if (src.includes('/Forest/')) {
          img.src = `assets/Second Level/Event - Title/${spriteName}`;
        }
      };
      this.tileImages[spriteName] = img;
    }
    return this.tileImages[spriteName];
  }

  preloadTileSprites() {
    const keySprites = [
      'Empty-Tile1.png', 'Empty-Tile2.png', 'Empty-Tile3.png', 'Empty-Tile4.png',
      'Boss Room.png', 'closed tile.png', 'Regular Chest.png', 'Legendary Chest.png',
      'bag of eggs.png', 'clover.png', 'Magnet.png', 'Gift Box.png', 'Golden Compas.png',
      'crystal ball.png', 'campfire.png', 'Library.png', 'Landmark.png', 'basement hatch.png',
      'bottle of water.png', 'map bag.png', 'God Bless.png', 'Bless-Elixire.png',
      'Monument.png', 'Small Monument.png', 'poisonous egg.png', 'prickly bush.png',
      'Cunning Fox.png', 'Wooden Totem.png', 'Devil-Dmg.png', 'Wheel of Fortune.png',
      'Random-box.png', 'force gauge.png', 'Hourglass.png', 'bingo machine.png',
      'Toy Vending Machine.png', 'stairway to cellar.png', 'empty bowl.png', 'Bee comb.png',
      'Bell.png', 'Darts.png', 'Duck Fishing Game.png', 'Flying Dice.png', 'Golden Key.png',
      'Golden Pen.png', 'The Cursed Monument.png', 'Spring Platform.png', 'cage with a spiderweb.png',
      'portal to the abyss.png', 'mushroom house.png', 'Sharp spikes.png', 'ring toss.png',
      'scratch-off ticket.png', 'water fountain.png', 'Anvil.png', 'Blue-Crystal.png',
      'burning resin.png', 'Helping animal caught in trap.png', 'hidden beast in bushes-cat.png',
      'hollow stump.png', 'Iron Trap.png', 'mill.png', 'peace-wood.png', 'Pearl-in-Nest.png',
      'rowan.png', 'Rune-Stone.png', 'scales with pans.png', 'telescope.png', 'Toolbox.png'
    ];
    keySprites.forEach(name => this.getTileImage(name));
  }

  generateRandomBoard(silent = false) {
    if (!this.cells || this.cells.length === 0) return;

    if (!silent) audio.playDiceBounce(0.8);
    const newCells = BoardGenerator.generate(this.cells);
    this.cells = newCells;
    this.showTileSprites = true;

    // Возвращаем игрока на старт новой доски
    this.syncPlayerToStart();

    // Сохраняем сгенерированную карту в localStorage
    try {
      localStorage.setItem('birday_generated_cells', JSON.stringify(this.cells));
    } catch (e) { }

    if (!silent) {
      this.showToastNotification('⚡ Карта сгенерирована! Старт и Босс закреплены.');
    }
  }

  renderStatusEffects() {
    const container = document.getElementById('s2-status-effects');
    if (!container || !this.eventManager) return;

    const stats = this.eventManager.stats || {};
    const effects = [];

    // 1. Отравление (DeBuff) — Poison-DeBuff-icon.png
    if (stats.poisonTurns > 0) {
      effects.push({
        id: 'poison',
        type: 'debuff',
        icon: 'assets/UI/Poison-DeBuff-icon.png',
        title: 'Отравление',
        count: `${stats.poisonTurns}`,
        desc: `Токсичные споры: теряете 1 яйцо в начале каждого хода. Осталось ходов: ${stats.poisonTurns}.`
      });
    }

    // 2. Кровотечение (DeBuff) — Bleed-DeBuff-Icon.png
    if (stats.bleedTurns > 0) {
      effects.push({
        id: 'bleed',
        type: 'debuff',
        icon: 'assets/UI/Bleed-DeBuff-Icon.png',
        title: 'Кровотечение',
        count: `${stats.bleedTurns}`,
        desc: `Кровоточащая рана: ослабление на ${stats.bleedTurns} ход.`
      });
    }

    // 3. Ожог / Штраф к HP Босса (DeBuff) — Burn-Debuff-Icon.png
    if (stats.bossHpPenalty > 0 || stats.burnTurns > 0) {
      const penalty = stats.bossHpPenalty || 5;
      effects.push({
        id: 'burn',
        type: 'debuff',
        icon: 'assets/UI/Burn-Debuff-Icon.png',
        title: 'Ожог / След молнии',
        count: `-${penalty}`,
        desc: `Штраф к стойкости: -${penalty} HP в грядущей битве с Бобром-Дровосеком.`
      });
    }

    // 4. Проклятие (DeBuff) — Cursed-DeBuff-icon.png
    if (stats.reverseNextMove) {
      effects.push({
        id: 'cursed',
        type: 'debuff',
        icon: 'assets/UI/Cursed-DeBuff-icon.png',
        title: 'Лесное Проклятие',
        count: '↺',
        desc: 'Искривление пространства: следующий ход кубиком будет сделан В ОБРАТНУЮ сторону!'
      });
    }

    // 5. Щит неуязвимости / Эликсир (Buff) — Elixir-Icon.png
    if (stats.isImmune) {
      effects.push({
        id: 'immunity',
        type: 'buff',
        icon: 'assets/UI/Elixir-Icon.png',
        title: 'Щит Неуязвимости',
        count: '1',
        desc: 'Янтарный барьер: поглотит следующий урон, ядовитую ловушку или потерю ресурсов.'
      });
    }

    // 6. Удача / Магнит яиц (Buff) — Lucky-Buff-Icon.png
    if ((stats.eggMultiplier || 1) > 1) {
      effects.push({
        id: 'lucky',
        type: 'buff',
        icon: 'assets/UI/Lucky-Buff-Icon.png',
        title: 'Клевер Удачи',
        count: `x${stats.eggMultiplier}`,
        desc: `Удвоение добычи: следующее получение яиц будет умножено на ${stats.eggMultiplier}!`
      });
    }

    // 7. Благословение Леса (Buff) — GodBless-Buff-Icon.png
    if (stats.mysteriousBuff || stats.isBlessed) {
      effects.push({
        id: 'godbless',
        type: 'buff',
        icon: 'assets/UI/GodBless-Buff-Icon.png',
        title: 'Благословение Леса',
        count: '★',
        desc: 'Священный свет: дарует покровительство древних духов и защищает в пути.'
      });
    }

    // 8. Золотые Крылья / Попутный Ветер (Buff)
    if (stats.hasGoldenWings || stats.speedBoost) {
      effects.push({
        id: 'wings',
        type: 'buff',
        icon: 'assets/UI/GoldenWings-Buff-Icon.png',
        title: stats.speedBoost ? `Попутный Ветер (+${stats.speedBoost})` : 'Золотые Крылья',
        count: stats.speedBoost ? `+${stats.speedBoost}` : '✈',
        desc: stats.speedBoost ? `Порыв ветра: к следующему броску кубика автоматически добавится +${stats.speedBoost} шага!` : 'Птичья легкость в пути.'
      });
    }

    // 9. Золотой Ключ (Buff)
    if (stats.hasGoldenKey) {
      effects.push({
        id: 'key',
        type: 'buff',
        icon: 'assets/UI/GoldenKey-Buff-Icon.png',
        title: 'Золотой Ключ Врат',
        count: '🔑',
        desc: 'Древний артефакт: отпирает цепи на 54-й клетке и позволяет пройти на 2-й круг перед битвой с Боссом!'
      });
    }

    // 10. Компас Туриста (Buff)
    if (stats.hasCompass) {
      effects.push({
        id: 'compass',
        type: 'buff',
        icon: 'assets/Second Level/Event - Title/Forest/Golden Compas.png',
        title: 'Компас Туриста',
        count: '🧭',
        desc: 'Точная навигация: защищает от искривления пространства и потери ориентира в тумане.'
      });
    }

    // 11. Бафф Клевера (Buff)
    if (stats.hasCloverBuff) {
      effects.push({
        id: 'clover_buff',
        type: 'buff',
        icon: 'assets/Second Level/Event - Title/Forest/clover.png',
        title: 'Удача Четырёхлистника',
        count: '🍀',
        desc: 'Подсказка леса: уберёт 2 неверных варианта в следующем испытании или викторине!'
      });
    }

    if (effects.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    container.innerHTML = effects.map(eff => `
      <div class="s2-effect-badge s2-effect-${eff.type}" data-effect-id="${eff.id}" tabindex="0">
        <img src="${eff.icon}" class="s2-effect-img" alt="${eff.title}" />
        ${eff.count ? `<span class="s2-effect-count ${eff.type}">${eff.count}</span>` : ''}
        <div class="s2-effect-tooltip">
          <div class="s2-tooltip-title s2-tooltip-${eff.type}">${eff.title}</div>
          <div class="s2-tooltip-desc">${eff.desc}</div>
        </div>
      </div>
    `).join('');

    // При клике на иконку статуса показываем информационное уведомление
    container.querySelectorAll('.s2-effect-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const effId = badge.getAttribute('data-effect-id');
        const eff = effects.find(e => e.id === effId);
        if (eff) {
          this.showGameToast(eff.title, eff.type === 'buff' ? 'good' : 'bad', eff.desc);
        }
      });
    });
  }

  showGameToast(title, type = 'info', sub = '') {
    if (!title) return;
    let container = document.getElementById('s2-toast-container');
    if (!container) {
      container = document.getElementById('toast-container');
    }
    if (!container) {
      container = document.createElement('div');
      container.id = 's2-toast-container';
      const root = document.getElementById('game-container') || document.body;
      root.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} s2-toast`;

    if (sub) {
      toast.innerHTML = `<span>${title}</span><span class="toast-sub">${sub}</span>`;
    } else {
      toast.textContent = title;
    }

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-14px)';
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      setTimeout(() => toast.remove(), 320);
    }, 2800);
  }

  showToastNotification(text, type = 'info', sub = '') {
    this.showGameToast(text, type, sub);
  }

  renderTileSprites() {
    // В изометрии (2.5D) сортируем клетки по Y-центру (от дальнего края стола к ближнему),
    // чтобы высокие объекты (до 260px) задних клеток не перекрывали передние
    const sortedIndices = this.cells
      .map((c, i) => ({ cell: c, index: i, cy: this.getCellCenter(c).y }))
      .sort((a, b) => a.cy - b.cy);

    for (const item of sortedIndices) {
      this.renderSingleTileSprite(item.cell, item.index);
    }
  }

  renderSingleTileSprite(cell, index) {
    const tpl = cell.eventId && EVENT_TEMPLATES[cell.eventId];
    // Приоритет: спрайт из шаблона EVENT_TEMPLATES -> спрайт клетки -> дефолтный по типу
    let spriteName = (tpl && tpl.tileSprite) || cell.tileSprite || this.getDefaultTileSprite(cell.type);
    if (!spriteName) {
      spriteName = this.getDefaultTileSprite(cell.type) || 'campfire.png';
    }

    let img = this.getTileImage(spriteName);
    // Если картинка не найдена или не загрузилась — пробуем дефолтный спрайт типа клетки
    if (!img || !img.complete || img.naturalWidth === 0) {
      const fallback = this.getDefaultTileSprite(cell.type) || 'campfire.png';
      if (fallback !== spriteName) {
        img = this.getTileImage(fallback);
      }
    }
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const center = this.getCellCenter(cell);
    const isHovered = this.hoveredCell && this.hoveredCell.id === cell.id;
    const isCurrent = this.currentCellIndex === index;

    // Масштабирование ширины: приводим ширину тайла к размеру клетки (~64px)
    const targetW = this.tileTargetWidth || 64;
    const scale = targetW / img.naturalWidth;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;

    // Якорная точка (Pivot):
    // По X: строго центр (drawW / 2)
    // По Y: ромб основания находится снизу с отступом anchorBottom (78px для 260px высоты).
    // Благодаря этому основание ромба ВСЕГДА стоит на одном месте на столе, а объекты растут вверх!
    const anchorBottom = this.tileAnchorBottom || 78;
    const pivotY = img.naturalHeight - anchorBottom;

    const drawX = center.x - drawW / 2;
    const hoverLift = isHovered ? -4 : 0;
    const drawY = center.y - (pivotY * scale) + hoverLift;

    this.ctx.save();

    // Эффект свечения для текущей клетки или при наведении курсора
    if (isCurrent) {
      const pulse = Math.sin(this.animTime * 5) * 4;
      this.ctx.shadowColor = '#2ec4b6';
      this.ctx.shadowBlur = 18 + pulse;
    } else if (isHovered) {
      this.ctx.shadowColor = '#ffd166';
      this.ctx.shadowBlur = 14;
    }

    this.ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Подсказка номера шага при наведении
    if (isHovered || this.showDebugCells) {
      this.ctx.shadowColor = 'transparent';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 11px "8bitoperator", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(String(cell.index || index + 1), center.x, drawY - 4);
    }

    this.ctx.restore();
  }

  getDefaultTileSprite(type) {
    switch (type) {
      case 'START': return 'Empty-Tile4.png';
      case 'GOOD': return 'Regular Chest.png';
      case 'BAD': return 'Sharp spikes.png';
      case 'BOSS': return 'Boss Room.png';
      case 'FINISH': return 'closed tile.png';
      case 'BARRIER': return 'closed tile.png';
      case 'MINIGAME': return 'Wheel of Fortune.png';
      case 'DICE_BONUS': return 'clover.png';
      case 'NORMAL':
      default: return 'campfire.png';
    }
  }

  renderTrackLines() {
    if (this.cells.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 183, 3, 0.55)';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([8, 6]);
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    for (let i = 0; i < this.cells.length; i++) {
      const center = this.getCellCenter(this.cells[i]);
      if (i === 0) {
        this.ctx.moveTo(center.x, center.y);
      } else {
        this.ctx.lineTo(center.x, center.y);
      }
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  renderCell(cell, index) {
    const isHovered = this.hoveredCell && this.hoveredCell.id === cell.id;
    const isCurrent = this.currentCellIndex === index;
    const pulse = Math.sin(this.animTime * 4 + index) * 3;
    const center = this.getCellCenter(cell);

    this.ctx.save();

    // Свечение для активной или наведенной клетки
    if (isCurrent || isHovered) {
      this.ctx.shadowColor = isCurrent ? '#2ec4b6' : '#ffb703';
      this.ctx.shadowBlur = isCurrent ? 18 + pulse : 14;
    }

    const isIso = (cell.shape === 'iso' || cell.points);

    // Подложка клетки (стильный полупрозрачный тайл)
    const bgGrad = this.ctx.createLinearGradient(cell.x, cell.y, cell.x, cell.y + cell.height);
    if (cell.type === 'GOOD') {
      bgGrad.addColorStop(0, 'rgba(46, 196, 182, 0.75)');
      bgGrad.addColorStop(1, 'rgba(15, 76, 70, 0.9)');
    } else if (cell.type === 'BAD') {
      bgGrad.addColorStop(0, 'rgba(230, 57, 70, 0.75)');
      bgGrad.addColorStop(1, 'rgba(92, 18, 24, 0.9)');
    } else if (cell.type === 'BOSS') {
      bgGrad.addColorStop(0, 'rgba(217, 4, 41, 0.85)');
      bgGrad.addColorStop(1, 'rgba(43, 0, 8, 0.95)');
    } else if (cell.type === 'FINISH') {
      bgGrad.addColorStop(0, 'rgba(255, 209, 102, 0.9)');
      bgGrad.addColorStop(1, 'rgba(128, 90, 0, 0.95)');
    } else {
      bgGrad.addColorStop(0, 'rgba(42, 34, 26, 0.75)');
      bgGrad.addColorStop(1, 'rgba(20, 16, 12, 0.9)');
    }

    if (isIso) {
      const pts = this.getCellPoints(cell);

      // 1. Изометрическая 3D боковая грань (толщина плитки вниз)
      const depth = 6;
      this.ctx.beginPath();
      this.ctx.moveTo(pts[3].x, pts[3].y);
      this.ctx.lineTo(pts[2].x, pts[2].y);
      this.ctx.lineTo(pts[1].x, pts[1].y);
      this.ctx.lineTo(pts[1].x, pts[1].y + depth);
      this.ctx.lineTo(pts[2].x, pts[2].y + depth);
      this.ctx.lineTo(pts[3].x, pts[3].y + depth);
      this.ctx.closePath();
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      this.ctx.fill();

      // 2. Верхняя грань (изометрический ромб / полигон)
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0].x, pts[0].y);
      this.ctx.lineTo(pts[1].x, pts[1].y);
      this.ctx.lineTo(pts[2].x, pts[2].y);
      this.ctx.lineTo(pts[3].x, pts[3].y);
      this.ctx.closePath();

      this.ctx.fillStyle = bgGrad;
      this.ctx.fill();

      // Контурная подсветка (как золотая рамка в фотошопе)
      this.ctx.strokeStyle = isCurrent ? '#2ec4b6' : (isHovered ? '#ffb703' : 'rgba(220, 180, 110, 0.8)');
      this.ctx.lineWidth = isCurrent ? 3.5 : (isHovered ? 3 : 1.8);
      this.ctx.stroke();

      // Номер шага возле верхней вершины
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 11px "8bitoperator", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(String(cell.index || index + 1), pts[0].x, pts[0].y + 9);

      // Иконка в центре ромба
      this.ctx.font = '22px "8bitoperator", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(cell.icon || '🌲', center.x, center.y + 2);

    } else {
      // 2D Прямоугольная клетка
      this.ctx.fillStyle = bgGrad;
      this.roundRect(this.ctx, cell.x, cell.y, cell.width, cell.height, 10, true, false);

      this.ctx.strokeStyle = isCurrent ? '#2ec4b6' : (isHovered ? '#ffb703' : 'rgba(200, 160, 100, 0.7)');
      this.ctx.lineWidth = isCurrent ? 3 : (isHovered ? 2.5 : 1.5);
      this.roundRect(this.ctx, cell.x, cell.y, cell.width, cell.height, 10, false, true);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 12px "8bitoperator", monospace';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(String(cell.index || index + 1), cell.x + 5, cell.y + 5);

      this.ctx.font = '24px "8bitoperator", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(cell.icon || '🌲', cell.x + cell.width / 2, cell.y + cell.height / 2 + 2);
    }

    this.ctx.restore();
  }

  renderPlayerPawn() {
    const px = this.playerVisualPos.x;
    const py = this.playerVisualPos.y;

    const dx = this.targetVisualPos.x - this.playerVisualPos.x;
    const dy = this.targetVisualPos.y - this.playerVisualPos.y;
    const dist = Math.hypot(dx, dy);

    // Прыжок фишки при перемещении между клетками и легкое дыхание в покое
    const isHopping = this.isMoving && dist > 1.5;
    const jumpOffset = isHopping ? Math.abs(Math.sin(this.animTime * 14)) * 14 : 0;
    const idleBob = Math.sin(this.animTime * 4) * 2;
    const totalYOffset = jumpOffset + idleBob;

    this.ctx.save();

    // 1. Тень под фигуркой на плоскости клетки (сжимается и бледнеет во время прыжка)
    const shadowScale = Math.max(0.6, 1 - (jumpOffset / 28));
    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shadowScale})`;
    this.ctx.beginPath();
    this.ctx.ellipse(px, py + 8, 22 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. Золотистая подсветка пьедестала / активного хода
    this.ctx.shadowColor = '#ffb703';
    this.ctx.shadowBlur = 12;

    // 3. Вычисляем размеры и позицию фигурки
    const img = this.getFigureImage();
    const drawW = 72; // ширина фигурки
    const drawH = Math.round(drawW * (322 / 303)); // ~76.5px (соотношение 303x322)
    const drawX = px - drawW / 2;
    // Ноги персонажа стоят аккуратно в центре изометрической плитки
    const drawY = py - drawH + 12 - totalYOffset;

    // Эффект пружинистого поворота на углу (squash & stretch)
    let scaleX = 1;
    let scaleY = 1;
    if (this.turnEffectTimer > 0) {
      const progress = this.turnEffectTimer / 0.22;
      scaleX = 1 - Math.sin(progress * Math.PI) * 0.25;
      scaleY = 1 + Math.sin(progress * Math.PI) * 0.2;
    }

    if (img && img.complete && img.naturalWidth > 0) {
      this.ctx.save();
      // Применяем squash & stretch относительно основания фигурки
      if (scaleX !== 1 || scaleY !== 1) {
        this.ctx.translate(px, py + 8 - totalYOffset);
        this.ctx.scale(scaleX, scaleY);
        this.ctx.translate(-px, -(py + 8 - totalYOffset));
      }
      this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
      this.ctx.restore();
    } else {
      // Резервная отрисовка, пока грузится ассет
      const pawnY = py - 6 + totalYOffset;
      this.ctx.fillStyle = '#ffb703';
      this.ctx.beginPath();
      this.ctx.arc(px, pawnY, 18, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      this.ctx.font = '20px "8bitoperator", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🐦', px, pawnY);
    }

    this.ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  getDefaultCells() {
    return [
      { id: 'cell_1', index: 1, x: 100, y: 620, width: 64, height: 64, type: 'START', title: 'Старт', description: 'Начало пути', icon: '🚩' },
      { id: 'cell_2', index: 2, x: 200, y: 620, width: 64, height: 64, type: 'NORMAL', title: 'Тропа', description: 'Лесная тропа', icon: '🌲' },
      { id: 'cell_3', index: 3, x: 300, y: 600, width: 64, height: 64, type: 'GOOD', title: 'Кормушка', description: 'Вкусный бонус', icon: '🎁' },
      { id: 'cell_4', index: 4, x: 380, y: 520, width: 64, height: 64, type: 'NORMAL', title: 'Роща', description: 'Тихая роща', icon: '🍂' },
      { id: 'cell_5', index: 5, x: 380, y: 410, width: 64, height: 64, type: 'BAD', title: 'Осы', description: 'Опасные осы', icon: '⚠️' },
      { id: 'cell_6', index: 6, x: 380, y: 300, width: 64, height: 64, type: 'DICE_BONUS', title: 'Ветер', description: 'Попутный ветер', icon: '🎲' },
      { id: 'cell_7', index: 7, x: 500, y: 220, width: 64, height: 64, type: 'NORMAL', title: 'Мостик', description: 'Деревянный мост', icon: '🪵' },
      { id: 'cell_8', index: 8, x: 700, y: 180, width: 64, height: 64, type: 'GOOD', title: 'Сокровище', description: 'Золотое яйцо', icon: '🥚' },
      { id: 'cell_9', index: 9, x: 920, y: 250, width: 64, height: 64, type: 'BOSS', title: 'Логово Бобра', description: 'Бобёр на страже плотины', icon: '🦫' },
      { id: 'cell_10', index: 10, x: 860, y: 580, width: 64, height: 64, type: 'FINISH', title: 'Финиш', description: 'Победа!', icon: '👑' }
    ];
  }
}
