import { Bird } from './Bird.js';
import { EggManager } from './EggManager.js';
import { gameState } from '../core/GameState.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';
import { STAGE1_ASSETS_MANIFEST, ASSET_KEY_ALIASES } from './Stage1Assets.js';

/**
 * Stage1Level — Полноценный игровой Этап I: "Лесной полёт Кукушки".
 * 
 * Включает:
 * - Многослойный параллакс леса (6 фонов, глубина 0.12, 0.35, 0.65, 1.0, 1.25)
 * - Мир протяженностью 7600px с плавной камерой слежения за птицей
 * - Живой лес: деревья (дуб, береза, сосна, яблоня), пни, грибы, ветки, лианы, колючие кусты
 * - Мирные лесные животные (олень, лиса, орел, ежики, дятел, енот, белка, летучая мышь)
 * - Враги с атаками:
 *     1. Злые пчелы (Angry_BEE) и ульи (beehive)
 *     2. Агрессивные вороны (crow) с пикированием
 *     3. Белки-разбойники (TRAP-squirrel), бросающие желуди/шишки
 * - Кормушки (Feeder): посадка, клевание зёрен, чекпоинт, лечение и пополнение яиц
 * - Задание Кукушки: подкинуть яйца в 5 чужих гнёзд (Nest) по пути к Великому Гнезду
 * - Финишная праздничная поляна с конфетти, подсчетом очков и поздравлением
 */
export class Stage1Level {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Виртуальное разрешение экрана 16:9
    this.viewWidth = 1280;
    this.viewHeight = 720;
    this.worldWidth = 14999;
    this.worldHeight = 720;
    this.groundY = 660;

    // Камера
    this.cameraX = 0;
    this.cameraY = 0;
    this.targetCameraX = 0;

    // Спрайты птицы
    this.flapSprites = [];
    this.glideSprites = [];
    this.stunSprite = null;
    this.isLoaded = false;
    this.loadedAssetsCount = 0;
    this.totalAssetsCount = 0;

    // Графика уровня
    this.images = {};

    // Состояние игрока
    this.bird = null;
    this.eggManager = new EggManager();
    this.stamina = 100; // Энергия птицы (100% макс)
    this.maxStamina = 100;
    this.score = 0;
    this.invulnerableTimer = 0;

    // Чекпоинт (последняя кормушка)
    this.checkpoint = { x: 260, y: 320, name: 'Старт' };

    // Сущности уровня
    this.backgrounds = [];
    this.scenery = [];
    this.animals = [];
    this.enemies = [];
    this.feeders = [];
    this.nests = [];
    this.projectiles = []; // снаряды врагов (шишки, желуди)
    this.particles = [];
    this.ambientLeaves = [];

    // Геймплейный статус
    this.isActive = false;
    this.isVictory = false;
    this.isGameOver = false;
    this.isTutorialOpen = true; // Окно обучения перед первым полётом
    this.nestsCompleted = 0;
    this.totalNests = 5;
    this.levelTime = 0;

    // Статистика уровня (для экрана LEVEL 2 START)
    this.stats = {
      eggsLaid: 0,
      feedersEaten: 0,
      fallsCount: 0,
      levelTime: 0
    };

