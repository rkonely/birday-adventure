import { Bird } from './Bird.js';
import { EggManager } from './EggManager.js';
import { gameState } from '../core/GameState.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';
import { STAGE1_ASSETS_MANIFEST, ASSET_KEY_ALIASES } from './Stage1Assets.js';

/**
 * Stage1Level — Полноценный игровой Этап I: "Лесной полёт Кукушки".
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

    // Камера и эффект тряски (Screen Shake)
    this.cameraX = 0;
    this.cameraY = 0;
    this.targetCameraX = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

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
    this.stamina = 100;
    this.maxStamina = 100;
    this.score = 0;
    this.invulnerableTimer = 0;

    // Точка старта и финиша миссии
    this.missionStartPoint = { x: 120, y: 260, name: 'Старт' };
    this.finishZone = { x: 14500, y: 320, radius: 110, name: 'Великое Гнездо' };

    // Сущности уровня
    this.backgrounds = [];
    this.scenery = [];
    this.animals = [];
    this.enemies = [];
    this.feeders = [];
    this.nests = [];
    this.projectiles = [];
    this.particles = [];
    this.ambientLeaves = [];

    // Снимки для полного сброса уровня (Full Reset)
    this.initialNests = null;
    this.initialFeeders = null;
    this.initialEnemies = null;
    this.initialAnimals = null;
    this.initialScenery = null;
    this.initialStartPoint = null;

    // Геймплейный статус
    this.isActive = false;
    this.isVictory = false;
    this.isGameOver = false;
    this.isPaused = false;
    this.isTutorialOpen = true;
    this.defeatAnimFrame = null;
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

    // UI Оверлей и кеш DOM-узлов HUD
    this.uiOverlay = null;
    this.hudNodes = null;
    this.lastHudState = { energy: -1, eggs: -1 };

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

    // 1. Загрузка ассетов Первого Уровня из манифеста
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

    // 4. Спрайт оглушения
    this.stunSprite = new Image();
    this.stunSprite.src = 'assets/Character/BIRD-STUN/STUN.png';
    this.stunSprite.onload = onItemLoaded;
    this.stunSprite.onerror = onItemLoaded;
  }

  /* ==========================================================================
     Инициализация мира, врагов, кормушек и гнезд
     ========================================================================== */
  async initWorldEntities() {
    // 1. Игрок (Птица)
    this.bird = new Bird(this.flapSprites, this.glideSprites, this.stunSprite);
    this.bird.minX = 60;
    this.bird.maxX = this.worldWidth - 120;
    this.bird.groundY = this.groundY;
    this.bird.x = this.missionStartPoint.x;
    this.bird.y = this.missionStartPoint.y;
    this.bird.scale = 0.105;
    this.bird.onlyForward = true;
    this.bird.baseForwardSpeed = 190;

    this.bird.onCrashCallback = () => {
      this.stats.fallsCount++;
      this.takeDamage(15, 'Падение на землю!');
    };

    // Бросок яйца отнимает 10% энергии
    this.eggManager.groundY = this.groundY;
    this.eggManager.onThrowCallback = () => {
      this.stats.eggsLaid++;
      this.stamina = Math.max(0, this.stamina - 10);
      this.updateHUD();
    };

    // 2. Дефолтные структуры (на случай отсутствия JSON)
    this.buildScenery();
    this.buildAnimals();
    this.buildEnemies();
    this.buildFeeders();
    this.buildNests();
    this.buildAmbientLeaves();

    // 3. Загружаем и применяем сохранённые настройки уровня (data/stage1_level.json или localStorage)
    await this.loadCustomLevelData();

    // 4. Сохраняем исходный снимок сущностей ПОСЛЕ загрузки настроек уровня
    this.saveInitialEntitiesSnapshot();

    // Если start() был вызван до завершения загрузки ассетов — синхронизируем птицу
    if (this.isActive && this.bird) {
      this.bird.x = this.missionStartPoint.x;
      this.bird.y = this.missionStartPoint.y;
      this.bird.vx = this.bird.baseForwardSpeed || 190;
      this.bird.vy = 0;
    }
  }

  async loadCustomLevelData() {
    // 1. Проверяем localStorage (чтобы изменения из редактора применялись мгновенно)
    const saved = localStorage.getItem('birday_stage1_custom_level');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && (data.worldWidth || data.nests || data.feeders || data.enemies)) {
          this.applyLevelData(data);
          return;
        }
      } catch (e) {}
    }

    // 2. Проверяем API /api/load-level или статический файл data/stage1_level.json
    try {
      let resp = await fetch('/api/load-level').catch(() => null);
      if (!resp || !resp.ok) {
        resp = await fetch('data/stage1_level.json').catch(() => null);
      }
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && (data.worldWidth || data.nests || data.feeders || data.scenery)) {
          this.applyLevelData(data);
        }
      }
    } catch (e) {}
  }

  applyLevelData(data) {
    if (data.worldWidth) this.worldWidth = data.worldWidth;
    if (data.worldHeight) this.worldHeight = data.worldHeight;
    if (data.groundY) {
      this.groundY = data.groundY;
      if (this.eggManager) this.eggManager.groundY = this.groundY;
    }

    const startData = data.startPoint || data.checkpoint;
    if (startData) {
      if (startData.name && startData.name.toLowerCase().includes('кормушк')) {
        this.missionStartPoint = { x: 120, y: 260, name: 'Старт' };
      } else {
        this.missionStartPoint = { x: startData.x, y: startData.y, name: 'Старт' };
      }
    }

    if (data.finishZone) {
      this.finishZone = { ...data.finishZone };
    }

    if (data.scenery !== undefined) this.scenery = JSON.parse(JSON.stringify(data.scenery));
    if (data.animals !== undefined) this.animals = JSON.parse(JSON.stringify(data.animals));
    if (data.enemies !== undefined) {
      this.enemies = JSON.parse(JSON.stringify(data.enemies));
      this.enemies.forEach(en => {
        en.alive = true;
        if (en.baseX === undefined) en.baseX = en.x;
        if (en.baseY === undefined) en.baseY = en.y;
        if (en.startX === undefined) en.startX = en.x;
      });
    }
    if (data.feeders !== undefined) this.feeders = JSON.parse(JSON.stringify(data.feeders));
    if (data.nests !== undefined) {
      this.nests = JSON.parse(JSON.stringify(data.nests));
      this.totalNests = this.nests.length;
    }

    if (this.bird && this.missionStartPoint) {
      this.bird.x = this.missionStartPoint.x;
      this.bird.y = this.missionStartPoint.y;
      this.bird.maxX = this.worldWidth - 120;
      this.bird.groundY = this.groundY;
    }

    this.saveInitialEntitiesSnapshot();
  }

  /* ==========================================================================
     Сохранение и полное восстановление исходного состояния уровня (Full Reset)
     ========================================================================== */
  saveInitialEntitiesSnapshot() {
    this.initialNests = JSON.parse(JSON.stringify(this.nests || []));
    this.initialFeeders = JSON.parse(JSON.stringify(this.feeders || []));
    this.initialEnemies = JSON.parse(JSON.stringify(this.enemies || []));
    this.initialAnimals = JSON.parse(JSON.stringify(this.animals || []));
    this.initialScenery = JSON.parse(JSON.stringify(this.scenery || []));
    this.initialStartPoint = { ...(this.missionStartPoint || { x: 120, y: 260, name: 'Старт' }) };
  }

  restoreInitialEntitiesSnapshot() {
    if (!this.initialEnemies) {
      this.saveInitialEntitiesSnapshot();
    }

    if (Array.isArray(this.initialNests)) {
      this.nests = JSON.parse(JSON.stringify(this.initialNests));
      this.nests.forEach(n => {
        n.filled = false;
        n.eggType = null;
      });
      this.totalNests = this.nests.length;
    }

    if (Array.isArray(this.initialFeeders)) {
      this.feeders = JSON.parse(JSON.stringify(this.initialFeeders));
      this.feeders.forEach(f => { f.visited = false; });
    }

    if (Array.isArray(this.initialEnemies)) {
      this.enemies = JSON.parse(JSON.stringify(this.initialEnemies));
      this.enemies.forEach(en => { en.alive = true; });
    }

    if (Array.isArray(this.initialAnimals)) {
      this.animals = JSON.parse(JSON.stringify(this.initialAnimals));
      this.animals.forEach(a => { a.reacted = false; });
    }

    if (Array.isArray(this.initialScenery)) {
      this.scenery = JSON.parse(JSON.stringify(this.initialScenery));
    }

    this.projectiles.length = 0;
    this.particles.length = 0;
  }

  buildScenery() {
    this.scenery = [];
  }

  buildAnimals() {
    this.animals = [];
  }

  buildEnemies() {
    this.enemies = [
      { type: 'beehive', key: 'enemy_beehive', x: 1560, y: 240, scale: 0.38, hp: 1, alive: true },
      { type: 'bee', key: 'enemy_bee', x: 1680, y: 280, scale: 0.34, baseX: 1680, baseY: 280, ampY: 45, speed: 2.2, hp: 1, alive: true },
      { type: 'bee', key: 'enemy_bee', x: 1880, y: 230, scale: 0.34, baseX: 1880, baseY: 230, ampY: 60, speed: 2.6, hp: 1, alive: true },
      { type: 'crow', key: 'enemy_crow', x: 2880, y: 240, scale: 0.36, vx: -60, startX: 2880, baseY: 240, hp: 1, alive: true, diveTimer: 0 },
      { type: 'trap_squirrel', key: 'enemy_squirrel_1', x: 3420, y: 320, scale: 0.38, throwCooldown: 2.8, timer: 1.0, hp: 1, alive: true },
      { type: 'beehive', key: 'enemy_beehive', x: 4260, y: 220, scale: 0.38, hp: 1, alive: true },
      { type: 'bee', key: 'enemy_bee', x: 4360, y: 250, scale: 0.34, baseX: 4360, baseY: 250, ampY: 55, speed: 3.0, hp: 1, alive: true },
      { type: 'bee', key: 'enemy_bee', x: 4520, y: 290, scale: 0.34, baseX: 4520, baseY: 290, ampY: 70, speed: 2.8, hp: 1, alive: true },
      { type: 'crow', key: 'enemy_crow', x: 5180, y: 220, scale: 0.36, vx: -75, startX: 5180, baseY: 220, hp: 1, alive: true, diveTimer: 0 },
      { type: 'trap_squirrel', key: 'enemy_squirrel_2', x: 5860, y: 310, scale: 0.38, throwCooldown: 2.5, timer: 0.5, hp: 1, alive: true },
      { type: 'trap_squirrel', key: 'enemy_squirrel_3', x: 6220, y: 330, scale: 0.38, throwCooldown: 2.4, timer: 1.8, hp: 1, alive: true }
    ];
  }

  buildFeeders() {
    this.feeders = [
      { id: 1, key: 'zone_feeder', name: 'Берёзовая кормушка', x: 800, y: 320, radius: 52, isZoneOnly: true, visited: false },
      { id: 2, key: 'zone_feeder', name: 'Лесной домик зерна', x: 2350, y: 310, radius: 52, isZoneOnly: true, visited: false },
      { id: 3, key: 'zone_feeder', name: 'Кормушка на дубовой ветви', x: 3950, y: 290, radius: 52, isZoneOnly: true, visited: false },
      { id: 4, key: 'zone_feeder', name: 'Подвесная кормушка на канате', x: 5550, y: 300, radius: 52, isZoneOnly: true, visited: false }
    ];
  }

  buildNests() {
    this.nests = [
      { id: 1, key: 'zone_nest', title: 'Дупло синицы', x: 1350, y: 350, cupX: 1350, cupY: 345, radius: 46, isZoneOnly: true, filled: false },
      { id: 2, key: 'zone_nest', title: 'Мшистое гнездо дрозда', x: 2900, y: 420, cupX: 2900, cupY: 415, radius: 48, isZoneOnly: true, filled: false },
      { id: 3, key: 'zone_nest', title: 'Гнездо сойки на ветке', x: 4450, y: 290, cupX: 4450, cupY: 285, radius: 46, isZoneOnly: true, filled: false },
      { id: 4, key: 'zone_nest', title: 'Высокое гнездо иволги', x: 6050, y: 210, cupX: 6050, cupY: 205, radius: 48, isZoneOnly: true, filled: false },
      { id: 5, key: 'zone_nest', title: 'Уютное берёзовое гнездо', x: 6720, y: 330, cupX: 6720, cupY: 325, radius: 48, isZoneOnly: true, filled: false }
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
  resetInput() {
    this.input.up = false;
    this.input.down = false;
    this.input.left = false;
    this.input.right = false;
    this.input.shift = false;
    this.input.space = false;
  }

  triggerScreenShake(intensity = 7, duration = 0.28) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  bindControls() {
    window.addEventListener('blur', () => {
      if (this.isActive) this.resetInput();
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      // Если окно поражения активно — Space или Enter запускает перезапуск с начала
      if (this.isGameOver) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.restartLevelFromBeginning();
        }
        return;
      }

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

      // ПРОБЕЛ: Активирует замедление времени и режим прицеливания яйцом (-10% энергии)
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.bird) {
          if (this.bird.isStunned) {
            this.attemptFlap();
          } else if (!e.repeat) {
            this.attemptStartAiming();
          }
        }
      }

      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.input.down = true;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.input.left = false;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.input.right = true;
      }

      // F: Быстрый бросок без Slo-Mo (-10% энергии)
      if (e.code === 'KeyF' && !e.repeat) {
        this.quickThrowEgg();
      }

      // 1-6: Быстрый выбор типа яйца
      const eggTypes = ['Default', 'Blue', 'Pink', 'Purple', 'Red', 'Gold'];
      if (e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key, 10) - 1;
        this.eggManager.selectType(eggTypes[idx]);
      }

      // Q / E: Переключение типов яиц
      if (e.code === 'KeyQ') {
        this.cycleEggType(-1);
      }
      if (e.code === 'KeyE') {
        this.cycleEggType(1);
      }

      // Escape: Пауза / Настройки
      if (e.code === 'Escape') {
        e.preventDefault();
        if (window.game && window.game.uiManager && window.game.uiManager.settingsModal) {
          window.game.uiManager.settingsModal.toggle();
        }
        return;
      }

      // Дебаг-клавиши (активны только в админ-панели ?admin)
      const isAdmin = window.game?.isAdmin || localStorage.getItem('birday_admin_mode') === '1';
      if (isAdmin) {
        if (e.code === 'KeyR') {
          this.restartLevelFromBeginning();
        }
        if (e.code === 'KeyK') {
          this.stamina = 0;
          if (this.bird) {
            this.bird.y = this.groundY;
            this.bird.triggerStun();
          }
          this.triggerDefeatModal();
        }
        if (e.code === 'KeyV') {
          this.triggerVictory();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;

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
      if (!this.isActive || this.isTutorialOpen || this.isGameOver || this.isPaused) return;

      if (e.button === 2) {
        e.preventDefault();
        this.input.shift = true;
        this.input.up = false;
      } else if (e.button === 0) {
        if (this.eggManager.isAiming && this.bird) {
          this.eggManager.releaseAndThrow(this.bird.vx, this.bird.vy);
        } else {
          this.attemptFlap();
        }
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isActive) return;
      if (e.button === 2) {
        this.input.shift = false;
      }
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.isActive) e.preventDefault();
    });

    // Обработка глобальных событий паузы
    events.on('pause:opened', () => {
      if (this.isActive) {
        this.isPaused = true;
        this.resetInput();
        audio.stopGlide();
      }
    });

    events.on('pause:closed', () => {
      if (this.isActive) {
        this.isPaused = false;
      }
    });
  }

  attemptFlap() {
    if (!this.bird || this.isGameOver || this.isVictory) return;
    if (this.bird.isStunned) {
      if (this.stamina <= 0) return;
      if (this.bird.stunTimer > 0.25) {
        this.bird.recoverFromStun();
      }
      return;
    }

    if (this.input.shift) return;

    if (this.stamina < 5) {
      this.showToast('Нет энергии для взмаха! (нужно 5% энергии)');
      return;
    }

    this.stamina = Math.max(0, this.stamina - 5);
    this.bird.flap();
    this.updateHUD();
  }

  attemptStartAiming() {
    if (!this.bird || this.bird.isStunned || this.eggManager.isAiming || this.isVictory) return;
    if (this.stamina < 10) {
      this.showToast('Недостаточно энергии для броска яйца! (нужно 10% энергии)');
      return;
    }
    const worldMouseX = this.mouseX + this.cameraX;
    const worldMouseY = this.mouseY;
    this.eggManager.startAiming(
      this.bird.x,
      this.bird.y,
      worldMouseX,
      worldMouseY,
      this.bird.vx,
      this.bird.vy
    );
  }

  quickThrowEgg() {
    if (!this.bird || this.bird.isStunned || this.eggManager.isAiming || this.isVictory) return;
    if (this.stamina < 10) {
      this.showToast('Недостаточно энергии для броска яйца! (нужно 10% энергии)');
      return;
    }
    const worldMouseX = this.mouseX + this.cameraX;
    const worldMouseY = this.mouseY;
    this.eggManager.aimStartX = this.bird.x;
    this.eggManager.aimStartY = this.bird.y + 10;
    this.eggManager.targetX = worldMouseX;
    this.eggManager.targetY = worldMouseY;
    this.eggManager.isAiming = true;
    this.eggManager.releaseAndThrow(this.bird.vx, this.bird.vy);
  }

  cycleEggType(dir) {
    const types = ['Default', 'Blue', 'Pink', 'Purple', 'Red', 'Gold'];
    let idx = types.indexOf(this.eggManager.currentEggType);
    if (idx === -1) idx = 0;
    idx = (idx + dir + types.length) % types.length;
    this.eggManager.selectType(types[idx]);
  }

  /* ==========================================================================
     Запуск и Остановка Этапа
     ========================================================================== */
  start() {
    this.isActive = true;
    this.isVictory = false;
    this.isGameOver = false;
    this.isTutorialOpen = true;
    this.stamina = 100;
    this.maxStamina = 100;
    this.score = 0;
    this.levelTime = 0;
    this.nestsCompleted = 0;
    this.shakeTimer = 0;
    this.resetInput();

    audio.playMusic('LEVEL1');

    this.stats = {
      eggsLaid: 0,
      feedersEaten: 0,
      fallsCount: 0,
      levelTime: 0
    };

    if (this.eggManager) {
      this.eggManager.eggsThrown = 0;
      this.eggManager.eggs = [];
      this.eggManager.cancelAiming();
    }

    if (this.canvas) {
      this.canvas.style.display = 'block';
    }

    this.cameraX = 0;
    this.targetCameraX = 0;

    if (this.bird) {
      this.bird.reset();
      this.bird.crashCount = 0;
      this.bird.x = this.missionStartPoint.x;
      this.bird.y = this.missionStartPoint.y;
      this.bird.vx = this.bird.baseForwardSpeed || 190;
      this.bird.vy = 0;
    }

    this.restoreInitialEntitiesSnapshot();

    const topBar = document.getElementById('top-bar');
    if (topBar) topBar.style.display = 'none';

    const toastCont = document.getElementById('toast-container');
    if (toastCont) toastCont.innerHTML = '';

    this.createUIOverlay();
    this.updateHUD(true);
    this.showTutorialModal();
    gameState.setStage('STAGE_1_LEVEL');
    console.log('🌲 [Stage1Level] Уровень 1 "Лесной Полёт" запущен!');
  }

  stop() {
    this.isActive = false;
    this.resetInput();
    audio.stopGlide();
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    const topBar = document.getElementById('top-bar');
    if (topBar) topBar.style.display = '';
    this.hideDefeatModal();
    this.removeUIOverlay();
  }

  /* ==========================================================================
     HTML UI Оверлей (HUD уровня)
     ========================================================================== */
  createUIOverlay() {
    this.removeUIOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'stage1-level-hud';
    overlay.className = 'stage1-level-hud';

    overlay.innerHTML = `
      <div class="hud-minimal-topbar">
        <div class="hud-energy-widget">
          <div class="hud-energy-slot">
            <div class="hud-energy-bar" id="hud-energy-bar" style="width: 100%;"></div>
          </div>
          <img src="assets/First-Level/UI/Energy UI.png" class="hud-energy-frame" alt="Энергия" />
          <span class="hud-energy-value" id="hud-energy-val">100%</span>
        </div>

        <div class="hud-top-right-group">
          <div class="hud-egg-counter-widget" title="Отложено яиц в чужие гнезда">
            <img src="assets/First-Level/Item/Egg/Default-Egg.png" class="hud-egg-img" alt="Яйцо" />
            <span class="hud-egg-cross">X</span>
            <span class="hud-egg-num" id="hud-egg-num">0</span>
          </div>
        </div>
      </div>

      <div id="level-tutorial-modal" class="level-tutorial-modal">
        <div class="tutorial-modal-card">
          <img src="assets/First-Level/UI/TUTORIAL.png" alt="Обучение полету" class="tutorial-board-img" />
          <button id="btn-tutorial-ready" class="fl-wooden-btn" type="button" title="Нажмите, чтобы начать полёт!">
            <span>ГОТОВО</span>
          </button>
        </div>
      </div>

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
            <button id="btn-vic-replay" class="btn-leaf-green"><span class="btn-leaf-green-text">ПОВТОРИТЬ</span></button>
            <button id="btn-vic-menu" class="btn-leaf-green"><span class="btn-leaf-green-text">В МЕНЮ</span></button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('game-container').appendChild(overlay);
    this.uiOverlay = overlay;

    // Кешируем ссылки на элементы HUD, чтобы не искать их в DOM каждый кадр
    this.hudNodes = {
      bar: overlay.querySelector('#hud-energy-bar'),
      val: overlay.querySelector('#hud-energy-val'),
      eggNum: overlay.querySelector('#hud-egg-num')
    };
    this.lastHudState = { energy: -1, eggs: -1 };

    const btnTutorialReady = overlay.querySelector('#btn-tutorial-ready');
    if (btnTutorialReady) {
      btnTutorialReady.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTutorialModal();
      });
    }

    const btnVicReplay = overlay.querySelector('#btn-vic-replay');
    if (btnVicReplay) {
      btnVicReplay.addEventListener('click', () => {
        audio.playClick();
        this.start();
      });
    }

    const btnVicMenu = overlay.querySelector('#btn-vic-menu');
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
  }

  removeUIOverlay() {
    if (this.uiOverlay) {
      this.uiOverlay.remove();
      this.uiOverlay = null;
    }
    this.hudNodes = null;
  }

  updateHUD(force = false) {
    if (!this.uiOverlay || !this.hudNodes) return;

    const energyPct = Math.round(Math.max(0, Math.min(100, this.stamina)));

    if (force || this.lastHudState.energy !== energyPct) {
      this.lastHudState.energy = energyPct;
      if (this.hudNodes.bar) {
        this.hudNodes.bar.style.width = `${energyPct}%`;
        this.hudNodes.bar.style.background = energyPct <= 20 ? '#ef4444' : '#4ad3b7';
      }
      if (this.hudNodes.val) {
        this.hudNodes.val.textContent = `${energyPct}%`;
      }
    }

    if (force || this.lastHudState.eggs !== this.nestsCompleted) {
      this.lastHudState.eggs = this.nestsCompleted;
      if (this.hudNodes.eggNum) {
        this.hudNodes.eggNum.textContent = String(this.nestsCompleted);
      }
    }
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
     Логика игры (Update)
     ========================================================================== */
  update(dt) {
    if (!this.isActive || !this.isLoaded) return;
    if (this.isTutorialOpen || this.isGameOver || this.isPaused) return;

    if (this.isVictory) {
      this.updateParticles(dt);
      return;
    }

    // Эффективный dt с замедлением времени (Slo-Mo при прицеливании яйцом)
    const effectiveDt = dt * this.eggManager.timeScale;
    this.levelTime += effectiveDt;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    // 1. Обновление птицы
    if (this.bird) {
      this.bird.isExhausted = (this.stamina <= 0);
      this.bird.update(effectiveDt, this.input);

      // Плавное следование камеры за птицей ТОЛЬКО ВПЕРЁД
      const desiredCameraX = this.bird.x - this.viewWidth * 0.35;
      this.targetCameraX = Math.max(this.cameraX, Math.min(this.worldWidth - this.viewWidth, desiredCameraX));
      this.cameraX += (this.targetCameraX - this.cameraX) * (1 - Math.exp(-6 * dt));

      // Птица не может улететь назад за левый край экрана
      this.bird.minX = Math.max(60, this.cameraX + 40);

      // Если энергия исчерпана и птица лежит на земле — окно поражения
      if (this.stamina <= 0 && this.bird.isStunned && !this.isGameOver) {
        this.triggerDefeatModal();
      }
    }

    // 2. Обновление летящих яиц и прицеливания
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

    // 3. Обновление врагов и снарядов (замедляются при прицеливании)
    this.updateEnemies(effectiveDt);
    this.updateProjectiles(effectiveDt);

    // 4. Проверка столкновений птицы с препятствиями, кормушками, финишем
    this.checkBirdCollisions();

    // 5. Проверка мирных животных
    this.checkAnimalReactions();

    // 6. Обновление атмосферных листьев и частиц
    this.updateParticles(effectiveDt);

    // 7. Обновление HUD
    this.updateHUD();
  }

  updateEnemies(dt) {
    if (!this.bird) return;

    this.enemies.forEach((enemy) => {
      if (!enemy.alive) return;

      if (enemy.type === 'bee') {
        enemy.baseX += Math.sin(this.levelTime * enemy.speed) * 30 * dt;
        enemy.y = enemy.baseY + Math.sin(this.levelTime * enemy.speed * 2.5) * enemy.ampY;
        enemy.x = enemy.baseX;

        const dist = Math.hypot(enemy.x - this.bird.x, enemy.y - this.bird.y);
        if (dist < 260 && Math.random() < 2.0 * dt) {
          audio.playBeeBuzz();
        }
      } else if (enemy.type === 'crow') {
        const distToBird = enemy.x - this.bird.x;
        if (distToBird > 0 && distToBird < 450) {
          enemy.x += enemy.vx * 1.8 * dt;
          enemy.y = enemy.baseY + Math.sin(this.levelTime * 4) * 50 + 40;
          if (Math.random() < 1.5 * dt) {
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
    if (!this.bird) return;
    audio.playAcornThrow();

    const dx = this.bird.x - fromX;
    const dy = this.bird.y - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 260;

    this.projectiles.push({
      x: fromX,
      y: fromY,
      vx: (dx / dist) * speed,
      vy: -120,
      gravity: 420,
      radius: 12,
      rotation: 0,
      life: 3.5
    });

    this.showToast('Осторожно! Белка бросила шишку!');
  }

  updateProjectiles(dt) {
    if (!this.bird) return;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += 8 * dt;
      p.life -= dt;

      const dist = Math.hypot(p.x - this.bird.x, p.y - this.bird.y);
      if (dist < 26 && this.invulnerableTimer <= 0) {
        this.takeDamage(15, 'Попадание шишкой от белки!');
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.y >= this.groundY || p.life <= 0) {
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

    // 1. Проверка колючек (Hazards)
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

    // 3. Проверка кормушек (пополнение энергии и очки)
    this.feeders.forEach(feeder => {
      const radius = feeder.radius || 52;
      const dist = Math.hypot(this.bird.x - feeder.x, this.bird.y - feeder.y);
      if (dist < radius && !feeder.visited) {
        feeder.visited = true;
        this.stats.feedersEaten++;
        audio.playEatFeeder();

        this.stamina = Math.min(this.maxStamina, this.stamina + 25);
        this.score += 250;

        this.spawnCelebrationParticles(feeder.x, feeder.y, '#4ad3b7');
        this.spawnCelebrationParticles(this.bird.x, this.bird.y, '#4ad3b7');

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
          nest.filled = true;
          nest.eggType = egg.typeKey || 'Default';
          this.nestsCompleted++;
          this.stats.eggsLaid = this.nestsCompleted;
          egg.shatter();

          const bonus = egg.typeKey === 'Gold' ? 1000 : 500;
          this.score += bonus;

          audio.playNestHit();
          this.spawnCelebrationParticles(cupX, cupY, '#facc15');
          this.updateHUD();
          break;
        }
      }

      // Если яйцо уже попало в гнездо — не проверяем врагов
      if (egg.isBroken) continue;

      // 2. Проверка попадания во Врагов
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = Math.hypot(egg.x - enemy.x, egg.y - enemy.y);
        if (dist < 40) {
          enemy.alive = false;
          egg.shatter();
          audio.playEnemyHit();

          if (enemy.type === 'bee') {
            this.score += 150;
            this.showToast('Пчела рассеяна! (+150)');
            this.spawnCelebrationParticles(enemy.x, enemy.y, '#fef08a');
          } else if (enemy.type === 'crow') {
            this.score += 300;
            this.showToast('Ворона отступила в испуге! (+300)');
            this.spawnCelebrationParticles(enemy.x, enemy.y, '#38bdf8');
          } else if (enemy.type === 'beehive') {
            this.score += 400;
            this.stamina = Math.min(this.maxStamina, this.stamina + 20);
            this.spawnCelebrationParticles(enemy.x, enemy.y, '#f59e0b');
          } else if (enemy.type === 'trap_squirrel') {
            this.score += 250;
            this.showToast('Белка-разбойник выронила запасы! (+250)');
            this.spawnCelebrationParticles(enemy.x, enemy.y, '#f97316');
          }
          this.updateHUD();
          break;
        }
      }
    }
  }

  checkAnimalReactions() {
    if (!this.bird) return;
    this.animals.forEach(animal => {
      const dist = Math.hypot(this.bird.x - animal.x, this.bird.y - animal.y);
      if (dist < 180 && !animal.reacted) {
        animal.reacted = true;
        this.showToast(`${animal.greeting}`);
      }
    });
  }

  takeDamage(amount = 15) {
    if (this.invulnerableTimer > 0 || this.isGameOver || this.isVictory) return;

    this.stamina = Math.max(0, this.stamina - amount);
    this.invulnerableTimer = 1.4;
    this.triggerScreenShake(8, 0.26);
    audio.playHurt();

    if (this.bird && !this.bird.isStunned) {
      this.bird.vy = -180;
      this.bird.spawnFlapParticles();
    }

    this.updateHUD();

    if (this.stamina <= 0 && this.bird && this.bird.isStunned && !this.isGameOver) {
      this.triggerDefeatModal();
    }
  }

  /* ==========================================================================
     Окно поражения при падении на землю без энергии
     ========================================================================== */
  triggerDefeatModal() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    audio.playBonk();

    if (this.bird) {
      this.bird.vx = 0;
      this.bird.vy = 0;
      this.bird.isExhausted = true;
    }

    setTimeout(() => {
      if (!this.isActive) return;
      this.showDefeatModal();
    }, 450);
  }

  showDefeatModal() {
    this.hideDefeatModal();

    const modal = document.createElement('div');
    modal.id = 'stage1-defeat-modal';
    modal.className = 'stage1-defeat-modal-overlay';
    modal.innerHTML = `
      <div class="stage1-defeat-window">
        <div class="stage1-defeat-title-header">
          <span class="stage1-defeat-title-text">СИЛЫ НА ИСХОДЕ</span>
        </div>
        <div class="stage1-defeat-content">
          <div class="stage1-defeat-canvas-wrap">
            <canvas id="stage1-defeat-canvas" class="stage1-defeat-canvas" width="220" height="110"></canvas>
          </div>
          <div class="stage1-defeat-message">
            <p class="stage1-defeat-main-text">Кукушка потратила всю энергию и упала на землю без сил.</p>
            <p class="stage1-defeat-prompt-text">Давай начнём всё сначала?</p>
          </div>
          <div class="stage1-defeat-actions">
            <button class="stage1-defeat-btn-restart" id="btn-stage1-restart" title="Начать первый этап с самого начала">
              <span>НАЧАТЬ С НАЧАЛА</span>
              <img src="assets/UI/UI-Repeat-Icon.png" alt="Повтор" class="stage1-defeat-repeat-icon" />
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.initDefeatCanvas();

    const btnRestart = modal.querySelector('#btn-stage1-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        audio.playClick();
        this.hideDefeatModal();
        this.restartLevelFromBeginning();
      });
    }
  }

  hideDefeatModal() {
    if (this.defeatAnimFrame) {
      cancelAnimationFrame(this.defeatAnimFrame);
      this.defeatAnimFrame = null;
    }
    const modal = document.getElementById('stage1-defeat-modal');
    if (modal) {
      modal.remove();
    }
  }

  initDefeatCanvas() {
    const canvas = document.getElementById('stage1-defeat-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let starAngle = 0;
    const stunImg = this.stunSprite || new Image();
    if (!stunImg.src) {
      stunImg.src = 'assets/Character/BIRD-STUN/STUN.png';
    }

    const render = () => {
      if (!this.isGameOver || !document.getElementById('stage1-defeat-modal')) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      starAngle += 0.055;

      ctx.save();
      ctx.fillStyle = 'rgba(40, 20, 5, 0.22)';
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height - 18, 54, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const wobble = Math.sin(starAngle * 1.5) * 0.035;
      const breathe = Math.sin(starAngle * 2.2) * 1.8;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2 + 10);
      ctx.rotate(wobble);

      const scale = 0.165;
      const drawW = 1280 * scale;
      const drawH = 720 * scale;
      if (stunImg.complete && stunImg.naturalWidth > 0) {
        ctx.drawImage(stunImg, -drawW * 0.5, -drawH * 0.5 + breathe * 0.3, drawW, drawH);
      }
      ctx.restore();

      const starCount = 3;
      const centerX = canvas.width / 2 + 6;
      const centerY = canvas.height / 2 - 20 + breathe * 0.3;
      const radiusX = 26;
      const radiusY = 9;

      ctx.save();
      for (let i = 0; i < starCount; i++) {
        const a = starAngle + (i * (Math.PI * 2 / starCount));
        const sx = centerX + Math.cos(a) * radiusX;
        const sy = centerY + Math.sin(a) * radiusY;
        const starScale = 1 + 0.25 * Math.sin(a * 2);

        this.drawDefeatPixelStar(ctx, sx, sy, 5.5 * starScale);
      }
      ctx.restore();

      this.defeatAnimFrame = requestAnimationFrame(render);
    };

    render();
  }

  drawDefeatPixelStar(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#291400';
    ctx.lineWidth = 1.8;

    const inner = size * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + inner, cy - inner);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx + inner, cy + inner);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - inner, cy + inner);
    ctx.lineTo(cx - size, cy);
    ctx.lineTo(cx - inner, cy - inner);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    ctx.restore();
  }

  restartLevelFromBeginning() {
    this.hideDefeatModal();

    const vicModal = document.getElementById('level-victory-modal');
    if (vicModal) vicModal.classList.add('hidden');
    const tutModal = document.getElementById('level-tutorial-modal');
    if (tutModal) tutModal.classList.add('hidden');

    const startPt = this.initialStartPoint || this.missionStartPoint || { x: 120, y: 260, name: 'Старт' };
    this.missionStartPoint = { ...startPt };
    this.cameraX = 0;
    this.targetCameraX = 0;

    this.isGameOver = false;
    this.isVictory = false;
    this.isTutorialOpen = false;
    this.stamina = 100;
    this.maxStamina = 100;
    this.score = 0;
    this.levelTime = 0;
    this.nestsCompleted = 0;
    this.invulnerableTimer = 2.0;
    this.shakeTimer = 0;

    this.stats = {
      eggsLaid: 0,
      feedersEaten: 0,
      fallsCount: 0,
      levelTime: 0
    };

    if (this.eggManager) {
      this.eggManager.eggsThrown = 0;
      this.eggManager.eggs = [];
      this.eggManager.cancelAiming();
      if (typeof this.eggManager.selectType === 'function') {
        this.eggManager.selectType('Default');
      }
    }

    if (this.bird) {
      this.bird.reset();
      this.bird.crashCount = 0;
      this.bird.x = this.missionStartPoint.x;
      this.bird.y = this.missionStartPoint.y;
      this.bird.vx = this.bird.baseForwardSpeed || 190;
      this.bird.vy = 0;
      this.bird.minX = Math.max(60, this.cameraX + 40);
    }

    this.restoreInitialEntitiesSnapshot();
    this.resetInput();

    audio.stopGlide();
    audio.playMusic('LEVEL1');
    this.updateHUD(true);
  }

  triggerVictory() {
    if (this.isVictory) return;
    this.isVictory = true;
    this.resetInput();
    if (this.eggManager) this.eggManager.cancelAiming();
    audio.stopGlide();

    this.stats.levelTime = this.levelTime;
    this.stats.eggsLaid = this.nestsCompleted;
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

    if (this.bird) {
      for (let i = 0; i < 40; i++) {
        this.spawnCelebrationParticles(this.bird.x + (Math.random() * 400 - 200), 200 + Math.random() * 200);
      }
    }

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
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 0.8);
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

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
  render() {
    if (!this.ctx || !this.isLoaded) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

    // Смещение камеры при тряске экрана (Screen Shake)
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      const mag = this.shakeIntensity * (this.shakeTimer / 0.28);
      shakeX = (Math.random() - 0.5) * 2 * mag;
      shakeY = (Math.random() - 0.5) * 2 * mag;
    }

    ctx.save();
    if (shakeX !== 0 || shakeY !== 0) {
      ctx.translate(shakeX, shakeY);
    }

    // 1. Параллакс фон и основная панорама Forest.png
    this.renderParallaxBackground(ctx);

    ctx.save();
    ctx.translate(-Math.round(this.cameraX), 0);

    // 2. Декорации слоя 3 (если есть)
    this.renderScenery(ctx, 3);

    // 3. Целевые гнезда (и отложенные в них яйца)
    this.renderNests(ctx);

    // 4. Кормушки
    this.renderFeeders(ctx);

    // 5. Мирные лесные животные
    this.renderAnimals(ctx);

    // 6. Враги
    this.renderEnemies(ctx);

    // 7. Снаряды врагов (шишки)
    this.renderProjectiles(ctx);

    // 8. Яйца игрока и прицел Slo-Mo
    this.eggManager.render(ctx);

    // 9. Игрок (Кукушка)
    if (this.bird) {
      if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }
      this.bird.render(ctx);
      ctx.globalAlpha = 1.0;
    }

    // 10. Земля (фолбэк, если нет Forest.png)
    this.renderGround(ctx);

    // 11. Частицы эффектов
    this.renderParticles(ctx);

    ctx.restore();

    // 12. Передний план (Лианы слоя 4 с ускоренным параллаксом 1.22x)
    ctx.save();
    ctx.translate(-Math.round(this.cameraX * 1.22), 0);
    this.renderScenery(ctx, 4);
    ctx.restore();

    // 13. Атмосферные листья переднего плана
    this.renderAmbientLeaves(ctx);

    ctx.restore();
  }

  renderParallaxBackground(ctx) {
    const bgFar1 = this.images['bg_far_1'];
    const bgFar2 = this.images['bg_far_2'];
    if (bgFar1 && bgFar2) {
      const tileW = bgFar1.width || 1920;
      const scrollX = (this.cameraX * 0.12) % tileW;
      ctx.drawImage(bgFar1, -scrollX, 0, tileW, this.viewHeight);
      ctx.drawImage(bgFar2, tileW - scrollX, 0, tileW, this.viewHeight);
    }

    const bgMid = this.images['bg_mid'];
    if (bgMid) {
      const tileW = bgMid.width || 1920;
      const scrollX = (this.cameraX * 0.35) % tileW;
      ctx.drawImage(bgMid, -scrollX, 0, tileW, this.viewHeight);
      ctx.drawImage(bgMid, tileW - scrollX, 0, tileW, this.viewHeight);
    }

    // Основная панорама уровня: Forest.png (14999 x 656)
    const forestImg = this.images['forest_map'] || this.images['level_forest_map'];
    if (forestImg && (forestImg.naturalWidth || forestImg.width)) {
      const imgW = forestImg.naturalWidth || forestImg.width || 14999;
      const imgH = forestImg.naturalHeight || forestImg.height || 656;
      const sx = Math.max(0, Math.min(imgW - this.viewWidth, this.cameraX));
      const sw = Math.min(this.viewWidth, imgW - sx);
      ctx.drawImage(forestImg, sx, 0, sw, imgH, 0, 0, sw, this.viewHeight);
    } else {
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
      return;
    }

    const gy = this.groundY;
    const grad = ctx.createLinearGradient(0, gy, 0, this.worldHeight);
    grad.addColorStop(0, '#2d1b0d');
    grad.addColorStop(0.12, '#1e1309');
    grad.addColorStop(1, '#0f0a04');

    ctx.fillStyle = grad;
    ctx.fillRect(this.cameraX - 50, gy, this.viewWidth + 100, this.worldHeight - gy);

    ctx.fillStyle = '#15803d';
    ctx.fillRect(this.cameraX - 50, gy - 2, this.viewWidth + 100, 6);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(this.cameraX - 50, gy - 2, this.viewWidth + 100, 2);
  }

  renderScenery(ctx, layer) {
    const parallaxFactor = layer === 4 ? 1.22 : 1.0;
    const camLeft = this.cameraX * parallaxFactor - 300;
    const camRight = this.cameraX * parallaxFactor + this.viewWidth + 300;

    this.scenery.forEach(item => {
      if (item.layer !== layer) return;
      if (item.x < camLeft || item.x > camRight) return;

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

      if (!feeder.isZoneOnly && feeder.key && feeder.key !== 'zone_feeder') {
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
    });
  }

  renderNests(ctx) {
    this.nests.forEach(nest => {
      const cupX = nest.cupX !== undefined ? nest.cupX : nest.x;
      const cupY = nest.cupY !== undefined ? nest.cupY : nest.y;

      if (cupX < this.cameraX - 250 || cupX > this.cameraX + this.viewWidth + 250) return;

      // Если гнездо не просто зона на панораме Forest.png, а имеет свой спрайт
      if (!nest.isZoneOnly && nest.key && nest.key !== 'zone_nest') {
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

      // Отрисовка подкинутого яйца прямо в гнезде поверх панорамы
      if (nest.filled) {
        const eggSprite = this.eggManager?.sprites?.[nest.eggType || 'Default'];
        ctx.save();
        ctx.translate(cupX, cupY - 3);
        ctx.rotate(0.14);
        if (eggSprite && eggSprite.complete && eggSprite.naturalWidth > 0) {
          ctx.drawImage(eggSprite, -9, -12, 18, 24);
        } else {
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#854d0e';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.restore();
      }
    });
  }

  renderParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
}