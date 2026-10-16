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

    // Скины доски настолки (Board.png / Board-Variant2.png)
    this.currentBoardTexture = localStorage.getItem('birday_board_texture') || 'Board.png';

    // Ретро ТВ (CRT сканлайны)
    this.crtOverlay = document.getElementById('crt-overlay') || document.querySelector('.crt-overlay');
    this.btnToggleCrt = document.getElementById('btn-toggle-crt');
    this.crtSwitchText = this.btnToggleCrt ? this.btnToggleCrt.querySelector('.crt-switch-text') : null;
    this.crtEnabled = localStorage.getItem('birday_crt_enabled') !== 'false';

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

    // 3. Настройка переключения CRT ТВ-эффекта
    this.applyCrtState(this.crtEnabled);
    if (this.btnToggleCrt) {
      this.btnToggleCrt.addEventListener('click', () => {
        audio.playClick();
        this.crtEnabled = !this.crtEnabled;
        localStorage.setItem('birday_crt_enabled', this.crtEnabled ? 'true' : 'false');
        this.applyCrtState(this.crtEnabled);
      });
    }

    // 4. Выбор скинов кубика и стиля доски
    this.setupDiceSkinSelectors();
    this.setupBoardSkinSelectors();

    events.on('stage2:board_texture_changed', (filename) => {
      this.currentBoardTexture = filename;
    });

    // 5. Кнопки управления окном
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

  setupBoardSkinSelectors() {
    const cards = document.querySelectorAll('.board-skin-card');
    cards.forEach(card => {
      const bFile = card.getAttribute('data-board');
      if (bFile === this.currentBoardTexture) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }

      card.addEventListener('click', () => {
        const selectedBoard = card.getAttribute('data-board');
        if (selectedBoard) {
          this.currentBoardTexture = selectedBoard;
          try {
            localStorage.setItem('birday_board_texture', selectedBoard);
          } catch (e) {}
          cards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          events.emit('stage2:board_texture_changed', selectedBoard);
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

  applyCrtState(enabled) {
    if (!this.crtOverlay) {
      this.crtOverlay = document.getElementById('crt-overlay') || document.querySelector('.crt-overlay');
    }
    if (this.crtOverlay) {
      if (enabled) {
        this.crtOverlay.classList.remove('hidden');
      } else {
        this.crtOverlay.classList.add('hidden');
      }
    }
    if (this.btnToggleCrt) {
      if (enabled) {
        this.btnToggleCrt.classList.add('active');
        this.btnToggleCrt.setAttribute('aria-pressed', 'true');
        if (this.crtSwitchText) this.crtSwitchText.textContent = 'ВКЛ';
      } else {
        this.btnToggleCrt.classList.remove('active');
        this.btnToggleCrt.setAttribute('aria-pressed', 'false');
        if (this.crtSwitchText) this.crtSwitchText.textContent = 'ВЫКЛ';
      }
    }
  }

  open() {
    if (!this.modalEl) return;
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');

    // Синхронизируем CRT тумблер
    this.applyCrtState(this.crtEnabled);

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

    // Синхронизируем активный стиль доски
    const boardCards = document.querySelectorAll('.board-skin-card');
    boardCards.forEach(card => {
      if (card.getAttribute('data-board') === this.currentBoardTexture) {
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
