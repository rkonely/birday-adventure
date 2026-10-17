import { CARDS_DATABASE, getCardById } from './cardsData.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';
import { gameState } from '../core/GameState.js';

// Точные координаты и углы наклона 4 карт с последнего кадра анимации бустера
const BOOSTER_SLOTS_LAYOUT = [
  { left: '14.3%', top: '52.8%', rotate: '-16.5deg', revealRotate: '-6deg' },
  { left: '31.0%', top: '44.5%', rotate: '-8.5deg',  revealRotate: '-2deg' },
  { left: '69.2%', top: '43.8%', rotate: '8.5deg',   revealRotate: '2deg'  },
  { left: '85.8%', top: '52.8%', rotate: '16.5deg',  revealRotate: '6deg'  }
];

// Настройки свечения редкости в стиле Hearthstone при наведении на рубашку
const RARITY_AURA_CONFIG = {
  common: {
    name: 'Обычная',
    color: '#f8fafc',
    secondary: '#cbd5e1',
    shadow: '0 0 26px rgba(255, 255, 255, 0.9), 0 0 55px rgba(226, 232, 240, 0.65)',
    particleColor: '#ffffff'
  },
  uncommon: {
    name: 'Необычная',
    color: '#2ecc71',
    secondary: '#10b981',
    shadow: '0 0 28px rgba(46, 204, 113, 0.95), 0 0 65px rgba(16, 185, 129, 0.75)',
    particleColor: '#4ade80'
  },
  rare: {
    name: 'Редкая',
    color: '#00a8ff',
    secondary: '#0284c7',
    shadow: '0 0 30px rgba(0, 168, 255, 0.98), 0 0 75px rgba(2, 132, 199, 0.85)',
    particleColor: '#38bdf8'
  },
  epic: {
    name: 'Эпическая',
    color: '#a855f7',
    secondary: '#7e22ce',
    shadow: '0 0 34px rgba(168, 85, 247, 1), 0 0 85px rgba(147, 51, 234, 0.9), 0 0 120px rgba(126, 34, 206, 0.6)',
    particleColor: '#d8b4fe'
  },
  legendary: {
    name: 'Легендарная!',
    color: '#ffb703',
    secondary: '#fb5607',
    shadow: '0 0 40px rgba(255, 183, 3, 1), 0 0 95px rgba(251, 86, 7, 0.95), 0 0 140px rgba(255, 215, 0, 0.85)',
    particleColor: '#fde047'
  }
};

/**
 * CardMarket — Интерактивный альбом-магазин карт перед битвой с Бобром
 * С бесшовным открытием бустера в стиле Hearthstone поверх финального кадра видео
 */
export class CardMarket {
  constructor(videoManager = null) {
    this.videoManager = videoManager || (window.birDayApp && window.birDayApp.videoManager);
    this.isActive = false;
    this.cardsPerPage = 8;
    this.currentPage = 0;
    this.totalPages = Math.ceil(CARDS_DATABASE.length / this.cardsPerPage);

    this.ownedCardIds = new Set();
    this.initPlayerCards();

    this.injectBoosterStyles();

    this.container = document.getElementById('screen-market');
    this.initDOM();
  }

