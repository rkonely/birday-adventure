import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class CharityGame {
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
    if (document.getElementById('charity-ritual-styles')) return;
    const style = document.createElement('style');
    style.id = 'charity-ritual-styles';
    style.textContent = `
      .charity-ritual-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        width: 100%;
        max-width: 490px;
        margin: 2px auto;
        user-select: none;
      }
      .charity-memory-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 6px 14px;
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(34, 26, 20, 0.95), rgba(18, 13, 9, 0.98));
        border: 2px solid #7f8c8d;
        color: #e9dfd0;
        font-size: 13px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
      }
      .charity-altar-box {
        position: relative;
        width: 220px;
        height: 220px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .charity-canvas {
        width: 216px;
        height: 216px;
        border-radius: 50%;
        cursor: pointer;
        filter: drop-shadow(0 8px 20px rgba(0,0,0,0.7));
      }
      .charity-blessings-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        width: 100%;
        opacity: 0.45;
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .charity-blessings-row.unlocked {
        opacity: 1;
        pointer-events: auto;
      }
      .charity-blessing-card {
        background: linear-gradient(180deg, rgba(44, 33, 22, 0.95) 0%, rgba(24, 17, 11, 0.98) 100%);
        border: 2px solid #8c6d46;
        border-radius: 10px;
        padding: 8px 10px;
        color: #f4ece1;
        cursor: pointer;
        text-align: center;
        transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .charity-blessing-card:hover {
        transform: translateY(-2px);
        border-color: #2ec4b6;
        box-shadow: 0 6px 16px rgba(46, 196, 182, 0.3);
      }
      .charity-blessing-title {
        font-size: 13px;
        font-weight: bold;
        color: #ffd166;
        margin-bottom: 3px;
      }
      .charity-blessing-desc {
        font-size: 11px;
        color: #cbb89d;
        line-height: 1.3;
      }
    `;
    document.head.appendChild(style);
  }

  mount(evt, container, bottomBar) {
    this.destroy();

    const lost = this.eventManager.stats.lostEggsCount || 0;
    const baseRecompense = lost > 0 ? Math.min(24, Math.max(8, lost * 3)) : 10;
    const playerEggs = this.eventManager.stats.eggs || 0;

    const wrap = document.createElement('div');
    wrap.className = 'charity-ritual-wrap';
    wrap.innerHTML = `
      <div class="charity-memory-bar">
        <span>Память камня: потеряно ${lost} яиц</span>
        <span id="charity-step-hint" style="color:#2ec4b6;">Подношение: 0 / 2 яиц</span>
      </div>

      <div class="charity-altar-box">
        <canvas id="charity-altar-canvas" class="charity-canvas" width="220" height="220"></canvas>
      </div>

      <div id="charity-blessings-row" class="charity-blessings-row">
        <div id="btn-blessing-gold" class="charity-blessing-card">
          <div class="charity-blessing-title">Печать Возмездия</div>
          <div class="charity-blessing-desc">
            ${lost > 0 ? `Возврат потерь x3 (+${baseRecompense} яиц)` : 'Дар за чистый путь (+10 яиц)'}
          </div>
        </div>
        <div id="btn-blessing-ally" class="charity-blessing-card">
          <div class="charity-blessing-title">Печать Единства</div>
          <div class="charity-blessing-desc">
            Призвать случайную Обычную карту птицы в колоду
          </div>
        </div>
      </div>
    `;
    container.appendChild(wrap);

    const canvas = document.getElementById('charity-altar-canvas');
    const ctx = canvas.getContext('2d');
    const stepHintEl = document.getElementById('charity-step-hint');
    const blessingsRow = document.getElementById('charity-blessings-row');

    let offeredCount = 0; // 0, 1, 2
    let runeAngle = 0;
    let runeSpeed = 0.45;
    let glowIntensity = 0.15;
    let isFinished = false;

    // Летящие в чашу яйца и ударные волны
    const flyingEggs = [];
    const ripples = [];
    const particles = Array.from({ length: 18 }, (_, i) => ({
      angle: (i / 18) * Math.PI * 2,
      radius: 45 + Math.random() * 42,
      speed: 0.4 + Math.random() * 0.6,
      size: 1.5 + Math.random() * 2.2
    }));

    const tossEggIntoBowl = () => {
      if (isFinished || offeredCount >= 2) return;

      if (this.eventManager.stats.eggs < 1) {
        audio.playImpact();
        this.modal.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно припасов',
          effectTitle: 'Для обряда требуется 2 яйца',
          narrative: 'Чаша осталась пустой. Вы продолжили движение по тропе.'
        });
        return;
      }

      // Списываем 1 яйцо за каждый бросок в чашу
      this.eventManager.loseEggs(1, 'Дар Тотему', true);
      offeredCount++;
      audio.playClick();

      // Запускаем анимацию полёта яйца в центр алтаря
      const startAngle = offeredCount === 1 ? Math.PI * 0.75 : Math.PI * 0.25;
      flyingEggs.push({
        x: 110 + Math.cos(startAngle) * 95,
        y: 110 + Math.sin(startAngle) * 95,
        tx: 110 + (offeredCount === 1 ? -14 : 14),
        ty: 110,
        progress: 0
      });

      if (stepHintEl) {
        stepHintEl.textContent = `Подношение: ${offeredCount} / 2 яиц`;
      }

      if (offeredCount === 1 && mainBtnTxt) {
        mainBtnTxt.textContent = 'ВНЕСТИ ВТОРОЕ ЯЙЦО В ЧАШУ (1/2)';
      } else if (offeredCount === 2) {
        if (mainBtn) mainBtn.style.display = 'none';
        if (passBtn) passBtn.style.display = 'none';
        if (stepHintEl) {
          stepHintEl.textContent = 'Чаша пробудилась! Выберите благословение:';
          stepHintEl.style.color = '#ffd166';
        }
        setTimeout(() => {
          audio.playSuccess();
          runeSpeed = 2.6;
          glowIntensity = 0.85;
          if (blessingsRow) blessingsRow.classList.add('unlocked');
        }, 380);
      }
    };

    // Отрисовка каменной чаши, рун и энергии
    let lastTime = performance.now();
    const renderAltar = (now) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      runeAngle += runeSpeed * dt;
      ctx.clearRect(0, 0, 220, 220);

      const cx = 110;
      const cy = 110;

      // 1. Каменное основание монумента
      const stoneGrad = ctx.createRadialGradient(cx - 15, cy - 15, 12, cx, cy, 98);
      stoneGrad.addColorStop(0, '#59656f');
      stoneGrad.addColorStop(0.7, '#343d46');
      stoneGrad.addColorStop(1, '#1c2226');

      ctx.beginPath();
      ctx.arc(cx, cy, 96, 0, Math.PI * 2);
      ctx.fillStyle = stoneGrad;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = offeredCount >= 2 ? '#2ec4b6' : '#7f8c8d';
      ctx.stroke();

      // 2. Вращающееся рунное кольцо на ободе чаши
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(runeAngle);
      const runeCount = 8;
      const runeChars = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'];
      for (let i = 0; i < runeCount; i++) {
        const a = (i / runeCount) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.translate(0, -76);
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const isLit = (offeredCount === 1 && i < 4) || offeredCount >= 2;
        ctx.fillStyle = isLit ? '#a8fff7' : 'rgba(200, 214, 229, 0.3)';
        ctx.shadowColor = isLit ? '#2ec4b6' : 'transparent';
        ctx.shadowBlur = isLit ? 10 : 0;
        ctx.fillText(runeChars[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();

      // 3. Внутреннее углубление чаши со светящейся энергией
      const poolGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 56);
      if (offeredCount >= 2) {
        poolGrad.addColorStop(0, '#ffffff');
        poolGrad.addColorStop(0.35, '#2ec4b6');
        poolGrad.addColorStop(1, '#0b3b36');
      } else if (offeredCount === 1) {
        poolGrad.addColorStop(0, '#a8fff7');
        poolGrad.addColorStop(0.45, '#1b6ca8');
        poolGrad.addColorStop(1, '#142834');
      } else {
        poolGrad.addColorStop(0, '#2c3e50');
        poolGrad.addColorStop(1, '#11171d');
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 56, 0, Math.PI * 2);
      ctx.fillStyle = poolGrad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#222f3e';
      ctx.stroke();

      // 4. Кружащиеся частицы духа тотема
      particles.forEach(p => {
        p.angle += p.speed * dt * (1 + offeredCount * 1.4);
        const px = cx + Math.cos(p.angle) * (p.radius * (offeredCount >= 2 ? 0.75 : 1));
        const py = cy + Math.sin(p.angle) * (p.radius * (offeredCount >= 2 ? 0.75 : 1));
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = offeredCount >= 2 ? '#ffd166' : 'rgba(168, 255, 247, 0.55)';
        ctx.fill();
      });

      // 5. Волны от упавших яиц
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += dt * 75;
        rp.alpha -= dt * 1.4;
        if (rp.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = `rgba(168, 255, 247, ${rp.alpha.toFixed(2)})`;
        ctx.stroke();
      }

      // 6. Анимация падающих и лежащих в чаше яиц
      for (const egg of flyingEggs) {
        if (egg.progress < 1) {
          egg.progress = Math.min(1, egg.progress + dt * 3.2);
          if (egg.progress >= 1) {
            ripples.push({ x: egg.tx, y: egg.ty, r: 6, alpha: 1 });
            if (typeof audio.playDiceBounce === 'function') audio.playDiceBounce(0.5);
          }
        }
        const curX = egg.x + (egg.tx - egg.x) * egg.progress;
        const curY = egg.y + (egg.ty - egg.y) * egg.progress - Math.sin(egg.progress * Math.PI) * 32;
        const scale = 1.35 - egg.progress * 0.35;

        ctx.save();
        ctx.translate(curX, curY);
        ctx.scale(scale, scale);
        if (this.eggImg && this.eggImg.complete && this.eggImg.naturalWidth > 0) {
          ctx.drawImage(this.eggImg, -12, -14, 24, 28);
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#ffd166';
          ctx.fill();
        }
        ctx.restore();
      }

      // Подсказка в центре чаши, если ещё не бросили
      if (offeredCount < 2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = 'bold 11px "8bitoperator", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(offeredCount === 0 ? 'НАЖМИТЕ (2 ЯЙЦА)' : 'ЕЩЁ 1 ЯЙЦО...', cx, cy + 36);
      }

      this.rafId = requestAnimationFrame(renderAltar);
    };

    this.rafId = requestAnimationFrame(renderAltar);
    canvas.addEventListener('click', tossEggIntoBowl);

    // Обработчики выбора финального дара после пробуждения чаши
    document.getElementById('btn-blessing-gold').addEventListener('click', () => {
      if (isFinished || offeredCount < 2) return;
      isFinished = true;
      audio.playSuccess();

      const gained = this.eventManager.addEggs(baseRecompense, 'Возмещение Чаши');
      this.modal.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: lost > 0 ? `Возмещено потерь: ${lost} x 3` : 'Чистый путь без потерь',
        effectTitle: `Дар Тотема: +${gained} яиц!`,
        narrative: lost > 0
          ? 'Рунная чаша вспыхнула золотом и вернула утраченные в пути припасы в тройном размере!'
          : 'Вы ещё не теряли яиц на карте, поэтому тотем щедро одарил вас из собственного резерва.'
      });
    });

    document.getElementById('btn-blessing-ally').addEventListener('click', () => {
      if (isFinished || offeredCount < 2) return;
      isFinished = true;
      audio.playSuccess();

      const commonPool = [
        'carrier_pigeon',
        'brave_drake',
        'chef_chicken',
        'woodpecker_drill',
        'robin_gardener',
        'bodybuilder_sparrow'
      ];
      const pickedCard = commonPool[Math.floor(Math.random() * commonPool.length)];

      if (typeof this.modal.rewardCard === 'function') {
        this.modal.rewardCard(pickedCard, 'Союзник из Чаши Щедрости');
      } else {
        this.eventManager.addBoosterPacks(1);
        this.modal.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Печать Единства',
          effectTitle: 'Призван новый пернатый союзник в колоду!',
          narrative: 'Тотем услышал ваш призыв и направил бойца в вашу стаю.'
        });
      }
    });

    // Кнопки на нижней панели (Внести яйцо / Пройти мимо)
    let mainBtn = null;
    let mainBtnTxt = null;
    let passBtn = null;

    if (bottomBar) {
      bottomBar.innerHTML = '';

      mainBtn = document.createElement('button');
      mainBtn.className = 'btn-leaf-green btn-quest-main-btn';
      mainBtn.innerHTML = `<span id="charity-main-btn-txt" class="btn-leaf-green-text">${playerEggs >= 2 ? 'БРОСИТЬ ЯЙЦО В ЧАШУ (0/2)' : 'НЕДОСТАТОЧНО ЯИЦ (НУЖНО 2)'}</span>`;
      mainBtn.addEventListener('click', tossEggIntoBowl);
      bottomBar.appendChild(mainBtn);
      mainBtnTxt = document.getElementById('charity-main-btn-txt');

      passBtn = document.createElement('button');
      passBtn.className = 'btn-board-answer';
      passBtn.style.cssText = 'min-width:160px; margin-left:8px;';
      passBtn.innerHTML = '<span class="btn-board-answer-text">Пройти мимо</span>';
      passBtn.addEventListener('click', () => {
        if (isFinished) return;
        isFinished = true;
        // Если игрок бросил только 1 яйцо и передумал — возвращаем его обратно
        if (offeredCount === 1) {
          this.eventManager.addEggs(1, 'Возврат из чаши');
        }
        audio.playClick();
        this.modal.finishEvent();
      });
      bottomBar.appendChild(passBtn);
    }

    this.keyDownHandler = (e) => {
      if (e.code === 'Space' && !isFinished && offeredCount < 2) {
        e.preventDefault();
        tossEggIntoBowl();
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);
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