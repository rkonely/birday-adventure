import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';
import { EVENT_TEMPLATES } from './boardEventsData.js';

/**
 * Stage2Editor — Интерактивный визуальный Конструктор / Редактор карты настольной игры (Этап 2).
 * 
 * Поддержка ИЗОМЕТРИИ (2.5D):
 * - Сквозной вид: живое видео бобра в центре + изометрическая карта Board.png
 * - Изометрическая сетка (Isometric Grid 30° / 2:1) для ровной расстановки
 * - Изометрические клетки (ромбы / Quad полигоны) с 4 вершинами
 * - Свободное искажение (Distortion): перетаскивание любой из 4 вершин (p0:Верх, p1:Право, p2:Низ, p3:Лево)
 *   для идеальной подгонки под нарисованные плитки в Фотошопе!
 * - Быстрое выравнивание: сброс в ромб 2:1, наклон влево/вправо
 * - Настройка событий, типов (Good, Bad, Boss, Dice, MiniGame, Finish), названий и описаний
 * - Сохранение в data/board_level.json через серверный API и в localStorage (Ctrl+S)
 * - Экспорт/Импорт JSON и кнопка [▶️ Играть / Проверить карту]
 */
export class Stage2Editor {
  constructor(stage2Board) {
    this.stage2Board = stage2Board;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.boardWidth = 1376;
    this.boardHeight = 768;

    this.isActive = false;

    // Ссылки на карту и видео
    this.boardImage = stage2Board.boardImage;

    // Данные клеток
    this.cells = [];

    // Инструменты: 'select' | 'add'
    this.currentTool = 'select';
    
    // Режимы сетки: 'iso' (изометрия 30°) | 'rect' (2D 20px) | 'none' (выкл)
    this.gridMode = 'iso';
    this.gridSpacing = 35; // шаг изометрической сетки

    // Выбранная и наведенная клетка
    this.selectedCell = null;
    this.hoveredCell = null;

    // Перетаскивание всего объекта
    this.isDragging = false;
    this.dragStartMouse = { x: 0, y: 0 };
    this.dragStartPoints = null;
    this.dragStartCellPos = null;

    // Перетаскивание отдельной вершины (Свободное искажение ромба)
    this.isDraggingVertex = false;
    this.draggedVertexIndex = null; // 0: Верх, 1: Право, 2: Низ, 3: Лево
    this.hoveredVertexIndex = null;

    // DOM UI редактора
    this.editorContainer = null;

    // История для Undo (Ctrl+Z)
    this.undoStack = [];

    this.bindCanvasEvents();
    this.bindKeyboardShortcuts();
  }

  /* ==========================================================================
     Запуск и Остановка Редактора
     ========================================================================== */
  start() {
    console.log('🗺️ [Stage2Editor] Запуск визуального конструктора изометрической настолки...');
    this.isActive = true;

    // Копируем актуальные клетки из Stage2Board
    this.cells = JSON.parse(JSON.stringify(this.stage2Board.cells || []));
    this.ensureCellPoints();
    this.saveUndoState();

    // Запускаем видеоряд босса в центре стола
    if (this.stage2Board.videoManager) {
      this.stage2Board.videoManager.startBoardGameBossSequence();
    }

    // Настраиваем Canvas
    if (this.canvas) {
      this.canvas.style.display = 'block';
      this.canvas.width = this.boardWidth;
      this.canvas.height = this.boardHeight;
    }

    // Создаем панель редактора
    this.createEditorUI();
    audio.playClick();
  }

  stop() {
    this.isActive = false;
    this.removeEditorUI();
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    if (this.stage2Board.videoManager) {
      this.stage2Board.videoManager.stopBoardGameBossSequence();
    }
  }

  ensureCellPoints() {
    for (const c of this.cells) {
      if (!c.points || !Array.isArray(c.points) || c.points.length !== 4) {
        c.points = this.getCellPoints(c);
      }
      if (!c.shape) {
        c.shape = 'iso';
      }
    }
  }

  /* ==========================================================================
     Геометрические функции для изометрии и полигонов
     ========================================================================== */
  getCellPoints(cell) {
    if (cell.points && Array.isArray(cell.points) && cell.points.length === 4) {
      return cell.points;
    }
    const cx = cell.x + cell.width / 2;
    const cy = cell.y + cell.height / 2;
    const hw = (cell.width || 70) / 2;
    const hh = (cell.height || 40) / 2;
    return [
      { x: Math.round(cx), y: Math.round(cy - hh) },     // 0: Верх
      { x: Math.round(cx + hw), y: Math.round(cy) },     // 1: Право
      { x: Math.round(cx), y: Math.round(cy + hh) },     // 2: Низ
      { x: Math.round(cx - hw), y: Math.round(cy) }      // 3: Лево
    ];
  }

