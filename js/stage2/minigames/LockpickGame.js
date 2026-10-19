import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class LockpickGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
    this.animId = null;
  }

  mount(evt, container, bottomBar) {
    const box = document.createElement('div');
    box.className = 'lockpick-track-box';
    box.innerHTML = `
      <div class="lockpick-pins-row">
        <span id="lp-pin-0" class="lockpick-pin-badge">Штифт I</span>
        <span id="lp-pin-1" class="lockpick-pin-badge">Штифт II</span>
        <span id="lp-pin-2" class="lockpick-pin-badge">Штифт III</span>
      </div>
      <div class="claw-rail">
        <div id="lp-target-zone" class="claw-target-zone" style="left: 35%; width: 30%;"></div>
        <div id="lp-runner" class="claw-head" style="left: 5%;"></div>
      </div>
    `;
    container.appendChild(box);

    const runner = document.getElementById('lp-runner');
    const zone = document.getElementById('lp-target-zone');

    let currentPin = 0;
    let pos = 10;
    let speed = 1.3;
    let active = true;
    let zoneMin = 35;
    let zoneMax = 65;

    const moveLoop = () => {
      if (!active) return;
      pos += speed;
      if (pos >= 94 || pos <= 6) speed = -speed;
      if (runner) runner.style.left = `${pos}%`;
      this.animId = requestAnimationFrame(moveLoop);
    };
    this.animId = requestAnimationFrame(moveLoop);

    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'btn-leaf-green btn-quest-main-btn';
    btn.innerHTML = '<span class="btn-leaf-green-text">ЗАФИКСИРОВАТЬ ШТИФТ</span>';

    btn.addEventListener('click', () => {
      if (!active) return;
      audio.playClick();

      if (pos >= zoneMin && pos <= zoneMax) {
        const pinBadge = document.getElementById(`lp-pin-${currentPin}`);
        if (pinBadge) pinBadge.classList.add('locked');
        currentPin++;

        if (currentPin >= 3) {
          active = false;
          this.destroy();
          audio.playSuccess();
          const gained = this.eventManager.addEggs(9, 'Тайник в погребе');
          this.eventManager.addRerollDice(1);
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Замок взломан',
            effectTitle: `Тайник открыт: +${gained} яиц и +1 кубик`,
            narrative: 'Последний штифт с глухим щелчком встал на место. Внутри погреба обнаружились нетронутые запасы.'
          });
        } else {
          // Усложняем следующий штифт
          speed = (speed > 0 ? 1 : -1) * (Math.abs(speed) + 0.35);
          zoneMin = 22 + Math.floor(Math.random() * 40);
          zoneMax = zoneMin + 24;
          if (zone) {
            zone.style.left = `${zoneMin}%`;
            zone.style.width = `${zoneMax - zoneMin}%`;
          }
        }
      } else {
        active = false;
        this.destroy();
        audio.playImpact();
        this.modal.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Срыв отмычки',
          effectTitle: 'Механизм заблокирован',
          narrative: 'Пружина сорвалась на последнем витке. Придётся оставить погреб и двигаться дальше.'
        });
      }
    });

    bottomBar.appendChild(btn);
  }

  destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}
