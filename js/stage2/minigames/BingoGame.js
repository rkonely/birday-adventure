import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class BingoGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;

    this.rafId = null;
    this.timerId = null;
    this.keyDownHandler = null;
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('bingo-physics-styles')) return;
    const style = document.createElement('style');
    style.id = 'bingo-physics-styles';
    style.textContent = `
      .bingo-phys-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        width: 100%;
        max-width: 500px;
        margin: 2px auto;
        user-select: none;
      }
      .bingo-status-banner {
        padding: 6px 16px;
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(40, 28, 18, 0.95) 0%, rgba(22, 15, 9, 0.98) 100%);
        border: 2px solid #b58d5b;
        color: #ffd166;
        font-size: 14px;
        font-weight: bold;
        width: 100%;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
      }
      /* Сетка выбора билетов */
      .bingo-ticket-cards {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        width: 100%;
      }
      .bingo-card-option {
        background: linear-gradient(135deg, #f3e5ab 0%, #d4af37 100%);
        border: 2px solid #5c3a1d;
        border-radius: 10px;
        padding: 8px 12px;
        cursor: pointer;
        color: #2b1808;
        box-shadow: 0 5px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .bingo-card-option:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 8px 18px rgba(255, 209, 102, 0.4);
      }
      .bingo-card-header {
        font-size: 13px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px dashed rgba(43, 24, 8, 0.35);
        width: 100%;
        text-align: center;
        padding-bottom: 3px;
      }
      .bingo-card-nums {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
      .bingo-num-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #fffdf7;
        border: 2px solid #7c5832;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        color: #2b1808;
        transition: all 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.3);
      }
      .bingo-num-circle.matched {
        background: #2ec4b6;
        border-color: #fff;
        color: #fff;
        transform: scale(1.18);
        box-shadow: 0 0 12px #2ec4b6;
      }

      /* Сцена с барабаном и желобом */
      .bingo-machine-stage {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        width: 100%;
      }
      .bingo-drum-canvas {
        width: 210px;
        height: 210px;
        border-radius: 50%;
        filter: drop-shadow(0 8px 18px rgba(0,0,0,0.65));
      }
      .bingo-side-panel {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 195px;
      }
      .bingo-active-ticket {
        background: linear-gradient(135deg, #f3e5ab 0%, #c59b27 100%);
        border: 2px solid #4a2c11;
        border-radius: 10px;
        padding: 8px 10px;
        color: #2b1808;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }
      .bingo-chute-tray {
        background: rgba(24, 16, 10, 0.92);
        border: 2px solid #8c6d46;
        border-radius: 10px;
        padding: 8px 10px;
        color: #f4ece1;
      }
      .bingo-chute-title {
        font-size: 11px;
        text-transform: uppercase;
        color: #cbb89d;
        margin-bottom: 6px;
        text-align: center;
      }
      .bingo-chute-slots {
        display: flex;
        justify-content: center;
        gap: 8px;
        min-height: 38px;
      }
      .bingo-drawn-ball {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #ffffff, #ffd166 55%, #b57c1e 100%);
        border: 2px solid #3d2512;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        color: #1f1308;
        box-shadow: 0 4px 8px rgba(0,0,0,0.6);
        animation: ballRollOut 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.35);
      }
      .bingo-drawn-ball.hit {
        background: radial-gradient(circle at 30% 30%, #a8fff7, #2ec4b6 60%, #15615a 100%);
        border-color: #ffffff;
        color: #ffffff;
        box-shadow: 0 0 14px rgba(46, 196, 182, 0.85);
      }
      @keyframes ballRollOut {
        0% { transform: translateX(-28px) rotate(-180deg) scale(0.5); opacity: 0; }
        100% { transform: translateX(0) rotate(0deg) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  mount(evt, container, bottomBar) {
    this.destroy();
    if (bottomBar) bottomBar.innerHTML = '';

    // 4 классических билета из описания, у каждого 3 счастливых номера
    const tickets = [
      { id: 7,  title: 'Билет №7 «Три топора»',   nums: [7, 19, 31] },
      { id: 13, title: 'Билет №13 «Чёртова дюжина»', nums: [13, 25, 44] },
      { id: 21, title: 'Билет №21 «Очко удачи»',  nums: [21, 9, 38] },
      { id: 42, title: 'Билет №42 «Ответ Вселенной»', nums: [42, 15, 29] }
    ];

    const wrap = document.createElement('div');
    wrap.className = 'bingo-phys-wrap';
    wrap.innerHTML = `
      <div id="bingo-top-banner" class="bingo-status-banner">
        Выберите счастливый лотерейный билет для участия в тираже!
      </div>
      <div id="bingo-stage-area" style="width:100%;"></div>
    `;
    container.appendChild(wrap);

    const stageArea = document.getElementById('bingo-stage-area');
    const bannerEl = document.getElementById('bingo-top-banner');

    // Шаг 1: Выбор билета
    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'bingo-ticket-cards';

    tickets.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'bingo-card-option';
      card.innerHTML = `
        <div class="bingo-card-header">${t.title}</div>
        <div class="bingo-card-nums">
          ${t.nums.map(n => `<div class="bingo-num-circle">${n}</div>`).join('')}
        </div>
      `;
      card.addEventListener('click', () => {
        audio.playClick();
        this.startDrumStage(t, tickets, stageArea, bannerEl, bottomBar);
      });
      cardsGrid.appendChild(card);
    });

    stageArea.appendChild(cardsGrid);
  }

  startDrumStage(chosenTicket, allTickets, stageArea, bannerEl, bottomBar) {
    stageArea.innerHTML = `
      <div class="bingo-machine-stage">
        <canvas id="bingo-drum-canvas" class="bingo-drum-canvas" width="220" height="220"></canvas>
        <div class="bingo-side-panel">
          <div class="bingo-active-ticket">
            <div class="bingo-card-header" style="margin-bottom:6px;">${chosenTicket.title}</div>
            <div class="bingo-card-nums">
              ${chosenTicket.nums.map(n => `<div id="ticket-num-${n}" class="bingo-num-circle">${n}</div>`).join('')}
            </div>
          </div>
          <div class="bingo-chute-tray">
            <div class="bingo-chute-title">Выпавшие шары (3 шт.):</div>
            <div id="bingo-chute-slots" class="bingo-chute-slots"></div>
          </div>
        </div>
      </div>
    `;

    if (bannerEl) {
      bannerEl.textContent = 'Раскрутите золотой барабан, чтобы выкатить 3 призовых шара!';
    }

    const canvas = document.getElementById('bingo-drum-canvas');
    const ctx = canvas.getContext('2d');
    const chuteEl = document.getElementById('bingo-chute-slots');

    // Собираем все 12 чисел из билетов + 4 дополнительных для массовки в барабане (16 шаров)
    const poolNumbers = [];
    allTickets.forEach(t => t.nums.forEach(n => poolNumbers.push(n)));
    [3, 11, 27, 50].forEach(n => poolNumbers.push(n));

    const ballColors = ['#ffd166', '#2ec4b6', '#ff6b6b', '#f8961e', '#c792ea', '#90be6d'];
    const cx = 110;
    const cy = 110;
    const drumRadius = 92;

    // Создаём физические шары внутри барабана
    const balls = poolNumbers.map((num, i) => {
      const a = (i / poolNumbers.length) * Math.PI * 2;
      const dist = 20 + (i % 3) * 20;
      return {
        num,
        x: cx + Math.cos(a) * dist,
        y: cy + Math.sin(a) * dist,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        r: 13.5,
        color: ballColors[i % ballColors.length],
        isPicked: false
      };
    });

    let cageAngle = 0;
    let cageSpeed = 0.6; // Медленное холостое вращение до старта
    let isDrawing = false;
    let lastSoundTime = 0;

    // 4 внутренние лопасти барабана, которые подхватывают и перемешивают шары
    const numPaddles = 4;

    let lastTime = performance.now();
    const updatePhysics = (now) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;

      cageAngle += cageSpeed * dt;
      if (isDrawing && cageSpeed > 2.2) {
        cageSpeed *= 0.994;
      }

      const gravity = 460;

      // 1. Движение шаров и отскок от круглых стенок барабана
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.isPicked) continue;

        b.vy += gravity * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Столкновение со стенкой барабана + закрутка от вращения сетки
        const dx = b.x - cx;
        const dy = b.y - cy;
        const dist = Math.hypot(dx, dy);
        const maxDist = drumRadius - b.r;

        if (dist > maxDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = cx + nx * maxDist;
          b.y = cy + ny * maxDist;

          // Отражение скорости от стенки
          const dot = b.vx * nx + b.vy * ny;
          if (dot > 0) {
            b.vx -= 1.65 * dot * nx;
            b.vy -= 1.65 * dot * ny;
          }

          // Касательный импульс от вращающегося барабана и лопастей (подбрасывает шары вверх!)
          const tx = -ny;
          const ty = nx;
          const paddleBoost = isDrawing ? cageSpeed * 52 : cageSpeed * 22;
          b.vx += tx * paddleBoost + (Math.random() - 0.5) * 35;
          b.vy += ty * paddleBoost - (isDrawing ? Math.random() * 85 : 0);

          // Звук перестука шаров при быстром вращении
          if (isDrawing && Math.abs(dot) > 95 && now - lastSoundTime > 95) {
            lastSoundTime = now;
            if (typeof audio.playDiceBounce === 'function') {
              audio.playDiceBounce(Math.min(0.45, Math.abs(dot) / 400));
            }
          }
        }
      }

      // 2. Упругие столкновения шаров друг с другом
      for (let i = 0; i < balls.length; i++) {
        const b1 = balls[i];
        if (b1.isPicked) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b2 = balls[j];
          if (b2.isPicked) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.r + b2.r;

          if (dist > 0 && dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) * 0.5;

            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = kx * nx + ky * ny;
            if (p > 0) {
              b1.vx -= p * nx * 0.85;
              b1.vy -= p * ny * 0.85;
              b2.vx += p * nx * 0.85;
              b2.vy += p * ny * 0.85;
            }
          }
        }
      }

      // 3. Отрисовка золотого барабана и шаров
      ctx.clearRect(0, 0, 220, 220);

      // Задняя полусфера клетки
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, drumRadius, 0, Math.PI * 2);
      const bgGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, drumRadius);
      bgGrad.addColorStop(0, 'rgba(55, 38, 22, 0.75)');
      bgGrad.addColorStop(1, 'rgba(20, 12, 6, 0.92)');
      ctx.fillStyle = bgGrad;
      ctx.fill();

      // Вращающиеся прутья золотой сетки
      ctx.translate(cx, cy);
      ctx.rotate(cageAngle);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * -drumRadius, Math.sin(a) * -drumRadius);
        ctx.lineTo(Math.cos(a) * drumRadius, Math.sin(a) * drumRadius);
        ctx.stroke();
      }
      ctx.restore();

      // Отрисовка шаров
      for (const b of balls) {
        if (b.isPicked) continue;
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(b.x - 4, b.y - 4, 2, b.x, b.y, b.r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, b.color);
        g.addColorStop(1, '#5c3a1d');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#2b1808';
        ctx.stroke();

        ctx.fillStyle = '#1f1308';
        ctx.font = 'bold 11px "8bitoperator", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(b.num), b.x, b.y + 0.5);
        ctx.restore();
      }

      // Передний медный обод и лопасти барабана
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(cageAngle);

      for (let p = 0; p < numPaddles; p++) {
        const pa = (p / numPaddles) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(pa) * (drumRadius - 14), Math.sin(pa) * (drumRadius - 14));
        ctx.lineTo(Math.cos(pa) * drumRadius, Math.sin(pa) * drumRadius);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#ffd166';
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(0, 0, drumRadius, 0, Math.PI * 2);
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#c59b27';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd166';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3d2512';
      ctx.stroke();
      ctx.restore();

      this.rafId = requestAnimationFrame(updatePhysics);
    };

    this.rafId = requestAnimationFrame(updatePhysics);

    // Кнопка запуска вращения барабана
    if (!bottomBar) return;
    bottomBar.innerHTML = '';
    const spinBtn = document.createElement('button');
    spinBtn.className = 'btn-leaf-green btn-quest-main-btn';
    spinBtn.innerHTML = '<span id="bingo-spin-btn-txt" class="btn-leaf-green-text">КРУТИТЬ БАРАБАН (ПРОБЕЛ)</span>';
    bottomBar.appendChild(spinBtn);

    const startDrawSequence = () => {
      if (isDrawing) return;
      isDrawing = true;
      spinBtn.disabled = true;
      const btnTxt = document.getElementById('bingo-spin-btn-txt');
      if (btnTxt) btnTxt.textContent = 'ШАРЫ ПЕРЕМЕШИВАЮТСЯ...';
      audio.playClick();

      // Резко раскручиваем барабан и подбрасываем шары!
      cageSpeed = 9.2;
      balls.forEach(b => {
        b.vx += (Math.random() - 0.5) * 280;
        b.vy -= 180 + Math.random() * 220;
      });

      // Определяем исход тиража с честным азартом (0, 1, 2 или все 3 совпадения)
      const roll = Math.random();
      let targetMatches = 0;
      if (roll < 0.16) targetMatches = 3;      // 16% — Джекпот 3 из 3
      else if (roll < 0.52) targetMatches = 2; // 36% — Крупный приз 2 из 3 (+24 яйца)
      else if (roll < 0.82) targetMatches = 1; // 30% — Малый приз 1 из 3 (+10 яиц)
      else targetMatches = 0;                  // 18% — Утешительный приз (+1 кубик)

      const ticketNums = [...chosenTicket.nums].sort(() => Math.random() - 0.5);
      const nonTicketBalls = balls.filter(b => !chosenTicket.nums.includes(b.num)).sort(() => Math.random() - 0.5);

      const drawnNumbers = [];
      for (let i = 0; i < targetMatches; i++) {
        drawnNumbers.push(ticketNums[i]);
      }
      while (drawnNumbers.length < 3) {
        const nextMiss = nonTicketBalls.pop();
        if (nextMiss) drawnNumbers.push(nextMiss.num);
      }
      drawnNumbers.sort(() => Math.random() - 0.5);

      let matchesCount = 0;

      // Поочерёдно выкатываем 3 шара из барабана с интервалом 1.15 сек
      drawnNumbers.forEach((drawnNum, stepIdx) => {
        setTimeout(() => {
          const ballObj = balls.find(b => b.num === drawnNum);
          if (ballObj) ballObj.isPicked = true;

          const isMatch = chosenTicket.nums.includes(drawnNum);
          if (isMatch) {
            matchesCount++;
            audio.playSuccess();
            const circleOnCard = document.getElementById(`ticket-num-${drawnNum}`);
            if (circleOnCard) circleOnCard.classList.add('matched');
          } else {
            audio.playClick();
          }

          // Добавляем шар в лоток выдачи
          const ballEl = document.createElement('div');
          ballEl.className = `bingo-drawn-ball ${isMatch ? 'hit' : ''}`;
          ballEl.textContent = String(drawnNum);
          if (chuteEl) chuteEl.appendChild(ballEl);

          if (bannerEl) {
            bannerEl.textContent = isMatch
              ? `Шар №${drawnNum} — СОВПАДЕНИЕ В БИЛЕТЕ (${matchesCount}/3)!`
              : `Шар №${drawnNum} — мимо билета...`;
          }

          // После 3-го шара подводим итог тиража
          if (stepIdx === 2) {
            cageSpeed = 0.8;
            this.timerId = setTimeout(() => {
              this.finishBingo(matchesCount, chosenTicket, drawnNumbers);
            }, 950);
          }
        }, 1150 * (stepIdx + 1));
      });
    };

    spinBtn.addEventListener('click', startDrawSequence);
    canvas.addEventListener('click', startDrawSequence);

    this.keyDownHandler = (e) => {
      if (e.code === 'Space' && !isDrawing) {
        e.preventDefault();
        startDrawSequence();
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);
  }

  finishBingo(matchesCount, chosenTicket, drawnNumbers) {
    const drawnStr = drawnNumbers.join(', ');

    if (matchesCount >= 3) {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(30, 'Супер-Бинго 3 из 3');
      this.eventManager.addBoosterPacks(1);
      this.modal.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: `ПОЛНОЕ БИНГО (3 из 3)! Шары: ${drawnStr}`,
        effectTitle: `СУПЕР-ПРИЗ: +${gained} яиц и +1 Бустер карт!`,
        narrative: `Все три номера вашего билета №${chosenTicket.id} совпали с барабаном!`
      });
    } else if (matchesCount === 2) {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(24, 'Победа в Бинго');
      this.modal.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: `Два совпадения из трёх! Шары: ${drawnStr}`,
        effectTitle: `Счастливый билет: +${gained} яйца!`,
        narrative: 'Отличный тираж! Два шара из лототрона принесли крупный выигрыш.'
      });
    } else if (matchesCount === 1) {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(10, 'Малое Бинго');
      this.modal.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: `Одно совпадение! Шары: ${drawnStr}`,
        effectTitle: `Малый выигрыш: +${gained} яиц`,
        narrative: 'Один из ваших номеров оказался победным в этом розыгрыше.'
      });
    } else {
      audio.playImpact();
      this.eventManager.addRerollDice(1);
      this.modal.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: `Выпали шары: ${drawnStr}`,
        effectTitle: 'Утешительный жетон: +1 кубик переброса',
        narrative: `Номера билета №${chosenTicket.id} не выпали, но крупье вручил вам запасную кость.`
      });
    }
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
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