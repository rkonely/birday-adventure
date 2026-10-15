import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';
import { STAGE1_ASSETS_MANIFEST } from './Stage1Assets.js';

/**
 * Stage1Editor — Интерактивный визуальный Конструктор / Редактор уровней Этапа 1.
 * 
 * Возможности:
 * - Свободное перемещение по миру (0 - 7600px) с помощью мыши, миникарты и клавиш A/D
 * - Каталог ВСЕХ 140+ ассетов: Деревья, Пни, Камни, Лианы, Животные, Враги, Кормушки, Гнёзда
 * - Режим добавления (Placement): клик по ассету в палитре -> клик на холсте для размещения
 * - Режим выбора (Select): клик по любому объекту -> перемещение перетаскиванием (Drag & Drop)
 * - Изменение масштаба колесиком мыши или ползунком
 * - Дублирование (Ctrl+D), удаление (Delete / Backspace), смена слоёв (Слой 3 / Слой 4)
 * - Кнопка [💾 Сохранить в проект] (POST /api/save-level + localStorage)
 * - Кнопка [📥 Скачать JSON] и [📤 Загрузить JSON]
 * - Кнопка [▶️ Тест / Играть] для мгновенной проверки созданного уровня
 */
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

    // Ссылки на загруженные изображения из Stage1Level
    this.images = stage1Level ? stage1Level.images : {};

    // Данные уровня для редактирования
    this.levelData = {
      worldWidth: 14999,
      worldHeight: 720,
      groundY: 660,
      startPoint: { x: 30, y: 64, name: 'Старт' },
      finishZone: { x: 14500, y: 320, radius: 110, name: 'Великое Гнездо' },
      scenery: [],
      animals: [],
      enemies: [],
      feeders: [],
      nests: []
    };

    // Выбранный объект и режим
    this.selectedItem = null;
    this.selectedCategory = null; // 'scenery', 'animals', 'enemies', 'feeders', 'nests'
    this.hoveredItem = null;
    this.placingAsset = null; // если выбран ассет для размещения из палитры
    this.currentTool = 'select'; // 'select' | 'place'

    // Перетаскивание
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.isPanningCamera = false;
    this.panStartX = 0;
    this.panStartCamX = 0;

    // Настройки сетки
    this.snapToGrid = false;
    this.gridStep = 20;

    // Мышь в координатах холста
    this.mouseX = 640;
    this.mouseY = 360;

    // UI Оверлей редактора
    this.editorContainer = null;
    this.activeTab = 'zones';

    this.initAssetCatalog();
    this.bindEditorEvents();
  }

  /* ==========================================================================
     Каталог доступных ассетов для палитры редактора (все 140+ объектов)
     ========================================================================== */
  initAssetCatalog() {
    this.assetCatalog = STAGE1_ASSETS_MANIFEST.filter(a => a.tab !== 'backgrounds' && a.tab !== 'level');
  }

  /* ==========================================================================
     Загрузка данных в редактор
     ========================================================================== */
  async loadLevelData() {
    // 1. Проверяем наличие на сервере через API /api/load-level
    try {
      const resp = await fetch('/api/load-level');
      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.worldWidth || data.nests || data.feeders || data.scenery)) {
          this.levelData = data;
          if (data.worldWidth) this.worldWidth = data.worldWidth;
          if (data.groundY) this.groundY = data.groundY;
          console.log('✅ [Stage1Editor] Уровень успешно загружен из data/stage1_level.json');
          return;
        }
      }
    } catch (e) {
      console.warn('[Stage1Editor] Не удалось загрузить из API, проверяем localStorage');
    }

    // 2. Проверяем localStorage
    const saved = localStorage.getItem('birday_stage1_custom_level');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && (data.worldWidth || data.nests || data.feeders || data.scenery)) {
          this.levelData = data;
          if (data.worldWidth) this.worldWidth = data.worldWidth;
          if (data.groundY) this.groundY = data.groundY;
          console.log('✅ [Stage1Editor] Уровень загружен из localStorage');
          return;
        }
      } catch (e) {}
    }

    // 3. Если ничего нет — берем дефолтные массивы из stage1Level
    if (this.stage1Level) {
      this.levelData = {
        worldWidth: this.stage1Level.worldWidth,
        worldHeight: this.stage1Level.worldHeight,
        groundY: this.stage1Level.groundY,
        startPoint: { ...(this.stage1Level.missionStartPoint || { x: 30, y: 64, name: 'Старт' }) },
        finishZone: this.stage1Level.finishZone ? { ...this.stage1Level.finishZone } : { x: 14500, y: 320, radius: 110, name: 'Великое Гнездо' },
        scenery: JSON.parse(JSON.stringify(this.stage1Level.scenery || [])),
        animals: JSON.parse(JSON.stringify(this.stage1Level.animals || [])),
        enemies: JSON.parse(JSON.stringify(this.stage1Level.enemies || [])),
        feeders: JSON.parse(JSON.stringify(this.stage1Level.feeders || [])),
        nests: JSON.parse(JSON.stringify(this.stage1Level.nests || []))
      };
      this.worldWidth = this.stage1Level.worldWidth;
      this.groundY = this.stage1Level.groundY;
    }
  }

  /* ==========================================================================
     События мыши и клавиатуры в редакторе
     ========================================================================== */
  bindEditorEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      // Панорамирование камеры A/D или стрелки
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.cameraX = Math.max(0, this.cameraX - 60);
        this.updateCameraScrubber();
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.cameraX = Math.min(this.worldWidth - this.viewWidth, this.cameraX + 60);
        this.updateCameraScrubber();
      }

      // Удаление выделенного объекта
      if ((e.code === 'Delete' || e.code === 'Backspace') && this.selectedItem) {
        e.preventDefault();
        this.deleteSelectedItem();
      }

      // Дублирование выделенного объекта (Ctrl+D)
      if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey) && this.selectedItem) {
        e.preventDefault();
        this.duplicateSelectedItem();
      }

      // Горячая клавиша V - переключение в режим выбора (курсор)
      if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey) {
        this.setSelectMode();
      }

      // Отмена выбора / режима размещения (Esc)
      if (e.code === 'Escape') {
        if (this.placingAsset) {
          this.setSelectMode();
        } else if (this.selectedItem) {
          this.selectedItem = null;
          this.updatePropertiesPanel();
        }
      }
    });

    // Обработка клика и перетаскивания на Canvas
    if (this.canvas) {
      this.canvas.addEventListener('contextmenu', (e) => {
        if (this.isActive) e.preventDefault();
      });

      this.canvas.addEventListener('pointerdown', (e) => {
        if (!this.isActive) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.viewWidth / rect.width;
        const scaleY = this.viewHeight / rect.height;
        const localX = (e.clientX - rect.left) * scaleX;
        const localY = (e.clientY - rect.top) * scaleY;
        const worldX = localX + this.cameraX;

        // ПКМ при активном размещении — мгновенная отмена и переход в режим выбора
        if (e.button === 2 && this.placingAsset) {
          e.preventDefault();
          this.setSelectMode();
          return;
        }

        // Средняя кнопка или ПКМ — панорамирование камеры
        if (e.button === 1 || e.button === 2) {
          e.preventDefault();
          this.isPanningCamera = true;
          this.panStartX = e.clientX;
          this.panStartCamX = this.cameraX;
          return;
        }

        // ЛКМ: если в режиме размещения — ставим новый объект!
        if (e.button === 0 && this.placingAsset) {
          this.placeNewObject(worldX, localY);
          return;
        }

        // ЛКМ: выбор объекта под курсором
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

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.viewWidth / rect.width;
        const scaleY = this.viewHeight / rect.height;
        this.mouseX = (e.clientX - rect.left) * scaleX;
        this.mouseY = (e.clientY - rect.top) * scaleY;
        const worldX = this.mouseX + this.cameraX;

        // Панорамирование камеры мышью
        if (this.isPanningCamera) {
          const dx = (e.clientX - this.panStartX) * scaleX;
          this.cameraX = Math.max(0, Math.min(this.worldWidth - this.viewWidth, this.panStartCamX - dx));
          this.updateCameraScrubber();
          return;
        }

        // Перетаскивание выбранного объекта
        if (this.isDragging && this.selectedItem) {
          let newX = worldX - this.dragOffsetX;
          let newY = this.mouseY - this.dragOffsetY;

          if (this.snapToGrid) {
            newX = Math.round(newX / this.gridStep) * this.gridStep;
            newY = Math.round(newY / this.gridStep) * this.gridStep;
          }

          this.selectedItem.x = Math.round(newX);
          this.selectedItem.y = Math.round(newY);

          // Обновляем cupX / cupY для гнезда
          if (this.selectedItem.cupX !== undefined) {
            this.selectedItem.cupX = this.selectedItem.x;
            this.selectedItem.cupY = this.selectedItem.y - 5;
          }

          this.updatePropertiesInputs();
          return;
        }

        // Подсветка при наведении
        if (!this.placingAsset && !this.isDragging) {
          const hit = this.hitTest(worldX, this.mouseY);
          this.hoveredItem = hit ? hit.item : null;
        }
      });

      window.addEventListener('pointerup', (e) => {
        if (!this.isActive) return;
        this.isDragging = false;
        this.isPanningCamera = false;
      });

      // Изменение масштаба колесиком мыши для выбранного объекта
      this.canvas.addEventListener('wheel', (e) => {
        if (!this.isActive || !this.selectedItem) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.03 : -0.03;
        const newScale = Math.max(0.15, Math.min(2.5, (this.selectedItem.scale || 0.5) + delta));
        this.selectedItem.scale = parseFloat(newScale.toFixed(2));
        this.updatePropertiesInputs();
      }, { passive: false });
    }
  }

  /* ==========================================================================
     Поиск объекта под курсором (Hit Test)
     ========================================================================== */
  hitTest(worldX, screenY) {
    // 1. Проверяем зону финиша
    if (this.levelData.finishZone) {
      const fz = this.levelData.finishZone;
      const r = fz.radius || 110;
      if (Math.hypot(worldX - fz.x, screenY - fz.y) <= r) {
        return { item: fz, category: 'finish' };
      }
    }

    // 2. Проверяем точку старта
    const startPoint = this.levelData.startPoint || this.levelData.checkpoint;
    if (startPoint) {
      if (Math.hypot(worldX - startPoint.x, screenY - startPoint.y) <= 40) {
        return { item: startPoint, category: 'start' };
      }
    }

    const categories = ['nests', 'feeders', 'enemies', 'animals', 'scenery'];

    for (const cat of categories) {
      const list = this.levelData[cat] || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];

        // Зоны с радиусом (гнёзда, кормушки)
        if (item.radius !== undefined) {
          const cx = item.cupX !== undefined ? item.cupX : item.x;
          const cy = item.cupY !== undefined ? item.cupY : item.y;
          const r = item.radius || 46;
          if (Math.hypot(worldX - cx, screenY - cy) <= r + 8) {
            return { item, category: cat };
          }
        }

        // Спрайтовые объекты
        const img = this.images[item.key || item.emptyKey];
        if (img) {
          const w = (img.width || 100) * (item.scale || 0.5);
          const h = (img.height || 100) * (item.scale || 0.5);

          const left = item.x - w / 2;
          const right = item.x + w / 2;
          const top = item.y - h / 2;
          const bottom = item.y + h / 2;

          if (worldX >= left && worldX <= right && screenY >= top && screenY <= bottom) {
            return { item, category: cat };
          }
        }
      }
    }
    return null;
  }

  /* ==========================================================================
     Размещение нового объекта или интерактивной зоны
     ========================================================================== */
  placeNewObject(worldX, screenY) {
    if (!this.placingAsset) return;

    let posX = worldX;
    let posY = screenY;

    if (this.snapToGrid) {
      posX = Math.round(posX / this.gridStep) * this.gridStep;
      posY = Math.round(posY / this.gridStep) * this.gridStep;
    }

    const template = this.placingAsset;

    // 1. Точка старта птицы
    if (template.type === 'zone_start') {
      const sp = {
        x: Math.round(posX),
        y: Math.round(posY),
        name: 'Старт'
      };
      this.levelData.startPoint = sp;
      delete this.levelData.checkpoint;
      this.selectedItem = sp;
      this.selectedCategory = 'start';
      audio.playClick();
      this.showToast('Точка старта птицы установлена!');
      this.updatePropertiesPanel();
      return;
    }

    // 2. Зона финиша (Великое гнездо)
    if (template.type === 'zone_finish') {
      this.levelData.finishZone = {
        x: Math.round(posX),
        y: Math.round(posY),
        radius: 110,
        name: 'Великое Гнездо'
      };
      this.selectedItem = this.levelData.finishZone;
      this.selectedCategory = 'finish';
      audio.playClick();
      this.showToast('Финишная зона установлена!');
      this.updatePropertiesPanel();
      return;
    }

    // 3. Зона гнезда (цель для яйца)
    if (template.category === 'nests' || template.type === 'zone_nest') {
      if (!this.levelData.nests) this.levelData.nests = [];
      const count = this.levelData.nests.length + 1;
      const newNest = {
        key: 'zone_nest',
        name: `Гнездо ${count}`,
        title: `Гнездо ${count}`,
        x: Math.round(posX),
        y: Math.round(posY),
        cupX: Math.round(posX),
        cupY: Math.round(posY),
        radius: template.radius || 46,
        isZoneOnly: true,
        filled: false
      };
      this.levelData.nests.push(newNest);
      this.selectedItem = newNest;
      this.selectedCategory = 'nests';
      audio.playClick();
      this.showToast(`Отмечена зона: ${newNest.name}`);
      this.updatePropertiesPanel();
      return;
    }

    // 4. Зона кормушки (пополнение энергии)
    if (template.category === 'feeders' || template.type === 'zone_feeder') {
      if (!this.levelData.feeders) this.levelData.feeders = [];
      const count = this.levelData.feeders.length + 1;
      const newFeeder = {
        key: 'zone_feeder',
        name: `Кормушка ${count}`,
        x: Math.round(posX),
        y: Math.round(posY),
        radius: template.radius || 52,
        isZoneOnly: true,
        visited: false
      };
      this.levelData.feeders.push(newFeeder);
      this.selectedItem = newFeeder;
      this.selectedCategory = 'feeders';
      audio.playClick();
      this.showToast(`Отмечена зона: ${newFeeder.name}`);
      this.updatePropertiesPanel();
      return;
    }

    // 5. Обычный спрайтовый объект (деревья, враги, животные и т.д.)
    const newItem = {
      key: template.key,
      x: Math.round(posX),
      y: Math.round(posY),
      scale: template.defaultScale || 0.5,
      opacity: template.opacity !== undefined ? template.opacity : 1.0
    };

    if (template.type) newItem.type = template.type;
    if (template.isHazard !== undefined) newItem.isHazard = template.isHazard;
    if (template.layer !== undefined) newItem.layer = template.layer;
    if (template.name) newItem.name = template.name;
    if (template.greeting) newItem.greeting = template.greeting;
    if (template.ampY) newItem.ampY = template.ampY;
    if (template.speed) newItem.speed = template.speed;
    if (template.throwCooldown) newItem.throwCooldown = template.throwCooldown;

    const cat = template.category || 'scenery';
    if (!this.levelData[cat]) {
      this.levelData[cat] = [];
    }

    this.levelData[cat].push(newItem);
    this.selectedItem = newItem;
    this.selectedCategory = cat;

    audio.playClick();
    this.showToast(`Размещено: ${template.name}`);
    this.updatePropertiesPanel();
  }

  duplicateSelectedItem() {
    if (!this.selectedItem || !this.selectedCategory) return;
    const clone = JSON.parse(JSON.stringify(this.selectedItem));
    clone.x += 40;
    clone.y += 20;
    if (clone.cupX !== undefined) {
      clone.cupX = clone.x;
      clone.cupY = clone.y - 5;
    }

    this.levelData[this.selectedCategory].push(clone);
    this.selectedItem = clone;
    audio.playClick();
    this.showToast('Объект продублирован');
    this.updatePropertiesPanel();
  }

  deleteSelectedItem() {
    if (!this.selectedItem || !this.selectedCategory) return;
    const list = this.levelData[this.selectedCategory];
    const idx = list.indexOf(this.selectedItem);
    if (idx !== -1) {
      list.splice(idx, 1);
      audio.playClick();
      this.showToast('Объект удален');
      this.selectedItem = null;
      this.selectedCategory = null;
      this.updatePropertiesPanel();
    }
  }

  setSelectMode() {
    this.currentTool = 'select';
    this.placingAsset = null;

    // Снимаем выделение карточек палитры
    const cards = document.querySelectorAll('.palette-card');
    cards.forEach(c => c.classList.remove('selected'));

    // Активируем кнопку 'Выбор' в верхнем тулбаре
    const toolBtn = document.getElementById('ed-tool-select');
    if (toolBtn) toolBtn.classList.add('active');

    // Активируем кнопку 'Выбор' в палитре
    const palSelectBtn = document.getElementById('ed-pal-tool-select');
    if (palSelectBtn) palSelectBtn.classList.add('active');

    // Скрываем индикатор размещения в хедере
    const ind = document.getElementById('ed-placement-indicator');
    if (ind) ind.classList.add('hidden');

    this.showToast('Режим: Выбор и перемещение объектов');
  }

  setPlaceMode(asset) {
    this.currentTool = 'place';
    this.placingAsset = asset;
    this.selectedItem = null;
    this.updatePropertiesPanel();

    // Снимаем активный статус с кнопок выбора
    const toolBtn = document.getElementById('ed-tool-select');
    if (toolBtn) toolBtn.classList.remove('active');

    const palSelectBtn = document.getElementById('ed-pal-tool-select');
    if (palSelectBtn) palSelectBtn.classList.remove('active');

    // Показываем индикатор размещения в хедере
    const ind = document.getElementById('ed-placement-indicator');
    const indName = document.getElementById('ed-placement-item-name');
    if (ind && indName) {
      indName.textContent = asset.name;
      ind.classList.remove('hidden');
    }

    this.showToast(`Размещение: ${asset.name} (клик по карте; ВЫБОР / Esc для отмены)`);
  }

  cancelPlacing() {
    this.setSelectMode();
  }

  /* ==========================================================================
     Сохранение и Экспорт
     ========================================================================== */
  async saveLevel() {
    audio.playClick();
    const jsonString = JSON.stringify(this.levelData, null, 2);

    // 1. Всегда сохраняем в localStorage для мгновенного доступа
    localStorage.setItem('birday_stage1_custom_level', jsonString);

    // 2. Отправляем на сервер в data/stage1_level.json
    try {
      const resp = await fetch('/api/save-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString
      });
      const res = await resp.json();
      if (res.success) {
        audio.playSuccess();
        this.showToast('Уровень сохранён в проект (data/stage1_level.json)!');
        return;
      }
    } catch (e) {
      console.warn('Сервер недоступен, уровень сохранен в localStorage');
    }

    audio.playSuccess();
    this.showToast('Уровень сохранен в браузере (localStorage)!');
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
    this.showToast('Файл stage1_level.json скачан!');
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
          if (parsed && parsed.scenery) {
            this.levelData = parsed;
            this.selectedItem = null;
            audio.playSuccess();
            this.showToast('Уровень успешно импортирован!');
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
    if (confirm('🗑️ Удалить ВСЕ объекты с карты?\n\nВсе декорации, животные, враги, кормушки и гнёзда будут удалены. Вы получите абсолютно чистый холст для создания уровня с нуля.')) {
      this.levelData.scenery = [];
      this.levelData.animals = [];
      this.levelData.enemies = [];
      this.levelData.feeders = [];
      this.levelData.nests = [];
      this.selectedItem = null;
      this.selectedCategory = null;
      this.setSelectMode();
      this.updatePropertiesPanel();
      audio.playSuccess();
      this.showToast('Карта полностью очищена! Чистый холст готов.');
    }
  }

  resetToDefault() {
    if (confirm('Сбросить уровень к стандартной раскладке? Несохраненные изменения будут потеряны.')) {
      localStorage.removeItem('birday_stage1_custom_level');
      if (this.stage1Level) {
        this.stage1Level.initWorldEntities();
        this.levelData = {
          worldWidth: this.stage1Level.worldWidth,
          worldHeight: this.stage1Level.worldHeight,
          groundY: this.stage1Level.groundY,
          startPoint: { ...(this.stage1Level.missionStartPoint || { x: 30, y: 64, name: 'Старт' }) },
          scenery: JSON.parse(JSON.stringify(this.stage1Level.scenery || [])),
          animals: JSON.parse(JSON.stringify(this.stage1Level.animals || [])),
          enemies: JSON.parse(JSON.stringify(this.stage1Level.enemies || [])),
          feeders: JSON.parse(JSON.stringify(this.stage1Level.feeders || [])),
          nests: JSON.parse(JSON.stringify(this.stage1Level.nests || []))
        };
      }
      this.selectedItem = null;
      this.setSelectMode();
      this.updatePropertiesPanel();
      audio.playSuccess();
      this.showToast('Уровень сброшен к исходному виду!');
    }
  }

  testInGame() {
    audio.playClick();
    // Применяем текущие данные в Stage1Level и запускаем игру!
    if (this.stage1Level) {
      this.stage1Level.scenery = JSON.parse(JSON.stringify(this.levelData.scenery || []));
      this.stage1Level.animals = JSON.parse(JSON.stringify(this.levelData.animals || []));
      this.stage1Level.enemies = JSON.parse(JSON.stringify(this.levelData.enemies || []));
      this.stage1Level.feeders = JSON.parse(JSON.stringify(this.levelData.feeders || []));
      this.stage1Level.nests = JSON.parse(JSON.stringify(this.levelData.nests || []));

      // Ставим птицу рядом с текущей камерой для мгновенного теста этого участка!
      if (this.stage1Level.bird) {
        this.stage1Level.bird.x = Math.max(120, this.cameraX + 240);
        this.stage1Level.bird.y = 320;
      }

      if (this.stage1Level.saveInitialEntitiesSnapshot) {
        this.stage1Level.saveInitialEntitiesSnapshot();
      }
    }

    events.emit('stage:switch_to_level1');
    this.showToast('Режим тестирования: взлетаем!');
  }

  /* ==========================================================================
     Запуск и Остановка Редактора
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
    console.log('🛠️ [Stage1Editor] Конструктор уровня 1 активен!');
  }

  stop() {
    this.isActive = false;
    this.removeEditorUI();
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
  }

  /* ==========================================================================
     HTML Интерфейс Редактора
     ========================================================================== */
  createEditorUI() {
    this.removeEditorUI();

    const root = document.createElement('div');
    root.id = 'stage1-level-editor-ui';
    root.className = 'stage1-editor-ui';

    root.innerHTML = `
      <!-- Верхний Тулбар Редактора -->
      <header class="editor-header-bar">
        <div class="editor-title-group">
          <span class="editor-badge">🛠️ КОНСТРУКТОР ЭТАПА I</span>
          <span class="editor-cam-pos" id="ed-cam-text">X: 0 / ${this.worldWidth} px</span>
        </div>

        <!-- Инструмент выбора и индикатор размещения -->
        <div class="editor-tools-group">
          <button id="ed-tool-select" class="ed-btn-tool active" title="Режим выбора и перемещения объектов (Горячая клавиша: V или Esc)">
            👆 ВЫБОР
          </button>
          <div id="ed-placement-indicator" class="ed-placement-pill hidden">
            <span class="pill-label">➕</span>
            <span id="ed-placement-item-name" class="pill-name"></span>
            <button id="ed-placement-cancel-btn" class="pill-cancel" title="Отменить размещение (Esc / ПКМ)">✕ Выбор</button>
          </div>
        </div>

        <!-- Скруббер положения камеры -->
        <div class="editor-scrubber-box">
          <span class="scrub-label">Камера:</span>
          <input type="range" id="ed-cam-scrubber" min="0" max="${this.worldWidth - this.viewWidth}" value="${this.cameraX}" step="20">
        </div>

        <div class="editor-top-actions">
          <button id="ed-btn-grid" class="ed-btn ${this.snapToGrid ? 'active' : ''}" title="Привязка к сетке 20px">
            🧲 Сетка
          </button>
          <button id="ed-btn-clear" class="ed-btn ed-btn-danger" title="Удалить ВСЕ объекты с карты (чистый холст для создания с нуля)">
            🗑️ Очистить всё
          </button>
          <button id="ed-btn-save" class="ed-btn ed-btn-green" title="Сохранить в проект и браузер">
            💾 СОХРАНИТЬ
          </button>
          <button id="ed-btn-download" class="ed-btn" title="Скачать stage1_level.json">
            📥 JSON
          </button>
          <button id="ed-btn-import" class="ed-btn" title="Импорт stage1_level.json">
            📤 Импорт
          </button>
          <button id="ed-btn-reset" class="ed-btn ed-btn-warning" title="Сбросить к исходному уровню по умолчанию">
            🔄 Стандарт
          </button>
          <button id="ed-btn-play" class="ed-btn ed-btn-primary" title="Протестировать в игре">
            ▶️ ИГРАТЬ
          </button>
          <button id="ed-btn-exit" class="ed-btn" title="Выйти в меню">
            🏠 Меню
          </button>
        </div>
      </header>

      <!-- Боковая плавающая панель свойств выбранного объекта -->
      <aside id="editor-props-panel" class="editor-props-panel hidden">
        <div class="props-header">
          <span class="props-title" id="prop-obj-name">Объект</span>
          <button id="prop-btn-close" class="props-close">✕</button>
        </div>
        <div class="props-body">
          <div class="props-row">
            <label>Название / Метка:</label>
            <input type="text" id="prop-in-name" placeholder="Название объекта">
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
            <input type="range" id="prop-slide-radius" min="15" max="180" step="2" value="46">
          </div>
          <div class="props-row" id="prop-row-scale">
            <label>Масштаб: <span id="prop-val-scale">0.5</span></label>
            <input type="range" id="prop-slide-scale" min="0.15" max="2.0" step="0.02" value="0.5">
          </div>
          <div class="props-row" id="prop-row-opacity">
            <label>Непрозрачность: <span id="prop-val-opacity">100%</span></label>
            <input type="range" id="prop-slide-opacity" min="0.05" max="1.0" step="0.05" value="1.0">
          </div>
          <div class="props-row" id="prop-row-layer">
            <label>Слой отрисовки:</label>
            <select id="prop-select-layer">
              <option value="3">Слой 3 (Игровой мир)</option>
              <option value="4">Слой 4 (Передний план)</option>
            </select>
          </div>
          <div class="props-actions">
            <button id="prop-btn-dup" class="props-action-btn" title="Дублировать">📋 Копия</button>
            <button id="prop-btn-del" class="props-action-btn btn-danger" title="Удалить">🗑️ Удалить</button>
          </div>
        </div>
      </aside>

      <!-- Нижняя Палитра Ассетов с вкладками -->
      <footer class="editor-palette-drawer">
        <div class="palette-tabs-row">
          <button class="pal-tab pal-tab-select ${this.currentTool === 'select' ? 'active' : ''}" id="ed-pal-tool-select" title="Инструмент: Выбор и перемещение объектов (V / Esc)">
            👆 ВЫБОР
          </button>
          <div class="pal-tab-divider"></div>
          <button class="pal-tab active" data-tab="zones">🎯 Зоны (Интерактив)</button>
          <button class="pal-tab" data-tab="all">Все (146)</button>
          <button class="pal-tab" data-tab="feeders">🏡 Кормушки</button>
          <button class="pal-tab" data-tab="nests">🪺 Гнёзда</button>
          <button class="pal-tab" data-tab="trees">🌲 Деревья</button>
          <button class="pal-tab" data-tab="trunks">🪵 Стволы</button>
          <button class="pal-tab" data-tab="stumps">🍄 Пни</button>
          <button class="pal-tab" data-tab="branches">🌿 Ветки</button>
          <button class="pal-tab" data-tab="vines">🍃 Лианы</button>
          <button class="pal-tab" data-tab="stones">🪨 Камни</button>
          <button class="pal-tab" data-tab="brush">🌾 Кусты/Листья</button>
          <button class="pal-tab" data-tab="animals">🦔 Животные</button>
          <button class="pal-tab" data-tab="enemies">🐝 Враги</button>
          <button class="pal-tab" data-tab="items">✨ Предметы</button>
        </div>

        <div class="palette-items-scroller" id="palette-items-list">
          <!-- Карточки ассетов генерируются динамически -->
        </div>
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
    // Инструменты выбора
    const toolSelect = root.querySelector('#ed-tool-select');
    if (toolSelect) {
      toolSelect.addEventListener('click', () => this.setSelectMode());
    }

    const palToolSelect = root.querySelector('#ed-pal-tool-select');
    if (palToolSelect) {
      palToolSelect.addEventListener('click', () => this.setSelectMode());
    }

    const cancelPlacementBtn = root.querySelector('#ed-placement-cancel-btn');
    if (cancelPlacementBtn) {
      cancelPlacementBtn.addEventListener('click', () => this.setSelectMode());
    }

    // Вкладки категорий палитры
    const tabs = root.querySelectorAll('.pal-tab[data-tab]');
    tabs.forEach(t => {
      t.addEventListener('click', () => {
        tabs.forEach(o => o.classList.remove('active'));
        t.classList.add('active');
        const tabKey = t.getAttribute('data-tab');
        this.renderPaletteItems(tabKey);
      });
    });

    // Скруббер камеры
    const scrubber = root.querySelector('#ed-cam-scrubber');
    scrubber.addEventListener('input', (e) => {
      this.cameraX = parseInt(e.target.value, 10);
      const text = root.querySelector('#ed-cam-text');
      if (text) text.textContent = `X: ${this.cameraX} / ${this.worldWidth} px`;
    });

    // Кнопка сетки
    const btnGrid = root.querySelector('#ed-btn-grid');
    btnGrid.addEventListener('click', () => {
      this.snapToGrid = !this.snapToGrid;
      btnGrid.classList.toggle('active', this.snapToGrid);
      this.showToast(this.snapToGrid ? 'Привязка к сетке 20px ВКЛ' : 'Свободное перемещение');
    });

    // Действия хедера
    root.querySelector('#ed-btn-clear').addEventListener('click', () => this.clearAllElements());
    root.querySelector('#ed-btn-save').addEventListener('click', () => this.saveLevel());
    root.querySelector('#ed-btn-download').addEventListener('click', () => this.downloadJSON());
    root.querySelector('#ed-btn-import').addEventListener('click', () => this.importJSON());
    root.querySelector('#ed-btn-reset').addEventListener('click', () => this.resetToDefault());
    root.querySelector('#ed-btn-play').addEventListener('click', () => this.testInGame());
    root.querySelector('#ed-btn-exit').addEventListener('click', () => {
      events.emit('stage:exit_to_title');
    });

    // Панель свойств
    root.querySelector('#prop-btn-close').addEventListener('click', () => {
      this.selectedItem = null;
      this.updatePropertiesPanel();
    });
    root.querySelector('#prop-btn-dup').addEventListener('click', () => this.duplicateSelectedItem());
    root.querySelector('#prop-btn-del').addEventListener('click', () => this.deleteSelectedItem());

    const inName = root.querySelector('#prop-in-name');
    if (inName) {
      inName.addEventListener('input', (e) => {
        if (this.selectedItem) {
          this.selectedItem.name = e.target.value;
          if (this.selectedItem.title !== undefined) this.selectedItem.title = e.target.value;
          const nameEl = document.getElementById('prop-obj-name');
          if (nameEl) nameEl.textContent = e.target.value || 'Объект';
        }
      });
    }

    const inX = root.querySelector('#prop-in-x');
    inX.addEventListener('input', (e) => {
      if (this.selectedItem) {
        this.selectedItem.x = parseInt(e.target.value, 10) || 0;
        if (this.selectedItem.cupX !== undefined) this.selectedItem.cupX = this.selectedItem.x;
      }
    });

    const inY = root.querySelector('#prop-in-y');
    inY.addEventListener('input', (e) => {
      if (this.selectedItem) {
        this.selectedItem.y = parseInt(e.target.value, 10) || 0;
        if (this.selectedItem.cupY !== undefined) this.selectedItem.cupY = this.selectedItem.y - 5;
      }
    });

    const slideRadius = root.querySelector('#prop-slide-radius');
    const valRadius = root.querySelector('#prop-val-radius');
    if (slideRadius) {
      slideRadius.addEventListener('input', (e) => {
        if (this.selectedItem) {
          const r = parseInt(e.target.value, 10) || 46;
          this.selectedItem.radius = r;
          if (valRadius) valRadius.textContent = `${r} px`;
        }
      });
    }

    const slideScale = root.querySelector('#prop-slide-scale');
    const valScale = root.querySelector('#prop-val-scale');
    slideScale.addEventListener('input', (e) => {
      if (this.selectedItem) {
        const sc = parseFloat(e.target.value);
        this.selectedItem.scale = sc;
        valScale.textContent = sc.toFixed(2);
      }
    });

    const slideOpacity = root.querySelector('#prop-slide-opacity');
    const valOpacity = root.querySelector('#prop-val-opacity');
    if (slideOpacity) {
      slideOpacity.addEventListener('input', (e) => {
        if (this.selectedItem) {
          const op = parseFloat(e.target.value);
          this.selectedItem.opacity = op;
          if (valOpacity) valOpacity.textContent = `${Math.round(op * 100)}%`;
        }
      });
    }

    const selLayer = root.querySelector('#prop-select-layer');
    selLayer.addEventListener('change', (e) => {
      if (this.selectedItem) {
        this.selectedItem.layer = parseInt(e.target.value, 10);
      }
    });
  }

  renderPaletteItems(tabKey) {
    const list = document.getElementById('palette-items-list');
    if (!list) return;

    list.innerHTML = '';
    const filtered = (tabKey === 'all')
      ? this.assetCatalog
      : this.assetCatalog.filter(a => a.tab === tabKey);

    filtered.forEach(asset => {
      const card = document.createElement('div');
      card.className = `palette-card ${this.placingAsset === asset ? 'selected' : ''}`;
      
      const img = this.images[asset.key || asset.emptyKey];
      const imgSrc = img ? img.src : '';

      card.innerHTML = `
        <div class="pal-thumb-box">
          <img src="${imgSrc}" alt="${asset.name}" class="pal-thumb-img" loading="lazy">
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
    if (nameEl) nameEl.textContent = this.selectedItem.name || this.selectedItem.key || 'Объект';

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
    const slideRadius = document.getElementById('prop-slide-radius');
    const valRadius = document.getElementById('prop-val-radius');

    const rowScale = document.getElementById('prop-row-scale');
    const rowOpacity = document.getElementById('prop-row-opacity');
    const rowLayer = document.getElementById('prop-row-layer');

    const isZone = (this.selectedItem.radius !== undefined) || this.selectedItem.isZoneOnly || (this.selectedCategory === 'start') || (this.selectedCategory === 'finish');

    if (this.selectedItem.radius !== undefined) {
      if (rowRadius) rowRadius.style.display = 'flex';
      if (slideRadius) slideRadius.value = this.selectedItem.radius;
      if (valRadius) valRadius.textContent = `${this.selectedItem.radius} px`;
    } else {
      if (rowRadius) rowRadius.style.display = 'none';
    }

    if (this.selectedItem.isZoneOnly || this.selectedCategory === 'start' || this.selectedCategory === 'finish') {
      if (rowScale) rowScale.style.display = 'none';
      if (rowOpacity) rowOpacity.style.display = 'none';
      if (rowLayer) rowLayer.style.display = 'none';
    } else {
      if (rowScale) rowScale.style.display = 'flex';
      if (rowOpacity) rowOpacity.style.display = 'flex';
      if (rowLayer) rowLayer.style.display = 'flex';

      const slideScale = document.getElementById('prop-slide-scale');
      const valScale = document.getElementById('prop-val-scale');
      if (slideScale) slideScale.value = this.selectedItem.scale || 0.5;
      if (valScale) valScale.textContent = (this.selectedItem.scale || 0.5).toFixed(2);

      const slideOpacity = document.getElementById('prop-slide-opacity');
      const valOpacity = document.getElementById('prop-val-opacity');
      const op = (this.selectedItem.opacity !== undefined) ? this.selectedItem.opacity : 1.0;
      if (slideOpacity) slideOpacity.value = op;
      if (valOpacity) valOpacity.textContent = `${Math.round(op * 100)}%`;

      const selLayer = document.getElementById('prop-select-layer');
      if (selLayer) selLayer.value = this.selectedItem.layer || 3;
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
    }, 2000);
  }

  /* ==========================================================================
     Рендеринг Редактора (Canvas)
     ========================================================================== */
  update(dt) {
    // В редакторе анимации опциональны
  }

  render(alpha) {
    if (!this.ctx || !this.isActive) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

    // 1. Параллакс фоны (включая Forest.png)
    if (this.stage1Level) {
      this.stage1Level.cameraX = this.cameraX;
      this.stage1Level.renderParallaxBackground(ctx);
    }

    ctx.save();
    ctx.translate(-Math.round(this.cameraX), 0);

    // 2. Декорации слоя 3
    this.renderCategoryItems(ctx, 'scenery', 3);

    // 3. Гнёзда (интерактивные зоны и спрайты)
    this.renderCategoryItems(ctx, 'nests');

    // 4. Кормушки (интерактивные зоны и спрайты)
    this.renderCategoryItems(ctx, 'feeders');

    // 5. Точка старта и зона финиша
    this.renderStartAndFinish(ctx);

    // 6. Животные
    this.renderCategoryItems(ctx, 'animals');

    // 7. Враги
    this.renderCategoryItems(ctx, 'enemies');

    // 8. Земля (если нет Forest.png)
    if (this.stage1Level) {
      this.stage1Level.renderGround(ctx);
    }

    // 9. Декорации переднего плана слоя 4
    this.renderCategoryItems(ctx, 'scenery', 4);

    // 10. Подсветка наведения и рамка выделения
    this.renderSelectionOutlines(ctx);

    ctx.restore();

    // 11. Призрак размещаемого объекта под курсором
    if (this.placingAsset) {
      this.renderPlacementGhost(ctx);
    }

    // 12. Сетка, если активна
    if (this.snapToGrid) {
      this.renderGrid(ctx);
    }
  }

  renderCategoryItems(ctx, cat, targetLayer = null) {
    const list = this.levelData[cat] || [];
    list.forEach(item => {
      if (targetLayer !== null && item.layer !== targetLayer) return;

      if (item.x < this.cameraX - 250 || item.x > this.cameraX + this.viewWidth + 250) return;

      // Отрисовка интерактивной зоны гнезда
      if (cat === 'nests') {
        const cx = item.cupX !== undefined ? item.cupX : item.x;
        const cy = item.cupY !== undefined ? item.cupY : item.y;
        const r = item.radius || 46;

        ctx.save();
        // Внешнее кольцо мишени
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Заливка зоны
        ctx.fillStyle = 'rgba(250, 204, 21, 0.12)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Центр мишени
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Иконка и подпись
        ctx.font = 'bold 11px "8bitoperator", monospace';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(`🪺 ${item.name || item.title || 'Гнездо'} (R:${r})`, cx, cy - r - 6);
        ctx.restore();

        // Если это не чисто зона, а объект со спрайтом:
        if (!item.isZoneOnly && item.key && item.key !== 'zone_nest') {
          const img = this.images[item.key || item.emptyKey];
          if (img) {
            const sc = item.scale || 0.5;
            const w = img.width * sc;
            const h = img.height * sc;
            ctx.save();
            if (item.opacity !== undefined) ctx.globalAlpha = item.opacity;
            ctx.drawImage(img, item.x - w / 2, item.y - h / 2, w, h);
            ctx.restore();
          }
        }
        return;
      }

      // Отрисовка интерактивной зоны кормушки
      if (cat === 'feeders') {
        const r = item.radius || 52;

        ctx.save();
        // Внешнее кольцо энергии
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(item.x, item.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Заливка зоны
        ctx.fillStyle = 'rgba(74, 222, 128, 0.12)';
        ctx.beginPath();
        ctx.arc(item.x, item.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Центр кормушки
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(item.x, item.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Иконка и подпись
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#4ade80';
        ctx.textAlign = 'center';
        ctx.fillText(`🏡 ${item.name || 'Кормушка'} (R:${r})`, item.x, item.y - r - 6);
        ctx.restore();

        // Если это не чисто зона, а объект со спрайтом:
        if (!item.isZoneOnly && item.key && item.key !== 'zone_feeder') {
          const img = this.images[item.key];
          if (img) {
            const sc = item.scale || 0.5;
            const w = img.width * sc;
            const h = img.height * sc;
            ctx.save();
            if (item.opacity !== undefined) ctx.globalAlpha = item.opacity;
            ctx.drawImage(img, item.x - w / 2, item.y - h / 2, w, h);
            ctx.restore();
          }
        }
        return;
      }

      // Обычные спрайтовые объекты
      const imgKey = item.key || item.emptyKey;
      const img = this.images[imgKey];
      if (!img) return;

      const sc = item.scale || 0.5;
      const w = img.width * sc;
      const h = img.height * sc;

      ctx.save();
      if (item.opacity !== undefined) {
        ctx.globalAlpha = item.opacity;
      }
      ctx.drawImage(img, item.x - w / 2, item.y - h / 2, w, h);

      // Имя объекта мелким шрифтом
      if (cat === 'animals' || cat === 'enemies') {
        ctx.font = '10px "8bitoperator", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(item.name || cat, item.x, item.y - h / 2 - 6);
      }

      ctx.restore();
    });
  }

  renderStartAndFinish(ctx) {
    // 1. Точка старта птицы
    const cp = this.levelData.startPoint || this.levelData.checkpoint;
    if (cp) {
      if (cp.x >= this.cameraX - 100 && cp.x <= this.cameraX + this.viewWidth + 100) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 30, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 11px "8bitoperator", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText(`🚩 СТАРТ (${cp.x}, ${cp.y})`, cp.x, cp.y - 36);
        ctx.restore();
      }
    }

    // 2. Зона финиша (Великое Гнездо)
    if (this.levelData.finishZone) {
      const fz = this.levelData.finishZone;
      const r = fz.radius || 110;
      if (fz.x >= this.cameraX - 250 && fz.x <= this.cameraX + this.viewWidth + 250) {
        ctx.save();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(fz.x, fz.y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
        ctx.beginPath();
        ctx.arc(fz.x, fz.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 12px "8bitoperator", sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(`🏁 ${fz.name || 'Великое Гнездо (ФИНИШ)'} (R:${r})`, fz.x, fz.y - r - 10);
        ctx.restore();
      }
    }
  }

  renderSelectionOutlines(ctx) {
    // Подсветка объекта под курсором (Hover)
    if (this.hoveredItem && this.hoveredItem !== this.selectedItem) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      if (this.hoveredItem.radius !== undefined) {
        const cx = this.hoveredItem.cupX !== undefined ? this.hoveredItem.cupX : this.hoveredItem.x;
        const cy = this.hoveredItem.cupY !== undefined ? this.hoveredItem.cupY : this.hoveredItem.y;
        const r = this.hoveredItem.radius || 46;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const img = this.images[this.hoveredItem.key || this.hoveredItem.emptyKey];
        if (img) {
          const sc = this.hoveredItem.scale || 0.5;
          const w = img.width * sc;
          const h = img.height * sc;
          ctx.strokeRect(this.hoveredItem.x - w / 2 - 4, this.hoveredItem.y - h / 2 - 4, w + 8, h + 8);
        }
      }
      ctx.restore();
    }

    // Золотая рамка и маркеры выделенного объекта (Selection)
    if (this.selectedItem) {
      ctx.save();

      // Если выделена интерактивная зона с радиусом (или старт)
      if (this.selectedItem.radius !== undefined || this.selectedCategory === 'start') {
        const cx = this.selectedItem.cupX !== undefined ? this.selectedItem.cupX : this.selectedItem.x;
        const cy = this.selectedItem.cupY !== undefined ? this.selectedItem.cupY : this.selectedItem.y;
        const r = this.selectedItem.radius || (this.selectedCategory === 'start' ? 30 : 46);

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        ctx.stroke();

        // 4 ручки изменения радиуса (север, юг, восток, запад)
        ctx.fillStyle = '#facc15';
        const handles = [
          [cx - r - 4, cy],
          [cx + r + 4, cy],
          [cx, cy - r - 4],
          [cx, cy + r + 4]
        ];
        handles.forEach(([hx, hy]) => {
          ctx.fillRect(hx - 4, hy - 4, 8, 8);
        });

        // Бейдж координат и радиуса
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(cx - 60, cy - r - 28, 120, 18);
        ctx.font = 'bold 10px "8bitoperator", monospace';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(`X:${cx} Y:${cy} R:${r}px`, cx, cy - r - 15);
      } else {
        // Обычный спрайтовый объект
        const img = this.images[this.selectedItem.key || this.selectedItem.emptyKey];
        if (img) {
          const sc = this.selectedItem.scale || 0.5;
          const w = img.width * sc;
          const h = img.height * sc;
          const rx = this.selectedItem.x - w / 2 - 5;
          const ry = this.selectedItem.y - h / 2 - 5;
          const rw = w + 10;
          const rh = h + 10;

          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
          ctx.strokeRect(rx, ry, rw, rh);

          // Угловые ручки
          ctx.fillStyle = '#facc15';
          ctx.fillRect(rx - 3, ry - 3, 6, 6);
          ctx.fillRect(rx + rw - 3, ry - 3, 6, 6);
          ctx.fillRect(rx - 3, ry + rh - 3, 6, 6);
          ctx.fillRect(rx + rw - 3, ry + rh - 3, 6, 6);

          // Информационный бейдж координат
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(this.selectedItem.x - 45, ry - 22, 90, 16);
          ctx.font = 'bold 10px "8bitoperator", monospace';
          ctx.fillStyle = '#facc15';
          ctx.textAlign = 'center';
          ctx.fillText(`X:${this.selectedItem.x} Y:${this.selectedItem.y}`, this.selectedItem.x, ry - 10);
        }
      }
      ctx.restore();
    }
  }

  renderPlacementGhost(ctx) {
    let posX = this.mouseX;
    let posY = this.mouseY;

    if (this.snapToGrid) {
      const worldX = posX + this.cameraX;
      posX = (Math.round(worldX / this.gridStep) * this.gridStep) - this.cameraX;
      posY = Math.round(posY / this.gridStep) * this.gridStep;
    }

    ctx.save();

    // 1. Призрак зоны гнезда
    if (this.placingAsset.type === 'zone_nest') {
      const r = this.placingAsset.radius || 46;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(posX, posY, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
      ctx.beginPath();
      ctx.arc(posX, posY, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 12px "8bitoperator", monospace';
      ctx.fillStyle = '#facc15';
      ctx.textAlign = 'center';
      ctx.fillText(`🪺 [ЛКМ: Отметить зону гнезда R:${r}px | Esc: Отмена]`, posX, posY - r - 10);
      ctx.restore();
      return;
    }

    // 2. Призрак зоны кормушки
    if (this.placingAsset.type === 'zone_feeder') {
      const r = this.placingAsset.radius || 52;
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(posX, posY, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
      ctx.beginPath();
      ctx.arc(posX, posY, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 12px "8bitoperator", monospace';
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'center';
      ctx.fillText(`🏡 [ЛКМ: Отметить зону кормушки R:${r}px | Esc: Отмена]`, posX, posY - r - 10);
      ctx.restore();
      return;
    }

    // 3. Призрак точки старта
    if (this.placingAsset.type === 'zone_start') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(posX, posY, 30, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = 'bold 12px "8bitoperator", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('🚩 [ЛКМ: Установить старт птицы | Esc: Отмена]', posX, posY - 40);
      ctx.restore();
      return;
    }

    // 4. Призрак зоны финиша
    if (this.placingAsset.type === 'zone_finish') {
      const r = this.placingAsset.radius || 110;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(posX, posY, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = 'bold 12px "8bitoperator", monospace';
      ctx.fillStyle = '#facc15';
      ctx.textAlign = 'center';
      ctx.fillText(`🏁 [ЛКМ: Установить зону финиша R:${r}px | Esc: Отмена]`, posX, posY - r - 10);
      ctx.restore();
      return;
    }

    // 5. Обычный спрайтовый объект
    const img = this.images[this.placingAsset.key || this.placingAsset.emptyKey];
    if (img) {
      const sc = this.placingAsset.defaultScale || 0.5;
      const w = img.width * sc;
      const h = img.height * sc;

      ctx.globalAlpha = 0.65;
      ctx.drawImage(img, posX - w / 2, posY - h / 2, w, h);

      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(posX - w / 2 - 2, posY - h / 2 - 2, w + 4, h + 4);

      ctx.font = 'bold 11px "8bitoperator", monospace';
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'center';
      ctx.fillText(`[ЛКМ: ${this.placingAsset.name} | ПКМ / 👆 ВЫБОР: выход]`, posX, posY - h / 2 - 8);
    }

    ctx.restore();
  }

  renderGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
