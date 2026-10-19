import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class StrongmanGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
    this.animId = null;
    this.keyHandler = null;
  }

  mount(evt, container, bottomBar) {
    const wrap = document.createElement('div');
    wrap.className = 'strongman-game-wrap';
    wrap.innerHTML = `
      <div class="strongman-gauge-track">
        <div class="zone zone-green">Слабо (0)</div>
        <div class="zone zone-yellow">Точно (+4)</div>
        <div class="zone zone-red">ПИК СИЛЫ (+10)</div>
        <div id="strongman-pointer" class="strongman-pointer"></div>
      </div>
      <button id="btn-strongman-hit" class="btn-leaf-green">
        <span class="btn-leaf-green-text">НАНЕСТИ УДАР (ПРОБЕЛ)</span>
      </button>
    `;
    container.appendChild(wrap);

    const pointer = document.getElementById('strongman-pointer');
    const btnHit = document.getElementById('btn-strongman-hit');

    let position = 0;
    let speed = 1.65;
    let isFinished = false;

    const animate = () => {
      if (isFinished) return;
      position += speed;
      if (position >= 100 || position <= 0) speed = -speed;
      if (pointer) pointer.style.left = `${Math.min(100, Math.max(0, position))}%`;
      this.animId = requestAnimationFrame(animate);
    };
    this.animId = requestAnimationFrame(animate);

    const strike = () => {
      if (isFinished) return;
      isFinished = true;
      this.destroy();

      this.modal.playCutscene(evt.video || 'assets/videos/Event-19.mp4', () => {
        if (position >= 75) {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(10, 'Силомер: Пик силы');
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Сокрушительный удар',
            effectTitle: `Максимальная награда: +${gained} яиц`,
            narrative: 'Гиря взлетела до самой вершины столба и ударила в медный гонг!'
          });
        } else if (position >= 40) {
          audio.playClick();
          const gained = this.eventManager.addEggs(4, 'Силомер: Средний удар');
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Крепкий замах',
            effectTitle: `Заработано: +${gained} яйца`,
            narrative: 'Удар вышел уверенным, хоть и немного не дотянул до вершины шкалы.'
          });
        } else {
          audio.playImpact();
          this.modal.showOutcomeWithBanner({
            isGood: false,
            icon: BOARD_ASSET_ICONS.TILE_NORMAL,
            label: 'Скользящий удар',
            effectTitle: 'Награда не получена',
            narrative: 'Молот опустился слишком рано, и бегунок едва оторвался от основания.'
          });
        }
      });
    };

    if (btnHit) btnHit.addEventListener('click', strike);

    this.keyHandler = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        strike();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }
}
