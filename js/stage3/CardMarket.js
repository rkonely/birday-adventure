import { CARDS_DATABASE, getCardById } from './cardsData.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';

/**
 * CardMarket — Интерактивный альбом-магазин карт перед битвой с Бобром
 * Соответствует макету пользователя и ассетам в assets/Market/ & assets/UI/
 */
export class CardMarket {
  constructor() {
    this.isActive = false;
    this.cardsPerPage = 8;
    this.currentPage = 0;
    this.totalPages = Math.ceil(CARDS_DATABASE.length / this.cardsPerPage); // 29 cards -> 4 pages

    // Загрузка сохраненных данных
    this.ownedCardIds = new Set();
    this.initPlayerCards();

    // DOM элементы
    this.container = document.getElementById('screen-market');
    this.initDOM();
  }

  initPlayerCards() {
    try {
      const saved = localStorage.getItem('birday_player_cards');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) {
          arr.forEach(id => this.ownedCardIds.add(id));
          return;
        }
      }
    } catch (e) {}

    // Стартовая коллекция из 13 карт (как на скриншоте 13/29)
    // 7 обычных + 4 необычных + 2 редких
    const commons = CARDS_DATABASE.filter(c => c.rarity === 'common');
    const uncommons = CARDS_DATABASE.filter(c => c.rarity === 'uncommon');
    const rares = CARDS_DATABASE.filter(c => c.rarity === 'rare');

    commons.forEach(c => this.ownedCardIds.add(c.id));
    uncommons.slice(0, 4).forEach(c => this.ownedCardIds.add(c.id));
    rares.slice(0, 2).forEach(c => this.ownedCardIds.add(c.id));

    this.savePlayerCards();
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
    return 53; // Значение по умолчанию с макета
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

  initDOM() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="market-stage-viewport">
        <!-- Верхний каменный баннер "В БОЙ С БОБРОМ! ⚔️" -->
        <div class="market-top-banner">
          <div class="market-title-stone-wrap" id="btn-market-title-final" title="Вступить в бой с Бобром!">
            <img src="assets/UI/Title Stone.png" alt="В БОЙ С БОБРОМ!" class="market-title-stone-img" />
            <span class="market-title-stone-text">В БОЙ С БОБРОМ! ⚔️</span>
          </div>
        </div>

        <!-- Левый стрелочный переключатель (на кожаном ушке альбома) -->
        <button id="btn-market-page-prev" class="market-page-arrow market-arrow-left" title="Предыдущая страница">
          <img src="assets/UI/UI-Market-Arrow-Left.png" alt="◀" />
        </button>

        <!-- Правый стрелочный переключатель (на кожаном ушке альбома) -->
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

        <!-- Левый стол: Счетчик собранных карт (13/29) -->
        <div class="market-desk-left">
          <div class="market-deck-icon-wrap">
            <img src="assets/UI/Status-Icon-CardCount.png" alt="Колода" class="market-deck-icon" />
          </div>
          <div class="market-deck-counter" id="market-deck-counter">13/29</div>
          <div class="market-page-counter" id="market-page-counter">СТР. 1/4</div>
        </div>

        <!-- Правый стол: Гнездо с балансом яиц и Бустер-пак -->
        <div class="market-desk-right">
          
          <!-- Гнездо с суммой наших яиц -->
          <div class="market-nest-section" id="market-nest-section">
            <div class="market-nest-egg-amount" id="market-nest-amount">53</div>
            <div class="market-nest-img-wrap">
              <img src="assets/First-Level/Nest/Nest-egy.png" alt="Гнездо с яйцами" class="market-nest-img" />
            </div>
          </div>

          <!-- Бустер-пак лесных друзей -->
          <div class="market-booster-section">
            <div class="market-booster-pack-wrap" id="market-booster-img-wrap">
              <img src="assets/Market/Booster-Pack.png" alt="Forest Friends Booster Pack" class="market-booster-pack-img" />
            </div>
            
            <!-- Кнопка покупки/открытия бустера Price-Buy-Btn -->
            <button id="btn-market-buy-booster" class="market-buy-btn market-booster-btn" title="Купить бустер карт">
              <span class="market-buy-price-val" id="market-booster-price-text">15</span>
            </button>
          </div>

        </div>

        <!-- Всплывающая подсказка с описанием карты при наведении -->
        <div id="market-card-tooltip" class="market-card-tooltip hidden"></div>

        <!-- Модальное окно вскрытия Бустер-пака (4 интерактивные карты) -->
        <div id="market-booster-modal" class="market-booster-modal hidden">
          <div class="market-booster-modal-content">
            <div class="market-booster-modal-header">
              <span class="booster-modal-title">✨ ОТКРЫТИЕ БУСТЕРА КАРТ! ✨</span>
              <div class="booster-modal-subtitle" id="booster-modal-subtitle">Нажмите на рубашку каждой карты, чтобы открыть её! (0 / 4)</div>
            </div>
            <div class="market-booster-cards-row" id="market-booster-cards-row"></div>
            <button id="btn-market-close-booster" class="btn-leaf-green booster-collect-btn disabled" disabled title="Сначала откройте все 4 карты">
              <span class="btn-leaf-green-text">ЗАБРАТЬ В КОЛОДУ ▶</span>
            </button>
          </div>
        </div>

      </div>
    `;

    // Привязываем обработчики событий
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
      btnBooster.addEventListener('click', () => this.handleBoosterClick());
    }

    const btnCloseBooster = document.getElementById('btn-market-close-booster');
    if (btnCloseBooster) {
      btnCloseBooster.addEventListener('click', () => {
        audio.playClick();
        const modal = document.getElementById('market-booster-modal');
        if (modal) modal.classList.add('hidden');
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
    if (this.container) {
      this.container.classList.remove('hidden');
      this.container.classList.add('active');
    }

    // Звук успешного входа в магазин
    audio.playSuccess();

    this.renderAlbum();
  }

  stop() {
    this.isActive = false;
    if (this.container) {
      this.container.classList.remove('active');
      this.container.classList.add('hidden');
    }
    const tip = document.getElementById('market-card-tooltip');
    if (tip) tip.classList.add('hidden');
  }

  renderAlbum() {
    // 1. Обновляем баланс яиц в гнезде
    const currentEggs = this.getEggBalance();
    const elNestAmount = document.getElementById('market-nest-amount');
    if (elNestAmount) {
      elNestAmount.textContent = String(currentEggs);
    }

    // 2. Обновляем счетчик карт
    const elDeckCounter = document.getElementById('market-deck-counter');
    if (elDeckCounter) {
      elDeckCounter.textContent = `${this.ownedCardIds.size}/${CARDS_DATABASE.length}`;
    }

    // 3. Обновляем счетчик страниц
    const elPageCounter = document.getElementById('market-page-counter');
    if (elPageCounter) {
      elPageCounter.textContent = `СТР. ${this.currentPage + 1}/${this.totalPages}`;
    }

    // 4. Состояние стрелок перелистывания
    const btnPrev = document.getElementById('btn-market-page-prev');
    if (btnPrev) {
      btnPrev.classList.toggle('disabled', this.currentPage === 0);
    }
    const btnNext = document.getElementById('btn-market-page-next');
    if (btnNext) {
      btnNext.classList.toggle('disabled', this.currentPage >= this.totalPages - 1);
    }

    // 5. Обновляем кнопку бустера
    const freeBoosters = this.getBoosterCount();
    const boosterPriceText = document.getElementById('market-booster-price-text');
    const boosterBtnText = document.getElementById('market-booster-btn-text');
    if (boosterPriceText && boosterBtnText) {
      if (freeBoosters > 0) {
        boosterPriceText.textContent = `x${freeBoosters}`;
        boosterBtnText.textContent = 'ОТКРЫТЬ';
      } else {
        boosterPriceText.textContent = '15';
        boosterBtnText.textContent = 'КУПИТЬ';
      }
    }

    // 6. Отрисовка 8 слотов страниц (4 слева, 4 справа)
    const startIndex = this.currentPage * this.cardsPerPage;
    const pageCards = CARDS_DATABASE.slice(startIndex, startIndex + this.cardsPerPage);

    for (let slotIdx = 0; slotIdx < 8; slotIdx++) {
      const slotEl = this.container.querySelector(`.market-card-slot[data-slot="${slotIdx}"]`);
      if (!slotEl) continue;

      const card = pageCards[slotIdx];
      if (!card) {
        // Пустой слот альбома
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
            <!-- Название способности прямо на карте -->
            <div class="market-card-ability-badge" title="${card.abilityName}">
              <span class="ability-badge-text">«${card.abilityName}»</span>
            </div>
          </div>

          <!-- Кнопка покупки Price-Buy-Btn -->
          <div class="market-buy-btn-wrap">
            <button class="market-buy-btn ${isOwned ? 'is-bought' : (canAfford ? '' : 'cant-afford')}" 
                    data-buy-id="${card.id}" 
                    title="${isOwned ? 'Карта уже в вашей колоде' : `Купить за ${price} яиц`}">
              <span class="market-buy-price-val">${isOwned ? '✔' : price}</span>
            </button>
          </div>
        </div>
      `;

      // Привязка событий наведения (тултип) и клика (покупка)
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
      // Недостаточно яиц
      audio.playImpact();
      this.shakeNest();
      this.showQuickNotice(`Не хватает яиц! Нужно ещё ${price - currentEggs} 🥚`);
      return;
    }

    // Успешная покупка
    audio.playSuccess();
    const remaining = currentEggs - price;
    this.setEggBalance(remaining);
    this.ownedCardIds.add(card.id);
    this.savePlayerCards();

    // Анимация успешной покупки
    this.showQuickNotice(`«${card.name}» добавлена в колоду!`);
    this.renderAlbum();
  }

  handleBoosterClick() {
    const freeBoosters = this.getBoosterCount();
    const currentEggs = this.getEggBalance();

    if (freeBoosters > 0) {
      // Открываем бесплатный бустер с настольной игры
      audio.playSuccess();
      this.consumeBooster();
      this.playBoosterOpeningVideo();
    } else if (currentEggs >= 15) {
      // Покупаем бустер за 15 яиц
      audio.playSuccess();
      this.setEggBalance(currentEggs - 15);
      this.playBoosterOpeningVideo();
    } else {
      // Недостаточно яиц
      audio.playImpact();
      this.shakeNest();
      this.showQuickNotice('Для бустера нужно 15 яиц!');
    }
  }

  playBoosterOpeningVideo() {
    const videoWrapper = document.getElementById('video-wrapper');
    const btnSkip = document.getElementById('btn-skip-video');

    if (this.container) {
      this.container.classList.add('hidden');
    }
    if (videoWrapper) {
      videoWrapper.style.display = 'block';
    }
    if (btnSkip) {
      btnSkip.classList.remove('hidden');
    }

    const onFinished = () => {
      if (btnSkip) btnSkip.classList.add('hidden');
      if (this.container) {
        this.container.classList.remove('hidden');
      }
      this.openBoosterModal();
    };

    if (this.videoManager) {
      this.videoManager.playVideo('BOOSTER_OPEN', onFinished);
    } else {
      onFinished();
    }
  }

  openBoosterModal() {
    const modal = document.getElementById('market-booster-modal');
    const cardsRow = document.getElementById('market-booster-cards-row');
    const subtitleEl = document.getElementById('booster-modal-subtitle');
    const btnCollect = document.getElementById('btn-market-close-booster');
    if (!modal || !cardsRow) return;

    // Выбираем 4 случайные карты (приоритет не открытым)
    const unowned = CARDS_DATABASE.filter(c => !this.ownedCardIds.has(c.id));
    const pool = unowned.length >= 4 ? unowned : CARDS_DATABASE;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const dropped = shuffled.slice(0, 4);

    let openedCount = 0;
    cardsRow.innerHTML = '';

    if (btnCollect) {
      btnCollect.disabled = true;
      btnCollect.classList.add('disabled');
    }
    if (subtitleEl) {
      subtitleEl.textContent = `Нажмите на рубашку каждой карты, чтобы открыть её! (0 / 4)`;
    }

    dropped.forEach((card, i) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'booster-flip-card';
      cardEl.setAttribute('data-index', String(i));

      cardEl.innerHTML = `
        <div class="booster-flip-inner">
          <!-- Рубашка (закрытая карта) -->
          <div class="booster-flip-front">
            <img src="assets/Market/Card back/Back-Card01.png" alt="Рубашка карты" class="booster-shirt-img" />
            <div class="booster-flip-hint">ОТКРЫТЬ ✨</div>
          </div>
          <!-- Лицевая сторона карты -->
          <div class="booster-flip-back rarity-${card.rarity}">
            <img src="${card.image}" alt="${card.name}" class="booster-revealed-img" />
            <div class="booster-card-name">${card.name}</div>
            <div class="booster-card-ability">«${card.abilityName}»</div>
          </div>
        </div>
      `;

      cardEl.addEventListener('click', () => {
        if (cardEl.classList.contains('is-flipped')) return;

        cardEl.classList.add('is-flipped');
        openedCount++;
        this.ownedCardIds.add(card.id);

        if (typeof audio.playSuccess === 'function') audio.playSuccess(); else audio.playClick();

        if (subtitleEl) {
          subtitleEl.textContent = `Нажмите на рубашку каждой карты, чтобы открыть её! (${openedCount} / 4)`;
        }

        if (openedCount >= 4) {
          this.savePlayerCards();
          if (subtitleEl) {
            subtitleEl.textContent = `🎉 Все карты открыты! Заберите их в свою колоду:`;
          }
          if (btnCollect) {
            btnCollect.disabled = false;
            btnCollect.classList.remove('disabled');
          }
        }
      });

      cardsRow.appendChild(cardEl);
    });

    modal.classList.remove('hidden');
  }

  showCardTooltip(card, event) {
    const tip = document.getElementById('market-card-tooltip');
    if (!tip) return;

    const rarityColors = {
      common: '#b0a48a',
      uncommon: '#2ecc71',
      rare: '#3498db',
      epic: '#9b59b6',
      legendary: '#f39c12'
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
        <span class="tip-stat tip-atk">⚔️ ATK: ${card.atk}</span>
        <span class="tip-stat tip-hp">🛡️ HP: ${card.hp}</span>
      </div>
      <div class="market-tip-ability">
        <div class="tip-ability-name">★ ${card.abilityName || 'Способность'}:</div>
        <div class="tip-ability-desc">${card.abilityDesc || 'Базовая атака'}</div>
      </div>
    `;

    // Позиционирование тултипа
    tip.classList.remove('hidden');
    const rect = event.currentTarget.getBoundingClientRect();
    const vpRect = this.container.getBoundingClientRect();

    let x = rect.left - vpRect.left + (rect.width / 2) - 120;
    let y = rect.top - vpRect.top - 140;

    if (x < 10) x = 10;
    if (x + 250 > vpRect.width) x = vpRect.width - 260;
    if (y < 10) y = rect.bottom - vpRect.top + 10;

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
      void nest.offsetWidth; // trigger reflow
      nest.classList.add('shake-anim');
    }
  }

  showQuickNotice(text) {
    let notice = document.getElementById('market-quick-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'market-quick-notice';
      notice.className = 'market-quick-notice';
      this.container.querySelector('.market-stage-viewport')?.appendChild(notice);
    }
    notice.textContent = text;
    notice.classList.remove('hidden', 'fade-out');
    void notice.offsetWidth;
    notice.classList.add('visible');

    setTimeout(() => {
      notice.classList.add('fade-out');
      setTimeout(() => notice.classList.add('hidden'), 400);
    }, 1800);
  }

  proceedToBoss() {
    console.log('⚔️ [CardMarket] Выход на арену босса с собранной колодой!');
    const deck = CARDS_DATABASE.filter(c => this.ownedCardIds.has(c.id));
    this.stop();
    events.emit('stage:switch_to_boss_arena', deck);
  }
}
