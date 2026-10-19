import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class LockpickGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;

    this.animId = null;
    this.timerId = null;
    this.keyDownHandler = null;
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('lockpick-cylinder-styles')) return;
    const style = document.createElement('style');
    style.id = 'lockpick-cylinder-styles';
    style.textContent = `
      .lockpick-stage-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: 100%;
        max-width: 470px;
        margin: 2px auto;
        user-select: none;
      }
      .lockpick-hud-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 5px 14px;
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(38, 28, 18, 0.95), rgba(20, 14, 9, 0.98));
        border: 2px solid #8c6d46;
        color: #ffd166;
        font-size: 13px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }
      .lockpick-canvas-frame {
        position: relative;
        width: 100%;
        border-radius: 12px;
        border: 3px solid #6b4c2b;
        background: #14110e;
        box-shadow: 0 10px 24px rgba(0,0,0,0.65), inset 0 0 20px rgba(0,0,0,0.85);
        overflow: hidden;
      }
      .lockpick-canvas-el {
        display: block;
        width: 100%;
        height: 215px;
        cursor: pointer;
      }
      .lockpick-shake {
        animation: lockpickShakeAnim 0.28s ease;
      }
      @keyframes lockpickShakeAnim {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }
    `;
    document.head.appendChild(style);
  }

  mount(evt, container, bottomBar) {
    this.destroy();

    const wrap = document.createElement('div');
    wrap.className = 'lockpick-stage-wrap';
    wrap.innerHTML = `
      <div class="lockpick-hud-header">
        <span id="lp-pin-progress">Штифты: 0 / 3</span>
        <span id="lp-pick-health" style="color:#2ec4b6;">Прочность отмычки: II</span>
      </div>
      <div id="lp-canvas-frame" class="lockpick-canvas-frame">
        <canvas id="lp-cylinder-canvas" class="lockpick-canvas-el" width="460" height="215"></canvas>
      </div>
    `;
    container.appendChild(wrap);

    const canvas = document.getElementById('lp-cylinder-canvas');
    const frameEl = document.getElementById('lp-canvas-frame');
    const ctx = canvas.getContext('2d');
    const progressEl = document.getElementById('lp-pin-progress');
    const healthEl = document.getElementById('lp-pick-health');

    // Линия сдвига сердечника замка (Shear Line Y)
    const shearLineY = 108;

    // 3 штифта с разной шириной целевой зоны и скоростью
    const pins = [
      {
        index: 0,
        label: 'I',
        x: 135,
        lift: 15,         // Текущий подъём штифта (0..100)
        dir: 1,
        speed: 95,        // Скорость движения (ед/сек)
        sweetMin: 42,     // Зелёная зона фиксации
        sweetMax: 74,
        locked: false
      },
      {
        index: 1,
        label: 'II',
        x: 230,
        lift: 10,
        dir: 1,
        speed: 125,
        sweetMin: 34,
        sweetMax: 62,
        locked: false
      },
      {
        index: 2,
        label: 'III',
        x: 325,
        lift: 20,
        dir: 1,
        speed: 155,
        sweetMin: 48,
        sweetMax: 72,
        locked: false
      }
    ];

    let currentPinIdx = 0;
    let pickHealth = 2; // 2 права на ошибку до поломки отмычки
    let state = 'picking'; // 'picking' | 'unlocking' | 'broken' | 'done'
    let plugTurnAngle = 0; // Поворот личинки при успешном взломе
    const sparks = [];

    const spawnSparks = (x, y, color) => {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 110;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 1.0,
          color
        });
      }
    };

    const attemptLockPin = () => {
      if (state !== 'picking') return;
      const pin = pins[currentPinIdx];
      if (!pin) return;

      const isSweetSpot = pin.lift >= pin.sweetMin && pin.lift <= pin.sweetMax;

      if (isSweetSpot) {
        // Успешная фиксация штифта на линии сдвига!
        pin.locked = true;
        pin.lift = (pin.sweetMin + pin.sweetMax) / 2;
        audio.playClick();
        if (typeof audio.playDiceBounce === 'function') audio.playDiceBounce(0.65);

        spawnSparks(pin.x, shearLineY, '#2ec4b6');
        currentPinIdx++;

        if (progressEl) {
          progressEl.textContent = `Штифты: ${currentPinIdx} / 3`;
        }

        if (currentPinIdx >= 3) {
          // Все 3 штифта взломаны — поворачиваем засов!
          state = 'unlocking';
          if (btn) btn.disabled = true;
          if (btnTxt) btnTxt.textContent = 'ЗАСОВ ПОВОРАЧИВАЕТСЯ...';
          audio.playSuccess();

          this.timerId = setTimeout(() => {
            state = 'done';
            const gained = this.eventManager.addEggs(9, 'Тайник в погребе');
            this.eventManager.addRerollDice(1);
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: 'Замок взломан',
              effectTitle: `Тайник открыт: +${gained} яиц и +1 кубик`,
              narrative: 'Последний штифт с глухим щелчком встал на место. Внутри погреба обнаружились нетронутые запасы.'
            });
          }, 850);
        } else if (btnTxt) {
          btnTxt.textContent = `ЗАФИКСИРОВАТЬ ШТИФТ ${pins[currentPinIdx].label} (ПРОБЕЛ)`;
        }
      } else {
        // Срыв со штифта!
        pickHealth--;
        audio.playImpact();
        spawnSparks(pin.x, shearLineY + 28, '#ff6b6b');

        if (frameEl) {
          frameEl.classList.remove('lockpick-shake');
          void frameEl.offsetWidth;
          frameEl.classList.add('lockpick-shake');
        }

        if (pickHealth === 1) {
          if (healthEl) {
            healthEl.textContent = 'Отмычка погнулась: I (Последний шанс!)';
            healthEl.style.color = '#ff6b6b';
          }
        } else if (pickHealth <= 0) {
          state = 'broken';
          if (btn) btn.disabled = true;
          if (btnTxt) btnTxt.textContent = 'ОТМЫЧКА СЛОМАЛАСЬ!';
          if (healthEl) healthEl.textContent = 'Отмычка сломана: 0';

          this.timerId = setTimeout(() => {
            state = 'done';
            this.modal.showOutcomeWithBanner({
              isGood: false,
              icon: BOARD_ASSET_ICONS.TILE_BAD,
              label: 'Срыв отмычки',
              effectTitle: 'Механизм заблокирован',
              narrative: 'Пружина сорвалась на последнем витке. Придётся оставить погреб и двигаться дальше.'
            });
          }, 750);
        }
      }
    };

    let lastTime = performance.now();
    const updateAndDraw = (now) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;

      // 1. Обновление позиции активного штифта
      if (state === 'picking' && currentPinIdx < pins.length) {
        const activePin = pins[currentPinIdx];
        activePin.lift += activePin.dir * activePin.speed * dt;
        if (activePin.lift >= 96) {
          activePin.lift = 96;
          activePin.dir = -1;
        } else if (activePin.lift <= 4) {
          activePin.lift = 4;
          activePin.dir = 1;
        }
      } else if (state === 'unlocking') {
        plugTurnAngle = Math.min(Math.PI / 2, plugTurnAngle + dt * 2.4);
      }

      // 2. Обновление искр
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy += 260 * dt;
        sp.life -= dt * 2.4;
        if (sp.life <= 0) sparks.splice(i, 1);
      }

      // 3. Отрисовка механизма замка в разрезе
      this.renderCylinder(ctx, pins, currentPinIdx, shearLineY, state, plugTurnAngle, pickHealth, sparks);

      if (state !== 'done') {
        this.animId = requestAnimationFrame(updateAndDraw);
      }
    };

    this.animId = requestAnimationFrame(updateAndDraw);
    canvas.addEventListener('mousedown', attemptLockPin);

    let btn = null;
    let btnTxt = null;
    if (bottomBar) {
      bottomBar.innerHTML = '';
      btn = document.createElement('button');
      btn.className = 'btn-leaf-green btn-quest-main-btn';
      btn.innerHTML = '<span id="lp-btn-text" class="btn-leaf-green-text">ЗАФИКСИРОВАТЬ ШТИФТ I (ПРОБЕЛ)</span>';
      btn.addEventListener('click', attemptLockPin);
      bottomBar.appendChild(btn);
      btnTxt = document.getElementById('lp-btn-text');
    }

    this.keyDownHandler = (e) => {
      if (e.code === 'Space' && state === 'picking') {
        e.preventDefault();
        attemptLockPin();
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);
  }

  renderCylinder(ctx, pins, currentPinIdx, shearLineY, state, plugTurnAngle, pickHealth, sparks) {
    ctx.clearRect(0, 0, 460, 215);

    // 1. Корпус замка (верхняя неподвижная часть и нижний вращающийся сердечник)
    ctx.fillStyle = '#241c14';
    ctx.fillRect(65, 14, 310, shearLineY - 14);

    ctx.fillStyle = state === 'unlocking' ? '#33291a' : '#2e2318';
    ctx.fillRect(65, shearLineY, 310, 195 - shearLineY);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7c5832';
    ctx.strokeRect(65, 14, 310, 181);

    // 2. Пунктирная зелёная линия сдвига (Shear Line)
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([7, 5]);
    ctx.moveTo(68, shearLineY);
    ctx.lineTo(372, shearLineY);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = state === 'unlocking' ? '#ffd166' : '#2ec4b6';
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#2ec4b6';
    ctx.font = 'bold 10px "8bitoperator", monospace, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ПАЗ', 72, shearLineY - 5);

    // 3. Отрисовка 3 шахт и штифтов
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      const isCurrent = i === currentPinIdx && state === 'picking';
      const inSweet = p.lift >= p.sweetMin && p.lift <= p.sweetMax;

      // Шахта штифта
      ctx.fillStyle = '#0d0a07';
      ctx.fillRect(p.x - 18, 20, 36, 150);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isCurrent ? '#ffd166' : '#4a3723';
      ctx.strokeRect(p.x - 18, 20, 36, 150);

      // Подсветка целевого окна в шахте вокруг линии сдвига
      ctx.fillStyle = p.locked
        ? 'rgba(46, 196, 182, 0.28)'
        : (inSweet && isCurrent ? 'rgba(46, 196, 182, 0.35)' : 'rgba(255, 209, 102, 0.12)');
      ctx.fillRect(p.x - 17, shearLineY - 11, 34, 22);

      // Вычисляем положение зазора между верхним и нижним штифтом:
      // Когда p.lift находится в середине [sweetMin..sweetMax], зазор (gapY) совпадает с shearLineY!
      const sweetCenter = (p.sweetMin + p.sweetMax) / 2;
      const offsetPx = (sweetCenter - p.lift) * 0.65;
      const gapY = shearLineY + offsetPx;

      const pinW = 24;
      const driverH = 32;
      const keyPinH = 34;

      // Витая пружина сверху
      const springBottomY = gapY - driverH - 2;
      ctx.beginPath();
      ctx.moveTo(p.x, 22);
      const coils = 5;
      for (let c = 1; c <= coils; c++) {
        const sy = 22 + ((springBottomY - 22) * c) / coils;
        const sx = p.x + (c % 2 === 0 ? -8 : 8);
        ctx.lineTo(sx, sy);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#95a5a6';
      ctx.stroke();

      // Верхний штифт (Driver Pin)
      const driverGrad = ctx.createLinearGradient(p.x - pinW / 2, 0, p.x + pinW / 2, 0);
      if (p.locked || (isCurrent && inSweet)) {
        driverGrad.addColorStop(0, '#15615a');
        driverGrad.addColorStop(0.5, '#2ec4b6');
        driverGrad.addColorStop(1, '#15615a');
      } else {
        driverGrad.addColorStop(0, '#8c6222');
        driverGrad.addColorStop(0.5, '#ffd166');
        driverGrad.addColorStop(1, '#8c6222');
      }

      ctx.fillStyle = driverGrad;
      ctx.fillRect(p.x - pinW / 2, gapY - driverH - 2, pinW, driverH);
      ctx.strokeStyle = '#1f1408';
      ctx.strokeRect(p.x - pinW / 2, gapY - driverH - 2, pinW, driverH);

      // Нижний кодовый штифт (Key Pin)
      ctx.fillStyle = driverGrad;
      ctx.fillRect(p.x - pinW / 2, gapY + 2, pinW, keyPinH);
      ctx.strokeRect(p.x - pinW / 2, gapY + 2, pinW, keyPinH);

      // Подпись номера штифта внизу
      ctx.fillStyle = p.locked ? '#2ec4b6' : (isCurrent ? '#ffd166' : '#8c7b65');
      ctx.font = 'bold 12px "8bitoperator", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.locked ? 'ОК' : p.label, p.x, 186);
    }

    // 4. Отрисовка стальной отмычки под активным штифтом
    if (state === 'picking' && currentPinIdx < pins.length) {
      const activePin = pins[currentPinIdx];
      const sweetCenter = (activePin.sweetMin + activePin.sweetMax) / 2;
      const gapY = shearLineY + (sweetCenter - activePin.lift) * 0.65;
      const tipY = gapY + 38;

      ctx.save();
      ctx.beginPath();
      // Стержень отмычки идёт справа из замочной скважины к кончику штифта
      ctx.moveTo(450, 162);
      ctx.lineTo(activePin.x + 28, 158);
      ctx.lineTo(activePin.x, tipY + 6);
      ctx.lineTo(activePin.x, tipY);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = pickHealth === 1 ? '#e07a5f' : '#dee2e6';
      ctx.stroke();
      ctx.restore();
    }

    // 5. Круглый индикатор поворота сердечника справа
    ctx.save();
    ctx.translate(416, 106);
    ctx.rotate(plugTurnAngle);
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fillStyle = state === 'unlocking' ? '#2ec4b6' : '#b58d5b';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2b1808';
    ctx.stroke();

    // Замочная скважина в центре сердечника
    ctx.fillStyle = '#14110e';
    ctx.fillRect(-4, -14, 8, 28);
    ctx.beginPath();
    ctx.arc(0, -6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 6. Искры при щелчке или срыве
    for (const sp of sparks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.life);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
  }
}