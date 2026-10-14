import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';

export const DICE_SKINS = [
  {
    id: 'skin_classic',
    name: 'Костяной Классик',
    shortName: 'Классик',
    texture: 'dice_texture.png',
    desc: 'Традиционный светлый кубик'
  },
  {
    id: 'skin_amber',
    name: 'Магический Янтарь',
    shortName: 'Янтарь',
    texture: 'dice_texture02.png',
    desc: 'Золотой солнечный кубик с искрами'
  },
  {
    id: 'skin_moss',
    name: 'Рунический Камень',
    shortName: 'Руны',
    texture: 'dice_texture03.png',
    desc: 'Древний замшелый камень с рунами'
  },
  {
    id: 'skin_wood',
    name: 'Тёмный Дуб',
    shortName: 'Дуб',
    texture: 'dice_texture04.png',
    desc: 'Кованое дерево с золотыми уголками'
  }
];

/**
 * SettingsModal — модальное окно Настроек и Паузы (Big Frame.png)
 * Включает ползунки громкости Музыки и Эффектов, выбор скина кубика.
 */
export class SettingsModal {
  constructor() {
    this.modalEl = document.getElementById('modal-pause');
    this.isOpen = false;

    // Слайдеры
    this.sliderMusic = document.getElementById('slider-music');
    this.sliderSfx = document.getElementById('slider-sfx');
    this.labelMusicVal = document.getElementById('label-music-val');
    this.labelSfxVal = document.getElementById('label-sfx-val');

    // Кнопки
    this.btnResume = document.getElementById('btn-pause-resume');
    this.btnClose = document.getElementById('btn-pause-close');
    this.btnMenu = document.getElementById('btn-pause-menu');

    // Скины кубика
    this.currentDiceTexture = localStorage.getItem('birday_dice_texture') || 'dice_texture.png';

    this.init();
  }

  init() {
    // 1. Применяем сохранённую текстуру кубика с самого старта
    this.applyDiceTexture(this.currentDiceTexture);

    // 2. Инициализируем значения слайдеров из AudioManager
    if (this.sliderMusic) {
      const musicPct = Math.round(audio.getMusicVolume() * 100);
      this.sliderMusic.value = musicPct;
      if (this.labelMusicVal) this.labelMusicVal.textContent = `${musicPct}%`;

      this.sliderMusic.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.labelMusicVal) this.labelMusicVal.textContent = `${val}%`;
        audio.setMusicVolume(val / 100);
      });
    }

    if (this.sliderSfx) {
      const sfxPct = Math.round(audio.getSfxVolume() * 100);
      this.sliderSfx.value = sfxPct;
      if (this.labelSfxVal) this.labelSfxVal.textContent = `${sfxPct}%`;

      this.sliderSfx.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.labelSfxVal) this.labelSfxVal.textContent = `${val}%`;
        audio.setSfxVolume(val / 100);
      });

      this.sliderSfx.addEventListener('change', () => {
        audio.playClick();
      });
    }

    // 3. Выбор скинов кубика
    this.setupDiceSkinSelectors();

    // 4. Кнопки управления окном
    if (this.btnResume) {
      this.btnResume.addEventListener('click', () => {
        audio.playClick();
        this.close();
      });
    }

    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => {
        audio.playClick();
        this.close();
      });
    }

    if (this.btnMenu) {
      this.btnMenu.addEventListener('click', () => {
        audio.playClick();
        this.close();
        events.emit('stage:exit_to_title');
      });
    }

    // Клик по фону вне окна закрывает паузу
    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) {
          audio.playClick();
          this.close();
        }
      });
    }
  }

  setupDiceSkinSelectors() {
    const cards = document.querySelectorAll('.dice-skin-card');
    cards.forEach(card => {
      const tex = card.getAttribute('data-texture');
      if (tex === this.currentDiceTexture) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }

      card.addEventListener('click', () => {
        const selectedTex = card.getAttribute('data-texture');
        if (selectedTex) {
          this.currentDiceTexture = selectedTex;
          this.applyDiceTexture(selectedTex);
          cards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');

          if (typeof audio.playCoin === 'function') audio.playCoin(); else audio.playClick();
        }
      });
    });
  }

  applyDiceTexture(textureFilename) {
    this.currentDiceTexture = textureFilename;
    try {
      localStorage.setItem('birday_dice_texture', textureFilename);
    } catch (e) {}

    // Устанавливаем CSS переменную для всех 3D граней кубика
    const urlVal = `url('../assets/Second Level/Dice/${textureFilename}')`;
    document.documentElement.style.setProperty('--dice-texture', urlVal);

    events.emit('dice:skin_changed', textureFilename);
    console.log(`🎲 [SettingsModal] Скин кубика изменён: ${textureFilename}`);
  }

  open() {
    if (!this.modalEl) return;
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');

    // Синхронизируем слайдеры при открытии
    if (this.sliderMusic) {
      const mVal = Math.round(audio.getMusicVolume() * 100);
      this.sliderMusic.value = mVal;
      if (this.labelMusicVal) this.labelMusicVal.textContent = `${mVal}%`;
    }
    if (this.sliderSfx) {
      const sVal = Math.round(audio.getSfxVolume() * 100);
      this.sliderSfx.value = sVal;
      if (this.labelSfxVal) this.labelSfxVal.textContent = `${sVal}%`;
    }

    // Синхронизируем активный кубик
    const cards = document.querySelectorAll('.dice-skin-card');
    cards.forEach(card => {
      if (card.getAttribute('data-texture') === this.currentDiceTexture) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    events.emit('pause:opened');
  }

  close() {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
    events.emit('pause:closed');
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      audio.playClick();
      this.open();
    }
  }
}
