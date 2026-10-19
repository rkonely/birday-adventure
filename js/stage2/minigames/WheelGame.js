import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class WheelGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
    this.timer = null;
  }

  mount(evt, container, bottomBar) {
    const sectors = [
      { label: 'Запас +5 яиц', type: 'eggs', val: 5, good: true },
      { label: 'Бустер карт', type: 'booster', val: 1, good: true },
      { label: 'Запас +12 яиц', type: 'eggs', val: 12, good: true },
      { label: 'Пошлина -2 яйца', type: 'loseEggs', val: 2, good: false },
      { label: 'Джекпот +20 яиц', type: 'eggs', val: 20, good: true },
      { label: 'Кубики переброса +2', type: 'reroll', val: 2, good: true }
    ];

    const wrap = document.createElement('div');
    wrap.className = 'wheel-minigame-wrap';
    wrap.innerHTML = `
      <div class="wheel-stage-box">
        <div class="wheel-pointer-arrow"></div>
        <div id="wheel-interactive-disc" class="wheel-disc">
          <div class="wheel-center-hub"></div>
        </div>
      </div>
      <div class="wheel-legend-grid">
        <span>1: +5 Яиц</span>
        <span>2: Бустер карт</span>
        <span>3: +12 Яиц</span>
        <span>4: Штраф -2</span>
        <span>5: Джекпот +20</span>
        <span>6: +2 Кубика</span>
      </div>
    `;
    container.appendChild(wrap);

    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'btn-leaf-green btn-quest-main-btn';
    btn.innerHTML = '<span class="btn-leaf-green-text">ВРАЩАТЬ КОЛЕСО</span>';

    let spinning = false;
    btn.addEventListener('click', () => {
      if (spinning) return;
      spinning = true;
      btn.disabled = true;
      audio.playClick();

      const chosenIndex = Math.floor(Math.random() * sectors.length);
      const chosen = sectors[chosenIndex];
      const sectorAngle = 360 / sectors.length;
      const targetDeg = 360 * 5 + (360 - (chosenIndex * sectorAngle + sectorAngle / 2));

      const disc = document.getElementById('wheel-interactive-disc');
      if (disc) {
        disc.style.transform = `rotate(${targetDeg}deg)`;
      }

      this.timer = setTimeout(() => {
        if (chosen.type === 'eggs') {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(chosen.val, 'Колесо Фортуны');
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Выигрыш на Колесе Фортуны',
            effectTitle: `Пополнение запасов: +${gained} яиц`,
            narrative: 'Колесо плавно замедляет ход, и стрелка замирает на щедром секторе.'
          });
        } else if (chosen.type === 'booster') {
          audio.playSuccess();
          this.eventManager.addBoosterPacks(chosen.val);
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.BOOSTER,
            label: 'Редкий сектор Колеса',
            effectTitle: 'Тактический резерв: +1 Бустер карт',
            narrative: 'Из призового желоба выпадает запечатанный набор бойцов для битвы с Боссом.'
          });
        } else if (chosen.type === 'reroll') {
          audio.playSuccess();
          this.eventManager.addRerollDice(chosen.val);
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.DICE,
            label: 'Благословение Фортуны',
            effectTitle: 'Контроль судьбы: +2 кубика переброса',
            narrative: 'Механизм отсчитывает вам две дополнительные кости для будущих ходов.'
          });
        } else {
          audio.playImpact();
          const lost = this.eventManager.loseEggs(chosen.val, 'Штрафной сектор');
          this.modal.showOutcomeWithBanner({
            isGood: false,
            icon: BOARD_ASSET_ICONS.TILE_BAD,
            label: 'Сектор неудачи',
            effectTitle: lost > 0 ? `Утрачено припасов: -${lost} яйца` : 'Щит отразил потерю припасов',
            narrative: 'Стрелка остановилась на тёмном секторе ярмарочного колеса.'
          });
        }
      }, 3450);
    });

    bottomBar.appendChild(btn);
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
