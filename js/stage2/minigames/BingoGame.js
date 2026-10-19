import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class BingoGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
  }

  mount(evt, container, bottomBar) {
    const wrap = document.createElement('div');
    wrap.className = 'board-answers-grid bingo-tickets-grid';

    const numbers = [7, 13, 21, 42];
    const LETTERS = ['A', 'B', 'C', 'D'];
    numbers.forEach((num, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-board-answer bingo-ticket-btn';
      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[idx]}</span>
        <span class="btn-board-answer-text">Билет №${num}</span>
      `;
      btn.addEventListener('click', () => {
        audio.playClick();
        wrap.remove();

        this.modal.playCutscene(evt.video || 'assets/videos/Event-32.mp4', () => {
          const isWin = Math.random() < 0.5;
          const winningNumber = isWin ? num : numbers[(idx + 1) % numbers.length];
          if (winningNumber === num) {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(24, 'Победа в тираже');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: `Выпал шар №${winningNumber}`,
              effectTitle: `Счастливый билет: +${gained} яиц`,
              narrative: 'Ваш номер совпал с главным шаром лотерейного барабана!'
            });
          } else {
            audio.playImpact();
            this.eventManager.addRerollDice(1);
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.DICE,
              label: `Выпал шар №${winningNumber}`,
              effectTitle: 'Утешительный жетон: +1 кубик переброса',
              narrative: `Главный приз достался номеру ${winningNumber}, но крупье вручил вам запасную кость.`
            });
          }
        });
      });
      wrap.appendChild(btn);
    });

    container.appendChild(wrap);
  }

  destroy() {}
}
