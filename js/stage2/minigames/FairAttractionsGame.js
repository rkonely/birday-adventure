import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class FairAttractionsGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
  }

  mount(evt, container, bottomBar) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:14px; margin: 12px auto; width:100%; max-width:480px;';

    const playBtn = document.createElement('button');
    playBtn.className = 'btn-leaf-green btn-quest-main-btn';
    playBtn.innerHTML = '<span class="btn-leaf-green-text">СЫГРАТЬ В МИНИ-ИГРУ (ИСПЫТАТЬ УДАЧУ)</span>';

    playBtn.addEventListener('click', () => {
      audio.playClick();
      playBtn.disabled = true;
      playBtn.style.opacity = '0.5';

      const roll = Math.random();
      if (roll < 0.45) {
        audio.playSuccess();
        const gained = this.eventManager.addEggs(6, evt.title);
        this.modal.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Отличный результат!',
          effectTitle: `Призовые трофеи: +${gained} яиц`,
          narrative: 'Меткость и ловкость принесли вам заслуженную лесную награду!'
        });
      } else if (roll < 0.8) {
        audio.playSuccess();
        this.eventManager.addRerollDice(2);
        this.modal.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.DICE,
          label: 'Удачный бросок!',
          effectTitle: 'Награда: +2 кубика переброса',
          narrative: 'Судья аттракциона вручил вам пару счастливых игральных костей!'
        });
      } else {
        audio.playSuccess();
        this.eventManager.addBoosterPacks(1);
        this.modal.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'ДЖЕКПОТ АТТРАКЦИОНА!',
          effectTitle: 'Главный приз: +1 Бустер карт!',
          narrative: 'Великолепно! Вы выбили самый ценный приз ярмарочного киоска!'
        });
      }
    });

    wrap.appendChild(playBtn);
    container.appendChild(wrap);
  }

  destroy() {}
}
