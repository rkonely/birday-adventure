import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class ClawGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;

    this.animId = null;
    this.timerId = null;
    this.keyDownHandler = null;

    this.loadedIcons = {};
    this.preloadIcons();
    this.injectStyles();
  }

  preloadIcons() {
    const map = {
      egg: BOARD_ASSET_ICONS.EGG,
      booster: BOARD_ASSET_ICONS.BOOSTER,
      dice: BOARD_ASSET_ICONS.DICE
    };
    Object.entries(map).forEach(([k, src]) => {
      const img = new Image();
      img.src = src;
      this.loadedIcons[k] = img;
    });
  }

  injectStyles() {
    if (document.getElementById('claw-arcade-styles')) return;
    const style = document.createElement('style');
    style.id = 'claw-arcade-styles';
    style.textContent = `
      .claw-arcade-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: 100%;
        max-width: 470px;
        margin: 2px auto;
        user-select: none;
      }
      .claw-arcade-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 5px 14px;
        border-radius: 8px;
        background: linear-gradient(180deg, #9e2a2b 0%, #540b0e 100%);
        border: 2px solid #ffd166;
        color: #fff3b0;
        font-size: 13px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }
      .claw-cabinet-frame {
        position: relative;
        width: 100%;
        border-radius: 12px;
        border: 4px solid #7c5832;
        background: #141b24;
        box-shadow: 0 10px 26px rgba(0,0,0,0.65), inset 0 0 24px rgba(0,0,0,0.8);
        overflow: hidden;
      }
      .claw-cabinet-canvas {
        display: block;
        width: 100%;
        height: 220px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  mount(evt, container, bottomBar) {
    this.destroy();

    const wrap = document.createElement('div');
    wrap.className = 'claw-arcade-wrap';
    wrap.innerHTML = `
      <div class="claw-arcade-header">
        <span>АВТОМАТ ДИКОВИНОК</span>
        <span id="claw-status-label" style="color:#a8fff7;">Наведите лазер на капсулу!</span>
      </div>
      <div class="claw-cabinet-frame">
        <canvas id="claw-arcade-canvas" class="claw-cabinet-canvas" width="460" height="220"></canvas>
      </div>
    `;
    container.appendChild(wrap);

    const canvas = document.getElementById('claw-arcade-canvas');
    const ctx = canvas.getContext('2d');
    const statusLabel = document.getElementById('claw-status-label');

    // Координата шахты выдачи призов слева
    const chuteX = 52;

    // Призовые капсулы на дне витрины (координаты, тип награды, цвет купола)
    const capsules = [
      {
        id: 'small_left',
        x: 145,
        y: 186,
        r: 20,
        type: 'eggs_small',
        val: 4,
        label: '+4 ЯЙЦА',
        shellColor: '#4cc9f0',
        baseColor: '#1d3557',
        iconKey: 'egg'
      },
      {
        id: 'dice_mid_left',
        x: 205,
        y: 184,
        r: 21,
        type: 'reroll',
        val: 2,
        label: '+2 КУБИКА',
        shellColor: '#c792ea',
        baseColor: '#4a2574',
        iconKey: 'dice'
      },
      {
        id: 'grand_center',
        x: 272,
        y: 178,
        r: 25,
        type: 'grand', // Центральная главная капсула (Бустер карт или +8 яиц по PDF)
        val: 8,
        label: 'ГЛАВНЫЙ ПРИЗ',
        shellColor: '#ffd166',
        baseColor: '#b57c1e',
        iconKey: 'booster',
        isGrand: true
      },
      {
        id: 'eggs_mid_right',
        x: 342,
        y: 183,
        r: 22,
        type: 'eggs_big',
        val: 8,
        label: '+8 ЯИЦ',
        shellColor: '#2ec4b6',
        baseColor: '#0f4c46',
        iconKey: 'egg'
      },
      {
        id: 'small_right',
        x: 405,
        y: 186,
        r: 20,
        type: 'eggs_small',
        val: 3,
        label: '+3 ЯЙЦА',
        shellColor: '#ff9f1c',
        baseColor: '#7c4d25',
        iconKey: 'egg'
      }
    ];

    // Состояние крана
    // 'moving' | 'dropping' | 'grabbing' | 'lifting' | 'returning' | 'releasing' | 'done'
    let state = 'moving';
    let carriageX = 120;
    let carriageSpeed = 165; // пикселей в секунду
    let ropeLength = 26;
    const minRope = 26;
    const maxRope = 142;

    let clawOpenAngle = 0.55; // Раскрытие лапок (в радианах)
    let swingAngle = 0;       // Покачивание клешни при движении
    let swingVel = 0;

    let grabbedCapsule = null;
    let isSlipperyGrip = false; // Если игрок промахнулся от центра капсулы, она может выскользнуть!
    let slipTriggered = false;
    let stateTimer = 0;

    const triggerDrop = () => {
      if (state !== 'moving') return;
      state = 'dropping';
      if (btn) btn.disabled = true;
      if (btnTxt) btnTxt.textContent = 'КЛЕШНЯ ОПУСКАЕТСЯ...';
      if (statusLabel) {
        statusLabel.textContent = 'Захват опускается...';
        statusLabel.style.color = '#ffd166';
      }
      audio.playClick();
    };

    let lastTime = performance.now();
    const updateAndRender = (now) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;

      // 1. Логика фаз автомата
      if (state === 'moving') {
        const prevSpeed = carriageSpeed;
        carriageX += carriageSpeed * dt;
        if (carriageX >= 418) {
          carriageX = 418;
          carriageSpeed = -Math.abs(carriageSpeed);
        } else if (carriageX <= 122) {
          carriageX = 122;
          carriageSpeed = Math.abs(carriageSpeed);
        }

        // Импульс маятника при развороте у стенки
        if (Math.sign(prevSpeed) !== Math.sign(carriageSpeed)) {
          swingVel += carriageSpeed * 0.0025;
        }
      } else if (state === 'dropping') {
        ropeLength += 190 * dt;
        clawOpenAngle = Math.min(0.65, clawOpenAngle + dt * 1.2);

        // Проверяем касание ближайшей капсулы или дна
        let hitTargetY = maxRope;
        for (const cap of capsules) {
          const distX = Math.abs(carriageX - cap.x);
          if (distX < cap.r + 12) {
            hitTargetY = Math.min(maxRope, cap.y - cap.r - 22);
          }
        }

        if (ropeLength >= hitTargetY) {
          ropeLength = hitTargetY;
          state = 'grabbing';
          stateTimer = 0;
          if (typeof audio.playDiceBounce === 'function') audio.playDiceBounce(0.6);
        }
      } else if (state === 'grabbing') {
        stateTimer += dt;
        clawOpenAngle = Math.max(0.14, clawOpenAngle - dt * 1.8);

        if (stateTimer >= 0.38) {
          // Определяем, какую капсулу схватила клешня
          let bestCap = null;
          let minDx = Infinity;
          for (const cap of capsules) {
            const dx = Math.abs(carriageX - cap.x);
            if (dx < minDx) {
              minDx = dx;
              bestCap = cap;
            }
          }

          if (bestCap && minDx <= bestCap.r + 8) {
            grabbedCapsule = bestCap;
            // Если отклонение от центра капсулы больше 13px — захват ненадёжный (интрига!)
            isSlipperyGrip = minDx > 13.5;
            if (statusLabel) {
              statusLabel.textContent = isSlipperyGrip
                ? 'Ой! Клешня зацепила самый край капсулы...'
                : `Захвачено: ${bestCap.label}! Поднимаем...`;
              statusLabel.style.color = isSlipperyGrip ? '#ff6b6b' : '#2ec4b6';
            }
          } else {
            if (statusLabel) {
              statusLabel.textContent = 'Клешня сомкнулась в воздухе...';
              statusLabel.style.color = '#ff6b6b';
            }
          }

          state = 'lifting';
          stateTimer = 0;
        }
      } else if (state === 'lifting') {
        ropeLength -= 145 * dt;

        if (grabbedCapsule && !slipTriggered) {
          // Эффект тряски капсулы при неточном захвате
          const jitter = isSlipperyGrip ? (Math.random() - 0.5) * 5 : 0;
          grabbedCapsule.x = carriageX + jitter;
          grabbedCapsule.y = 26 + ropeLength + 20;

          // На середине подъёма скользкая капсула выскальзывает из лапок!
          if (isSlipperyGrip && ropeLength < 82) {
            slipTriggered = true;
            audio.playImpact();
            if (statusLabel) {
              statusLabel.textContent = 'Капсула сорвалась! Сработал утешительный бонус!';
            }
          }
        }

        // Если капсула сорвалась — падает обратно на дно
        if (grabbedCapsule && slipTriggered) {
          grabbedCapsule.y = Math.min(184, grabbedCapsule.y + 280 * dt);
        }

        if (ropeLength <= minRope) {
          ropeLength = minRope;
          state = 'returning';
        }
      } else if (state === 'returning') {
        if (carriageX > chuteX) {
          carriageX = Math.max(chuteX, carriageX - 185 * dt);
          if (grabbedCapsule && !slipTriggered) {
            grabbedCapsule.x = carriageX;
            grabbedCapsule.y = 26 + ropeLength + 20;
          }
        } else {
          state = 'releasing';
          stateTimer = 0;
          if (typeof audio.playDiceBounce === 'function') audio.playDiceBounce(0.5);
        }
      } else if (state === 'releasing') {
        stateTimer += dt;
        clawOpenAngle = Math.min(0.6, clawOpenAngle + dt * 2.0);

        if (grabbedCapsule && !slipTriggered) {
          grabbedCapsule.y += 320 * dt;
        }

        if (stateTimer >= 0.55) {
          state = 'done';
          this.finishClawGame(grabbedCapsule && !slipTriggered ? grabbedCapsule : null);
        }
      }

      // 2. Физика затухания маятника клешни
      const springForce = -14 * swingAngle;
      swingVel += springForce * dt;
      swingVel *= 0.92;
      swingAngle += swingVel * dt;

      // 3. Отрисовка витрины автомата
      this.renderCabinet(ctx, carriageX, ropeLength, clawOpenAngle, swingAngle, chuteX, capsules, state);

      if (state !== 'done') {
        this.animId = requestAnimationFrame(updateAndRender);
      }
    };

    this.animId = requestAnimationFrame(updateAndRender);

    canvas.addEventListener('mousedown', triggerDrop);

    let btn = null;
    let btnTxt = null;
    if (bottomBar) {
      bottomBar.innerHTML = '';
      btn = document.createElement('button');
      btn.className = 'btn-leaf-green btn-quest-main-btn';
      btn.innerHTML = '<span id="claw-action-btn-txt" class="btn-leaf-green-text">ОПУСТИТЬ ЗАХВАТ (ПРОБЕЛ)</span>';
      btn.addEventListener('click', triggerDrop);
      bottomBar.appendChild(btn);
      btnTxt = document.getElementById('claw-action-btn-txt');
    }

    this.keyDownHandler = (e) => {
      if (e.code === 'Space' && state === 'moving') {
        e.preventDefault();
        triggerDrop();
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);
  }

  renderCabinet(ctx, carriageX, ropeLength, clawOpenAngle, swingAngle, chuteX, capsules, state) {
    ctx.clearRect(0, 0, 460, 220);

    // 1. Задний фон витрины с неоновой подсветкой центральной зоны
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 220);
    bgGrad.addColorStop(0, '#121924');
    bgGrad.addColorStop(1, '#1f2b3d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 460, 220);

    // Подсветка зоны главного приза (бирюзовый луч по центру)
    const zoneGrad = ctx.createLinearGradient(0, 20, 0, 205);
    zoneGrad.addColorStop(0, 'rgba(46, 196, 182, 0.05)');
    zoneGrad.addColorStop(1, 'rgba(46, 196, 182, 0.22)');
    ctx.fillStyle = zoneGrad;
    ctx.fillRect(236, 18, 72, 188);

    // 2. Лазерный прицел от каретки вниз (пока игрок целится)
    if (state === 'moving') {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(carriageX, 34);
      ctx.lineTo(carriageX, 200);
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Отрисовка призовых гача-капсул
    for (const cap of capsules) {
      ctx.save();
      ctx.translate(cap.x, cap.y);

      // Золотое свечение вокруг главной капсулы
      if (cap.isGrand) {
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 14;
      }

      // Нижняя половинка капсулы
      ctx.beginPath();
      ctx.arc(0, 0, cap.r, 0, Math.PI, false);
      ctx.fillStyle = cap.baseColor;
      ctx.fill();

      // Верхний прозрачный купол капсулы
      ctx.beginPath();
      ctx.arc(0, 0, cap.r, Math.PI, 0, false);
      ctx.fillStyle = cap.shellColor;
      ctx.globalAlpha = 0.82;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Обводка и экваториальный поясок капсулы
      ctx.beginPath();
      ctx.arc(0, 0, cap.r, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1b1209';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-cap.r, 0);
      ctx.lineTo(cap.r, 0);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.stroke();

      // Иконка ресурса внутри капсулы
      const icon = this.loadedIcons[cap.iconKey];
      if (icon && icon.complete && icon.naturalWidth > 0) {
        const iSize = cap.r * 1.05;
        ctx.drawImage(icon, -iSize / 2, -iSize / 2 - 2, iSize, iSize);
      }

      // Блик на стекле капсулы
      ctx.beginPath();
      ctx.arc(-cap.r * 0.35, -cap.r * 0.38, cap.r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fill();

      ctx.restore();
    }

    // 4. Шахта призового лотка слева (ПРИЗЫ)
    ctx.fillStyle = '#2b1d12';
    ctx.fillRect(10, 138, 84, 82);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#b58d5b';
    ctx.strokeRect(10, 138, 84, 82);

    ctx.fillStyle = '#0c1017';
    ctx.fillRect(18, 146, 68, 44);

    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 11px "8bitoperator", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ЛОТОК ВЫДАЧИ', 52, 206);

    // 5. Верхняя стальная балка-рельс
    ctx.fillStyle = '#3d4f60';
    ctx.fillRect(0, 10, 460, 8);
    ctx.fillStyle = '#1c252e';
    ctx.fillRect(0, 18, 460, 4);

    // 6. Подвижная каретка с шестерёнкой
    ctx.save();
    ctx.translate(carriageX, 16);
    ctx.fillStyle = '#e09f3e';
    ctx.strokeStyle = '#2b1808';
    ctx.lineWidth = 2;
    ctx.fillRect(-20, -6, 40, 18);
    ctx.strokeRect(-20, -6, 40, 18);

    // Стальной трос
    ctx.rotate(swingAngle);
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, ropeLength);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#adb5bd';
    ctx.stroke();

    // 7. Механическая клешня на конце троса
    ctx.translate(0, ropeLength);

    // Центральный шарнир клешни
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2b1808';
    ctx.stroke();

    // Левая стальная лапка
    ctx.save();
    ctx.rotate(clawOpenAngle);
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(-18, 18);
    ctx.lineTo(-10, 34);
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#e9ecef';
    ctx.stroke();
    ctx.restore();

    // Правая стальная лапка
    ctx.save();
    ctx.rotate(-clawOpenAngle);
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(18, 18);
    ctx.lineTo(10, 34);
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#e9ecef';
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  finishClawGame(caughtCapsule) {
    this.timerId = setTimeout(() => {
      if (caughtCapsule) {
        audio.playSuccess();

        if (caughtCapsule.type === 'grand') {
          // Главная центральная капсула (45% Бустер карт или +8 яиц по Ивенты-Описание.pdf)
          const winBooster = Math.random() < 0.45;
          if (winBooster) {
            this.eventManager.addBoosterPacks(1);
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.BOOSTER,
              label: 'Точный захват центральной капсулы!',
              effectTitle: 'Получен набор: +1 Бустер карт',
              narrative: 'Стальные лапки клешни надёжно сомкнулись вокруг главной призовой капсулы.'
            });
          } else {
            const gained = this.eventManager.addEggs(8, 'Механический кран');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: 'Точный захват!',
              effectTitle: `Золотая капсула: +${gained} яиц`,
              narrative: 'Кран аккуратно доставил увесистую капсулу с запасом яиц в лоток выдачи.'
            });
          }
        } else if (caughtCapsule.type === 'reroll') {
          this.eventManager.addRerollDice(caughtCapsule.val);
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.DICE,
            label: 'Капсула доставлена в лоток!',
            effectTitle: `Тактический улов: +${caughtCapsule.val} кубика переброса`,
            narrative: 'Внутри фиолетовой капсулы оказались счастливые игральные кости!'
          });
        } else {
          const gained = this.eventManager.addEggs(caughtCapsule.val, 'Механический кран');
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Удачный улов!',
            effectTitle: `Призовая капсула: +${gained} яиц`,
            narrative: 'Вы ловко вытащили капсулу с запасом яиц из витрины автомата.'
          });
        }
      } else {
        // Если промахнулись или капсула выскользнула по пути вверх — утешительные +2 яйца (по PDF)
        audio.playImpact();
        const gained = this.eventManager.addEggs(2, 'Утешительный улов');
        this.modal.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Касательный захват',
          effectTitle: `Малый улов: +${gained} яйца`,
          narrative: 'Клешня соскользнула с крупной капсулы, но зацепила малый мешочек у края витрины.'
        });
      }
    }, 350);
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