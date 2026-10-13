import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';
import { gameState } from '../core/GameState.js';

/**
 * Stage2Board — Игровой уровень Настольной Игры (Этап 2).
 * 
 * Архитектура:
 * - Слой 0 (фон): Зацикленное видео босса в центре (BoardGame - Center-beaver.mp4)
 * - Слой 1 (карта): Холст с Board.png (прозрачный центр открывает видео босса)
 * - Слой 2 (геймплей): Клетки поля, соединительные пути, фишка игрока, эффекты свечения
 * - Слой 3 (UI): Бросок кубика, модальные карточки событий (Good/Bad Frame)
 */
export class Stage2Board {
  constructor(videoManager) {
    this.videoManager = videoManager;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Виртуальное разрешение игрового стола (соответствует Board.png 1376x768)
    this.boardWidth = 1376;
    this.boardHeight = 768;

    this.isActive = false;
    this.isLoaded = false;

    // Ассет карты стола
    this.boardImage = new Image();
    this.boardImage.src = 'assets/Second Level/Main Board/Board.png';
    this.boardImage.onload = () => {
      this.isLoaded = true;
      console.log('🎲 [Stage2Board] Карта настолки Board.png успешно загружена!');
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

    // Кубик
    this.diceValue = 1;
    this.isRollingDice = false;
    this.diceRollAnimTimer = 0;

    // Наведение и выбор
    this.hoveredCell = null;
    this.selectedCell = null;
    this.activeEventModal = null; // если открыта карточка клетки

    // Анимации и время
    this.animTime = 0;

    // DOM UI элементы настолки
    this.uiContainer = null;

    this.bindEvents();
    this.loadBoardData();
  }

  async loadBoardData() {
    try {
      const resp = await fetch('/api/load-board');
      if (resp.ok) {
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
      } catch (e) {}
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
    }
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
        this.showCellInfoCard(clicked);
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
  start() {
    console.log('🎲 [Stage2Board] Запуск настольной игры...');
    this.isActive = true;

    // 1. Устанавливаем статус
    gameState.setStage('STAGE_2_BOARD');

    // 2. Включаем видео-обёртку и зацикленное видео с бобром в центре
    const videoWrapper = document.getElementById('video-wrapper');
    if (videoWrapper) {
      videoWrapper.style.display = 'block';
    }
    if (this.videoManager) {
      this.videoManager.playVideo('BOARD_BEAVER');
    }

    // 3. Настраиваем холст
    if (this.canvas) {
      this.canvas.style.display = 'block';
      this.canvas.width = this.boardWidth;
      this.canvas.height = this.boardHeight;
    }

    // 4. Создаем UI слой настолки (Кубик, статус, кнопки)
    this.createUI();

    // Музыка / фанфары
    audio.playSuccess();
  }

  stop() {
    this.isActive = false;
    if (this.canvas) {
      this.canvas.style.display = 'none';
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
      <!-- Верхний статус игрока (используем Status Frame) -->
      <div class="s2-status-card">
        <div class="s2-status-content">
          <div class="s2-player-info">
            <span class="s2-pilot-badge">ПИЛОТ:</span>
            <span class="s2-pilot-name">${gameState.data.playerName || 'Именинник'}</span>
          </div>
          <div class="s2-cell-status">
            <span class="s2-cell-label">КЛЕТКА:</span>
            <span id="s2-current-step" class="s2-cell-val">${this.currentCellIndex + 1} / ${this.cells.length}</span>
          </div>
        </div>
      </div>

      <!-- Нижняя контрольная панель с кубиком -->
      <div class="s2-control-panel">
        <div class="s2-dice-box" id="s2-dice-box">
          <div class="s2-dice" id="s2-dice-face">
            <span id="s2-dice-num">🎲</span>
          </div>
          <button id="btn-s2-roll" class="btn-s2-wood btn-s2-roll">
            <span>БРОСИТЬ КУБИК</span>
          </button>
        </div>
      </div>

      <!-- Всплывающая карточка события клетки -->
      <div id="s2-event-modal" class="s2-event-modal hidden">
        <div class="s2-modal-frame" id="s2-modal-frame">
          <div class="s2-modal-header">
            <span id="s2-modal-icon" class="s2-modal-icon">🎁</span>
            <h3 id="s2-modal-title" class="s2-modal-title">Событие</h3>
            <button id="btn-s2-close-modal" class="s2-modal-close" title="Закрыть">✕</button>
          </div>
          <div class="s2-modal-body">
            <p id="s2-modal-desc" class="s2-modal-desc">Описание события на клетке.</p>
          </div>
          <div class="s2-modal-actions">
            <button id="btn-s2-modal-action" class="btn-s2-wood btn-s2-action">
              <span id="s2-modal-btn-text">ПРИНЯТЬ</span>
            </button>
          </div>
        </div>
      </div>
    `;

    uiLayer.appendChild(this.uiContainer);

    // Привязка событий UI
    const btnRoll = document.getElementById('btn-s2-roll');
    if (btnRoll) {
      btnRoll.addEventListener('click', () => this.rollDice());
    }

    const btnCloseModal = document.getElementById('btn-s2-close-modal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => this.closeEventModal());
    }

    const btnAction = document.getElementById('btn-s2-modal-action');
    if (btnAction) {
      btnAction.addEventListener('click', () => this.handleEventAction());
    }
  }

  removeUI() {
    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
      this.uiContainer = null;
    }
  }

  /* ==========================================================================
     Механика броска кубика и перемещения
     ========================================================================== */
  rollDice() {
    if (this.isRollingDice || this.isMoving || this.cells.length === 0) return;

    audio.playClick();
    this.isRollingDice = true;
    this.diceRollAnimTimer = 0;

    const diceFace = document.getElementById('s2-dice-face');
    const diceNum = document.getElementById('s2-dice-num');
    const btnRoll = document.getElementById('btn-s2-roll');
    if (btnRoll) btnRoll.disabled = true;

    // Анимация вращения кубика
    let rollFrames = 0;
    const rollInterval = setInterval(() => {
      rollFrames++;
      const randVal = Math.floor(Math.random() * 6) + 1;
      if (diceNum) diceNum.textContent = String(randVal);
      if (diceFace) {
        diceFace.style.transform = `rotate(${rollFrames * 45}deg) scale(1.15)`;
      }

      if (rollFrames >= 14) {
        clearInterval(rollInterval);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        this.diceValue = finalValue;
        if (diceNum) diceNum.textContent = String(finalValue);
        if (diceFace) {
          diceFace.style.transform = 'rotate(0deg) scale(1)';
        }
        this.isRollingDice = false;

        audio.playSuccess();
        this.advancePlayer(finalValue);
      }
    }, 60);
  }

  advancePlayer(steps) {
    if (this.cells.length === 0) return;

    const targetIndex = Math.min(this.cells.length - 1, this.currentCellIndex + steps);
    this.movePath = [];

    // Строим пошаговый маршрут
    for (let i = this.currentCellIndex + 1; i <= targetIndex; i++) {
      this.movePath.push(i);
    }

    this.isMoving = true;
    this.processNextMoveStep();
  }

  processNextMoveStep() {
    if (this.movePath.length === 0) {
      this.isMoving = false;
      const btnRoll = document.getElementById('btn-s2-roll');
      if (btnRoll) btnRoll.disabled = false;

      // Прибыли на целевую клетку -> активируем событие!
      const currentCell = this.cells[this.currentCellIndex];
      if (currentCell) {
        this.triggerCellEvent(currentCell);
      }
      return;
    }

    const nextIndex = this.movePath.shift();
    this.currentCellIndex = nextIndex;

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
     События клеток (Good Frame / Bad Frame)
     ========================================================================== */
  triggerCellEvent(cell) {
    audio.playSuccess();
    this.showCellInfoCard(cell, true);
  }

  showCellInfoCard(cell, isLanding = false) {
    const modal = document.getElementById('s2-event-modal');
    const modalFrame = document.getElementById('s2-modal-frame');
    const modalIcon = document.getElementById('s2-modal-icon');
    const modalTitle = document.getElementById('s2-modal-title');
    const modalDesc = document.getElementById('s2-modal-desc');
    const btnActionText = document.getElementById('s2-modal-btn-text');

    if (!modal || !cell) return;

    modalIcon.textContent = cell.icon || '🎁';
    modalTitle.textContent = cell.title || `Клетка #${cell.index || 1}`;
    modalDesc.textContent = cell.description || 'Вы стоите на этой клетке поля.';

    if (cell.type === 'GOOD') {
      modalFrame.className = 's2-modal-frame frame-good';
      btnActionText.textContent = 'ЗАБРАТЬ ПРИЗ! ✨';
    } else if (cell.type === 'BAD') {
      modalFrame.className = 's2-modal-frame frame-bad';
      btnActionText.textContent = 'ОТСТУПИТЬ ⚠️';
    } else if (cell.type === 'BOSS') {
      modalFrame.className = 's2-modal-frame frame-boss';
      btnActionText.textContent = 'БРОСИТЬ ВЫЗОВ БОБРУ! 🦫';
    } else if (cell.type === 'FINISH') {
      modalFrame.className = 's2-modal-frame frame-good';
      btnActionText.textContent = 'ПРАЗДНОВАТЬ ПОБЕДУ! 👑';
    } else {
      modalFrame.className = 's2-modal-frame frame-normal';
      btnActionText.textContent = 'ПРОДОЛЖИТЬ ▶';
    }

    modal.classList.remove('hidden');
    this.activeEventModal = cell;
  }

  closeEventModal() {
    const modal = document.getElementById('s2-event-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.activeEventModal = null;
  }

  handleEventAction() {
    if (!this.activeEventModal) {
      this.closeEventModal();
      return;
    }

    const cell = this.activeEventModal;
    this.closeEventModal();

    if (cell.type === 'DICE_BONUS') {
      // Бонус: дополнительный бросок
      setTimeout(() => this.rollDice(), 300);
    } else if (cell.type === 'FINISH') {
      audio.playSuccess();
      alert('🎉 ПОЗДРАВЛЯЕМ! Вы прошли карту Настольной Игры!');
    }
  }

  /* ==========================================================================
     Обновление и Рендеринг (Игровой цикл)
     ========================================================================== */
  update(dt) {
    if (!this.isActive) return;

    this.animTime += dt;

    // Плавное приближение фишки игрока к целевой позиции
    const dx = this.targetVisualPos.x - this.playerVisualPos.x;
    const dy = this.targetVisualPos.y - this.playerVisualPos.y;
    this.playerVisualPos.x += dx * Math.min(1, dt * 8);
    this.playerVisualPos.y += dy * Math.min(1, dt * 8);
  }

  render(alpha) {
    if (!this.isActive || !this.ctx) return;

    // 1. Очищаем холст — благодаря этому видео снизу просвечивает сквозь дырку
    this.ctx.clearRect(0, 0, this.boardWidth, this.boardHeight);

    // 2. Отрисовываем карту Board.png
    if (this.isLoaded && this.boardImage.complete) {
      this.ctx.drawImage(this.boardImage, 0, 0, this.boardWidth, this.boardHeight);
    }

    // 3. Соединительные линии между клетками
    this.renderTrackLines();

    // 4. Отрисовка клеток
    for (let i = 0; i < this.cells.length; i++) {
      this.renderCell(this.cells[i], i);
    }

    // 5. Отрисовка фишки игрока
    this.renderPlayerPawn();
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
      this.ctx.font = 'bold 11px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(String(cell.index || index + 1), pts[0].x, pts[0].y + 9);

      // Иконка в центре ромба
      this.ctx.font = '22px sans-serif';
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
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(String(cell.index || index + 1), cell.x + 5, cell.y + 5);

      this.ctx.font = '24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(cell.icon || '🌲', cell.x + cell.width / 2, cell.y + cell.height / 2 + 2);
    }

    this.ctx.restore();
  }

  renderPlayerPawn() {
    const px = this.playerVisualPos.x;
    const py = this.playerVisualPos.y;
    const bounce = Math.sin(this.animTime * 6) * 4;

    this.ctx.save();

    // Тень под фишкой
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.ellipse(px, py + 18, 16, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Свечение фишки пилота
    this.ctx.shadowColor = '#ffb703';
    this.ctx.shadowBlur = 15;

    // Круглая фишка с рамкой
    const pawnY = py - 4 + bounce;
    this.ctx.fillStyle = '#ffb703';
    this.ctx.beginPath();
    this.ctx.arc(px, pawnY, 18, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Иконка пилота / птицы
    this.ctx.font = '20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🐦', px, pawnY);

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
