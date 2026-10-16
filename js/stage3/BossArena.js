import { CARDS_DATABASE, getRandomStarterDeck } from './cardsData.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';

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



/**
 * Модуль финальной Арены Битвы с Бобром
 * Сетка 5x3 (15 тайлов), 26 уникальных карт, 3 типа угроз, передышка карт и интерактивное окружение
 */
export class BossArena {
  constructor(videoManager) {
    this.videoManager = videoManager;
    this.isActive = false;

    // Холст и контекст
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.arenaWidth = 1376;
    this.arenaHeight = 768;

    // Загрузка ассетов арены (фоновое видео IDE-BossArena.mp4 и статичный фоллбэк)
    this.bgVideo = document.createElement('video');
    this.bgVideo.src = 'assets/videos/IDE-BossArena.mp4';
    this.bgVideo.loop = true;
    this.bgVideo.muted = true;
    this.bgVideo.playsInline = true;
    this.bgVideo.setAttribute('playsinline', '');
    this.bgVideo.preload = 'auto';

    events.on('music:volume_changed', (vol) => {
      if (this.bgVideo) {
        this.bgVideo.volume = vol;
      }
    });

    events.on('sound:toggled', (enabled) => {
      if (this.bgVideo) {
        this.bgVideo.muted = !enabled;
      }
    });

    this.bgImage = new Image();
    this.bgImage.src = 'assets/Boss Fight/Bober/Arena Tile/Bober Fight Static.png';

    this.cardBackImage = new Image();
    this.cardBackImage.src = 'assets/Market/Card back/Back-Card01.png';

    // 15 индивидуальных тайлов
    this.tileImages = {};
    for (const key of Object.keys(ARENA_TILES_COORDS)) {
      const img = new Image();
      img.src = `assets/Boss Fight/Bober/Arena Tile/${key}.png`;
      this.tileImages[key] = img;
    }

    // Кэш изображений карт
    this.cardImagesCache = {};

    // Состояние босса
    this.boss = {
      name: 'БОБЁР-РАЗРУШИТЕЛЬ',
      title: 'Хранитель Лесной Плотины',
      maxHp: 360,
      hp: 360,
      armor: 0,
      poisonRounds: 0,
      vulnerable: false,     // Если топор застрял в камне (+50% урона по боссу)
      blockSpecNext: false,  // От Совы-Экзорциста
      hitFlashTimer: 0,
      intents: []
    };

    // Состояние игрока
    this.player = {
      maxHp: 100,
      hp: 100,
      round: 1,
      maxSummons: 3,
      deck: [],
      hand: [],
      discard: [],
      selectedCardIndex: -1
    };

    // Размещенные птицы на сетке { 'col x row': unitObject }
    this.gridUnits = {};

    // Эффекты на тайлах
    // intentType: null | 'BREACH' (красный прорыв в героя) | 'SAW_AOE' (оранжевая пила только по птицам) | 'HEAVY_AXE' (фиолетовый топор по рунам)
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
        shakeTimer: 0
      };
    }

    // Всплывающие надписи урона / эффектов
    this.floatingTexts = [];

    // Анимационные таймеры
    this.animTime = 0;
    this.screenShakeTimer = 0;
    this.screenShakeIntensity = 0;
    this.isResolvingTurn = false;

    // Мышь и взаимодействие
    this.hoveredTileKey = null;
    this.hoveredCardIndex = -1;
    this.mousePos = { x: -1, y: -1 };

    // DOM контейнер интерфейса карт и боя
    this.uiContainer = null;
    this.isInspectOpen = false;
    this.inspectModalEl = null;

    this.setupEvents();
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      if (this.isActive) {
        this.updateCanvasBounds();
      }
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
      if (wrapper) {
        wrapper.style.display = 'none';
      }
    }

    if (this.bgVideo) {
      try {
        this.bgVideo.currentTime = 0;
      } catch (e) {}
      const playPromise = this.bgVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[BossArena] Автоплей видео заблокирован со звуком, запускаем без звука:', err);
          this.bgVideo.muted = true;
          this.bgVideo.play().catch(() => {});
        });
      }
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));

    // Сброс состояния матча
    this.boss.name = 'БОБЁР-РАЗРУШИТЕЛЬ';
    this.boss.maxHp = 360;
    this.boss.hp = 360;
    this.boss.armor = 0;
    this.boss.poisonRounds = 0;
    this.boss.vulnerable = false;
    this.boss.blockSpecNext = false;
    this.boss.hitFlashTimer = 0;

    this.player.round = 1;
    this.player.maxHp = 100;
    this.player.hp = 100;
    this.player.maxSummons = 3;

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

    this.gridUnits = {};
    for (const key of Object.keys(this.tileEffects)) {
      this.tileEffects[key].burningRounds = 0;
      this.tileEffects[key].tarRounds = 0;
      this.tileEffects[key].elixirRounds = 0;
      this.tileEffects[key].isTargeted = false;
      this.tileEffects[key].intentType = null;
      this.tileEffects[key].intentDamage = 0;
    }
    this.floatingTexts = [];
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

    if (this.canvas) {
      this.canvas.style.display = 'none';
    }

    if (this.bgVideo) {
      this.bgVideo.pause();
    }

    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
      this.uiContainer = null;
    }

    const wrapper = document.getElementById('video-wrapper');
    if (wrapper) {
      wrapper.style.display = 'block';
    }

    console.log('🚪 [BossArena] Выход с Арены Босса');
  }

  /* ==========================================================================
     DOM HUD: Рука карт, здоровье игрока и индикатор босса
     ========================================================================== */
  createDomHUD() {
    if (this.uiContainer) {
      this.uiContainer.remove();
    }

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
        Красная клетка = Прорыв в героя (блокируйте!) | Оранжевая = Пила (не ставьте слабых!) | ЛКМ по птице на поле = вернуть в руку
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
      const armorTag = this.boss.armor > 0 ? ` [+${this.boss.armor} ЩИТ]` : '';
      const vulnTag = this.boss.vulnerable ? ' [УЯЗВИМ +50%]' : '';
      hpNum.textContent = `HP ${Math.max(0, this.boss.hp)}/${this.boss.maxHp}${armorTag}${vulnTag}`;
    }

    const playerNum = document.getElementById('player-hp-num');
    if (playerNum) {
      playerNum.textContent = `Игрок: ${Math.max(0, this.player.hp)}/${this.player.maxHp} HP`;
    }

    const deckCounter = document.getElementById('deck-counter');
    if (deckCounter) {
      deckCounter.textContent = `${this.player.deck.length}`;
    }

    const discardCounter = document.getElementById('discard-counter');
    if (discardCounter) {
      discardCounter.textContent = `${this.player.discard.length}`;
    }

    const roundCounter = document.getElementById('round-counter');
    if (roundCounter) {
      roundCounter.textContent = `Раунд ${this.player.round}`;
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

  /* ==========================================================================
     Рендер руки карт (с индикатором отдыха 1 ход после возврата с поля)
     ========================================================================== */
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
        if (card) {
          this.player.hand.push(card);
        }
      }
    }
    this.renderHandDOM();
    this.updateHUD();
  }

  /* ==========================================================================
     Выставление и возврат птицы с поля 5x3 (с поддержкой всех 26 способностей)
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

    // Если забираем Павлина — убираем и его иллюзии
    if (unit.id === 'magician_peacock') {
      for (const [k, u] of Object.entries(this.gridUnits)) {
        if (u.isDecoy) delete this.gridUnits[k];
      }
    }

    delete this.gridUnits[tileKey];
    this.player.hand.push({
      id: unit.id,
      name: unit.name,
      subname: unit.subname,
      role: unit.role,
      rarity: unit.rarity,
      image: unit.image,
      atk: unit.atk,
      hp: unit.hp,
      currentHp: unit.currentHp,
      abilityName: unit.abilityName,
      abilityDesc: unit.abilityDesc,
      price: unit.price,
      restRounds: 0
    });

    audio.playClick();
    const tile = ARENA_TILES_COORDS[tileKey];
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
    this.gridUnits[tileKey] = {
      ...card,
      currentHp: initialHp,
      maxHp: card.hp,
      baseAtk: card.atk,
      currentAtk: card.atk,
      tileKey: tileKey,
      shieldBlocked: false,
      painImmune: false,
      spawnAnim: 1.0,
      hitAnim: 0,
      triggerAbilityOnAttack: true
    };

    if (typeof audio.playCoin === 'function') audio.playCoin(); else audio.playClick();
    const tile = ARENA_TILES_COORDS[tileKey];
    this.addFloatingText(tile.x + tile.w / 2, tile.y, `${card.name}!`, '#ffd166', 1.5);

    this.recalculateBoardAuras();
    this.renderHandDOM();
    this.updateHUD();
  }

  /**
   * Возврат выставленной птицы с клетки обратно в руку во время фазы планирования
   */
  recallUnitFromTile(tileKey) {
    if (this.isResolvingTurn) return;
    const unit = this.gridUnits[tileKey];
    if (!unit) return;

    if (unit.isDecoy) {
      this.addFloatingText(ARENA_TILES_COORDS[tileKey].x + 60, ARENA_TILES_COORDS[tileKey].y, 'Это иллюзия!', '#aaa', 1.2);
      return;
    }

    delete this.gridUnits[tileKey];

    this.player.hand.push({
      id: unit.id,
      name: unit.name,
      subname: unit.subname,
      role: unit.role,
      rarity: unit.rarity,
      image: unit.image,
      atk: unit.baseAtk !== undefined ? unit.baseAtk : unit.atk,
      hp: unit.maxHp !== undefined ? unit.maxHp : unit.hp,
      currentHp: unit.currentHp,
      abilityName: unit.abilityName,
      abilityDesc: unit.abilityDesc,
      price: unit.price,
      restRounds: 0
    });

    audio.playClick();
    const tile = ARENA_TILES_COORDS[tileKey];
    this.addFloatingText(tile.x + tile.w / 2, tile.y, 'Вернут в руку', '#94a3b8', 1.3);
    this.recalculateBoardAuras();
    this.renderHandDOM();
    this.updateHUD();
  }

  /**
   * Пересчёт динамических аур на поле (Руны леса, Курица-Шеф, Скворец, Гриф, Пернатый Король, Смола)
   */
  recalculateBoardAuras() {
    const units = Object.values(this.gridUnits);
    const starlingCount = units.filter(u => u.id === 'starling_musician').length;
    const hasKing = units.some(u => u.id === 'feathered_king');

    for (const [key, unit] of Object.entries(this.gridUnits)) {
      if (unit.isDecoy) {
        unit.currentAtk = 0;
        continue;
      }

      let atk = unit.baseAtk !== undefined ? unit.baseAtk : unit.atk;

      // Руна леса (+4 ATK)
      if (this.tileEffects[key]?.isRune) {
        atk += 4;
      }

      // Скворец-Музыкант (+4 ATK всем)
      if (starlingCount > 0) {
        atk += starlingCount * 4;
      }

      // Курица-Шеф: Эспрессо-ярость (+8 ATK при HP < 50%)
      if (unit.id === 'chef_chicken' && unit.currentHp <= unit.maxHp * 0.5) {
        atk += 8;
      }

      // Гриф-Охотник: Королевский контракт (x2 ATK при HP босса < 40%)
      if (unit.id === 'vulture_hunter' && this.boss.hp <= this.boss.maxHp * 0.4) {
        atk *= 2;
      }

      // Пернатый Король: +100% к атаке всем союзникам
      if (hasKing && unit.id !== 'feathered_king') {
        atk *= 2;
      }

      // Штраф смолы (-50% ATK)
      if (this.tileEffects[key]?.tarRounds > 0) {
        atk = Math.max(1, Math.floor(atk * 0.5));
      }

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

    // 1. Пингвин-Менеджер: +1 карта из колоды
    if (card.id === 'penguin_manager') {
      this.drawCards(1);
      this.addFloatingText(this.arenaWidth / 2, 450, '+1 Карта (Квартальный отчёт)!', '#2ec4b6', 1.8);
    }
    // 2. Павлин-Фокусник: 2 зеркальные копии по бокам
    else if (card.id === 'magician_peacock') {
      const [c, r] = tileKey.split('x').map(Number);
      [`${c - 1}x${r}`, `${c + 1}x${r}`].forEach(k => {
        if (ARENA_TILES_COORDS[k] && !this.gridUnits[k]) {
          this.gridUnits[k] = {
            id: 'peacock_decoy',
            name: 'Иллюзия Павлина',
            role: 'Приманка',
            rarity: 'uncommon',
            image: card.image,
            atk: 0,
            baseAtk: 0,
            hp: 12,
            currentHp: 12,
            maxHp: 12,
            currentAtk: 0,
            isDecoy: true,
            tileKey: k,
            spawnAnim: 1.0,
            hitAnim: 0
          };
        }
      });
      this.addFloatingText(this.arenaWidth / 2, 400, 'Зеркальные копии созданы!', '#a335ee', 1.8);
    }
    // 3. Сова Афина: +18 щита всему ряду
    else if (card.id === 'owl_sparta') {
      const r = parseInt(tileKey.split('x')[1], 10);
      for (let col = 1; col <= 5; col++) {
        const k = `${col}x${r}`;
        if (this.gridUnits[k]) {
          this.gridUnits[k].currentHp += 18;
          this.gridUnits[k].maxHp += 18;
        }
      }
      this.addFloatingText(this.arenaWidth / 2, 420, 'Фаланга Спарты: +18 HP в ряду!', '#f39c12', 2.0);
    }
    // 4. Синица-Пиромант: поджог клетки на 3 раунда и сжигание смолы по всей арене
    else if (card.id === 'tit_pyromancer') {
      this.tileEffects[tileKey].burningRounds = 3;
      for (const eff of Object.values(this.tileEffects)) {
        eff.tarRounds = 0;
      }
      this.addFloatingText(tile.x + 60, tile.y, 'Огненный шквал: вся смола сожжена!', '#ff5722', 2.0);
    }
    // 5. Ворон-Алхимик: яд боссу и целебный эликсир на клетке
    else if (card.id === 'raven_alchemist') {
      this.boss.poisonRounds = 3;
      this.tileEffects[tileKey].elixirRounds = 3;
      this.tileEffects[tileKey].tarRounds = 0;
      if (this.tileEffects[tileKey].intentType === 'SAW_AOE') {
        this.tileEffects[tileKey].isTargeted = false;
        this.tileEffects[tileKey].intentType = null;
      }
      this.addFloatingText(tile.x + 60, tile.y, 'Трансмутация: Яд + Эликсир!', '#2ecc71', 1.9);
    }
    // 6. Сокол-Космонавт: сдвигает зоны атак босса на 1 клетку в сторону
    else if (card.id === 'sokol_cosmonaut') {
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
      this.addFloatingText(this.arenaWidth / 2, 360, '«Она круглая?!» Прицел Бобра сдвинут!', '#38bdf8', 2.0);
    }
    // 7. Зарянка-Психолог: АНТИДЕПРЕССАНТЫ! (0 урона себе и соседям)
    else if (card.id === 'therapist_robin') {
      this.gridUnits[tileKey].painImmune = true;
      this.getNeighborKeys(tileKey).forEach(k => {
        if (this.gridUnits[k]) this.gridUnits[k].painImmune = true;
      });
      this.addFloatingText(tile.x + 60, tile.y, 'АНТИДЕПРЕССАНТЫ: 0 урона!', '#ff6b8b', 2.0);
    }
    // 8. Сова-Экзорцист: очищает смолу и снимает броню/спец-атаку Бобра
    else if (card.id === 'owl_exorcist') {
      for (const eff of Object.values(this.tileEffects)) {
        eff.tarRounds = 0;
        if (eff.intentType === 'HEAVY_AXE') {
          eff.isTargeted = false;
          eff.intentType = null;
        }
      }
      this.boss.armor = 0;
      this.boss.blockSpecNext = true;
      this.addFloatingText(this.arenaWidth / 2, 360, '«Изыди!» Арена очищена от ловушек!', '#a335ee', 2.0);
    }
    // 9. Сова-Барбер: срезает броню босса сразу при выходе
    else if (card.id === 'owl_hairdresser' && this.boss.armor > 0) {
      this.boss.armor = 0;
      this.addFloatingText(this.arenaWidth / 2, 220, 'Стрижка под ноль: Броня Бобра срезана!', '#ffd166', 1.8);
    }
  }

  /* ==========================================================================
     Телеграфирование атак Бобра: Разогрев (Раунды 1-3) и 3 типа угроз
     ========================================================================== */
  generateBossIntents() {
    for (const key of Object.keys(this.tileEffects)) {
      this.tileEffects[key].isTargeted = false;
      this.tileEffects[key].intentType = null;
      this.tileEffects[key].intentDamage = 0;
    }

    const round = this.player.round;
    let desc = '';

    // РАУНД 1: Плавный разогрев — только 1 бревно прорыва по центру
    if (round === 1) {
      const key = '3x2';
      this.tileEffects[key].isTargeted = true;
      this.tileEffects[key].intentType = 'BREACH';
      this.tileEffects[key].intentDamage = 6;
      desc = 'Разминка (Катящееся бревно): перекройте красную клетку [3x2], иначе -6 HP герою!';
    }
    // РАУНД 2: Обучение разнице между Прорывом (красный) и Пилой (оранжевый)
    else if (round === 2) {
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
    }
    // РАУНД 3: Знакомство с Фиолетовым Топором по рунам (застревает, если птица выжила)
    else if (round === 3) {
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
    }
    // С 4 РАУНДА: Настоящий бой с чередованием паттернов
    else {
      const pattern = (round + (this.boss.blockSpecNext ? 1 : 0)) % 3;
      this.boss.blockSpecNext = false;

      const breachDmg = Math.min(12, 8 + Math.floor(round / 2));
      const sawDmg = Math.min(14, 9 + Math.floor(round / 2));

      if (pattern === 1) {
        // Паттерн А: 2 прорыва + Пила по случайному ряду + Смола
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
        desc = `Аврал: 2 красных прорыва (${breachDmg} ур.) + Оранжевая пила по ${sawRow}-му ряду (${sawDmg} ур. птицам)`;
      } else if (pattern === 2) {
        // Паттерн Б: Укрепление плотины (+броня боссу) + 2 прорыва + Фиолетовый топор по рунам
        this.boss.armor = 16;
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
          this.tileEffects[k].intentDamage = 15;
        });
        desc = `Щит Плотины (+16 брони) + 2 прорыва (${breachDmg} ур.) + Фиолетовый топор по рунам!`;
      } else {
        // Паттерн В: 3 бревна прорыва (проверка защиты или перехвата Гусем/Стримером)
        const cols = [1, 2, 3, 4, 5].sort(() => 0.5 - Math.random()).slice(0, 3);
        cols.forEach((c, idx) => {
          const r = (idx % 3) + 1;
          const k = `${c}x${r}`;
          this.tileEffects[k].isTargeted = true;
          this.tileEffects[k].intentType = 'BREACH';
          this.tileEffects[k].intentDamage = breachDmg;
        });
        desc = `Лесосплав: 3 красных бревна прорыва по ${breachDmg} ур. (блокируйте или используйте Гуся/Стримера!)`;
      }
    }

    this.boss.intents = [{
      type: 'TACTICAL_MIX',
      description: desc
    }];

    this.updateHUD();
  }

  /* ==========================================================================
     Боевой цикл (Разрешение хода со всеми способностями птиц)
     ========================================================================== */
  async executeTurn() {
    this.isResolvingTurn = true;
    const btn = document.getElementById('btn-end-turn');
    if (btn) btn.disabled = true;

    // Шаг 0: Заклинивание шестерёнок пилы и активация боевых кличей выставленных карт
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
    for (const [tileKey, unit] of Object.entries(this.gridUnits)) {
      if (unit.triggerAbilityOnAttack) {
        unit.triggerAbilityOnAttack = false;
        await this.triggerOnPlayAbility(unit, tileKey);
        triggeredCount++;
        await this.sleep(250);
      }
    }

    this.recalculateBoardAuras();
    this.updateHUD();
    if (triggeredCount > 0) {
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
      this.addFloatingText(this.arenaWidth / 2, 220, `-${dotDamage} (Огонь и Яд)`, '#ff5722', 1.4);
      this.updateHUD();
      await this.sleep(350);
    }

    // Шаг 2: Активные способности и атака всех выставленных птиц
    const activeUnits = Object.values(this.gridUnits);
    let bossStunnedThisRound = false;
    let bossAccuracyPenalty = false;
    let bossDamageMult = 1.0;

    if (activeUnits.length > 0) {
      this.addFloatingText(this.arenaWidth / 2, 280, 'ПЕРНАТЫЕ АТАКУЮТ!', '#ffd166', 1.5);
      await this.sleep(400);

      const vulnMult = this.boss.vulnerable ? 1.5 : 1.0;
      this.boss.vulnerable = false; // Сбрасываем уязвимость после реализации

      let totalBirdsDamage = 0;
      for (const unit of activeUnits) {
        if (unit.isDecoy) continue;

        // Спец-эффекты птиц во время атаки:
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
          if (Math.random() < 0.5) {
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
        if (unit.id === 'kiwi_secret') unitDmg += 10; // Скрытный крит Киви
        if (unit.id === 'sacred_ibis') {
          const targetedCount = Object.values(this.tileEffects).filter(e => e.isTargeted).length;
          unitDmg += Math.max(12, targetedCount * 6);
        }

        unitDmg = Math.round(unitDmg * vulnMult);

        if (unitDmg > 0) {
          // Дятел-Перфоратор игнорирует и ломает броню босса
          if (unit.id === 'woodpecker_drill' && this.boss.armor > 0) {
            this.boss.armor = 0;
            this.addFloatingText(this.arenaWidth / 2, 180, 'Перфоратор Дятла разнёс щит Бобра!', '#ffd166', 1.6);
          } else if (this.boss.armor > 0) {
            const absorbed = Math.min(this.boss.armor, unitDmg);
            this.boss.armor -= absorbed;
            unitDmg -= absorbed;
          }

          totalBirdsDamage += unitDmg;
          unit.hitAnim = 0.4;
          audio.playClick();
          await this.sleep(120);
        }
      }

      this.boss.hp = Math.max(0, this.boss.hp - totalBirdsDamage);
      this.boss.hitFlashTimer = 0.5;
      this.screenShake(12, 0.4);
      if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();
      this.addFloatingText(this.arenaWidth / 2, 200, `-${totalBirdsDamage} УРОНА БОССУ!`, '#ff3333', 2.0);
      this.updateHUD();

      await this.sleep(600);
    }

    if (this.boss.hp <= 0) {
      this.boss.hp = 0;
      this.updateHUD();
      this.handleVictory();
      return;
    }

    // Шаг 3: Ответная атака Бобра по 3 типам клеток
    if (bossStunnedThisRound) {
      await this.sleep(500);
    } else if (bossAccuracyPenalty && Math.random() < 0.5) {
      this.addFloatingText(this.arenaWidth / 2, 180, 'Бобёр смутился труселей Орла с сердечками и ПРОМАХНУЛСЯ!', '#ff6b8b', 2.4);
      await this.sleep(700);
    } else {
      this.addFloatingText(this.arenaWidth / 2, 160, 'БОБЁР НАНОСИТ УДАР!', '#e63946', 2.0);
      this.screenShake(16, 0.5);
      if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();
      await this.sleep(550);

      let directPlayerDamage = 0;
      const hasOdinRaven = Object.values(this.gridUnits).some(u => u.id === 'odin_raven' && u.currentHp > 0);
      const interceptorUnit = Object.values(this.gridUnits).find(
        u => (u.id === 'guard_goose' || u.id === 'streamer_owl') && u.currentHp > 0
      );

      const applyDamageToUnit = (unit, rawDmg, tile) => {
        if (!unit) return;

        // Киви-Шпион и Пернатый Король неуязвимы для прямых ударов
        if (unit.id === 'kiwi_secret' || unit.id === 'feathered_king') {
          this.addFloatingText(tile.x + tile.w / 2, tile.y - 10, 'Укрытие! 0 урона', '#38bdf8', 1.5);
          return;
        }
        // Зарянка-Психолог: Антидепрессанты (0 урона)
        if (unit.painImmune) {
          this.addFloatingText(tile.x + tile.w / 2, tile.y - 10, 'Антидепрессанты! 0 HP', '#ff6b8b', 1.6);
          return;
        }
        // Гусь-Охранник: 50% шанс полного уклонения
        if (unit.id === 'guard_goose' && Math.random() < 0.5) {
          this.addFloatingText(tile.x + tile.w / 2, tile.y - 10, 'Фейсконтроль! 0 урона', '#ffd166', 1.6);
          return;
        }
        // Гусь-Викинг: первый удар блокирует щитом и контратакует на 20 урона
        if (unit.id === 'viking_goose' && !unit.shieldBlocked) {
          unit.shieldBlocked = true;
          this.boss.hp = Math.max(0, this.boss.hp - 20);
          this.addFloatingText(tile.x + tile.w / 2, tile.y - 10, 'Щит Вальхаллы! Контрудар -20 HP!', '#f39c12', 2.0);
          return;
        }

        let dmg = Math.max(1, Math.round(rawDmg * bossDamageMult));
        // Храбрый селезень: кастрюля поглощает 6 урона
        if (unit.id === 'brave_drake') {
          dmg = Math.max(1, dmg - 6);
        }

        unit.currentHp -= dmg;
        unit.hitAnim = 0.5;

        // Сова Афина: отвечает уколом копья на 14 урона
        if (unit.id === 'owl_sparta' && unit.currentHp > 0) {
          this.boss.hp = Math.max(0, this.boss.hp - 14);
          this.addFloatingText(tile.x + tile.w / 2, tile.y - 28, 'Копьё Афины: -14 HP Бобру!', '#ffd166', 1.7);
        }

        if (unit.currentHp <= 0) {
          if (hasOdinRaven && unit.id !== 'odin_raven' && !unit.isDecoy && !unit.hasResurrectedThisRound) {
            unit.hasResurrectedThisRound = true;
            unit.currentHp = unit.maxHp;
            this.addFloatingText(tile.x + tile.w / 2, tile.y - 12, 'Врата Вальхаллы: Воскрешён со 100% HP!', '#ffd166', 2.2);
          } else {
            unit.currentHp = 0;
            this.addFloatingText(tile.x + tile.w / 2, tile.y - 10, `${unit.name} повержен!`, '#ff4d4d', 1.8);
          }
        } else {
          this.addFloatingText(tile.x + tile.w / 2, tile.y - 10, `Блок! -${dmg} HP`, '#55efc4', 1.5);
        }
      };

      for (const [key, effect] of Object.entries(this.tileEffects)) {
        if (!effect.isTargeted) continue;

        effect.shakeTimer = 0.5;
        const rawDamage = effect.intentDamage || 6;
        const unit = this.gridUnits[key];
        const tile = ARENA_TILES_COORDS[key];

        if (effect.intentType === 'BREACH') {
          // КРАСНАЯ КЛЕТКА (Прорыв): Киви в кустах и Король не останавливают катящееся бревно!
          const canBlockBreach = unit && unit.id !== 'kiwi_secret' && unit.id !== 'feathered_king';
          if (canBlockBreach) {
            applyDamageToUnit(unit, rawDamage, tile);
          } else if (interceptorUnit && interceptorUnit.currentHp > 0) {
            const intTile = ARENA_TILES_COORDS[interceptorUnit.tileKey] || tile;
            this.addFloatingText(intTile.x + intTile.w / 2, intTile.y - 24, `${interceptorUnit.name} перехватил прорыв!`, '#ffd166', 1.7);
            applyDamageToUnit(interceptorUnit, rawDamage, intTile);
          } else {
            const heroDmg = Math.max(1, Math.round(rawDamage * bossDamageMult));
            directPlayerDamage += heroDmg;
            this.addFloatingText(tile.x + tile.w / 2, tile.y + 20, `ПРОРЫВ! -${heroDmg} HP`, '#ff3838', 2.0);
          }
        } else if (effect.intentType === 'SAW_AOE') {
          // ОРАНЖЕВАЯ КЛЕТКА (Пила): бьёт только птиц на линии, Герою урон НЕ наносит!
          if (unit) {
            applyDamageToUnit(unit, rawDamage, tile);
          }
        } else if (effect.intentType === 'HEAVY_AXE') {
          // ФИОЛЕТОВАЯ КЛЕТКА (Топор по рунам): если птица приняла удар и выжила — топор застревает!
          if (unit) {
            applyDamageToUnit(unit, rawDamage, tile);
            if (unit.currentHp > 0) {
              this.boss.vulnerable = true;
              this.addFloatingText(tile.x + tile.w / 2, tile.y - 28, 'Топор Бобра застрял! Босс УЯЗВИМ (+50% ур.)!', '#a335ee', 2.4);
            }
          }
        }
      }

      // Начиная с 3 раунда Бобр разливает Смолу на 1 случайную клетку
      if (this.player.round >= 3) {
        const allKeys = Object.keys(ARENA_TILES_COORDS);
        const tarKey = allKeys[Math.floor(Math.random() * allKeys.length)];
        if (this.tileEffects[tarKey].burningRounds <= 0 && this.tileEffects[tarKey].elixirRounds <= 0) {
          this.tileEffects[tarKey].tarRounds = 2;
        }
      }

      if (directPlayerDamage > 0) {
        await this.sleep(350);
        this.player.hp = Math.max(0, this.player.hp - directPlayerDamage);
        this.screenShake(20, 0.6);
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

    await this.sleep(650);

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.updateHUD();
      this.handleDefeat();
      return;
    }

    // Шаг 4: Лечение в конце раунда (Зарянка-Садовник и Целебный эликсир Ворона)
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
        this.addFloatingText(tile.x + tile.w / 2, tile.y, '+8 HP соседям (Компост)', '#2ecc71', 1.5);
      }
      if (this.tileEffects[key]?.elixirRounds > 0) {
        unit.currentHp = Math.min(unit.maxHp, unit.currentHp + 4);
      }
    }

    // Уменьшаем кулдаун отдыха у карт, которые уже сидели в руке в этом раунде (+4 HP за передышку!)
    this.player.hand.forEach(c => {
      if (c.restRounds && c.restRounds > 0) {
        c.restRounds--;
        if (c.currentHp !== undefined && c.currentHp < c.hp) {
          c.currentHp = Math.min(c.hp, c.currentHp + 4);
        }
      }
    });

    // Шаг 5: Возвращение выживших карт в руку (с отдыхом 1 ход, кроме застрявших в смоле)
    const nextGridUnits = {};

    for (const [key, unit] of Object.entries(this.gridUnits)) {
      if (unit.isDecoy) continue;

      if (unit.currentHp > 0) {
        // Если клетка в смоле — птица застревает на поле на следующий раунд!
        if (this.tileEffects[key]?.tarRounds > 0) {
          nextGridUnits[key] = unit;
          const tile = ARENA_TILES_COORDS[key];
          this.addFloatingText(tile.x + tile.w / 2, tile.y, 'Увяз в смоле!', '#f97316', 1.6);
        } else {
          const restTurns = unit.id === 'bodybuilder_sparrow' ? 2 : 1;
          this.player.hand.push({
            id: unit.id,
            name: unit.name,
            subname: unit.subname,
            role: unit.role,
            rarity: unit.rarity,
            image: unit.image,
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

    // Тикаем таймеры смолы и эликсира на клетках
    for (const eff of Object.values(this.tileEffects)) {
      if (eff.tarRounds > 0) eff.tarRounds--;
      if (eff.elixirRounds > 0) eff.elixirRounds--;
    }

    this.gridUnits = nextGridUnits;
    this.recalculateBoardAuras();
    this.renderHandDOM();
    this.updateHUD();

    await this.sleep(350);

    // Шаг 6: Новый раунд и добор 2 свежих карт
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
  }

  handleMouseLeave() {
    this.hoveredTileKey = null;
  }

  handleCanvasClick(e) {
    if (!this.isActive || this.isResolvingTurn) return;
    const pos = this.getCanvasMousePos(e);

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
          // ЛКМ по уже выставленной птице возвращает её обратно в руку (ПКМ — осмотр)
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
      if (e.target === modal) {
        this.closeCardInspect();
      }
    });

    modal.querySelector('#btn-inspect-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeCardInspect();
    });

    modal.querySelector('#btn-inspect-close-x')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeCardInspect();
    });

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
      vy: -28
    });
  }

  /* ==========================================================================
     Игровой цикл: Update и Render
     ========================================================================== */
  update(dt) {
    if (!this.isActive) return;

    this.animTime += dt;

    if (this.boss.hitFlashTimer > 0) {
      this.boss.hitFlashTimer = Math.max(0, this.boss.hitFlashTimer - dt);
    }

    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer = Math.max(0, this.screenShakeTimer - dt);
    }

    for (const eff of Object.values(this.tileEffects)) {
      if (eff.shakeTimer > 0) {
        eff.shakeTimer = Math.max(0, eff.shakeTimer - dt);
      }
    }

    for (const unit of Object.values(this.gridUnits)) {
      if (unit.spawnAnim > 0) {
        unit.spawnAnim = Math.max(0, unit.spawnAnim - dt * 3);
      }
      if (unit.hitAnim > 0) {
        unit.hitAnim = Math.max(0, unit.hitAnim - dt * 2.5);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
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

    const isVideoReady = this.bgVideo && (this.bgVideo.readyState >= 2 || !this.bgVideo.paused);
    if (isVideoReady) {
      this.ctx.drawImage(this.bgVideo, 0, 0, this.arenaWidth, this.arenaHeight);
    } else if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      this.ctx.drawImage(this.bgImage, 0, 0, this.arenaWidth, this.arenaHeight);
    } else {
      this.ctx.fillStyle = '#1a1614';
      this.ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);
    }

    if (this.boss.hitFlashTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 50, 50, ${this.boss.hitFlashTimer * 0.4})`;
      this.ctx.fillRect(400, 50, 580, 220);
      this.ctx.restore();
    }

    this.renderTiles();
    this.renderPlacedUnits();
    this.renderFloatingTexts();

    this.ctx.restore();
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

      let drawX = coords.x;
      let drawY = coords.y;
      if (eff.shakeTimer > 0) {
        drawX += (Math.random() - 0.5) * 6;
        drawY += (Math.random() - 0.5) * 6;
      }

      const tileImg = this.tileImages[key];

      if (eff.shakeTimer > 0 && !eff.isTargeted && !isHovered && eff.burningRounds <= 0) {
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

      // Подсветка 3 типов угроз Бобра:
      // BREACH = Красный (#ff2233), SAW_AOE = Оранжевый (#ff8800), HEAVY_AXE = Фиолетовый (#a335ee)
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

        // Компактная плашка с типом и величиной урона в углу клетки
        this.ctx.save();
        this.ctx.font = 'bold 13px "8bitoperator", monospace';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 4;
        const tag = eff.intentType === 'BREACH' ? `ПРОРЫВ -${eff.intentDamage}` : `-${eff.intentDamage} HP`;
        this.ctx.fillText(tag, drawX + 10, drawY + coords.h - 10);
        this.ctx.restore();
      }

      // Смола Бобра
      if (eff.tarRounds > 0) {
        const tarTile = this.getTintedTileCanvas(key, '#451a03', 0.72);
        if (tarTile) {
          this.ctx.drawImage(tarTile, drawX, drawY, coords.w, coords.h);
        }
        this.ctx.font = 'bold 12px "8bitoperator", monospace';
        this.ctx.fillStyle = '#fde68a';
        this.ctx.fillText('СМОЛА', drawX + 10, drawY + 20);
      }

      // Целебный эликсир Ворона-Алхимика
      if (eff.elixirRounds > 0) {
        const elixTile = this.getTintedTileCanvas(key, '#10b981', 0.55);
        if (elixTile) {
          this.ctx.drawImage(elixTile, drawX, drawY, coords.w, coords.h);
        }
        this.ctx.font = 'bold 12px "8bitoperator", monospace';
        this.ctx.fillStyle = '#a7f3d0';
        this.ctx.fillText('+4 HP', drawX + 10, drawY + 20);
      }

      // Горение Синицы-пироманта
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

      // Подсветка при наведении курсора
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

  renderPlacedUnits() {
    for (const [key, unit] of Object.entries(this.gridUnits)) {
      const coords = ARENA_TILES_COORDS[key];
      if (!coords) continue;

      this.ctx.save();

      const cx = coords.x + coords.w / 2;
      const cy = coords.y + coords.h / 2;
      const bob = Math.sin(this.animTime * 4 + coords.col) * 3;
      const spawnScale = unit.spawnAnim > 0 ? (1.3 - unit.spawnAnim * 0.3) : 1.0;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy + 32, 34, 14, 0, 0, Math.PI * 2);
      this.ctx.fill();

      const img = this.getCardImage(unit.image);
      const cardW = 60 * spawnScale;
      const cardH = 85 * spawnScale;
      const cardX = cx - cardW / 2;
      const cardY = cy - cardH / 2 - 8 + bob;

      if (img && img.complete && img.naturalWidth > 0) {
        this.ctx.save();
        if (unit.hitAnim > 0) {
          this.ctx.filter = 'brightness(2.2) saturate(0.2)';
        }
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetY = 4;
        this.ctx.drawImage(img, cardX, cardY, cardW, cardH);
        this.ctx.restore();
      } else {
        this.ctx.fillStyle = '#ffb703';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy - 8 + bob, 26, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Бейдж ATK
      if (unit.currentAtk > 0) {
        const atkX = cx - 24;
        const atkY = cy + 28;
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetY = 2;

        this.ctx.fillStyle = unit.currentAtk > unit.atk ? '#16a34a' : '#b7094c';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.arc(atkX, atkY, 14, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px "8bitoperator", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${unit.currentAtk}`, atkX, atkY + 1);
        this.ctx.restore();
      }

      // Бейдж HP
      const isDamaged = unit.currentHp < unit.maxHp;
      const hpX = cx + 24;
      const hpY = cy + 28;
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowOffsetY = 2;

      this.ctx.fillStyle = unit.painImmune ? '#ec4899' : (isDamaged ? '#d90429' : '#0077b6');
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.arc(hpX, hpY, 14, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 14px "8bitoperator", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${unit.currentHp}`, hpX, hpY + 1);
      this.ctx.restore();

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