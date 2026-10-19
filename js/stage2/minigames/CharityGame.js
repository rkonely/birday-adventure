import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class CharityGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
  }

  mount(evt, container, bottomBar) {
    const grid = document.createElement('div');
    grid.className = 'board-answers-grid';

    const lost = this.eventManager.stats.lostEggsCount || 0;
    const potentialGain = lost * 10;

    const btnPay = document.createElement('button');
    btnPay.className = 'btn-board-answer';
    btnPay.innerHTML = `
      <span class="btn-board-answer-letter">A</span>
      <span class="btn-board-answer-text">Внести 2 яйца в чашу</span>
    `;
    btnPay.addEventListener('click', () => {
      audio.playClick();
      if (this.eventManager.stats.eggs >= 2) {
        this.eventManager.loseEggs(2, 'Дар Тотему', true);
        if (potentialGain > 0) {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(potentialGain, 'Возмещение потерь x10');
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: `Возмещено потерь: ${lost} x 10`,
            effectTitle: `Дар Тотема: +${gained} яиц`,
            narrative: 'Древний тотем многократно вернул все припасы, отнятые у вас ловушками на этом пути.'
          });
        } else {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(10, 'Благословение Тотема');
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Чистый путь без потерь',
            effectTitle: `Награда за щедрость: +${gained} яиц`,
            narrative: 'Вы ещё не теряли яиц на карте, поэтому тотем одарил вас из собственного резерва.'
          });
        }
      } else {
        audio.playImpact();
        this.modal.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно припасов',
          effectTitle: 'Для обряда требуется 2 яйца',
          narrative: 'Чаша осталась пустой. Вы продолжили движение по тропе.'
        });
      }
    });

    const btnPass = document.createElement('button');
    btnPass.className = 'btn-board-answer';
    btnPass.innerHTML = `
      <span class="btn-board-answer-letter">B</span>
      <span class="btn-board-answer-text">Пройти мимо тотема</span>
    `;
    btnPass.addEventListener('click', () => {
      audio.playClick();
      this.modal.finishEvent();
    });

    grid.appendChild(btnPay);
    grid.appendChild(btnPass);
    container.appendChild(grid);
  }

  destroy() {}
}
