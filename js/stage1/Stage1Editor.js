import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';

/**
 * Каталог инструментов разметки уровня поверх панорамы Forest.png:
 * 1. Ключевые зоны (Старт, Финиш, Гнёзда, Кормушки)
 * 2. Враги (Пчела, Улей, Ворона, Белка)
 */
const EDITOR_TOOLS_CATALOG = [
  // --- Вкладка: ЗОНЫ ---
  {
    id: 'zone_start',
    tab: 'zones',
    category: 'start',
    type: 'zone_start',
    name: '🚩 Точка Старта',
    badge: '🚩',
    color: '#38bdf8',
    radius: 30
  },
  {
    id: 'zone_finish',
    tab: 'zones',
    category: 'finish',
    type: 'zone_finish',
    name: '🏁 Финиш (Великое Гнездо)',
    badge: '🏁',
    color: '#facc15',
    radius: 110
  },
  {
    id: 'zone_nest',
    tab: 'zones',
    category: 'nests',
    type: 'zone_nest',
    name: '🪺 Зона Гнезда',
    badge: '🪺',
    color: '#facc15',
    radius: 46
  },
  {
    id: 'zone_feeder',
    tab: 'zones',
    category: 'feeders',
    type: 'zone_feeder',
    name: '🏡 Зона Кормушки',
    badge: '🏡',
    color: '#4ade80',
    radius: 52
  },

  // --- Вкладка: ВРАГИ ---
  {
    id: 'enemy_bee',
    tab: 'enemies',
    category: 'enemies',
    type: 'bee',
    key: 'enemy_bee',
    name: '🐝 Злая Пчела',
    badge: '🐝',
    defaultScale: 0.34,
    ampY: 50,
    speed: 2.5
  },
  {
    id: 'enemy_beehive',
    tab: 'enemies',
    category: 'enemies',
    type: 'beehive',
    key: 'enemy_beehive',
    name: '🍯 Улей',
    badge: '🍯',
    defaultScale: 0.38
  },
  {
    id: 'enemy_crow',
    tab: 'enemies',
    category: 'enemies',
    type: 'crow',
    key: 'enemy_crow',
    name: '🐦‍⬛ Ворона',
    badge: '🐦‍⬛',
    defaultScale: 0.36,
    vx: -65
  },
  {
    id: 'enemy_squirrel',
    tab: 'enemies',
    category: 'enemies',
    type: 'trap_squirrel',
    key: 'enemy_squirrel_1',
    name: '🐿️ Белка с шишками',
    badge: '🐿️',
    defaultScale: 0.38,
    throwCooldown: 2.6
  }
];

export class Stage1Editor {
  constructor(stage1Level) {
    this.stage1Level = stage1Level;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.viewWidth = 1280;
    this.viewHeight = 720;
    this.worldWidth = 14999;
    this.worldHeight = 720;
    this.groundY = 660;

    this.cameraX = 0;
    this.isActive = false;

    this.images = stage1Level ? stage1Level.images : {};

    // Чистая структура данных уровня (без мусорных декораций)
    this.levelData = {
      worldWidth: 14999,
      worldHeight: 720,
      groundY: 660,
      startPoint: { x: 120, y: 260, name: 'Старт' },
      finishZone: { x: 14500, y: 320, radius: 110, name: 'Великое Гнездо' },
      nests: [],
      feeders: [],
      enemies: [],
      scenery: [],
      animals: []
    };

    this.selectedItem = null;
    this.selectedCategory = null; // 'start' | 'finish' | 'nests' | 'feeders' | 'enemies'
    this.hoveredItem = null;
    this.placingAsset = null;
    this.currentTool = 'select';

    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.isPanningCamera = false;
    this.panStartX = 0;
    this.panStartCamX = 0;

    this.snapToGrid = false;
    this.gridStep = 20;

    this.mouseX = 640;
    this.mouseY = 360;

    this.editorContainer = null;
    this.activeTab = 'zones';

    this.bindEditorEvents();
  }

  /* ==========================================================================
     Загрузка и нормализация данных уровня
     ========================================================================== */
  async loadLevelData() {
    let loaded = null;

    // 1. Пробуем загрузить с локального сервера или из статики
    try {
      let resp = await fetch('/api/load-level').catch(() => null);
      if (!resp || !resp.ok) {
        resp = await fetch('data/stage1_level.json').catch(() => null);
      }
      if (resp && resp.ok) {
        loaded = await resp.json();
      }
    } catch (e) {}

    // 2. Если нет — пробуем из localStorage
    if (!loaded) {
      const saved = localStorage.getItem('birday_stage1_custom_level');
      if (saved) {
        try {
          loaded = JSON.parse(saved);
        } catch (e) {}
      }
    }

    // 3. Применяем данные или берём текущие из stage1Level
    const src = loaded || this.stage1Level || {};
    this.worldWidth = src.worldWidth || 14999;
    this.groundY = src.groundY || 660;

    const rawStart = src.startPoint || src.checkpoint || this.stage1Level?.missionStartPoint || { x: 120, y: 260 };
    this.levelData = {
      worldWidth: this.worldWidth,
      worldHeight: src.worldHeight || 720,
      groundY: this.groundY,
      startPoint: { x: rawStart.x ?? 120, y: rawStart.y ?? 260, name: 'Старт' },
      finishZone: src.finishZone
        ? { ...src.finishZone }
        : { x: this.worldWidth - 450, y: 320, radius: 110, name: 'Великое Гнездо' },
      nests: JSON.parse(JSON.stringify(src.nests || [])),
      feeders: JSON.parse(JSON.stringify(src.feeders || [])),
      enemies: JSON.parse(JSON.stringify(src.enemies || [])),
      scenery: [], // Очищено: лес нарисован на Forest.png
      animals: []
    };

    // Гарантируем, что у всех врагов есть нужные для игры поля
    this.levelData.enemies.forEach(en => this.syncEnemyPhysicsFields(en));
  }

