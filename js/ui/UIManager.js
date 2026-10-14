import { gameState } from '../core/GameState.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';
import { SettingsModal } from './SettingsModal.js';

/**
 * UIManager — управление всеми экранными формами, диалогами и модальными окнами
 */
export class UIManager {
  constructor(videoManager) {
    this.videoManager = videoManager;

    // Экраны
    this.screenTitle = document.getElementById('screen-title');
    this.screenForm = document.getElementById('screen-form');
    this.screenTransition = document.getElementById('screen-transition');
    this.pilotDialogBubble = document.getElementById('pilot-dialog-bubble');
    this.pilotDialogText = document.getElementById('pilot-dialog-text');

    // Элементы формы
    this.nameInput = document.getElementById('player-name');
    this.selectDay = document.getElementById('select-day');
    this.selectMonth = document.getElementById('select-month');
    this.displayDay = document.getElementById('display-day');
    this.displayMonth = document.getElementById('display-month');
    this.checkHardcore = document.getElementById('check-hardcore');
    this.btnSubmit = document.getElementById('btn-submit-data');

    // Кнопки
    this.btnStart = document.getElementById('btn-start');
    this.btnSound = document.getElementById('btn-sound');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnSettings = document.getElementById('btn-settings');
    this.soundIconImg = document.getElementById('sound-icon-img');

    // Окно настроек / паузы
    this.settingsModal = new SettingsModal();

    this.dialogTimeout = null;

    this.initDaysDropdown();
    this.restoreSavedData();
    this.bindEvents();
    this.updateSoundIcon();
  }

  initDaysDropdown() {
    this.selectDay.innerHTML = '';
    
    // Опция 00 по умолчанию
    const zeroOpt = document.createElement('option');
    zeroOpt.value = "0";
    zeroOpt.textContent = "00";
    this.selectDay.appendChild(zeroOpt);

    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      const valStr = String(d).padStart(2, '0');
      opt.value = d;
      opt.textContent = valStr;
      this.selectDay.appendChild(opt);
    }

