import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class WheelGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;

    this.rafId = null;
    this.timer = null;
    this.keyDownHandler = null;
    this.keyUpHandler = null;

    this.loadedIcons = {};
    this.preloadSectorIcons();
    this.injectStyles();
  }

  preloadSectorIcons() {
    const sources = {
      egg: BOARD_ASSET_ICONS.EGG,
      booster: BOARD_ASSET_ICONS.BOOSTER,
      dice: BOARD_ASSET_ICONS.DICE,
      bad: BOARD_ASSET_ICONS.TILE_BAD
    };
    Object.entries(sources).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      this.loadedIcons[key] = img;
    });
  }

  injectStyles() {
    if (document.getElementById('wheel-physics-game-styles')) return;
    const style = document.createElement('style');
    style.id = 'wheel-physics-game-styles';
    style.textContent = `
      .wheel-physics-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin: 2px auto;
        user-select: none;
      }
      .wheel-Current-sector-banner {
        padding: 5px 16px;
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(40, 28, 18, 0.95) 0%, rgba(22, 15, 9, 0.98) 100%);
        border: 2px solid #9c7a4c;
        color: #ffd166;
        font-size: 14px;
        font-weight: bold;
        min-width: 240px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
        transition: transform 0.12s ease, border-color 0.2s ease;
      }
      .wheel-canvas-stage {
        position: relative;
        width: 256px;
        height: 256px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      /* Верхний язычок-трещотка (физически сгибается о колышки) */
      .wheel-clapper-mount {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 6;
        pointer-events: none;
      }
      .wheel-clapper-tongue {
        width: 22px;
        height: 34px;
        background: linear-gradient(180deg, #ffd166 0%, #d48b19 60%, #8c5308 100%);
        clip-path: polygon(18% 0%, 82% 0%, 100% 35%, 50% 100%, 0% 35%);
        border-top: 3px solid #fff3b0;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.75));
        transform-origin: 50% 15%;
        transition: transform 0.06s ease-out;
      }
      .wheel-canvas-el {
        width: 248px;
        height: 248px;
        border-radius: 50%;
        box-shadow: 0 10px 26px rgba(0,0,0,0.65);
        cursor: pointer;
        transition: filter 0.2s ease;
      }
      .wheel-tension-bar-wrap {
        width: 220px;
        height: 10px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #7c5832;
        border-radius: 6px;
        overflow: hidden;
      }
      .wheel-tension-bar-fill {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #2ec4b6 0%, #ffd166 60%, #ff595e 100%);
        transition: width 0.05s linear;
      }
    `;
    document.head.appendChild(style);
  }

  mount(evt, container, bottomBar) {
    this.destroy();

    const sectors = [
      {
        shortText: '+5 ЯИЦ',
        fullLabel: 'Запас: +5 яиц',
        type: 'eggs',
        val: 5,
        good: true,
        color: '#2a6f4e',
        accent: '#40916c',
        iconKey: 'egg'
      },
      {
        shortText: 'БУСТЕР',
        fullLabel: 'Редкий приз: +1 Бустер карт',
        type: 'booster',
        val: 1,
        good: true,
        color: '#5a3b7c',
        accent: '#7b52ab',
        iconKey: 'booster'
      },
      {
        shortText: '+12 ЯИЦ',
        fullLabel: 'Богатый сектор: +12 яиц',
        type: 'eggs',
        val: 12,
        good: true,
        color: '#1f5c7a',
        accent: '#2c7da0',
        iconKey: 'egg'
      },
      {
        shortText: '-2 ЯЙЦА',
        fullLabel: 'Штрафная пошлина: -2 яйца',
        type: 'loseEggs',
        val: 2,
        good: false,
        color: '#7f242c',
        accent: '#a4303a',
        iconKey: 'bad'
      },
      {
        shortText: 'ДЖЕКПОТ +20',
        fullLabel: 'ДЖЕКПОТ ФОРТУНЫ: +20 яиц!',
        type: 'eggs',
        val: 20,
        good: true,
        color: '#b57c1e',
        accent: '#e09f3e',
        iconKey: 'egg'
      },
      {
        shortText: '+2 КУБИКА',
        fullLabel: 'Контроль судьбы: +2 кубика',
        type: 'reroll',
        val: 2,
        good: true,
        color: '#7c4d25',
        accent: '#9c6635',
        iconKey: 'dice'
      }
    ];

    const wrap = document.createElement('div');
    wrap.className = 'wheel-physics-wrap';
    wrap.innerHTML = `
      <div id="wheel-live-indicator" class="wheel-Current-sector-banner">
        Зажмите кнопку, чтобы оттянуть колесо, и отпустите!
      </div>
      <div class="wheel-canvas-stage">
        <div class="wheel-clapper-mount">
          <div id="wheel-clapper-tongue" class="wheel-clapper-tongue"></div>
        </div>
        <canvas id="wheel-canvas-disc" class="wheel-canvas-el" width="260" height="260"></canvas>
      </div>
      <div class="wheel-tension-bar-wrap" title="Сила натяжения броска">
        <div id="wheel-tension-fill" class="wheel-tension-bar-fill"></div>
      </div>
    `;
    container.appendChild(wrap);

    const canvas = document.getElementById('wheel-canvas-disc');
    const ctx = canvas.getContext('2d');
    const indicatorEl = document.getElementById('wheel-live-indicator');
    const clapperEl = document.getElementById('wheel-clapper-tongue');
    const tensionFillEl = document.getElementById('wheel-tension-fill');

    const numSectors = sectors.length;
    const arcSize = (Math.PI * 2) / numSectors; // 60 градусов в радианах

    // Начальный угол поворота (в радианах)
    let currentAngle = Math.random() * Math.PI * 2;
    let angularVelocity = 0;
    let clapperAngle = 0; // Угол отклонения верхнего язычка-трещотки
    let state = 'idle';   // 'idle' | 'charging' | 'spinning' | 'settling' | 'finished'
    let chargePower = 0;  // 0..100
    let winningHighlightAlpha = 0;

    // Вычисляет индекс сектора, который сейчас находится ровно под верхней стрелкой (12 часов = -PI/2)
    const getSectorUnderPointer = (angleRad) => {
      const pointerPos = (Math.PI * 1.5 - (angleRad % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2);
      return Math.floor(pointerPos / arcSize) % numSectors;
    };

    let lastPegIndex = getSectorUnderPointer(currentAngle);

    // Отрисовка колеса со всеми подписями, иконками и колышками прямо на полотне
    const renderWheel = () => {
      ctx.clearRect(0, 0, 260, 260);
      const cx = 130;
      const cy = 130;
      const radius = 116;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(currentAngle);

      const activeIdx = getSectorUnderPointer(currentAngle);

      // 1. Рисуем 6 секторов
      for (let i = 0; i < numSectors; i++) {
        const startA = i * arcSize;
        const endA = startA + arcSize;
        const sec = sectors[i];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startA, endA);
        ctx.closePath();

        // Градиент сектора
        const grad = ctx.createRadialGradient(0, 0, 18, 0, 0, radius);
        grad.addColorStop(0, sec.color);
        grad.addColorStop(0.85, sec.accent);
        grad.addColorStop(1, sec.color);
        ctx.fillStyle = grad;
        ctx.fill();

        // Подсветка активного сектора под стрелкой
        if (i === activeIdx && (state === 'spinning' || state === 'settling' || state === 'finished')) {
          ctx.fillStyle = `rgba(255, 255, 255, ${state === 'finished' ? 0.28 + Math.sin(winningHighlightAlpha) * 0.12 : 0.14})`;
          ctx.fill();
        }

        // Разделительная медная линия
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#3d2512';
        ctx.stroke();

        // 2. Рисуем текст и иконку внутри каждого сектора
        ctx.save();
        ctx.rotate(startA + arcSize / 2);

        // Иконка ресурса ближе к краю обода
        const iconImg = this.loadedIcons[sec.iconKey];
        if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
          ctx.save();
          ctx.translate(82, 0);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(iconImg, -13, -13, 26, 26);
          ctx.restore();
        }

        // Крупная надпись вдоль радиуса сектора
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px "8bitoperator", monospace, sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(15, 10, 5, 0.9)';
        ctx.fillStyle = sec.good ? '#fff8e7' : '#ffb3b3';

        ctx.save();
        ctx.translate(50, 0);
        ctx.strokeText(sec.shortText, 0, 0);
        ctx.fillText(sec.shortText, 0, 0);
        ctx.restore();

        ctx.restore();
      }

      // 3. Деревянный кованый обод колеса
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#5c3a1d';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#d4a359';
      ctx.stroke();

      // 4. Металлические штифты-колышки на границах секторов (о которые бьётся трещотка)
      for (let i = 0; i < numSectors; i++) {
        const pegAngle = i * arcSize;
        const px = Math.cos(pegAngle) * (radius - 1);
        const py = Math.sin(pegAngle) * (radius - 1);

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd166';
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#2b1808';
        ctx.stroke();
      }

      // 5. Центральная золотая втулка
      const hubGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 22);
      hubGrad.addColorStop(0, '#fff3b0');
      hubGrad.addColorStop(0.6, '#e09f3e');
      hubGrad.addColorStop(1, '#6b4212');

      ctx.beginPath();
      ctx.arc(0, 0, 21, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#331e09';
      ctx.stroke();

      ctx.restore();
    };

    // Главный физический цикл
    let lastTime = performance.now();
    const updatePhysics = (now) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      // Фаза 1: Зажатие кнопки — игрок медленно оттягивает колесо назад (эффект пружины)
      if (state === 'charging') {
        chargePower = Math.min(100, chargePower + dt * 85);
        currentAngle -= dt * 0.55; // Пятится назад против часовой стрелки
        if (tensionFillEl) tensionFillEl.style.width = `${chargePower}%`;

        // Лёгкое дрожание от напряжения
        const shake = (Math.random() - 0.5) * (chargePower * 0.025);
        canvas.style.transform = `translate(${shake}px, ${shake}px) scale(${1 + chargePower * 0.0005})`;

        if (indicatorEl) {
          indicatorEl.textContent = `Натяжение пружины: ${Math.round(chargePower)}% — Отпустите для броска!`;
        }
      }

      // Фаза 2: Свободное вращение с нелинейным трением и ударами о колышки
      if (state === 'spinning') {
        currentAngle += angularVelocity * dt;

        // Реалистичное вязкое + сухое трение оси
        const drag = angularVelocity > 4.0 ? 0.985 : (angularVelocity > 1.2 ? 0.976 : 0.962);
        angularVelocity *= Math.pow(drag, dt * 60);

        // Проверяем прохождение колышка под верхним язычком
        const currentPegIdx = getSectorUnderPointer(currentAngle);
        if (currentPegIdx !== lastPegIndex) {
          lastPegIndex = currentPegIdx;

          // Язычок трещотки отгибается от удара колышка!
          clapperAngle = -Math.min(38, Math.max(14, angularVelocity * 4.2));

          // Физическое торможение колеса о сам колышек (создаёт интригу на излёте!)
          angularVelocity = Math.max(0.08, angularVelocity - 0.085);

          // Звук щелчка колышка
          if (typeof audio.playDiceBounce === 'function') {
            audio.playDiceBounce(Math.min(0.75, Math.max(0.18, angularVelocity / 14)));
          } else {
            audio.playClick();
          }

          // Обновляем живое табло текущим сектором
          const sec = sectors[currentPegIdx];
          if (indicatorEl && sec) {
            indicatorEl.textContent = sec.fullLabel;
            indicatorEl.style.borderColor = sec.good ? '#2ec4b6' : '#e63946';
            indicatorEl.style.transform = 'scale(1.04)';
            setTimeout(() => {
              if (indicatorEl) indicatorEl.style.transform = 'scale(1)';
            }, 70);
          }
        }

        // Проверяем, не застрял ли колышек прямо под язычком на малой скорости (отскок от штифта)
        const pointerPos = (Math.PI * 1.5 - (currentAngle % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2);
        const distToPin = pointerPos % arcSize; // Расстояние в радианах от границы сектора

        if (angularVelocity < 0.22) {
          // Если остановились слишком близко к железному штифту — колесо упруго откатывается чуть вглубь сектора
          if (distToPin < 0.07) {
            angularVelocity = 0.26;
          } else if (arcSize - distToPin < 0.07) {
            currentAngle -= 0.04;
            angularVelocity = 0;
          } else {
            angularVelocity = 0;
          }
        }

        if (angularVelocity === 0) {
          state = 'finished';
          clapperAngle = 0;
          const finalIdx = getSectorUnderPointer(currentAngle);
          this.finishSpin(sectors[finalIdx], indicatorEl);
        }
      }

      // Пружинный возврат язычка-трещотки в вертикальное положение
      if (Math.abs(clapperAngle) > 0.2) {
        clapperAngle *= 0.78;
        if (clapperEl) {
          clapperEl.style.transform = `rotate(${clapperAngle.toFixed(1)}deg)`;
        }
      } else if (clapperEl) {
        clapperEl.style.transform = 'rotate(0deg)';
      }

      if (state === 'finished') {
        winningHighlightAlpha += dt * 8;
      }

      renderWheel();
      this.rafId = requestAnimationFrame(updatePhysics);
    };

    renderWheel();
    this.rafId = requestAnimationFrame(updatePhysics);

    // Создание кнопки с механикой "Зажми и отпусти"
    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'btn-leaf-green btn-quest-main-btn';
    btn.innerHTML = '<span id="wheel-btn-text" class="btn-leaf-green-text">ЗАЖАТЬ И КРУТАНУТЬ!</span>';
    bottomBar.appendChild(btn);

    const btnText = document.getElementById('wheel-btn-text');

    const startCharging = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (state !== 'idle') return;
      state = 'charging';
      chargePower = 15;
      audio.playClick();
      if (btnText) btnText.textContent = 'ОТПУСТИТЕ ДЛЯ ЗАПУСКА!';
    };

    const releaseSpin = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (state !== 'charging') return;
      state = 'spinning';
      btn.disabled = true;
      canvas.style.transform = 'none';
      if (btnText) btnText.textContent = 'КОЛЕСО КРУТИТСЯ...';

      // Начальная угловая скорость зависит от замаха + непредсказуемый разброс,
      // чтобы колесо делало 4–7 полных оборотов и медленно дотягивало последние сектора
      const baseSpeed = 13.5 + (chargePower / 100) * 6.5;
      const randomJitter = Math.random() * 4.5;
      angularVelocity = baseSpeed + randomJitter;

      if (typeof audio.playDiceThrow === 'function') {
        audio.playDiceThrow();
      } else {
        audio.playClick();
      }
    };

    // Управление мышкой и тачем (на кнопке и на самом колесе)
    btn.addEventListener('mousedown', startCharging);
    canvas.addEventListener('mousedown', startCharging);
    btn.addEventListener('touchstart', startCharging, { passive: false });
    canvas.addEventListener('touchstart', startCharging, { passive: false });

    window.addEventListener('mouseup', releaseSpin);
    window.addEventListener('touchend', releaseSpin);
    this._releaseListener = releaseSpin;

    // Управление клавишей Пробел
    this.keyDownHandler = (e) => {
      if (e.code === 'Space' && state === 'idle') {
        e.preventDefault();
        startCharging();
      }
    };
    this.keyUpHandler = (e) => {
      if (e.code === 'Space' && state === 'charging') {
        e.preventDefault();
        releaseSpin();
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  finishSpin(chosen, indicatorEl) {
    if (!chosen) return;

    if (indicatorEl) {
      indicatorEl.textContent = `ВЫПАЛО: ${chosen.fullLabel}`;
      indicatorEl.style.transform = 'scale(1.08)';
    }

    // Небольшая пауза (850 мс), чтобы игрок успел насладиться выпавшим сектором на колесе
    this.timer = setTimeout(() => {
      if (chosen.type === 'eggs') {
        audio.playSuccess();
        const gained = this.eventManager.addEggs(chosen.val, 'Колесо Фортуны');
        this.modal.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: chosen.val >= 20 ? 'ДЖЕКПОТ КОЛЕСА ФОРТУНЫ!' : 'Выигрыш на Колесе Фортуны',
          effectTitle: `Пополнение запасов: +${gained} яиц`,
          narrative: 'Колесо со щелчком замерло на призовом секторе!'
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
    }, 850);
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
    if (this.keyUpHandler) {
      window.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = null;
    }
    if (this._releaseListener) {
      window.removeEventListener('mouseup', this._releaseListener);
      window.removeEventListener('touchend', this._releaseListener);
      this._releaseListener = null;
    }
  }
}