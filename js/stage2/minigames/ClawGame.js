import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class ClawGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
    this.animId = null;
  }

  mount(evt, container, bottomBar) {
    const box = document.createElement('div');
    box.className = 'claw-track-box';
    box.innerHTML = `
      <div style="margin-bottom:6px; font-size:13px; text-align:center;">
        Поймайте каретку крана в центральной бирюзовой зоне
      </div>
      <div class="claw-rail">
        <div class="claw-target-zone" style="left: 38%; width: 24%;"></div>
        <div id="claw-moving-head" class="claw-head" style="left: 10%;"></div>
      </div>
    `;
    container.appendChild(box);

    const head = document.getElementById('claw-moving-head');
    let pos = 10;
    let dir = 1.45;
    let finished = false;

    const loop = () => {
      if (finished) return;
      pos += dir;
      if (pos >= 92 || pos <= 8) dir = -dir;
      if (head) head.style.left = `${pos}%`;
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);

    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'btn-leaf-green btn-quest-main-btn';
    btn.innerHTML = '<span class="btn-leaf-green-text">ОПУСТИТЬ ЗАХВАТ</span>';

    btn.addEventListener('click', () => {
      if (finished) return;
      finished = true;
      this.destroy();
      audio.playClick();

      if (pos >= 38 && pos <= 62) {
        audio.playSuccess();
        const winBooster = Math.random() < 0.45;
        if (winBooster) {
          this.eventManager.addBoosterPacks(1);
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.BOOSTER,
            label: 'Точный захват',
            effectTitle: 'Получен набор: +1 Бустер карт',
            narrative: 'Стальные лапки клешни надёжно сомкнулись вокруг главной призовой капсулы.'
          });
        } else {
          const gained = this.eventManager.addEggs(8, 'Механический кран');
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Точный захват',
            effectTitle: `Призовая капсула: +${gained} яиц`,
            narrative: 'Кран аккуратно доставил увесистую капсулу с запасом яиц в лоток выдачи.'
          });
        }
      } else {
        audio.playImpact();
        const gained = this.eventManager.addEggs(2, 'Утешительный улов');
        this.modal.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Касательный захват',
          effectTitle: `Малый улов: +${gained} яйца`,
          narrative: 'Клешня соскользнула с главного приза, но зацепила малый мешочек у края витрины.'
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
