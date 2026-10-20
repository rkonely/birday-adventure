import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class ThimblesGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;

    this.rafId = null;
    this.timerId = null;
    this.keyDownHandler = null;

    this.eggImg = new Image();
    this.eggImg.src = BOARD_ASSET_ICONS.EGG;
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('thimbles-canvas-styles')) return;
    const style = document.createElement('style');
    style.id = 'thimbles-canvas-styles';
    style.textContent = `
      .thimbles-stage-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: 100%;
        max-width: 480px;
        margin: 2px auto;
        user-select: none;
      }
      .thimbles-top-banner {
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
      .thimbles-canvas-frame {
        position: relative;
        width: 100%;
        border-radius: 12px;
        border: 3px solid #7c5832;
        background: radial-gradient(circle at 50% 35%, #2a3d28 0%, #141f13 100%);
        box-shadow: 0 10px 24px rgba(0,0,0,0.65), inset 0 0 22px rgba(0,0,0,0.85);
        overflow: hidden;
      }
      .thimbles-canvas-el {
        display: block;
        width: 100%;
        height: 210px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  mount(evt, container, bottomBar) {
    this.destroy();

    const wrap = document.createElement('div');
    wrap.className = 'thimbles-stage-wrap';
    wrap.innerHTML = `
      <div id="thimbles-status-banner" class="thimbles-top-banner">
        Запомните скорлупку с золотым яйцом и нажмите «ПЕРЕМЕШАТЬ»!
      </div>
      <div class="thimbles-canvas-frame">
        <canvas id="thimbles-canvas" class="thimbles-canvas-el" width="470" height="210"></canvas>
      </div>
    `;
    container.appendChild(wrap);

    const canvas = document.getElementById('thimbles-canvas');
    const ctx = canvas.getContext('2d');
    const bannerEl = document.getElementById('thimbles-status-banner');

    // Координаты трёх слотов на столе (Левый, Средний, Правый)
    const slotPositions = [105, 235, 365];
    const baseY = 148;

    // Выбираем скорлупку, под которой изначально прячется яйцо
    const winningShellId = Math.floor(Math.random() * 3);

    const shells = [0, 1, 2].map((id) => ({
      id,
      slotIndex: id,       // Текущий слот (0 = левый, 1 = средний, 2 = правый)
      x: slotPositions[id],
      y: baseY,
      zScale: 1.0,         // Масштаб перспективы при обходе спереди/сзади
      liftY: id === winningShellId ? 54 : 0, // В начале приподнимаем скорлупку с яйцом!
      targetLiftY: id === winningShellId ? 54 : 0,
      hasEgg: id === winningShellId
    }));

    // Фазы: 'preview' -> 'lowering' -> 'shuffling' -> 'guessing' -> 'revealing' -> 'done'
    let state = 'preview';
    let hoveredSlot = -1;
    let animClock = 0;

    // Параметры анимации текущего обмена двух скорлупок
    let swapQueue = [];
    let activeSwap = null;
    let pickedSlotIndex = -1;

    // Подготовка кнопки старта перемешивания
    let startBtn = null;
    if (bottomBar) {
      bottomBar.innerHTML = '';
      startBtn = document.createElement('button');
      startBtn.className = 'btn-leaf-green btn-quest-main-btn';
      startBtn.innerHTML = '<span id="thimbles-btn-txt" class="btn-leaf-green-text">ПЕРЕМЕШАТЬ СКОРЛУПКИ (ПРОБЕЛ)</span>';
      bottomBar.appendChild(startBtn);
    }

    const startShuffling = () => {
      if (state !== 'preview') return;
      state = 'lowering';
      audio.playClick();
      if (startBtn) startBtn.style.display = 'none';

      // Опускаем скорлупку на яйцо
      shells.forEach(s => {
        s.targetLiftY = 0;
      });

      if (bannerEl) {
        bannerEl.textContent = 'Следите внимательно за перемещением скорлупок!';
        bannerEl.style.borderColor = '#2ec4b6';
      }

      // Генерируем очередь из 8 обменов с постепенным ускорением
      swapQueue = [];
      let prevPairKey = '';
      for (let step = 0; step < 8; step++) {
        const pairs = [
          [0, 1],
          [1, 2],
          [0, 2]
        ].filter(p => p.join('-') !== prevPairKey);
        const chosenPair = pairs[Math.floor(Math.random() * pairs.length)];
        prevPairKey = chosenPair.join('-');

        // Длительность одного обмена уменьшается от 0.36 с до 0.21 с
        const duration = Math.max(0.21, 0.36 - step * 0.02);
        swapQueue.push({
          slotA: chosenPair[0],
          slotB: chosenPair[1],
          duration
        });
      }

      // Небольшая пауза, пока скорлупка накроет яйцо, затем старт перемешивания
      this.timerId = setTimeout(() => {
        if (typeof audio.playDiceBounce === 'function') audio.playDiceBounce(0.5);
        state = 'shuffling';
        launchNextSwap();
      }, 420);
    };

    const launchNextSwap = () => {
      if (swapQueue.length === 0) {
        activeSwap = null;
        state = 'guessing';
        if (bannerEl) {
          bannerEl.textContent = 'Где золотое яйцо? Нажмите на скорлупку A, B или C!';
          bannerEl.style.borderColor = '#ffd166';
        }
        return;
      }

      const next = swapQueue.shift();
      const shellA = shells.find(s => s.slotIndex === next.slotA);
      const shellB = shells.find(s => s.slotIndex === next.slotB);

      if (typeof audio.playDiceBounce === 'function') {
        audio.playDiceBounce(0.35);
      }

      activeSwap = {
        shellA,
        shellB,
        startX_A: slotPositions[next.slotA],
        startX_B: slotPositions[next.slotB],
        slotA: next.slotA,
        slotB: next.slotB,
        duration: next.duration,
        elapsed: 0
      };
    };

    const selectSlot = (slotIdx) => {
      if (state !== 'guessing') return;
      state = 'revealing';
      pickedSlotIndex = slotIdx;
      hoveredSlot = -1;
      audio.playClick();

      const chosenShell = shells.find(s => s.slotIndex === slotIdx);
      if (chosenShell) {
        chosenShell.targetLiftY = 62;
      }

      const isWin = Boolean(chosenShell && chosenShell.hasEgg);

      if (isWin) {
        audio.playSuccess();
        if (bannerEl) {
          bannerEl.textContent = 'Блестяще! Золотое яйцо найдено!';
          bannerEl.style.borderColor = '#2ec4b6';
        }
      } else {
        audio.playImpact();
        if (bannerEl) {
          bannerEl.textContent = 'Пусто! Смотрите, под какой скорлупкой было яйцо...';
          bannerEl.style.borderColor = '#ff6b6b';
        }
        // Через 450 мс приподнимаем настоящую победную скорлупку
        setTimeout(() => {
          const realShell = shells.find(s => s.hasEgg);
          if (realShell) realShell.targetLiftY = 54;
        }, 450);
      }

      this.timerId = setTimeout(() => {
        state = 'done';
        if (isWin) {
          const gained = this.eventManager.addEggs(8, 'Игра в скорлупки');
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Безупречная внимательность',
            effectTitle: `Выигрыш: +${gained} яиц`,
            narrative: 'Под выбранной ореховой скорлупкой действительно оказалось золочёное яйцо.'
          });
        } else {
          this.eventManager.addRerollDice(1);
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.DICE,
            label: 'Поощрение за партию',
            effectTitle: 'Получено: +1 кубик переброса',
            narrative: 'Золотое яйцо оказалось под соседней скорлупкой, но бурундук подарил вам счастливую кость за игру.'
          });
        }
      }, 1350);
    };

    if (startBtn) {
      startBtn.addEventListener('click', startShuffling);
    }

    // Обработка наведения и клика по скорлупкам
    canvas.addEventListener('mousemove', (e) => {
      if (state !== 'guessing') {
        hoveredSlot = -1;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);

      hoveredSlot = -1;
      slotPositions.forEach((sx, idx) => {
        if (Math.abs(mx - sx) <= 48 && my >= 65 && my <= 175) {
          hoveredSlot = idx;
        }
      });
    });

    canvas.addEventListener('mousedown', (e) => {
      if (state === 'preview') {
        startShuffling();
        return;
      }
      if (state !== 'guessing') return;

      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);

      slotPositions.forEach((sx, idx) => {
        if (Math.abs(mx - sx) <= 48 && my >= 65 && my <= 175) {
          selectSlot(idx);
        }
      });
    });

    this.keyDownHandler = (e) => {
      if (state === 'preview' && e.code === 'Space') {
        e.preventDefault();
        startShuffling();
      } else if (state === 'guessing') {
        const keyMap = { KeyA: 0, KeyB: 1, KeyC: 2, Digit1: 0, Digit2: 1, Digit3: 2 };
        if (keyMap[e.code] !== undefined) {
          e.preventDefault();
          selectSlot(keyMap[e.code]);
        }
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);

    // Главный цикл анимации и отрисовки
    let lastTime = performance.now();
    const updateAndDraw = (now) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;
      animClock += dt;

      // 1. Плавный подъём/опускание скорлупок
      shells.forEach((s) => {
        s.liftY += (s.targetLiftY - s.liftY) * Math.min(1, dt * 12);
      });

      // 2. Анимация дугового обмена скорлупок при перемешивании
      if (state === 'shuffling' && activeSwap) {
        activeSwap.elapsed += dt;
        const t = Math.min(1, activeSwap.elapsed / activeSwap.duration);
        // Плавная кривая ускорения-торможения (Smoothstep)
        const ease = t * t * (3 - 2 * t);
        const arcWave = Math.sin(t * Math.PI);

        const { shellA, shellB, startX_A, startX_B } = activeSwap;
        shellA.x = startX_A + (startX_B - startX_A) * ease;
        shellB.x = startX_B + (startX_A - startX_B) * ease;

        // Первая скорлупка проходит по передней дуге (ближе к зрителю), вторая — по задней
        shellA.y = baseY + arcWave * 24;
        shellB.y = baseY - arcWave * 24;
        shellA.zScale = 1 + arcWave * 0.12;
        shellB.zScale = 1 - arcWave * 0.1;

        if (t >= 1) {
          shellA.slotIndex = activeSwap.slotB;
          shellB.slotIndex = activeSwap.slotA;
          shellA.x = startX_B;
          shellB.x = startX_A;
          shellA.y = baseY;
          shellB.y = baseY;
          shellA.zScale = 1;
          shellB.zScale = 1;
          launchNextSwap();
        }
      }

      // 3. Отрисовка сцены
      this.renderTable(ctx, shells, slotPositions, baseY, state, hoveredSlot, pickedSlotIndex, animClock);

      if (state !== 'done') {
        this.rafId = requestAnimationFrame(updateAndDraw);
      }
    };

    this.rafId = requestAnimationFrame(updateAndDraw);
  }

  renderTable(ctx, shells, slotPositions, baseY, state, hoveredSlot, pickedSlotIndex, animClock) {
    ctx.clearRect(0, 0, 470, 210);

    // 1. Деревянная столешница с зелёным сукном
    const tableGrad = ctx.createLinearGradient(0, 120, 0, 210);
    tableGrad.addColorStop(0, '#3d2817');
    tableGrad.addColorStop(1, '#1e1209');
    ctx.fillStyle = tableGrad;
    ctx.fillRect(0, 126, 470, 84);

    ctx.beginPath();
    ctx.moveTo(0, 126);
    ctx.lineTo(470, 126);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#9c7a4c';
    ctx.stroke();

    // 2. Отрисовка золотого яйца под приподнятой скорлупкой (в начале и в финале)
    shells.forEach((s) => {
      if (s.hasEgg && s.liftY > 6) {
        const eggX = s.x;
        const eggY = s.y - 10;

        ctx.save();
        // Золотое свечение вокруг яйца
        const glow = ctx.createRadialGradient(eggX, eggY, 2, eggX, eggY, 30);
        glow.addColorStop(0, 'rgba(255, 209, 102, 0.75)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(eggX, eggY, 30, 0, Math.PI * 2);
        ctx.fill();

        if (this.eggImg && this.eggImg.complete && this.eggImg.naturalWidth > 0) {
          ctx.drawImage(this.eggImg, eggX - 16, eggY - 18, 32, 36);
        } else {
          ctx.beginPath();
          ctx.ellipse(eggX, eggY, 12, 16, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#ffd166';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    // 3. Сортируем скорлупки по Y (чтобы передняя скорлупка при обмене перекрывала заднюю)
    const sortedShells = [...shells].sort((a, b) => a.y - b.y);
    const LETTERS = ['A', 'B', 'C'];

    sortedShells.forEach((s) => {
      const isHovered = state === 'guessing' && hoveredSlot === s.slotIndex;
      const hoverLift = isHovered ? Math.sin(animClock * 10) * 3 + 6 : 0;
      const drawX = s.x;
      const drawY = s.y - s.liftY - hoverLift;

      ctx.save();

      // Тень на столе (остаётся на уровне стола и бледнеет при подъёме скорлупки)
      const shadowScale = Math.max(0.55, 1 - (s.liftY + hoverLift) / 130) * s.zScale;
      ctx.fillStyle = `rgba(0, 0, 0, ${(0.5 * shadowScale).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(drawX, s.y + 6, 42 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Переходим к центру самой скорлупки
      ctx.translate(drawX, drawY);
      ctx.scale(s.zScale, s.zScale);

      // Купол ореховой скорлупки
      ctx.beginPath();
      ctx.arc(0, 0, 40, Math.PI, 0, false);
      ctx.bezierCurveTo(42, 10, -42, 10, -40, 0);
      ctx.closePath();

      const shellGrad = ctx.createRadialGradient(-12, -22, 5, 0, -10, 44);
      shellGrad.addColorStop(0, '#c68b59');
      shellGrad.addColorStop(0.55, '#8c5327');
      shellGrad.addColorStop(1, '#4a2810');
      ctx.fillStyle = shellGrad;
      ctx.fill();

      ctx.lineWidth = 2.8;
      ctx.strokeStyle = isHovered ? '#ffd166' : '#2b1606';
      ctx.stroke();

      // Рельефные бороздки ореховой скорлупы
      ctx.beginPath();
      ctx.arc(0, 2, 26, Math.PI * 1.12, Math.PI * 1.88);
      ctx.moveTo(0, -39);
      ctx.lineTo(0, 2);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(43, 22, 6, 0.55)';
      ctx.stroke();

      // Нижний золотистый ободок скорлупки
      ctx.beginPath();
      ctx.ellipse(0, 1, 40, 6, 0, 0, Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = isHovered ? '#2ec4b6' : '#d4a359';
      ctx.stroke();

      // Буквы выбора (A, B, C) в фазе угадывания
      if (state === 'guessing' || state === 'revealing') {
        const letter = LETTERS[s.slotIndex] || '';
        const isPicked = pickedSlotIndex === s.slotIndex;

        ctx.beginPath();
        ctx.arc(0, -18, 13, 0, Math.PI * 2);
        ctx.fillStyle = isPicked ? '#2ec4b6' : (isHovered ? '#ffd166' : '#2b1808');
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffd166';
        ctx.stroke();

        ctx.fillStyle = (isPicked || isHovered) ? '#1f1308' : '#ffd166';
        ctx.font = 'bold 13px "8bitoperator", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, 0, -17.5);
      }

      ctx.restore();
    });
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