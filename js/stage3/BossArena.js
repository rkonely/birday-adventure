import { CARDS_DATABASE, getRandomStarterDeck, getFullArtPath } from './cardsData.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';
import { attach3DHoloTilt } from './CardMarket.js';

export const ARENA_TILES_COORDS = {
  '1x1': { col: 1, row: 1, x: 358, y: 261, w: 132, h: 111 },
  '1x2': { col: 1, row: 2, x: 346, y: 370, w: 134, h: 112 },
  '1x3': { col: 1, row: 3, x: 332, y: 485, w: 141, h: 117 },

  '2x1': { col: 2, row: 1, x: 492, y: 263, w: 127, h: 106 },
  '2x2': { col: 2, row: 2, x: 484, y: 371, w: 132, h: 110 },
  '2x3': { col: 2, row: 3, x: 474, y: 484, w: 139, h: 115 },

  '3x1': { col: 3, row: 1, x: 626, y: 263, w: 125, h: 106 },
  '3x2': { col: 3, row: 2, x: 624, y: 371, w: 131, h: 110 },
  '3x3': { col: 3, row: 3, x: 621, y: 484, w: 136, h: 119 },

  '4x1': { col: 4, row: 1, x: 758, y: 263, w: 129, h: 107 },
  '4x2': { col: 4, row: 2, x: 761, y: 371, w: 132, h: 110 },
  '4x3': { col: 4, row: 3, x: 764, y: 485, w: 137, h: 117 },

  '5x1': { col: 5, row: 1, x: 886, y: 263, w: 133, h: 106 },
  '5x2': { col: 5, row: 2, x: 896, y: 371, w: 136, h: 110 },
  '5x3': { col: 5, row: 3, x: 905, y: 485, w: 141, h: 113 }
};

// Плитки с лесными рунами на арте (+4 ATK птице на них)
const RUNE_TILE_KEYS = ['2x1', '4x1', '2x3'];

// Координаты 4 факелов на видео-арене (под разрешение 1376x768)
const ARENA_PROPS = {
  topLeftTorch:     { x: 438,  y: 162, r: 42, name: 'Верхний левый факел' },
  topRightTorch:    { x: 940,  y: 162, r: 42, name: 'Верхний правый факел' },
  bottomLeftTorch:  { x: 205,  y: 445, r: 48, name: 'Нижний левый факел' },
  bottomRightTorch: { x: 1168, y: 445, r: 48, name: 'Нижний правый факел' }
};

// Координаты центра Бобра для прицеливания снарядов и выпадов карт
const BOSS_CENTER = { x: 688, y: 155 };

/**
 * Модуль финальной Арены Битвы с Бобром
 * Включает процедурный кодовый VFX-движок (частицы, кривые Безье, крутящиеся пилы, 3 стадии боя и пружинную физику карт)
 */