  /**
   * Синхронизирует координаты врага с его базовыми точками патрулирования в Stage1Level
   */
  syncEnemyPhysicsFields(enemy) {
    enemy.alive = true;
    enemy.hp = 1;
    enemy.baseX = enemy.x;
    enemy.baseY = enemy.y;
    enemy.startX = enemy.x;
    if (enemy.type === 'bee') {
      enemy.ampY = enemy.ampY || 50;
      enemy.speed = enemy.speed || 2.5;
    } else if (enemy.type === 'crow') {
      enemy.vx = enemy.vx || -65;
      enemy.diveTimer = 0;
    } else if (enemy.type === 'trap_squirrel') {
      enemy.throwCooldown = enemy.throwCooldown || 2.6;
      enemy.timer = 1.0;
    }
  }

  /* ==========================================================================
     Управление и хоткеи
     ========================================================================== */
  bindEditorEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      // Игнорируем хоткеи, если фокус внутри текстового поля <input> или <select>
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.code === 'Escape') document.activeElement.blur();
        return;
      }

      // Движение камеры A/D или стрелки
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.cameraX = Math.max(0, this.cameraX - 80);
        this.updateCameraScrubber();
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.cameraX = Math.min(this.worldWidth - this.viewWidth, this.cameraX + 80);
        this.updateCameraScrubber();
      }

      // Удаление выбранного элемента
      if ((e.code === 'Delete' || e.code === 'Backspace') && this.selectedItem) {
        e.preventDefault();
        this.deleteSelectedItem();
      }

      // Дублирование (Ctrl+D)
      if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey) && this.selectedItem) {
        e.preventDefault();
        this.duplicateSelectedItem();
      }

      // Режим выбора (V)
      if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey) {
        this.setSelectMode();
      }

      // Отмена (Escape)
      if (e.code === 'Escape') {
        if (this.placingAsset) {
          this.setSelectMode();
        } else if (this.selectedItem) {
          this.selectedItem = null;
          this.selectedCategory = null;
          this.updatePropertiesPanel();
        }
      }
    });

    if (!this.canvas) return;

    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.isActive) e.preventDefault();
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.isActive) return;

      const { localX, localY, worldX } = this.getMouseCoords(e);

      // ПКМ во время размещения сбрасывает инструмент в режим "Выбор"
      if (e.button === 2 && this.placingAsset) {
        e.preventDefault();
        this.setSelectMode();
        return;
      }

      // СКМ или ПКМ — перетаскивание камеры
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        this.isPanningCamera = true;
        this.panStartX = e.clientX;
        this.panStartCamX = this.cameraX;
        return;
      }

      // ЛКМ в режиме размещения
      if (e.button === 0 && this.placingAsset) {
        this.placeNewObject(worldX, localY);
        return;
      }

      // ЛКМ в режиме выбора
      if (e.button === 0) {
        const hit = this.hitTest(worldX, localY);
        if (hit) {
          this.selectedItem = hit.item;
          this.selectedCategory = hit.category;
          this.isDragging = true;
          this.dragOffsetX = worldX - hit.item.x;
          this.dragOffsetY = localY - hit.item.y;
          this.updatePropertiesPanel();
        } else {
          this.selectedItem = null;
          this.selectedCategory = null;
          this.updatePropertiesPanel();
        }
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isActive || !this.canvas) return;

      const { localX, localY, worldX, scaleX } = this.getMouseCoords(e);
      this.mouseX = localX;
      this.mouseY = localY;

      if (this.isPanningCamera) {
        const dx = (e.clientX - this.panStartX) * scaleX;
        this.cameraX = Math.max(0, Math.min(this.worldWidth - this.viewWidth, this.panStartCamX - dx));
        this.updateCameraScrubber();
        return;
      }

      if (this.isDragging && this.selectedItem) {
        let newX = worldX - this.dragOffsetX;
        let newY = localY - this.dragOffsetY;

        if (this.snapToGrid) {
          newX = Math.round(newX / this.gridStep) * this.gridStep;
          newY = Math.round(newY / this.gridStep) * this.gridStep;
        }

        this.selectedItem.x = Math.round(newX);
        this.selectedItem.y = Math.round(newY);

        if (this.selectedCategory === 'nests') {
          this.selectedItem.cupX = this.selectedItem.x;
          this.selectedItem.cupY = this.selectedItem.y;
        } else if (this.selectedCategory === 'enemies') {
          this.syncEnemyPhysicsFields(this.selectedItem);
        }

        this.updatePropertiesInputs();
        return;
      }

      if (!this.placingAsset && !this.isDragging) {
        const hit = this.hitTest(worldX, localY);
        this.hoveredItem = hit ? hit.item : null;
      }
    });

    window.addEventListener('pointerup', () => {
      if (!this.isActive) return;
      this.isDragging = false;
      this.isPanningCamera = false;
    });

    // Колесо мыши: меняет РАДИУС для зон или МАСШТАБ для врагов
    this.canvas.addEventListener('wheel', (e) => {
      if (!this.isActive || !this.selectedItem) return;
      e.preventDefault();

      if (this.selectedCategory === 'enemies') {
        const delta = e.deltaY < 0 ? 0.02 : -0.02;
        const nextScale = Math.max(0.15, Math.min(1.5, (this.selectedItem.scale || 0.36) + delta));
        this.selectedItem.scale = parseFloat(nextScale.toFixed(2));
      } else if (this.selectedItem.radius !== undefined) {
        const delta = e.deltaY < 0 ? 2 : -2;
        this.selectedItem.radius = Math.max(16, Math.min(220, (this.selectedItem.radius || 46) + delta));
      }
      this.updatePropertiesInputs();
    }, { passive: false });
  }

  getMouseCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.viewWidth / rect.width;
    const scaleY = this.viewHeight / rect.height;
    const localX = (e.clientX - rect.left) * scaleX;
    const localY = (e.clientY - rect.top) * scaleY;
    return {
      localX,
      localY,
      worldX: localX + this.cameraX,
      scaleX,
      scaleY
    };
  }

  /* ==========================================================================
     Поиск объекта под курсором (Hit Test)
     ========================================================================== */
  hitTest(worldX, screenY) {
    // 1. Старт
    const sp = this.levelData.startPoint;
    if (sp && Math.hypot(worldX - sp.x, screenY - sp.y) <= 34) {
      return { item: sp, category: 'start' };
    }

    // 2. Финиш
    const fz = this.levelData.finishZone;
    if (fz && Math.hypot(worldX - fz.x, screenY - fz.y) <= (fz.radius || 110)) {
      return { item: fz, category: 'finish' };
    }

    // 3. Гнёзда
    for (let i = this.levelData.nests.length - 1; i >= 0; i--) {
      const n = this.levelData.nests[i];
      const cx = n.cupX !== undefined ? n.cupX : n.x;
      const cy = n.cupY !== undefined ? n.cupY : n.y;
      if (Math.hypot(worldX - cx, screenY - cy) <= (n.radius || 46) + 6) {
        return { item: n, category: 'nests' };
      }
    }

    // 4. Кормушки
    for (let i = this.levelData.feeders.length - 1; i >= 0; i--) {
      const f = this.levelData.feeders[i];
      if (Math.hypot(worldX - f.x, screenY - f.y) <= (f.radius || 52) + 6) {
        return { item: f, category: 'feeders' };
      }
    }

    // 5. Враги
    for (let i = this.levelData.enemies.length - 1; i >= 0; i--) {
      const en = this.levelData.enemies[i];
      const img = this.images[en.key];
      const sc = en.scale || 0.36;
      const halfW = ((img ? img.width : 120) * sc) * 0.5;
      const halfH = ((img ? img.height : 120) * sc) * 0.5;
      if (
        worldX >= en.x - halfW &&
        worldX <= en.x + halfW &&
        screenY >= en.y - halfH &&
        screenY <= en.y + halfH
      ) {
        return { item: en, category: 'enemies' };
      }
    }

    return null;
  }

  /* ==========================================================================
     Установка Зон и Врагов на карту
     ========================================================================== */
  placeNewObject(worldX, screenY) {
    if (!this.placingAsset) return;

    let posX = Math.round(worldX);
    let posY = Math.round(screenY);

    if (this.snapToGrid) {
      posX = Math.round(posX / this.gridStep) * this.gridStep;
      posY = Math.round(posY / this.gridStep) * this.gridStep;
    }

    const tpl = this.placingAsset;

    // 1. Точка Старта (единственная на уровень — просто перемещаем)
    if (tpl.category === 'start') {
      this.levelData.startPoint = { x: posX, y: posY, name: 'Старт' };
      this.selectedItem = this.levelData.startPoint;
      this.selectedCategory = 'start';
      audio.playClick();
      this.showToast(`🚩 Старт перемещён в (${posX}, ${posY})`);
      this.updatePropertiesPanel();
      return;
    }

    // 2. Зона Финиша (единственная на уровень — перемещаем)
    if (tpl.category === 'finish') {
      const currentRadius = this.levelData.finishZone?.radius || tpl.radius || 110;
      this.levelData.finishZone = {
        x: posX,
        y: posY,
        radius: currentRadius,
        name: 'Великое Гнездо'
      };
      this.selectedItem = this.levelData.finishZone;
      this.selectedCategory = 'finish';
      audio.playClick();
      this.showToast(`🏁 Финиш установлен в (${posX}, ${posY})`);
      this.updatePropertiesPanel();
      return;
    }

    // 3. Зона Гнезда
    if (tpl.category === 'nests') {
      const idx = this.levelData.nests.length + 1;
      const newNest = {
        id: idx,
        key: 'zone_nest',
        name: `Гнездо ${idx}`,
        title: `Гнездо ${idx}`,
        x: posX,
        y: posY,
        cupX: posX,
        cupY: posY,
        radius: tpl.radius || 46,
        isZoneOnly: true,
        filled: false
      };
      this.levelData.nests.push(newNest);
      this.selectedItem = newNest;
      this.selectedCategory = 'nests';
      audio.playClick();
      this.showToast(`🪺 Добавлено: ${newNest.name}`);
      this.updatePropertiesPanel();
      return;
    }

    // 4. Зона Кормушки
    if (tpl.category === 'feeders') {
      const idx = this.levelData.feeders.length + 1;
      const newFeeder = {
        id: idx,
        key: 'zone_feeder',
        name: `Кормушка ${idx}`,
        x: posX,
        y: posY,
        radius: tpl.radius || 52,
        isZoneOnly: true,
        visited: false
      };
      this.levelData.feeders.push(newFeeder);
      this.selectedItem = newFeeder;
      this.selectedCategory = 'feeders';
      audio.playClick();
      this.showToast(`🏡 Добавлена: ${newFeeder.name}`);
      this.updatePropertiesPanel();
      return;
    }

    // 5. Враг
    if (tpl.category === 'enemies') {
      const newEnemy = {
        type: tpl.type,
        key: tpl.key,
        name: tpl.name,
        x: posX,
        y: posY,
        scale: tpl.defaultScale || 0.36
      };
      this.syncEnemyPhysicsFields(newEnemy);
      this.levelData.enemies.push(newEnemy);
      this.selectedItem = newEnemy;
      this.selectedCategory = 'enemies';
      audio.playClick();
      this.showToast(`Добавлен враг: ${tpl.name}`);
      this.updatePropertiesPanel();
    }
  }

  duplicateSelectedItem() {
    if (!this.selectedItem || !this.selectedCategory) return;

    // Старт и Финиш дублировать нельзя — они уникальны
    if (this.selectedCategory === 'start' || this.selectedCategory === 'finish') {
      this.showToast('Старт и Финиш уникальны и не дублируются');
      return;
    }

    const list = this.levelData[this.selectedCategory];
    if (!Array.isArray(list)) return;

    const clone = JSON.parse(JSON.stringify(this.selectedItem));
    clone.x += 60;
    if (clone.cupX !== undefined) clone.cupX = clone.x;
    if (this.selectedCategory === 'enemies') {
      this.syncEnemyPhysicsFields(clone);
    }

    list.push(clone);
    this.selectedItem = clone;
    audio.playClick();
    this.showToast('Объект продублирован');
    this.updatePropertiesPanel();
  }

  deleteSelectedItem() {
    if (!this.selectedItem || !this.selectedCategory) return;

    if (this.selectedCategory === 'start' || this.selectedCategory === 'finish') {
      this.showToast('Точку Старта и Финиша нельзя удалить, только переместить!');
      return;
    }

    const list = this.levelData[this.selectedCategory];
    if (!Array.isArray(list)) return;

    const idx = list.indexOf(this.selectedItem);
    if (idx !== -1) {
      list.splice(idx, 1);
      audio.playClick();
      this.showToast('Удалено');
      this.selectedItem = null;
      this.selectedCategory = null;
      this.updatePropertiesPanel();
    }
  }

  /* ==========================================================================
     Переключение режимов
     ========================================================================== */
  setSelectMode() {
    this.currentTool = 'select';
    this.placingAsset = null;

    document.querySelectorAll('.palette-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('ed-tool-select')?.classList.add('active');
    document.getElementById('ed-pal-tool-select')?.classList.add('active');
    document.getElementById('ed-placement-indicator')?.classList.add('hidden');
  }

  setPlaceMode(asset) {
    this.currentTool = 'place';
    this.placingAsset = asset;
    this.selectedItem = null;
    this.selectedCategory = null;
    this.updatePropertiesPanel();

    document.getElementById('ed-tool-select')?.classList.remove('active');
    document.getElementById('ed-pal-tool-select')?.classList.remove('active');

    const ind = document.getElementById('ed-placement-indicator');
    const indName = document.getElementById('ed-placement-item-name');
    if (ind && indName) {
      indName.textContent = asset.name;
      ind.classList.remove('hidden');
    }
  }

  /* ==========================================================================
     Сохранение, Импорт и Тестирование в Игре
     ========================================================================== */
  async saveLevel() {
    audio.playClick();
    const jsonString = JSON.stringify(this.levelData, null, 2);

    localStorage.setItem('birday_stage1_custom_level', jsonString);

    try {
      const resp = await fetch('/api/save-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString
      });
      const res = await resp.json();
      if (res && res.success) {
        audio.playSuccess();
        this.showToast('💾 Сохранено в data/stage1_level.json!');
        return;
      }
    } catch (e) {}

    audio.playSuccess();
    this.showToast('💾 Сохранено в браузере (localStorage)!');
  }

  downloadJSON() {
    audio.playClick();
    const jsonString = JSON.stringify(this.levelData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stage1_level.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('📥 Файл stage1_level.json скачан!');
  }

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const parsed = JSON.parse(re.target.result);
          if (parsed) {
            this.levelData = {
              worldWidth: parsed.worldWidth || 14999,
              worldHeight: parsed.worldHeight || 720,
              groundY: parsed.groundY || 660,
              startPoint: parsed.startPoint || { x: 120, y: 260, name: 'Старт' },
              finishZone: parsed.finishZone || { x: 14500, y: 320, radius: 110, name: 'Великое Гнездо' },
              nests: parsed.nests || [],
              feeders: parsed.feeders || [],
              enemies: parsed.enemies || [],
              scenery: [],
              animals: []
            };
            this.levelData.enemies.forEach(en => this.syncEnemyPhysicsFields(en));
            this.selectedItem = null;
            this.updatePropertiesPanel();
            audio.playSuccess();
            this.showToast('📤 Уровень успешно импортирован!');
          }
        } catch (err) {
          this.showToast('Ошибка: неверный формат JSON');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  clearAllElements() {
    audio.playClick();
    if (confirm('🗑️ Очистить все гнёзда, кормушки и врагов с карты? (Старт и Финиш останутся)')) {
      this.levelData.nests = [];
      this.levelData.feeders = [];
      this.levelData.enemies = [];
      this.selectedItem = null;
      this.selectedCategory = null;
      this.setSelectMode();
      this.updatePropertiesPanel();
      audio.playSuccess();
      this.showToast('Все зоны и враги очищены!');
    }
  }

  testInGame() {
    audio.playClick();
    // Сохраняем в localStorage, чтобы Stage1Level при старте подхватил актуальную разметку
    localStorage.setItem('birday_stage1_custom_level', JSON.stringify(this.levelData));

    if (this.stage1Level) {
      this.stage1Level.applyLevelData(this.levelData);
    }

    events.emit('stage:switch_to_level1');
    this.showToast('▶️ Запускаем тестовый полёт!');
  }

  /* ==========================================================================
     Запуск и Остановка
     ========================================================================== */
  async start() {
    this.isActive = true;
    this.selectedItem = null;
    this.placingAsset = null;
    this.currentTool = 'select';

    if (this.canvas) {
      this.canvas.style.display = 'block';
    }

    await this.loadLevelData();
    this.createEditorUI();
    this.setSelectMode();
  }

  stop() {
    this.isActive = false;
    this.removeEditorUI();
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
  }

  /* ==========================================================================
     Компактный UI Редактора
     ========================================================================== */
  createEditorUI() {
    this.removeEditorUI();

    const root = document.createElement('div');
    root.id = 'stage1-level-editor-ui';
    root.className = 'stage1-editor-ui';

    root.innerHTML = `
      <header class="editor-header-bar">
        <div class="editor-title-group">
          <span class="editor-badge">🛠️ РАЗМЕТКА УРОВНЯ 1</span>
          <span class="editor-cam-pos" id="ed-cam-text">X: 0 / ${this.worldWidth} px</span>
        </div>

        <div class="editor-tools-group">
          <button id="ed-tool-select" class="ed-btn-tool active" title="Выбор и перемещение (V или Esc)">
            👆 ВЫБОР
          </button>
          <div id="ed-placement-indicator" class="ed-placement-pill hidden">
            <span class="pill-label">➕</span>
            <span id="ed-placement-item-name" class="pill-name"></span>
            <button id="ed-placement-cancel-btn" class="pill-cancel" title="Отмена (Esc / ПКМ)">✕</button>
          </div>
        </div>

        <div class="editor-scrubber-box">
          <span class="scrub-label">Карта:</span>
          <input type="range" id="ed-cam-scrubber" min="0" max="${this.worldWidth - this.viewWidth}" value="${this.cameraX}" step="20">
        </div>

        <div class="editor-top-actions">
          <button id="ed-btn-grid" class="ed-btn ${this.snapToGrid ? 'active' : ''}" title="Привязка к сетке 20px">
            🧲 Сетка
          </button>
          <button id="ed-btn-clear" class="ed-btn ed-btn-danger" title="Очистить гнёзда, кормушки и врагов">
            🗑️ Очистить
          </button>
          <button id="ed-btn-save" class="ed-btn ed-btn-green" title="Сохранить в data/stage1_level.json">
            💾 СОХРАНИТЬ
          </button>
          <button id="ed-btn-download" class="ed-btn" title="Скачать JSON">
            📥 JSON
          </button>
          <button id="ed-btn-import" class="ed-btn" title="Импортировать JSON">
            📤 Импорт
          </button>
          <button id="ed-btn-play" class="ed-btn ed-btn-primary" title="Протестировать уровень в игре">
            ▶️ ИГРАТЬ
          </button>
          <button id="ed-btn-exit" class="ed-btn" title="Выйти в меню">
            🏠 Меню
          </button>
        </div>
      </header>

      <!-- Панель свойств выбранной зоны или врага -->
      <aside id="editor-props-panel" class="editor-props-panel hidden">
        <div class="props-header">
          <span class="props-title" id="prop-obj-name">Объект</span>
          <button id="prop-btn-close" class="props-close">✕</button>
        </div>
        <div class="props-body">
          <div class="props-row">
            <label>Название:</label>
            <input type="text" id="prop-in-name" placeholder="Название">
          </div>
          <div class="props-row">
            <label>Позиция X:</label>
            <input type="number" id="prop-in-x" step="5">
          </div>
          <div class="props-row">
            <label>Позиция Y:</label>
            <input type="number" id="prop-in-y" step="5">
          </div>
          <div class="props-row" id="prop-row-radius">
            <label>Радиус зоны: <span id="prop-val-radius">46 px</span></label>
            <input type="range" id="prop-slide-radius" min="16" max="220" step="2" value="46">
          </div>
          <div class="props-row" id="prop-row-scale">
            <label>Размер врага: <span id="prop-val-scale">0.36</span></label>
            <input type="range" id="prop-slide-scale" min="0.15" max="1.2" step="0.02" value="0.36">
          </div>
          <div class="props-actions" id="prop-actions-box">
            <button id="prop-btn-dup" class="props-action-btn" title="Дублировать (Ctrl+D)">📋 Копия</button>
            <button id="prop-btn-del" class="props-action-btn btn-danger" title="Удалить (Delete)">🗑️ Удалить</button>
          </div>
        </div>
      </aside>

      <!-- Нижняя панель: только Зоны и Враги -->
      <footer class="editor-palette-drawer">
        <div class="palette-tabs-row">
          <button class="pal-tab pal-tab-select active" id="ed-pal-tool-select">
            👆 ВЫБОР
          </button>
          <div class="pal-tab-divider"></div>
          <button class="pal-tab active" data-tab="zones">🎯 Зоны (Старт / Гнёзда / Финиш)</button>
          <button class="pal-tab" data-tab="enemies">🐝 Враги (Пчёлы / Вороны / Белки)</button>
        </div>
        <div class="palette-items-scroller" id="palette-items-list"></div>
      </footer>
    `;

    document.getElementById('game-container').appendChild(root);
    this.editorContainer = root;

    this.renderPaletteItems('zones');
    this.bindUIButtons(root);
  }

  removeEditorUI() {
    if (this.editorContainer) {
      this.editorContainer.remove();
      this.editorContainer = null;
    }
  }

  bindUIButtons(root) {
    root.querySelector('#ed-tool-select')?.addEventListener('click', () => this.setSelectMode());
    root.querySelector('#ed-pal-tool-select')?.addEventListener('click', () => this.setSelectMode());
    root.querySelector('#ed-placement-cancel-btn')?.addEventListener('click', () => this.setSelectMode());

    const tabs = root.querySelectorAll('.pal-tab[data-tab]');
    tabs.forEach(t => {
      t.addEventListener('click', () => {
        tabs.forEach(o => o.classList.remove('active'));
        t.classList.add('active');
        this.renderPaletteItems(t.getAttribute('data-tab'));
      });
    });

    const scrubber = root.querySelector('#ed-cam-scrubber');
    scrubber?.addEventListener('input', (e) => {
      this.cameraX = parseInt(e.target.value, 10) || 0;
      this.updateCameraScrubber();
    });

    const btnGrid = root.querySelector('#ed-btn-grid');
    btnGrid?.addEventListener('click', () => {
      this.snapToGrid = !this.snapToGrid;
      btnGrid.classList.toggle('active', this.snapToGrid);
    });

    root.querySelector('#ed-btn-clear')?.addEventListener('click', () => this.clearAllElements());
    root.querySelector('#ed-btn-save')?.addEventListener('click', () => this.saveLevel());
    root.querySelector('#ed-btn-download')?.addEventListener('click', () => this.downloadJSON());
    root.querySelector('#ed-btn-import')?.addEventListener('click', () => this.importJSON());
    root.querySelector('#ed-btn-play')?.addEventListener('click', () => this.testInGame());
    root.querySelector('#ed-btn-exit')?.addEventListener('click', () => events.emit('stage:exit_to_title'));

    root.querySelector('#prop-btn-close')?.addEventListener('click', () => {
      this.selectedItem = null;
      this.selectedCategory = null;
      this.updatePropertiesPanel();
    });
    root.querySelector('#prop-btn-dup')?.addEventListener('click', () => this.duplicateSelectedItem());
    root.querySelector('#prop-btn-del')?.addEventListener('click', () => this.deleteSelectedItem());

    root.querySelector('#prop-in-name')?.addEventListener('input', (e) => {
      if (!this.selectedItem) return;
      this.selectedItem.name = e.target.value;
      if (this.selectedItem.title !== undefined) this.selectedItem.title = e.target.value;
      const titleEl = document.getElementById('prop-obj-name');
      if (titleEl) titleEl.textContent = e.target.value || 'Объект';
    });

    root.querySelector('#prop-in-x')?.addEventListener('input', (e) => {
      if (!this.selectedItem) return;
      this.selectedItem.x = parseInt(e.target.value, 10) || 0;
      if (this.selectedCategory === 'nests') this.selectedItem.cupX = this.selectedItem.x;
      if (this.selectedCategory === 'enemies') this.syncEnemyPhysicsFields(this.selectedItem);
    });

    root.querySelector('#prop-in-y')?.addEventListener('input', (e) => {
      if (!this.selectedItem) return;
      this.selectedItem.y = parseInt(e.target.value, 10) || 0;
      if (this.selectedCategory === 'nests') this.selectedItem.cupY = this.selectedItem.y;
      if (this.selectedCategory === 'enemies') this.syncEnemyPhysicsFields(this.selectedItem);
    });

    root.querySelector('#prop-slide-radius')?.addEventListener('input', (e) => {
      if (!this.selectedItem) return;
      const r = parseInt(e.target.value, 10) || 46;
      this.selectedItem.radius = r;
      const valEl = document.getElementById('prop-val-radius');
      if (valEl) valEl.textContent = `${r} px`;
    });

    root.querySelector('#prop-slide-scale')?.addEventListener('input', (e) => {
      if (!this.selectedItem) return;
      const sc = parseFloat(e.target.value) || 0.36;
      this.selectedItem.scale = sc;
      const valEl = document.getElementById('prop-val-scale');
      if (valEl) valEl.textContent = sc.toFixed(2);
    });
  }

  renderPaletteItems(tabKey) {
    const list = document.getElementById('palette-items-list');
    if (!list) return;

    list.innerHTML = '';
    const items = EDITOR_TOOLS_CATALOG.filter(a => a.tab === tabKey);

    items.forEach(asset => {
      const card = document.createElement('div');
      card.className = `palette-card ${this.placingAsset === asset ? 'selected' : ''}`;

      const img = asset.key ? this.images[asset.key] : null;
      const thumbHTML = img
        ? `<img src="${img.src}" alt="${asset.name}" class="pal-thumb-img">`
        : `<span style="font-size: 26px;">${asset.badge || '🎯'}</span>`;

      card.innerHTML = `
        <div class="pal-thumb-box" style="display:flex;align-items:center;justify-content:center;">
          ${thumbHTML}
        </div>
        <span class="pal-card-name">${asset.name}</span>
      `;

      card.addEventListener('click', () => {
        if (this.placingAsset === asset) {
          this.setSelectMode();
        } else {
          document.querySelectorAll('.palette-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.setPlaceMode(asset);
        }
      });

      list.appendChild(card);
    });
  }

  updateCameraScrubber() {
    const scrubber = document.getElementById('ed-cam-scrubber');
    if (scrubber) scrubber.value = Math.round(this.cameraX);
    const text = document.getElementById('ed-cam-text');
    if (text) text.textContent = `X: ${Math.round(this.cameraX)} / ${this.worldWidth} px`;
  }

  updatePropertiesPanel() {
    const panel = document.getElementById('editor-props-panel');
    if (!panel) return;

    if (!this.selectedItem) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    const nameEl = document.getElementById('prop-obj-name');
    if (nameEl) nameEl.textContent = this.selectedItem.name || this.selectedItem.title || 'Объект';

    this.updatePropertiesInputs();
  }

  updatePropertiesInputs() {
    if (!this.selectedItem) return;

    const inName = document.getElementById('prop-in-name');
    if (inName) inName.value = this.selectedItem.name || this.selectedItem.title || '';

    const inX = document.getElementById('prop-in-x');
    if (inX) inX.value = this.selectedItem.x;

    const inY = document.getElementById('prop-in-y');
    if (inY) inY.value = this.selectedItem.y;

    const rowRadius = document.getElementById('prop-row-radius');
    const rowScale = document.getElementById('prop-row-scale');
    const actionsBox = document.getElementById('prop-actions-box');

    const isEnemy = this.selectedCategory === 'enemies';
    const isStartOrFinish = this.selectedCategory === 'start' || this.selectedCategory === 'finish';

    if (rowRadius) {
      rowRadius.style.display = (!isEnemy && this.selectedItem.radius !== undefined) ? 'flex' : 'none';
      if (this.selectedItem.radius !== undefined) {
        document.getElementById('prop-slide-radius').value = this.selectedItem.radius;
        document.getElementById('prop-val-radius').textContent = `${this.selectedItem.radius} px`;
      }
    }

    if (rowScale) {
      rowScale.style.display = isEnemy ? 'flex' : 'none';
      if (isEnemy) {
        const sc = this.selectedItem.scale || 0.36;
        document.getElementById('prop-slide-scale').value = sc;
        document.getElementById('prop-val-scale').textContent = sc.toFixed(2);
      }
    }

    if (actionsBox) {
      actionsBox.style.display = isStartOrFinish ? 'none' : 'flex';
    }
  }

  showToast(text) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s';
      setTimeout(() => t.remove(), 300);
    }, 1800);
  }

  /* ==========================================================================
     Рендеринг Карты и Зон
     ========================================================================== */
  update(dt) {}

  render() {
    if (!this.ctx || !this.isActive) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

    // 1. Отрисовка фоновой панорамы Forest.png
    if (this.stage1Level) {
      this.stage1Level.cameraX = this.cameraX;
      this.stage1Level.renderParallaxBackground(ctx);
    }

    ctx.save();
    ctx.translate(-Math.round(this.cameraX), 0);

    // 2. Зоны Гнёзд
    this.levelData.nests.forEach((n, idx) => {
      const cx = n.cupX !== undefined ? n.cupX : n.x;
      const cy = n.cupY !== undefined ? n.cupY : n.y;
      this.drawZoneCircle(ctx, cx, cy, n.radius || 46, '#facc15', `🪺 ${n.name || `Гнездо ${idx + 1}`}`);
    });

    // 3. Зоны Кормушек
    this.levelData.feeders.forEach((f, idx) => {
      this.drawZoneCircle(ctx, f.x, f.y, f.radius || 52, '#4ade80', `🏡 ${f.name || `Кормушка ${idx + 1}`}`);
    });

    // 4. Точка Старта и Зона Финиша
    const sp = this.levelData.startPoint;
    if (sp) {
      this.drawZoneCircle(ctx, sp.x, sp.y, 30, '#38bdf8', `🚩 СТАРТ (${sp.x}, ${sp.y})`);
    }

    const fz = this.levelData.finishZone;
    if (fz) {
      this.drawZoneCircle(ctx, fz.x, fz.y, fz.radius || 110, '#facc15', `🏁 ФИНИШ: ${fz.name || 'Великое Гнездо'}`);
    }

    // 5. Враги
    this.levelData.enemies.forEach(en => {
      if (en.x < this.cameraX - 250 || en.x > this.cameraX + this.viewWidth + 250) return;
      const img = this.images[en.key];
      const sc = en.scale || 0.36;
      ctx.save();
      if (img && img.complete && img.naturalWidth > 0) {
        const w = img.width * sc;
        const h = img.height * sc;
        ctx.drawImage(img, en.x - w / 2, en.y - h / 2, w, h);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(en.x, en.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = 'bold 11px "8bitoperator", monospace';
      ctx.fillStyle = '#fca5a5';
      ctx.textAlign = 'center';
      ctx.fillText(en.name || en.type, en.x, en.y - 36);
      ctx.restore();
    });

    // 6. Рамка выделения / наведения
    this.renderSelectionOutlines(ctx);

    ctx.restore();

    // 7. Призрак размещаемой зоны/врага под курсором
    if (this.placingAsset) {
      this.renderPlacementGhost(ctx);
    }

    if (this.snapToGrid) {
      this.renderGrid(ctx);
    }
  }

  drawZoneCircle(ctx, x, y, radius, color, label) {
    if (x + radius < this.cameraX - 100 || x - radius > this.cameraX + this.viewWidth + 100) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color + '22'; // Полупрозрачная заливка
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Центральная точка
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Подпись с читаемой подложкой
    ctx.font = 'bold 11px "8bitoperator", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillText(label, x + 1, y - radius - 7);
    ctx.fillStyle = color;
    ctx.fillText(label, x, y - radius - 8);
    ctx.restore();
  }

  renderSelectionOutlines(ctx) {
    const target = this.selectedItem || this.hoveredItem;
    if (!target) return;

    const isSelected = target === this.selectedItem;
    const cx = target.cupX !== undefined ? target.cupX : target.x;
    const cy = target.cupY !== undefined ? target.cupY : target.y;

    ctx.save();
    ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = isSelected ? 2.5 : 2;
    ctx.setLineDash(isSelected ? [] : [4, 4]);

    if (target.type && this.images[target.key]) {
      // Выделен враг
      const img = this.images[target.key];
      const sc = target.scale || 0.36;
      const w = img.width * sc;
      const h = img.height * sc;
      ctx.strokeRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8);
    } else {
      // Выделена круглая зона
      const r = target.radius || 30;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderPlacementGhost(ctx) {
    let posX = this.mouseX;
    let posY = this.mouseY;

    if (this.snapToGrid) {
      const worldX = posX + this.cameraX;
      posX = (Math.round(worldX / this.gridStep) * this.gridStep) - this.cameraX;
      posY = Math.round(posY / this.gridStep) * this.gridStep;
    }

    const tpl = this.placingAsset;
    ctx.save();

    if (tpl.category === 'enemies') {
      const img = this.images[tpl.key];
      const sc = tpl.defaultScale || 0.36;
      if (img && img.complete && img.naturalWidth > 0) {
        const w = img.width * sc;
        const h = img.height * sc;
        ctx.globalAlpha = 0.7;
        ctx.drawImage(img, posX - w / 2, posY - h / 2, w, h);
      }
      ctx.font = 'bold 12px "8bitoperator", monospace';
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'center';
      ctx.fillText(`[ЛКМ: Поставить ${tpl.name} | ПКМ: Выход]`, posX, posY - 45);
    } else {
      const r = tpl.radius || 46;
      const col = tpl.color || '#facc15';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(posX, posY, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = 'bold 12px "8bitoperator", monospace';
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      ctx.fillText(`[ЛКМ: ${tpl.name} | ПКМ: Выход]`, posX, posY - r - 10);
    }

    ctx.restore();
  }

  renderGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.viewWidth; x += this.gridStep * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.viewHeight);
      ctx.stroke();
    }
    for (let y = 0; y < this.viewHeight; y += this.gridStep * 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.viewWidth, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}