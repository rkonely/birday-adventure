import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';

/**
 * Stage1Editor — Интерактивный визуальный Конструктор / Редактор уровней Этапа 1.
 * 
 * Возможности:
 * - Свободное перемещение по миру (0 - 7600px) с помощью мыши, миникарты и клавиш A/D
 * - Каталог всех ассетов: Деревья, Пни, Камни, Лианы, Животные, Враги, Кормушки, Гнёзда
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
    this.worldWidth = 7600;
    this.worldHeight = 720;
    this.groundY = 595;

    this.cameraX = 0;
    this.isActive = false;

    // Ссылки на загруженные изображения из Stage1Level
    this.images = stage1Level ? stage1Level.images : {};

    // Данные уровня для редактирования
    this.levelData = {
      worldWidth: 7600,
      worldHeight: 720,
      groundY: 595,
      checkpoint: { x: 260, y: 320, name: 'Старт' },
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
    this.activeTab = 'all';

    this.initAssetCatalog();
    this.bindEditorEvents();
  }

  /* ==========================================================================
     Каталог доступных ассетов для палитры редактора
     ========================================================================== */
  initAssetCatalog() {
    this.assetCatalog = [
      // Деревья
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_oak', name: 'Дуб великан', defaultScale: 0.75, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_oak_2', name: 'Дуб ветвистый', defaultScale: 0.70, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_oak_dark', name: 'Темный дуб', defaultScale: 0.72, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_birch', name: 'Берёзка', defaultScale: 0.65, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_birch_2', name: 'Берёза белая', defaultScale: 0.68, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_fir', name: 'Лесная сосна', defaultScale: 0.80, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_fir_2', name: 'Хвойное дерево', defaultScale: 0.80, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_apple', name: 'Яблоня', defaultScale: 0.55, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_rowan', name: 'Рябина', defaultScale: 0.65, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_chestnut', name: 'Каштан', defaultScale: 0.60, layer: 3 },
      { tab: 'trees', category: 'scenery', type: 'tree', key: 'tree_dead', name: 'Сухостой', defaultScale: 0.60, layer: 3 },

      // Стволы и Пни
      { tab: 'stumps', category: 'scenery', type: 'prop', key: 'trunk_mushroom', name: 'Ствол с грибами', defaultScale: 0.50, layer: 3 },
      { tab: 'stumps', category: 'scenery', type: 'prop', key: 'trunk_hollow', name: 'Полое дупло', defaultScale: 0.45, layer: 3 },
      { tab: 'stumps', category: 'scenery', type: 'prop', key: 'stump_mushroom', name: 'Пень с опятами', defaultScale: 0.42, layer: 3 },
      { tab: 'stumps', category: 'scenery', type: 'prop', key: 'stump_white', name: 'Берёзовый пень', defaultScale: 0.42, layer: 3 },
      { tab: 'stumps', category: 'scenery', type: 'prop', key: 'stump_wood', name: 'Бревно лежачее', defaultScale: 0.45, layer: 3 },
      { tab: 'stumps', category: 'scenery', type: 'prop', key: 'stump_wood_2', name: 'Полено мшистое', defaultScale: 0.45, layer: 3 },

      // Лианы и Ветки
      { tab: 'vines', category: 'scenery', type: 'vine', key: 'vines_upper_1', name: 'Верхняя лиана', defaultScale: 0.50, layer: 4 },
      { tab: 'vines', category: 'scenery', type: 'vine', key: 'vines_upper_2', name: 'Лиана густая', defaultScale: 0.55, layer: 4 },
      { tab: 'vines', category: 'scenery', type: 'vine', key: 'vines_rope', name: 'Канат лесной', defaultScale: 0.45, layer: 4 },
      { tab: 'vines', category: 'scenery', type: 'prop', key: 'branch_cones', name: 'Ветка с шишками', defaultScale: 0.50, layer: 3 },
      { tab: 'vines', category: 'scenery', type: 'prop', key: 'branch_white', name: 'Ветка белая', defaultScale: 0.50, layer: 3 },
      { tab: 'vines', category: 'scenery', type: 'prop', key: 'branch_wood', name: 'Сук дубовый', defaultScale: 0.50, layer: 3 },

      // Камни, Кусты и Опасности
      { tab: 'props', category: 'scenery', type: 'prop', key: 'stone_1', name: 'Валун серый', defaultScale: 0.35, isHazard: false, layer: 3 },
      { tab: 'props', category: 'scenery', type: 'prop', key: 'stone_7', name: 'Камень мшистый', defaultScale: 0.40, isHazard: false, layer: 3 },
      { tab: 'props', category: 'scenery', type: 'prop', key: 'stone_10', name: 'Скала низкая', defaultScale: 0.40, isHazard: false, layer: 3 },
      { tab: 'props', category: 'scenery', type: 'prop', key: 'bush_1', name: 'Куст зелёный', defaultScale: 0.45, isHazard: false, layer: 3 },
      { tab: 'props', category: 'scenery', type: 'prop', key: 'bush_yellow', name: 'Куст золотой', defaultScale: 0.40, isHazard: false, layer: 3 },
      { tab: 'props', category: 'scenery', type: 'prop', key: 'leaves_pile', name: 'Груда листьев', defaultScale: 0.50, isHazard: false, layer: 3 },
      { tab: 'props', category: 'scenery', type: 'hazard', key: 'thorns_1', name: '⚠️ Колючки шипы 1', defaultScale: 0.48, isHazard: true, layer: 3 },
      { tab: 'props', category: 'scenery', type: 'hazard', key: 'thorns_2', name: '⚠️ Колючки шипы 2', defaultScale: 0.50, isHazard: true, layer: 3 },
      { tab: 'props', category: 'scenery', type: 'prop', key: 'water_lilly', name: 'Кувшинка в воде', defaultScale: 0.45, isHazard: false, layer: 3 },

      // Животные
      { tab: 'animals', category: 'animals', key: 'animal_deer_eat', name: 'Оленёнок', defaultScale: 0.38, greeting: '🦌 *хрумкает клевер*' },
      { tab: 'animals', category: 'animals', key: 'animal_deer_stand', name: 'Благородный Олень', defaultScale: 0.42, greeting: '🦌 *смотрит ввысь*' },
      { tab: 'animals', category: 'animals', key: 'animal_eagle', name: 'Гордый Орёл', defaultScale: 0.40, greeting: '🦅 *кивает кукушке*' },
      { tab: 'animals', category: 'animals', key: 'animal_fox', name: 'Лисица', defaultScale: 0.36, greeting: '🦊 *любопытно щурится*' },
      { tab: 'animals', category: 'animals', key: 'animal_woodpecker', name: 'Дятел', defaultScale: 0.32, greeting: '🪵 *тук-тук-тук!*' },
      { tab: 'animals', category: 'animals', key: 'animal_hedgehog', name: 'Ёжик', defaultScale: 0.28, greeting: '🦔 *фыр-фыр*' },
      { tab: 'animals', category: 'animals', key: 'animal_hedgehog_2', name: 'Ежиха', defaultScale: 0.28, greeting: '🦔 *собирает листики*' },
      { tab: 'animals', category: 'animals', key: 'animal_raccoon', name: 'Енот-полоскун', defaultScale: 0.32, greeting: '🦝 *моет лапки*' },
      { tab: 'animals', category: 'animals', key: 'animal_skunk', name: 'Скунс', defaultScale: 0.30, greeting: '🐾 *машет хвостиком*' },
      { tab: 'animals', category: 'animals', key: 'animal_squirrel', name: 'Белка', defaultScale: 0.32, greeting: '🐿️ *грызёт семечко*' },
      { tab: 'animals', category: 'animals', key: 'animal_bat', name: 'Летучая Мышь', defaultScale: 0.30, greeting: '🦇 *спит вниз головой*' },

      // Враги
      { tab: 'enemies', category: 'enemies', type: 'bee', key: 'enemy_bee', name: 'Злая Пчела', defaultScale: 0.34, ampY: 50, speed: 2.5 },
      { tab: 'enemies', category: 'enemies', type: 'beehive', key: 'enemy_beehive', name: 'Пчелиный Улей', defaultScale: 0.38 },
      { tab: 'enemies', category: 'enemies', type: 'crow', key: 'enemy_crow', name: 'Ворона хищник', defaultScale: 0.36 },
      { tab: 'enemies', category: 'enemies', type: 'trap_squirrel', key: 'enemy_squirrel_1', name: 'Белка-разбойник 1', defaultScale: 0.38, throwCooldown: 2.5 },
      { tab: 'enemies', category: 'enemies', type: 'trap_squirrel', key: 'enemy_squirrel_2', name: 'Белка-разбойник 2', defaultScale: 0.38, throwCooldown: 2.5 },

      // Кормушки
      { tab: 'feeders', category: 'feeders', key: 'feeder_1', name: 'Кормушка скворечник', defaultScale: 0.42 },
      { tab: 'feeders', category: 'feeders', key: 'feeder_2', name: 'Кормушка лесной дом', defaultScale: 0.44 },
      { tab: 'feeders', category: 'feeders', key: 'feeder_3', name: 'Кормушка на ветке', defaultScale: 0.45 },
      { tab: 'feeders', category: 'feeders', key: 'feeder_4', name: 'Кормушка на канате', defaultScale: 0.43 },
      { tab: 'feeders', category: 'feeders', key: 'feeder_5', name: 'Кормушка классик', defaultScale: 0.44 },

      // Гнёзда
      { tab: 'nests', category: 'nests', key: 'nest_hollow', name: 'Гнездо в дупле', emptyKey: 'nest_hollow', filledKey: 'nest_egg_1', defaultScale: 0.45, radius: 46 },
      { tab: 'nests', category: 'nests', key: 'nest_stone', name: 'Мшистое гнездо', emptyKey: 'nest_stone', filledKey: 'nest_egg_2', defaultScale: 0.45, radius: 48 },
      { tab: 'nests', category: 'nests', key: 'nest_empty_1', name: 'Гнездо на ветке', emptyKey: 'nest_empty_1', filledKey: 'nest_egg_1', defaultScale: 0.46, radius: 46 },
      { tab: 'nests', category: 'nests', key: 'nest_up', name: 'Высокое гнездо', emptyKey: 'nest_up', filledKey: 'nest_egg_2', defaultScale: 0.45, radius: 48 },
      { tab: 'nests', category: 'nests', key: 'nest_empty_2', name: 'Уютное гнездо', emptyKey: 'nest_empty_2', filledKey: 'nest_egg_1', defaultScale: 0.46, radius: 48 }
    ];
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
        if (data && data.scenery) {
          this.levelData = data;
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
        this.levelData = JSON.parse(saved);
        console.log('✅ [Stage1Editor] Уровень загружен из localStorage');
        return;
      } catch (e) {}
    }

    // 3. Если ничего нет — берем дефолтные массивы из stage1Level
    if (this.stage1Level) {
      this.levelData = {
        worldWidth: this.stage1Level.worldWidth,
        worldHeight: this.stage1Level.worldHeight,
        groundY: this.stage1Level.groundY,
        checkpoint: { ...this.stage1Level.checkpoint },
        scenery: JSON.parse(JSON.stringify(this.stage1Level.scenery || [])),
        animals: JSON.parse(JSON.stringify(this.stage1Level.animals || [])),
        enemies: JSON.parse(JSON.stringify(this.stage1Level.enemies || [])),
        feeders: JSON.parse(JSON.stringify(this.stage1Level.feeders || [])),
        nests: JSON.parse(JSON.stringify(this.stage1Level.nests || []))
      };
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

      // Отмена выбора / режима размещения (Esc)
      if (e.code === 'Escape') {
        if (this.placingAsset) {
          this.cancelPlacing();
        } else if (this.selectedItem) {
          this.selectedItem = null;
          this.updatePropertiesPanel();
        }
      }
    });

    // Обработка клика и перетаскивания на Canvas
    if (this.canvas) {
      this.canvas.addEventListener('pointerdown', (e) => {
        if (!this.isActive) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.viewWidth / rect.width;
        const scaleY = this.viewHeight / rect.height;
        const localX = (e.clientX - rect.left) * scaleX;
        const localY = (e.clientY - rect.top) * scaleY;
        const worldX = localX + this.cameraX;

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
    const categories = ['nests', 'feeders', 'enemies', 'animals', 'scenery'];

    for (const cat of categories) {
      const list = this.levelData[cat] || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];
        const img = this.images[item.key || item.emptyKey];
        if (!img) continue;

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
    return null;
  }

  /* ==========================================================================
     Размещение нового объекта
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
    const newItem = {
      key: template.key,
      x: Math.round(posX),
      y: Math.round(posY),
      scale: template.defaultScale || 0.5
    };

    if (template.type) newItem.type = template.type;
    if (template.isHazard !== undefined) newItem.isHazard = template.isHazard;
    if (template.layer !== undefined) newItem.layer = template.layer;
    if (template.name) newItem.name = template.name;
    if (template.greeting) newItem.greeting = template.greeting;
    if (template.ampY) newItem.ampY = template.ampY;
    if (template.speed) newItem.speed = template.speed;
    if (template.throwCooldown) newItem.throwCooldown = template.throwCooldown;

    if (template.category === 'nests') {
      newItem.emptyKey = template.emptyKey;
      newItem.filledKey = template.filledKey;
      newItem.cupX = newItem.x;
      newItem.cupY = newItem.y - 5;
      newItem.radius = template.radius || 46;
      newItem.title = template.name;
    }

    if (!this.levelData[template.category]) {
      this.levelData[template.category] = [];
    }

    this.levelData[template.category].push(newItem);
    this.selectedItem = newItem;
    this.selectedCategory = template.category;

    audio.playClick();
    this.showToast(`✨ Размещено: ${template.name}`);
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
    this.showToast('📋 Объект продублирован');
    this.updatePropertiesPanel();
  }

  deleteSelectedItem() {
    if (!this.selectedItem || !this.selectedCategory) return;
    const list = this.levelData[this.selectedCategory];
    const idx = list.indexOf(this.selectedItem);
    if (idx !== -1) {
      list.splice(idx, 1);
      audio.playClick();
      this.showToast('🗑️ Объект удален');
      this.selectedItem = null;
      this.selectedCategory = null;
      this.updatePropertiesPanel();
    }
  }

  cancelPlacing() {
    this.placingAsset = null;
    const ghost = document.getElementById('editor-placement-ghost');
    if (ghost) ghost.classList.add('hidden');
    this.showToast('Режим размещения отменен');
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
        this.showToast('💾 Уровень сохранён в проект (data/stage1_level.json)!');
        return;
      }
    } catch (e) {
      console.warn('Сервер недоступен, уровень сохранен в localStorage');
    }

    audio.playSuccess();
    this.showToast('💾 Уровень сохранен в браузере (localStorage)!');
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
          if (parsed && parsed.scenery) {
            this.levelData = parsed;
            this.selectedItem = null;
            audio.playSuccess();
            this.showToast('📤 Уровень успешно импортирован!');
          }
        } catch (err) {
          this.showToast('❌ Ошибка: неверный формат JSON');
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
          checkpoint: { ...this.stage1Level.checkpoint },
          scenery: JSON.parse(JSON.stringify(this.stage1Level.scenery || [])),
          animals: JSON.parse(JSON.stringify(this.stage1Level.animals || [])),
          enemies: JSON.parse(JSON.stringify(this.stage1Level.enemies || [])),
          feeders: JSON.parse(JSON.stringify(this.stage1Level.feeders || [])),
          nests: JSON.parse(JSON.stringify(this.stage1Level.nests || []))
        };
      }
      this.selectedItem = null;
      audio.playSuccess();
      this.showToast('🔄 Уровень сброшен к исходному виду!');
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
    }

    events.emit('stage:switch_to_level1');
    this.showToast('🎮 Режим тестирования: взлетаем!');
  }

  /* ==========================================================================
     Запуск и Остановка Редактора
     ========================================================================== */
  async start() {
    this.isActive = true;
    this.selectedItem = null;
    this.placingAsset = null;

    if (this.canvas) {
      this.canvas.style.display = 'block';
    }

    await this.loadLevelData();
    this.createEditorUI();
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
          <span class="editor-cam-pos" id="ed-cam-text">X: 0 / 7600 px</span>
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
          <button id="ed-btn-save" class="ed-btn ed-btn-green" title="Сохранить в проект и браузер">
            💾 СОХРАНИТЬ
          </button>
          <button id="ed-btn-download" class="ed-btn" title="Скачать stage1_level.json">
            📥 JSON
          </button>
          <button id="ed-btn-import" class="ed-btn" title="Импорт stage1_level.json">
            📤 Импорт
          </button>
          <button id="ed-btn-reset" class="ed-btn ed-btn-warning" title="Сбросить к стандарту">
            🔄 Сброс
          </button>
          <button id="ed-btn-play" class="ed-btn ed-btn-primary" title="Протестировать в игре">
            ▶️ ИГРАТЬ
          </button>
          <button id="ed-btn-exit" class="ed-btn ed-btn-danger" title="Выйти в меню">
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
            <label>Позиция X:</label>
            <input type="number" id="prop-in-x" step="5">
          </div>
          <div class="props-row">
            <label>Позиция Y:</label>
            <input type="number" id="prop-in-y" step="5">
          </div>
          <div class="props-row">
            <label>Масштаб: <span id="prop-val-scale">0.5</span></label>
            <input type="range" id="prop-slide-scale" min="0.15" max="2.0" step="0.02" value="0.5">
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
          <button class="pal-tab active" data-tab="all">Все</button>
          <button class="pal-tab" data-tab="trees">🌲 Деревья</button>
          <button class="pal-tab" data-tab="stumps">🪵 Пни/Стволы</button>
          <button class="pal-tab" data-tab="vines">🌿 Лианы/Ветки</button>
          <button class="pal-tab" data-tab="props">🪨 Камни/Кусты</button>
          <button class="pal-tab" data-tab="animals">🦔 Животные</button>
          <button class="pal-tab" data-tab="enemies">🐝 Враги</button>
          <button class="pal-tab" data-tab="feeders">🏡 Кормушки</button>
          <button class="pal-tab" data-tab="nests">🪺 Гнёзда</button>
        </div>

        <div class="palette-items-scroller" id="palette-items-list">
          <!-- Карточки ассетов генерируются динамически -->
        </div>
      </footer>
    `;

    document.getElementById('game-container').appendChild(root);
    this.editorContainer = root;

    this.renderPaletteItems('all');
    this.bindUIButtons(root);
  }

  removeEditorUI() {
    if (this.editorContainer) {
      this.editorContainer.remove();
      this.editorContainer = null;
    }
  }

  bindUIButtons(root) {
    // Вкладки палитры
    const tabs = root.querySelectorAll('.pal-tab');
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
      this.showToast(this.snapToGrid ? '🧲 Привязка к сетке 20px ВКЛ' : 'Свободное перемещение');
    });

    // Действия хедера
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

    const slideScale = root.querySelector('#prop-slide-scale');
    const valScale = root.querySelector('#prop-val-scale');
    slideScale.addEventListener('input', (e) => {
      if (this.selectedItem) {
        const sc = parseFloat(e.target.value);
        this.selectedItem.scale = sc;
        valScale.textContent = sc.toFixed(2);
      }
    });

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
          this.placingAsset = null;
          card.classList.remove('selected');
          this.showToast('Режим размещения снят');
        } else {
          document.querySelectorAll('.palette-card').forEach(c => c.classList.remove('selected'));
          this.placingAsset = asset;
          card.classList.add('selected');
          this.selectedItem = null;
          this.updatePropertiesPanel();
          this.showToast(`➕ Кликните по карте для размещения: ${asset.name}`);
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
    const inX = document.getElementById('prop-in-x');
    if (inX) inX.value = this.selectedItem.x;

    const inY = document.getElementById('prop-in-y');
    if (inY) inY.value = this.selectedItem.y;

    const slideScale = document.getElementById('prop-slide-scale');
    const valScale = document.getElementById('prop-val-scale');
    if (slideScale) slideScale.value = this.selectedItem.scale || 0.5;
    if (valScale) valScale.textContent = (this.selectedItem.scale || 0.5).toFixed(2);

    const selLayer = document.getElementById('prop-select-layer');
    if (selLayer) selLayer.value = this.selectedItem.layer || 3;
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

    // 1. Параллакс фоны
    if (this.stage1Level) {
      this.stage1Level.cameraX = this.cameraX;
      this.stage1Level.renderParallaxBackground(ctx);
    }

    ctx.save();
    ctx.translate(-Math.round(this.cameraX), 0);

    // 2. Декорации слоя 3
    this.renderCategoryItems(ctx, 'scenery', 3);

    // 3. Гнёзда
    this.renderCategoryItems(ctx, 'nests');

    // 4. Кормушки
    this.renderCategoryItems(ctx, 'feeders');

    // 5. Животные
    this.renderCategoryItems(ctx, 'animals');

    // 6. Враги
    this.renderCategoryItems(ctx, 'enemies');

    // 7. Земля
    if (this.stage1Level) {
      this.stage1Level.renderGround(ctx);
    }

    // 8. Декорации переднего плана слоя 4
    this.renderCategoryItems(ctx, 'scenery', 4);

    // 9. Подсветка наведения и рамка выделения
    this.renderSelectionOutlines(ctx);

    ctx.restore();

    // 10. Призрак размещаемого объекта под курсором
    if (this.placingAsset) {
      this.renderPlacementGhost(ctx);
    }

    // 11. Сетка, если активна
    if (this.snapToGrid) {
      this.renderGrid(ctx);
    }
  }

  renderCategoryItems(ctx, cat, targetLayer = null) {
    const list = this.levelData[cat] || [];
    list.forEach(item => {
      if (targetLayer !== null && item.layer !== targetLayer) return;

      if (item.x < this.cameraX - 250 || item.x > this.cameraX + this.viewWidth + 250) return;

      const imgKey = item.key || item.emptyKey;
      const img = this.images[imgKey];
      if (!img) return;

      const sc = item.scale || 0.5;
      const w = img.width * sc;
      const h = img.height * sc;

      ctx.save();
      ctx.drawImage(img, item.x - w / 2, item.y - h / 2, w, h);

      // Имя объекта мелким шрифтом
      if (cat === 'animals' || cat === 'feeders' || cat === 'nests') {
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(item.name || item.title || cat, item.x, item.y - h / 2 - 6);
      }

      ctx.restore();
    });
  }

  renderSelectionOutlines(ctx) {
    // Подсветка объекта под курсором
    if (this.hoveredItem && this.hoveredItem !== this.selectedItem) {
      const img = this.images[this.hoveredItem.key || this.hoveredItem.emptyKey];
      if (img) {
        const sc = this.hoveredItem.scale || 0.5;
        const w = img.width * sc;
        const h = img.height * sc;
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(this.hoveredItem.x - w / 2 - 4, this.hoveredItem.y - h / 2 - 4, w + 8, h + 8);
        ctx.restore();
      }
    }

    // Золотая рамка и маркеры выделенного объекта
    if (this.selectedItem) {
      const img = this.images[this.selectedItem.key || this.selectedItem.emptyKey];
      if (img) {
        const sc = this.selectedItem.scale || 0.5;
        const w = img.width * sc;
        const h = img.height * sc;
        const rx = this.selectedItem.x - w / 2 - 5;
        const ry = this.selectedItem.y - h / 2 - 5;
        const rw = w + 10;
        const rh = h + 10;

        ctx.save();
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
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(`X:${this.selectedItem.x} Y:${this.selectedItem.y}`, this.selectedItem.x, ry - 10);

        ctx.restore();
      }
    }
  }

  renderPlacementGhost(ctx) {
    const img = this.images[this.placingAsset.key || this.placingAsset.emptyKey];
    if (!img) return;

    let posX = this.mouseX;
    let posY = this.mouseY;

    if (this.snapToGrid) {
      const worldX = posX + this.cameraX;
      posX = (Math.round(worldX / this.gridStep) * this.gridStep) - this.cameraX;
      posY = Math.round(posY / this.gridStep) * this.gridStep;
    }

    const sc = this.placingAsset.defaultScale || 0.5;
    const w = img.width * sc;
    const h = img.height * sc;

    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.drawImage(img, posX - w / 2, posY - h / 2, w, h);

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(posX - w / 2 - 2, posY - h / 2 - 2, w + 4, h + 4);

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'center';
    ctx.fillText(`[Клик для размещения: ${this.placingAsset.name}]`, posX, posY - h / 2 - 8);

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