    // Ввод
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      shift: false,
      space: false
    };

    // Прицеливание мыши
    this.mouseX = 640;
    this.mouseY = 360;
    this.aimHoldTimer = 0;
    this.isHoldingAim = false;

    // UI Оверлей уровня
    this.uiOverlay = null;

    this.initCanvas();
    this.bindControls();
    this.preloadAllAssets();
  }

  initCanvas() {
    if (!this.canvas) return;
    this.canvas.width = this.viewWidth;
    this.canvas.height = this.viewHeight;
  }

  /* ==========================================================================
     Загрузка ассетов
     ========================================================================== */
  preloadAllAssets() {
    const birdSpriteCount = 66 + 30 + 1;
    this.totalAssetsCount = STAGE1_ASSETS_MANIFEST.length + birdSpriteCount;

    const onItemLoaded = () => {
      this.loadedAssetsCount++;
      if (this.loadedAssetsCount >= this.totalAssetsCount) {
        // Создаем алиасы для совместимости с существующими ключами
        for (const [alias, realKey] of Object.entries(ASSET_KEY_ALIASES)) {
          if (this.images[realKey]) {
            this.images[alias] = this.images[realKey];
          }
        }
        this.isLoaded = true;
        this.initWorldEntities();
        console.log(`🌲 [Stage1Level] Все ${STAGE1_ASSETS_MANIFEST.length} файлов Первого Уровня загружены!`);
      }
    };

    // 1. Загрузка ВСЕХ 146 ассетов Первого Уровня
    STAGE1_ASSETS_MANIFEST.forEach((item) => {
      const img = new Image();
      img.src = item.src;
      img.onload = onItemLoaded;
      img.onerror = () => {
        console.warn(`[Stage1Level] Не удалось загрузить: ${item.src}`);
        onItemLoaded();
      };
      this.images[item.key] = img;
    });

    // 2. Загрузка 66 кадров взмаха
    for (let i = 1; i <= 66; i++) {
      const num = String(i).padStart(5, '0');
      const img = new Image();
      img.src = `assets/Character/BIRD-FLY/Last BIRDY_${num}.png`;
      img.onload = onItemLoaded;
      img.onerror = onItemLoaded;
      this.flapSprites.push(img);
    }

    // 3. Загрузка 30 кадров парения
    for (let i = 1; i <= 30; i++) {
      const fileName = i === 25 ? 'PLANE- BIRDY_0025.png' : `PLANE- BIRDY_${String(i).padStart(5, '0')}.png`;
      const img = new Image();
      img.src = `assets/Character/Bird-PLANE/${fileName}`;
      img.onload = onItemLoaded;
      img.onerror = onItemLoaded;
      this.glideSprites.push(img);
    }

    // 4. Стан
    this.stunSprite = new Image();
    this.stunSprite.src = 'assets/Character/BIRD-STUN/STUN.png';
    this.stunSprite.onload = onItemLoaded;
    this.stunSprite.onerror = onItemLoaded;
  }

  /* ==========================================================================
     Инициализация мира, врагов, кормушек и гнезд
     ========================================================================== */
  initWorldEntities() {
    // 1. Игрок (Птица)
    this.bird = new Bird(this.flapSprites, this.glideSprites, this.stunSprite);
    this.bird.minX = 60;
    this.bird.maxX = this.worldWidth - 120;
    this.bird.groundY = this.groundY;
    this.bird.x = this.checkpoint.x;
    this.bird.y = this.checkpoint.y;
    this.bird.scale = 0.105;
    this.bird.onlyForward = true;
    this.bird.baseForwardSpeed = 190;

    this.bird.onCrashCallback = () => {
      this.stats.fallsCount++;
      this.takeDamage(15, 'Падение на землю!');
    };

    // Бросок яйца отнимает 10% энергии
    this.eggManager.onThrowCallback = () => {
      this.stats.eggsLaid++;
      this.stamina = Math.max(0, this.stamina - 10);
      this.showToast('🥚 Бросок яйца (-10% ⚡)');
      this.updateHUD();
    };

    // 2. Создание структуры декораций (деревья, камни, кусты)
    this.buildScenery();

    // 3. Создание мирных животных
    this.buildAnimals();

    // 4. Создание врагов (пчелы, ульи, вороны, белки-ловушки)
    this.buildEnemies();

    // 5. Создание кормушек (Feeder Stations)
    this.buildFeeders();

    // 6. Создание целевых гнезд (Nests)
    this.buildNests();

    // 7. Летающие листья в атмосфере
    this.buildAmbientLeaves();

    // 8. Загрузка пользовательских данных уровня (если есть сохранённые)
    this.loadCustomLevelData();
  }

  async loadCustomLevelData() {
    // 1. Проверяем API /api/load-level (серверное сохранение в data/stage1_level.json)
    try {
      const resp = await fetch('/api/load-level');
      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.worldWidth || data.nests || data.feeders || data.scenery)) {
          this.applyLevelData(data);
          return;
        }
      }
    } catch (e) {}

    // 2. Проверяем localStorage браузера
    const saved = localStorage.getItem('birday_stage1_custom_level');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && (data.worldWidth || data.nests || data.feeders || data.scenery)) {
          this.applyLevelData(data);
          return;
        }
      } catch (e) {}
    }
  }

  applyLevelData(data) {
    if (data.worldWidth) this.worldWidth = data.worldWidth;
    if (data.worldHeight) this.worldHeight = data.worldHeight;
    if (data.groundY) this.groundY = data.groundY;
    if (data.checkpoint) this.checkpoint = { ...data.checkpoint };
    if (data.finishZone) this.finishZone = { ...data.finishZone };

    if (data.scenery !== undefined) this.scenery = JSON.parse(JSON.stringify(data.scenery));
    if (data.animals !== undefined) this.animals = JSON.parse(JSON.stringify(data.animals));
    if (data.enemies !== undefined) this.enemies = JSON.parse(JSON.stringify(data.enemies));
    if (data.feeders !== undefined) this.feeders = JSON.parse(JSON.stringify(data.feeders));
    if (data.nests !== undefined) {
      this.nests = JSON.parse(JSON.stringify(data.nests));
      this.totalNests = this.nests.length;
    }

    if (this.bird && this.checkpoint) {
      this.bird.x = this.checkpoint.x;
      this.bird.y = this.checkpoint.y;
      this.bird.maxX = this.worldWidth - 120;
      this.bird.groundY = this.groundY;
    }
  }

  buildScenery() {
    this.scenery = [];

    // Добавляем деревья вдоль всего уровня
    const treeDefs = [
      { key: 'tree_apple', x: 280, y: 340, scale: 0.55 },
      { key: 'tree_birch', x: 620, y: 300, scale: 0.65 },
      { key: 'tree_oak', x: 1050, y: 260, scale: 0.75 },
      { key: 'tree_chestnut', x: 1540, y: 310, scale: 0.60 },
      { key: 'tree_oak_2', x: 1980, y: 280, scale: 0.70 },
      { key: 'tree_fir', x: 2500, y: 260, scale: 0.80 },
      { key: 'tree_oak_dark', x: 3100, y: 270, scale: 0.72 },
      { key: 'tree_dead', x: 3600, y: 330, scale: 0.60 },
      { key: 'tree_birch_2', x: 4100, y: 290, scale: 0.68 },
      { key: 'tree_fir_2', x: 4700, y: 260, scale: 0.80 },
      { key: 'tree_rowan', x: 5300, y: 320, scale: 0.65 },
      { key: 'tree_oak', x: 5900, y: 270, scale: 0.74 },
      { key: 'tree_apple', x: 6500, y: 320, scale: 0.60 },
      // Великое Финишное Древо
      { key: 'tree_oak_2', x: 7200, y: 240, scale: 0.95 }
    ];

    treeDefs.forEach(t => {
      this.scenery.push({
        type: 'tree',
        key: t.key,
        x: t.x,
        y: t.y,
        scale: t.scale,
        layer: 3
      });
    });

    // Пни, камни, кусты и колючки (препятствия) на земле
    const groundProps = [
      { key: 'stone_1', x: 420, y: 565, scale: 0.35, isHazard: false },
      { key: 'bush_1', x: 520, y: 550, scale: 0.45, isHazard: false },
      { key: 'stump_mushroom', x: 880, y: 540, scale: 0.42, isHazard: false },
      { key: 'thorns_1', x: 1400, y: 540, scale: 0.48, isHazard: true },
      { key: 'bush_yellow', x: 1750, y: 555, scale: 0.40, isHazard: false },
      { key: 'stone_7', x: 2150, y: 560, scale: 0.40, isHazard: false },
      { key: 'thorns_2', x: 2700, y: 540, scale: 0.50, isHazard: true },
      { key: 'stump_white', x: 3350, y: 545, scale: 0.42, isHazard: false },
      { key: 'water_lilly', x: 3750, y: 575, scale: 0.45, isHazard: false },
      { key: 'thorns_1', x: 4300, y: 540, scale: 0.48, isHazard: true },
      { key: 'leaves_pile', x: 4900, y: 555, scale: 0.50, isHazard: false },
      { key: 'stone_10', x: 5150, y: 560, scale: 0.40, isHazard: false },
      { key: 'thorns_2', x: 5750, y: 540, scale: 0.50, isHazard: true },
      { key: 'stump_wood', x: 6250, y: 550, scale: 0.45, isHazard: false },
      { key: 'bush_2', x: 6850, y: 550, scale: 0.45, isHazard: false }
    ];

    groundProps.forEach(p => {
      this.scenery.push({
        type: p.isHazard ? 'hazard' : 'prop',
        key: p.key,
        x: p.x,
        y: p.y,
        scale: p.scale,
        isHazard: p.isHazard,
        width: 120 * p.scale,
        height: 100 * p.scale,
        layer: 3
      });
    });

    // Верхние свисающие лианы (передний план)
    for (let x = 300; x < this.worldWidth; x += 550) {
      const vineKey = (x % 1100 === 0) ? 'vines_upper_2' : 'vines_upper_1';
      this.scenery.push({
        type: 'vine',
        key: vineKey,
        x: x,
        y: 40,
        scale: 0.45 + (x % 3) * 0.08,
        layer: 4 // Передний план с легким параллаксом
      });
    }
  }

  buildAnimals() {
    this.animals = [
      // Олени
      { key: 'animal_deer_eat', name: 'Оленёнок', x: 480, y: 530, scale: 0.38, greeting: '🦌 *хрумкает клевер*', reacted: false },
      { key: 'animal_deer_stand', name: 'Благородный Олень', x: 3800, y: 515, scale: 0.42, greeting: '🦌 *смотрит ввысь*', reacted: false },

      // Дятел на березе
      { key: 'animal_woodpecker', name: 'Дятел', x: 670, y: 330, scale: 0.32, greeting: '🪵 *тук-тук-тук!*', reacted: false },

      // Ежики у грибных пней
      { key: 'animal_hedgehog', name: 'Ёжик', x: 920, y: 570, scale: 0.28, greeting: '🦔 *фыр-фыр*', reacted: false },
      { key: 'animal_hedgehog_2', name: 'Ежиха', x: 5020, y: 570, scale: 0.28, greeting: '🦔 *собирает листики*', reacted: false },

      // Лиса
      { key: 'animal_fox', name: 'Лисица', x: 1820, y: 535, scale: 0.36, greeting: '🦊 *любопытно щурится*', reacted: false },

      // Орел на высоком дубе
      { key: 'animal_eagle', name: 'Гордый Орёл', x: 3120, y: 190, scale: 0.40, greeting: '🦅 *кивает кукушке*', reacted: false },

      // Енот и скунс
      { key: 'animal_raccoon', name: 'Енот-полоскун', x: 2200, y: 540, scale: 0.32, greeting: '🦝 *моет лапки*', reacted: false },
      { key: 'animal_skunk', name: 'Скунс', x: 4400, y: 545, scale: 0.30, greeting: '🐾 *машет хвостиком*', reacted: false },

      // Летучая мышь под сводом ветвей
      { key: 'animal_bat', name: 'Летучая Мышь', x: 3580, y: 160, scale: 0.30, greeting: '🦇 *спит вниз головой*', reacted: false },

      // Белочка мирная
      { key: 'animal_squirrel', name: 'Белка', x: 6540, y: 340, scale: 0.32, greeting: '🐿️ *грызёт семечко*', reacted: false }
    ];
  }

  buildEnemies() {
    this.enemies = [
      // 1. Улей и пчелы в Роще Ульев (X: 1600 - 2400)
      { type: 'beehive', key: 'enemy_beehive', x: 1560, y: 240, scale: 0.38, hp: 1, alive: true },
      { type: 'bee', key: 'enemy_bee', x: 1680, y: 280, scale: 0.34, baseX: 1680, baseY: 280, ampY: 45, speed: 2.2, hp: 1, alive: true },
      { type: 'bee', key: 'enemy_bee', x: 1880, y: 230, scale: 0.34, baseX: 1880, baseY: 230, ampY: 60, speed: 2.6, hp: 1, alive: true },

      // 2. Ворона-перехватчик (X: 2800)
      { type: 'crow', key: 'enemy_crow', x: 2880, y: 240, scale: 0.36, vx: -60, startX: 2880, baseY: 240, hp: 1, alive: true, diveTimer: 0 },

      // 3. Белка-разбойник на ветке, метает шишки (X: 3400)
      { type: 'trap_squirrel', key: 'enemy_squirrel_1', x: 3420, y: 320, scale: 0.38, throwCooldown: 2.8, timer: 1.0, hp: 1, alive: true },

      // 4. Вторая стая пчел и улей (X: 4300)
      { type: 'beehive', key: 'enemy_beehive', x: 4260, y: 220, scale: 0.38, hp: 1, alive: true },
      { type: 'bee', key: 'enemy_bee', x: 4360, y: 250, scale: 0.34, baseX: 4360, baseY: 250, ampY: 55, speed: 3.0, hp: 1, alive: true },
      { type: 'bee', key: 'enemy_bee', x: 4520, y: 290, scale: 0.34, baseX: 4520, baseY: 290, ampY: 70, speed: 2.8, hp: 1, alive: true },

      // 5. Вторая ворона (X: 5100)
      { type: 'crow', key: 'enemy_crow', x: 5180, y: 220, scale: 0.36, vx: -75, startX: 5180, baseY: 220, hp: 1, alive: true, diveTimer: 0 },

      // 6. Две белки-ловушки (X: 5800, 6100)
      { type: 'trap_squirrel', key: 'enemy_squirrel_2', x: 5860, y: 310, scale: 0.38, throwCooldown: 2.5, timer: 0.5, hp: 1, alive: true },
      { type: 'trap_squirrel', key: 'enemy_squirrel_3', x: 6220, y: 330, scale: 0.38, throwCooldown: 2.4, timer: 1.8, hp: 1, alive: true }
    ];
  }

  buildFeeders() {
    this.feeders = [
      { id: 1, key: 'feeder_1', name: 'Берёзовая кормушка', x: 800, y: 320, scale: 0.42, visited: false },
      { id: 2, key: 'feeder_2', name: 'Лесной домик зерна', x: 2350, y: 310, scale: 0.44, visited: false },
      { id: 3, key: 'feeder_3', name: 'Кормушка на дубовой ветви', x: 3950, y: 290, scale: 0.45, visited: false },
      { id: 4, key: 'feeder_4', name: 'Подвесная кормушка на канате', x: 5550, y: 300, scale: 0.43, visited: false }
    ];
  }

  buildNests() {
    this.nests = [
      {
        id: 1,
        title: 'Дупло синицы',
        x: 1350,
        y: 350,
        scale: 0.45,
        emptyKey: 'nest_hollow',
        filledKey: 'nest_egg_1',
        filled: false,
        cupX: 1350,
        cupY: 345,
        radius: 46
      },
      {
        id: 2,
        title: 'Мшистое гнездо дрозда',
        x: 2900,
        y: 420,
        scale: 0.45,
        emptyKey: 'nest_stone',
        filledKey: 'nest_egg_2',
        filled: false,
        cupX: 2900,
        cupY: 415,
        radius: 48
      },
      {
        id: 3,
        title: 'Гнездо сойки на ветке',
        x: 4450,
        y: 290,
        scale: 0.46,
        emptyKey: 'nest_empty_1',
        filledKey: 'nest_egg_1',
        filled: false,
        cupX: 4450,
        cupY: 285,
        radius: 46
      },
      {
        id: 4,
        title: 'Высокое гнездо иволги',
        x: 6050,
        y: 210,
        scale: 0.45,
        emptyKey: 'nest_up',
        filledKey: 'nest_egg_2',
        filled: false,
        cupX: 6050,
        cupY: 205,
        radius: 48
      },
      {
        id: 5,
        title: 'Уютное берёзовое гнездо',
        x: 6720,
        y: 330,
        scale: 0.46,
        emptyKey: 'nest_empty_2',
        filledKey: 'nest_egg_1',
        filled: false,
        cupX: 6720,
        cupY: 325,
        radius: 48
      }
    ];
  }

  buildAmbientLeaves() {
    this.ambientLeaves = [];
    for (let i = 0; i < 40; i++) {
      this.ambientLeaves.push({
        x: Math.random() * this.viewWidth,
        y: Math.random() * this.viewHeight,
        vx: 30 + Math.random() * 45,
        vy: 20 + Math.random() * 35,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 3,
        size: 14 + Math.random() * 12,
        key: Math.random() < 0.5 ? 'leaf_red' : 'leaf_yellow'
      });
    }
  }

  /* ==========================================================================
     Управление и слушатели событий
     ========================================================================== */
  bindControls() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      // Если открыто окно обучения — закрываем по Space, Enter или Escape
      if (this.isTutorialOpen) {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
          e.preventDefault();
          this.closeTutorialModal();
        }
        return;
      }

      // W / Стрелка вверх: Взмах крыльями (-5% энергии)
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.input.up = true;
        if (!e.repeat) {
          this.attemptFlap();
        }
      }

      // Shift: Режим планирования (0% расхода энергии)
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.input.shift = true;
        this.input.up = false;
      }

      // ПРОБЕЛ: Активирует замедление времени (застывание на 1 сек) и режим прицеливания яйцом (-10% энергии)!
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.bird) {
          if (this.bird.isStunned) {
            this.bird.recoverFromStun();
          } else if (!e.repeat) {
            this.attemptStartAiming();
          }
        }
      }

      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.input.down = true;
      }
      // Летать назад нельзя: только вперед!
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.input.left = false;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.input.right = true;
      }

      // F: Быстрый прицел/бросок (-10% энергии)
      if (e.code === 'KeyF' && !e.repeat) {
        this.quickThrowEgg();
      }

      // 1-6: Быстрый выбор типа яйца
      const eggTypes = ['Default', 'Blue', 'Pink', 'Purple', 'Red', 'Gold'];
      if (e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key, 10) - 1;
        this.eggManager.selectType(eggTypes[idx]);
        this.showToast(`Выбрано яйцо: ${eggTypes[idx]}`);
      }

      // Q / E: Переключение типов яиц
      if (e.code === 'KeyQ') {
        this.cycleEggType(-1);
      }
      if (e.code === 'KeyE') {
        this.cycleEggType(1);
      }

      // Escape: Выход в меню
      if (e.code === 'Escape') {
        audio.playClick();
        events.emit('stage:exit_to_title');
        return;
      }

      // R: Быстрый респавн на чекпоинте
      if (e.code === 'KeyR') {
        this.respawnAtCheckpoint();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;

      // Отпускание Пробела -> Бросок яйца по направлению стрелки!
      if (e.code === 'Space') {
        if (this.eggManager.isAiming && this.bird) {
          this.eggManager.releaseAndThrow(this.bird.vx, this.bird.vy);
        }
      }

      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.input.up = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.input.shift = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.input.down = false;
      this.input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.input.right = false;
    });

    // Мышь: позиция курсора
    window.addEventListener('pointermove', (e) => {
      if (!this.canvas || !this.isActive) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.viewWidth / rect.width;
      const scaleY = this.viewHeight / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });

    // Мышь: ЛКМ — взмах (-5% энергии) или бросок яйца, ПКМ — планирование (0% энергии)
    window.addEventListener('pointerdown', (e) => {
      if (!this.isActive || this.isTutorialOpen) return;

      if (e.button === 2) {
        // ПКМ -> Режим планирования
        e.preventDefault();
        this.input.shift = true;
        this.input.up = false;
      } else if (e.button === 0) {
        // ЛКМ:
        if (this.eggManager.isAiming && this.bird) {
          // Если целились пробелом и кликнули — мгновенно бросаем!
          this.eggManager.releaseAndThrow(this.bird.vx, this.bird.vy);
        } else {
          // Обычный ЛКМ в полёте -> Взмах крыльями (-5% энергии)
          this.attemptFlap();
        }
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isActive) return;
      if (e.button === 2) {
        // Отпускание ПКМ -> Выход из режима планирования
        this.input.shift = false;
      }
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.isActive) e.preventDefault();
    });
  }

  attemptFlap() {
    if (!this.bird) return;
    if (this.bird.isStunned) {
      if (this.bird.stunTimer > 0.25) {
        this.bird.recoverFromStun();
      }
      return;
    }

    // В режиме планирования взмах заблокирован
    if (this.input.shift) return;

    if (this.stamina < 5) {
      this.showToast('⚠️ Нет энергии для взмаха! (нужно 5% ⚡)');
      return;
    }

    this.stamina = Math.max(0, this.stamina - 5);
    this.bird.flap();
    this.updateHUD();
  }

  attemptStartAiming() {
    if (!this.bird || this.bird.isStunned || this.eggManager.isAiming) return;
    if (this.stamina < 10) {
      this.showToast('⚠️ Недостаточно энергии для броска яйца! (нужно 10% ⚡)');
      return;
    }
    const worldMouseX = this.mouseX + this.cameraX;
    const worldMouseY = this.mouseY;
    this.eggManager.startAiming(this.bird.x, this.bird.y, worldMouseX, worldMouseY);
  }

  quickThrowEgg() {
    if (!this.bird || this.bird.isStunned) return;
    if (this.stamina < 10) {
      this.showToast('⚠️ Недостаточно энергии для броска яйца! (нужно 10% ⚡)');
      return;
    }
    const worldMouseX = this.mouseX + this.cameraX;
    const worldMouseY = this.mouseY;
    this.eggManager.startAiming(this.bird.x, this.bird.y, worldMouseX, worldMouseY);
    this.eggManager.releaseAndThrow(this.bird.vx, this.bird.vy);
  }

  cycleEggType(dir) {
    const types = ['Default', 'Blue', 'Pink', 'Purple', 'Red', 'Gold'];
    let idx = types.indexOf(this.eggManager.currentEggType);
    if (idx === -1) idx = 0;
    idx = (idx + dir + types.length) % types.length;
    this.eggManager.selectType(types[idx]);
    this.showToast(`Яйцо: ${types[idx]}`);
  }

  /* ==========================================================================
     Запуск и Остановка Этапа
     ========================================================================== */
  start() {
    this.isActive = true;
    this.isVictory = false;
    this.isGameOver = false;
    this.isTutorialOpen = true; // Открываем обучение перед началом полёта
    this.stamina = 100;
    this.maxStamina = 100;
    this.score = 0;
    this.levelTime = 0;
    this.nestsCompleted = 0;

    // Сброс статистики
    this.stats = {
      eggsLaid: 0,
      feedersEaten: 0,
      fallsCount: 0,
      levelTime: 0
    };

    if (this.eggManager) {
      this.eggManager.eggsThrown = 0;
      this.eggManager.eggs = [];
    }

    if (this.canvas) {
      this.canvas.style.display = 'block';
    }

    if (this.bird) {
      this.bird.reset();
      this.bird.crashCount = 0;
      this.bird.x = this.checkpoint.x;
      this.bird.y = this.checkpoint.y;
    }

    // Сброс гнезд
    this.nests.forEach(n => { n.filled = false; });
    // Сброс врагов
    this.enemies.forEach(en => { en.alive = true; });
    // Сброс кормушек
    this.feeders.forEach(f => { f.visited = false; });

    // Скрываем общую шапку сайта и очищаем тосты для максимального минимализма
    const topBar = document.getElementById('top-bar');
    if (topBar) topBar.style.display = 'none';

    const toastCont = document.getElementById('toast-container');
    if (toastCont) toastCont.innerHTML = '';

    this.createUIOverlay();
    this.showTutorialModal();
    gameState.setStage('STAGE_1_LEVEL');
    console.log('🌲 [Stage1Level] Уровень 1 "Лесной Полёт" запущен!');
  }

  stop() {
    this.isActive = false;
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    const topBar = document.getElementById('top-bar');
    if (topBar) topBar.style.display = '';
    this.removeUIOverlay();
  }

  /* ==========================================================================
     HTML UI Оверлей (HUD уровня, здоровье, прогресс, переключатели)
     ========================================================================== */
  createUIOverlay() {
    this.removeUIOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'stage1-level-hud';
    overlay.className = 'stage1-level-hud';

    const playerName = gameState.data.playerName || 'Пилот';

    overlay.innerHTML = `
      <!-- Минималистичный HUD Уровня 1 -->
      <div class="hud-minimal-topbar">
        
        <!-- Левый верхний угол: Энергия с Energy UI.png и полосой #4ad3b7 -->
        <div class="hud-energy-widget">
          <div class="hud-energy-slot">
            <div class="hud-energy-bar" id="hud-energy-bar" style="width: 100%;"></div>
          </div>
          <img src="assets/First-Level/UI/Energy UI.png" class="hud-energy-frame" alt="Энергия" />
          <span class="hud-energy-value" id="hud-energy-val">100%</span>
        </div>

        <!-- Правый верхний угол: Картинка яйца X число отложенных яиц -->
        <div class="hud-top-right-group">
          <div class="hud-egg-counter-widget" title="Отложено яиц в чужие гнезда">
            <img src="assets/First-Level/Item/Egg/Default-Egg.png" class="hud-egg-img" alt="Яйцо" />
            <span class="hud-egg-cross">X</span>
            <span class="hud-egg-num" id="hud-egg-num">0</span>
          </div>
        </div>

      </div>

      <!-- Модальное окно обучения перед стартом уровня -->
      <div id="level-tutorial-modal" class="level-tutorial-modal">
        <div class="tutorial-modal-card">
          <img src="assets/First-Level/UI/TUTORIAL.png" alt="Обучение полету" class="tutorial-board-img" />
          <button id="btn-tutorial-ready" class="fl-wooden-btn" type="button" title="Нажмите, чтобы начать полёт!">
            <span>ГОТОВО</span>
          </button>
        </div>
      </div>

      <!-- Модальное окно победы (скрыто по умолчанию) -->
      <div id="level-victory-modal" class="level-modal hidden">
        <div class="modal-box pixel-frame">
          <div class="modal-stars">⭐ 🏆 ⭐</div>
          <h2 class="modal-title">ЛЕСНОЙ ЭТАП ПРОЙДЕН!</h2>
          <p class="modal-sub">Кукушка успешно доставила яйца именинника к Великому Гнезду!</p>
          
          <div class="victory-stats-grid">
            <div class="stat-card">
              <span class="stat-label">ОЧКИ</span>
              <span class="stat-val" id="vic-score">1500</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">ГНЁЗДА</span>
              <span class="stat-val" id="vic-nests">5 / 5</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">ВРЕМЯ</span>
              <span class="stat-val" id="vic-time">01:42</span>
            </div>
          </div>

          <div class="modal-buttons-row">
            <button id="btn-vic-replay" class="modal-btn btn-green">ПОВТОРИТЬ</button>
            <button id="btn-vic-menu" class="modal-btn btn-stone">В МЕНЮ</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('game-container').appendChild(overlay);
    this.uiOverlay = overlay;

    // Обработчики кнопок UI
    const btnTutorialReady = document.getElementById('btn-tutorial-ready');
    if (btnTutorialReady) {
      btnTutorialReady.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTutorialModal();
      });
    }

    const btnVicReplay = document.getElementById('btn-vic-replay');
    if (btnVicReplay) {
      btnVicReplay.addEventListener('click', () => {
        audio.playClick();
        this.start();
      });
    }

    const btnVicMenu = document.getElementById('btn-vic-menu');
    if (btnVicMenu) {
      btnVicMenu.addEventListener('click', () => {
        audio.playClick();
        events.emit('stage:exit_to_title');
      });
    }
  }

  showTutorialModal() {
    this.isTutorialOpen = true;
    const modal = document.getElementById('level-tutorial-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  closeTutorialModal() {
    if (!this.isTutorialOpen) return;
    this.isTutorialOpen = false;
    audio.playClick();
    const modal = document.getElementById('level-tutorial-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.showToast('🚀 В добрый путь! Удачи в полёте!');
  }

  removeUIOverlay() {
    if (this.uiOverlay) {
      this.uiOverlay.remove();
      this.uiOverlay = null;
    }
  }

  updateHUD() {
    if (!this.uiOverlay) return;

    const energyPct = Math.round(Math.max(0, Math.min(100, this.stamina)));

    // 1. Полоса энергии (#4ad3b7)
    const hudEnergyBar = document.getElementById('hud-energy-bar');
    if (hudEnergyBar) {
      hudEnergyBar.style.width = `${energyPct}%`;
      if (energyPct <= 20) {
        hudEnergyBar.style.background = '#ef4444';
      } else {
        hudEnergyBar.style.background = '#4ad3b7';
      }
    }

    const hudEnergyVal = document.getElementById('hud-energy-val');
    if (hudEnergyVal) {
      hudEnergyVal.textContent = `${energyPct}%`;
    }

    // 2. Счетчик отложенных яиц: картинка X число
    const hudEggNum = document.getElementById('hud-egg-num');
    if (hudEggNum) {
      hudEggNum.textContent = String(this.nestsCompleted);
    }
  }

  showToast(text) {
    // В минималистичном игровом дизайне всплывающие уведомления по центру отключены
  }

  /* ==========================================================================
     Логика игры (Update)
     ========================================================================== */
  update(dt) {
    if (!this.isActive || !this.isLoaded) return;
    if (this.isTutorialOpen) return;

    this.levelTime += dt;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Эффективный dt с замедлением времени (Slo-Mo при прицеливании яйцом)
    const effectiveDt = dt * this.eggManager.timeScale;

    // 1. Обновление птицы
    if (this.bird) {
      this.bird.update(effectiveDt, this.input);

      // Плавное следование камеры за птицей ТОЛЬКО ВПЕРЁД
      const desiredCameraX = this.bird.x - this.viewWidth * 0.35;
      this.targetCameraX = Math.max(this.cameraX, Math.min(this.worldWidth - this.viewWidth, desiredCameraX));
      this.cameraX += (this.targetCameraX - this.cameraX) * Math.min(1, 6 * dt);

      // Птица не может улететь назад за левый край экрана
      this.bird.minX = Math.max(60, this.cameraX + 40);

      // Если энергия исчерпана и птица лежит на земле — перезапуск с чекпоинта
      if (this.stamina <= 0 && this.bird.isStunned && !this.isGameOver) {
        this.triggerGameOver();
      }
    }

    // 2. Обновление летящих яиц и прицеливания (Slo-Mo тикает в реальном dt)
    const worldMouseX = this.mouseX + this.cameraX;
    const worldMouseY = this.mouseY;
    this.eggManager.update(
      dt,
      this.bird ? this.bird.x : 0,
      this.bird ? this.bird.y : 0,
      worldMouseX,
      worldMouseY,
      this.bird ? this.bird.vx : 0,
      this.bird ? this.bird.vy : 0
    );
    this.checkEggCollisions();

    // 3. Обновление врагов (замедляются при прицеливании)
    this.updateEnemies(effectiveDt);

    // 4. Обновление снарядов врагов (замедляются при прицеливании)
    this.updateProjectiles(effectiveDt);

    // 5. Проверка столкновений птицы с препятствиями, кормушками, финишем
    this.checkBirdCollisions();

    // 6. Проверка мирных животных (реакции на пролёт)
    this.checkAnimalReactions();

    // 7. Обновление атмосферных листьев и частиц
    this.updateParticles(dt);

    // 8. Обновление HUD
    this.updateHUD();
  }

  updateEnemies(dt) {
    this.enemies.forEach((enemy) => {
      if (!enemy.alive) return;

      if (enemy.type === 'bee') {
        // Синусоидальный патруль
        enemy.baseX += Math.sin(this.levelTime * enemy.speed) * 30 * dt;
        enemy.y = enemy.baseY + Math.sin(this.levelTime * enemy.speed * 2.5) * enemy.ampY;
        enemy.x = enemy.baseX;

        // Если игрок близко — звук жужжания
        const dist = Math.hypot(enemy.x - this.bird.x, enemy.y - this.bird.y);
        if (dist < 260 && Math.random() < 0.04) {
          audio.playBeeBuzz();
        }
      } else if (enemy.type === 'crow') {
        // Ворона пикирует при приближении птицы
        const distToBird = enemy.x - this.bird.x;
        if (distToBird > 0 && distToBird < 450) {
          enemy.x += enemy.vx * 1.8 * dt;
          enemy.y = enemy.baseY + Math.sin(this.levelTime * 4) * 50 + 40;
          if (Math.random() < 0.03) {
            audio.playCrowScreech();
          }
        } else {
          enemy.x += enemy.vx * dt;
          enemy.y = enemy.baseY + Math.sin(this.levelTime * 2) * 20;
          if (enemy.x < enemy.startX - 500) {
            enemy.vx = 50;
          } else if (enemy.x > enemy.startX + 200) {
            enemy.vx = -60;
          }
        }
      } else if (enemy.type === 'trap_squirrel') {
        // Белка бросает шишки/желуди
        enemy.timer += dt;
        const dist = Math.abs(enemy.x - this.bird.x);
        if (dist < 420 && enemy.timer >= enemy.throwCooldown) {
          enemy.timer = 0;
          this.spawnAcornProjectile(enemy.x, enemy.y + 10);
        }
      }
    });
  }

  spawnAcornProjectile(fromX, fromY) {
    audio.playAcornThrow();
    // Направление в сторону птицы
    const dx = this.bird.x - fromX;
    const dy = this.bird.y - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 260;

    this.projectiles.push({
      x: fromX,
      y: fromY,
      vx: (dx / dist) * speed,
      vy: -120, // начальная дуга вверх
      gravity: 420,
      radius: 12,
      rotation: 0,
      life: 3.5
    });

    this.showToast('⚠️ Осторожно! Белка бросила шишку!');
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += 8 * dt;
      p.life -= dt;

      // Столкновение с птицей
      const dist = Math.hypot(p.x - this.bird.x, p.y - this.bird.y);
      if (dist < 26 && this.invulnerableTimer <= 0) {
        this.takeDamage(15, 'Попадание шишкой от белки!');
        this.projectiles.splice(i, 1);
        continue;
      }

      // Удар о землю
      if (p.y >= this.groundY || p.life <= 0) {
        // Осколки шишки
        for (let s = 0; s < 5; s++) {
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 120,
            vy: -40 - Math.random() * 80,
            color: '#78350f',
            size: 3,
            alpha: 1,
            life: 0.35
          });
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  /* ==========================================================================
     Проверка Столкновений
     ========================================================================== */
  checkBirdCollisions() {
    if (!this.bird) return;

    // 1. Проверка колючек (Hazards) на земле
    this.scenery.forEach(item => {
      if (item.isHazard) {
        const dx = Math.abs(this.bird.x - (item.x + 30));
        const dy = Math.abs(this.bird.y - (item.y + 20));
        if (dx < 45 && dy < 40 && this.invulnerableTimer <= 0) {
          this.takeDamage(15, 'Укол о колючие кусты!');
        }
      }
    });

    // 2. Проверка столкновения с врагами
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      const dist = Math.hypot(this.bird.x - enemy.x, this.bird.y - enemy.y);
      if (dist < 38 && this.invulnerableTimer <= 0) {
        if (enemy.type === 'bee') {
          this.takeDamage(15, 'Укус злой пчелы!');
        } else if (enemy.type === 'crow') {
          this.takeDamage(15, 'Атака вороны!');
        } else if (enemy.type === 'beehive') {
          this.takeDamage(15, 'Столкновение с ульем!');
        }
      }
    });

    // 3. Проверка кормушек (Feeder Checkpoints)
    this.feeders.forEach(feeder => {
      const radius = feeder.radius || 52;
      const dist = Math.hypot(this.bird.x - feeder.x, this.bird.y - feeder.y);
      if (dist < radius) {
        if (!feeder.visited) {
          feeder.visited = true;
          this.stats.feedersEaten++;
          this.checkpoint = { x: feeder.x, y: feeder.y - 30, name: feeder.name };
          audio.playPeckSeed();
          audio.playSuccess();

          // Пополнение 25% энергии
          this.stamina = Math.min(this.maxStamina, this.stamina + 25);
          this.score += 250;

          // Спавн частиц энергии цвета #4ad3b7
          this.spawnCelebrationParticles(feeder.x, feeder.y, '#4ad3b7');
          this.spawnCelebrationParticles(this.bird.x, this.bird.y, '#4ad3b7');

          // Волновой импульс бирюзовых искр #4ad3b7 вокруг кормушки
          for (let i = 0; i < 18; i++) {
            const ang = (Math.PI * 2 * i) / 18;
            const spd = 70 + Math.random() * 90;
            this.particles.push({
              x: feeder.x,
              y: feeder.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 4 + Math.random() * 3,
              color: '#4ad3b7',
              alpha: 1,
              life: 0.85
            });
          }

          this.updateHUD();
        }
      }
    });

    // 4. Проверка финиша (Великое Гнездо)
    if (this.finishZone) {
      const distToFinish = Math.hypot(this.bird.x - this.finishZone.x, this.bird.y - this.finishZone.y);
      if (distToFinish <= (this.finishZone.radius || 110) && !this.isVictory) {
        this.triggerVictory();
      }
    } else if (this.bird.x >= (this.worldWidth - 300) && !this.isVictory) {
      this.triggerVictory();
    }
  }

  checkEggCollisions() {
    const eggs = this.eggManager.eggs;

    for (let eIdx = eggs.length - 1; eIdx >= 0; eIdx--) {
      const egg = eggs[eIdx];
      if (egg.isBroken) continue;

      // 1. Проверка попадания в Гнёзда
      for (const nest of this.nests) {
        if (nest.filled) continue;
        const cupX = nest.cupX !== undefined ? nest.cupX : nest.x;
        const cupY = nest.cupY !== undefined ? nest.cupY : nest.y;
        const radius = nest.radius || 46;
        const distToCup = Math.hypot(egg.x - cupX, egg.y - cupY);
        if (distToCup < radius) {
          // УСПЕШНОЕ ПОПАДАНИЕ В ГНЕЗДО!
          nest.filled = true;
          this.nestsCompleted++;
          egg.isBroken = true;
          egg.shatter();

          const bonus = egg.typeKey === 'Gold' ? 1000 : 500;
          this.score += bonus;

          audio.playNestScored();
          this.spawnCelebrationParticles(cupX, cupY, '#facc15');
          this.showToast(`✨ Попадание в ${nest.title || nest.name || 'Гнездо'}! (+${bonus} Очков)`);
          break;
        }
      }

      // 2. Проверка попадания во Врагов
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = Math.hypot(egg.x - enemy.x, egg.y - enemy.y);
        if (dist < 40) {
          enemy.alive = false;
          egg.isBroken = true;
          egg.shatter();
          audio.playEnemyHit();

          if (enemy.type === 'bee') {
            this.score += 150;
            this.showToast('🐝 Пчела рассеяна! (+150)');
            this.spawnCelebrationParticles(enemy.x, enemy.y, '#fef08a');
          } else if (enemy.type === 'crow') {
            this.score += 300;
            this.showToast('🦅 Ворона отступила в испуге! (+300)');
            this.spawnCelebrationParticles(enemy.x, enemy.y, '#38bdf8');
          } else if (enemy.type === 'beehive') {
            this.score += 400;
            this.stamina = Math.min(this.maxStamina, this.stamina + 20);
            this.showToast('🍯 Мёд из улья! (+400 очков и +20% ⚡ энергии)');
            this.spawnCelebrationParticles(enemy.x, enemy.y, '#f59e0b');
            this.updateHUD();
          } else if (enemy.type === 'trap_squirrel') {
            this.score += 250;
            this.showToast('🐿️ Белка-разбойник выронила запасы! (+250)');
            this.spawnCelebrationParticles(enemy.x, enemy.y, '#f97316');
          }
          break;
        }
      }
    }
  }

  checkAnimalReactions() {
    this.animals.forEach(animal => {
      const dist = Math.hypot(this.bird.x - animal.x, this.bird.y - animal.y);
      if (dist < 180 && !animal.reacted) {
        animal.reacted = true;
        this.showToast(`${animal.greeting}`);
      }
    });
  }

  takeDamage(amount = 15, reason) {
    if (this.invulnerableTimer > 0) return;

    this.stamina = Math.max(0, this.stamina - amount);
    this.invulnerableTimer = 1.4;
    audio.playHurt();

    // Отброс и перья
    if (this.bird) {
      this.bird.vy = -180;
      this.bird.spawnFlapParticles();
    }

    this.showToast(`💥 ${reason} (-${amount}% ⚡)`);
    this.updateHUD();

    if (this.stamina <= 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    audio.playBonk();
    this.showToast('💀 Кукушка выбилась из сил (0% ⚡)! Перезапуск с чекпоинта...');

    setTimeout(() => {
      this.respawnAtCheckpoint();
    }, 1200);
  }

  respawnAtCheckpoint() {
    this.stamina = 100;
    this.isGameOver = false;
    this.invulnerableTimer = 2.0;

    if (this.bird) {
      this.bird.reset();
      this.bird.x = this.checkpoint.x;
      this.bird.y = this.checkpoint.y;
    }

    this.showToast(`🔄 Возрождение на чекпоинте: ${this.checkpoint.name} (⚡ 100% Энергии)`);
    this.updateHUD();
  }

  triggerVictory() {
    if (this.isVictory) return;
    this.isVictory = true;
    this.stats.levelTime = this.levelTime;
    this.stats.eggsLaid = Math.max(this.stats.eggsLaid, this.eggManager ? this.eggManager.eggsThrown : 0);
    this.stats.fallsCount = Math.max(this.stats.fallsCount, this.bird ? this.bird.crashCount : 0);

    audio.playLevelComplete();

    const victoryStats = {
      eggsLaid: this.stats.eggsLaid,
      feedersEaten: this.stats.feedersEaten,
      totalFeeders: this.feeders.length,
      fallsCount: this.stats.fallsCount,
      levelTime: this.levelTime,
      score: this.score + (this.nestsCompleted * 500),
      nestsCompleted: this.nestsCompleted,
      totalNests: this.totalNests,
      playerName: gameState.data.playerName || 'Пилот'
    };

    // Салют конфетти
    if (this.bird) {
      for (let i = 0; i < 40; i++) {
        this.spawnCelebrationParticles(this.bird.x + (Math.random() * 400 - 200), 200 + Math.random() * 200);
      }
    }

    // Испускаем событие победы для запуска видео 'End First Level' и экрана 'LEVEL 2 START'
    events.emit('stage1:victory', victoryStats);
  }

  spawnCelebrationParticles(x, y, color = null) {
    const colors = ['#facc15', '#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 220,
        vy: -60 - Math.random() * 140,
        size: 3.5 + Math.random() * 4,
        color: color || colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0.7 + Math.random() * 0.5
      });
    }
  }

  updateParticles(dt) {
    // 1. Частицы эффектов
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 0.8);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Атмосферные листья
    this.ambientLeaves.forEach(l => {
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.angle += l.rotSpeed * dt;
      if (l.x > this.viewWidth + 50) {
        l.x = -40;
        l.y = Math.random() * this.viewHeight;
      }
      if (l.y > this.viewHeight + 40) {
        l.y = -30;
      }
    });
  }

  /* ==========================================================================
     Рендеринг (Render)
     ========================================================================== */
  render(alpha) {
    if (!this.ctx || !this.isLoaded) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

    // 1. Параллакс фон (Слои 0, 1, 2)
    this.renderParallaxBackground(ctx);

    ctx.save();
    // Сдвиг мировой камеры
    ctx.translate(-Math.round(this.cameraX), 0);

    // 2. Задние декорации и деревья
    this.renderScenery(ctx, 3);

    // 3. Целевые гнезда
    this.renderNests(ctx);

    // 4. Кормушки
    this.renderFeeders(ctx);

    // 4.1. Зона Финиша (Великое Гнездо)
    this.renderFinishZone(ctx);

    // 5. Мирные лесные животные
    this.renderAnimals(ctx);

    // 6. Враги
    this.renderEnemies(ctx);

    // 7. Снаряды врагов (желуди/шишки)
    this.renderProjectiles(ctx);

    // 8. Яйца игрока
    this.eggManager.render(ctx);

    // 9. Игрок (Кукушка)
    if (this.bird) {
      if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
        // Мигание при уроне
        ctx.globalAlpha = 0.4;
      }
      this.bird.render(ctx);
      ctx.globalAlpha = 1.0;
    }

    // 10. Линия и оформление грунта
    this.renderGround(ctx);

    // 11. Частицы эффектов
    this.renderParticles(ctx);

    // 12. Передний план (Лианы слоя 4)
    this.renderScenery(ctx, 4);

    ctx.restore();

    // 13. Атмосферные листья переднего плана (в экранных координатах)
    this.renderAmbientLeaves(ctx);

  }

  renderParallaxBackground(ctx) {
    // 1. Слой 0: Дальнее небо и горы (параллакс ~0.12)
    const bgFar1 = this.images['bg_far_1'];
    const bgFar2 = this.images['bg_far_2'];
    if (bgFar1 && bgFar2) {
      const tileW = bgFar1.width || 1920;
      const scrollX = (this.cameraX * 0.12) % tileW;
      ctx.drawImage(bgFar1, -scrollX, 0, tileW, this.viewHeight);
      ctx.drawImage(bgFar2, tileW - scrollX, 0, tileW, this.viewHeight);
    }

    // 2. Слой 1: Средний лес (параллакс ~0.35)
    const bgMid = this.images['bg_mid'];
    if (bgMid) {
      const tileW = bgMid.width || 1920;
      const scrollX = (this.cameraX * 0.35) % tileW;
      ctx.drawImage(bgMid, -scrollX, 0, tileW, this.viewHeight);
      ctx.drawImage(bgMid, tileW - scrollX, 0, tileW, this.viewHeight);
    }

    // 3. Основная панорама уровня: Forest.png (14999 x 656)
    const forestImg = this.images['forest_map'] || this.images['level_forest_map'];
    if (forestImg && (forestImg.naturalWidth || forestImg.width)) {
      const imgW = forestImg.naturalWidth || forestImg.width || 14999;
      const imgH = forestImg.naturalHeight || forestImg.height || 656;
      const sx = Math.max(0, Math.min(imgW - this.viewWidth, this.cameraX));
      const sw = Math.min(this.viewWidth, imgW - sx);
      ctx.drawImage(forestImg, sx, 0, sw, imgH, 0, 0, sw, this.viewHeight);
    } else {
      // Фолбек: Слой 2 близкой стены леса
      const bgClose1 = this.images['bg_close_1'];
      const bgClose2 = this.images['bg_close_2'];
      if (bgClose1 && bgClose2) {
        const tileW = bgClose1.width || 1920;
        const scrollX = (this.cameraX * 0.65) % (tileW * 2);
        ctx.drawImage(bgClose1, -scrollX, 0, tileW, this.viewHeight);
        ctx.drawImage(bgClose2, tileW - scrollX, 0, tileW, this.viewHeight);
        ctx.drawImage(bgClose1, tileW * 2 - scrollX, 0, tileW, this.viewHeight);
      }
    }
  }

  renderGround(ctx) {
    const forestImg = this.images['forest_map'] || this.images['level_forest_map'];
    if (forestImg && (forestImg.naturalWidth || forestImg.width)) {
      // В карте Forest.png земля, трава и колючки уже нарисованы
      return;
    }

    // Земля и травяная полоса (фолбек)
    const gy = this.groundY;
    const grad = ctx.createLinearGradient(0, gy, 0, this.worldHeight);
    grad.addColorStop(0, '#2d1b0d');
    grad.addColorStop(0.12, '#1e1309');
    grad.addColorStop(1, '#0f0a04');

    ctx.fillStyle = grad;
    ctx.fillRect(this.cameraX - 50, gy, this.viewWidth + 100, this.worldHeight - gy);

    // Верхняя травянистая кромка
    ctx.fillStyle = '#15803d';
    ctx.fillRect(this.cameraX - 50, gy - 2, this.viewWidth + 100, 6);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(this.cameraX - 50, gy - 2, this.viewWidth + 100, 2);
  }

  renderScenery(ctx, layer) {
    this.scenery.forEach(item => {
      if (item.layer !== layer) return;

      // Оптимизация: не рисуем то, что за пределами видимости экрана
      if (item.x < this.cameraX - 300 || item.x > this.cameraX + this.viewWidth + 300) {
        return;
      }

      const img = this.images[item.key];
      if (!img) return;

      const w = img.width * item.scale;
      const h = img.height * item.scale;

      ctx.save();
      if (item.opacity !== undefined) {
        ctx.globalAlpha = item.opacity;
      }
      ctx.drawImage(img, item.x - w / 2, item.y - h / 2, w, h);
      ctx.restore();
    });
  }

  renderAnimals(ctx) {
    this.animals.forEach(animal => {
      if (animal.x < this.cameraX - 250 || animal.x > this.cameraX + this.viewWidth + 250) return;

      const img = this.images[animal.key];
      if (!img) return;

      const w = img.width * animal.scale;
      const h = img.height * animal.scale;

      ctx.save();
      if (animal.opacity !== undefined) {
        ctx.globalAlpha = animal.opacity;
      }
      ctx.drawImage(img, animal.x - w / 2, animal.y - h / 2, w, h);

      ctx.restore();
    });
  }

  renderEnemies(ctx) {
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      if (enemy.x < this.cameraX - 250 || enemy.x > this.cameraX + this.viewWidth + 250) return;

      const img = this.images[enemy.key];
      if (!img) return;

      const w = img.width * enemy.scale;
      const h = img.height * enemy.scale;

      ctx.save();
      if (enemy.opacity !== undefined) {
        ctx.globalAlpha = enemy.opacity;
      }
      // Легкое покачивание для пчелы/вороны
      if (enemy.type === 'bee') {
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(Math.sin(this.levelTime * 15) * 0.12);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        ctx.drawImage(img, enemy.x - w / 2, enemy.y - h / 2, w, h);
      }
      ctx.restore();
    });
  }

  renderProjectiles(ctx) {
    const acornImg = this.images['cone_item'];
    this.projectiles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (acornImg) {
        ctx.drawImage(acornImg, -14, -14, 28, 28);
      } else {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  renderFeeders(ctx) {
    this.feeders.forEach(feeder => {
      if (feeder.x < this.cameraX - 250 || feeder.x > this.cameraX + this.viewWidth + 250) return;

      // Отрисовка спрайта (если это отдельный ассет, а не нарисованная на карте кормушка)
      if (feeder.key && feeder.key !== 'zone_feeder') {
        const img = this.images[feeder.key];
        if (img) {
          const w = img.width * (feeder.scale || 0.5);
          const h = img.height * (feeder.scale || 0.5);
          ctx.save();
          if (feeder.opacity !== undefined) ctx.globalAlpha = feeder.opacity;
          ctx.drawImage(img, feeder.x - w / 2, feeder.y - h / 2, w, h);
          ctx.restore();
        }
      }

      // В обычной игре подсказки и тестовые круги скрыты для погружения
    });
  }

  renderNests(ctx) {
    this.nests.forEach(nest => {
      const cupX = nest.cupX !== undefined ? nest.cupX : nest.x;
      const cupY = nest.cupY !== undefined ? nest.cupY : nest.y;

      if (cupX < this.cameraX - 250 || cupX > this.cameraX + this.viewWidth + 250) return;

      // Отрисовка спрайта (если это отдельный ассет, а не чисто зона на карте)
      if (nest.key && nest.key !== 'zone_nest') {
        const key = nest.filled ? (nest.filledKey || nest.key) : (nest.emptyKey || nest.key);
        const img = this.images[key];
        if (img) {
          const w = img.width * (nest.scale || 0.5);
          const h = img.height * (nest.scale || 0.5);
          ctx.save();
          if (nest.opacity !== undefined) ctx.globalAlpha = nest.opacity;
          ctx.drawImage(img, nest.x - w / 2, nest.y - h / 2, w, h);
          ctx.restore();
        }
      }

      // Аккуратное отображение яйца в гнезде, когда оно успешно подкинуто
      if (nest.filled) {
        ctx.save();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(cupX, cupY - 2, 8, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      // В обычной игре мишени и подсказки скрыты
    });
  }

  renderFinishZone(ctx) {
    // В обычной игре декорация финишного дерева нарисована на панораме, вспомогательные круги скрыты
  }

  renderParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  renderAmbientLeaves(ctx) {
    this.ambientLeaves.forEach(l => {
      const img = this.images[l.key];
      if (!img) return;

      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.angle);
      ctx.globalAlpha = 0.8;
      ctx.drawImage(img, -l.size / 2, -l.size / 2, l.size, l.size);
      ctx.restore();
    });
  }

  renderAimTrajectory(ctx) {
    const screenBirdX = this.bird.x - this.cameraX;
    const screenBirdY = this.bird.y + 12;

    const dx = this.mouseX - screenBirdX;
    const dy = this.mouseY - screenBirdY;
    const len = Math.hypot(dx, dy) || 1;
    const speed = this.eggManager ? this.eggManager.throwForce : 425;

    let simX = screenBirdX;
    let simY = screenBirdY;
    let simVx = (dx / len) * speed;
    let simVy = (dy / len) * speed;
    const simDt = 0.04;
    const grav = 720;

    ctx.save();
    for (let step = 0; step < 26; step++) {
      simVy += grav * simDt;
      simX += simVx * simDt;
      simY += simVy * simDt;

      const alpha = 1 - step / 26;
      ctx.fillStyle = `rgba(250, 204, 21, ${alpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(simX, simY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (simY >= this.groundY) break;
    }

    // Прицельный крестик у курсора мыши
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.mouseX - 18, this.mouseY);
    ctx.lineTo(this.mouseX + 18, this.mouseY);
    ctx.moveTo(this.mouseX, this.mouseY - 18);
    ctx.lineTo(this.mouseX, this.mouseY + 18);
    ctx.stroke();

    ctx.restore();
  }
}