    this.selectDay.value = "0";
    this.selectMonth.value = "0";
    this.updateDateDisplays();
  }

  updateDateDisplays() {
    if (this.displayDay && this.selectDay) {
      this.displayDay.textContent = String(this.selectDay.value).padStart(2, '0');
    }
    if (this.displayMonth && this.selectMonth) {
      this.displayMonth.textContent = String(this.selectMonth.value).padStart(2, '0');
    }
  }

  restoreSavedData() {
    if (gameState.data.playerName) {
      this.nameInput.value = gameState.data.playerName;
    } else {
      this.nameInput.value = '';
    }
    if (gameState.data.birthDay !== undefined && gameState.data.birthDay !== null) {
      this.selectDay.value = String(gameState.data.birthDay);
    } else {
      this.selectDay.value = "0";
    }
    if (gameState.data.birthMonth !== undefined && gameState.data.birthMonth !== null) {
      this.selectMonth.value = String(gameState.data.birthMonth);
    } else {
      this.selectMonth.value = "0";
    }
    this.updateDateDisplays();
  }

  bindEvents() {
    // 1. Старт приключения -> переход к видео MainMenu - Typing и форме регистрации
    this.btnStart.addEventListener('click', () => {
      audio.playClick();
      audio.ensureContext();
      this.startRegistrationFlow();
    });

    // 2. Изменение даты обновляет текстовые лейблы в компактных окошках
    this.selectDay.addEventListener('change', () => {
      audio.playClick();
      this.updateDateDisplays();
    });

    this.selectMonth.addEventListener('change', () => {
      audio.playClick();
      this.updateDateDisplays();
    });

    // 3. Чекбокс HARDCORE со звуком
    if (this.checkHardcore) {
      this.checkHardcore.addEventListener('change', () => {
        audio.playClick();
      });
    }

    // 4. Отправка формы проверки данных
    document.getElementById('auth-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // 5. Клик по облачку диалога скрывает его досрочно
    if (this.pilotDialogBubble) {
      this.pilotDialogBubble.addEventListener('click', () => {
        this.hidePilotDialog();
      });
    }

    // 6. Управление звуком (переключение иконки Звук / Mute)
    if (this.btnSound) {
      this.btnSound.addEventListener('click', () => {
        audio.playClick();
        const enabled = gameState.toggleSound();
        this.updateSoundIcon();
        this.showToast(enabled ? 'Звук включен' : 'Звук выключен');
      });
    }

    // 7. Полноэкранный режим
    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener('click', () => {
        audio.playClick();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // 8. Кнопка Настроек (Пауза)
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => {
        this.settingsModal.toggle();
      });
    }
  }

  updateSoundIcon() {
    const enabled = gameState.data.soundEnabled;
    const soundImg = document.getElementById('sound-icon-img');
    if (soundImg) {
      soundImg.src = enabled ? 'assets/UI/UI-Sound-Icon.png' : 'assets/UI/UI-Mute-Icon.png';
      soundImg.alt = enabled ? 'Звук' : 'Без звука';
    }
    if (this.btnSound) {
      this.btnSound.title = enabled ? 'Выключить звук (Mute)' : 'Включить звук';
    }
  }

  startRegistrationFlow() {
    // 1. Сразу переключаем музыку на Start Menu Btn-Presed.mp3
    audio.playMusic('START_MENU');

    // 2. Спустя 1 секунду параллельно запускаем диалог Dialog1.mp3 (1 раз без цикличности и повтора)
    if (this.startMenuDialogTimeout) {
      clearTimeout(this.startMenuDialogTimeout);
    }
    this.startMenuDialogTimeout = setTimeout(() => {
      audio.playDialog('DIALOG1');
    }, 1000);

    // Скрываем титульный экран
    this.screenTitle.classList.remove('active');
    setTimeout(() => {
      this.screenTitle.classList.add('hidden');
      this.screenForm.classList.remove('hidden');
      this.screenForm.classList.add('active');

      // Запускаем видео печатающего инструктора
      this.videoManager.playVideo('TYPING');
      gameState.setStage('REGISTRATION');

      // Фокусируемся на поле ввода
      if (this.nameInput) {
        this.nameInput.focus();
      }
    }, 300);
  }

  handleFormSubmit() {
    audio.playClick();
    const name = this.nameInput.value.trim() || 'Пилот';
    const day = parseInt(this.selectDay.value, 10);
    const month = parseInt(this.selectMonth.value, 10);
    const isHardcore = this.checkHardcore ? this.checkHardcore.checked : false;

    // Сохраняем имя и выбранную дату
    gameState.setPlayerName(name);
    gameState.setBirthDate(day, month);
    gameState.data.isHardcore = isHardcore;
    gameState.saveToStorage();

    const isBirthday = gameState.verifyBirthday();

    if (!isBirthday) {
      // ОШИБКА: Дата не 15 октября!
      audio.playError();
      this.showPilotDialog("Эй, у самолета рейс только для именинника!");
    } else {
      // УСПЕХ: 15 Октября подтверждено!
      this.hidePilotDialog();
      audio.playSuccess();
      this.startLaunchTransition(name);
    }
  }

  showPilotDialog(text) {
    if (!this.pilotDialogBubble) return;

    if (this.pilotDialogText) {
      this.pilotDialogText.textContent = text;
    }

    this.pilotDialogBubble.classList.remove('hidden');

    // Сбрасываем предыдущий таймер автоскрытия
    if (this.dialogTimeout) {
      clearTimeout(this.dialogTimeout);
    }

    // Автоматически скрываем реплику через 4.5 секунды
    this.dialogTimeout = setTimeout(() => {
      this.hidePilotDialog();
    }, 4500);
  }

  hidePilotDialog() {
    if (!this.pilotDialogBubble) return;
    this.pilotDialogBubble.classList.add('hidden');
    if (this.dialogTimeout) {
      clearTimeout(this.dialogTimeout);
      this.dialogTimeout = null;
    }
  }

  startLaunchTransition(name) {
    // 0. Сброс всего игрового прогресса (карты, броски, инвентарь) для прохождения с 0
    events.emit('game:reset_progress');

    // Плавно скрываем окно регистрации
    this.screenForm.classList.remove('active');
    setTimeout(() => {
      this.screenForm.classList.add('hidden');

      // Переключаем фон на Видео 3 (Старт полета) без лишних оверлеев и загрузок
      this.videoManager.playVideo('START', () => {
        // По окончании видео старта переходим к следующему этапу
        events.emit('stage:ready', 'STAGE_1');
      });
      gameState.setStage('TRANSITION');
    }, 300);
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, 2400);
  }
}
