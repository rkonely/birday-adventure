import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class MysteryBoxesGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;

    this.rafId = null;
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
      dice: BOARD_ASSET_ICONS.DICE,
      bad: BOARD_ASSET_ICONS.TILE_BAD
    };
    Object.entries(map).forEach(([k, src]) => {
      const img = new Image();
      img.src = src;
      this.loadedIcons[k] = img;
    });
  }

  injectStyles() {
    if (document.getElementById('mystery-boxes-canvas-styles')) return;
    const style = document.createElement('style');
    style.id = 'mystery-boxes-canvas-styles';
    style.textContent = `
      .mbox-stage-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: 100%;
        max-width: 490px;
        margin: 2px auto;
        user-select: none;
      }
      .mbox-top-banner {
        padding: 6px 14px;
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(40, 28, 18, 0.95), rgba(22, 15, 9, 0.98));
        border: 2px solid #b58d5b;
        color: #ffd166;
        font-size: 13px;
        font-weight: bold;
        width: 100%;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
        transition: border-color 0.2s, transform 0.15s;
      }
      .mbox-canvas-frame {
        position: relative;
        width: 100%;
        border-radius: 12px;
        border: 3px solid #7c5832;
        background: radial-gradient(circle at 50% 35%, #2b1d28 0%, #140d13 100%);
        box-shadow: 0 10px 24px rgba(0,0,0,0.65), inset 0 0 24px rgba(0,0,0,0.85);
        overflow: hidden;
      }
      .mbox-canvas-el {
        display: block;
        width: 100%;
        height: 215px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  mount(evt, container, bottomBar) {
    this.destroy();
    if (bottomBar) bottomBar.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'mbox-stage-wrap';
    wrap.innerHTML = `
      <div id="mbox-status-banner" class="mbox-top-banner">
        Нажмите на один из четырёх ларцов Иллюзиониста (или клавиши A, B, C, D)!
      </div>
      <div class="mbox-canvas-frame">
        <canvas id="mbox-canvas" class="mbox-canvas-el" width="480" height="215"></canvas>
      </div>
    `;
    container.appendChild(wrap);

    const canvas = document.getElementById('mbox-canvas');
    const ctx = canvas.getContext('2d');
    const bannerEl = document.getElementById('mbox-status-banner');

    // 4 приза согласно балансу Ивенты-Описание.pdf
    const prizePool = [
      { type: 'glove',   title: 'ЛОВУШКА (-4)',  color: '#e63946', iconKey: 'bad',     isGood: false },
      { type: 'booster', title: '+1 БУСТЕР',     color: '#9b5de5', iconKey: 'booster', isGood: true },
      { type: 'reroll',  title: '+2 КУБИКА',     color: '#2ec4b6', iconKey: 'dice',    isGood: true },
      { type: 'golden',  title: '+10 ЯИЦ',       color: '#ffd166', iconKey: 'egg',     isGood: true }
    ].sort(() => Math.random() - 0.5);

    const LETTERS = ['A', 'B', 'C', 'D'];
    const chests = prizePool.map((prize, idx) => ({
      index: idx,
      letter: LETTERS[idx],
      x: 68 + idx * 114,
      baseY: 162,
      w: 78,
      h: 64,
      prize,
      state: 'closed', // 'closed' | 'shaking' | 'opened' | 'peek'
      shakeTime: 0,
      lidOpenProgress: 0,
      springBounce: 0,
      hoverScale: 1
    }));

    let hoveredIdx = -1;
    let selectedChest = null;
    let phase = 'choosing'; // 'choosing' | 'shaking' | 'revealed' | 'done'
    let animClock = 0;
    const particles = [];

    const spawnParticles = (x, y, color, count = 22) => {
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
        const speed = 65 + Math.random() * 150;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 4,
          color,
          life: 1.0
        });
      }
    };

    const pickChest = (idx) => {
      if (phase !== 'choosing') return;
      const chest = chests[idx];
      if (!chest) return;

      phase = 'shaking';
      selectedChest = chest;
      chest.state = 'shaking';
      chest.shakeTime = 0;
      audio.playClick();

      if (bannerEl) {
        bannerEl.textContent = `Ларец ${chest.letter} дрожит... Замки щёлкают!`;
        bannerEl.style.borderColor = '#ffd166';
      }
    };

    // Наведение и клик мышью по холсту
    canvas.addEventListener('mousemove', (e) => {
      if (phase !== 'choosing') {
        hoveredIdx = -1;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);

      hoveredIdx = -1;
      chests.forEach((c, i) => {
        if (mx >= c.x - c.w / 2 - 8 && mx <= c.x + c.w / 2 + 8 &&
            my >= c.baseY - c.h - 25 && my <= c.baseY + 15) {
          hoveredIdx = i;
        }
      });
    });

    canvas.addEventListener('mousedown', (e) => {
      if (phase !== 'choosing') return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);

      chests.forEach((c, i) => {
        if (mx >= c.x - c.w / 2 - 8 && mx <= c.x + c.w / 2 + 8 &&
            my >= c.baseY - c.h - 25 && my <= c.baseY + 15) {
          pickChest(i);
        }
      });
    });

    this.keyDownHandler = (e) => {
      if (phase !== 'choosing') return;
      const map = { KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
      if (map[e.code] !== undefined) {
        e.preventDefault();
        pickChest(map[e.code]);
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);

    let lastTime = performance.now();
    const updateAndDraw = (now) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;
      animClock += dt;

      // 1. Обновление состояний сундуков
      chests.forEach((c, i) => {
        const targetScale = (phase === 'choosing' && hoveredIdx === i) ? 1.07 : 1.0;
        c.hoverScale += (targetScale - c.hoverScale) * Math.min(1, dt * 14);

        if (c.state === 'shaking') {
          c.shakeTime += dt;
          // Периодический стук замка при тряске
          if (Math.floor(c.shakeTime * 14) !== Math.floor((c.shakeTime - dt) * 14)) {
            if (typeof audio.playDiceBounce === 'function') {
              audio.playDiceBounce(0.35);
            }
          }

          if (c.shakeTime >= 0.72) {
            c.state = 'opened';
            phase = 'revealed';

            if (c.prize.isGood) {
              audio.playSuccess();
            } else {
              audio.playImpact();
            }

            spawnParticles(c.x, c.baseY - c.h, c.prize.color, 28);

            if (bannerEl) {
              bannerEl.textContent = `В ларце ${c.letter}: ${c.prize.title}!`;
              bannerEl.style.borderColor = c.prize.isGood ? '#2ec4b6' : '#e63946';
              bannerEl.style.transform = 'scale(1.04)';
              setTimeout(() => {
                if (bannerEl) bannerEl.style.transform = 'scale(1)';
              }, 140);
            }

            // Через 420 мс приоткрываем остальные 3 ларца для наглядности
            setTimeout(() => {
              chests.forEach(other => {
                if (other !== c) other.state = 'peek';
              });
            }, 420);

            // Через 1.55 сек завершаем мини-игру и выдаём награду
            this.timerId = setTimeout(() => {
              phase = 'done';
              this.resolveBoxOutcome(c.prize);
            }, 1550);
          }
        } else if (c.state === 'opened' || c.state === 'peek') {
          c.lidOpenProgress = Math.min(1, c.lidOpenProgress + dt * 6.5);
          c.springBounce += dt * 11;
        }
      });

      // 2. Обновление частиц
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 290 * dt;
        p.life -= dt * 1.5;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // 3. Отрисовка сцены
      this.renderScene(ctx, chests, hoveredIdx, animClock, particles);

      if (phase !== 'done') {
        this.rafId = requestAnimationFrame(updateAndDraw);
      }
    };

    this.rafId = requestAnimationFrame(updateAndDraw);
  }

  renderScene(ctx, chests, hoveredIdx, animClock, particles) {
    ctx.clearRect(0, 0, 480, 215);

    // Полка / стол Иллюзиониста
    const shelfGrad = ctx.createLinearGradient(0, 155, 0, 215);
    shelfGrad.addColorStop(0, '#3a2418');
    shelfGrad.addColorStop(1, '#1a0f09');
    ctx.fillStyle = shelfGrad;
    ctx.fillRect(0, 158, 480, 57);

    ctx.beginPath();
    ctx.moveTo(0, 158);
    ctx.lineTo(480, 158);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8c6d46';
    ctx.stroke();

    // Отрисовка каждого из 4 ларцов
    chests.forEach((c, idx) => {
      ctx.save();

      let offsetX = 0;
      let offsetY = 0;
      let squashX = c.hoverScale;
      let squashY = c.hoverScale;

      if (c.state === 'closed' && hoveredIdx === idx) {
        offsetY = Math.sin(animClock * 9) * 3 - 4;
      } else if (c.state === 'shaking') {
        const intensity = (c.shakeTime / 0.72) * 6;
        offsetX = (Math.random() - 0.5) * intensity * 2;
        squashX = 1 + Math.sin(c.shakeTime * 38) * 0.08;
        squashY = 1 - Math.sin(c.shakeTime * 38) * 0.08;
      } else if (c.state === 'peek') {
        ctx.globalAlpha = 0.55;
      }

      ctx.translate(c.x + offsetX, c.baseY + offsetY);
      ctx.scale(squashX, squashY);

      // Тень под сундуком
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 4, c.w * 0.52, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Если ларец открыт — рисуем пружину и выскочивший приз внутри!
      if (c.state === 'opened' || c.state === 'peek') {
        const dampedWave = Math.sin(c.springBounce) * Math.exp(-c.springBounce * 0.22) * 14;
        const popHeight = c.lidOpenProgress * 64 + dampedWave;

        // Свечение изнутри ларца
        const glow = ctx.createRadialGradient(0, -c.h + 10, 4, 0, -c.h - 20, 48);
        glow.addColorStop(0, c.prize.color);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, -c.h, 48, 0, Math.PI * 2);
        ctx.fill();

        // Стальная витая пружина Jack-in-the-box
        ctx.beginPath();
        const springBaseY = -c.h + 18;
        const springTopY = -c.h - popHeight + 16;
        ctx.moveTo(0, springBaseY);
        const coils = 6;
        for (let k = 1; k <= coils; k++) {
          const sy = springBaseY + ((springTopY - springBaseY) * k) / coils;
          const sx = (k % 2 === 0 ? -9 : 9);
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(0, springTopY);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#adb5bd';
        ctx.stroke();

        // Сам предмет на верхушке пружины
        ctx.save();
        ctx.translate(0, springTopY - 12);

        // Круглый медальон вокруг приза
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 14, 10, 0.9)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = c.prize.color;
        ctx.stroke();

        const icon = this.loadedIcons[c.prize.iconKey];
        if (icon && icon.complete && icon.naturalWidth > 0) {
          ctx.drawImage(icon, -14, -14, 28, 28);
        }

        // Подпись приза над медальоном
        ctx.font = 'bold 11px "8bitoperator", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = c.prize.color;
        ctx.strokeText(c.prize.title, 0, -28);
        ctx.fillText(c.prize.title, 0, -28);

        ctx.restore();
      }

      // Корпус шкатулки
      const boxGrad = ctx.createLinearGradient(-c.w / 2, -c.h, c.w / 2, 0);
      boxGrad.addColorStop(0, '#5a3b7c');
      boxGrad.addColorStop(0.5, '#3c2557');
      boxGrad.addColorStop(1, '#241536');
      ctx.fillStyle = boxGrad;
      ctx.fillRect(-c.w / 2, -c.h + 16, c.w, c.h - 16);

      // Золотая окантовка корпуса
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = (hoveredIdx === idx && c.state === 'closed') ? '#ffd166' : '#c59b27';
      ctx.strokeRect(-c.w / 2, -c.h + 16, c.w, c.h - 16);

      // Вертикальная алая праздничная лента по центру
      ctx.fillStyle = '#d90429';
      ctx.fillRect(-7, -c.h + 16, 14, c.h - 16);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1;
      ctx.strokeRect(-7, -c.h + 16, 14, c.h - 16);

      // Крышка шкатулки (откидывается вверх и вбок при открытии)
      ctx.save();
      const lidLift = c.lidOpenProgress * 34;
      const lidTilt = -c.lidOpenProgress * 0.75;
      ctx.translate(-c.w / 2, -c.h + 16 - lidLift);
      ctx.rotate(lidTilt);

      ctx.fillStyle = '#7b52ab';
      ctx.fillRect(0, -16, c.w, 16);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffd166';
      ctx.strokeRect(0, -16, c.w, 16);

      // Золотой бант на крышке
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.ellipse(c.w / 2 - 8, -18, 8, 5, -0.3, 0, Math.PI * 2);
      ctx.ellipse(c.w / 2 + 8, -18, 8, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Буква ларца (A, B, C, D) на передней грани
      ctx.beginPath();
      ctx.arc(0, -c.h / 2 + 8, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#2b1808';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffd166';
      ctx.stroke();

      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 13px "8bitoperator", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.letter, 0, -c.h / 2 + 8.5);

      ctx.restore();
    });

    // Частицы салюта
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  resolveBoxOutcome(prize) {
    if (!prize) return;

    if (prize.type === 'glove') {
      const lost = this.eventManager.loseEggs(4, 'Пружинная ловушка');
      this.modal.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Коварный механизм',
        effectTitle: lost > 0 ? `Удар пружины: -${lost} яйца` : 'Защитный щит поглотил удар',
        narrative: 'Под крышкой сработала тугая пружина с боксёрской перчаткой.'
      });
    } else if (prize.type === 'booster') {
      this.eventManager.addBoosterPacks(1);
      this.modal.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Ценная находка',
        effectTitle: 'Арсенал пополнен: +1 Бустер карт',
        narrative: 'На бархатной подушечке внутри шкатулки лежал набор боевых карт.'
      });
    } else if (prize.type === 'reroll') {
      this.eventManager.addRerollDice(2);
      this.modal.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: 'Дар Иллюзиониста',
        effectTitle: 'Получено: +2 кубика переброса',
        narrative: 'Внутри ларца оказались две кости из резного костяного дерева.'
      });
    } else {
      const gained = this.eventManager.addEggs(10, 'Золотой запас');
      this.modal.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Главный приз',
        effectTitle: `Золотая кладка: +${gained} яиц`,
        narrative: 'Вы открыли самый богатый ларец из четырёх!'
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