  getCellCenter(cell) {
    const pts = this.getCellPoints(cell);
    return {
      x: Math.round((pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4),
      y: Math.round((pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4)
    };
  }

  updateBoundingBoxFromPoints(cell) {
    const pts = this.getCellPoints(cell);
    const minX = Math.min(pts[0].x, pts[1].x, pts[2].x, pts[3].x);
    const maxX = Math.max(pts[0].x, pts[1].x, pts[2].x, pts[3].x);
    const minY = Math.min(pts[0].y, pts[1].y, pts[2].y, pts[3].y);
    const maxY = Math.max(pts[0].y, pts[1].y, pts[2].y, pts[3].y);
    cell.x = Math.round(minX);
    cell.y = Math.round(minY);
    cell.width = Math.round(maxX - minX);
    cell.height = Math.round(maxY - minY);
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

  findCellAt(x, y) {
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const c = this.cells[i];
      if (c.shape === 'iso' || c.points) {
        if (this.isPointInPolygon(x, y, this.getCellPoints(c))) return c;
      } else {
        if (x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height) return c;
      }
    }
    return null;
  }

  findVertexHandleAt(cell, x, y) {
    if (!cell) return null;
    const pts = this.getCellPoints(cell);
    const radius = 12; // радиус захвата вершины

    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - x, pts[i].y - y);
      if (d <= radius) {
        return i;
      }
    }
    return null;
  }

