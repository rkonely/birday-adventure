import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class StrongmanGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;

    this.animId = null;
    this.timerId = null;
    this.keyDownHandler = null;
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('strongman-tower-styles')) return;
    const style = document.createElement('style');
    style.id = 'strongman-tower-styles';
    style.textContent = `
      .strongman-tower-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: 100%;
        max-width: 480px;
        margin: 2px auto;
        user-select: none;
      }
      .strongman-top-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 6px 14px;
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(40, 28, 18, 0.95), rgba(22, 15, 9, 0.98));
        border: 2px solid #b58d5b;
        color: #ffd166;
        font-size: 13px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
      }
      .strongman-canvas-box {
        position: relative;
        width: 100%;
        border-radius: 12px;
        border: 3px solid #7c5832;
        background: radial-gradient(circle at 50% 40%, #2b2118 0%, #140e09 100%);
        box-shadow: 0 10px 24px rgba(0,0,0,0.65), inset 0 0 24px rgba(0,0,0,0.85);
        overflow: hidden;
      }
      .strongman-canvas-el {
        display: block;
        width: 100%;
        height: 220px;
        cursor: pointer;
      }
      .strongman-screen-shake {
        animation: strongmanImpactShake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97);
      }
      @keyframes strongmanImpactShake {
        0%, 100% { transform: translate(0, 0); }
        15% { transform: translate(-7px, 5px); }
        30% { transform: translate(6px, -6px); }
        45% { transform: translate(-5px, 3px); }
        60% { transform: translate(4px, -3px); }
        75% { transform: translate(-2px, 2px); }
      }
    `;
    document.head.appendChild(style);
  }

  mount(evt, container, bottomBar) {
    this.destroy();

    const wrap = document.createElement('div');
    wrap.className = 'strongman-tower-wrap';
    wrap.innerHTML = `
      <div class="strongman-top-banner">
        <span id="sm-phase-title">ЭТАП 1: Раскачайте замах кликами / ПРОБЕЛОМ!</span>
        <span id="sm-power-readout" style="color:#2ec4b6;">Мощь: 0%</span>
      </div>
      <div id="sm-canvas-frame" class="strongman-canvas-box">
        <canvas id="sm-tower-canvas" class="strongman-canvas-el" width="470" height="220"></canvas>
      </div>
    `;
    container.appendChild(wrap);

    const canvas = document.getElementById('sm-tower-canvas');
    const frameEl = document.getElementById('sm-canvas-frame');
    const ctx = canvas.getContext('2d');
    const phaseTitleEl = document.getElementById('sm-phase-title');
    const readoutEl = document.getElementById('sm-power-readout');

    // Состояния игры:
    // 'pumping' (накачка замаха против гравитации) -> 'aiming' (быстрый бегунок точности) -> 'striking' (удар молота и полёт гири) -> 'done'
    let state = 'pumping';

    // Параметры накачки (Этап 1)
    let pumpPower = 0;        // Нужно довести до 100%, преодолевая гравитацию
    let pumpTimeLeft = 5.5;   // На раскачку даётся 5.5 секунд

    // Параметры снайперской шкалы точности (Этап 2)
    // 0..55: Слабо (0 яиц) | 55..84: Хорошо (+4 яйца) | 85..94: ПИК СИЛЫ (+10 яиц) | 94..100: СРЫВ (Перегруз, +4 яйца)
    let aimCursor = 0;
    let aimDir = 1;
    let aimSpeed = 148;       // Высокая нелинейная скорость!

    // Параметры анимации молота и летящей гири (Этап 3)
    let hammerAngle = -0.35;  // Угол замаха молота
    let puckHeight = 0;       // Текущая высота гири на башне (0..100)
    let targetPuckHeight = 0;
    let puckVelocity = 0;
    let bellRingTime = 0;
    const sparks = [];

    const spawnSparks = (x, y, color, count = 20) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 50 + Math.random() * 140;
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

    // Переход ко 2-му этапу (поймать узкий пик в момент удара)
    const enterAimingPhase = () => {
      if (state !== 'pumping') return;
      state = 'aiming';
      aimCursor = 10;
      aimDir = 1;
      audio.playSuccess();

      if (phaseTitleEl) {
        phaseTitleEl.textContent = 'ЭТАП 2: Поймайте бегунок в ЗОЛОТОМ ОКНЕ (85-94%)!';
        phaseTitleEl.style.color = '#ff6b6b';
      }
      if (btnTxt) {
        btnTxt.textContent = 'ОБРУШИТЬ МОЛОТ! (ПРОБЕЛ)';
      }
    };

    // Финальный удар молотом по наковальне
    const executeStrike = () => {
      if (state !== 'aiming') return;
      state = 'striking';
      if (btn) btn.disabled = true;

      // Определяем результат попадания с учётом начальной раскачки
      const pumpFactor = Math.max(0.45, pumpPower / 100);
      let finalScore = 0;
      let zoneType = 'weak'; // 'jackpot' | 'overcharge' | 'good' | 'weak'

      if (aimCursor >= 85 && aimCursor <= 94 && pumpPower >= 80) {
        zoneType = 'jackpot';
        finalScore = 100;
      } else if (aimCursor > 94) {
        // Передержал в красной зоне перегрузки! Молот соскользнул
        zoneType = 'overcharge';
        finalScore = 58;
      } else if (aimCursor >= 55 && aimCursor < 85) {
        zoneType = 'good';
        finalScore = Math.round((50 + (aimCursor - 55) * 1.1) * pumpFactor);
      } else {
        zoneType = 'weak';
        finalScore = Math.round(Math.max(12, aimCursor * 0.65) * pumpFactor);
      }

      targetPuckHeight = finalScore;
      puckVelocity = 240;
      hammerAngle = 1.18; // Молот бьёт по красной кнопке!

      audio.playImpact();
      spawnSparks(185, 178, '#ffd166', 24);

      if (frameEl) {
        frameEl.classList.remove('strongman-screen-shake');
        void frameEl.offsetWidth;
        frameEl.classList.add('strongman-screen-shake');
      }

      if (readoutEl) {
        readoutEl.textContent = `Удар: ${Math.round(aimCursor)}%`;
      }

      // Ждём, пока шайба взлетит по столбу, затем показываем кат-сцену/награду
      this.timerId = setTimeout(() => {
        state = 'done';
        this.destroy();

        const finishReward = () => {
          if (zoneType === 'jackpot') {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(10, 'Силомер: Пик силы');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: 'СОКРУШИТЕЛЬНЫЙ УДАР В КОЛОКОЛ!',
              effectTitle: `Максимальная награда: +${gained} яиц`,
              narrative: 'Вы идеально поймали узкую золотую зону! Гиря со звоном ударила в медный гонг!'
            });
          } else if (zoneType === 'overcharge') {
            audio.playClick();
            const gained = this.eventManager.addEggs(4, 'Силомер: Перегруз');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: 'Перебор силы (Срыв хвата на верхушке!)',
              effectTitle: `Средний результат: +${gained} яйца`,
              narrative: 'Вы передержали бегунок в красной зоне перегрузки, и молот ударил немного вскользь.'
            });
          } else if (zoneType === 'good') {
            audio.playClick();
            const gained = this.eventManager.addEggs(4, 'Силомер: Средний удар');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: 'Крепкий замах',
              effectTitle: `Заработано: +${gained} яйца`,
              narrative: 'Удар вышел уверенным, хоть и немного не дотянул до самого колокола.'
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
        };

        if (evt && evt.video && typeof this.modal.playCutscene === 'function') {
          this.modal.playCutscene(evt.video, finishReward);
        } else {
          finishReward();
        }
      }, 1250);
    };

    // Обработчик нажатия игрока (в Этапе 1 качает замах, в Этапе 2 наносит удар)
    const handleActionInput = () => {
      if (state === 'pumping') {
        audio.playClick();
        // Чем выше уже подняли молот, тем тяжелее даётся каждый следующий рывок
        const stepGain = pumpPower < 60 ? 19 : 14;
        pumpPower = Math.min(100, pumpPower + stepGain);
        spawnSparks(95, 165, '#2ec4b6', 6);

        if (pumpPower >= 100) {
          enterAimingPhase();
        }
      } else if (state === 'aiming') {
        executeStrike();
      }
    };

    // Главный физический цикл
    let lastTime = performance.now();
    const updateAndDraw = (now) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;

      if (state === 'pumping') {
        // Тяжесть молота тянет шкалу вниз (тем сильнее, чем выше подняли!)
        const gravityDrain = 18 + (pumpPower * 0.36);
        pumpPower = Math.max(0, pumpPower - gravityDrain * dt);
        pumpTimeLeft = Math.max(0, pumpTimeLeft - dt);

        // Молот постепенно заносится назад над головой по мере накачки
        hammerAngle = -0.2 - (pumpPower / 100) * 1.15;

        if (readoutEl) {
          readoutEl.textContent = `Замах: ${Math.round(pumpPower)}% (${pumpTimeLeft.toFixed(1)} с)`;
        }

        // Если время на раскачку вышло — переходим к удару с тем замахом, что успели набрать
        if (pumpTimeLeft <= 0) {
          enterAimingPhase();
        }
      } else if (state === 'aiming') {
        // Нелинейное ускорение бегунка у вершины (в золотой зоне он летит быстрее всего!)
        const accelFactor = 1 + (aimCursor / 100) * 0.95;
        aimCursor += aimDir * aimSpeed * accelFactor * dt;

        if (aimCursor >= 100) {
          aimCursor = 100;
          aimDir = -1;
          if (typeof audio.playDiceBounce === 'function') audio.playDiceBounce(0.25);
        } else if (aimCursor <= 0) {
          aimCursor = 0;
          aimDir = 1;
        }

        // Молот дрожит от напряжения на полном замахе
        hammerAngle = -1.35 + Math.sin(now * 0.04) * 0.05;

        if (readoutEl) {
          readoutEl.textContent = `Точность: ${Math.round(aimCursor)}%`;
        }
      } else if (state === 'striking') {
        // Полёт шайбы вверх по башне силомера
        if (puckHeight < targetPuckHeight) {
          puckHeight = Math.min(targetPuckHeight, puckHeight + puckVelocity * dt);
          if (puckHeight >= 98 && bellRingTime === 0) {
            bellRingTime = 1.0;
            audio.playSuccess();
            spawnSparks(310, 28, '#ffd166', 32);
          }
        }
        if (bellRingTime > 0) {
          bellRingTime = Math.max(0, bellRingTime - dt * 1.8);
        }
      }

      // Обновление искр
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy += 280 * dt;
        sp.life -= dt * 2.2;
        if (sp.life <= 0) sparks.splice(i, 1);
      }

      this.renderStrongmanScene(
        ctx,
        state,
        pumpPower,
        aimCursor,
        hammerAngle,
        puckHeight,
        bellRingTime,
        sparks
      );

      if (state !== 'done') {
        this.animId = requestAnimationFrame(updateAndDraw);
      }
    };

    this.animId = requestAnimationFrame(updateAndDraw);
    canvas.addEventListener('mousedown', handleActionInput);

    let btn = null;
    let btnTxt = null;
    if (bottomBar) {
      bottomBar.innerHTML = '';
      btn = document.createElement('button');
      btn.className = 'btn-leaf-green btn-quest-main-btn';
      btn.innerHTML = '<span id="sm-main-btn-txt" class="btn-leaf-green-text">КАЧАТЬ ЗАМАХ! (ЖМИТЕ ПРОБЕЛ)</span>';
      btn.addEventListener('click', handleActionInput);
      bottomBar.appendChild(btn);
      btnTxt = document.getElementById('sm-main-btn-txt');
    }

    this.keyDownHandler = (e) => {
      if (e.code === 'Space' && !e.repeat && (state === 'pumping' || state === 'aiming')) {
        e.preventDefault();
        handleActionInput();
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);
  }

  renderStrongmanScene(ctx, state, pumpPower, aimCursor, hammerAngle, puckHeight, bellRingTime, sparks) {
    ctx.clearRect(0, 0, 470, 220);

    // 1. Левая панель: Индикатор замаха (Этап 1) или Снайперская шкала точности (Этап 2)
    const barX = 42;
    const barY = 24;
    const barW = 34;
    const barH = 168;

    ctx.fillStyle = '#140f0a';
    ctx.fillRect(barX, barY, barW, barH);

    if (state === 'pumping') {
      // Заполнение замаха снизу вверх
      const fillH = (pumpPower / 100) * barH;
      const pGrad = ctx.createLinearGradient(0, barY + barH, 0, barY);
      pGrad.addColorStop(0, '#2a9d8f');
      pGrad.addColorStop(0.6, '#ffd166');
      pGrad.addColorStop(1, '#e63946');
      ctx.fillStyle = pGrad;
      ctx.fillRect(barX + 2, barY + barH - fillH, barW - 4, fillH);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px "8bitoperator", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ЗАМАХ', barX + barW / 2, barY + barH + 14);
    } else {
      // Разметка зон для Этапа 2 (Сверху вниз: 94..100 Срыв | 85..94 ПИК | 55..85 Хорошо | 0..55 Слабо)
      const yOver = barY + barH * (1 - 0.94);
      const yPeak = barY + barH * (1 - 0.85);
      const yGood = barY + barH * (1 - 0.55);

      // Красная зона перегрузки (94-100%)
      ctx.fillStyle = 'rgba(230, 57, 70, 0.55)';
      ctx.fillRect(barX + 2, barY, barW - 4, yOver - barY);

      // Узкая Золотая Зона ПИКА СИЛЫ (85-94%)
      ctx.fillStyle = 'rgba(255, 209, 102, 0.88)';
      ctx.fillRect(barX + 2, yOver, barW - 4, yPeak - yOver);

      // Зелёная зона Хорошего удара (55-85%)
      ctx.fillStyle = 'rgba(46, 196, 182, 0.45)';
      ctx.fillRect(barX + 2, yPeak, barW - 4, yGood - yPeak);

      // Серая зона слабого удара (0-55%)
      ctx.fillStyle = 'rgba(140, 123, 101, 0.25)';
      ctx.fillRect(barX + 2, yGood, barW - 4, barY + barH - yGood);

      // Подписи зон справа от шкалы
      ctx.font = 'bold 10px "8bitoperator", monospace, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText('СРЫВ!', barX + barW + 6, barY + 9);
      ctx.fillStyle = '#ffd166';
      ctx.fillText('ПИК (+10)', barX + barW + 6, (yOver + yPeak) / 2 + 3);
      ctx.fillStyle = '#2ec4b6';
      ctx.fillText('ХОРОШО (+4)', barX + barW + 6, (yPeak + yGood) / 2 + 3);

      // Бегущий указатель прицела
      const cursorY = barY + barH * (1 - aimCursor / 100);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(barX - 5, cursorY - 3, barW + 10, 6);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX - 5, cursorY - 3, barW + 10, 6);
    }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#9c7a4c';
    ctx.strokeRect(barX, barY, barW, barH);

    // 2. Центр: Платформа с красной ударной кнопкой и кузнечным молотом
    const padX = 185;
    const padY = 184;

    // Деревянное основание наковальни
    ctx.fillStyle = '#4a321d';
    ctx.fillRect(padX - 38, padY, 76, 22);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2b1808';
    ctx.strokeRect(padX - 38, padY, 76, 22);

    // Красная пружинная кнопка удара (проседает при ударе молота)
    const buttonPress = state === 'striking' ? 6 : 0;
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.roundRect(padX - 24, padY - 12 + buttonPress, 48, 14 - buttonPress, [6, 6, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // Кузнечный молот на шарнире
    ctx.save();
    ctx.translate(padX - 42, padY - 8);
    ctx.rotate(hammerAngle);

    // Рукоять молота
    ctx.fillStyle = '#8c5828';
    ctx.fillRect(-5, -68, 10, 68);
    ctx.strokeStyle = '#2b1808';
    ctx.lineWidth = 2;
    ctx.strokeRect(-5, -68, 10, 68);

    // Тяжёлое чугунное било молота
    ctx.fillStyle = '#6c757d';
    ctx.fillRect(-22, -84, 44, 22);
    ctx.strokeRect(-22, -84, 44, 22);
    ctx.restore();

    // 3. Правая часть: Высокая башня силомера с медным колоколом (как на force gauge.png)
    const towerX = 335;
    const towerTop = 26;
    const towerBottom = 186;
    const towerH = towerBottom - towerTop;

    // Красный деревянный корпус башни
    ctx.fillStyle = '#7f242c';
    ctx.beginPath();
    ctx.roundRect(towerX - 26, towerTop - 10, 52, towerH + 28, 12);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#b58d5b';
    ctx.stroke();

    // Внутренняя светлая шкала с делениями
    ctx.fillStyle = '#e9d8a6';
    ctx.fillRect(towerX - 14, towerTop + 14, 28, towerH - 14);

    ctx.fillStyle = '#2b1808';
    for (let tick = 1; tick <= 9; tick++) {
      const ty = towerBottom - (tick / 10) * (towerH - 18);
      ctx.fillRect(towerX + 2, ty, 12, 2);
    }

    // Металлическая гиря-бегунок, взлетающая по рельсу башни
    const puckY = towerBottom - (puckHeight / 100) * (towerH - 22);
    ctx.fillStyle = puckHeight >= 95 ? '#2ec4b6' : '#d90429';
    ctx.fillRect(towerX - 18, puckY - 6, 36, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(towerX - 18, puckY - 6, 36, 12);

    // Золотой колокол на вершине башни (вибрирует и сияет при рекорде!)
    ctx.save();
    ctx.translate(towerX, towerTop + 8);
    if (bellRingTime > 0) {
      ctx.rotate(Math.sin(bellRingTime * 45) * 0.28);
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 18;
    }

    const bellGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 20);
    bellGrad.addColorStop(0, '#fff3b0');
    bellGrad.addColorStop(0.6, '#ffd166');
    bellGrad.addColorStop(1, '#b57c1e');

    ctx.beginPath();
    ctx.arc(0, 0, 17, Math.PI, 0, false);
    ctx.lineTo(21, 10);
    ctx.lineTo(-21, 10);
    ctx.closePath();
    ctx.fillStyle = bellGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3d2512';
    ctx.stroke();
    ctx.restore();

    // Подписи наград справа от башни
    ctx.font = 'bold 11px "8bitoperator", monospace, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('ГОНГ: +10 ЯИЦ', towerX + 34, towerTop + 14);
    ctx.fillStyle = '#2ec4b6';
    ctx.fillText('СЕРЕДИНА: +4', towerX + 34, towerTop + towerH * 0.45);
    ctx.fillStyle = '#cbb89d';
    ctx.fillText('НИЗ: 0', towerX + 34, towerBottom - 6);

    // 4. Искры от наковальни и колокола
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