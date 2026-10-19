import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class ThimblesGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
  }

  mount(evt, container, bottomBar) {
    const grid = document.createElement('div');
    grid.className = 'board-answers-grid';

    const winningShell = Math.floor(Math.random() * 3);
    const labels = ['Левая скорлупка', 'Средняя скорлупка', 'Правая скорлупка'];
    const LETTERS = ['A', 'B', 'C'];

    labels.forEach((label, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-board-answer';
      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[idx]}</span>
        <span class="btn-board-answer-text">${label}</span>
      `;
      btn.addEventListener('click', () => {
        audio.playClick();
        if (idx === winningShell) {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(8, 'Игра в скорлупки');
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Безупречная внимательность',
            effectTitle: `Выигрыш: +${gained} яиц`,
            narrative: 'Под выбранной ореховой скорлупкой действительно оказалось золочёное яйцо.'
          });
        } else {
          audio.playImpact();
          this.eventManager.addRerollDice(1);
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.DICE,
            label: 'Поощрение за партию',
            effectTitle: 'Получено: +1 кубик переброса',
            narrative: 'Золотое яйцо оказалось под соседней скорлупкой, но бурундук подарил вам счастливую кость за игру.'
          });
        }
      });
      grid.appendChild(btn);
    });

    container.appendChild(grid);
  }

  destroy() {}
}
