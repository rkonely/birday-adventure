/**
 * BoardEventManager.js — Управление состоянием игрока, инвентарем и событиями Настольной игры
 */

import { BOARD_EVENTS } from './boardEventsData.js';
import { BoardQuestModal } from './BoardQuestModal.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';

export class BoardEventManager {
  constructor(boardGame) {
    this.boardGame = boardGame;

    // Характеристики и инвентарь игрока
    this.stats = {
      eggs: 35,              // Текущие яйца (35 по умолчанию как на макете)
      lostEggsCount: 0,      // Всего потеряно яиц на этой карте
      rerollDice: 4,         // Кубики на переброс (4 по умолчанию)
      boosterPacks: 0,       // Бустеры карт (0 по умолчанию)
      lastRoll: 5,           // Последний бросок (5 по умолчанию)
      poisonTurns: 0,        // Оставшиеся ходы яда
      isImmune: false,       // Щит иммунитета
      eggMultiplier: 1,      // Множитель яиц
      reverseNextMove: false,// Обратный ход кубиком
      bossHpPenalty: 0,      // Штраф к HP босса
      mysteriousBuff: null   // Особый бафф
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

  addRerollDice(count) {
    this.stats.rerollDice += count;
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
    this.stats.bossHpPenalty = val;
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
   * Снятие яда и возврат потерянных яиц (Cell 8)
   */
  cleanseAndRestore() {
    this.stats.poisonTurns = 0;
    const restored = this.stats.lostEggsCount;
    this.stats.eggs += restored;
    this.stats.lostEggsCount = 0;
    this.saveStats();
    return restored;
  }

  /**
   * Эффекты в начале каждого хода/броска (Яд отнимает яйцо)
   */
  onTurnStart() {
    if (this.stats.poisonTurns > 0) {
      this.stats.poisonTurns--;
      this.loseEggs(1, 'Отравление', true);
      audio.playImpact();
    }
    this.updateHUD();
  }

  stepBack(count = 1) {
    if (this.boardGame) {
      this.boardGame.stepBackward(count);
    }
  }

  /**
   * Запуск события клетки
   */
  triggerEventForCell(cellIndex, onComplete) {
    const evt = BOARD_EVENTS[cellIndex] || {
      index: cellIndex,
      title: `Клетка #${cellIndex}`,
      icon: '🌲',
      type: 'info',
      speaker: 'Лесная тропа',
      text: 'Спокойная поляна среди вековых деревьев. Ничего опасного не замечено.',
      actions: [{ text: 'ПРОДОЛЖИТЬ ▶', result: null }]
    };

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
    if (elLastTurn) elLastTurn.textContent = this.stats.lastRoll || '5';
  }
}
