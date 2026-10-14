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
      eggs: 10,              // Текущие яйца
      lostEggsCount: 0,      // Всего потеряно яиц на этой карте (для Монумента Cell 21 и Исцеления Cell 8)
      rerollDice: 0,         // Дополнительные кубики на переброс
      boosterPacks: 0,       // Бустеры карт пернатых героев для босса
      poisonTurns: 0,        // Оставшиеся ходы яда (-1 яйцо/ход)
      isImmune: false,       // Щит иммунитета от несчастий
      eggMultiplier: 1,      // Множитель яиц (магнит x2)
      reverseNextMove: false,// Обратный ход кубиком
      bossHpPenalty: 0,      // Штраф к HP босса (Кара небесная Cell 31)
      mysteriousBuff: null   // Особый бафф (Колба с водой Cell 13)
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
    this.showToast(`+${finalAmount} 🪺 Яиц! (${source})`, '#4ade80');
    return finalAmount;
  }

  /**
   * Потерять яйца с проверкой иммунитета
   */
  loseEggs(amount, source = '', bypassImmunity = false) {
    if (!bypassImmunity && this.stats.isImmune) {
      this.stats.isImmune = false;
      this.saveStats();
      this.showToast('🛡️ ЩИТ ПОГЛОТИЛ УРОН! Яйца сохранены!', '#38bdf8');
      return 0;
    }

    const actualLoss = Math.min(this.stats.eggs, amount);
    this.stats.eggs = Math.max(0, this.stats.eggs - amount);
    this.stats.lostEggsCount += actualLoss;

    this.saveStats();
    this.showToast(`-${actualLoss} 🪺 Яиц! (${source})`, '#f87171');
    return actualLoss;
  }

  addPoison(turns) {
    if (this.stats.isImmune) {
      this.stats.isImmune = false;
      this.saveStats();
      this.showToast('🛡️ ЩИТ ОТРАЗИЛ ЯД!', '#38bdf8');
      return;
    }
    this.stats.poisonTurns = Math.max(this.stats.poisonTurns, turns);
    this.saveStats();
  }

  addRerollDice(count) {
    this.stats.rerollDice += count;
    this.saveStats();
    this.showToast(`+${count} 🎲 Кубик переброса!`, '#ffd166');
  }

  addBoosterPacks(count) {
    this.stats.boosterPacks += count;
    this.saveStats();
    this.showToast(`+${count} 🎴 Бустер карт героя!`, '#c77dff');
  }

  setMagnet(mult = 2) {
    this.stats.eggMultiplier = mult;
    this.saveStats();
    this.showToast('🧲 Магнит x2 активирован!', '#fb8500');
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
    this.showToast(`✨ Получен бафф: ${name}!`, '#2ec4b6');
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
      const lost = this.loseEggs(1, 'Отравление', true);
      this.showToast(`☠️ Яд: -1 🪺 яйцо! (осталось ${this.stats.poisonTurns} х.)`, '#a855f7');
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
        events.emit('stage:switch_to_boss_arena');
        return;
      }
      if (onComplete) onComplete(meta);
    });
  }

  updateHUD() {
    const elEggs = document.getElementById('s2-eggs-count');
    const elReroll = document.getElementById('s2-reroll-count');
    const elBoosters = document.getElementById('s2-boosters-count');
    const elBadges = document.getElementById('s2-status-badges');

    if (elEggs) elEggs.textContent = this.stats.eggs;
    if (elReroll) elReroll.textContent = this.stats.rerollDice;
    if (elBoosters) elBoosters.textContent = this.stats.boosterPacks;

    if (elBadges) {
      let badges = [];
      if (this.stats.poisonTurns > 0) {
        badges.push(`<span class="s2-badge badge-poison" title="Яд: -1 яйцо/ход">☠️ ${this.stats.poisonTurns}</span>`);
      }
      if (this.stats.isImmune) {
        badges.push('<span class="s2-badge badge-immune" title="Щит от несчастий">🛡️ ЩИТ</span>');
      }
      if (this.stats.eggMultiplier > 1) {
        badges.push('<span class="s2-badge badge-magnet" title="Магнит: x2 к следующей награде">🧲 x2</span>');
      }
      if (this.stats.reverseNextMove) {
        badges.push('<span class="s2-badge badge-reverse" title="Сбитый ориентир: ход назад">🔄 РЕВЕРС</span>');
      }
      if (this.stats.mysteriousBuff) {
        badges.push('<span class="s2-badge badge-water" title="Благословение ручья">💧 БАФФ</span>');
      }
      elBadges.innerHTML = badges.join('');
    }
  }

  showToast(msg, color = '#ffb703') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'pixel-toast';
    toast.style.borderColor = color;
    toast.style.color = '#fff';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }
}
