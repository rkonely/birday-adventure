/**
 * BoardEventManager.js — Управление состоянием игрока, инвентарем и событиями Настольной игры
 */

import { BOARD_EVENTS, EVENT_TEMPLATES } from './boardEventsData.js';
import { BoardQuestModal } from './BoardQuestModal.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';

export class BoardEventManager {
  constructor(boardGame) {
    this.boardGame = boardGame;

    // Характеристики и инвентарь игрока
    this.stats = {
      eggs: 0,               // Текущие яйца (переносятся из 1 этапа)
      lostEggsCount: 0,      // Всего потеряно яиц на этой карте
      rerollDice: 0,         // Кубики на переброс (0 бросков на старте)
      boosterPacks: 0,       // Бустеры карт (0 по умолчанию)
      lastRoll: null,        // Последний бросок
      poisonTurns: 0,        // Оставшиеся ходы яда (Poison-DeBuff-icon)
      bleedTurns: 0,         // Оставшиеся ходы кровотечения (Bleed-DeBuff-Icon)
      isImmune: false,       // Щит иммунитета (Elixir-Icon)
      eggMultiplier: 1,      // Множитель яиц / Магнит (Lucky-Buff-Icon)
      reverseNextMove: false,// Обратный ход кубиком (Cursed-DeBuff-icon)
      bossHpPenalty: 0,      // Штраф к HP игрока в битве с боссом
      bossWeaknessHp: 0,     // Ослабление здоровья босса (от телескопа -50 HP)
      bonusMaxHp: 0,         // Бонус к здоровью игрока на боссе (+HP)
      speedBoost: 0,         // Попутный ветер / бонус к шагам следующего хода
      burnTurns: 0,          // Длительность ожога
      mysteriousBuff: null,  // Особый бафф
      isBlessed: false,      // Благословение Леса
      hasGoldenWings: false, // Золотые крылья
      hasGoldenKey: false,   // Золотой ключ (отпирает 2-й круг на 54 клетке)
      hasCompass: false,     // Компас туриста (защита от тумана)
      hasCloverBuff: false,  // Бафф клевера (убирает 2 неверных ответа в викторине)
      lapsCompleted: 0       // Количество завершённых кругов
    };

    this.modal = new BoardQuestModal(this);
    this.initPersistence();
  }

