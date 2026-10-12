import { Bird } from './Bird.js';
import { EggManager } from './EggManager.js';
import { gameState } from '../core/GameState.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';

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
    this.worldWidth = 7600;
    this.worldHeight = 720;
    this.groundY = 595;

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
    this.hearts = 3;
    this.maxHearts = 3;
    this.stamina = 100;
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
    this.nestsCompleted = 0;
    this.totalNests = 5;
    this.levelTime = 0;

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
    const assetList = [
      // 1. Фоны параллакса
      { key: 'bg_far_1', src: 'assets/First-Level/Background/Parallax effect Background.jpg' },
      { key: 'bg_far_2', src: 'assets/First-Level/Background/Parallax effect Background 2.jpg' },
      { key: 'bg_mid', src: 'assets/First-Level/Background/Background mid.jpg' },
      { key: 'bg_close_1', src: 'assets/First-Level/Background/Background Close forest.jpg' },
      { key: 'bg_close_2', src: 'assets/First-Level/Background/background close forest 2.jpg' },
      { key: 'bg_close_3', src: 'assets/First-Level/Background/Background Close forest3.jpg' },

      // 2. Враги
      { key: 'enemy_bee', src: 'assets/First-Level/Enemy/Angry_BEE.png' },
      { key: 'enemy_beehive', src: 'assets/First-Level/Enemy/beehive.png' },
      { key: 'enemy_crow', src: 'assets/First-Level/Enemy/crow.png' },
      { key: 'enemy_squirrel_1', src: 'assets/First-Level/Enemy/TRAP-squirrel.png' },
      { key: 'enemy_squirrel_2', src: 'assets/First-Level/Enemy/TRAP-squirrel2.png' },
      { key: 'enemy_squirrel_3', src: 'assets/First-Level/Enemy/TRAP-squirrel3.png' },

      // 3. Мирные животные
      { key: 'animal_deer_eat', src: 'assets/First-Level/Animal/deer eat.png' },
      { key: 'animal_deer_stand', src: 'assets/First-Level/Animal/deer stand.png' },
      { key: 'animal_eagle', src: 'assets/First-Level/Animal/Eagle sit on branch.png' },
      { key: 'animal_fox', src: 'assets/First-Level/Animal/fox watching.png' },
      { key: 'animal_hedgehog', src: 'assets/First-Level/Animal/hedgehog.png' },
      { key: 'animal_hedgehog_2', src: 'assets/First-Level/Animal/hedgehog-2.png' },
      { key: 'animal_raccoon', src: 'assets/First-Level/Animal/raccon.png' },
      { key: 'animal_skunk', src: 'assets/First-Level/Animal/shunk.png' },
      { key: 'animal_squirrel', src: 'assets/First-Level/Animal/squirrel.png' },
      { key: 'animal_woodpecker', src: 'assets/First-Level/Animal/woodpecker.png' },
      { key: 'animal_bat', src: 'assets/First-Level/Animal/bat.png' },

      // 4. Кормушки
      { key: 'feeder_1', src: 'assets/First-Level/Feeder/feeder-birdhouse.png' },
      { key: 'feeder_2', src: 'assets/First-Level/Feeder/feeder-house.png' },
      { key: 'feeder_3', src: 'assets/First-Level/Feeder/feeder-on-branch.png' },
      { key: 'feeder_4', src: 'assets/First-Level/Feeder/feeder-rope.png' },
      { key: 'feeder_5', src: 'assets/First-Level/Feeder/feeder.png' },

      // 5. Гнёзда
      { key: 'nest_empty_1', src: 'assets/First-Level/Nest/nest.png' },
      { key: 'nest_empty_2', src: 'assets/First-Level/Nest/nest2.png' },
      { key: 'nest_stone', src: 'assets/First-Level/Nest/nest-stone.png' },
      { key: 'nest_hollow', src: 'assets/First-Level/Nest/Nest-hollow.png' },
      { key: 'nest_up', src: 'assets/First-Level/Nest/Nest-Up.png' },
      { key: 'nest_egg_1', src: 'assets/First-Level/Nest/Nest-egy.png' },
      { key: 'nest_egg_2', src: 'assets/First-Level/Nest/Nest-egy2.png' },

      // 6. Окружение: Деревья, Пни, Камни, Кусты, Лианы, Опасности
      { key: 'tree_oak', src: 'assets/First-Level/Environment/Tree/Tree-oak.png' },
      { key: 'tree_oak_2', src: 'assets/First-Level/Environment/Tree/tree-oak2.png' },
      { key: 'tree_oak_dark', src: 'assets/First-Level/Environment/Tree/Tree-oak-dark.png' },
      { key: 'tree_birch', src: 'assets/First-Level/Environment/Tree/tree-birch.png' },
      { key: 'tree_birch_2', src: 'assets/First-Level/Environment/Tree/Tree-birch2.png' },
      { key: 'tree_fir', src: 'assets/First-Level/Environment/Tree/Tree-Fir.png' },
      { key: 'tree_fir_2', src: 'assets/First-Level/Environment/Tree/Tree-Fir2.png' },
      { key: 'tree_apple', src: 'assets/First-Level/Environment/Tree/Tree-apple.png' },
      { key: 'tree_rowan', src: 'assets/First-Level/Environment/Tree/Tree-rowan.png' },
      { key: 'tree_chestnut', src: 'assets/First-Level/Environment/Tree/tree-chestnut.png' },
      { key: 'tree_dead', src: 'assets/First-Level/Environment/Tree/tree-dead.png' },
      
      { key: 'trunk_mushroom', src: 'assets/First-Level/Environment/Trunk/Tree-Trunk-mushroom.png' },
      { key: 'trunk_hollow', src: 'assets/First-Level/Environment/Trunk/tree-hallow.png' },
      { key: 'trunk_white', src: 'assets/First-Level/Environment/Trunk/Tree-Trunk-white.png' },
      { key: 'trunk_1', src: 'assets/First-Level/Environment/Trunk/Tree-Trunk.png' },
      { key: 'trunk_2', src: 'assets/First-Level/Environment/Trunk/Tree-Trunk2.png' },

      { key: 'stump_mushroom', src: 'assets/First-Level/Environment/Stunp/stump-mushroom.png' },
      { key: 'stump_white', src: 'assets/First-Level/Environment/Stunp/stump-white1.png' },
      { key: 'stump_wood', src: 'assets/First-Level/Environment/Stunp/wood peace.png' },
      { key: 'stump_wood_2', src: 'assets/First-Level/Environment/Stunp/wood peace2.png' },

      { key: 'branch_cones', src: 'assets/First-Level/Environment/Branch/branch with cones.png' },
      { key: 'branch_white', src: 'assets/First-Level/Environment/Branch/tree-branch-white.png' },
      { key: 'branch_wood', src: 'assets/First-Level/Environment/Branch/wood-branch.png' },

      { key: 'bush_1', src: 'assets/First-Level/Environment/Brush-Stone/bush.png' },
      { key: 'bush_2', src: 'assets/First-Level/Environment/Brush-Stone/bush2.png' },
      { key: 'bush_yellow', src: 'assets/First-Level/Environment/Brush-Stone/bush-yellow.png' },
      { key: 'leaves_pile', src: 'assets/First-Level/Environment/Brush-Stone/pile-leaves.png' },
      { key: 'stone_1', src: 'assets/First-Level/Environment/Brush-Stone/Stone1.png' },
      { key: 'stone_4', src: 'assets/First-Level/Environment/Brush-Stone/Stone4.png' },
      { key: 'stone_7', src: 'assets/First-Level/Environment/Brush-Stone/Stone7.png' },
      { key: 'stone_10', src: 'assets/First-Level/Environment/Brush-Stone/Stone10.png' },
      { key: 'thorns_1', src: 'assets/First-Level/Environment/Brush-Stone/thorny bushes.png' },
      { key: 'thorns_2', src: 'assets/First-Level/Environment/Brush-Stone/thorny bushes2.png' },

      { key: 'vines_upper_1', src: 'assets/First-Level/Environment/Vines/vines upper.png' },
      { key: 'vines_upper_2', src: 'assets/First-Level/Environment/Vines/vines upper2.png' },
      { key: 'vines_rope', src: 'assets/First-Level/Environment/Vines/rope-up.png' },
      { key: 'vines_3', src: 'assets/First-Level/Environment/Vines/vines3.png' },

      { key: 'leaf_red', src: 'assets/First-Level/Environment/Leaf/leaf-red.png' },
      { key: 'leaf_yellow', src: 'assets/First-Level/Environment/Leaf/leaf-yellow.png' },
      { key: 'cone_item', src: 'assets/First-Level/Environment/cone.png' },
      { key: 'acorn_vine', src: 'assets/First-Level/Environment/acorn hangs on a vine.png' },
      { key: 'water_lilly', src: 'assets/First-Level/Environment/water-lilly.png' }
    ];

    // Плюс 97 спрайтов птицы (66 flap + 30 glide + 1 stun)
    const birdSpriteCount = 66 + 30 + 1;
    this.totalAssetsCount = assetList.length + birdSpriteCount;

    const onItemLoaded = () => {
      this.loadedAssetsCount++;
      if (this.loadedAssetsCount >= this.totalAssetsCount) {
        this.isLoaded = true;
        this.initWorldEntities();
        console.log(`🌲 [Stage1Level] Все ${this.totalAssetsCount} ассетов 1 этапа загружены!`);
      }
    };

    // 1. Загрузка картинок окружения
    assetList.forEach((item) => {
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

    this.bird.onCrashCallback = () => {
      this.takeDamage(1, 'Падение на землю!');
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

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.input.up = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.input.down = true;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.input.left = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.input.right = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.input.shift = true;
      }

      // ПРОБЕЛ: короткое нажатие — взмах, удержание — прицел яйца
      if (e.code === 'Space') {
        if (!e.repeat) {
          this.input.space = true;
          this.aimHoldTimer = 0;
          this.isHoldingAim = false;

          // Обычный взмах, если птица оглушена или взлетает
          if (this.bird && (this.bird.isStunned || !this.eggManager.isAiming)) {
            this.bird.flap();
          }
        }
      }

      // F или ПКМ: Быстрый запуск режима прицела / броска
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

      // R: Быстрый респавн на чекпоинте
      if (e.code === 'KeyR') {
        this.respawnAtCheckpoint();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.input.up = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.input.down = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.input.right = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.input.shift = false;

      if (e.code === 'Space') {
        this.input.space = false;
        // Если удерживали Space и были в режиме прицеливания — совершаем бросок!
        if (this.eggManager.isAiming) {
          this.releaseEggThrow();
        }
        this.aimHoldTimer = 0;
        this.isHoldingAim = false;
      }
    });

    // Мышь
    window.addEventListener('pointermove', (e) => {
      if (!this.canvas || !this.isActive) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.viewWidth / rect.width;
      const scaleY = this.viewHeight / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });

    // Левый клик: взмах, если не прицеливаемся
    window.addEventListener('pointerdown', (e) => {
      if (!this.isActive) return;
      if (e.button === 0) {
        if (this.eggManager.isAiming) {
          this.releaseEggThrow();
        } else if (this.bird) {
          this.bird.flap();
        }
      } else if (e.button === 2) {
        // ПКМ — мгновенный прицел
        e.preventDefault();
        this.startAiming();
      }
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.isActive) e.preventDefault();
    });
  }

  startAiming() {
    if (!this.bird || this.bird.isStunned || this.eggManager.isAiming) return;
    this.eggManager.startAiming(this.bird.x - this.cameraX, this.bird.y);
  }

  releaseEggThrow() {
    if (!this.eggManager.isAiming) return;
    const worldMouseX = this.mouseX + this.cameraX;
    const worldMouseY = this.mouseY;

    // Расчет вектора броска от мировой позиции птицы
    const dx = worldMouseX - this.bird.x;
    const dy = worldMouseY - this.bird.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 560;

    const vx = (dx / len) * speed;
    const vy = (dy / len) * speed;

    this.eggManager.throwEgg(this.bird.x, this.bird.y + 12, vx, vy);
    audio.playEggThrow();
  }

  quickThrowEgg() {
    if (!this.bird || this.bird.isStunned) return;
    // Бросок по направлению вперед-вниз
    const vx = 320;
    const vy = 180;
    this.eggManager.throwEgg(this.bird.x + 20, this.bird.y + 15, vx, vy);
    audio.playEggThrow();
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
    this.hearts = 3;
    this.stamina = 100;
    this.score = 0;
    this.levelTime = 0;
    this.nestsCompleted = 0;

    if (this.canvas) {
      this.canvas.style.display = 'block';
    }

    if (this.bird) {
      this.bird.reset();
      this.bird.x = this.checkpoint.x;
      this.bird.y = this.checkpoint.y;
    }

    // Сброс гнезд
    this.nests.forEach(n => { n.filled = false; });
    // Сброс врагов
    this.enemies.forEach(en => { en.alive = true; });

    this.createUIOverlay();
    gameState.setStage('STAGE_1_LEVEL');
    console.log('🌲 [Stage1Level] Уровень 1 "Лесной Полёт" запущен!');
  }

  stop() {
    this.isActive = false;
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
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
      <!-- Верхняя панель HUD -->
      <div class="level-hud-bar">
        
        <!-- Левый блок: Имя, Жизни, Стамина, Счет -->
        <div class="hud-left-stats">
          <div class="pilot-profile">
            <span class="pilot-avatar">🪶</span>
            <div class="pilot-details">
              <span class="pilot-callsign" id="hud-pilot-name">${playerName}</span>
              <div class="pilot-hearts" id="hud-hearts">❤️❤️❤️</div>
            </div>
          </div>

          <div class="stamina-wrapper">
            <div class="stamina-bar-fill" id="hud-stamina-bar" style="width: 100%;"></div>
            <span class="stamina-label">ВЕТЕР / СТАМИНА</span>
          </div>

          <div class="hud-score-chip">
            <span class="score-label">ОЧКИ:</span>
            <span class="score-value" id="hud-score-num">0</span>
          </div>
        </div>

        <!-- Центральный блок: Трек Прогресса Уровня -->
        <div class="hud-center-track">
          <div class="track-header">
            <span class="track-title">ЛЕСНОЙ МАРШРУТ (ЭТАП I)</span>
            <span class="track-percentage" id="hud-track-pct">0%</span>
          </div>
          <div class="progress-track-rail">
            <div class="progress-track-fill" id="hud-track-fill" style="width: 5%;"></div>
            <div class="track-pin pin-start" title="Старт">🚩</div>
            <div class="track-pin pin-f1" style="left: 11%;" title="Кормушка 1">🏡</div>
            <div class="track-pin pin-n1" style="left: 18%;" title="Гнездо 1">🪺</div>
            <div class="track-pin pin-f2" style="left: 31%;" title="Кормушка 2">🏡</div>
            <div class="track-pin pin-n2" style="left: 38%;" title="Гнездо 2">🪺</div>
            <div class="track-pin pin-f3" style="left: 52%;" title="Кормушка 3">🏡</div>
            <div class="track-pin pin-n3" style="left: 58%;" title="Гнездо 3">🪺</div>
            <div class="track-pin pin-f4" style="left: 73%;" title="Кормушка 4">🏡</div>
            <div class="track-pin pin-n4" style="left: 80%;" title="Гнездо 4">🪺</div>
            <div class="track-pin pin-n5" style="left: 89%;" title="Гнездо 5">🪺</div>
            <div class="track-pin pin-finish" style="left: 97%;" title="Великое Гнездо">🏆</div>
            <div class="track-bird-cursor" id="hud-bird-cursor" style="left: 5%;">🦅</div>
          </div>
        </div>

        <!-- Правый блок: Цели, Яйцо, Кнопки перехода -->
        <div class="hud-right-goals">
          <div class="goal-chip">
            <span class="goal-icon">🪺</span>
            <span class="goal-text">ГНЁЗДА: <b id="hud-nests-count">0 / 5</b></span>
          </div>

          <div class="egg-pouch-chip" id="hud-egg-pouch" title="Нажмите 1-6 или Q/E для смены">
            <span class="egg-icon">🥚</span>
            <span class="egg-type-text" id="hud-egg-type">Default</span>
          </div>

          <div class="hud-actions-group">
            <button id="btn-hud-to-test" class="btn-hud-action" title="Перейти в калибровочную комнату">
              <span>🪶</span> ТЕСТ
            </button>
            <button id="btn-hud-to-menu" class="btn-hud-action" title="Выйти в меню">
              <span>🏠</span> МЕНЮ
            </button>
          </div>
        </div>

      </div>

      <!-- Всплывающая подсказка управления внизу экрана -->
      <div class="hud-bottom-tip">
        <span class="tip-key">[W/ПРОБЕЛ]</span> Взмах &nbsp;•&nbsp; 
        <span class="tip-key">[SHIFT]</span> Парение &nbsp;•&nbsp; 
        <span class="tip-key">[УДЕРЖ. ПРОБЕЛ / ПКМ]</span> Прицел яйца &nbsp;•&nbsp; 
        <span class="tip-key">[F]</span> Быстрый бросок &nbsp;•&nbsp; 
        <span class="tip-key">[1-6]</span> Выбор яйца
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
    const btnToTest = document.getElementById('btn-hud-to-test');
    if (btnToTest) {
      btnToTest.addEventListener('click', () => {
        audio.playClick();
        events.emit('stage:switch_to_calibration');
      });
    }

    const btnToMenu = document.getElementById('btn-hud-to-menu');
    if (btnToMenu) {
      btnToMenu.addEventListener('click', () => {
        audio.playClick();
        events.emit('stage:exit_to_title');
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

  removeUIOverlay() {
    if (this.uiOverlay) {
      this.uiOverlay.remove();
      this.uiOverlay = null;
    }
  }

  updateHUD() {
    if (!this.uiOverlay) return;

    // Жизни
    const hudHearts = document.getElementById('hud-hearts');
    if (hudHearts) {
      hudHearts.textContent = '❤️'.repeat(Math.max(0, this.hearts)) + '🖤'.repeat(Math.max(0, this.maxHearts - this.hearts));
    }

    // Стамина
    const hudStamina = document.getElementById('hud-stamina-bar');
    if (hudStamina) {
      hudStamina.style.width = `${Math.max(0, Math.min(100, this.stamina))}%`;
      hudStamina.style.background = this.stamina > 30 ? 'linear-gradient(90deg, #0ea5e9, #38bdf8)' : 'linear-gradient(90deg, #ef4444, #f87171)';
    }

    // Очки
    const hudScore = document.getElementById('hud-score-num');
    if (hudScore) {
      hudScore.textContent = String(this.score);
    }

    // Гнезда
    const hudNests = document.getElementById('hud-nests-count');
    if (hudNests) {
      hudNests.textContent = `${this.nestsCompleted} / ${this.totalNests}`;
      if (this.nestsCompleted === this.totalNests) {
        hudNests.style.color = '#facc15';
      }
    }

    // Выбранное яйцо
    const hudEgg = document.getElementById('hud-egg-type');
    if (hudEgg) {
      hudEgg.textContent = this.eggManager.currentEggType;
    }

    // Прогресс по маршруту
    const progressRatio = Math.max(0, Math.min(1, (this.bird ? this.bird.x : 0) / this.worldWidth));
    const pct = Math.round(progressRatio * 100);

    const hudPct = document.getElementById('hud-track-pct');
    if (hudPct) hudPct.textContent = `${pct}%`;

    const hudFill = document.getElementById('hud-track-fill');
    if (hudFill) hudFill.style.width = `${Math.max(4, pct)}%`;

    const hudCursor = document.getElementById('hud-bird-cursor');
    if (hudCursor) hudCursor.style.left = `${Math.max(2, Math.min(97, pct))}%`;
  }

  showToast(text) {
    const toastCont = document.getElementById('toast-container');
    if (!toastCont) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    toastCont.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /* ==========================================================================
     Логика игры (Update)
     ========================================================================== */
  update(dt) {
    if (!this.isActive || !this.isLoaded) return;

    this.levelTime += dt;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Обработка удержания Space для активации прицеливания
    if (this.input.space && !this.eggManager.isAiming && !this.bird.isStunned) {
      this.aimHoldTimer += dt;
      if (this.aimHoldTimer > 0.18) {
        this.startAiming();
      }
    }

    // 1. Обновление птицы
    if (this.bird) {
      // Стамина тратится при частом взмахе и восстанавливается при парении (Shift)
      if (this.bird.isGliding) {
        this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
      } else if (this.bird.isFlapping) {
        this.stamina = Math.max(0, this.stamina - 12 * dt);
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + 8 * dt);
      }

      this.bird.update(dt, this.input);

      // Плавное следование камеры за птицей
      this.targetCameraX = this.bird.x - this.viewWidth * 0.35;
      this.targetCameraX = Math.max(0, Math.min(this.worldWidth - this.viewWidth, this.targetCameraX));
      this.cameraX += (this.targetCameraX - this.cameraX) * Math.min(1, 6 * dt);
    }

    // 2. Обновление летящих яиц
    this.eggManager.update(dt);
    this.checkEggCollisions();

    // 3. Обновление врагов
    this.updateEnemies(dt);

    // 4. Обновление снарядов врагов
    this.updateProjectiles(dt);

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
        this.takeDamage(1, 'Попадание шишкой от белки!');
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
          this.takeDamage(1, 'Укол о колючие кусты!');
        }
      }
    });

    // 2. Проверка столкновения с врагами
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      const dist = Math.hypot(this.bird.x - enemy.x, this.bird.y - enemy.y);
      if (dist < 38 && this.invulnerableTimer <= 0) {
        if (enemy.type === 'bee') {
          this.takeDamage(1, 'Укус злой пчелы!');
        } else if (enemy.type === 'crow') {
          this.takeDamage(1, 'Атака вороны!');
        } else if (enemy.type === 'beehive') {
          this.takeDamage(1, 'Столкновение с ульем!');
        }
      }
    });

    // 3. Проверка кормушек (Feeder Checkpoints)
    this.feeders.forEach(feeder => {
      const dist = Math.hypot(this.bird.x - feeder.x, this.bird.y - feeder.y);
      if (dist < 52) {
        if (!feeder.visited) {
          feeder.visited = true;
          this.checkpoint = { x: feeder.x, y: feeder.y - 30, name: feeder.name };
          audio.playPeckSeed();
          audio.playSuccess();

          // Восстановление здоровья и стамины
          if (this.hearts < this.maxHearts) {
            this.hearts++;
          }
          this.stamina = this.maxStamina;
          this.score += 250;

          // Спавн лечебных сердечек и конфетти
          this.spawnCelebrationParticles(feeder.x, feeder.y, '#22c55e');
          this.showToast(`🏡 ${feeder.name}! +1 ❤️ +СТАМИНА (Чекпоинт сохранён)`);
        }
      }
    });

    // 4. Проверка финиша (Великое Гнездо при X >= 7100)
    if (this.bird.x >= 7150 && !this.isVictory) {
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
        const distToCup = Math.hypot(egg.x - nest.cupX, egg.y - nest.cupY);
        if (distToCup < nest.radius) {
          // УСПЕШНОЕ ПОПАДАНИЕ В ГНЕЗДО!
          nest.filled = true;
          this.nestsCompleted++;
          egg.isBroken = true;
          egg.shatter();

          const bonus = egg.typeKey === 'Gold' ? 1000 : 500;
          this.score += bonus;

          audio.playNestScored();
          this.spawnCelebrationParticles(nest.cupX, nest.cupY, '#facc15');
          this.showToast(`✨ Попадание в ${nest.title}! (+${bonus} Очков)`);
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
            if (this.hearts < this.maxHearts) this.hearts++;
            this.showToast('🍯 Мёд из улья! (+400 и +1 ❤️)');
            this.spawnCelebrationParticles(enemy.x, enemy.y, '#f59e0b');
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

  takeDamage(amount, reason) {
    if (this.invulnerableTimer > 0) return;

    this.hearts -= amount;
    this.invulnerableTimer = 1.4;
    audio.playHurt();

    // Отброс и перья
    if (this.bird) {
      this.bird.vy = -180;
      this.bird.spawnFlapParticles();
    }

    this.showToast(`💥 ${reason} (-1 ❤️)`);

    if (this.hearts <= 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    audio.playBonk();
    this.showToast('💀 Кукушка выбилась из сил! Перезапуск с чекпоинта...');

    setTimeout(() => {
      this.respawnAtCheckpoint();
    }, 1200);
  }

  respawnAtCheckpoint() {
    this.hearts = this.maxHearts;
    this.stamina = this.maxStamina;
    this.isGameOver = false;
    this.invulnerableTimer = 2.0;

    if (this.bird) {
      this.bird.reset();
      this.bird.x = this.checkpoint.x;
      this.bird.y = this.checkpoint.y;
    }

    this.showToast(`🔄 Возрождение на чекпоинте: ${this.checkpoint.name}`);
  }

  triggerVictory() {
    this.isVictory = true;
    audio.playLevelComplete();

    const modal = document.getElementById('level-victory-modal');
    if (modal) {
      modal.classList.remove('hidden');

      const vicScore = document.getElementById('vic-score');
      if (vicScore) vicScore.textContent = String(this.score + (this.nestsCompleted * 500));

      const vicNests = document.getElementById('vic-nests');
      if (vicNests) vicNests.textContent = `${this.nestsCompleted} / ${this.totalNests}`;

      const vicTime = document.getElementById('vic-time');
      if (vicTime) {
        const mins = Math.floor(this.levelTime / 60);
        const secs = Math.floor(this.levelTime % 60);
        vicTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    }

    // Салют конфетти
    for (let i = 0; i < 60; i++) {
      this.spawnCelebrationParticles(this.bird.x + (Math.random() * 400 - 200), 200 + Math.random() * 200);
    }
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

    // 14. Дуга прицеливания (если активно)
    if (this.eggManager.isAiming && this.bird) {
      this.renderAimTrajectory(ctx);
    }
  }

  renderParallaxBackground(ctx) {
    // Слой 0: Дальнее небо и горы (параллакс ~0.12)
    const bgFar1 = this.images['bg_far_1'];
    const bgFar2 = this.images['bg_far_2'];
    if (bgFar1 && bgFar2) {
      const tileW = bgFar1.width || 1920;
      const scrollX = (this.cameraX * 0.12) % tileW;
      ctx.drawImage(bgFar1, -scrollX, 0, tileW, this.viewHeight);
      ctx.drawImage(bgFar2, tileW - scrollX, 0, tileW, this.viewHeight);
    }

    // Слой 1: Средний лес (параллакс ~0.35)
    const bgMid = this.images['bg_mid'];
    if (bgMid) {
      const tileW = bgMid.width || 1920;
      const scrollX = (this.cameraX * 0.35) % tileW;
      ctx.drawImage(bgMid, -scrollX, 0, tileW, this.viewHeight);
      ctx.drawImage(bgMid, tileW - scrollX, 0, tileW, this.viewHeight);
    }

    // Слой 2: Близкая стена леса (параллакс ~0.65)
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

  renderGround(ctx) {
    // Земля и травяная полоса
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

      ctx.drawImage(img, item.x - w / 2, item.y - h / 2, w, h);
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
      ctx.drawImage(img, animal.x - w / 2, animal.y - h / 2, w, h);

      // Имя и бейдж животного
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(animal.name, animal.x, animal.y - h / 2 - 8);
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

      const img = this.images[feeder.key];
      if (!img) return;

      const w = img.width * feeder.scale;
      const h = img.height * feeder.scale;

      ctx.save();
      ctx.drawImage(img, feeder.x - w / 2, feeder.y - h / 2, w, h);

      // Иконка кормушки и семян
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = feeder.visited ? '#4ade80' : '#facc15';
      ctx.textAlign = 'center';
      ctx.fillText(feeder.visited ? '✓ КОРМУШКА' : '🏡 КОРМУШКА', feeder.x, feeder.y - h / 2 - 12);
      ctx.restore();
    });
  }

  renderNests(ctx) {
    this.nests.forEach(nest => {
      if (nest.x < this.cameraX - 250 || nest.x > this.cameraX + this.viewWidth + 250) return;

      const key = nest.filled ? nest.filledKey : nest.emptyKey;
      const img = this.images[key];
      if (!img) return;

      const w = img.width * nest.scale;
      const h = img.height * nest.scale;

      ctx.save();
      ctx.drawImage(img, nest.x - w / 2, nest.y - h / 2, w, h);

      // Маркер гнезда
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = nest.filled ? '#facc15' : '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText(nest.filled ? '🪺 ЯЙЦО ПОДКИНУТО!' : `🎯 ${nest.title}`, nest.x, nest.y - h / 2 - 14);

      // Пульсирующий круг-мишень для незаполненного гнезда
      if (!nest.filled) {
        const pulse = Math.sin(this.levelTime * 5) * 3 + nest.radius;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(nest.cupX, nest.cupY, pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
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
    const speed = 560;

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