  /**
   * Встраивает CSS-стили для веерного расположения карт на координатах видео,
   * подсветки редкости при наведении (Hearthstone Glow) и 3D-переворота
   */
  injectBoosterStyles() {
    if (document.getElementById('hs-booster-custom-styles')) return;
    const style = document.createElement('style');
    style.id = 'hs-booster-custom-styles';
    style.textContent = `
      #market-booster-modal.hs-booster-overlay {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 180;
        background: radial-gradient(circle at 50% 50%, rgba(12, 10, 18, 0.65), rgba(5, 5, 8, 0.94));
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      }
      #market-booster-modal.hs-booster-overlay.hidden {
        display: none !important;
      }

      /* Верхняя ненавязчивая плашка прогресса */
      .hs-booster-top-bar {
        margin-top: 18px;
        padding: 8px 26px;
        background: rgba(15, 12, 10, 0.82);
        border: 2px solid rgba(255, 183, 3, 0.45);
        border-radius: 999px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.75);
        text-align: center;
        z-index: 25;
        pointer-events: none;
        backdrop-filter: blur(4px);
      }
      .hs-booster-top-title {
        font-family: "8bitoperator", monospace, sans-serif;
        font-size: 16px;
        font-weight: bold;
        color: #fde68a;
        letter-spacing: 1px;
        text-shadow: 0 2px 4px #000;
      }

      /* Сцена 16:9, повторяющая пропорции видеокадра */
      .hs-booster-stage {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        perspective: 1400px;
        pointer-events: none;
      }

      /* Слот карты точно в координатах последнего кадра видео */
      .hs-card-slot {
        position: absolute;
        width: 19.6%;
        aspect-ratio: 0.705;
        transform: translate(-50%, -50%) rotate(var(--slot-rot, 0deg)) scale(1);
        transform-style: preserve-3d;
        transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), z-index 0s;
        cursor: pointer;
        pointer-events: auto;
        z-index: 10;
      }

      /* При наведении на ЗАКРЫТУЮ рубашку: приподнимаем и включаем свечение редкости! */
      .hs-card-slot:not(.is-flipped):hover {
        transform: translate(-50%, -54%) rotate(var(--slot-rot, 0deg)) scale(1.08);
        z-index: 30;
      }

      /* Для эпических и легендарных карт добавляем лёгкую вибрацию мощи при наведении */
      .hs-card-slot.rarity-epic:not(.is-flipped):hover .hs-card-inner,
      .hs-card-slot.rarity-legendary:not(.is-flipped):hover .hs-card-inner {
        animation: hsCardTremble 0.28s infinite alternate ease-in-out;
      }

      @keyframes hsCardTremble {
        0%   { transform: rotateZ(-1.2deg) scale(1.02); }
        100% { transform: rotateZ(1.2deg) scale(1.04); }
      }

      /* Когда карта перевёрнута — чуть выравниваем угол, чтобы удобно читать */
      .hs-card-slot.is-flipped {
        transform: translate(-50%, -50%) rotate(var(--reveal-rot, 0deg)) scale(1.03);
        z-index: 20;
      }
      .hs-card-slot.is-flipped:hover {
        transform: translate(-50%, -54%) rotate(0deg) scale(1.18);
        z-index: 45;
      }

      /* Внутренний 3D-контейнер для переворота */
      .hs-card-inner {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transition: transform 0.68s cubic-bezier(0.34, 1.56, 0.64, 1);
        border-radius: 14px;
      }
      .hs-card-slot.is-flipped .hs-card-inner {
        transform: rotateY(180deg);
      }

      /* Ореол редкости позади рубашки (плавно разгорается при наведении мыши) */
      .hs-rarity-aura {
        position: absolute;
        inset: -8px;
        border-radius: 18px;
        opacity: 0;
        transition: opacity 0.28s ease, transform 0.28s ease;
        pointer-events: none;
        box-shadow: var(--aura-shadow);
        background: radial-gradient(circle, var(--aura-color) 0%, transparent 72%);
        filter: blur(4px);
        z-index: -1;
      }
      .hs-card-slot:not(.is-flipped):hover .hs-rarity-aura {
        opacity: 1;
        transform: scale(1.06);
        animation: hsAuraPulse 1.1s infinite alternate ease-in-out;
      }
      /* После открытия ореол остаётся мягкой подсветкой вокруг редких карт */
      .hs-card-slot.is-flipped .hs-rarity-aura {
        opacity: 0.65;
        inset: -4px;
      }

      @keyframes hsAuraPulse {
        0%   { filter: blur(4px) brightness(1); transform: scale(1.03); }
        100% { filter: blur(8px) brightness(1.35); transform: scale(1.11); }
      }

      /* Стороны карты (Рубашка и Лицо) */
      .hs-card-face {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        border-radius: 12px;
        overflow: visible;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .hs-card-front-shirt img,
      .hs-card-back-art img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 12px;
        display: block;
        filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.75));
      }

      /* При наведении на рубашку подсвечиваем контур самой PNG-картинки цветом редкости */
      .hs-card-slot:not(.is-flipped):hover .hs-card-front-shirt img {
        filter: drop-shadow(0 0 12px var(--aura-color)) drop-shadow(0 0 24px var(--aura-secondary));
      }

      .hs-card-back-art {
        transform: rotateY(180deg);
      }

      /* Бейдж названия редкости при открытии */
      .hs-card-rarity-banner {
        position: absolute;
        bottom: -26px;
        padding: 3px 12px;
        border-radius: 999px;
        background: rgba(12, 10, 14, 0.92);
        border: 1.5px solid var(--aura-color);
        color: var(--aura-color);
        font-family: "8bitoperator", monospace, sans-serif;
        font-size: 12px;
        font-weight: bold;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.8);
        opacity: 0;
        transform: translateY(-6px);
        transition: opacity 0.35s ease 0.25s, transform 0.35s ease 0.25s;
        pointer-events: none;
      }
      .hs-card-slot.is-flipped .hs-card-rarity-banner {
        opacity: 1;
        transform: translateY(0);
      }

      /* Вспышка света в момент клика по карте */
      .hs-burst-ring {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: radial-gradient(circle, #ffffff 0%, var(--aura-color) 45%, transparent 75%);
        pointer-events: none;
        z-index: 40;
      }
      .hs-card-slot.is-flipped .hs-burst-ring {
        animation: hsBurstExpand 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes hsBurstExpand {
        0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
        70%  { opacity: 0.85; }
        100% { transform: translate(-50%, -50%) scale(16); opacity: 0; }
      }

      /* Плавающие искорки при наведении на закрытую карту */
      .hs-hover-sparks {
        position: absolute;
        inset: -15px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.25s;
      }
      .hs-card-slot:not(.is-flipped):hover .hs-hover-sparks {
        opacity: 1;
      }
      .hs-spark-dot {
        position: absolute;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--aura-color);
        box-shadow: 0 0 10px #fff, 0 0 16px var(--aura-color);
        animation: hsFloatSpark 1.2s infinite ease-in-out;
      }
      @keyframes hsFloatSpark {
        0%   { transform: translateY(8px) scale(0.4); opacity: 0; }
        50%  { opacity: 1; transform: translateY(-8px) scale(1.1); }
        100% { transform: translateY(-24px) scale(0.2); opacity: 0; }
      }

      /* Нижняя кнопка сбора карт */
      .hs-booster-bottom-bar {
        margin-bottom: 22px;
        z-index: 35;
        display: flex;
        gap: 14px;
        align-items: center;
      }
      .hs-booster-collect-btn {
        transition: transform 0.25s ease, opacity 0.25s ease, filter 0.25s ease;
      }
      .hs-booster-collect-btn.disabled {
        opacity: 0;
        pointer-events: none;
        transform: translateY(15px);
      }
      .hs-booster-collect-btn:not(.disabled) {
        opacity: 1;
        transform: translateY(0);
        animation: hsBtnPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes hsBtnPop {
        0%   { transform: scale(0.75) translateY(15px); opacity: 0; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  initPlayerCards() {
    this.ownedCardIds = new Set();
    try {
      const saved = localStorage.getItem('birday_player_cards');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) {
          arr.forEach(id => this.ownedCardIds.add(id));
        }
      }
    } catch (e) {}
  }

  resetCards() {
    this.ownedCardIds = new Set();
    try {
      localStorage.removeItem('birday_player_cards');
    } catch (e) {}
    if (this.container && !this.container.classList.contains('hidden')) {
      this.renderAlbum();
    }
  }

  savePlayerCards() {
    try {
      localStorage.setItem('birday_player_cards', JSON.stringify([...this.ownedCardIds]));
    } catch (e) {}
  }

  getEggBalance() {
    try {
      const statsJson = localStorage.getItem('birday_board_stats');
      if (statsJson) {
        const stats = JSON.parse(statsJson);
        if (typeof stats.eggs === 'number') {
          return stats.eggs;
        }
      }
    } catch (e) {}
    if (gameState && gameState.data && typeof gameState.data.eggs === 'number') {
      return gameState.data.eggs;
    }
    return 0;
  }

  setEggBalance(newAmount) {
    try {
      let stats = { eggs: newAmount };
      const statsJson = localStorage.getItem('birday_board_stats');
      if (statsJson) {
        stats = { ...JSON.parse(statsJson), eggs: newAmount };
      }
      localStorage.setItem('birday_board_stats', JSON.stringify(stats));
    } catch (e) {}
    if (gameState && gameState.data) {
      gameState.data.eggs = newAmount;
      if (typeof gameState.saveToStorage === 'function') {
        gameState.saveToStorage();
      }
    }
  }

  getBoosterCount() {
    try {
      const statsJson = localStorage.getItem('birday_board_stats');
      if (statsJson) {
        const stats = JSON.parse(statsJson);
        return stats.boosterPacks || 0;
      }
    } catch (e) {}
    return 0;
  }

  addBooster(count = 1) {
    try {
      const statsJson = localStorage.getItem('birday_board_stats');
      const stats = statsJson ? JSON.parse(statsJson) : {};
      stats.boosterPacks = (stats.boosterPacks || 0) + count;
      localStorage.setItem('birday_board_stats', JSON.stringify(stats));
    } catch (e) {}
  }

  consumeBooster() {
    try {
      const statsJson = localStorage.getItem('birday_board_stats');
      if (statsJson) {
        const stats = JSON.parse(statsJson);
        stats.boosterPacks = Math.max(0, (stats.boosterPacks || 1) - 1);
        localStorage.setItem('birday_board_stats', JSON.stringify(stats));
      }
    } catch (e) {}
  }

  getEggNestIcon(eggs) {
    if (eggs >= 40) return 'assets/UI/Market-4-Egg.png';
    if (eggs >= 30) return 'assets/UI/Market-3-Egg.png';
    if (eggs >= 20) return 'assets/UI/Market-2-Egg.png';
    if (eggs >= 1) return 'assets/UI/Market-1-Egg.png';
    return 'assets/UI/Market-0-Egg.png';
  }

  initDOM() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="market-stage-viewport">
        <!-- Верхний каменный баннер "В БОЙ С БОБРОМ! ⚔️" -->
        <div class="market-top-banner">
          <div class="market-title-stone-wrap" id="btn-market-title-final" title="Вступить в бой с Бобром!">
            <img src="assets/UI/Title Stone.png" alt="В БОЙ С БОБРОМ!" class="market-title-stone-img" />
            <span class="market-title-stone-text">В БОЙ С БОБРОМ!</span>
          </div>
        </div>

        <!-- Левый стрелочный переключатель -->
        <button id="btn-market-page-prev" class="market-page-arrow market-arrow-left" title="Предыдущая страница">
          <img src="assets/UI/UI-Market-Arrow-Left.png" alt="◀" />
        </button>

        <!-- Правый стрелочный переключатель -->
        <button id="btn-market-page-next" class="market-page-arrow market-arrow-right" title="Следующая страница">
          <img src="assets/UI/UI-Market-Arrow-Right.png" alt="▶" />
        </button>

        <!-- Левая страница альбома (4 кармашка 2x2) -->
        <div class="market-album-page market-album-left" id="market-page-left">
          <div class="market-card-slot" data-slot="0"></div>
          <div class="market-card-slot" data-slot="1"></div>
          <div class="market-card-slot" data-slot="2"></div>
          <div class="market-card-slot" data-slot="3"></div>
        </div>

        <!-- Правая страница альбома (4 кармашка 2x2) -->
        <div class="market-album-page market-album-right" id="market-page-right">
          <div class="market-card-slot" data-slot="4"></div>
          <div class="market-card-slot" data-slot="5"></div>
          <div class="market-card-slot" data-slot="6"></div>
          <div class="market-card-slot" data-slot="7"></div>
        </div>

        <!-- Левый стол: Счетчик собранных карт -->
        <div class="market-desk-left">
          <div class="market-deck-icon-wrap">
            <img src="assets/UI/Status-Icon-CardCount.png" alt="Колода" class="market-deck-icon" />
          </div>
          <div class="market-deck-counter" id="market-deck-counter">13/${CARDS_DATABASE.length}</div>
          <div class="market-page-counter" id="market-page-counter">СТР. 1/${this.totalPages}</div>
        </div>

        <!-- Правый стол: Гнездо с балансом яиц и Бустер-пак -->
        <div class="market-desk-right">
          <div class="market-nest-section" id="market-nest-section">
            <div class="market-nest-egg-amount" id="market-nest-amount">0</div>
            <div class="market-nest-img-wrap">
              <img src="assets/UI/Market-0-Egg.png" alt="Гнездо с яйцами" class="market-nest-img" id="market-nest-img" />
            </div>
          </div>

          <div class="market-booster-section">
            <div class="market-booster-owned-label" id="market-booster-owned-label" style="display: none;"></div>
            <div class="market-booster-pack-wrap" id="market-booster-img-wrap">
              <img src="assets/Market/Booster-Pack.png" alt="Forest Friends Booster Pack" class="market-booster-pack-img" />
            </div>
            
            <button id="btn-market-buy-booster" class="market-buy-btn market-booster-btn" title="Купить бустер карт">
              <span class="market-buy-price-val" id="market-booster-price-text">15</span>
            </button>
          </div>
        </div>

        <!-- Всплывающая подсказка с описанием карты при наведении -->
        <div id="market-card-tooltip" class="market-card-tooltip hidden" style="z-index: 250;"></div>

        <!-- Бесшовное окно вскрытия Бустера в стиле Hearthstone (поверх последнего кадра видео) -->
        <div id="market-booster-modal" class="hs-booster-overlay hidden">
          <div class="hs-booster-top-bar">
            <div class="hs-booster-top-title" id="booster-modal-subtitle">
              Наведите курсор, чтобы почувствовать редкость, и нажмите на карты! (0 / 4)
            </div>
          </div>

          <div class="hs-booster-stage" id="market-booster-cards-row"></div>

          <div class="hs-booster-bottom-bar">
            <button id="btn-market-close-booster" class="btn-leaf-green hs-booster-collect-btn disabled" disabled>
              <span class="btn-leaf-green-text">ЗАБРАТЬ В КОЛОДУ ▶</span>
            </button>
          </div>
        </div>

      </div>
    `;

    const btnPrev = document.getElementById('btn-market-page-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (this.currentPage > 0) {
          audio.playPageFlip();
          this.currentPage--;
          this.renderAlbum();
        }
      });
    }

    const btnNext = document.getElementById('btn-market-page-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (this.currentPage < this.totalPages - 1) {
          audio.playPageFlip();
          this.currentPage++;
          this.renderAlbum();
        }
      });
    }

    const btnBooster = document.getElementById('btn-market-buy-booster');
    if (btnBooster) {
      btnBooster.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleBuyBoosterClick();
      });
    }

    const boosterImgWrap = document.getElementById('market-booster-img-wrap');
    if (boosterImgWrap) {
      boosterImgWrap.style.cursor = 'pointer';
      boosterImgWrap.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleBoosterPackClick();
      });
    }

    const boosterSection = document.querySelector('.market-booster-section');
    if (boosterSection) {
      boosterSection.style.cursor = 'pointer';
      boosterSection.addEventListener('click', (e) => {
        if (e.target.closest('#btn-market-buy-booster')) return;
        this.handleBoosterPackClick();
      });
    }

    const btnCloseBooster = document.getElementById('btn-market-close-booster');
    if (btnCloseBooster) {
      btnCloseBooster.addEventListener('click', () => {
        audio.playClick();
        this.hideCardTooltip();
        const modal = document.getElementById('market-booster-modal');
        if (modal) {
          modal.classList.add('hidden');
          modal.style.backgroundImage = '';
        }
        this.renderAlbum();
      });
    }

    const btnTitle = document.getElementById('btn-market-title-final');
    if (btnTitle) {
      btnTitle.addEventListener('click', () => {
        audio.playClick();
        this.proceedToBoss();
      });
    }
  }

  start() {
    this.isActive = true;
    this.totalPages = Math.ceil(CARDS_DATABASE.length / this.cardsPerPage);
    if (this.container) {
      this.container.classList.remove('hidden');
      this.container.classList.add('active');
    }

    audio.playMusic('CARD_MARKET');
    this.renderAlbum();
  }

  stop() {
    this.isActive = false;
    if (this.container) {
      this.container.classList.remove('active');
      this.container.classList.add('hidden');
    }
    this.hideCardTooltip();
    const modal = document.getElementById('market-booster-modal');
    if (modal) modal.classList.add('hidden');
  }

  renderAlbum() {
    this.totalPages = Math.ceil(CARDS_DATABASE.length / this.cardsPerPage);

    const currentEggs = this.getEggBalance();
    const elNestAmount = document.getElementById('market-nest-amount');
    if (elNestAmount) elNestAmount.textContent = String(currentEggs);

    const elNestImg = document.getElementById('market-nest-img');
    if (elNestImg) elNestImg.src = this.getEggNestIcon(currentEggs);

    const elDeckCounter = document.getElementById('market-deck-counter');
    if (elDeckCounter) {
      elDeckCounter.textContent = `${this.ownedCardIds.size}/${CARDS_DATABASE.length}`;
    }

    const elPageCounter = document.getElementById('market-page-counter');
    if (elPageCounter) {
      elPageCounter.textContent = `СТР. ${this.currentPage + 1}/${this.totalPages}`;
    }

    const btnPrev = document.getElementById('btn-market-page-prev');
    if (btnPrev) btnPrev.classList.toggle('disabled', this.currentPage === 0);

    const btnNext = document.getElementById('btn-market-page-next');
    if (btnNext) btnNext.classList.toggle('disabled', this.currentPage >= this.totalPages - 1);

    const freeBoosters = this.getBoosterCount();
    const isAllCollected = this.ownedCardIds.size >= CARDS_DATABASE.length;
    const boosterBtn = document.getElementById('btn-market-buy-booster');
    const boosterPriceText = document.getElementById('market-booster-price-text');
    const boosterOwnedLabel = document.getElementById('market-booster-owned-label');

    if (boosterOwnedLabel) {
      if (freeBoosters >= 1) {
        boosterOwnedLabel.textContent = `Имеется : ${freeBoosters}`;
        boosterOwnedLabel.style.display = 'block';
      } else {
        boosterOwnedLabel.textContent = '';
        boosterOwnedLabel.style.display = 'none';
      }
    }

    if (boosterBtn && boosterPriceText) {
      if (isAllCollected && freeBoosters <= 0) {
        boosterBtn.classList.add('is-bought');
        boosterBtn.classList.remove('cant-afford');
        boosterBtn.disabled = true;
        boosterBtn.title = `Все ${CARDS_DATABASE.length} карт уже в вашей колоде!`;
        boosterPriceText.textContent = '';
      } else {
        const canAfford = currentEggs >= 15;
        boosterBtn.classList.remove('is-bought');
        boosterBtn.classList.toggle('cant-afford', !canAfford);
        boosterBtn.disabled = false;
        boosterBtn.title = canAfford ? 'Купить бустер карт за 15 яиц' : `Не хватает яиц! Нужно 15 (у вас: ${currentEggs})`;
        boosterPriceText.textContent = '15';
      }
    }

    const startIndex = this.currentPage * this.cardsPerPage;
    const pageCards = CARDS_DATABASE.slice(startIndex, startIndex + this.cardsPerPage);

    for (let slotIdx = 0; slotIdx < 8; slotIdx++) {
      const slotEl = this.container.querySelector(`.market-card-slot[data-slot="${slotIdx}"]`);
      if (!slotEl) continue;

      const card = pageCards[slotIdx];
      if (!card) {
        slotEl.innerHTML = '<div class="market-card-empty-sleeve"></div>';
        continue;
      }

      const isOwned = this.ownedCardIds.has(card.id);
      const price = card.price || 10;
      const canAfford = currentEggs >= price;

      slotEl.innerHTML = `
        <div class="market-card-item ${isOwned ? 'owned' : 'unowned'}" data-card-id="${card.id}">
          <div class="market-card-img-wrap">
            <img src="${card.image}" alt="${card.name}" class="market-card-img" />
          </div>

          <div class="market-buy-btn-wrap">
            <button class="market-buy-btn ${isOwned ? 'is-bought' : (canAfford ? '' : 'cant-afford')}" 
                    data-buy-id="${card.id}" 
                    title="${isOwned ? 'Карта уже в вашей колоде' : `Купить за ${price} яиц`}"
                    ${isOwned ? 'disabled' : ''}>
              ${isOwned ? '' : `<span class="market-buy-price-val">${price}</span>`}
            </button>
          </div>
        </div>
      `;

      const cardItem = slotEl.querySelector('.market-card-item');
      if (cardItem) {
        cardItem.addEventListener('mouseenter', (e) => this.showCardTooltip(card, e));
        cardItem.addEventListener('mouseleave', () => this.hideCardTooltip());
      }

      const buyBtn = slotEl.querySelector('.market-buy-btn');
      if (buyBtn && !isOwned) {
        buyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.buyCard(card);
        });
      }
    }
  }

  buyCard(card) {
    const currentEggs = this.getEggBalance();
    const price = card.price || 10;

    if (currentEggs < price) {
      audio.playImpact();
      this.shakeNest();
      this.showQuickNotice(`Не хватает яиц! Нужно ещё ${price - currentEggs}`);
      return;
    }

    audio.playSuccess();
    const remaining = currentEggs - price;
    this.setEggBalance(remaining);
    this.ownedCardIds.add(card.id);
    this.savePlayerCards();

    this.showQuickNotice(`«${card.name}» добавлена в колоду!`);
    this.renderAlbum();
  }

  handleBuyBoosterClick() {
    const isAllCollected = this.ownedCardIds.size >= CARDS_DATABASE.length;
    if (isAllCollected) {
      audio.playImpact();
      this.showQuickNotice(`Все ${CARDS_DATABASE.length} карт уже в вашей колоде!`);
      return;
    }

    const currentEggs = this.getEggBalance();
    if (currentEggs < 15) {
      audio.playImpact();
      this.shakeNest();
      this.showQuickNotice(`Не хватает яиц на бустер! Нужно 15 (у вас: ${currentEggs})`);
      return;
    }

    audio.playSuccess();
    this.setEggBalance(currentEggs - 15);
    this.addBooster(1);
    this.renderAlbum();

    const packWrap = document.getElementById('market-booster-img-wrap');
    if (packWrap) {
      packWrap.classList.remove('booster-bought-pulse');
      void packWrap.offsetWidth;
      packWrap.classList.add('booster-bought-pulse');
    }

    this.showQuickNotice('Бустер куплен! Нажмите на бустер, чтобы открыть его!');
  }

  handleBoosterPackClick() {
    const freeBoosters = this.getBoosterCount();

    if (freeBoosters > 0) {
      audio.playSuccess();
      this.consumeBooster();
      this.renderAlbum();
      this.playBoosterOpeningVideo();
      return;
    }

    const isAllCollected = this.ownedCardIds.size >= CARDS_DATABASE.length;
    if (isAllCollected) {
      audio.playImpact();
      this.showQuickNotice(`Все ${CARDS_DATABASE.length} карт уже в колоде! Пора на битву с Бобром!`);
      return;
    }

    audio.playImpact();
    this.shakeNest();
    this.showQuickNotice('У вас нет бустеров! Нажмите «КУПИТЬ» за 15 яиц.');
  }

  /**
   * Захватывает последний кадр видео перед его закрытием,
   * чтобы фон модалки бустера на 100% бесшовно совпал с окончанием анимации!
   */
  captureVideoLastFrame(videoWrapper) {
    try {
      const videoEl = videoWrapper ? videoWrapper.querySelector('video') : document.querySelector('video');
      if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.92);
      }
    } catch (e) {}
    return null;
  }

  playBoosterOpeningVideo() {
    const videoWrapper = document.getElementById('video-wrapper');
    const btnSkip = document.getElementById('btn-skip-video');

    if (this.container) {
      this.container.classList.add('hidden');
    }
    if (videoWrapper) {
      videoWrapper.style.zIndex = '150';
      videoWrapper.style.display = 'block';
      videoWrapper.classList.remove('hidden');
    }
    if (btnSkip) {
      btnSkip.style.zIndex = '160';
      btnSkip.classList.remove('hidden');
    }

    let isDone = false;
    const onFinished = () => {
      if (isDone) return;
      isDone = true;

      // Снимаем точный стоп-кадр конца видео для бесшовного фона
      const lastFrameDataUrl = this.captureVideoLastFrame(videoWrapper);

      if (btnSkip) {
        btnSkip.classList.add('hidden');
        btnSkip.style.zIndex = '';
      }
      if (videoWrapper) {
        videoWrapper.style.display = 'none';
        videoWrapper.style.zIndex = '';
      }
      if (this.container) {
        this.container.classList.remove('hidden');
      }
      this.openBoosterModal(lastFrameDataUrl);
    };

    const vm = this.videoManager || (window.birDayApp && window.birDayApp.videoManager);
    if (vm) {
      vm.playVideo('BOOSTER_OPEN', onFinished);
    } else {
      onFinished();
    }
  }

  /**
   * Открывает 4 интерактивные карты поверх последнего кадра видео в тех же координатах и углах
   */
  openBoosterModal(lastFrameDataUrl = null) {
    const modal = document.getElementById('market-booster-modal');
    const cardsRow = document.getElementById('market-booster-cards-row');
    const subtitleEl = document.getElementById('booster-modal-subtitle');
    const btnCollect = document.getElementById('btn-market-close-booster');
    if (!modal || !cardsRow) return;

    // Если удалось снять стоп-кадр с видео — ставим его бесшовным фоном!
    if (lastFrameDataUrl) {
      modal.style.backgroundImage = `url('${lastFrameDataUrl}')`;
    } else {
      modal.style.backgroundImage = '';
    }

    // Выбираем 4 случайные карты (приоритет неоткрытым)
    const unowned = CARDS_DATABASE.filter(c => !this.ownedCardIds.has(c.id));
    let dropped = [];
    if (unowned.length >= 4) {
      const shuffled = [...unowned].sort(() => 0.5 - Math.random());
      dropped = shuffled.slice(0, 4);
    } else if (unowned.length > 0) {
      dropped = [...unowned];
      const rest = CARDS_DATABASE.filter(c => !unowned.some(u => u.id === c.id));
      const shuffledRest = [...rest].sort(() => 0.5 - Math.random());
      dropped = dropped.concat(shuffledRest.slice(0, 4 - unowned.length));
    } else {
      const shuffled = [...CARDS_DATABASE].sort(() => 0.5 - Math.random());
      dropped = shuffled.slice(0, 4);
    }

    let openedCount = 0;
    cardsRow.innerHTML = '';

    if (btnCollect) {
      btnCollect.disabled = true;
      btnCollect.classList.add('disabled');
    }
    if (subtitleEl) {
      subtitleEl.textContent = 'Наведите на рубашку, чтобы увидеть ауру редкости, и нажмите! (0 / 4)';
    }

    dropped.forEach((card, i) => {
      const layout = BOOSTER_SLOTS_LAYOUT[i] || BOOSTER_SLOTS_LAYOUT[0];
      const aura = RARITY_AURA_CONFIG[card.rarity] || RARITY_AURA_CONFIG.common;

      const slotEl = document.createElement('div');
      slotEl.className = `hs-card-slot rarity-${card.rarity}`;
      slotEl.style.left = layout.left;
      slotEl.style.top = layout.top;
      slotEl.style.setProperty('--slot-rot', layout.rotate);
      slotEl.style.setProperty('--reveal-rot', layout.revealRotate);
      slotEl.style.setProperty('--aura-color', aura.color);
      slotEl.style.setProperty('--aura-secondary', aura.secondary);
      slotEl.style.setProperty('--aura-shadow', aura.shadow);

      // Генерируем 8 парящих искр вокруг рубашки при наведении
      let sparksHtml = '';
      for (let s = 0; s < 8; s++) {
        const leftPct = 8 + Math.round(Math.random() * 84);
        const topPct = 10 + Math.round(Math.random() * 80);
        const delay = (s * 0.14).toFixed(2);
        sparksHtml += `<span class="hs-spark-dot" style="left:${leftPct}%; top:${topPct}%; animation-delay:${delay}s;"></span>`;
      }

      slotEl.innerHTML = `
        <div class="hs-rarity-aura"></div>
        <div class="hs-burst-ring"></div>
        <div class="hs-hover-sparks">${sparksHtml}</div>

        <div class="hs-card-inner">
          <!-- Рубашка карты (лежит точно поверх рубашки из видео) -->
          <div class="hs-card-face hs-card-front-shirt">
            <img src="assets/Market/Card back/Back-Card01.png" alt="Рубашка карты" draggable="false" />
          </div>

          <!-- Лицевая сторона карты -->
          <div class="hs-card-face hs-card-back-art">
            <img src="${card.image}" alt="${card.name}" draggable="false" />
            <div class="hs-card-rarity-banner">${aura.name}: ${card.name}</div>
          </div>
        </div>
      `;

      // Звук при наведении на закрытую карту + показ тултипа для открытой карты
      slotEl.addEventListener('mouseenter', (e) => {
        if (slotEl.classList.contains('is-flipped')) {
          this.showCardTooltip(card, e);
        }
      });

      slotEl.addEventListener('mouseleave', () => {
        this.hideCardTooltip();
      });

      // Клик: переворот в стиле Hearthstone со вспышкой редкости
      slotEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (slotEl.classList.contains('is-flipped')) return;

        slotEl.classList.add('is-flipped');
        openedCount++;
        this.ownedCardIds.add(card.id);

        if (card.rarity === 'legendary' || card.rarity === 'epic') {
          if (typeof audio.playSuccess === 'function') audio.playSuccess(); else audio.playClick();
        } else {
          if (typeof audio.playPageFlip === 'function') audio.playPageFlip();
          else if (typeof audio.playSuccess === 'function') audio.playSuccess();
          else audio.playClick();
        }

        if (subtitleEl) {
          subtitleEl.textContent = `Открыто карт: ${openedCount} / 4 — наведите на открытую карту для подробностей`;
        }

        if (openedCount >= 4) {
          this.savePlayerCards();
          if (subtitleEl) {
            subtitleEl.textContent = 'Все 4 карты открыты! Нажмите «ЗАБРАТЬ В КОЛОДУ» внизу экрана';
          }
          if (btnCollect) {
            btnCollect.disabled = false;
            btnCollect.classList.remove('disabled');
          }
        }
      });

      cardsRow.appendChild(slotEl);
    });

    modal.classList.remove('hidden');
  }

  showCardTooltip(card, event) {
    const tip = document.getElementById('market-card-tooltip');
    if (!tip) return;

    const rarityColors = {
      common: '#f8fafc',
      uncommon: '#2ecc71',
      rare: '#00a8ff',
      epic: '#a855f7',
      legendary: '#ffb703'
    };
    const rarityNames = {
      common: 'Обычная',
      uncommon: 'Необычная',
      rare: 'Редкая',
      epic: 'Эпическая',
      legendary: 'Легендарная'
    };

    const color = rarityColors[card.rarity] || '#ffb703';
    const rarityName = rarityNames[card.rarity] || 'Герой';

    tip.innerHTML = `
      <div class="market-tip-header" style="border-bottom-color: ${color}">
        <div class="market-tip-name" style="color: ${color}">${card.name}</div>
        <div class="market-tip-rarity" style="color: ${color}">[${rarityName}]</div>
      </div>
      <div class="market-tip-role">${card.role || ''}</div>
      <div class="market-tip-stats">
        <span class="tip-stat tip-atk">ATK: ${card.atk}</span>
        <span class="tip-stat tip-hp">HP: ${card.hp}</span>
      </div>
      <div class="market-tip-ability">
        <div class="tip-ability-name">★ ${card.abilityName || 'Способность'}:</div>
        <div class="tip-ability-desc">${card.abilityDesc || 'Базовая атака'}</div>
      </div>
    `;

    tip.classList.remove('hidden');
    const rect = event.currentTarget.getBoundingClientRect();
    const vpRect = this.container.getBoundingClientRect();

    let x = rect.left - vpRect.left + (rect.width / 2) - 120;
    let y = rect.top - vpRect.top - 145;

    if (x < 10) x = 10;
    if (x + 250 > vpRect.width) x = vpRect.width - 260;
    if (y < 10) y = rect.bottom - vpRect.top + 15;

    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }

  hideCardTooltip() {
    const tip = document.getElementById('market-card-tooltip');
    if (tip) tip.classList.add('hidden');
  }

  shakeNest() {
    const nest = document.getElementById('market-nest-section');
    if (nest) {
      nest.classList.remove('shake-anim');
      void nest.offsetWidth;
      nest.classList.add('shake-anim');
    }
  }

  showQuickNotice(text) {
    if (!text) return;
    const container = document.getElementById('toast-container') || this.container.querySelector('.market-stage-viewport');
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

  proceedToBoss() {
    console.log('⚔️ [CardMarket] Выход на арену босса с собранной колодой!');
    const deck = CARDS_DATABASE.filter(c => this.ownedCardIds.has(c.id));
    this.stop();
    events.emit('stage:switch_to_boss_arena', deck);
  }
}