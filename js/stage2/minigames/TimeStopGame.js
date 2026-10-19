import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class TimeStopGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
    this.timerId = null;
  }

  mount(evt, container, bottomBar) {
    const wrap = document.createElement('div');
    wrap.className = 'timestop-game-wrap';
    wrap.innerHTML = `
      <div class="timestop-target-selector">
        <button id="btn-target-5" class="btn-board-answer"><span class="btn-board-answer-letter">A</span><span class="btn-board-answer-text">Рубеж: 05.00 сек</span></button>
        <button id="btn-target-8" class="btn-board-answer"><span class="btn-board-answer-letter">B</span><span class="btn-board-answer-text">Рубеж: 08.00 сек</span></button>
      </div>
      <div id="timestop-display" class="timestop-clock">00.00 с</div>
      <button id="btn-timestop-action" class="btn-leaf-green" style="display:none;">
        <span class="btn-leaf-green-text" id="timestop-btn-text">ЗАПУСТИТЬ ОТСЧЁТ</span>
      </button>
    `;
    container.appendChild(wrap);

    let targetSeconds = 5;
    const clock = document.getElementById('timestop-display');
    const btnAction = document.getElementById('btn-timestop-action');
    const btnText = document.getElementById('timestop-btn-text');

    const selectTarget = (sec) => {
      audio.playClick();
      targetSeconds = sec;
      const sel = wrap.querySelector('.timestop-target-selector');
      if (sel) sel.style.display = 'none';
      if (btnAction) btnAction.style.display = 'inline-flex';
      if (clock) clock.textContent = `Цель: ${sec.toFixed(2)} с`;
    };

    const btn5 = document.getElementById('btn-target-5');
    const btn8 = document.getElementById('btn-target-8');
    if (btn5) btn5.addEventListener('click', () => selectTarget(5));
    if (btn8) btn8.addEventListener('click', () => selectTarget(8));

    let isRunning = false;
    let startTime = 0;

    if (btnAction) {
      btnAction.addEventListener('click', () => {
        audio.playClick();
        if (!isRunning) {
          isRunning = true;
          if (btnText) btnText.textContent = 'ОСТАНОВИТЬ ХОД';
          startTime = performance.now();

          const updateClock = () => {
            if (!isRunning) return;
            const elapsed = (performance.now() - startTime) / 1000;
            if (clock) clock.textContent = elapsed.toFixed(2) + ' с';
            this.timerId = requestAnimationFrame(updateClock);
          };
          this.timerId = requestAnimationFrame(updateClock);
        } else {
          isRunning = false;
          this.destroy();
          const finalTime = (performance.now() - startTime) / 1000;
          const diff = Math.abs(finalTime - targetSeconds);
          btnAction.style.display = 'none';

          if (diff <= 0.10) {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(25, 'Хронометр: Идеал');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: `Результат: ${finalTime.toFixed(2)} с (погрешность ${diff.toFixed(2)} с)`,
              effectTitle: `Ювелирная точность: +${gained} яиц`,
              narrative: 'Стрелка замерла почти идеально на контрольном делении циферблата!'
            });
          } else if (diff <= 0.30) {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(12, 'Хронометр: Точно');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: `Результат: ${finalTime.toFixed(2)} с (погрешность ${diff.toFixed(2)} с)`,
              effectTitle: `Отличное чувство ритма: +${gained} яиц`,
              narrative: 'Часовщик одобрительно кивает вашей выдержке.'
            });
          } else if (diff <= 0.65) {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(5, 'Хронометр: Близко');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: `Результат: ${finalTime.toFixed(2)} с`,
              effectTitle: `Малая награда: +${gained} яиц`,
              narrative: 'Вы остановили маятник достаточно близко к заданной отметке.'
            });
          } else {
            audio.playImpact();
            const gained = this.eventManager.addEggs(1, 'Хронометр: Утешение');
            this.modal.showOutcomeWithBanner({
              isGood: false,
              icon: BOARD_ASSET_ICONS.EGG,
              label: `Результат: ${finalTime.toFixed(2)} с`,
              effectTitle: `Поощрительный приз: +${gained} яйцо`,
              narrative: 'Маятник ушёл слишком далеко от контрольного рубежа.'
            });
          }
        }
      });
    }
  }

  destroy() {
    if (this.timerId) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }
}