  /* ==========================================================================
     DOM UI Конструктора
     ========================================================================== */
  createEditorUI() {
    this.removeEditorUI();

    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    this.editorContainer = document.createElement('div');
    this.editorContainer.id = 'stage2-editor-ui';
    this.editorContainer.className = 'stage2-editor-ui';

    const gridBtnText = this.gridMode === 'iso'
      ? '🔷 СЕТКА: ИЗОМЕТРИЯ'
      : (this.gridMode === 'rect' ? '🔲 СЕТКА: 2D (20px)' : '🧲 СЕТКА: ВЫКЛ');

    this.editorContainer.innerHTML = `
      <!-- Верхняя панель инструментов конструктора -->
      <div class="s2-ed-toolbar">
        <div class="s2-ed-tool-group">
          <span class="s2-ed-title">🛠️ ИЗОМЕТРИЧЕСКИЙ РЕДАКТОР</span>
          <button id="btn-s2ed-tool-select" class="s2-ed-btn active" title="Выбор, перемещение и искажение вершин (V)">
            <span>🎯 ВЫБОР</span>
          </button>
          <button id="btn-s2ed-tool-add" class="s2-ed-btn" title="Создать новую изометрическую клетку (A)">
            <span>➕ НОВАЯ КЛЕТКА</span>
          </button>
          <button id="btn-s2ed-grid" class="s2-ed-btn active" title="Режимы сетки: Изометрия 30° / 2D / Выкл (G)">
            <span id="s2ed-grid-text">${gridBtnText}</span>
          </button>
          <button id="btn-s2ed-renumber" class="s2-ed-btn" title="Перенумеровать по порядку (1..N)">
            <span>🔢 НУМЕРАЦИЯ</span>
          </button>
        </div>

        <div class="s2-ed-tool-group">
          <button id="btn-s2ed-save" class="s2-ed-btn s2-ed-btn-save" title="Сохранить в проект data/board_level.json (Ctrl+S)">
            <span>💾 СОХРАНИТЬ</span>
          </button>
          <button id="btn-s2ed-export" class="s2-ed-btn" title="Скачать JSON файл карты">
            <span>📥 ЭКСПОРТ</span>
          </button>
          <label class="s2-ed-btn s2-ed-btn-file" title="Загрузить JSON файл карты">
            <span>📤 ИМПОРТ</span>
            <input type="file" id="input-s2ed-import" accept=".json" class="sr-only">
          </label>
          <button id="btn-s2ed-play" class="s2-ed-btn s2-ed-btn-play" title="Проверить карту в игре">
            <span>▶️ ИГРАТЬ</span>
          </button>
          <button id="btn-s2ed-exit" class="s2-ed-btn s2-ed-btn-exit" title="Выйти в меню">
            <span>✕ МЕНЮ</span>
          </button>
        </div>
      </div>

      <!-- Боковая плавающая панель свойств клетки (Инспектор) -->
      <div id="s2-ed-inspector" class="s2-ed-inspector hidden">
        <div class="s2-insp-header">
          <span class="s2-insp-title">⚙️ СВОЙСТВА КЛЕТКИ</span>
          <button id="btn-s2-insp-close" class="s2-insp-close">✕</button>
        </div>

        <div class="s2-insp-body">
          <div class="s2-insp-row">
            <label>Форма клетки:</label>
            <select id="insp-cell-shape">
              <option value="iso">🔷 ИЗОМЕТРИЯ (Ромб / Искажение)</option>
              <option value="rect">🔲 2D ПРЯМОУГОЛЬНИК</option>
            </select>
          </div>

          <div class="s2-insp-row">
            <label>Быстрое выравнивание ромба:</label>
            <div class="s2-iso-btn-row">
              <button id="btn-insp-align-iso" class="s2-insp-btn-sm" title="Сбросить в правильный 70x40 ромб">🔷 Ромб 2:1</button>
              <button id="btn-insp-skew-left" class="s2-insp-btn-sm" title="Наклон влево-вверх">📐 Наклон ↖</button>
              <button id="btn-insp-skew-right" class="s2-insp-btn-sm" title="Наклон вправо-вниз">📐 Наклон ↘</button>
            </div>
          </div>

          <div class="s2-insp-row">
            <label>Шаблон события (Каталог):</label>
            <select id="insp-cell-event-template">
              <option value="">-- Без шаблона (по номеру шага) --</option>
              <optgroup label="🎁 Награды и Клады">
                <option value="chest_regular">📦 Обычный Сундук (+6 яиц)</option>
                <option value="beaver_legendary_chest">👑 Легендарный Сундук Бобра (+3 бустера)</option>
                <option value="lucky_clover">🍀 Клевер Удачи (+3 кубика)</option>
                <option value="egg_pouch">🥚 Мешочек Яиц (+5 яиц)</option>
                <option value="egg_magnet">🧲 Яичный Магнит (x2)</option>
                <option value="holiday_gift">🎁 Праздничный Подарок (+1 бустер)</option>
                <option value="magic_oracle">🔮 Магическое Предсказание</option>
              </optgroup>
              <optgroup label="🎲 Мини-игры и Азарт">
                <option value="mystery_boxes">🎁 Коробка с Сюрпризом (4 кубика)</option>
                <option value="wheel_fortune">🎡 Колесо Лесной Фортуны!</option>
                <option value="strongman_game">🔨 Проверка Силача! (Силомер)</option>
                <option value="timestop_game">⏱️ Остановка Времени (Секундомер)</option>
                <option value="bingo_game">🎱 Птичье Бинго (Лотерея)</option>
                <option value="toy_claw_machine">🕹️ Автомат с Игрушками (Кран)</option>
              </optgroup>
              <optgroup label="🏕️ Квесты и Развилки">
                <option value="quiz_campfire">🏕️ Отдых у костра (Викторина)</option>
                <option value="foggy_crossroad">🌫️ Развилка в тумане</option>
                <option value="mysterious_basement">🚪 Таинственный Подвал</option>
                <option value="abandoned_cellar">🗝️ Заброшенный Подвал</option>
                <option value="spring_flask">🧪 Колба с Родниковой Водой</option>
              </optgroup>
              <optgroup label="⚠️ Опасности и Ловушки">
                <option value="spoiled_egg">☣️ Тухлое Яйцо! (Яд 5 ходов)</option>
                <option value="poison_thorns">🥀 Ядовитые Шипы! (Яд 4 хода)</option>
                <option value="fox_ambush">🦊 Нападение Хитрой Лисы (-3 яйца)</option>
                <option value="thunder_strike">⚡ Кара Небесная! (-5 HP)</option>
                <option value="magic_barrier">🛑 ТЫ НЕ ПРОЙДЕШЬ! (-1 клетка)</option>
              </optgroup>
              <optgroup label="💖 Исцеление и Алтари">
                <option value="divine_healing">💧 Божественное Исцеление</option>
                <option value="immunity_elixir">🛡️ Эликсир Иммунитета (Щит)</option>
                <option value="sacrifice_monument">🗿 Монумент Самопожертвования</option>
                <option value="charity_monument">🤲 Монумент Милосердия</option>
              </optgroup>
              <optgroup label="🦫 Сюжетные врата">
                <option value="start_gate">🚪 Врата Черепа (Старт)</option>
                <option value="boss_gate">🦫 Логово Бобра (Босс-файт)</option>
              </optgroup>
            </select>
          </div>

          <div class="s2-insp-row">
            <label>Номер / Шаг:</label>
            <input type="number" id="insp-cell-index" min="1" max="999">
          </div>

          <div class="s2-insp-row">
            <label>Тип события:</label>
            <select id="insp-cell-type">
              <option value="START">🚪 START (Врата / Старт)</option>
              <option value="NORMAL">🌲 NORMAL (Обычная)</option>
              <option value="GOOD">🎁 GOOD (Бонус / Кормушка)</option>
              <option value="BAD">⚠️ BAD (Ловушка / Осы / Лед)</option>
              <option value="BOSS">🦫 BOSS (Встреча с Бобром)</option>
              <option value="DICE_BONUS">🎲 DICE (Доп. бросок / Магнит)</option>
              <option value="MINIGAME">🎰 MINIGAME (Мини-игра / Колесо)</option>
              <option value="FINISH">👑 FINISH (Триумф / Финиш)</option>
            </select>
          </div>

          <div class="s2-insp-row">
            <label>Иконка / Эмодзи:</label>
            <input type="text" id="insp-cell-icon" maxlength="4">
          </div>

          <div class="s2-insp-row">
            <label>Название зоны:</label>
            <input type="text" id="insp-cell-title" placeholder="Название события">
          </div>

          <div class="s2-insp-row">
            <label>Описание ивента:</label>
            <textarea id="insp-cell-desc" rows="3" placeholder="Что происходит при остановке на клетке..."></textarea>
          </div>

          <div class="s2-insp-vertex-header">
            <label>Вершины ромба (P0:Верх, P1:Право, P2:Низ, P3:Лево):</label>
          </div>
          <div class="s2-insp-grid-coords">
            <div class="coord-item">
              <label>P0 (В):</label>
              <input type="text" id="insp-vertex-0" placeholder="x,y">
            </div>
            <div class="coord-item">
              <label>P1 (П):</label>
              <input type="text" id="insp-vertex-1" placeholder="x,y">
            </div>
            <div class="coord-item">
              <label>P2 (Н):</label>
              <input type="text" id="insp-vertex-2" placeholder="x,y">
            </div>
            <div class="coord-item">
              <label>P3 (Л):</label>
              <input type="text" id="insp-vertex-3" placeholder="x,y">
            </div>
          </div>

          <div class="s2-insp-actions">
            <button id="btn-s2-insp-duplicate" class="s2-insp-btn btn-duplicate">📋 Дублировать</button>
            <button id="btn-s2-insp-delete" class="s2-insp-btn btn-delete">🗑️ Удалить</button>
          </div>
        </div>
      </div>

      <!-- Подсказка по горячим клавишам снизу -->
      <div class="s2-ed-hint-bar">
        <span>Клик: выбор | Центр: перетащить клетку | 4 Уголка (P0..P3): свободное искажение ромба | [Del]: удалить | [Ctrl+D]: копия | [Ctrl+S]: сохранить</span>
      </div>
    `;

    uiLayer.appendChild(this.editorContainer);
    this.bindEditorUIEvents();
  }

