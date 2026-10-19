import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class MysteryBoxesGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;
  }

  mount(evt, container, bottomBar) {
    const boxContainer = document.createElement('div');
    boxContainer.className = 'board-answers-grid mystery-boxes-row';

    const boxes = [
      { id: 1, video: 'assets/videos/Event-17-1.mp4', type: 'glove' },
      { id: 2, video: 'assets/videos/Event-17-2.mp4', type: 'booster' },
      { id: 3, video: 'assets/videos/Event-17-3.mp4', type: 'reroll' },
      { id: 4, video: 'assets/videos/Event-17-4.mp4', type: 'golden' }
    ];
    boxes.sort(() => Math.random() - 0.5);

    const LETTERS = ['A', 'B', 'C', 'D'];
    boxes.forEach((box, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn-board-answer mystery-box-btn';
      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[i]}</span>
        <span class="btn-board-answer-text">Ларец #${i + 1}</span>
      `;
      btn.addEventListener('click', () => {
        audio.playClick();
        boxContainer.remove();

        this.modal.playCutscene(box.video, () => {
          if (box.type === 'glove') {
            audio.playImpact();
            const lost = this.eventManager.loseEggs(4, 'Пружинная ловушка');
            this.modal.showOutcomeWithBanner({
              isGood: false,
              icon: BOARD_ASSET_ICONS.TILE_BAD,
              label: 'Коварный механизм',
              effectTitle: lost > 0 ? `Удар пружины: -${lost} яйца` : 'Защитный щит поглотил удар',
              narrative: 'Под крышкой сработала тугая пружина с боксёрской перчаткой.'
            });
          } else if (box.type === 'booster') {
            audio.playSuccess();
            this.eventManager.addBoosterPacks(1);
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.BOOSTER,
              label: 'Ценная находка',
              effectTitle: 'Арсенал пополнен: +1 Бустер карт',
              narrative: 'На бархатной подушечке внутри шкатулки лежал набор боевых карт.'
            });
          } else if (box.type === 'reroll') {
            audio.playSuccess();
            this.eventManager.addRerollDice(2);
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.DICE,
              label: 'Дар Иллюзиониста',
              effectTitle: 'Получено: +2 кубика переброса',
              narrative: 'Внутри ларца оказались две кости из резного костяного дерева.'
            });
          } else {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(10, 'Золотой запас');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: 'Главный приз',
              effectTitle: `Золотая кладка: +${gained} яиц`,
              narrative: 'Вы открыли самый богатый ларец из четырёх!'
            });
          }
        });
      });
      boxContainer.appendChild(btn);
    });

    container.appendChild(boxContainer);
  }

  destroy() {}
}