export class BossArena {
  constructor(videoManager) {
    this.videoManager = videoManager;
    this.isActive = false;

    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.arenaWidth = 1376;
    this.arenaHeight = 768;

    this.bgVideo = document.createElement('video');
    this.bgVideo.src = 'assets/videos/IDE-BossArena.mp4';
    this.bgVideo.loop = true;
    this.bgVideo.muted = true;
    this.bgVideo.playsInline = true;
    this.bgVideo.setAttribute('playsinline', '');
    this.bgVideo.preload = 'auto';

    events.on('music:volume_changed', (vol) => {
      if (this.bgVideo) this.bgVideo.volume = vol;
    });

    events.on('sound:toggled', (enabled) => {
      if (this.bgVideo) this.bgVideo.muted = !enabled;
    });

    this.bgImage = new Image();
    this.bgImage.src = 'assets/Boss Fight/Bober/Arena Tile/Bober Fight Static.png';

    this.cardBackImage = new Image();
    this.cardBackImage.src = 'assets/Market/Card back/Back-Card01.png';

    this.tileImages = {};
    for (const key of Object.keys(ARENA_TILES_COORDS)) {
      const img = new Image();
      img.src = `assets/Boss Fight/Bober/Arena Tile/${key}.png`;
      this.tileImages[key] = img;
    }

    this.cardImagesCache = {};

    // Состояние босса и его стадия (1, 2 или 3)
    this.boss = {
      name: 'БОБЁР-РАЗРУШИТЕЛЬ',
      title: 'Хранитель Лесной Плотины',
      maxHp: 360,
      hp: 360,
      phase: 1,
      armor: 0,
      poisonRounds: 0,
      vulnerable: false,
      blockSpecNext: false,
      hitFlashTimer: 0,
      intents: []
    };

    // Состояние игрока
    this.player = {
      maxHp: 100,
      hp: 100,
      round: 1,
      maxSummons: 3,
      torchCooldown: 0,
      deck: [],
      hand: [],
      discard: [],
      selectedCardIndex: -1
    };

    this.gridUnits = {};

    this.tileEffects = {};
    for (const key of Object.keys(ARENA_TILES_COORDS)) {
      this.tileEffects[key] = {
        isRune: RUNE_TILE_KEYS.includes(key),
        burningRounds: 0,
        tarRounds: 0,
        elixirRounds: 0,
        isTargeted: false,
        intentType: null,
        intentDamage: 0,
        shakeTimer: 0,
        sinkOffset: 0 // Пружинное проседание плиты при ударе или высадке
      };
    }

    // === ПРОЦЕДУРНЫЕ СПИСКИ КОДОВЫХ СПЕЦЭФФЕКТОВ ===
    this.floatingTexts = [];
    this.particles = [];      // Искры, щепки, огонь, перья, капли яда
    this.projectiles = [];    // Дуги пламени от факелов, перья, молнии
    this.shockwaves = [];     // Расходящиеся кольца ударных волн и слеши топора
    this.activeHazards = [];  // Анимированные циркулярные пилы и катящиеся брёвна

    this.animTime = 0;
    this.ambientSpawnTimer = 0;
    this.screenShakeTimer = 0;
    this.screenShakeIntensity = 0;
    this.isResolvingTurn = false;

    this.hoveredTileKey = null;
    this.hoveredPropKey = null;
    this.hoveredCardIndex = -1;
    this.mousePos = { x: -1, y: -1 };

    this.uiContainer = null;
    this.isInspectOpen = false;
    this.inspectModalEl = null;

    this.setupEvents();
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      if (this.isActive) this.updateCanvasBounds();
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (e.code === 'Escape' && this.isInspectOpen) {
        e.preventDefault();
        this.closeCardInspect();
        return;
      }
      if (e.code === 'Space') {
        const btn = document.getElementById('btn-end-turn');
        if (btn && !btn.disabled && !this.isResolvingTurn && !this.isInspectOpen) {
          e.preventDefault();
          audio.playClick();
          this.executeTurn();
        }
      }
    });

    if (this.canvas) {
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
      this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
      this.canvas.addEventListener('contextmenu', (e) => {
        if (!this.isActive || this.isResolvingTurn) return;
        const pos = this.getCanvasMousePos(e);
        for (const [key, coords] of Object.entries(ARENA_TILES_COORDS)) {
          if (
            pos.x >= coords.x &&
            pos.x <= coords.x + coords.w &&
            pos.y >= coords.y &&
            pos.y <= coords.y + coords.h
          ) {
            if (this.gridUnits[key]) {
              e.preventDefault();
              this.openCardInspect(this.gridUnits[key]);
            }
            break;
          }
        }
      });
    }
  }

  updateCanvasBounds() {
    if (!this.canvas) return;
    this.canvas.width = this.arenaWidth;
    this.canvas.height = this.arenaHeight;
  }

  getCardImage(src) {
    if (!this.cardImagesCache[src]) {
      const img = new Image();
      img.src = src;
      this.cardImagesCache[src] = img;
    }
    return this.cardImagesCache[src];
  }

  /* ==========================================================================
     КОДОВЫЙ ГЕНЕРАТОР ВСПЫШЕК, ЧАСТИЦ, СНАРЯДОВ И ПИЛ (PROCEDURAL VFX)
     ========================================================================== */
  spawnParticles(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      const angle = (opts.angle !== undefined)
        ? opts.angle + (Math.random() - 0.5) * (opts.spread || Math.PI)
        : Math.random() * Math.PI * 2;
      const speed = (opts.speed || 140) * (0.4 + Math.random() * 0.8);
      const life = (opts.life || 0.7) * (0.6 + Math.random() * 0.6);
      this.particles.push({
        x: x + (Math.random() - 0.5) * (opts.jitter || 12),
        y: y + (Math.random() - 0.5) * (opts.jitter || 12),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + (opts.upwardBoost || 0),
        gravity: opts.gravity !== undefined ? opts.gravity : 260,
        size: (opts.size || 5) * (0.6 + Math.random() * 0.7),
        color: Array.isArray(opts.colors)
          ? opts.colors[Math.floor(Math.random() * opts.colors.length)]
          : (opts.color || '#ffb703'),
        shape: opts.shape || 'circle', // 'circle' | 'spark' | 'wood' | 'rune'
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12,
        life,
        maxLife: life,
        glow: opts.glow !== undefined ? opts.glow : true
      });
    }
  }

  spawnShockwave(x, y, maxRadius = 110, color = '#ffd166', duration = 0.45, lineWidth = 5) {
    this.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius,
      color,
      lineWidth,
      life: duration,
      maxLife: duration,
      type: 'ring'
    });
  }

  spawnSlashEffect(x, y, color = '#a335ee', duration = 0.4) {
    this.shockwaves.push({
      x,
      y,
      radius: 75,
      maxRadius: 95,
      color,
      lineWidth: 7,
      life: duration,
      maxLife: duration,
      type: 'cross_slash'
    });
  }

  /**
   * Запускает анимированный снаряд по кривой Безье с хвостом из частиц
   */
  fireCurvedProjectile(startX, startY, targetX, targetY, color = '#ff5722', duration = 0.42) {
    return new Promise((resolve) => {
      const cpX = (startX + targetX) / 2 + (Math.random() - 0.5) * 160;
      const cpY = Math.min(startY, targetY) - 130 - Math.random() * 60;
      this.projectiles.push({
        startX,
        startY,
        cpX,
        cpY,
        targetX,
        targetY,
        x: startX,
        y: startY,
        color,
        elapsed: 0,
        duration,
        onHit: resolve
      });
    });
  }

  /**
   * Анимация физического выпада карты птицы вперёд при ударе по Боссу
   */
  animateUnitLunge(unit, targetX = BOSS_CENTER.x, targetY = BOSS_CENTER.y) {
    return new Promise((resolve) => {
      const tile = ARENA_TILES_COORDS[unit.tileKey];
      if (!tile) {
        resolve();
        return;
      }
      const startX = tile.x + tile.w / 2;
      const startY = tile.y + tile.h / 2;
      const dx = (targetX - startX) * 0.58;
      const dy = (targetY - startY) * 0.58;

      unit.lungeTime = 0;
      unit.lungeDuration = 0.28;
      unit.lungeTargetDX = dx;
      unit.lungeTargetDY = dy;
      unit.onLungePeak = () => {
        this.spawnParticles(BOSS_CENTER.x + (Math.random() - 0.5) * 70, BOSS_CENTER.y + 20, 14, {
          colors: ['#ffd166', '#ff4d4d', '#ffffff'],
          speed: 220,
          size: 5,
          shape: 'spark'
        });
        this.spawnShockwave(BOSS_CENTER.x, BOSS_CENTER.y + 20, 95, '#ffd166', 0.32, 4);
      };
      setTimeout(resolve, 180);
    });
  }

  /**
   * Проверка и переключение стадии Босса (1 -> 2 -> 3) с кинематографичным переходом
   */
  checkBossPhaseTransition() {
    const hpRatio = this.boss.hp / this.boss.maxHp;
    let targetPhase = 1;
    if (hpRatio <= 0.35 || this.player.round >= 7) {
      targetPhase = 3;
    } else if (hpRatio <= 0.68 || this.player.round >= 4) {
      targetPhase = 2;
    }

    if (targetPhase > this.boss.phase) {
      this.boss.phase = targetPhase;
      this.screenShake(24, 0.7);
      if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();

      if (targetPhase === 2) {
        this.boss.armor += 12;
        this.spawnShockwave(BOSS_CENTER.x, BOSS_CENTER.y + 30, 380, '#ff8800', 0.75, 8);
        this.spawnParticles(BOSS_CENTER.x, BOSS_CENTER.y + 30, 45, {
          colors: ['#ff8800', '#ffd166', '#d97706'],
          speed: 320,
          size: 6,
          shape: 'wood'
        });
        this.addFloatingText(this.arenaWidth / 2, 175, 'СТАДИЯ II: ЗАПУСК ЛЕСОПИЛКИ! (+12 БРОНИ)', '#ff8800', 2.8);
      } else if (targetPhase === 3) {
        this.boss.armor += 20;
        this.spawnShockwave(BOSS_CENTER.x, BOSS_CENTER.y + 30, 520, '#ff2233', 0.9, 10);
        this.spawnParticles(BOSS_CENTER.x, BOSS_CENTER.y + 30, 65, {
          colors: ['#ff2233', '#ff5722', '#ffd166'],
          speed: 380,
          size: 7,
          shape: 'spark'
        });
        this.addFloatingText(this.arenaWidth / 2, 175, 'СТАДИЯ III: ЯРОСТЬ БОБРА-БЕРСЕРКА!', '#ff2233', 3.0);
      }
      this.updateHUD();
    }
  }

  /* ==========================================================================
     Запуск и Остановка Арены
     ========================================================================== */
  start(customDeck = null) {
    console.log('🦫 [BossArena] Вход на Финальную Арену Босса!');
    this.isActive = true;

    if (this.canvas) {
      this.canvas.style.display = 'block';
      this.updateCanvasBounds();
    }

    if (this.videoManager) {
      this.videoManager.stopBoardGameBossSequence();
      const wrapper = document.getElementById('video-wrapper');
      if (wrapper) wrapper.style.display = 'none';
    }

    if (this.bgVideo) {
      try {
        this.bgVideo.currentTime = 0;
      } catch (e) {}
      const playPromise = this.bgVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          this.bgVideo.muted = true;
          this.bgVideo.play().catch(() => {});
        });
      }
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));

    this.boss.name = 'БОБЁР-РАЗРУШИТЕЛЬ';
    this.boss.maxHp = 360;
    this.boss.hp = 360;
    this.boss.phase = 1;
    this.boss.armor = 0;
    this.boss.poisonRounds = 0;
    this.boss.vulnerable = false;
    this.boss.blockSpecNext = false;
    this.boss.hitFlashTimer = 0;

    this.player.round = 1;
    this.player.maxHp = 100;
    this.player.hp = 100;
    this.player.maxSummons = 3;
    this.player.torchCooldown = 0;

    if (customDeck && customDeck.length > 0) {
      this.player.deck = customDeck.map(c => ({ ...c, restRounds: 0 })).sort(() => 0.5 - Math.random());
    } else {
      try {
        const savedDeckJson = localStorage.getItem('birday_player_cards');
        if (savedDeckJson) {
          const cardIds = JSON.parse(savedDeckJson);
          const loadedCards = cardIds
            .map(id => CARDS_DATABASE.find(c => c.id === id))
            .filter(Boolean)
            .map(c => ({ ...c, restRounds: 0 }));
          if (loadedCards.length >= 6) {
            this.player.deck = [...loadedCards].sort(() => 0.5 - Math.random());
          } else {
            this.player.deck = getRandomStarterDeck(14).map(c => ({ ...c, restRounds: 0 }));
          }
        } else {
          this.player.deck = getRandomStarterDeck(14).map(c => ({ ...c, restRounds: 0 }));
        }
      } catch (e) {
        this.player.deck = getRandomStarterDeck(14).map(c => ({ ...c, restRounds: 0 }));
      }
    }

    this.player.hand = [];
    this.player.discard = [];
    this.player.selectedCardIndex = -1;

    // Предзагрузка Full Art артов для всех карт колоды (для мгновенного появления на поле)
    if (this.player.deck) {
      this.player.deck.forEach(card => {
        const fullArt = card.fullArtImage || getFullArtPath(card.image);
        if (fullArt) this.getCardImage(fullArt);
      });
    }

    this.gridUnits = {};
    for (const key of Object.keys(this.tileEffects)) {
      this.tileEffects[key].burningRounds = 0;
      this.tileEffects[key].tarRounds = 0;
      this.tileEffects[key].elixirRounds = 0;
      this.tileEffects[key].isTargeted = false;
      this.tileEffects[key].intentType = null;
      this.tileEffects[key].intentDamage = 0;
      this.tileEffects[key].sinkOffset = 0;
    }

    this.floatingTexts = [];
    this.particles = [];
    this.projectiles = [];
    this.shockwaves = [];
    this.activeHazards = [];
    this.isResolvingTurn = false;

    this.createDomHUD();
    this.drawCards(5);
    this.generateBossIntents();

    this.addFloatingText(this.arenaWidth / 2, 140, 'РАУНД 1: РАЗМИНКА БОБРА!', '#ffb703', 2.5);
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;

    this.closeCardInspect();

    if (this.canvas) this.canvas.style.display = 'none';
    if (this.bgVideo) this.bgVideo.pause();

    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
      this.uiContainer = null;
    }

    const wrapper = document.getElementById('video-wrapper');
    if (wrapper) wrapper.style.display = 'block';
  }

  /* ==========================================================================
     DOM HUD
     ========================================================================== */
  createDomHUD() {
    if (this.uiContainer) this.uiContainer.remove();

    const uiLayer = document.getElementById('ui-layer') || document.getElementById('game-container');
    if (!uiLayer) return;

    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'boss-arena-hud';
    this.uiContainer.className = 'boss-arena-hud';

    this.uiContainer.innerHTML = `
      <div class="boss-frame-container">
        <div class="boss-frame-inner-row">
          <div id="boss-segments-track" class="boss-segments-track"></div>
          <span id="boss-hp-num" class="boss-hp-num">HP ${this.boss.hp}/${this.boss.maxHp}</span>
        </div>
      </div>

      <div class="boss-round-container">
        <span id="round-counter" class="boss-round-text">Раунд ${this.player.round}</span>
      </div>

      <div id="boss-intent-badge" class="boss-intent-badge">
        <span class="intent-prefix">СЛЕДУЮЩАЯ АТАКА:</span>
        <span id="boss-intent-desc" class="intent-desc">Готовит атаку...</span>
      </div>

      <div id="boss-card-hint" class="boss-card-hint hidden">
        Красная = Прорыв в героя | Оранжевая = Пила по ряду | Фиолетовая = Топор по рунам | Кликайте по факелам!
      </div>

      <div class="boss-player-col">
        <div class="boss-summon-slots-container">
          <div id="boss-slot-0" class="boss-summon-slot is-default" title="Слот существа 1"></div>
          <div id="boss-slot-1" class="boss-summon-slot is-default" title="Слот существа 2"></div>
          <div id="boss-slot-2" class="boss-summon-slot is-default" title="Слот существа 3"></div>
        </div>

        <div class="hero-hp-frame-container">
          <div id="hero-hearts-row" class="hero-hearts-row">
            <div class="hero-heart-icon"></div>
            <div class="hero-heart-icon"></div>
            <div class="hero-heart-icon"></div>
            <div class="hero-heart-icon"></div>
            <div class="hero-heart-icon"></div>
          </div>
          <div class="hero-hp-plate">
            <span id="player-hp-num" class="hero-hp-val">Игрок: ${this.player.hp}/${this.player.maxHp} HP</span>
          </div>
        </div>
      </div>

      <div id="boss-hand-container" class="boss-hand-container"></div>

      <div class="boss-action-col">
        <button id="btn-end-turn" class="boss-attack-btn" title="Завершить ход и атаковать босса (Пробел)">
          <span class="boss-attack-btn-title">АТАКА</span>
          <span class="boss-attack-btn-sub">Пробел</span>
        </button>

        <div class="boss-deck-card-wrap" title="Карт в колоде">
          <div class="boss-deck-icon"></div>
          <span id="deck-counter" class="boss-counter-badge">${this.player.deck.length}</span>
        </div>

        <div class="boss-discard-card-wrap" title="Карт в сбросе">
          <div class="boss-discard-icon"></div>
          <span id="discard-counter" class="boss-counter-badge">${this.player.discard.length}</span>
        </div>
      </div>
    `;

    uiLayer.appendChild(this.uiContainer);

    const btnEndTurn = document.getElementById('btn-end-turn');
    if (btnEndTurn) {
      btnEndTurn.addEventListener('click', () => {
        if (!this.isResolvingTurn) {
          audio.playClick();
          this.executeTurn();
        }
      });
    }

    this.renderHandDOM();
    this.updateHUD();
  }

  updateHUD() {
    this.updateBossSegments();
    this.updateHeroHearts();
    this.updateSummonSlots();

    const hpNum = document.getElementById('boss-hp-num');
    if (hpNum) {
      const armorTag = this.boss.armor > 0 ? ` [ЩИТ ${this.boss.armor}]` : '';
      const vulnTag = this.boss.vulnerable ? ' [УЯЗВИМ +50%]' : '';
      hpNum.textContent = `HP ${Math.max(0, this.boss.hp)}/${this.boss.maxHp}${armorTag}${vulnTag}`;
    }

    const playerNum = document.getElementById('player-hp-num');
    if (playerNum) {
      playerNum.textContent = `Игрок: ${Math.max(0, this.player.hp)}/${this.player.maxHp} HP`;
    }

    const deckCounter = document.getElementById('deck-counter');
    if (deckCounter) deckCounter.textContent = `${this.player.deck.length}`;

    const discardCounter = document.getElementById('discard-counter');
    if (discardCounter) discardCounter.textContent = `${this.player.discard.length}`;

    const roundCounter = document.getElementById('round-counter');
    if (roundCounter) {
      roundCounter.textContent = `Раунд ${this.player.round} (Фаза ${this.boss.phase})`;
    }

    const intentDesc = document.getElementById('boss-intent-desc');
    if (intentDesc && this.boss.intents.length > 0) {
      intentDesc.textContent = this.boss.intents[0].description;
    }
  }

  updateBossSegments() {
    const track = document.getElementById('boss-segments-track');
    if (!track) return;
    const totalSegments = 24;
    const pct = Math.max(0, Math.min(1, this.boss.hp / this.boss.maxHp));
    const fullCount = Math.round(pct * totalSegments);

    if (track.children.length !== totalSegments) {
      track.innerHTML = '';
      for (let i = 0; i < totalSegments; i++) {
        const seg = document.createElement('div');
        seg.className = `boss-hp-segment ${i < fullCount ? 'is-full' : 'is-empty'}`;
        track.appendChild(seg);
      }
    } else {
      for (let i = 0; i < totalSegments; i++) {
        const seg = track.children[i];
        if (seg) {
          seg.className = i < fullCount ? 'boss-hp-segment is-full' : 'boss-hp-segment is-empty';
        }
      }
    }
  }

  updateHeroHearts() {
    const row = document.getElementById('hero-hearts-row');
    if (!row) return;
    const totalHearts = 5;
    const heartsFull = Math.ceil((Math.max(0, this.player.hp) / this.player.maxHp) * totalHearts);
    for (let i = 0; i < totalHearts; i++) {
      const heart = row.children[i];
      if (heart) {
        heart.className = i < heartsFull ? 'hero-heart-icon' : 'hero-heart-icon is-empty';
      }
    }
  }

  updateSummonSlots() {
    const realPlacedCount = Object.values(this.gridUnits).filter(u => !u.isDecoy && !u.isRevivedToken).length;
    for (let i = 0; i < 3; i++) {
      const slot = document.getElementById(`boss-slot-${i}`);
      if (slot) {
        slot.className = i < realPlacedCount ? 'boss-summon-slot is-active' : 'boss-summon-slot is-default';
      }
    }
  }

  renderHandDOM() {
    const container = document.getElementById('boss-hand-container');
    if (!container) return;

    container.innerHTML = '';

    this.player.hand.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'boss-hand-card';
      if (this.player.selectedCardIndex === index) {
        cardEl.classList.add('selected');
      }

      const isResting = (card.restRounds || 0) > 0;
      if (isResting) {
        cardEl.style.opacity = '0.52';
        cardEl.style.filter = 'grayscale(0.55)';
      } else {
        cardEl.style.transform = 'none';
      }

      const isDamaged = card.currentHp !== undefined && card.currentHp < card.hp;
      const displayHp = isDamaged ? card.currentHp : card.hp;

      cardEl.innerHTML = `
        <img src="${card.image}" alt="${card.name}" class="boss-card-full-img" draggable="false" />
        ${isDamaged ? `<div class="card-damaged-hp-badge" title="Текущее здоровье: ${displayHp}/${card.hp}">HP ${displayHp}</div>` : ''}
        ${isResting ? `<div class="card-damaged-hp-badge" style="top: 8px; bottom: auto; background: rgba(15, 23, 42, 0.92); border-color: #38bdf8; color: #7dd3fc;">ОТДЫХ ${card.restRounds} Х.</div>` : ''}
      `;

      let holdTimer = null;
      let isHeld = false;

      const startHold = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        isHeld = false;
        cardEl.classList.add('is-pressing');
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          isHeld = true;
          cardEl.classList.remove('is-pressing');
          this.openCardInspect(card);
        }, 320);
      };

      const cancelHold = () => {
        cardEl.classList.remove('is-pressing');
        clearTimeout(holdTimer);
      };

      cardEl.addEventListener('mousedown', startHold);
      cardEl.addEventListener('touchstart', startHold, { passive: true });
      cardEl.addEventListener('mouseup', cancelHold);
      cardEl.addEventListener('mouseleave', cancelHold);
      cardEl.addEventListener('touchend', cancelHold);
      cardEl.addEventListener('touchcancel', cancelHold);

      cardEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cancelHold();
        this.openCardInspect(card);
      });

      cardEl.addEventListener('mouseenter', () => {
        this.hoveredCardIndex = index;
      });

      cardEl.addEventListener('mouseleave', () => {
        this.hoveredCardIndex = -1;
      });

      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isHeld) {
          isHeld = false;
          return;
        }
        this.selectCard(index);
      });

      attach3DHoloTilt(cardEl, card.rarity || 'common', 15);
      container.appendChild(cardEl);
    });

    const hint = document.getElementById('boss-card-hint');
    if (hint) {
      if (this.player.selectedCardIndex >= 0) {
        hint.classList.remove('hidden');
      } else {
        hint.classList.add('hidden');
      }
    }
  }

  selectCard(index) {
    if (this.isResolvingTurn) return;
    const card = this.player.hand[index];
    if (!card) return;

    if (card.restRounds && card.restRounds > 0) {
      this.addFloatingText(this.arenaWidth / 2, 540, `${card.name} переводит дух после боя (${card.restRounds} х.)!`, '#38bdf8', 1.5);
      audio.playClick();
      return;
    }

    if (this.player.selectedCardIndex === index) {
      this.player.selectedCardIndex = -1;
      audio.playClick();
    } else {
      this.player.selectedCardIndex = index;
      audio.playClick();
    }
    this.renderHandDOM();
  }

  drawCards(count = 2) {
    for (let i = 0; i < count; i++) {
      if (this.player.deck.length === 0) {
        if (this.player.discard.length > 0) {
          this.player.deck = this.player.discard
            .map(c => ({ ...c, currentHp: c.hp, restRounds: 0 }))
            .sort(() => 0.5 - Math.random());
          this.player.discard = [];
        } else {
          break;
        }
      }
      if (this.player.hand.length < 7) {
        const card = this.player.deck.shift();
        if (card) this.player.hand.push(card);
      }
    }
    this.renderHandDOM();
    this.updateHUD();
  }

  /* ==========================================================================
     Выставление и возврат птицы с поля 5x3 + Кодовые VFX высадки
     ========================================================================== */
  recallUnitFromTile(tileKey) {
    const unit = this.gridUnits[tileKey];
    if (!unit || this.isResolvingTurn) return;

    if (unit.isDecoy || unit.isRevivedToken) {
      this.openCardInspect(unit);
      return;
    }

    if (this.tileEffects[tileKey]?.tarRounds > 0) {
      this.addFloatingText(this.arenaWidth / 2, 400, 'Птица увязла в смоле Бобра — нельзя забрать!', '#f97316', 1.6);
      audio.playClick();
      return;
    }

    if (unit.id === 'magician_peacock') {
      for (const [k, u] of Object.entries(this.gridUnits)) {
        if (u.isDecoy) delete this.gridUnits[k];
      }
    }

    const tile = ARENA_TILES_COORDS[tileKey];
    this.spawnParticles(tile.x + tile.w / 2, tile.y + tile.h / 2, 10, {
      colors: ['#48cae4', '#ffffff'],
      speed: 90,
      size: 4
    });

    delete this.gridUnits[tileKey];
    this.player.hand.push({
      id: unit.id,
      name: unit.name,
      subname: unit.subname,
      role: unit.role,
      rarity: unit.rarity,
      image: unit.image,
      fullArtImage: unit.fullArtImage || getFullArtPath(unit.image),
      atk: unit.atk,
      hp: unit.hp,
      currentHp: unit.currentHp,
      abilityName: unit.abilityName,
      abilityDesc: unit.abilityDesc,
      price: unit.price,
      restRounds: 0
    });

    audio.playClick();
    this.addFloatingText(tile.x + tile.w / 2, tile.y, 'Возврат в руку', '#48cae4', 1.1);
    this.recalculateBoardAuras();
    this.renderHandDOM();
    this.updateHUD();
  }

  placeCardOnTile(tileKey) {
    if (this.player.selectedCardIndex < 0) return;
    const card = this.player.hand[this.player.selectedCardIndex];
    if (!card) return;

    const realPlacedCount = Object.values(this.gridUnits).filter(u => !u.isDecoy && !u.isRevivedToken).length;
    if (realPlacedCount >= this.player.maxSummons) {
      this.addFloatingText(this.arenaWidth / 2, 400, `Лимит: максимум ${this.player.maxSummons} существа за ход!`, '#ff4d4d', 1.6);
      if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();
      return;
    }

    if (this.gridUnits[tileKey]) {
      this.addFloatingText(this.arenaWidth / 2, 400, 'Клетка уже занята птицей!', '#ff4d4d', 1.2);
      if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();
      return;
    }

    this.player.hand.splice(this.player.selectedCardIndex, 1);
    this.player.selectedCardIndex = -1;

    const initialHp = (card.currentHp !== undefined) ? card.currentHp : card.hp;
    let placedHp = initialHp;
    let placedMaxHp = card.hp;
    if (card.id === 'undertaker_marabou') {
      const bonus = (this.player.discard ? this.player.discard.length : 0) * 6;
      placedHp += bonus;
      placedMaxHp += bonus;
    }

    const fullArtSrc = card.fullArtImage || getFullArtPath(card.image);
    this.gridUnits[tileKey] = {
      ...card,
      fullArtImage: fullArtSrc,
      currentHp: placedHp,
      maxHp: placedMaxHp,
      baseAtk: card.atk,
      currentAtk: card.atk,
      tileKey: tileKey,
      shieldBlocked: false,
      painImmune: false,
      spawnAnim: 1.0,
      hitAnim: 0,
      lungeTime: 0,
      lungeDuration: 0,
      lungeTargetDX: 0,
      lungeTargetDY: 0,
      triggerAbilityOnAttack: true
    };

    // Эффект проседания плиты и разлёта пыли/перьев при посадке
    const tile = ARENA_TILES_COORDS[tileKey];
    const cx = tile.x + tile.w / 2;
    const cy = tile.y + tile.h / 2;
    this.tileEffects[tileKey].sinkOffset = 9;

    const rarityColors = {
      common: ['#e5e7eb', '#d1d5db'],
      uncommon: ['#2ecc71', '#a7f3d0'],
      rare: ['#38bdf8', '#93c5fd'],
      epic: ['#c084fc', '#a855f7'],
      legendary: ['#fbbf24', '#f59e0b', '#ffffff']
    };
    this.spawnShockwave(cx, cy + 15, 65, (rarityColors[card.rarity] || ['#ffd166'])[0], 0.35, 3);
    this.spawnParticles(cx, cy + 15, 16, {
      colors: rarityColors[card.rarity] || ['#ffd166'],
      speed: 130,
      size: 5,
      upwardBoost: -60
    });

    if (typeof audio.playCoin === 'function') audio.playCoin(); else audio.playClick();
    this.addFloatingText(cx, tile.y, `${card.name}!`, '#ffd166', 1.5);

    this.recalculateBoardAuras();
    this.renderHandDOM();
    this.updateHUD();
  }

  recalculateBoardAuras() {
    const units = Object.values(this.gridUnits);
    const starlingCount = units.filter(u => u.id === 'starling_musician').length;
    const hasKing = units.some(u => u.id === 'feathered_king');
    const hasRocker = units.some(u => u.id === 'rocker_capercaillie');
    const restingCount = this.player.hand.filter(c => c.restRounds && c.restRounds > 0).length;
    const discardCount = this.player.discard ? this.player.discard.length : 0;

    for (const [key, unit] of Object.entries(this.gridUnits)) {
      if (unit.isDecoy) {
        unit.currentAtk = 0;
        continue;
      }

      let atk = unit.baseAtk !== undefined ? unit.baseAtk : unit.atk;

      if (this.tileEffects[key]?.isRune) atk += 4;
      if (starlingCount > 0) atk += starlingCount * 4;
      if (unit.id === 'chef_chicken' && unit.currentHp <= unit.maxHp * 0.5) atk += 8;
      if (unit.id === 'vulture_hunter' && this.boss.hp <= this.boss.maxHp * 0.4) atk *= 2;
      if (hasKing && unit.id !== 'feathered_king') atk *= 2;
      if (unit.id === 'nightjar_owl') atk += restingCount * 2;
      if (unit.id === 'sniper_partridge' && key.endsWith('x3')) atk += 8;
      if (unit.id === 'undertaker_marabou') atk += discardCount * 6;

      if (this.tileEffects[key]?.tarRounds > 0 && !hasRocker) atk = Math.max(1, Math.floor(atk * 0.5));

      unit.currentAtk = atk;
    }
  }

  getNeighborKeys(tileKey) {
    const [c, r] = tileKey.split('x').map(Number);
    const neighbors = [];
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const k = `${c + dc}x${r + dr}`;
        if (ARENA_TILES_COORDS[k]) neighbors.push(k);
      }
    }
    return neighbors;
  }

  async triggerOnPlayAbility(card, tileKey) {
    const tile = ARENA_TILES_COORDS[tileKey];
    const cx = tile.x + tile.w / 2;
    const cy = tile.y + tile.h / 2;

    if (card.id === 'penguin_manager') {
      this.drawCards(1);
      this.addFloatingText(this.arenaWidth / 2, 450, '+1 Карта (Квартальный отчёт)!', '#2ec4b6', 1.8);
    } else if (card.id === 'magician_peacock') {
      const [c, r] = tileKey.split('x').map(Number);
      [`${c - 1}x${r}`, `${c + 1}x${r}`].forEach(k => {
        if (ARENA_TILES_COORDS[k] && !this.gridUnits[k]) {
          const dt = ARENA_TILES_COORDS[k];
          this.spawnShockwave(dt.x + dt.w / 2, dt.y + dt.h / 2, 55, '#a335ee', 0.4, 3);
          this.gridUnits[k] = {
            id: 'peacock_decoy',
            name: 'Иллюзия Павлина',
            role: 'Приманка',
            rarity: 'uncommon',
            image: card.image,
            fullArtImage: card.fullArtImage || getFullArtPath(card.image),
            atk: 0,
            baseAtk: 0,
            hp: 12,
            currentHp: 12,
            maxHp: 12,
            currentAtk: 0,
            isDecoy: true,
            tileKey: k,
            spawnAnim: 1.0,
            hitAnim: 0,
            lungeTime: 0
          };
        }
      });
      this.addFloatingText(this.arenaWidth / 2, 400, 'Зеркальные копии созданы!', '#a335ee', 1.8);
    } else if (card.id === 'owl_sparta') {
      const r = parseInt(tileKey.split('x')[1], 10);
      for (let col = 1; col <= 5; col++) {
        const k = `${col}x${r}`;
        if (this.gridUnits[k]) {
          this.gridUnits[k].currentHp += 18;
          this.gridUnits[k].maxHp += 18;
          const t = ARENA_TILES_COORDS[k];
          this.spawnShockwave(t.x + t.w / 2, t.y + t.h / 2, 60, '#f39c12', 0.4, 4);
        }
      }
      this.addFloatingText(this.arenaWidth / 2, 420, 'Фаланга Спарты: +18 HP в ряду!', '#f39c12', 2.0);
    } else if (card.id === 'tit_pyromancer') {
      this.tileEffects[tileKey].burningRounds = 3;
      this.tileEffects[tileKey].tarRounds = 0;
      this.spawnParticles(cx, cy, 24, { colors: ['#ff5722', '#ffb703'], speed: 150, upwardBoost: -80 });
      this.addFloatingText(cx, tile.y, 'Клетка охвачена огнём!', '#ff5722', 1.8);
    } else if (card.id === 'raven_alchemist') {
      this.boss.poisonRounds = 3;
      this.tileEffects[tileKey].elixirRounds = 3;
      this.tileEffects[tileKey].tarRounds = 0;
      if (this.tileEffects[tileKey].intentType === 'SAW_AOE') {
        this.tileEffects[tileKey].isTargeted = false;
        this.tileEffects[tileKey].intentType = null;
      }
      this.spawnParticles(cx, cy, 22, { colors: ['#2ecc71', '#a335ee'], speed: 120, upwardBoost: -60 });
      this.addFloatingText(cx, tile.y, 'Трансмутация: Яд + Эликсир!', '#2ecc71', 1.9);
    } else if (card.id === 'sokol_cosmonaut') {
      for (let r = 1; r <= 3; r++) {
        const rowCopy = [];
        for (let c = 1; c <= 5; c++) {
          const eff = this.tileEffects[`${c}x${r}`];
          rowCopy.push({ isTargeted: eff.isTargeted, intentType: eff.intentType, intentDamage: eff.intentDamage });
        }
        for (let c = 1; c <= 5; c++) {
          const nextCol = (c % 5) + 1;
          const targetEff = this.tileEffects[`${nextCol}x${r}`];
          const src = rowCopy[c - 1];
          targetEff.isTargeted = src.isTargeted;
          targetEff.intentType = src.intentType;
          targetEff.intentDamage = src.intentDamage;
        }
      }
      this.spawnShockwave(this.arenaWidth / 2, 410, 340, '#38bdf8', 0.55, 5);
      this.addFloatingText(this.arenaWidth / 2, 360, '«Она круглая?!» Прицел Бобра сдвинут!', '#38bdf8', 2.0);
    } else if (card.id === 'therapist_robin') {
      this.gridUnits[tileKey].painImmune = true;
      this.getNeighborKeys(tileKey).forEach(k => {
        if (this.gridUnits[k]) this.gridUnits[k].painImmune = true;
      });
      this.spawnShockwave(cx, cy, 140, '#ff6b8b', 0.45, 4);
      this.addFloatingText(cx, tile.y, 'АНТИДЕПРЕССАНТЫ: 0 урона!', '#ff6b8b', 2.0);
    } else if (card.id === 'owl_exorcist') {
      for (const eff of Object.values(this.tileEffects)) {
        eff.tarRounds = 0;
        if (eff.intentType === 'HEAVY_AXE') {
          eff.isTargeted = false;
          eff.intentType = null;
        }
      }
      this.boss.armor = 0;
      this.boss.blockSpecNext = true;
      this.spawnShockwave(this.arenaWidth / 2, 400, 420, '#a335ee', 0.6, 6);
      this.addFloatingText(this.arenaWidth / 2, 360, '«Изыди!» Арена очищена от ловушек!', '#a335ee', 2.0);
    } else if (card.id === 'owl_hairdresser' && this.boss.armor > 0) {
      this.boss.armor = 0;
      this.spawnSlashEffect(BOSS_CENTER.x, BOSS_CENTER.y + 20, '#ffd166', 0.45);
      this.addFloatingText(this.arenaWidth / 2, 220, 'Стрижка под ноль: Броня Бобра срезана!', '#ffd166', 1.8);
    } else if (card.id === 'plumber_bullfinch') {
      this.tileEffects[tileKey].tarRounds = 0;
      this.tileEffects[tileKey].burningRounds = 0;
      if (this.gridUnits[tileKey]) {
        this.gridUnits[tileKey].currentHp += 2;
        this.gridUnits[tileKey].maxHp += 2;
      }
      this.spawnShockwave(cx, cy, 60, '#38bdf8', 0.4, 3);
      this.addFloatingText(cx, tile.y, 'Сантехника: Клетка очищена, +2 HP!', '#38bdf8', 2.0);
    } else if (card.id === 'intern_dove') {
      const resting = this.player.hand.filter(c => c.restRounds && c.restRounds > 0);
      if (resting.length > 0) {
        const target = resting[Math.floor(Math.random() * resting.length)];
        target.restRounds = Math.max(0, target.restRounds - 1);
      }
      this.player.hp = Math.min(this.player.maxHp || 30, this.player.hp + 5);
      this.spawnShockwave(cx, cy, 65, '#2ecc71', 0.4, 3);
      this.addFloatingText(cx, tile.y, 'Стажировка: -1 ход отдыха, +5 HP игроку!', '#2ecc71', 2.0);
    } else if (card.id === 'hacker_cuckoo') {
      const breachedKeys = Object.keys(this.tileEffects).filter(k => this.tileEffects[k].isTargeted);
      if (breachedKeys.length > 0) {
        const targetKey = breachedKeys[Math.floor(Math.random() * breachedKeys.length)];
        this.tileEffects[targetKey].isTargeted = false;
        this.tileEffects[targetKey].intentType = null;
        this.tileEffects[targetKey].intentDamage = 0;
        this.player.hp = Math.min(this.player.maxHp || 30, this.player.hp + 5);
        const bk = ARENA_TILES_COORDS[targetKey];
        if (bk) this.spawnShockwave(bk.x + bk.w / 2, bk.y + bk.h / 2, 70, '#00ffcc', 0.45, 4);
        this.addFloatingText(this.arenaWidth / 2, 400, `Взлом: Клетка [${targetKey}] безопасна, +5 HP игроку!`, '#00ffcc', 2.2);
      } else {
        this.player.hp = Math.min(this.player.maxHp || 30, this.player.hp + 5);
        this.addFloatingText(this.arenaWidth / 2, 400, 'Взлом: Защита взломана, +5 HP игроку!', '#00ffcc', 1.8);
      }
    } else if (card.id === 'bartender_toucan') {
      const row = parseInt(tileKey.split('x')[1], 10);
      if (row === 1) {
        this.boss.poisonRounds = Math.max(this.boss.poisonRounds || 0, 3);
        this.spawnParticles(BOSS_CENTER.x, BOSS_CENTER.y + 20, 25, { colors: ['#ff4d4d', '#ff7849'], speed: 160 });
        this.addFloatingText(this.arenaWidth / 2, 220, 'Острый чили: Бобёр подожжён на 3 хода!', '#ff4d4d', 2.0);
      } else {
        this.getNeighborKeys(tileKey).forEach(nk => {
          if (this.gridUnits[nk]) {
            this.gridUnits[nk].currentHp = Math.min(this.gridUnits[nk].maxHp, this.gridUnits[nk].currentHp + 4);
          }
        });
        this.spawnShockwave(cx, cy, 75, '#2ecc71', 0.4, 3);
        this.addFloatingText(cx, tile.y, 'Коктейль бармена: +4 HP соседям!', '#2ecc71', 2.0);
      }
    } else if (card.id === 'astrologer_hoopoe') {
      const [c, r] = tileKey.split('x').map(Number);
      for (let col = c; col <= 5; col++) {
        const k = `${col}x${r}`;
        if (this.tileEffects[k]) {
          this.tileEffects[k].isRune = true;
          const t = ARENA_TILES_COORDS[k];
          if (t) this.spawnShockwave(t.x + t.w / 2, t.y + t.h / 2, 60, '#93c5fd', 0.4, 3);
        }
      }
      this.recalculateBoardAuras();
      this.addFloatingText(this.arenaWidth / 2, 410, 'Парад планет: Рунные зоны справа (+4 ATK)!', '#93c5fd', 2.2);
    } else if (card.id === 'overseer_owl') {
      let maxDmg = -1;
      let worstKey = null;
      for (const [k, eff] of Object.entries(this.tileEffects)) {
        if (eff.isTargeted && (eff.intentDamage || 0) > maxDmg) {
          maxDmg = eff.intentDamage || 0;
          worstKey = k;
        }
      }
      if (worstKey) {
        this.tileEffects[worstKey].isTargeted = false;
        this.tileEffects[worstKey].intentType = null;
        this.tileEffects[worstKey].intentDamage = 0;
        const wk = ARENA_TILES_COORDS[worstKey];
        if (wk) this.spawnShockwave(wk.x + wk.w / 2, wk.y + wk.h / 2, 80, '#38bdf8', 0.5, 5);
        this.addFloatingText(this.arenaWidth / 2, 380, `Абсолютный ноль: Удар по [${worstKey}] заморожен!`, '#38bdf8', 2.2);
      }
      if (this.gridUnits[tileKey]) {
        this.gridUnits[tileKey].currentHp = Math.min(this.gridUnits[tileKey].maxHp, this.gridUnits[tileKey].currentHp + 2);
      }
    } else if (card.id === 'hell_rooster') {
      let hazardCount = 0;
      for (const [k, eff] of Object.entries(this.tileEffects)) {
        if (eff.burningRounds > 0 || eff.tarRounds > 0) {
          hazardCount++;
          eff.tarRounds = 0;
          eff.burningRounds = 2;
          const t = ARENA_TILES_COORDS[k];
          if (t) this.spawnParticles(t.x + t.w / 2, t.y + t.h / 2, 20, { colors: ['#ff4d4d', '#ff9900'], speed: 170 });
        }
      }
      this.tileEffects[tileKey].burningRounds = 2;
      const roosterDmg = Math.max(12, hazardCount * 12 + 12);
      this.boss.hp = Math.max(0, this.boss.hp - roosterDmg);
      this.spawnShockwave(BOSS_CENTER.x, BOSS_CENTER.y + 20, 240, '#ff4d4d', 0.6, 6);
      this.screenShake(16, 0.45);
      this.addFloatingText(this.arenaWidth / 2, 220, `АДОВ ПОДРЫВ: -${roosterDmg} чистого урона Бобру!`, '#ff4d4d', 2.5);
    }
  }

  /* ==========================================================================
     Телеграфирование атак Бобра по 3 стадиям
     ========================================================================== */
  generateBossIntents() {
    for (const key of Object.keys(this.tileEffects)) {
      this.tileEffects[key].isTargeted = false;
      this.tileEffects[key].intentType = null;
      this.tileEffects[key].intentDamage = 0;
    }

    this.checkBossPhaseTransition();

    const round = this.player.round;
    let desc = '';

    if (round === 1) {
      const key = '3x2';
      this.tileEffects[key].isTargeted = true;
      this.tileEffects[key].intentType = 'BREACH';
      this.tileEffects[key].intentDamage = 6;
      desc = 'Разминка (Катящееся бревно): перекройте красную клетку [3x2], иначе -6 HP герою!';
    } else if (round === 2) {
      const breachKey = '2x2';
      this.tileEffects[breachKey].isTargeted = true;
      this.tileEffects[breachKey].intentType = 'BREACH';
      this.tileEffects[breachKey].intentDamage = 8;

      for (let c = 1; c <= 5; c++) {
        const sawKey = `${c}x1`;
        this.tileEffects[sawKey].isTargeted = true;
        this.tileEffects[sawKey].intentType = 'SAW_AOE';
        this.tileEffects[sawKey].intentDamage = 8;
      }
      desc = 'Бревно [2x2] (перекрыть!) + Оранжевая пила в 1-м ряду (бьёт только птиц, герою 0 урона!)';
    } else if (round === 3) {
      ['1x3', '5x3'].forEach(k => {
        this.tileEffects[k].isTargeted = true;
        this.tileEffects[k].intentType = 'BREACH';
        this.tileEffects[k].intentDamage = 8;
      });
      ['2x1', '4x1'].forEach(k => {
        this.tileEffects[k].isTargeted = true;
        this.tileEffects[k].intentType = 'HEAVY_AXE';
        this.tileEffects[k].intentDamage = 14;
      });
      desc = '2 Бревна по краям (перекрыть!) + Фиолетовый топор по рунам (выживите = Бобёр уязвим!)';
    } else {
      const pattern = (round + (this.boss.blockSpecNext ? 1 : 0)) % 3;
      this.boss.blockSpecNext = false;

      const rageBonus = this.boss.phase === 3 ? 3 : 0;
      const breachDmg = Math.min(14, 8 + Math.floor(round / 2) + rageBonus);
      const sawDmg = Math.min(16, 9 + Math.floor(round / 2) + rageBonus);

      if (pattern === 1) {
        const cols = [1, 2, 3, 4, 5].sort(() => 0.5 - Math.random()).slice(0, 2);
        const sawRow = Math.floor(Math.random() * 3) + 1;
        for (let c = 1; c <= 5; c++) {
          const k = `${c}x${sawRow}`;
          this.tileEffects[k].isTargeted = true;
          this.tileEffects[k].intentType = 'SAW_AOE';
          this.tileEffects[k].intentDamage = sawDmg;
        }
        cols.forEach(c => {
          const brRow = sawRow === 3 ? 2 : 3;
          const k = `${c}x${brRow}`;
          this.tileEffects[k].isTargeted = true;
          this.tileEffects[k].intentType = 'BREACH';
          this.tileEffects[k].intentDamage = breachDmg;
        });
        desc = `Аврал (Фаза ${this.boss.phase}): 2 прорыва (${breachDmg} ур.) + Оранжевая пила по ${sawRow}-му ряду (${sawDmg} ур.)`;
      } else if (pattern === 2) {
        this.boss.armor = 16 + rageBonus * 2;
        const cols = [1, 3, 5].sort(() => 0.5 - Math.random()).slice(0, 2);
        cols.forEach(c => {
          const k = `${c}x2`;
          this.tileEffects[k].isTargeted = true;
          this.tileEffects[k].intentType = 'BREACH';
          this.tileEffects[k].intentDamage = breachDmg;
        });
        RUNE_TILE_KEYS.forEach(k => {
          this.tileEffects[k].isTargeted = true;
          this.tileEffects[k].intentType = 'HEAVY_AXE';
          this.tileEffects[k].intentDamage = 15 + rageBonus;
        });
        desc = `Щит Плотины (+${this.boss.armor} брони) + 2 прорыва + Фиолетовый топор по рунам!`;
      } else {
        const cols = [1, 2, 3, 4, 5].sort(() => 0.5 - Math.random()).slice(0, 3);
        cols.forEach((c, idx) => {
          const r = (idx % 3) + 1;
          const k = `${c}x${r}`;
          this.tileEffects[k].isTargeted = true;
          this.tileEffects[k].intentType = 'BREACH';
          this.tileEffects[k].intentDamage = breachDmg;
        });
        desc = `Лесосплав: 3 красных бревна прорыва по ${breachDmg} ур. (блокируйте или перехватите Гусем!)`;
      }
    }

    this.boss.intents = [{
      type: 'TACTICAL_MIX',
      description: desc
    }];

    this.updateHUD();
  }

  /* ==========================================================================
     Интерактивные факелы: живая огненная дуга по кривой Безье без поломки видео!
     ========================================================================== */
  async activateArenaTorch(propKey) {
    if (this.isResolvingTurn) return;
    if (this.player.torchCooldown > 0) {
      this.addFloatingText(this.arenaWidth / 2, 340, `Факелы набирают жар (ещё ${this.player.torchCooldown} х.)!`, '#ffb703', 1.4);
      audio.playClick();
      return;
    }

    const prop = ARENA_PROPS[propKey];
    if (!prop) return;

    this.player.torchCooldown = 3;
    audio.playClick();

    // Вспышка искр на самом факеле
    this.spawnShockwave(prop.x, prop.y, 85, '#ffb703', 0.4, 4);
    this.spawnParticles(prop.x, prop.y, 28, {
      colors: ['#ffb703', '#ff5722', '#ffffff'],
      speed: 200,
      upwardBoost: -90,
      shape: 'spark'
    });

    // Запускаем огненный шар по дуге прямо в Бобра
    await this.fireCurvedProjectile(prop.x, prop.y, BOSS_CENTER.x, BOSS_CENTER.y + 20, '#ff5722', 0.42);

    if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();
    this.screenShake(14, 0.35);
    this.spawnShockwave(BOSS_CENTER.x, BOSS_CENTER.y + 20, 160, '#ff5722', 0.45, 6);
    this.spawnParticles(BOSS_CENTER.x, BOSS_CENTER.y + 20, 40, {
      colors: ['#ff5722', '#ffb703', '#ef4444'],
      speed: 280,
      size: 6,
      shape: 'spark'
    });

    // Огненная волна выжигает смолу на плитах и ослабляет брёвна
    for (const [k, eff] of Object.entries(this.tileEffects)) {
      if (eff.tarRounds > 0) {
        eff.tarRounds = 0;
        const t = ARENA_TILES_COORDS[k];
        this.spawnParticles(t.x + t.w / 2, t.y + t.h / 2, 16, { colors: ['#ff5722', '#ffb703'], speed: 120 });
      }
      if (eff.intentType === 'BREACH') {
        eff.intentDamage = Math.max(2, eff.intentDamage - 3);
      }
    }

    this.boss.hp = Math.max(0, this.boss.hp - 10);
    this.boss.hitFlashTimer = 0.45;
    this.addFloatingText(this.arenaWidth / 2, 220, 'ПЛАМЯ ЖАРОВНИ! -10 HP Бобру, смола сожжена, брёвна ослаблены!', '#ff5722', 2.4);
    this.checkBossPhaseTransition();
    this.recalculateBoardAuras();
    this.updateHUD();
  }

  /* ==========================================================================
     Кодовые анимации ударов Бобра (Крутящаяся пила, Катящееся бревно, Топор)
     ========================================================================== */
  playBossAttackVFX() {
    return new Promise((resolve) => {
      let maxAnimDuration = 0.45;

      // Проверяем, есть ли ряд с Циркулярной пилой (SAW_AOE)
      for (let r = 1; r <= 3; r++) {
        const rowHasSaw = [1, 2, 3, 4, 5].some(c => this.tileEffects[`${c}x${r}`]?.intentType === 'SAW_AOE');
        if (rowHasSaw) {
          const firstTile = ARENA_TILES_COORDS[`1x${r}`];
          const lastTile = ARENA_TILES_COORDS[`5x${r}`];
          const y = firstTile.y + firstTile.h / 2;
          this.activeHazards.push({
            type: 'saw',
            startX: firstTile.x - 40,
            endX: lastTile.x + lastTile.w + 40,
            x: firstTile.x - 40,
            y,
            elapsed: 0,
            duration: 0.52
          });
          maxAnimDuration = Math.max(maxAnimDuration, 0.52);
        }
      }

      // Проверяем клетки с Катящимся бревном (BREACH) и Фиолетовым топором (HEAVY_AXE)
      for (const [key, eff] of Object.entries(this.tileEffects)) {
        if (!eff.isTargeted) continue;
        const tile = ARENA_TILES_COORDS[key];
        const tx = tile.x + tile.w / 2;
        const ty = tile.y + tile.h / 2;

        if (eff.intentType === 'BREACH') {
          this.activeHazards.push({
            type: 'log',
            startX: BOSS_CENTER.x + (tx - BOSS_CENTER.x) * 0.35,
            startY: 215,
            endX: tx,
            endY: ty,
            x: tx,
            y: 215,
            elapsed: 0,
            duration: 0.46
          });
        } else if (eff.intentType === 'HEAVY_AXE') {
          setTimeout(() => {
            this.spawnSlashEffect(tx, ty, '#a335ee', 0.45);
            this.spawnParticles(tx, ty, 24, { colors: ['#a335ee', '#ffffff', '#c084fc'], speed: 220, shape: 'spark' });
          }, 220);
        }
      }

      setTimeout(resolve, maxAnimDuration * 1000);
    });
  }

  /* ==========================================================================
     Боевой цикл (Разрешение хода)
     ========================================================================== */
  async executeTurn() {
    this.isResolvingTurn = true;
    const btn = document.getElementById('btn-end-turn');
    if (btn) btn.disabled = true;

    // Шаг 0: Срабатывание способностей при выходе и заклинивание шестерёнок только ПОСЛЕ нажатия кнопки "Атака"
    const hasGearJammer = Object.entries(this.gridUnits).some(([k, u]) => (k === '1x1' || k === '5x1') && u.triggerAbilityOnAttack);
    if (hasGearJammer && Object.values(this.tileEffects).some(e => e.intentType === 'SAW_AOE')) {
      for (const eff of Object.values(this.tileEffects)) {
        if (eff.intentType === 'SAW_AOE') {
          eff.intentDamage = Math.max(2, Math.floor(eff.intentDamage * 0.5));
        }
      }
      this.addFloatingText(this.arenaWidth / 2, 340, 'Шестерёнки заклинены! Урон пилы -50%!', '#38bdf8', 2.0);
      await this.sleep(300);
    }

    let triggeredCount = 0;
    for (const [tKey, unit] of Object.entries(this.gridUnits)) {
      if (unit.triggerAbilityOnAttack) {
        unit.triggerAbilityOnAttack = false;
        await this.triggerOnPlayAbility(unit, tKey);
        triggeredCount++;
        await this.sleep(250);
      }
    }
    if (triggeredCount > 0) {
      this.recalculateBoardAuras();
      this.updateHUD();
      await this.sleep(250);
    }

    this.recalculateBoardAuras();

    // Шаг 1: Горение клеток и Яд Ворона-Алхимика
    let dotDamage = 0;
    for (const key of Object.keys(this.tileEffects)) {
      if (this.tileEffects[key].burningRounds > 0) {
        this.tileEffects[key].burningRounds--;
        dotDamage += 5;
      }
    }
    if (this.boss.poisonRounds > 0) {
      this.boss.poisonRounds--;
      dotDamage += 12;
    }
    if (dotDamage > 0) {
      this.boss.hp = Math.max(0, this.boss.hp - dotDamage);
      this.spawnParticles(BOSS_CENTER.x, BOSS_CENTER.y + 20, 22, { colors: ['#2ecc71', '#ff5722'], speed: 160 });
      this.addFloatingText(this.arenaWidth / 2, 220, `-${dotDamage} (Огонь и Яд)`, '#ff5722', 1.4);
      this.updateHUD();
      await this.sleep(350);
    }

    // Шаг 2: Поочерёдные физические выпады выставленных птиц по Бобру
    const activeUnits = Object.values(this.gridUnits);
    let bossStunnedThisRound = false;
    let bossAccuracyPenalty = false;
    let bossDamageMult = 1.0;

    if (activeUnits.length > 0) {
      this.addFloatingText(this.arenaWidth / 2, 280, 'ПЕРНАТЫЕ АТАКУЮТ!', '#ffd166', 1.5);
      await this.sleep(320);

      const vulnMult = this.boss.vulnerable ? 1.5 : 1.0;
      this.boss.vulnerable = false;

      let totalBirdsDamage = 0;
      for (const unit of activeUnits) {
        if (unit.isDecoy) continue;

        if (unit.id === 'carrier_pigeon') bossDamageMult *= 0.85;
        if (unit.id === 'owl_hairdresser') bossDamageMult *= 0.80;
        if (unit.id === 'swan_princess') bossDamageMult *= 0.70;
        if (unit.id === 'streamer_owl') bossDamageMult *= 0.65;
        if (unit.id === 'celestial_knight') bossAccuracyPenalty = true;

        if (unit.id === 'info_gypsy') {
          if (Math.random() < 0.5) {
            bossStunnedThisRound = true;
            this.addFloatingText(this.arenaWidth / 2, 250, 'Элитное кряканье: Бобёр заслушался и пропускает ход!', '#1eff00', 2.2);
          } else {
            this.addFloatingText(this.arenaWidth / 2, 250, 'Утка-Инфоцыган продала воздух...', '#9d9d9d', 1.6);
          }
        }

        if (unit.id === 'owl_mage') {
          const ut = ARENA_TILES_COORDS[unit.tileKey];
          if (Math.random() < 0.5) {
            await this.fireCurvedProjectile(ut.x + ut.w / 2, ut.y, BOSS_CENTER.x, BOSS_CENTER.y, '#38bdf8', 0.32);
            totalBirdsDamage += 15;
            this.addFloatingText(this.arenaWidth / 2, 240, 'Молния Совы-Мага: +15 урона!', '#38bdf8', 1.8);
          } else {
            const targetedKeys = Object.keys(this.tileEffects).filter(k => this.tileEffects[k].isTargeted);
            if (targetedKeys.length > 0) {
              const rk = targetedKeys[Math.floor(Math.random() * targetedKeys.length)];
              this.tileEffects[rk].isTargeted = false;
              this.tileEffects[rk].intentType = null;
              this.addFloatingText(this.arenaWidth / 2, 240, `Сова-Маг превратила удар по [${rk}] в облачко!`, '#a335ee', 1.8);
            }
          }
        }

        let unitDmg = unit.currentAtk || 0;
        if (unit.id === 'kiwi_secret') unitDmg += 10;
        if (unit.id === 'sacred_ibis') {
          const targetedCount = Object.values(this.tileEffects).filter(e => e.isTargeted).length;
          unitDmg += Math.max(12, targetedCount * 6);
          this.spawnShockwave(BOSS_CENTER.x, BOSS_CENTER.y + 30, 300, '#fbbf24', 0.5, 6);
        }

        if (unit.id === 'scavenger_pelican') {
          const trashItems = [
            { name: 'Жестянка', dmg: 8 },
            { name: 'Бутылка', dmg: 5 },
            { name: 'Крышка', dmg: 3 }
          ];
          const chosen = trashItems[Math.floor(Math.random() * trashItems.length)];
          unitDmg += chosen.dmg;
          const ut = ARENA_TILES_COORDS[unit.tileKey];
          if (ut) this.addFloatingText(ut.x + ut.w / 2, ut.y - 15, `Мусор (${chosen.name}): +${chosen.dmg} ур.!`, '#a7f3d0', 1.8);
        }

        const col = parseInt(unit.tileKey.split('x')[0], 10);
        const hasAdmiralInCol = Object.values(this.gridUnits).some(
          u => u.id === 'admiral_albatross' && parseInt(u.tileKey.split('x')[0], 10) === col && u.currentHp > 0
        );
        const strikeCount = (hasAdmiralInCol && unit.id !== 'admiral_albatross') ? 2 : 1;
        if (strikeCount > 1) {
          const ut = ARENA_TILES_COORDS[unit.tileKey];
          if (ut) this.addFloatingText(ut.x + ut.w / 2, ut.y - 25, 'Приказ Адмирала: Двойной удар!', '#38bdf8', 1.8);
        }

        unitDmg = Math.round(unitDmg * vulnMult);

        for (let strike = 0; strike < strikeCount; strike++) {
          if (unitDmg > 0) {
            audio.playClick();
            await this.animateUnitLunge(unit);

            let currentStrikeDmg = unitDmg;
            if (unit.id === 'woodpecker_drill' && this.boss.armor > 0) {
              this.boss.armor = 0;
              this.addFloatingText(this.arenaWidth / 2, 180, 'Перфоратор Дятла разнёс щит Бобра!', '#ffd166', 1.6);
            } else if (this.boss.armor > 0) {
              const absorbed = Math.min(this.boss.armor, currentStrikeDmg);
              this.boss.armor -= absorbed;
              currentStrikeDmg -= absorbed;
            }

            totalBirdsDamage += currentStrikeDmg;
            if (strikeCount > 1 && strike === 0) await this.sleep(180);
          }
        }
      }

      this.boss.hp = Math.max(0, this.boss.hp - totalBirdsDamage);
      this.boss.hitFlashTimer = 0.5;
      this.screenShake(14, 0.4);
      if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();
      this.addFloatingText(this.arenaWidth / 2, 200, `-${totalBirdsDamage} УРОНА БОССУ!`, '#ff3333', 2.0);
      this.checkBossPhaseTransition();
      this.updateHUD();

      await this.sleep(550);
    }

    if (this.boss.hp <= 0) {
      this.boss.hp = 0;
      this.updateHUD();
      this.handleVictory();
      return;
    }

    // Шаг 3: Ответная атака Бобра с кодовыми анимациями пилы, брёвен и топора
    if (bossStunnedThisRound) {
      await this.sleep(450);
    } else if (bossAccuracyPenalty && Math.random() < 0.5) {
      this.addFloatingText(this.arenaWidth / 2, 180, 'Бобёр смутился труселей Орла с сердечками и ПРОМАХНУЛСЯ!', '#ff6b8b', 2.4);
      await this.sleep(650);
    } else {
      this.addFloatingText(this.arenaWidth / 2, 160, 'БОБЁР НАНОСИТ УДАР!', '#e63946', 2.0);
      if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();

      // Проигрываем полёт брёвен, проход циркулярной пилы и удар топора!
      await this.playBossAttackVFX();
      this.screenShake(18, 0.45);

      let directPlayerDamage = 0;
      let totalBirdDamageTaken = 0;
      const hasOdinRaven = Object.values(this.gridUnits).some(u => u.id === 'odin_raven' && u.currentHp > 0);
      const interceptorUnit = Object.values(this.gridUnits).find(
        u => (u.id === 'guard_goose' || u.id === 'streamer_owl') && u.currentHp > 0
      );

      const applyDamageToUnit = (unit, rawDmg, tile, currentIntent = null) => {
        if (!unit) return;
        const cx = tile.x + tile.w / 2;
        const cy = tile.y + tile.h / 2;

        if (unit.id === 'kiwi_secret' || unit.id === 'feathered_king') {
          this.addFloatingText(cx, tile.y - 10, 'Укрытие! 0 урона', '#38bdf8', 1.5);
          return;
        }
        if (unit.painImmune) {
          this.spawnShockwave(cx, cy, 55, '#ff6b8b', 0.35, 3);
          this.addFloatingText(cx, tile.y - 10, 'Антидепрессанты! 0 HP', '#ff6b8b', 1.6);
          return;
        }
        if (unit.id === 'guard_goose' && Math.random() < 0.5) {
          this.spawnShockwave(cx, cy, 55, '#ffd166', 0.35, 3);
          this.addFloatingText(cx, tile.y - 10, 'Фейсконтроль! 0 урона', '#ffd166', 1.6);
          return;
        }
        if (unit.id === 'viking_goose' && !unit.shieldBlocked) {
          unit.shieldBlocked = true;
          this.boss.hp = Math.max(0, this.boss.hp - 20);
          this.spawnSlashEffect(BOSS_CENTER.x, BOSS_CENTER.y + 20, '#f39c12', 0.45);
          this.addFloatingText(cx, tile.y - 10, 'Щит Вальхаллы! Контрудар -20 HP!', '#f39c12', 2.0);
          return;
        }
        if (unit.id === 'secretary_bird' && currentIntent === 'BREACH') {
          this.boss.hp = Math.max(0, this.boss.hp - rawDmg);
          this.spawnSlashEffect(BOSS_CENTER.x, BOSS_CENTER.y + 20, '#2ecc71', 0.45);
          this.addFloatingText(cx, tile.y - 12, `Отказ в приёме: -${rawDmg} в Бобра!`, '#2ecc71', 2.0);
          return;
        }

        const unitRow = parseInt(unit.tileKey.split('x')[1], 10);
        const hasTourist = Object.values(this.gridUnits).some(
          u => u.id === 'tourist_sandpiper' && parseInt(u.tileKey.split('x')[1], 10) === unitRow && u.currentHp > 0
        );
        if (hasTourist) {
          rawDmg = Math.max(1, Math.round(rawDmg * 0.6));
        }

        const hasClimber = Object.values(this.gridUnits).some(
          u => u.id === 'climber_puffin' && parseInt(u.tileKey.split('x')[1], 10) === unitRow && u.currentHp > 0
        );
        if (hasClimber) {
          const birdsInRow = Object.values(this.gridUnits).filter(
            u => parseInt(u.tileKey.split('x')[1], 10) === unitRow && u.currentHp > 0
          ).length;
          rawDmg = Math.max(1, Math.round((rawDmg - birdsInRow * 4) / Math.max(1, birdsInRow)));
        }

        let dmg = Math.max(1, Math.round(rawDmg * bossDamageMult));
        if (unit.id === 'brave_drake') dmg = Math.max(1, dmg - 6);

        unit.currentHp -= dmg;
        totalBirdDamageTaken += dmg;
        unit.hitAnim = 0.5;
        this.spawnParticles(cx, cy, 14, { colors: ['#ff4d4d', '#ffd166', '#d97706'], speed: 150, shape: 'wood' });

        if (unit.id === 'owl_sparta' && unit.currentHp > 0) {
          this.boss.hp = Math.max(0, this.boss.hp - 14);
          this.spawnSlashEffect(BOSS_CENTER.x, BOSS_CENTER.y + 20, '#ffd166', 0.35);
          this.addFloatingText(cx, tile.y - 28, 'Копьё Афины: -14 HP Бобру!', '#ffd166', 1.7);
        }

        if (unit.id === 'imperial_penguin') {
          let buffed = 0;
          this.player.hand.forEach(c => {
            if (c.restRounds && c.restRounds > 0) {
              c.atk = (c.atk || 0) + 2;
              buffed++;
            }
          });
          if (buffed > 0) {
            this.addFloatingText(cx, tile.y - 25, `Император: +2 ATK спящим в руке!`, '#fbbf24', 1.8);
          }
        }

        const hasSirin = Object.values(this.gridUnits).some(u => u.id === 'sirin_bird' && u.currentHp > 0);
        if (hasSirin && this.tileEffects[unit.tileKey]?.isRune) {
          unit.currentHp = Math.min(unit.maxHp, unit.currentHp + 5);
          this.addFloatingText(cx, tile.y - 25, 'Песнь Сирин: +5 HP на руне!', '#c084fc', 1.6);
        }

        if (unit.currentHp <= 0) {
          if (hasOdinRaven && unit.id !== 'odin_raven' && !unit.isDecoy && !unit.hasResurrectedThisRound) {
            unit.hasResurrectedThisRound = true;
            unit.currentHp = unit.maxHp;
            this.spawnShockwave(cx, cy, 85, '#ffd166', 0.5, 5);
            this.addFloatingText(cx, tile.y - 12, 'Врата Вальхаллы: Воскрешён со 100% HP!', '#ffd166', 2.2);
          } else {
            unit.currentHp = 0;
            this.addFloatingText(cx, tile.y - 10, `${unit.name} повержен!`, '#ff4d4d', 1.8);
          }
        } else {
          this.addFloatingText(cx, tile.y - 10, `Блок! -${dmg} HP`, '#55efc4', 1.5);
        }
      };

      for (const [key, effect] of Object.entries(this.tileEffects)) {
        if (!effect.isTargeted) continue;

        effect.shakeTimer = 0.5;
        effect.sinkOffset = 10;
        const rawDamage = effect.intentDamage || 6;
        const unit = this.gridUnits[key];
        const tile = ARENA_TILES_COORDS[key];
        const cx = tile.x + tile.w / 2;
        const cy = tile.y + tile.h / 2;

        this.spawnParticles(cx, cy, 12, { colors: ['#d97706', '#fbbf24'], speed: 130, shape: 'wood' });

        if (effect.intentType === 'BREACH') {
          const simurgh = Object.values(this.gridUnits).find(u => u.id === 'sand_simurgh' && u.currentHp > 0);
          let breachDamage = rawDamage;
          if (simurgh) {
            breachDamage = Math.max(1, Math.round(rawDamage * 0.75));
            const absorbed = rawDamage - breachDamage;
            simurgh.currentHp += absorbed;
            simurgh.maxHp += absorbed;
            const st = ARENA_TILES_COORDS[simurgh.tileKey];
            if (st) this.addFloatingText(st.x + st.w / 2, st.y - 20, `Симург поглотил ${absorbed} ур.!`, '#fbbf24', 1.8);
          }

          const canBlockBreach = unit && unit.id !== 'kiwi_secret' && unit.id !== 'feathered_king';
          if (canBlockBreach) {
            applyDamageToUnit(unit, breachDamage, tile, 'BREACH');
          } else if (interceptorUnit && interceptorUnit.currentHp > 0) {
            const intTile = ARENA_TILES_COORDS[interceptorUnit.tileKey] || tile;
            this.addFloatingText(intTile.x + intTile.w / 2, intTile.y - 24, `${interceptorUnit.name} перехватил прорыв!`, '#ffd166', 1.7);
            applyDamageToUnit(interceptorUnit, breachDamage, intTile, 'BREACH');
          } else {
            const heroDmg = Math.max(1, Math.round(breachDamage * bossDamageMult));
            directPlayerDamage += heroDmg;
            this.spawnShockwave(cx, cy, 70, '#ff2233', 0.4, 4);
            this.addFloatingText(cx, tile.y + 20, `ПРОРЫВ! -${heroDmg} HP`, '#ff3838', 2.0);
          }
        } else if (effect.intentType === 'SAW_AOE') {
          if (unit) applyDamageToUnit(unit, rawDamage, tile, 'SAW_AOE');
        } else if (effect.intentType === 'HEAVY_AXE') {
          if (unit) {
            applyDamageToUnit(unit, rawDamage, tile, 'HEAVY_AXE');
            if (unit.currentHp > 0) {
              this.boss.vulnerable = true;
              this.spawnShockwave(cx, cy, 95, '#a335ee', 0.55, 5);
              this.addFloatingText(cx, tile.y - 28, 'Топор Бобра застрял! Босс УЯЗВИМ (+50% ур.)!', '#a335ee', 2.4);
            }
          }
        }
      }

      const advocate = Object.values(this.gridUnits).find(u => u.id === 'advocate_pelican' && u.currentHp > 0);
      if (advocate && totalBirdDamageTaken > 0) {
        const counterDmg = Math.max(1, Math.floor(totalBirdDamageTaken * 0.5));
        this.boss.hp = Math.max(0, this.boss.hp - counterDmg);
        this.spawnSlashEffect(BOSS_CENTER.x, BOSS_CENTER.y + 20, '#ffd166', 0.45);
        this.addFloatingText(this.arenaWidth / 2, 210, `Встречный иск Пеликана: -${counterDmg} HP Бобру!`, '#ffd166', 2.2);
      }

      if (this.player.round >= 3) {
        const allKeys = Object.keys(ARENA_TILES_COORDS);
        const tarKey = allKeys[Math.floor(Math.random() * allKeys.length)];
        if (this.tileEffects[tarKey].burningRounds <= 0 && this.tileEffects[tarKey].elixirRounds <= 0) {
          this.tileEffects[tarKey].tarRounds = 2;
        }
      }

      if (directPlayerDamage > 0) {
        await this.sleep(320);
        this.player.hp = Math.max(0, this.player.hp - directPlayerDamage);
        this.screenShake(22, 0.55);
        audio.playBonk();
        this.addFloatingText(this.arenaWidth / 2, 430, `УРОН ИГРОКУ: -${directPlayerDamage} HP!`, '#ff3838', 2.4);
        this.updateHUD();
      }
    }

    if (this.boss.hp <= 0) {
      this.boss.hp = 0;
      this.updateHUD();
      this.handleVictory();
      return;
    }

    await this.sleep(550);

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.updateHUD();
      this.handleDefeat();
      return;
    }

    // Шаг 4: Лечение в конце раунда
    for (const [key, unit] of Object.entries(this.gridUnits)) {
      if (!unit || unit.currentHp <= 0 || unit.isDecoy) continue;
      if (unit.id === 'robin_gardener') {
        this.getNeighborKeys(key).forEach(nk => {
          const neighbor = this.gridUnits[nk];
          if (neighbor && neighbor.currentHp > 0 && !neighbor.isDecoy) {
            neighbor.currentHp = Math.min(neighbor.maxHp, neighbor.currentHp + 8);
          }
        });
        const tile = ARENA_TILES_COORDS[key];
        this.spawnShockwave(tile.x + tile.w / 2, tile.y + tile.h / 2, 110, '#2ecc71', 0.4, 3);
        this.addFloatingText(tile.x + tile.w / 2, tile.y, '+8 HP соседям (Компост)', '#2ecc71', 1.5);
      }
      if (unit.id === 'bartender_toucan') {
        const r = parseInt(key.split('x')[1], 10);
        if (r > 1) {
          this.getNeighborKeys(key).forEach(nk => {
            const neighbor = this.gridUnits[nk];
            if (neighbor && neighbor.currentHp > 0 && !neighbor.isDecoy) {
              neighbor.currentHp = Math.min(neighbor.maxHp, neighbor.currentHp + 4);
            }
          });
          const tile = ARENA_TILES_COORDS[key];
          this.addFloatingText(tile.x + tile.w / 2, tile.y, '+4 HP соседям (Бармен)', '#2ecc71', 1.5);
        }
      }
      if (this.tileEffects[key]?.elixirRounds > 0) {
        unit.currentHp = Math.min(unit.maxHp, unit.currentHp + 4);
      }
    }

    this.player.hand.forEach(c => {
      if (c.restRounds && c.restRounds > 0) {
        c.restRounds--;
        if (c.currentHp !== undefined && c.currentHp < c.hp) {
          c.currentHp = Math.min(c.hp, c.currentHp + 4);
        }
      }
    });

    // Шаг 5: Возврат выживших карт в руку (с отдыхом 1 ход)
    const nextGridUnits = {};

    for (const [key, unit] of Object.entries(this.gridUnits)) {
      if (unit.isDecoy) continue;

      if (unit.currentHp > 0) {
        const hasRocker = Object.values(this.gridUnits).some(u => u.id === 'rocker_capercaillie');
        if (this.tileEffects[key]?.tarRounds > 0 && !hasRocker) {
          unit.hasResurrectedThisRound = false;
          nextGridUnits[key] = unit;
          const tile = ARENA_TILES_COORDS[key];
          this.addFloatingText(tile.x + tile.w / 2, tile.y, 'Увяз в смоле!', '#f97316', 1.6);
        } else {
          let restTurns = 1;
          if (unit.id === 'plantain_cuckoo') restTurns = 0;
          else if (unit.id === 'bodybuilder_sparrow') restTurns = 2;
          this.player.hand.push({
            id: unit.id,
            name: unit.name,
            subname: unit.subname,
            role: unit.role,
            rarity: unit.rarity,
            image: unit.image,
            fullArtImage: unit.fullArtImage || getFullArtPath(unit.image),
            atk: unit.atk,
            hp: unit.hp,
            currentHp: Math.min(unit.hp, unit.currentHp),
            abilityName: unit.abilityName,
            abilityDesc: unit.abilityDesc,
            price: unit.price,
            restRounds: restTurns
          });
        }
      } else {
        this.player.discard.push({
          id: unit.id,
          name: unit.name,
          subname: unit.subname,
          role: unit.role,
          rarity: unit.rarity,
          image: unit.image,
          fullArtImage: unit.fullArtImage || getFullArtPath(unit.image),
          atk: unit.atk,
          hp: unit.hp,
          currentHp: 0,
          abilityName: unit.abilityName,
          abilityDesc: unit.abilityDesc,
          price: unit.price,
          restRounds: 0
        });
      }
    }

    for (const eff of Object.values(this.tileEffects)) {
      if (eff.tarRounds > 0) eff.tarRounds--;
      if (eff.elixirRounds > 0) eff.elixirRounds--;
    }

    if (this.player.torchCooldown > 0) this.player.torchCooldown--;

    this.gridUnits = nextGridUnits;
    this.recalculateBoardAuras();
    this.renderHandDOM();
    this.updateHUD();

    await this.sleep(300);

    this.player.round++;
    this.drawCards(2);
    this.generateBossIntents();

    this.isResolvingTurn = false;
    if (btn) btn.disabled = false;
    this.updateHUD();
  }

  handleDefeat() {
    audio.playBonk();
    this.addFloatingText(this.arenaWidth / 2, 300, 'ВАША ЗАЩИТА ПАЛА!', '#ff4d4d', 3.0);

    setTimeout(() => {
      const modal = document.createElement('div');
      modal.id = 'boss-defeat-modal';
      modal.className = 'boss-defeat-modal-overlay';
      modal.innerHTML = `
        <div class="boss-defeat-window">
          <div class="boss-defeat-title-header">
            <span class="boss-defeat-title-text">ЗАЩИТА ПАЛА</span>
          </div>
          <div class="boss-defeat-content">
            <div class="boss-defeat-message">
              <p class="boss-defeat-main-text">Бобёр-Дровосек пробил незащищённые клетки плотины!</p>
              <p class="boss-defeat-prompt-text">Перекрывайте красные клетки пернатыми танками и уводите птиц из-под оранжевой пилы.</p>
            </div>
            <div class="boss-defeat-actions">
              <button class="btn-leaf-green" id="btn-boss-retry" title="Попробовать бой снова">
                <span class="btn-leaf-green-text">В БОЙ СНОВА</span>
              </button>
              <button class="btn-leaf-green btn-boss-to-market" id="btn-boss-to-market" title="Вернуться в Магазин Карт">
                <span class="btn-leaf-green-text">В МАГАЗИН</span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btn-boss-retry')?.addEventListener('click', () => {
        audio.playClick();
        modal.remove();
        this.start();
      });

      modal.querySelector('#btn-boss-to-market')?.addEventListener('click', () => {
        audio.playClick();
        modal.remove();
        this.stop();
        events.emit('stage:open_market');
      });
    }, 1000);
  }

  handleVictory() {
    audio.playSuccess();
    this.spawnShockwave(BOSS_CENTER.x, BOSS_CENTER.y, 600, '#ffd166', 1.1, 10);
    this.spawnParticles(BOSS_CENTER.x, BOSS_CENTER.y, 90, {
      colors: ['#ffd166', '#2ecc71', '#38bdf8', '#ff6b8b'],
      speed: 380,
      size: 7
    });
    this.addFloatingText(this.arenaWidth / 2, 300, 'ПОБЕДА! ПЛОТИНА СВОБОДНА!', '#ffd166', 4.0);
    this.showToast('ПОЗДРАВЛЯЕМ! Вы одолели Бобра-Дровосека и освободили лес!');
    setTimeout(() => {
      events.emit('stage:exit_to_title');
    }, 2400);
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

  screenShake(intensity = 10, duration = 0.4) {
    this.screenShakeIntensity = intensity;
    this.screenShakeTimer = duration;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ==========================================================================
     Мышь: Ховер по клеткам 5x3, факелам и клик
     ========================================================================== */
  getCanvasMousePos(e) {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.arenaWidth / rect.width;
    const scaleY = this.arenaHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  handleMouseMove(e) {
    if (!this.isActive) return;
    const pos = this.getCanvasMousePos(e);
    this.mousePos = pos;

    let foundKey = null;
    for (const [key, coords] of Object.entries(ARENA_TILES_COORDS)) {
      if (
        pos.x >= coords.x &&
        pos.x <= coords.x + coords.w &&
        pos.y >= coords.y &&
        pos.y <= coords.y + coords.h
      ) {
        foundKey = key;
        break;
      }
    }
    this.hoveredTileKey = foundKey;

    let foundProp = null;
    for (const [pKey, prop] of Object.entries(ARENA_PROPS)) {
      if (Math.hypot(pos.x - prop.x, pos.y - prop.y) <= prop.r) {
        foundProp = pKey;
        break;
      }
    }
    this.hoveredPropKey = foundProp;
  }

  handleMouseLeave() {
    this.hoveredTileKey = null;
    this.hoveredPropKey = null;
  }

  handleCanvasClick(e) {
    if (!this.isActive || this.isResolvingTurn) return;
    const pos = this.getCanvasMousePos(e);

    for (const [pKey, prop] of Object.entries(ARENA_PROPS)) {
      if (Math.hypot(pos.x - prop.x, pos.y - prop.y) <= prop.r) {
        this.activateArenaTorch(pKey);
        return;
      }
    }

    for (const [key, coords] of Object.entries(ARENA_TILES_COORDS)) {
      if (
        pos.x >= coords.x &&
        pos.x <= coords.x + coords.w &&
        pos.y >= coords.y &&
        pos.y <= coords.y + coords.h
      ) {
        if (this.player.selectedCardIndex >= 0) {
          this.placeCardOnTile(key);
        } else if (this.gridUnits[key]) {
          this.recallUnitFromTile(key);
        }
        break;
      }
    }
  }

  openCardInspect(card) {
    if (!card) return;
    this.closeCardInspect();
    this.isInspectOpen = true;

    audio.playClick();

    const displayHp = card.currentHp !== undefined ? card.currentHp : (card.hp || 10);
    const maxHp = card.maxHp || card.hp || 10;
    const rarity = card.rarity || 'common';
    const rarityTitles = {
      common: 'Обычная карта',
      uncommon: 'Необычная карта',
      rare: 'Редкая карта',
      epic: 'Эпическая карта',
      legendary: 'Легендарная карта'
    };
    const rarityText = rarityTitles[rarity] || 'Карта существа';

    let statusText = 'В руке (Готова)';
    let statusColor = '#4ede80';
    if (card.tileKey) {
      statusText = `Клетка [${card.tileKey}]`;
      statusColor = '#ffb703';
    } else if (card.restRounds && card.restRounds > 0) {
      statusText = `Передышка (${card.restRounds} х.)`;
      statusColor = '#38bdf8';
    }

    const modal = document.createElement('div');
    modal.id = 'boss-card-inspect-modal';
    modal.className = 'boss-card-inspect-modal';

    modal.innerHTML = `
      <div class="boss-card-inspect-dialog">
        <button class="inspect-dialog-close-x" id="btn-inspect-close-x" aria-label="Закрыть" title="Закрыть [ESC]"></button>

        <div class="inspect-card-preview-wrap ${rarity}">
          <img src="${card.image}" alt="${card.name}" class="inspect-card-img" draggable="false" />
        </div>

        <div class="inspect-info-panel">
          <div class="inspect-header">
            <div class="inspect-name-row">
              <h2 class="inspect-card-name">${card.name}</h2>
              <span class="inspect-rarity-badge ${rarity}">${rarityText}</span>
            </div>
            ${card.subname ? `<div class="inspect-card-subname">«${card.subname}»</div>` : ''}
          </div>

          <div class="inspect-stats-grid">
            <div class="inspect-stat-tile stat-metal">
              <span class="inspect-stat-label">АТАКА</span>
              <span class="inspect-stat-val val-atk">${card.currentAtk !== undefined ? card.currentAtk : card.atk} ATK</span>
            </div>

            <div class="inspect-stat-tile stat-metal">
              <span class="inspect-stat-label">ЗДОРОВЬЕ</span>
              <span class="inspect-stat-val val-hp">${displayHp} / ${maxHp} HP</span>
            </div>

            <div class="inspect-stat-tile stat-wood">
              <span class="inspect-stat-label">РОЛЬ В БОЮ</span>
              <span class="inspect-stat-val val-role">${card.role || 'Боец'}</span>
            </div>

            <div class="inspect-stat-tile stat-wood">
              <span class="inspect-stat-label">СОСТОЯНИЕ</span>
              <span class="inspect-stat-val val-status" style="color: ${statusColor};">
                ${statusText}
              </span>
            </div>
          </div>

          <div class="inspect-ability-box">
            <div class="inspect-ability-title">СПОСОБНОСТЬ: ${card.abilityName || 'Боевой навык'}</div>
            <div class="inspect-ability-desc">
              ${card.abilityDesc || 'Базовое пернатое существо. Атакует босса в фазе боя и блокирует входящий урон на занятой клетке.'}
            </div>
          </div>

          <div class="inspect-footer">
            <span class="inspect-hint">Нажмите [ESC] или в любом месте, чтобы закрыть</span>
            <button class="inspect-close-btn" id="btn-inspect-close">ВЕРНУТЬСЯ К БОЮ ▶</button>
          </div>
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeCardInspect();
    });

    modal.querySelector('#btn-inspect-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeCardInspect();
    });

    modal.querySelector('#btn-inspect-close-x')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeCardInspect();
    });

    const previewWrap = modal.querySelector('.inspect-card-preview-wrap');
    if (previewWrap) {
      attach3DHoloTilt(previewWrap, rarity, 18);
    }

    const gameContainer = document.getElementById('game-container') || document.body;
    gameContainer.appendChild(modal);
    this.inspectModalEl = modal;
  }

  closeCardInspect() {
    if (this.inspectModalEl) {
      audio.playClick();
      this.inspectModalEl.remove();
      this.inspectModalEl = null;
    }
    this.isInspectOpen = false;
  }

  addFloatingText(x, y, text, color = '#ffd166', duration = 1.5) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: duration,
      maxLife: duration,
      vy: -32
    });
  }

  /* ==========================================================================
     Игровой цикл: Update и Render (со всеми процедурными спецэффектами)
     ========================================================================== */
  update(dt) {
    if (!this.isActive) return;

    this.animTime += dt;
    this.ambientSpawnTimer += dt;

    // Фоновые атмосферные частицы по стадиям боя (искры от пил в стадии 2, пепел в стадии 3)
    if (this.ambientSpawnTimer >= 0.08) {
      this.ambientSpawnTimer = 0;
      if (this.boss.phase >= 2) {
        this.spawnParticles(525 + (Math.random() > 0.5 ? 325 : 0), 145, 1, {
          colors: ['#ff8800', '#ffd166'],
          speed: 75,
          size: 3,
          life: 0.45,
          upwardBoost: -40,
          shape: 'spark'
        });
      }
      if (this.boss.phase === 3) {
        this.spawnParticles(Math.random() * this.arenaWidth, 40, 1, {
          colors: ['#ff2233', '#ff5722'],
          speed: 40,
          gravity: 55,
          size: 4,
          life: 1.4
        });
      }
    }

    if (this.boss.hitFlashTimer > 0) {
      this.boss.hitFlashTimer = Math.max(0, this.boss.hitFlashTimer - dt);
    }

    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer = Math.max(0, this.screenShakeTimer - dt);
    }

    // Обновление плит (тряска и возврат после проседания)
    for (const eff of Object.values(this.tileEffects)) {
      if (eff.shakeTimer > 0) eff.shakeTimer = Math.max(0, eff.shakeTimer - dt);
      if (eff.sinkOffset > 0) eff.sinkOffset = Math.max(0, eff.sinkOffset - dt * 28);
    }

    // Обновление боевых единиц и их пружинного выпада (Lunge)
    for (const unit of Object.values(this.gridUnits)) {
      if (unit.spawnAnim > 0) unit.spawnAnim = Math.max(0, unit.spawnAnim - dt * 3);
      if (unit.hitAnim > 0) unit.hitAnim = Math.max(0, unit.hitAnim - dt * 2.5);

      if (unit.lungeDuration > 0) {
        const prevTime = unit.lungeTime;
        unit.lungeTime += dt;
        const half = unit.lungeDuration * 0.45;
        if (prevTime < half && unit.lungeTime >= half && unit.onLungePeak) {
          unit.onLungePeak();
          unit.onLungePeak = null;
        }
        if (unit.lungeTime >= unit.lungeDuration) {
          unit.lungeTime = 0;
          unit.lungeDuration = 0;
        }
      }
    }

    // Обновление снарядов Безье (огненные дуги от факелов, магия Совы)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.elapsed += dt;
      const t = Math.min(1, p.elapsed / p.duration);
      const inv = 1 - t;
      p.x = inv * inv * p.startX + 2 * inv * t * p.cpX + t * t * p.targetX;
      p.y = inv * inv * p.startY + 2 * inv * t * p.cpY + t * t * p.targetY;

      // Хвост частиц за снарядом
      this.spawnParticles(p.x, p.y, 2, {
        colors: [p.color, '#ffd166', '#ffffff'],
        speed: 45,
        gravity: 20,
        size: 5,
        life: 0.25
      });

      if (t >= 1) {
        if (p.onHit) p.onHit();
        this.projectiles.splice(i, 1);
      }
    }

    // Обновление активных атак Бобра (Крутящаяся пила и Катящееся бревно)
    for (let i = this.activeHazards.length - 1; i >= 0; i--) {
      const h = this.activeHazards[i];
      h.elapsed += dt;
      const t = Math.min(1, h.elapsed / h.duration);

      if (h.type === 'saw') {
        h.x = h.startX + (h.endX - h.startX) * t;
        this.spawnParticles(h.x, h.y + 10, 3, {
          colors: ['#ffb703', '#ff5722', '#ffffff'],
          speed: 190,
          upwardBoost: -90,
          size: 4,
          life: 0.3,
          shape: 'spark'
        });
      } else if (h.type === 'log') {
        h.x = h.startX + (h.endX - h.startX) * t;
        h.y = h.startY + (h.endY - h.startY) * t - Math.abs(Math.sin(t * Math.PI * 3)) * 18;
      }

      if (t >= 1) {
        this.activeHazards.splice(i, 1);
      }
    }

    // Обновление ударных волн и слешей
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      const p = 1 - sw.life / sw.maxLife;
      sw.radius = 10 + (sw.maxRadius - 10) * p;
      if (sw.life <= 0) this.shockwaves.splice(i, 1);
    }

    // Обновление частиц
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.rotation += pt.vRot * dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    // Обновление всплывающих текстов
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  render(alpha) {
    if (!this.isActive || !this.ctx) return;

    this.ctx.save();

    if (this.screenShakeTimer > 0) {
      const ox = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      const oy = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      this.ctx.translate(ox, oy);
    }

    // 1. Базовый видео-фон арены
    const isVideoReady = this.bgVideo && (this.bgVideo.readyState >= 2 || !this.bgVideo.paused);
    if (isVideoReady) {
      this.ctx.drawImage(this.bgVideo, 0, 0, this.arenaWidth, this.arenaHeight);
    } else if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      this.ctx.drawImage(this.bgImage, 0, 0, this.arenaWidth, this.arenaHeight);
    } else {
      this.ctx.fillStyle = '#1a1614';
      this.ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);
    }

    // Аура ярости Бобра во 2 и 3 стадии боя
    this.renderBossStageAtmosphere();

    // 2. Отрисовка 15 интерактивных тайлов (с левитацией рун и проседанием)
    this.renderTiles();

    // 3. Отрисовка интерактивных факелов
    this.renderInteractiveProps();

    // 4. Отрисовка выставленных птиц (с анимацией выпада Lunge)
    this.renderPlacedUnits();

    // 5. Отрисовка активных пил, брёвен, снарядов, ударных волн и частиц
    this.renderProceduralVFX();

    // 6. Отрисовка всплывающего текста
    this.renderFloatingTexts();

    this.ctx.restore();
  }

  renderBossStageAtmosphere() {
    this.ctx.save();

    // Вспышка при получении урона боссом
    if (this.boss.hitFlashTimer > 0) {
      this.ctx.globalCompositeOperation = 'lighter';
      const grad = this.ctx.createRadialGradient(BOSS_CENTER.x, BOSS_CENTER.y, 10, BOSS_CENTER.x, BOSS_CENTER.y, 210);
      grad.addColorStop(0, `rgba(255, 90, 50, ${this.boss.hitFlashTimer * 0.75})`);
      grad.addColorStop(1, 'rgba(255, 50, 50, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(BOSS_CENTER.x, BOSS_CENTER.y, 210, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Защитный энергетический купол Бобра, если активна броня плотины
    if (this.boss.armor > 0) {
      const shieldPulse = Math.sin(this.animTime * 5) * 0.1 + 0.35;
      this.ctx.strokeStyle = `rgba(251, 191, 36, ${shieldPulse + 0.3})`;
      this.ctx.lineWidth = 3.5;
      this.ctx.beginPath();
      this.ctx.ellipse(BOSS_CENTER.x, BOSS_CENTER.y + 25, 135, 78, 0, Math.PI, Math.PI * 2);
      this.ctx.stroke();
    }

    // В 3-й стадии (Берсерк) добавляем пульсирующую багровую виньетку по краям экрана
    if (this.boss.phase === 3) {
      const rageAlpha = (Math.sin(this.animTime * 4) * 0.5 + 0.5) * 0.22 + 0.08;
      const vig = this.ctx.createRadialGradient(
        this.arenaWidth / 2, this.arenaHeight / 2, 320,
        this.arenaWidth / 2, this.arenaHeight / 2, 780
      );
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, `rgba(220, 20, 40, ${rageAlpha})`);
      this.ctx.fillStyle = vig;
      this.ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);
    }

    this.ctx.restore();
  }

  renderInteractiveProps() {
    for (const [pKey, prop] of Object.entries(ARENA_PROPS)) {
      const isHovered = this.hoveredPropKey === pKey;
      const isReady = this.player.torchCooldown === 0;

      this.ctx.save();

      // Мягкое аддитивное свечение живого огня поверх каждого факела на видео
      this.ctx.globalCompositeOperation = 'lighter';
      const flicker = Math.sin(this.animTime * 9 + prop.x) * 0.08 + 0.24;
      const glowRadius = isHovered ? prop.r * 1.9 : prop.r * 1.35;
      const grad = this.ctx.createRadialGradient(prop.x, prop.y, 4, prop.x, prop.y, glowRadius);
      grad.addColorStop(0, isReady ? `rgba(255, 200, 60, ${flicker + 0.2})` : 'rgba(148, 163, 184, 0.12)');
      grad.addColorStop(1, 'rgba(255, 87, 34, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(prop.x, prop.y, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Интерактивное кольцо при готовности или наведении курсора
      if (isReady || isHovered) {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = isReady ? '#ffd166' : '#9ca3af';
        this.ctx.lineWidth = isHovered ? 3 : 1.8;
        this.ctx.setLineDash([6, 4]);
        this.ctx.lineDashOffset = -this.animTime * 20;
        this.ctx.beginPath();
        this.ctx.arc(prop.x, prop.y, prop.r * 0.78, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      if (isHovered) {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.font = 'bold 13px "8bitoperator", monospace';
        this.ctx.fillStyle = '#ffd166';
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 6;
        this.ctx.textAlign = 'center';
        const label = isReady ? '🔥 Направить пламя (-10 HP Бобру, сжечь смолу)' : `Жаровня (КД: ${this.player.torchCooldown} х.)`;
        this.ctx.fillText(label, prop.x, prop.y - prop.r - 8);
      }

      this.ctx.restore();
    }
  }

  getTintedTileCanvas(key, colorHex, overlayAlpha = 0.65) {
    if (!this._tintedTileCache) this._tintedTileCache = {};
    const cacheKey = `${key}_${colorHex}_${overlayAlpha}`;
    if (this._tintedTileCache[cacheKey]) return this._tintedTileCache[cacheKey];

    const tileImg = this.tileImages[key];
    if (!tileImg || !tileImg.complete || tileImg.naturalWidth === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = tileImg.naturalWidth;
    canvas.height = tileImg.naturalHeight;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(tileImg, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = overlayAlpha;
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this._tintedTileCache[cacheKey] = canvas;
    return canvas;
  }

  renderTiles() {
    for (const [key, coords] of Object.entries(ARENA_TILES_COORDS)) {
      const isHovered = (this.hoveredTileKey === key);
      const isSelected = (this.player.selectedCardIndex >= 0);
      const eff = this.tileEffects[key];

      this.ctx.save();

      // Пружинное смещение плиты (левитация для рун и проседание при ударе/посадке)
      let drawX = coords.x;
      let drawY = coords.y + (eff.sinkOffset || 0);
      if (eff.isRune && !eff.isTargeted) {
        drawY += Math.sin(this.animTime * 3 + coords.col) * 2.5;
      }
      if (eff.shakeTimer > 0) {
        drawX += (Math.random() - 0.5) * 6;
        drawY += (Math.random() - 0.5) * 6;
      }

      const tileImg = this.tileImages[key];

      if ((eff.shakeTimer > 0 || eff.sinkOffset > 0) && !eff.isTargeted && !isHovered && eff.burningRounds <= 0) {
        if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
          this.ctx.drawImage(tileImg, drawX, drawY, coords.w, coords.h);
        }
      }

      // Изумрудное свечение рунических плит (+4 ATK)
      if (eff.isRune && !eff.isTargeted) {
        const runeTile = this.getTintedTileCanvas(key, '#10b981', 0.28);
        if (runeTile) {
          this.ctx.save();
          this.ctx.globalAlpha = 0.75;
          this.ctx.drawImage(runeTile, drawX, drawY, coords.w, coords.h);
          this.ctx.restore();
        }
      }

      // 3 типа угроз Бобра: BREACH (Красный), SAW_AOE (Оранжевый), HEAVY_AXE (Фиолетовый)
      if (eff.isTargeted) {
        const pulse = Math.sin(this.animTime * 6) * 0.2 + 0.8;
        let threatColor = '#ff2233';
        if (eff.intentType === 'SAW_AOE') threatColor = '#ff8800';
        else if (eff.intentType === 'HEAVY_AXE') threatColor = '#a335ee';

        const tintedTile = this.getTintedTileCanvas(key, threatColor, 0.68);
        if (tintedTile) {
          this.ctx.save();
          this.ctx.globalAlpha = pulse;
          this.ctx.shadowColor = threatColor;
          this.ctx.shadowBlur = 12;
          this.ctx.drawImage(tintedTile, drawX, drawY, coords.w, coords.h);
          this.ctx.restore();
        }

        this.ctx.save();
        this.ctx.font = 'bold 13px "8bitoperator", monospace';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 4;
        const tag = eff.intentType === 'BREACH' ? `ПРОРЫВ -${eff.intentDamage}` : `-${eff.intentDamage} HP`;
        this.ctx.fillText(tag, drawX + 10, drawY + coords.h - 10);
        this.ctx.restore();
      }

      if (eff.tarRounds > 0) {
        const tarTile = this.getTintedTileCanvas(key, '#451a03', 0.72);
        if (tarTile) this.ctx.drawImage(tarTile, drawX, drawY, coords.w, coords.h);
        this.ctx.font = 'bold 12px "8bitoperator", monospace';
        this.ctx.fillStyle = '#fde68a';
        this.ctx.fillText('СМОЛА', drawX + 10, drawY + 20);
      }

      if (eff.elixirRounds > 0) {
        const elixTile = this.getTintedTileCanvas(key, '#10b981', 0.55);
        if (elixTile) this.ctx.drawImage(elixTile, drawX, drawY, coords.w, coords.h);
        this.ctx.font = 'bold 12px "8bitoperator", monospace';
        this.ctx.fillStyle = '#a7f3d0';
        this.ctx.fillText('+4 HP', drawX + 10, drawY + 20);
      }

      if (eff.burningRounds > 0) {
        const burnPulse = Math.sin(this.animTime * 8) * 0.15 + 0.8;
        const burnTile = this.getTintedTileCanvas(key, '#ff6700', 0.6);
        if (burnTile) {
          this.ctx.save();
          this.ctx.globalAlpha = burnPulse;
          this.ctx.shadowColor = '#ff6700';
          this.ctx.shadowBlur = 14;
          this.ctx.drawImage(burnTile, drawX, drawY, coords.w, coords.h);
          this.ctx.restore();
        }
        this.ctx.font = '18px "8bitoperator", sans-serif';
        this.ctx.fillText('🔥', drawX + 8, drawY + 22);
      }

      if (isHovered) {
        const hoverColor = isSelected ? '#ffd166' : '#48cae4';
        const hoverTile = this.getTintedTileCanvas(key, hoverColor, isSelected ? 0.6 : 0.45);
        if (hoverTile) {
          const hoverPulse = Math.sin(this.animTime * 8) * 0.15 + 0.85;
          this.ctx.save();
          this.ctx.globalAlpha = hoverPulse;
          this.ctx.shadowColor = hoverColor;
          this.ctx.shadowBlur = 12;
          this.ctx.drawImage(hoverTile, drawX, drawY, coords.w, coords.h);
          this.ctx.restore();
        }
      }

      this.ctx.restore();
    }
  }

  drawRoundedRectPath(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  renderPlacedUnits() {
    for (const [key, unit] of Object.entries(this.gridUnits)) {
      const coords = ARENA_TILES_COORDS[key];
      if (!coords) continue;

      this.ctx.save();

      // Расчёт смещения при физическом выпаде карты к Боссу (Lunge)
      let lungeDX = 0;
      let lungeDY = 0;
      let lungeScale = 1.0;
      if (unit.lungeDuration > 0) {
        const p = unit.lungeTime / unit.lungeDuration;
        const wave = Math.sin(p * Math.PI);
        lungeDX = unit.lungeTargetDX * wave;
        lungeDY = unit.lungeTargetDY * wave;
        lungeScale = 1.0 + wave * 0.25;
      }

      const sink = this.tileEffects[key]?.sinkOffset || 0;
      const cx = coords.x + coords.w / 2 + lungeDX;
      const cy = coords.y + coords.h / 2 + lungeDY + sink;
      const bob = Math.sin(this.animTime * 4 + coords.col) * 3;
      const spawnScale = (unit.spawnAnim > 0 ? (1.3 - unit.spawnAnim * 0.3) : 1.0) * lungeScale;

      // Размер квадратного Full Art жетона пернатого героя
      const tokenSize = 78 * spawnScale;
      const tokenX = cx - tokenSize / 2;
      const tokenY = cy - tokenSize / 2 - 6 + bob;
      const cornerRadius = 12 * spawnScale;

      // Тень под жетоном на клетку арены
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy + tokenSize / 2 - 2, tokenSize * 0.44, 11, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Стиль рамки и свечения по редкости карты
      const rarityColors = {
        common:    { border: '#b0b8c1', glow: 'rgba(176, 184, 193, 0.4)' },
        uncommon:  { border: '#2ecc71', glow: 'rgba(46, 204, 113, 0.65)' },
        rare:      { border: '#38bdf8', glow: 'rgba(56, 189, 248, 0.75)' },
        epic:      { border: '#a855f7', glow: 'rgba(168, 85, 247, 0.85)' },
        legendary: { border: '#fbbf24', glow: 'rgba(251, 191, 36, 0.95)' }
      };
      const rarityStyle = rarityColors[unit.rarity] || rarityColors.common;

      // Загрузка Full Art изображения (квадратный чистый арт без рамки)
      const fullArtSrc = unit.fullArtImage || getFullArtPath(unit.image);
      let img = this.getCardImage(fullArtSrc);
      if (!img || !img.complete || img.naturalWidth === 0) {
        img = this.getCardImage(unit.image);
      }

      this.ctx.save();
      if (unit.hitAnim > 0) {
        this.ctx.filter = 'brightness(2.2) saturate(0.2)';
      }
      if (unit.isDecoy) {
        this.ctx.globalAlpha = 0.8;
      }

      // Мягкая внешняя тень и свечение редкости
      this.ctx.shadowColor = rarityStyle.glow;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetY = 3;

      // Подложка и скругленная маска
      this.ctx.beginPath();
      this.drawRoundedRectPath(this.ctx, tokenX, tokenY, tokenSize, tokenSize, cornerRadius);
      this.ctx.fillStyle = '#1e1b18';
      this.ctx.fill();

      // Отрисовка квадратного Full Art персонажа
      this.ctx.save();
      this.ctx.clip();

      if (img && img.complete && img.naturalWidth > 0) {
        this.ctx.drawImage(img, tokenX, tokenY, tokenSize, tokenSize);
      } else {
        this.ctx.fillStyle = '#ffb703';
        this.ctx.fillRect(tokenX, tokenY, tokenSize, tokenSize);
      }

      // Мистический фиолетовый оттенок для иллюзии Павлина
      if (unit.isDecoy) {
        this.ctx.fillStyle = 'rgba(163, 53, 238, 0.32)';
        this.ctx.fillRect(tokenX, tokenY, tokenSize, tokenSize);
      }
      this.ctx.restore();

      // Элегантная рамка жетона с цветом редкости
      this.ctx.beginPath();
      this.drawRoundedRectPath(this.ctx, tokenX, tokenY, tokenSize, tokenSize, cornerRadius);
      this.ctx.strokeStyle = rarityStyle.border;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      // Тонкий внутренний блик для объема
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.restore();

      // Бейдж ATK (слева внизу)
      if (unit.currentAtk > 0) {
        const atkX = cx - tokenSize / 2 + 10;
        const atkY = cy + tokenSize / 2 - 2 + bob;
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetY = 2;

        this.ctx.fillStyle = unit.currentAtk > unit.atk ? '#16a34a' : '#b7094c';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2.2;
        this.ctx.beginPath();
        this.ctx.arc(atkX, atkY, 13.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 13px "8bitoperator", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${unit.currentAtk}`, atkX, atkY + 1);
        this.ctx.restore();
      }

      // Бейдж HP (справа внизу)
      const isDamaged = unit.currentHp < unit.maxHp;
      const hpX = cx + tokenSize / 2 - 10;
      const hpY = cy + tokenSize / 2 - 2 + bob;
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      this.ctx.shadowBlur = 5;
      this.ctx.shadowOffsetY = 2;

      this.ctx.fillStyle = unit.painImmune ? '#ec4899' : (isDamaged ? '#d90429' : '#0077b6');
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2.2;
      this.ctx.beginPath();
      this.ctx.arc(hpX, hpY, 13.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 13px "8bitoperator", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${unit.currentHp}`, hpX, hpY + 1);
      this.ctx.restore();

      this.ctx.restore();
    }
  }

  /**
   * Отрисовка процедурных спецэффектов: вращающиеся пилы, катящиеся брёвна, снаряды, ударные кольца и частицы
   */
  renderProceduralVFX() {
    // 1. Активные опасности Бобра (Циркулярная пила и Катящееся бревно)
    for (const h of this.activeHazards) {
      this.ctx.save();
      if (h.type === 'saw') {
        this.ctx.translate(h.x, h.y);
        this.ctx.rotate(this.animTime * 28);

        // Зубчатый металлический диск пилы
        const teeth = 14;
        const outerR = 46;
        const innerR = 34;
        this.ctx.fillStyle = '#e5e7eb';
        this.ctx.strokeStyle = '#ff8800';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const a = (i * Math.PI) / teeth;
          if (i === 0) this.ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Раскалённый центр диска
        this.ctx.fillStyle = '#b91c1c';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (h.type === 'log') {
        this.ctx.translate(h.x, h.y);
        this.ctx.fillStyle = '#78350f';
        this.ctx.strokeStyle = '#451a03';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(-42, -18, 84, 36, 12);
        this.ctx.fill();
        this.ctx.stroke();

        // Годовые кольца на торцах бревна
        this.ctx.fillStyle = '#fde68a';
        this.ctx.beginPath();
        this.ctx.arc(-32, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // 2. Снаряды по кривой Безье (огненные шары факелов, магия)
    for (const p of this.projectiles) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'lighter';
      const grad = this.ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 24);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, p.color);
      grad.addColorStop(1, 'rgba(255, 87, 34, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 3. Ударные волны и крестовые росчерки (Slash)
    for (const sw of this.shockwaves) {
      this.ctx.save();
      const alpha = Math.max(0, sw.life / sw.maxLife);
      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = sw.color;
      this.ctx.lineWidth = sw.lineWidth * alpha;
      this.ctx.shadowColor = sw.color;
      this.ctx.shadowBlur = 12;

      if (sw.type === 'cross_slash') {
        const len = sw.radius;
        this.ctx.beginPath();
        this.ctx.moveTo(sw.x - len, sw.y - len * 0.6);
        this.ctx.lineTo(sw.x + len, sw.y + len * 0.6);
        this.ctx.moveTo(sw.x + len, sw.y - len * 0.6);
        this.ctx.lineTo(sw.x - len, sw.y + len * 0.6);
        this.ctx.stroke();
      } else {
        this.ctx.beginPath();
        this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    // 4. Частицы (искры, щепки, огонь)
    for (const pt of this.particles) {
      this.ctx.save();
      const alpha = Math.max(0, pt.life / pt.maxLife);
      this.ctx.globalAlpha = alpha;
      if (pt.glow) this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.fillStyle = pt.color;
      this.ctx.translate(pt.x, pt.y);
      this.ctx.rotate(pt.rotation);

      if (pt.shape === 'wood') {
        this.ctx.fillRect(-pt.size, -pt.size * 0.4, pt.size * 2, pt.size * 0.8);
      } else if (pt.shape === 'spark') {
        this.ctx.beginPath();
        this.ctx.moveTo(-pt.size * 1.6, 0);
        this.ctx.lineTo(0, -pt.size * 0.5);
        this.ctx.lineTo(pt.size * 1.6, 0);
        this.ctx.lineTo(0, pt.size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pt.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  renderFloatingTexts() {
    this.ctx.save();
    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, ft.life / 0.4);
      this.ctx.globalAlpha = alpha;
      this.ctx.font = 'bold 20px "8bitoperator", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      this.ctx.fillText(ft.text, ft.x + 2, ft.y + 2);

      this.ctx.fillStyle = ft.color;
      this.ctx.fillText(ft.text, ft.x, ft.y);
    }
    this.ctx.restore();
  }
}