  removeEditorUI() {
    if (this.editorContainer && this.editorContainer.parentNode) {
      this.editorContainer.parentNode.removeChild(this.editorContainer);
      this.editorContainer = null;
    }
  }

  bindEditorUIEvents() {
    const btnSelect = document.getElementById('btn-s2ed-tool-select');
    const btnAdd = document.getElementById('btn-s2ed-tool-add');
    const btnGrid = document.getElementById('btn-s2ed-grid');
    const gridText = document.getElementById('s2ed-grid-text');
    const btnRenumber = document.getElementById('btn-s2ed-renumber');
    const btnSave = document.getElementById('btn-s2ed-save');
    const btnExport = document.getElementById('btn-s2ed-export');
    const inputImport = document.getElementById('input-s2ed-import');
    const btnPlay = document.getElementById('btn-s2ed-play');
    const btnExit = document.getElementById('btn-s2ed-exit');

    if (btnSelect) {
      btnSelect.addEventListener('click', () => {
        this.currentTool = 'select';
        btnSelect.classList.add('active');
        if (btnAdd) btnAdd.classList.remove('active');
        audio.playClick();
      });
    }

    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.currentTool = 'add';
        btnAdd.classList.add('active');
        if (btnSelect) btnSelect.classList.remove('active');
        audio.playClick();
      });
    }

    if (btnGrid) {
      btnGrid.addEventListener('click', () => {
        if (this.gridMode === 'iso') {
          this.gridMode = 'rect';
          if (gridText) gridText.textContent = '🔲 СЕТКА: 2D (20px)';
        } else if (this.gridMode === 'rect') {
          this.gridMode = 'none';
          if (gridText) gridText.textContent = '🧲 СЕТКА: ВЫКЛ';
          btnGrid.classList.remove('active');
        } else {
          this.gridMode = 'iso';
          if (gridText) gridText.textContent = '🔷 СЕТКА: ИЗОМЕТРИЯ';
          btnGrid.classList.add('active');
        }
        audio.playClick();
      });
    }

    if (btnRenumber) {
      btnRenumber.addEventListener('click', () => {
        this.renumberCells();
        audio.playSuccess();
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', () => this.saveBoardData());
    }

    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportJSON());
    }

    if (inputImport) {
      inputImport.addEventListener('change', (e) => this.importJSON(e));
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        audio.playClick();
        this.applyChangesToBoard();
        events.emit('stage:switch_to_stage2_board');
      });
    }

    if (btnExit) {
      btnExit.addEventListener('click', () => {
        audio.playClick();
        events.emit('stage:exit_to_title');
      });
    }

    this.bindInspectorEvents();
  }

  bindInspectorEvents() {
    const bindInput = (id, prop, isNumber = false) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        if (!this.selectedCell) return;
        this.selectedCell[prop] = isNumber ? Number(el.value) : el.value;
      });
    };

    bindInput('insp-cell-index', 'index', true);
    bindInput('insp-cell-type', 'type');
    bindInput('insp-cell-icon', 'icon');
    bindInput('insp-cell-title', 'title');
    bindInput('insp-cell-desc', 'description');

    const tmplSelect = document.getElementById('insp-cell-event-template');
    if (tmplSelect) {
      tmplSelect.addEventListener('change', () => {
        if (!this.selectedCell) return;
        const tmplKey = tmplSelect.value;
        this.selectedCell.eventId = tmplKey;
        if (tmplKey && EVENT_TEMPLATES[tmplKey]) {
          const tmpl = EVENT_TEMPLATES[tmplKey];
          this.selectedCell.title = tmpl.title;
          this.selectedCell.description = tmpl.text;
          this.selectedCell.icon = tmpl.icon || '🌲';

          if (tmpl.type === 'boss_door') this.selectedCell.type = 'BOSS';
          else if (tmpl.type === 'info') this.selectedCell.type = 'START';
          else if (tmpl.type === 'hazard' || tmpl.type === 'hazard_video' || tmpl.type === 'bounce') this.selectedCell.type = 'BAD';
          else if (tmpl.type === 'reward' || tmpl.type === 'reward_video' || tmpl.type === 'healing') this.selectedCell.type = 'GOOD';
          else if (['minigame', 'wheel_video', 'mystery_boxes', 'strongman', 'timestop', 'bingo'].includes(tmpl.type)) this.selectedCell.type = 'MINIGAME';
          else this.selectedCell.type = 'NORMAL';

          const setInputVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
          };
          setInputVal('insp-cell-type', this.selectedCell.type);
          setInputVal('insp-cell-icon', this.selectedCell.icon);
          setInputVal('insp-cell-title', this.selectedCell.title);
          setInputVal('insp-cell-desc', this.selectedCell.description);
          audio.playClick();
        }
      });
    }

    const shapeSelect = document.getElementById('insp-cell-shape');
    if (shapeSelect) {
      shapeSelect.addEventListener('change', () => {
        if (!this.selectedCell) return;
        this.selectedCell.shape = shapeSelect.value;
        if (this.selectedCell.shape === 'iso' && (!this.selectedCell.points || this.selectedCell.points.length !== 4)) {
          this.selectedCell.points = this.getCellPoints(this.selectedCell);
        }
        this.showInspector(this.selectedCell);
      });
    }

    // Кнопка [🔷 Ромб 2:1]
    const btnAlignIso = document.getElementById('btn-insp-align-iso');
    if (btnAlignIso) {
      btnAlignIso.addEventListener('click', () => {
        if (!this.selectedCell) return;
        this.saveUndoState();
        const center = this.getCellCenter(this.selectedCell);
        const hw = 35, hh = 20; // идеальный 70x40 изометрический ромб
        this.selectedCell.shape = 'iso';
        this.selectedCell.points = [
          { x: center.x, y: center.y - hh },
          { x: center.x + hw, y: center.y },
          { x: center.x, y: center.y + hh },
          { x: center.x - hw, y: center.y }
        ];
        this.updateBoundingBoxFromPoints(this.selectedCell);
        this.showInspector(this.selectedCell);
        audio.playSuccess();
      });
    }

    // Кнопка [📐 Наклон ↖]
    const btnSkewLeft = document.getElementById('btn-insp-skew-left');
    if (btnSkewLeft) {
      btnSkewLeft.addEventListener('click', () => {
        if (!this.selectedCell) return;
        this.saveUndoState();
        const pts = this.getCellPoints(this.selectedCell);
        pts[0].x -= 6;
        pts[2].x -= 6;
        this.selectedCell.points = pts;
        this.updateBoundingBoxFromPoints(this.selectedCell);
        this.showInspector(this.selectedCell);
        audio.playClick();
      });
    }

    // Кнопка [📐 Наклон ↘]
    const btnSkewRight = document.getElementById('btn-insp-skew-right');
    if (btnSkewRight) {
      btnSkewRight.addEventListener('click', () => {
        if (!this.selectedCell) return;
        this.saveUndoState();
        const pts = this.getCellPoints(this.selectedCell);
        pts[0].x += 6;
        pts[2].x += 6;
        this.selectedCell.points = pts;
        this.updateBoundingBoxFromPoints(this.selectedCell);
        this.showInspector(this.selectedCell);
        audio.playClick();
      });
    }

    // Инпуты координат 4 вершин (p0..p3)
    for (let i = 0; i < 4; i++) {
      const vInput = document.getElementById(`insp-vertex-${i}`);
      if (vInput) {
        vInput.addEventListener('change', () => {
          if (!this.selectedCell) return;
          const parts = vInput.value.split(',').map(s => Number(s.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const pts = this.getCellPoints(this.selectedCell);
            pts[i] = { x: Math.round(parts[0]), y: Math.round(parts[1]) };
            this.selectedCell.points = pts;
            this.updateBoundingBoxFromPoints(this.selectedCell);
          }
        });
      }
    }

    const typeSelect = document.getElementById('insp-cell-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        if (!this.selectedCell) return;
        this.selectedCell.type = typeSelect.value;
        const defaultIcons = {
          START: '🚪',
          NORMAL: '🌲',
          GOOD: '🎁',
          BAD: '⚠️',
          BOSS: '🦫',
          DICE_BONUS: '🎲',
          MINIGAME: '🎰',
          FINISH: '👑'
        };
        const iconInput = document.getElementById('insp-cell-icon');
        if (iconInput) {
          this.selectedCell.icon = defaultIcons[this.selectedCell.type] || '🌲';
          iconInput.value = this.selectedCell.icon;
        }
      });
    }

    const btnClose = document.getElementById('btn-s2-insp-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.hideInspector());
    }

    const btnDup = document.getElementById('btn-s2-insp-duplicate');
    if (btnDup) {
      btnDup.addEventListener('click', () => this.duplicateSelectedCell());
    }

    const btnDel = document.getElementById('btn-s2-insp-delete');
    if (btnDel) {
      btnDel.addEventListener('click', () => this.deleteSelectedCell());
    }
  }

  showInspector(cell) {
    const insp = document.getElementById('s2-ed-inspector');
    if (!insp || !cell) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined ? val : '';
    };

    setVal('insp-cell-shape', cell.shape || 'iso');
    setVal('insp-cell-event-template', cell.eventId || '');
    setVal('insp-cell-index', cell.index);
    setVal('insp-cell-type', cell.type || 'NORMAL');
    setVal('insp-cell-icon', cell.icon || '🌲');
    setVal('insp-cell-title', cell.title || '');
    setVal('insp-cell-desc', cell.description || '');

    const pts = this.getCellPoints(cell);
    for (let i = 0; i < 4; i++) {
      setVal(`insp-vertex-${i}`, `${Math.round(pts[i].x)}, ${Math.round(pts[i].y)}`);
    }

    insp.classList.remove('hidden');
  }

  hideInspector() {
    const insp = document.getElementById('s2-ed-inspector');
    if (insp) insp.classList.add('hidden');
  }

  /* ==========================================================================
     События мыши на холсте (Перемещение клетки или искажение любой вершины)
     ========================================================================== */
  bindCanvasEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
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

  onMouseDown(e) {
    if (!this.isActive) return;
    const pos = this.getCanvasCoords(e);

    // 1. Инструмент ADD (создание новой изометрической плитки ромбом 70x40)
    if (this.currentTool === 'add') {
      this.saveUndoState();
      const cx = this.snap(pos.x);
      const cy = this.snap(pos.y);
      const hw = 35, hh = 20;

      const newCell = {
        id: `cell_${Date.now()}`,
        index: this.cells.length + 1,
        shape: 'iso',
        x: cx - hw,
        y: cy - hh,
        width: hw * 2,
        height: hh * 2,
        type: 'NORMAL',
        title: `Клетка #${this.cells.length + 1}`,
        description: 'Новая изометрическая клетка поля.',
        icon: '🌲',
        points: [
          { x: cx, y: cy - hh },     // Верх
          { x: cx + hw, y: cy },     // Право
          { x: cx, y: cy + hh },     // Низ
          { x: cx - hw, y: cy }      // Лево
        ]
      };

      this.cells.push(newCell);
      this.selectedCell = newCell;
      this.showInspector(newCell);
      audio.playSuccess();
      return;
    }

    // 2. Инструмент SELECT
    // А) Проверяем клик по любой из 4 вершин выбранной клетки (СВОБОДНОЕ ИСКАЖЕНИЕ)
    if (this.selectedCell) {
      const vIndex = this.findVertexHandleAt(this.selectedCell, pos.x, pos.y);
      if (vIndex !== null) {
        this.saveUndoState();
        this.isDraggingVertex = true;
        this.draggedVertexIndex = vIndex;
        audio.playClick();
        return;
      }
    }

    // Б) Проверяем клик по телу клетки (ПЕРЕМЕЩЕНИЕ ВСЕЙ КЛЕТКИ)
    const clicked = this.findCellAt(pos.x, pos.y);
    if (clicked) {
      this.saveUndoState();
      this.selectedCell = clicked;
      this.isDragging = true;
      this.dragStartMouse = { x: pos.x, y: pos.y };
      this.dragStartPoints = JSON.parse(JSON.stringify(this.getCellPoints(clicked)));
      this.dragStartCellPos = { x: clicked.x, y: clicked.y };
      this.showInspector(clicked);
      audio.playClick();
    } else {
      this.selectedCell = null;
      this.hideInspector();
    }
  }

  onMouseMove(e) {
    if (!this.isActive) return;
    const pos = this.getCanvasCoords(e);
    this.hoveredCell = this.findCellAt(pos.x, pos.y);

    if (this.selectedCell) {
      this.hoveredVertexIndex = this.findVertexHandleAt(this.selectedCell, pos.x, pos.y);
    } else {
      this.hoveredVertexIndex = null;
    }

    // Перетаскивание отдельной вершины (искажение угла)
    if (this.isDraggingVertex && this.selectedCell && this.draggedVertexIndex !== null) {
      const pts = this.getCellPoints(this.selectedCell);
      const targetX = this.snap(pos.x);
      const targetY = this.snap(pos.y);

      pts[this.draggedVertexIndex] = { x: targetX, y: targetY };
      this.selectedCell.points = pts;
      this.updateBoundingBoxFromPoints(this.selectedCell);
      this.showInspector(this.selectedCell);
      return;
    }

    // Перетаскивание всей клетки
    if (this.isDragging && this.selectedCell && this.dragStartPoints) {
      const dx = pos.x - this.dragStartMouse.x;
      const dy = pos.y - this.dragStartMouse.y;

      const newPts = this.dragStartPoints.map(p => ({
        x: Math.round(p.x + dx),
        y: Math.round(p.y + dy)
      }));

      this.selectedCell.points = newPts;
      this.updateBoundingBoxFromPoints(this.selectedCell);
      this.showInspector(this.selectedCell);
      return;
    }
  }

  onMouseUp(e) {
    if (!this.isActive) return;
    this.isDragging = false;
    this.isDraggingVertex = false;
    this.draggedVertexIndex = null;
    this.dragStartPoints = null;
  }

  snap(val) {
    if (this.gridMode === 'none') return Math.round(val);
    const step = this.gridMode === 'iso' ? 10 : 20;
    return Math.round(val / step) * step;
  }

  /* ==========================================================================
     Горячие клавиши и действия над клетками
     ========================================================================== */
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.deleteSelectedCell();
      } else if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.duplicateSelectedCell();
      } else if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.saveBoardData();
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.undo();
      } else if (e.code === 'KeyV') {
        const btnSelect = document.getElementById('btn-s2ed-tool-select');
        if (btnSelect) btnSelect.click();
      } else if (e.code === 'KeyA') {
        const btnAdd = document.getElementById('btn-s2ed-tool-add');
        if (btnAdd) btnAdd.click();
      } else if (e.code === 'KeyG') {
        const btnGrid = document.getElementById('btn-s2ed-grid');
        if (btnGrid) btnGrid.click();
      }
    });
  }

  duplicateSelectedCell() {
    if (!this.selectedCell) return;
    this.saveUndoState();

    const clone = JSON.parse(JSON.stringify(this.selectedCell));
    clone.id = `cell_${Date.now()}`;
    clone.index = this.cells.length + 1;
    clone.title = `${clone.title || 'Клетка'} (копия)`;

    const offset = { x: 35, y: 20 }; // сдвиг на один изометрический шаг
    if (clone.points) {
      clone.points = clone.points.map(p => ({ x: p.x + offset.x, y: p.y + offset.y }));
    }
    clone.x += offset.x;
    clone.y += offset.y;

    this.cells.push(clone);
    this.selectedCell = clone;
    this.showInspector(clone);
    audio.playSuccess();
  }

  deleteSelectedCell() {
    if (!this.selectedCell) return;
    this.saveUndoState();

    const id = this.selectedCell.id;
    this.cells = this.cells.filter(c => c.id !== id);
    this.selectedCell = null;
    this.hideInspector();
    this.renumberCells();
    audio.playFlap();
  }

  renumberCells() {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].index = i + 1;
    }
    if (this.selectedCell) {
      this.showInspector(this.selectedCell);
    }
  }

  saveUndoState() {
    this.undoStack.push(JSON.stringify(this.cells));
    if (this.undoStack.length > 30) this.undoStack.shift();
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.undoStack.pop();
      const prev = this.undoStack.pop();
      if (prev) {
        this.cells = JSON.parse(prev);
        this.selectedCell = null;
        this.hideInspector();
        audio.playClick();
      }
    }
  }

  /* ==========================================================================
     Сохранение, Экспорт и Импорт
     ========================================================================== */
  applyChangesToBoard() {
    this.stage2Board.cells = JSON.parse(JSON.stringify(this.cells));
    this.stage2Board.syncPlayerToStart();
  }

  async saveBoardData() {
    this.applyChangesToBoard();
    const exportData = {
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight,
      startCellId: this.cells[0] ? this.cells[0].id : 'cell_1',
      cells: this.cells
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    localStorage.setItem('birday_board_data', jsonStr);

    try {
      const resp = await fetch('/api/save-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr
      });
      if (resp.ok) {
        audio.playSuccess();
        this.showToast('Успешно! Карта настольной игры сохранена в data/board_level.json');
        return;
      }
    } catch (e) {
      console.warn('Серверный API недоступен, данные сохранены в localStorage', e);
    }

    audio.playSuccess();
    this.showToast('Карта сохранена локально в браузере (localStorage)!');
  }

  exportJSON() {
    const exportData = {
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight,
      startCellId: this.cells[0] ? this.cells[0].id : 'cell_1',
      cells: this.cells
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board_level_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    audio.playSuccess();
  }

  importJSON(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data && Array.isArray(data.cells)) {
          this.saveUndoState();
          this.cells = data.cells;
          this.ensureCellPoints();
          this.selectedCell = null;
          this.hideInspector();
          this.applyChangesToBoard();
          audio.playSuccess();
          this.showToast(`Загружено ${this.cells.length} клеток из файла!`);
        }
      } catch (err) {
        this.showToast('Ошибка чтения JSON файла: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  showToast(text) {
    if (!text) return;
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.35s';
      setTimeout(() => toast.remove(), 350);
    }, 2000);
  }

  /* ==========================================================================
     Рендеринг в режиме конструктора (Изометрическая сетка + вершины клеток)
     ========================================================================== */
  update(dt) {}

  render(alpha) {
    if (!this.isActive || !this.ctx) return;

    // 1. Очищаем холст (видео бобра просвечивает сквозь центр)
    this.ctx.clearRect(0, 0, this.boardWidth, this.boardHeight);

    // 2. Отрисовываем карту Board.png
    if (this.boardImage && this.boardImage.complete) {
      this.ctx.drawImage(this.boardImage, 0, 0, this.boardWidth, this.boardHeight);
    }

    // 3. Сетка (Изометрическая или 2D)
    if (this.gridMode !== 'none') {
      this.renderGrid();
    }

    // 4. Линии связей между клетками
    this.renderTrackLines();

    // 5. Отрисовка клеток
    for (let i = 0; i < this.cells.length; i++) {
      this.renderCell(this.cells[i], i);
    }

    // 6. Вершины и маркеры выделенной клетки (Свободное искажение)
    if (this.selectedCell) {
      this.renderSelectedCellHandles(this.selectedCell);
    }
  }

  renderGrid() {
    this.ctx.save();
    this.ctx.lineWidth = 1;

    if (this.gridMode === 'iso') {
      // ИЗОМЕТРИЧЕСКАЯ СЕТКА (наклонные линии под ~30°, соотношение 2:1)
      this.ctx.strokeStyle = 'rgba(46, 196, 182, 0.14)';
      const stepX = 70;
      const stepY = 40;

      // Диагонали 1: сверху-слева вниз-вправо
      for (let offset = -this.boardHeight * 2; offset < this.boardWidth + this.boardHeight; offset += stepX) {
        this.ctx.beginPath();
        this.ctx.moveTo(offset, 0);
        this.ctx.lineTo(offset + this.boardHeight * (stepX / stepY), this.boardHeight);
        this.ctx.stroke();
      }

      // Диагонали 2: сверху-справа вниз-влево
      for (let offset = -this.boardHeight; offset < this.boardWidth + this.boardHeight * 2; offset += stepX) {
        this.ctx.beginPath();
        this.ctx.moveTo(offset, 0);
        this.ctx.lineTo(offset - this.boardHeight * (stepX / stepY), this.boardHeight);
        this.ctx.stroke();
      }

    } else if (this.gridMode === 'rect') {
      // Классическая 2D прямоугольная сетка 20px
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      const sz = 20;
      for (let x = 0; x < this.boardWidth; x += sz) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.boardHeight);
        this.ctx.stroke();
      }
      for (let y = 0; y < this.boardHeight; y += sz) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.boardWidth, y);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  renderTrackLines() {
    if (this.cells.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 183, 3, 0.75)';
    this.ctx.lineWidth = 3.5;
    this.ctx.setLineDash([7, 6]);

    this.ctx.beginPath();
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      const center = this.getCellCenter(c);
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
    const isSelected = this.selectedCell && this.selectedCell.id === cell.id;
    const isHovered = this.hoveredCell && this.hoveredCell.id === cell.id;
    const pts = this.getCellPoints(cell);
    const center = this.getCellCenter(cell);

    this.ctx.save();

    // Свечение рамки
    if (isSelected) {
      this.ctx.shadowColor = '#00f5d4';
      this.ctx.shadowBlur = 16;
    }

    // Заливка клетки
    this.ctx.fillStyle = isSelected
      ? 'rgba(0, 245, 212, 0.38)'
      : (isHovered ? 'rgba(255, 183, 3, 0.38)' : 'rgba(0, 0, 0, 0.65)');

    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].x, pts[0].y);
    this.ctx.lineTo(pts[1].x, pts[1].y);
    this.ctx.lineTo(pts[2].x, pts[2].y);
    this.ctx.lineTo(pts[3].x, pts[3].y);
    this.ctx.closePath();
    this.ctx.fill();

    // Обводка
    this.ctx.strokeStyle = isSelected
      ? '#00f5d4'
      : (isHovered ? '#ffb703' : 'rgba(255, 255, 255, 0.65)');
    this.ctx.lineWidth = isSelected ? 3.5 : 1.8;
    this.ctx.stroke();

    // Номер шага возле верхней вершины (P0)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px "8bitoperator", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`#${cell.index || index + 1}`, pts[0].x, pts[0].y + 9);

    // Иконка в центре
    this.ctx.font = '22px "8bitoperator", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(cell.icon || '🌲', center.x, center.y + 2);

    this.ctx.restore();
  }

  renderSelectedCellHandles(cell) {
    const pts = this.getCellPoints(cell);
    const center = this.getCellCenter(cell);

    this.ctx.save();

    // 1. Ручка в центре для перетаскивания всей клетки
    this.ctx.fillStyle = '#ffb703';
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // 2. Интерактивные маркеры на каждой из 4 вершин (P0..P3) для свободного искажения
    const labels = ['P0 (В)', 'P1 (П)', 'P2 (Н)', 'P3 (Л)'];
    const offsets = [{ x: 0, y: -14 }, { x: 18, y: 0 }, { x: 0, y: 14 }, { x: -18, y: 0 }];

    for (let i = 0; i < 4; i++) {
      const isVertexHovered = (this.hoveredVertexIndex === i);
      const isVertexDragged = (this.draggedVertexIndex === i);

      // Круглый маркер вершины
      this.ctx.fillStyle = (isVertexDragged || isVertexHovered) ? '#ff0055' : '#00f5d4';
      this.ctx.beginPath();
      this.ctx.arc(pts[i].x, pts[i].y, (isVertexDragged || isVertexHovered) ? 8 : 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Текстовая метка вершины
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 9px "8bitoperator", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(labels[i], pts[i].x + offsets[i].x, pts[i].y + offsets[i].y);
    }

    this.ctx.restore();
  }
}
