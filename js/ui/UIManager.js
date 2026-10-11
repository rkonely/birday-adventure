import { gameState } from '../core/GameState.js';
import { audio } from '../core/AudioManager.js';
import { events } from '../core/EventManager.js';

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
    this.modalRejection = document.getElementById('modal-rejection');

    // Элементы формы
    this.nameInput = document.getElementById('player-name');
    this.selectDay = document.getElementById('select-day');
    this.selectMonth = document.getElementById('select-month');
    this.displayDay = document.getElementById('display-day');
    this.displayMonth = document.getElementById('display-month');
    this.checkHardcore = document.getElementById('check-hardcore');
    this.btnSubmit = document.getElementById('btn-submit-data');
    this.modalRejectText = document.getElementById('modal-reject-text');

    // Кнопки
    this.btnStart = document.getElementById('btn-start');
    this.btnModalRetry = document.getElementById('btn-modal-retry');
    this.btnSound = document.getElementById('btn-sound');
    this.btnFullscreen = document.getElementById('btn-fullscreen');

    this.initDaysDropdown();
    this.restoreSavedData();
    this.bindEvents();
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

    // 5. Закрытие модального окна ошибки
    this.btnModalRetry.addEventListener('click', () => {
      audio.playClick();
      this.modalRejection.classList.add('hidden');
      this.nameInput.focus();
    });

    // 6. Управление звуком
    this.btnSound.addEventListener('click', () => {
      audio.playClick();
      const enabled = gameState.toggleSound();
      this.btnSound.querySelector('.icon').textContent = enabled ? '🔊' : '🔇';
      this.showToast(enabled ? 'Звук включен' : 'Звук выключен');
    });

    // 7. Полноэкранный режим
    this.btnFullscreen.addEventListener('click', () => {
      audio.playClick();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  startRegistrationFlow() {
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
      this.showRejectionModal(name, day, month);
    } else {
      // УСПЕХ: 15 Октября подтверждено!
      audio.playSuccess();
      this.startLaunchTransition(name);
    }
  }

  showRejectionModal(name, day, month) {
    const monthsRu = [
      '', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    const jokes = [
      `Калькулятор пилота задымился и выдал отказ! 🚨\nПилот ${name}, борт зарезервирован ИСКЛЮЧИТЕЛЬНО для именинника 15 Октября. А у тебя выбрано ${day} ${monthsRu[month]}! Вспомни свой настоящий день!`,
      `Отказ бортовой системы! 🦜\n«Эй, ${name}! Сегодня мы летаем, поздравляем и дарим Steam-подарки только тем, кто родился 15 октября! Проверь календарь и исправь дату!»`,
      `Спецконтроль пернатых заблокировал люк! ⚠️\nПозывной «${name}» принят, но дата ${day} ${monthsRu[month]} не дает допуска к первому этапу. Допуск открывается ровно 15 Октября!`
    ];

    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    this.modalRejectText.textContent = randomJoke;
    this.modalRejection.classList.remove('hidden');
  }

  startLaunchTransition(name) {
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