  initPersistence() {
    const saved = localStorage.getItem('birday_board_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.stats = { ...this.stats, ...parsed };
      } catch (e) {}
    }
  }

  resetStats(eggs = 0) {
    this.stats = {
      eggs: typeof eggs === 'number' ? eggs : 0,
      lostEggsCount: 0,
      rerollDice: 0,
      boosterPacks: 0,
      lastRoll: null,
      poisonTurns: 0,
      bleedTurns: 0,
      isImmune: false,
      eggMultiplier: 1,
      reverseNextMove: false,
      bossHpPenalty: 0,
      bossWeaknessHp: 0,
      bonusMaxHp: 0,
      speedBoost: 0,
      burnTurns: 0,
      mysteriousBuff: null,
      isBlessed: false,
      hasGoldenWings: false,
      hasGoldenKey: false,
      hasCompass: false,
      hasCloverBuff: false,
      lapsCompleted: 0
    };
    this.saveStats();
  }

  saveStats() {
    localStorage.setItem('birday_board_stats', JSON.stringify(this.stats));
    this.updateHUD();
  }

  /**
   * Добавить яйца с учётом магнита x2
   */
  addEggs(amount, source = '') {
    const mult = this.stats.eggMultiplier || 1;
    const finalAmount = amount * mult;

    this.stats.eggs += finalAmount;
    if (mult > 1) {
      this.stats.eggMultiplier = 1; // Сбрасываем магнит после использования
    }

    this.saveStats();
    return finalAmount;
  }

  /**
   * Потерять яйца с проверкой иммунитета
   */
  loseEggs(amount, source = '', bypassImmunity = false) {
    if (!bypassImmunity && this.stats.isImmune) {
      this.stats.isImmune = false;
      this.saveStats();
      return 0;
    }

    const actualLoss = Math.min(this.stats.eggs, amount);
    this.stats.eggs = Math.max(0, this.stats.eggs - amount);
    this.stats.lostEggsCount += actualLoss;

    this.saveStats();
    return actualLoss;
  }

  addPoison(turns) {
    if (this.stats.isImmune) {
      this.stats.isImmune = false;
      this.saveStats();
      return;
    }
    this.stats.poisonTurns = Math.max(this.stats.poisonTurns, turns);
    this.saveStats();
  }

  cleansePoison(turns = 999) {
    if (turns >= 999) {
      this.stats.poisonTurns = 0;
    } else {
      this.stats.poisonTurns = Math.max(0, this.stats.poisonTurns - turns);
    }
    this.saveStats();
  }

  addRerollDice(count) {
    this.stats.rerollDice += count;
    this.saveStats();
  }

  useRerollDice(count = 1) {
    this.stats.rerollDice = Math.max(0, this.stats.rerollDice - count);
    this.saveStats();
  }

  addBoosterPacks(count) {
    this.stats.boosterPacks += count;
    this.saveStats();
  }

  setMagnet(mult = 2) {
    this.stats.eggMultiplier = mult;
    this.saveStats();
  }

  setImmunity(val = true) {
    this.stats.isImmune = val;
    this.saveStats();
  }

  setReverseNextMove(val = true) {
    this.stats.reverseNextMove = val;
    this.saveStats();
  }

  setBossHpPenalty(val) {
    this.stats.bossHpPenalty = (this.stats.bossHpPenalty || 0) + val;
    this.saveStats();
  }

  setBossWeaknessHp(val) {
    this.stats.bossWeaknessHp = (this.stats.bossWeaknessHp || 0) + val;
    this.saveStats();
  }

  addBonusMaxHp(val) {
    this.stats.bonusMaxHp = (this.stats.bonusMaxHp || 0) + val;
    this.saveStats();
  }

  setSpeedBoost(val) {
    this.stats.speedBoost = (this.stats.speedBoost || 0) + val;
    this.saveStats();
  }

  setGoldenKey(val = true) {
    this.stats.hasGoldenKey = val;
    this.saveStats();
  }

  setCompass(val = true) {
    this.stats.hasCompass = val;
    this.saveStats();
  }

  setCloverBuff(val = true) {
    this.stats.hasCloverBuff = val;
    this.saveStats();
  }

  setBurn(turns = 3, penalty = 5) {
    this.stats.burnTurns = turns;
    this.stats.bossHpPenalty = penalty;
    this.saveStats();
  }

  addBleed(turns) {
    if (this.stats.isImmune) {
      this.stats.isImmune = false;
      this.saveStats();
      return;
    }
    this.stats.bleedTurns = Math.max(this.stats.bleedTurns || 0, turns);
    this.saveStats();
  }

  setGoldenWings(val = true) {
    this.stats.hasGoldenWings = val;
    this.saveStats();
  }

  setBlessed(val = true) {
    this.stats.isBlessed = val;
    this.saveStats();
  }

  setMysteriousBuff(name) {
    this.stats.mysteriousBuff = name;
    this.saveStats();
  }

  setLastRoll(val) {
    this.stats.lastRoll = val;
    this.saveStats();
  }

  /**
   * Добавить карту в колоду игрока (сохраняется в birday_player_cards)
   */
  addCard(cardId) {
    if (!cardId) return null;
    const targetId = typeof cardId === 'object' ? cardId.id : cardId;
    try {
      const saved = localStorage.getItem('birday_player_cards');
      let cards = [];
      if (saved) {
        cards = JSON.parse(saved);
      }
      if (!cards.includes(targetId)) {
        cards.push(targetId);
        localStorage.setItem('birday_player_cards', JSON.stringify(cards));
      }
      return targetId;
    } catch (e) {
      console.warn('Ошибка при сохранении карты:', e);
      return targetId;
    }
  }

  hasCard(cardId) {
    if (!cardId) return false;
    try {
      const saved = localStorage.getItem('birday_player_cards');
      if (!saved) return false;
      const cards = JSON.parse(saved);
      return cards.includes(cardId);
    } catch (e) {
      return false;
    }
  }

  /**
   * Снятие яда и возврат потерянных яиц
   */
  cleanseAndRestore() {
    this.stats.poisonTurns = 0;
    this.stats.bleedTurns = 0;
    this.stats.reverseNextMove = false;
    const restored = this.stats.lostEggsCount;
    this.stats.eggs += restored;
    this.stats.lostEggsCount = 0;
    this.saveStats();
    return restored;
  }

  /**
   * Бонус за прохождение круга (при втором круге с ключом): +10 яиц и +1 бустер
   */
  awardLapBonus() {
    this.stats.lapsCompleted = (this.stats.lapsCompleted || 0) + 1;
    this.addEggs(10, 'Бонус за круг');
    this.addBoosterPacks(1);
    this.saveStats();
  }

  /**
   * Эффекты в начале каждого хода/броска (Яд отнимает яйцо)
   */
  onTurnStart() {
    if (this.stats.poisonTurns > 0) {
      this.stats.poisonTurns--;
      this.loseEggs(1, 'Отравление', true);
      audio.playImpact();
      if (this.boardGame && typeof this.boardGame.showToastNotification === 'function') {
        this.boardGame.showToastNotification(
          `Действие токсина: -1 яйцо (осталось ходов: ${this.stats.poisonTurns})`,
          'bad'
        );
      }
    }
    if (this.stats.bleedTurns > 0) {
      this.stats.bleedTurns--;
    }
    if (this.stats.burnTurns > 0) {
      this.stats.burnTurns--;
    }
    this.updateHUD();
  }

  stepBack(count = 1) {
    if (this.boardGame && typeof this.boardGame.stepBackward === 'function') {
      this.boardGame.stepBackward(count);
    }
  }

  stepForward(count = 1) {
    if (this.boardGame && typeof this.boardGame.stepForward === 'function') {
      this.boardGame.stepForward(count);
    }
  }

  teleportToCell(index, triggerEvent = true) {
    if (this.boardGame && typeof this.boardGame.teleportToCell === 'function') {
      this.boardGame.teleportToCell(index, triggerEvent);
    }
  }

  /**
   * Запуск события клетки
   */
  triggerEventForCell(cellOrIndex, onComplete) {
    let evt = null;

    if (typeof cellOrIndex === 'object' && cellOrIndex !== null) {
      const eventId = cellOrIndex.eventId;
      if (eventId && EVENT_TEMPLATES[eventId]) {
        evt = JSON.parse(JSON.stringify(EVENT_TEMPLATES[eventId]));
        if (cellOrIndex.title) evt.title = cellOrIndex.title;
        if (cellOrIndex.description) evt.text = cellOrIndex.description;
        evt.index = cellOrIndex.index;
      } else {
        const idx = cellOrIndex.index;
        if (BOARD_EVENTS[idx]) {
          evt = JSON.parse(JSON.stringify(BOARD_EVENTS[idx]));
          if (cellOrIndex.title && !cellOrIndex.title.startsWith('Клетка #')) evt.title = cellOrIndex.title;
          if (cellOrIndex.description) evt.text = cellOrIndex.description;
        }
      }
    } else {
      const idx = Number(cellOrIndex);
      if (BOARD_EVENTS[idx]) {
        evt = JSON.parse(JSON.stringify(BOARD_EVENTS[idx]));
      }
    }

    if (!evt) {
      const cellNum = (typeof cellOrIndex === 'object' && cellOrIndex) ? cellOrIndex.index : cellOrIndex;
      evt = {
        index: cellNum,
        title: `Лесная просека #${cellNum}`,
        type: 'info',
        tileSprite: 'Empty-Tile1.png',
        speaker: 'Спокойная тропа',
        text: 'Мягкий мох и тихий шелест сосновых крон. На этом участке пути нет ни ловушек, ни преград.',
        actions: [{ text: 'ДВИГАТЬСЯ ДАЛЬШЕ', result: null }]
      };
    }

    this.modal.open(evt, (meta) => {
      this.updateHUD();
      if (meta && meta.startBoss) {
        audio.playClick();
        events.emit('stage:switch_to_market_intro');
        return;
      }
      if (onComplete) onComplete(meta);
    });
  }

  updateHUD() {
    const elEggs = document.getElementById('s2-status-eggs');
    const elCards = document.getElementById('s2-status-cards');
    const elDice = document.getElementById('s2-status-dice');
    const elLastTurn = document.getElementById('s2-last-turn-num');

    if (elEggs) elEggs.textContent = this.stats.eggs;
    if (elCards) elCards.textContent = this.stats.boosterPacks;
    if (elDice) elDice.textContent = this.stats.rerollDice;
    if (elLastTurn) elLastTurn.textContent = this.stats.lastRoll || '-';

    if (this.boardGame && typeof this.boardGame.renderStatusEffects === 'function') {
      this.boardGame.renderStatusEffects();
    }
  }
}