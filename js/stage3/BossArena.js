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

/**
 * Модуль финальной Арены Битвы с Бобром
 * Сетка 5x3 (15 тайлов), карточная рука, фазы боя и телеграфирование атак
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

    // Загрузка ассетов арены
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
      name: 'Бобёр-Дровосек',
      title: 'Хранитель Лесной Плотины',
      maxHp: 320,
      hp: 320,
      armor: 0,
      isEnraged: false,
      hitFlashTimer: 0,
      intents: [] // запланированные атаки на следующий ход
    };

    // Состояние игрока (без семян — упор на перекрытие клеток сетки)
    this.player = {
      maxHp: 100,
      hp: 100,
      round: 1,
      deck: [],
      hand: [],
      discard: [],
      selectedCardIndex: -1
    };

    // Размещенные птицы на сетке { 'col x row': unitObject }
    this.gridUnits = {};

    // Эффекты на тайлах { 'col x row': { burningRounds: 0, shieldRounds: 0, isTargeted: false, damage: 0 } }
    this.tileEffects = {};
    for (const key of Object.keys(ARENA_TILES_COORDS)) {
      this.tileEffects[key] = {
        burningRounds: 0,
        isTargeted: false,
        intentDamage: 0,
        shakeTimer: 0
      };
    }

    // Всплывающие надписи урона / эффектов [{ x, y, text, color, life, maxLife, vy }]
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

    this.setupEvents();
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      if (this.isActive) {
        this.updateCanvasBounds();
      }
    });

    if (this.canvas) {
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
      this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
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

    // 1. Показываем Canvas и масштабируем под 1376x768
    if (this.canvas) {
      this.canvas.style.display = 'block';
      this.updateCanvasBounds();
    }

    // 2. Останавливаем видео настолки или переключаем фон
    if (this.videoManager) {
      this.videoManager.stopBoardGameBossSequence();
      const wrapper = document.getElementById('video-wrapper');
      if (wrapper) {
        wrapper.style.display = 'none';
      }
    }

    // 3. Скрываем ненужные экраны
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));

    // 4. Сброс состояния матча
    this.boss.maxHp = 240;
    this.boss.hp = 240;
    this.boss.armor = 0;
    this.boss.isEnraged = false;
    this.boss.hitFlashTimer = 0;

    this.player.round = 1;
    this.player.maxHp = 100;
    this.player.hp = 100;

    if (customDeck && customDeck.length > 0) {
      this.player.deck = [...customDeck].sort(() => 0.5 - Math.random());
    } else {
      try {
        const savedDeckJson = localStorage.getItem('birday_player_cards');
        if (savedDeckJson) {
          const cardIds = JSON.parse(savedDeckJson);
          const loadedCards = cardIds.map(id => CARDS_DATABASE.find(c => c.id === id)).filter(Boolean);
          if (loadedCards.length >= 6) {
            this.player.deck = [...loadedCards].sort(() => 0.5 - Math.random());
          } else {
            this.player.deck = getRandomStarterDeck(14);
          }
        } else {
          this.player.deck = getRandomStarterDeck(14);
        }
      } catch (e) {
        this.player.deck = getRandomStarterDeck(14);
      }
    }

    this.player.hand = [];
    this.player.discard = [];
    this.player.selectedCardIndex = -1;

    this.gridUnits = {};
    for (const key of Object.keys(this.tileEffects)) {
      this.tileEffects[key].burningRounds = 0;
      this.tileEffects[key].isTargeted = false;
      this.tileEffects[key].intentDamage = 0;
    }
    this.floatingTexts = [];
    this.isResolvingTurn = false;

    // 5. Создаем DOM интерфейс руки карт и панели босса
    this.createDomHUD();

    // 6. Раздаем первые 5 карт
    this.drawCards(5);

    // 7. Генерируем первое намерение босса (телеграфирование)
    this.generateBossIntents();

    this.addFloatingText(this.arenaWidth / 2, 140, 'БОБЁР-ДРОВОСЕК ЖДЁТ ВАС!', '#ffb703', 2.5);
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.canvas) {
      this.canvas.style.display = 'none';
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
      <!-- Верхняя панель босса -->
      <div class="boss-top-hud">
        <div class="boss-banner-frame">
          <div class="boss-avatar-box">🦫</div>
          <div class="boss-info-col">
            <div class="boss-name-row">
              <span class="boss-name-title">${this.boss.name}</span>
              <span class="boss-name-subtitle">${this.boss.title}</span>
            </div>
            <div class="boss-hp-track">
              <div id="boss-hp-bar" class="boss-hp-bar" style="width: 100%"></div>
              <span id="boss-hp-num" class="boss-hp-num">${this.boss.hp} / ${this.boss.maxHp} HP</span>
            </div>
          </div>
        </div>

        <!-- Намерение атаки босса (Телеграф) -->
        <div id="boss-intent-badge" class="boss-intent-badge">
          <span class="intent-icon">⚠️</span>
          <span id="boss-intent-desc" class="intent-desc">Готовит атаку...</span>
        </div>
      </div>

      <!-- Центральная подсказка при выборе карты -->
      <div id="boss-card-hint" class="boss-card-hint hidden">
        Выберите клетку на поле 5×3, чтобы выставить героя и перекрыть удар!
      </div>

      <!-- Нижняя панель игрока: Защита игрока, Кнопка Хода, Рука карт -->
      <div class="player-bottom-hud">
        <div class="player-controls-row">
          <!-- Здоровье / Защита игрока -->
          <div class="player-hp-pill">
            <span class="player-hp-icon">🛡️</span>
            <div class="player-hp-col">
              <span class="player-hp-label">ВАША ЗАЩИТА</span>
              <div class="player-hp-track">
                <div id="player-hp-bar" class="player-hp-bar" style="width: 100%"></div>
                <span id="player-hp-num" class="player-hp-num">${this.player.hp} / ${this.player.maxHp} HP</span>
              </div>
            </div>
          </div>

          <!-- Кнопка "В АТАКУ! / ЗАВЕРШИТЬ ХОД" -->
          <button id="btn-end-turn" class="btn-boss-action btn-end-turn" title="Завершить расстановку и отразить атаку">
            <span class="btn-action-icon">⚔️</span>
            <span class="btn-action-title">В АТАКУ!</span>
          </button>

          <!-- Счетчик колоды и раунда -->
          <div class="deck-discard-pill">
            <span id="deck-counter" title="Карт в колоде">🎴 ${this.player.deck.length}</span>
            <span id="round-counter" class="round-counter">РАУНД ${this.player.round}</span>
          </div>
        </div>

        <!-- Веер карт в руке -->
        <div id="boss-hand-container" class="boss-hand-container">
          <!-- Карты генерируются динамически -->
        </div>
      </div>
    `;

    uiLayer.appendChild(this.uiContainer);

    // Слушатель кнопки завершения хода
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
  }

  updateHUD() {
    const hpBar = document.getElementById('boss-hp-bar');
    const hpNum = document.getElementById('boss-hp-num');
    if (hpBar && hpNum) {
      const pct = Math.max(0, Math.min(100, (this.boss.hp / this.boss.maxHp) * 100));
      hpBar.style.width = `${pct}%`;
      hpNum.textContent = `${Math.max(0, this.boss.hp)} / ${this.boss.maxHp} HP`;
    }

    const playerBar = document.getElementById('player-hp-bar');
    const playerNum = document.getElementById('player-hp-num');
    if (playerBar && playerNum) {
      const pPct = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
      playerBar.style.width = `${pPct}%`;
      playerNum.textContent = `${Math.max(0, this.player.hp)} / ${this.player.maxHp} HP`;
    }

    const deckCounter = document.getElementById('deck-counter');
    if (deckCounter) {
      deckCounter.textContent = `🎴 ${this.player.deck.length}`;
    }

    const roundCounter = document.getElementById('round-counter');
    if (roundCounter) {
      roundCounter.textContent = `РАУНД ${this.player.round}`;
    }

    const intentDesc = document.getElementById('boss-intent-desc');
    if (intentDesc && this.boss.intents.length > 0) {
      intentDesc.textContent = this.boss.intents[0].description;
    }
  }

  /* ==========================================================================
     Рендер руки карт (без затрат семян — свободный выбор)
     ========================================================================== */
  renderHandDOM() {
    const container = document.getElementById('boss-hand-container');
    if (!container) return;

    container.innerHTML = '';
    const totalCards = this.player.hand.length;

    this.player.hand.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = `boss-hand-card rarity-${card.rarity}`;
      if (this.player.selectedCardIndex === index) {
        cardEl.classList.add('selected');
      }

      // Небольшой веерный наклон карт
      const centerOffset = index - (totalCards - 1) / 2;
      const rotateDeg = centerOffset * 3.5;
      const translateY = Math.abs(centerOffset) * 6;
      cardEl.style.transform = `rotate(${rotateDeg}deg) translateY(${translateY}px)`;

      cardEl.innerHTML = `
        <div class="card-art-box">
          <img src="${card.image}" alt="${card.name}" draggable="false" />
        </div>
        <div class="card-header-bar">
          <span class="card-title">${card.name}</span>
        </div>
        <div class="card-stats-row">
          <span class="card-stat-atk" title="Атака">⚔️ ${card.atk}</span>
          <span class="card-stat-hp" title="Здоровье">🛡️ ${card.hp}</span>
        </div>
        <div class="card-ability-box">
          <span class="ability-name">${card.abilityName}</span>
          <p class="ability-desc">${card.abilityDesc}</p>
        </div>
      `;

      cardEl.addEventListener('mouseenter', () => {
        this.hoveredCardIndex = index;
      });

      cardEl.addEventListener('mouseleave', () => {
        this.hoveredCardIndex = -1;
      });

      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
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
          this.player.deck = [...this.player.discard].sort(() => 0.5 - Math.random());
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
     Логика размещения птицы на клетку 5x3 (перекрытие атак)
     ========================================================================== */
  placeCardOnTile(tileKey) {
    if (this.player.selectedCardIndex < 0) return;
    const card = this.player.hand[this.player.selectedCardIndex];
    if (!card) return;

    if (this.gridUnits[tileKey]) {
      this.addFloatingText(this.arenaWidth / 2, 400, 'Клетка уже занята птицей! 🪶', '#ff4d4d', 1.2);
      if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();
      return;
    }

    // Удаляем карту из руки без траты энергии
    this.player.hand.splice(this.player.selectedCardIndex, 1);
    this.player.selectedCardIndex = -1;

    // Выставляем боевую единицу
    this.gridUnits[tileKey] = {
      ...card,
      currentHp: card.hp,
      maxHp: card.hp,
      currentAtk: card.atk,
      tileKey: tileKey,
      spawnAnim: 1.0,
      hitAnim: 0
    };

    if (typeof audio.playCoin === 'function') audio.playCoin(); else audio.playClick();
    const tile = ARENA_TILES_COORDS[tileKey];
    this.addFloatingText(tile.x + tile.w / 2, tile.y, `${card.name}!`, '#ffd166', 1.5);

    // Активация мгновенных боевых кличей:
    this.triggerOnPlayAbility(card, tileKey);

    this.renderHandDOM();
    this.updateHUD();
  }

  triggerOnPlayAbility(card, tileKey) {
    // 1. Пингвин-Менеджер («Квартальный отчёт»): добор карты
    if (card.id === 'penguin_manager') {
      this.drawCards(1);
      this.addFloatingText(this.arenaWidth / 2, 450, '+1 Карта (Квартальный отчёт)! 📈', '#2ec4b6', 1.8);
    }
    // 2. Павлин-Фокусник («Зеркальный дубль»): зеркальные копии по бокам
    else if (card.id === 'magician_peacock') {
      const parts = tileKey.split('x');
      const c = parseInt(parts[0], 10);
      const r = parseInt(parts[1], 10);
      const leftKey = `${c - 1}x${r}`;
      const rightKey = `${c + 1}x${r}`;

      [leftKey, rightKey].forEach(k => {
        if (ARENA_TILES_COORDS[k] && !this.gridUnits[k]) {
          this.gridUnits[k] = {
            id: 'peacock_decoy',
            name: 'Иллюзия Павлина',
            role: 'Приманка',
            rarity: 'uncommon',
            image: card.image,
            atk: 0,
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
      this.addFloatingText(this.arenaWidth / 2, 400, 'Зеркальные копии созданы! 🪞', '#a335ee', 1.8);
    }
    // 3. Сова Афина («Афинская фаланга»): +18 временного щита всей своей линии
    else if (card.id === 'owl_sparta') {
      const r = parseInt(tileKey.split('x')[1], 10);
      for (let col = 1; col <= 5; col++) {
        const k = `${col}x${r}`;
        if (this.gridUnits[k]) {
          this.gridUnits[k].currentHp += 18;
          this.gridUnits[k].maxHp += 18;
        }
      }
      this.addFloatingText(this.arenaWidth / 2, 420, 'Фаланга Спарты: +18 HP в линии! 🛡️', '#f39c12', 2.0);
    }
    // 4. Синица-Пиромант («Огненное чириканье»): поджог клетки
    else if (card.id === 'tit_pyromancer') {
      this.tileEffects[tileKey].burningRounds = 3;
      this.addFloatingText(ARENA_TILES_COORDS[tileKey].x + 60, ARENA_TILES_COORDS[tileKey].y, 'Клетка охвачена огнём! 🔥', '#ff5722', 1.8);
    }
  }

  /* ==========================================================================
     Телеграфирование атак Бобра (Намерения) с нарастающей сложностью
     ========================================================================== */
  generateBossIntents() {
    // Очищаем старые метки целей
    for (const key of Object.keys(this.tileEffects)) {
      this.tileEffects[key].isTargeted = false;
      this.tileEffects[key].intentDamage = 0;
    }

    const allKeys = Object.keys(ARENA_TILES_COORDS);
    const round = this.player.round;

    let targetCount = 1;
    let damagePerCell = 1;
    let attackTitle = '';

    if (round === 1) {
      targetCount = 1;
      damagePerCell = 1;
      attackTitle = '🪓 Пробный замах';
    } else if (round === 2) {
      targetCount = 2;
      damagePerCell = 3;
      attackTitle = '🪵 Рубка брёвен';
    } else if (round === 3) {
      targetCount = 3;
      damagePerCell = 5;
      attackTitle = '🪚 Циркулярные пилы';
    } else if (round === 4) {
      targetCount = Math.random() < 0.5 ? 3 : 4;
      damagePerCell = 7;
      attackTitle = '💥 Грохот плотины';
    } else {
      // Раунд 5 и выше: 4 клетки, урон до 10 за клетку (максимум -40 при полном пропуске!)
      targetCount = 4;
      damagePerCell = Math.min(10, 8 + Math.min(2, round - 5));
      attackTitle = '⚡ Смертоносный удар плотины';
    }

    // Подбор комбинаций клеток
    let chosenKeys = [];
    const patternType = Math.floor(Math.random() * 3);

    if (patternType === 0 && targetCount >= 3) {
      if (Math.random() < 0.5) {
        // Линия по горизонтали
        const row = Math.floor(Math.random() * 3) + 1;
        const rowKeys = allKeys.filter(k => k.endsWith(`x${row}`));
        chosenKeys = [...rowKeys].sort(() => 0.5 - Math.random()).slice(0, targetCount);
      } else {
        // Соседние колонки
        const col = Math.floor(Math.random() * 4) + 1;
        const colKeys = allKeys.filter(k => k.startsWith(`${col}x`) || k.startsWith(`${col + 1}x`));
        chosenKeys = [...colKeys].sort(() => 0.5 - Math.random()).slice(0, targetCount);
      }
    } else {
      const shuffled = [...allKeys].sort(() => 0.5 - Math.random());
      chosenKeys = shuffled.slice(0, targetCount);
    }

    chosenKeys.forEach(k => {
      if (this.tileEffects[k]) {
        this.tileEffects[k].isTargeted = true;
        this.tileEffects[k].intentDamage = damagePerCell;
      }
    });

    const totalPotential = targetCount * damagePerCell;
    const desc = `${attackTitle}: ${targetCount} ${targetCount === 1 ? 'клетка' : 'клетки'} по ${damagePerCell} ур. (до -${totalPotential} HP игроку!)`;

    this.boss.intents = [{
      type: 'SCALING_STRIKE',
      title: attackTitle,
      description: desc,
      targetCount: targetCount,
      damage: damagePerCell,
      keys: chosenKeys
    }];

    this.updateHUD();
  }

  /* ==========================================================================
     Боевой цикл (Разрешение хода: атака птиц -> удар бобра -> проверка HP игрока)
     ========================================================================== */
  async executeTurn() {
    this.isResolvingTurn = true;
    const btn = document.getElementById('btn-end-turn');
    if (btn) btn.disabled = true;

    // Шаг 1: Горение клеток (DoT)
    for (const key of Object.keys(this.tileEffects)) {
      if (this.tileEffects[key].burningRounds > 0) {
        this.tileEffects[key].burningRounds--;
        this.boss.hp -= 5;
        this.addFloatingText(this.arenaWidth / 2, 220, '-5 Горение 🔥', '#ff5722', 1.2);
      }
    }
    this.updateHUD();

    // Шаг 2: Атака всех выставленных птиц по бобру
    const activeUnits = Object.values(this.gridUnits);
    if (activeUnits.length > 0) {
      this.addFloatingText(this.arenaWidth / 2, 280, 'ПЕРНАТЫЕ АТАКУЮТ! 🦅', '#ffd166', 1.5);
      await this.sleep(400);

      let totalBirdsDamage = 0;
      for (const unit of activeUnits) {
        if (unit.currentAtk > 0) {
          totalBirdsDamage += unit.currentAtk;
          unit.hitAnim = 0.4;
          audio.playClick();
          await this.sleep(120);
        }
      }

      // Наносим суммарный урон бобру
      this.boss.hp -= totalBirdsDamage;
      this.boss.hitFlashTimer = 0.5;
      this.screenShake(12, 0.4);
      if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();
      this.addFloatingText(this.arenaWidth / 2 + (Math.random() * 60 - 30), 200, `-${totalBirdsDamage} УРОНА БОССУ! 💥`, '#ff3333', 2.0);
      this.updateHUD();

      await this.sleep(600);
    }

    // Проверка победы игрока над боссом
    if (this.boss.hp <= 0) {
      this.boss.hp = 0;
      this.updateHUD();
      this.handleVictory();
      return;
    }

    // Шаг 3: Атака Бобра по намеченным клеткам
    const intent = this.boss.intents[0] || { damage: 1 };
    this.addFloatingText(this.arenaWidth / 2, 160, 'БОБЁР НАНОСИТ УДАР! 🪓', '#e63946', 2.0);
    this.screenShake(16, 0.5);
    if (typeof audio.playImpact === 'function') audio.playImpact(); else audio.playClick();
    await this.sleep(600);

    let directPlayerDamage = 0;

    for (const [key, effect] of Object.entries(this.tileEffects)) {
      if (effect.isTargeted) {
        effect.shakeTimer = 0.5;
        const cellDamage = effect.intentDamage || intent.damage || 1;
        const unit = this.gridUnits[key];
        const tile = ARENA_TILES_COORDS[key];

        if (unit) {
          // Клетка ПЕРЕКРЫТА птицей! Птица принимает удар
          unit.currentHp -= cellDamage;
          unit.hitAnim = 0.5;
          if (unit.currentHp <= 0) {
            delete this.gridUnits[key];
            this.addFloatingText(tile.x + tile.w / 2, tile.y - 10, `Блок! Но ${unit.name} повержен! 🪶`, '#ffd166', 1.8);
          } else {
            this.addFloatingText(tile.x + tile.w / 2, tile.y - 10, `Блок! -${cellDamage} HP 🛡️`, '#55efc4', 1.5);
          }
        } else {
          // Клетка НЕ ПЕРЕКРЫТА! Урон наносится напрямую игроку!
          directPlayerDamage += cellDamage;
          this.addFloatingText(tile.x + tile.w / 2, tile.y + 20, `ПРОПУСК! -${cellDamage} HP 💥`, '#ff3838', 2.0);
        }
      }
    }

    // Наносим урон игроку за неперекрытые клетки
    if (directPlayerDamage > 0) {
      await this.sleep(400);
      this.player.hp = Math.max(0, this.player.hp - directPlayerDamage);
      this.screenShake(20, 0.6);
      audio.playBonk();
      this.addFloatingText(this.arenaWidth / 2, 430, `УРОН ИГРОКУ: -${directPlayerDamage} HP! 💔`, '#ff3838', 2.5);
      this.updateHUD();
    }

    await this.sleep(800);

    // Проверка поражения игрока
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.updateHUD();
      this.handleDefeat();
      return;
    }

    // Шаг 4: Завершение раунда, добор 2 карт и подготовка следующей атаки
    this.player.round++;
    this.drawCards(2);
    this.generateBossIntents();

    this.isResolvingTurn = false;
    if (btn) btn.disabled = false;
    this.updateHUD();
  }

  handleDefeat() {
    audio.playBonk();
    this.addFloatingText(this.arenaWidth / 2, 300, '💀 ВАША ЗАЩИТА ПАЛА! 💀', '#ff4d4d', 3.0);

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
              <p class="boss-defeat-prompt-text">Перекрывайте клетки с прицелом босса пернатыми героями, чтобы блокировать урон.</p>
            </div>
            <div class="boss-defeat-actions">
              <button class="btn-leaf-green" id="btn-boss-retry" title="Попробовать бой снова">
                <span class="btn-leaf-green-text">В БОЙ СНОВА 🔄</span>
              </button>
              <button class="btn-leaf-green btn-boss-to-market" id="btn-boss-to-market" title="Вернуться в Магазин Карт">
                <span class="btn-leaf-green-text">В МАГАЗИН 🛒</span>
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
    this.addFloatingText(this.arenaWidth / 2, 300, '👑 ПОБЕДА! ПЛОТИНА СВОБОДНА! 👑', '#ffd166', 4.0);
    setTimeout(() => {
      alert('🎉 ПОЗДРАВЛЯЕМ! Вы одолели Бобра-Дровосека и освободили лес!');
      events.emit('stage:exit_to_title');
    }, 1500);
  }

  screenShake(intensity = 10, duration = 0.4) {
    this.screenShakeIntensity = intensity;
    this.screenShakeTimer = duration;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ==========================================================================
     Мышь: Ховер по клеткам 5x3 и клик
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

    // Проверяем попадание в один из 15 тайлов
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
          // Клик по уже выставленной птице — показ инфо
          const unit = this.gridUnits[key];
          this.addFloatingText(coords.x + coords.w / 2, coords.y - 15, `${unit.name}: ${unit.currentHp}/${unit.maxHp} HP`, '#ffd166', 1.5);
          audio.playClick();
        }
        break;
      }
    }
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

    // Обновление тайлов
    for (const eff of Object.values(this.tileEffects)) {
      if (eff.shakeTimer > 0) {
        eff.shakeTimer = Math.max(0, eff.shakeTimer - dt);
      }
    }

    // Обновление боевых единиц
    for (const unit of Object.values(this.gridUnits)) {
      if (unit.spawnAnim > 0) {
        unit.spawnAnim = Math.max(0, unit.spawnAnim - dt * 3);
      }
      if (unit.hitAnim > 0) {
        unit.hitAnim = Math.max(0, unit.hitAnim - dt * 2.5);
      }
    }

    // Обновление всплывающих текстов
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

    // Эффект тряски экрана при мощных ударах
    if (this.screenShakeTimer > 0) {
      const ox = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      const oy = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      this.ctx.translate(ox, oy);
    }

    // 1. Отрисовка базового фона арены (1376x768)
    if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      this.ctx.drawImage(this.bgImage, 0, 0, this.arenaWidth, this.arenaHeight);
    } else {
      this.ctx.fillStyle = '#1a1614';
      this.ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);
    }

    // Вспышка урона босса (красноватый оттенок плотины)
    if (this.boss.hitFlashTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 50, 50, ${this.boss.hitFlashTimer * 0.4})`;
      this.ctx.fillRect(400, 50, 580, 220);
      this.ctx.restore();
    }

    // 2. Отрисовка 15 интерактивных тайлов
    this.renderTiles();

    // 3. Отрисовка выставленных птиц на тайлах
    this.renderPlacedUnits();

    // 4. Отрисовка всплывающего урона и боевого текста
    this.renderFloatingTexts();

    this.ctx.restore();
  }

  renderTiles() {
    for (const [key, coords] of Object.entries(ARENA_TILES_COORDS)) {
      const isHovered = (this.hoveredTileKey === key);
      const isSelected = (this.player.selectedCardIndex >= 0);
      const eff = this.tileEffects[key];

      this.ctx.save();

      // Тряска клетки при ударе
      let drawX = coords.x;
      let drawY = coords.y;
      if (eff.shakeTimer > 0) {
        drawX += (Math.random() - 0.5) * 6;
        drawY += (Math.random() - 0.5) * 6;
      }

      // Если тайл имеет специальный эффект (например, горение или атака), накладываем вырезанный спрайт плитки
      const tileImg = this.tileImages[key];
      if (eff.burningRounds > 0 || eff.shakeTimer > 0 || isHovered) {
        if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
          this.ctx.drawImage(tileImg, drawX, drawY, coords.w, coords.h);
        }
      }

      // Зона атаки Бобра (Красное предупреждение / Hazard glow)
      if (eff.isTargeted) {
        const pulse = Math.sin(this.animTime * 8) * 0.2 + 0.5;
        this.ctx.fillStyle = `rgba(230, 57, 70, ${pulse * 0.45})`;
        this.ctx.fillRect(drawX, drawY, coords.w, coords.h);

        this.ctx.strokeStyle = '#e63946';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(drawX + 2, drawY + 2, coords.w - 4, coords.h - 4);

        // Иконка опасности в углу клетки
        this.ctx.font = 'bold 16px "8bitoperator", sans-serif';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('⚠️', drawX + coords.w - 24, drawY + 20);
      }

      // Эффект горения (Синица-пиромант)
      if (eff.burningRounds > 0) {
        this.ctx.fillStyle = 'rgba(255, 87, 34, 0.35)';
        this.ctx.fillRect(drawX, drawY, coords.w, coords.h);

        this.ctx.font = '18px "8bitoperator", sans-serif';
        this.ctx.fillText('🔥', drawX + 8, drawY + 22);
      }

      // Подсветка при наведении мыши
      if (isHovered) {
        this.ctx.strokeStyle = isSelected ? '#ffd166' : '#2ec4b6';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(drawX + 1, drawY + 1, coords.w - 2, coords.h - 2);

        this.ctx.fillStyle = isSelected ? 'rgba(255, 209, 102, 0.25)' : 'rgba(46, 196, 182, 0.2)';
        this.ctx.fillRect(drawX, drawY, coords.w, coords.h);
      }

      this.ctx.restore();
    }
  }

  renderPlacedUnits() {
    for (const [key, unit] of Object.entries(this.gridUnits)) {
      const coords = ARENA_TILES_COORDS[key];
      if (!coords) continue;

      this.ctx.save();

      // Центр плитки
      const cx = coords.x + coords.w / 2;
      const cy = coords.y + coords.h / 2;

      // Анимация дыхания
      const bob = Math.sin(this.animTime * 4 + coords.col) * 3;
      const spawnScale = unit.spawnAnim > 0 ? (1.3 - unit.spawnAnim * 0.3) : 1.0;

      // Тень под птицей
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy + 28, 28, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Отрисовка портрета героя
      const img = this.getCardImage(unit.image);
      const iconSize = 64 * spawnScale;
      const iconX = cx - iconSize / 2;
      const iconY = cy - iconSize / 2 - 8 + bob;

      if (img && img.complete && img.naturalWidth > 0) {
        this.ctx.save();
        // Вспышка при получении удара
        if (unit.hitAnim > 0) {
          this.ctx.filter = 'brightness(2.0) saturate(0.2)';
        }
        this.ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
        this.ctx.restore();
      } else {
        // Запасная круглая иконка
        this.ctx.fillStyle = '#ffb703';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy - 8 + bob, 24, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Бейдж ATK (Меч слева внизу)
      if (unit.currentAtk > 0) {
        this.ctx.fillStyle = '#b7094c';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(cx - 26, cy + 22, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 11px "8bitoperator", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${unit.currentAtk}`, cx - 26, cy + 23);
      }

      // Бейдж HP (Щит справа внизу)
      this.ctx.fillStyle = '#0077b6';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(cx + 26, cy + 22, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 11px "8bitoperator", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${unit.currentHp}`, cx + 26, cy + 23);

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

      // Тень текста
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      this.ctx.fillText(ft.text, ft.x + 2, ft.y + 2);

      // Основной цвет
      this.ctx.fillStyle = ft.color;
      this.ctx.fillText(ft.text, ft.x, ft.y);
    }
    this.ctx.restore();
  }
}
