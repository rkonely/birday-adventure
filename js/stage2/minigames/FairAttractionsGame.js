import { audio } from '../../core/AudioManager.js';
import { BOARD_ASSET_ICONS } from '../boardEventsData.js';

export class FairAttractionsGame {
  constructor(modal) {
    this.modal = modal;
    this.eventManager = modal.eventManager;

    this.rafId = null;
    this.timerId = null;
    this.keyHandler = null;
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('fair-attractions-styles')) return;
    const style = document.createElement('style');
    style.id = 'fair-attractions-styles';
    style.textContent = `
      .fair-game-stage {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        width: 100%;
        max-width: 480px;
        margin: 4px auto;
        padding: 12px 16px;
        background: linear-gradient(180deg, rgba(36, 25, 16, 0.95) 0%, rgba(20, 13, 8, 0.98) 100%);
        border: 2px solid #9c7a4c;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,160,0.2);
        color: #f5ebd6;
        user-select: none;
      }
      .fair-hud-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        font-size: 13px;
        font-weight: bold;
        color: #ffd166;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 209, 102, 0.2);
      }
      .fair-status-hint {
        font-size: 13px;
        color: #e2d1b5;
        min-height: 20px;
        text-align: center;
      }

      /* 1. Стили для Дартса */
      .darts-arena {
        position: relative;
        width: 210px;
        height: 210px;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          #e63946 0% 13%,
          #ffd166 13% 15%,
          #1d3557 15% 38%,
          #f1faee 38% 40%,
          #e63946 40% 65%,
          #2a9d8f 65% 92%,
          #2b1d0e 92% 100%
        );
        border: 5px solid #6b4c2b;
        box-shadow: 0 6px 18px rgba(0,0,0,0.7), inset 0 0 15px rgba(0,0,0,0.5);
        overflow: hidden;
        cursor: crosshair;
      }
      .darts-balloon {
        position: absolute;
        width: 26px;
        height: 32px;
        border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
        box-shadow: inset -4px -4px 6px rgba(0,0,0,0.35), 0 3px 6px rgba(0,0,0,0.5);
        transition: transform 0.18s ease-out, opacity 0.18s;
      }
      .darts-balloon::after {
        content: '';
        position: absolute;
        bottom: -7px;
        left: 50%;
        width: 2px;
        height: 8px;
        background: rgba(255,255,255,0.6);
        transform: translateX(-50%);
      }
      .darts-reticle {
        position: absolute;
        width: 26px;
        height: 26px;
        border: 2px solid #00f5d4;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 0 10px rgba(0, 245, 212, 0.8);
        z-index: 4;
      }
      .darts-reticle::before, .darts-reticle::after {
        content: '';
        position: absolute;
        background: #00f5d4;
      }
      .darts-reticle::before {
        left: 50%; top: -5px; bottom: -5px; width: 2px; transform: translateX(-50%);
      }
      .darts-reticle::after {
        top: 50%; left: -5px; right: -5px; height: 2px; transform: translateY(-50%);
      }
      .dart-stuck-pin {
        position: absolute;
        width: 10px;
        height: 10px;
        background: radial-gradient(circle, #fff 20%, #ffd166 70%, #8c5811 100%);
        border: 2px solid #1a1108;
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(1);
        box-shadow: 2px 4px 5px rgba(0,0,0,0.8);
        animation: dartHitAnim 0.18s cubic-bezier(0.18, 0.89, 0.32, 1.4);
        z-index: 3;
      }
      @keyframes dartHitAnim {
        0% { transform: translate(-50%, -50%) scale(2.4); opacity: 0.4; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }

      /* 2. Стили для Утиной Рыбалки */
      .pond-basin {
        position: relative;
        width: 100%;
        height: 120px;
        background: radial-gradient(ellipse at center, #217696 0%, #103c52 75%, #3d2814 78%, #593a1d 100%);
        border-radius: 60px;
        border: 5px solid #754f29;
        box-shadow: inset 0 6px 16px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.5);
        overflow: hidden;
      }
      .pond-duck {
        position: absolute;
        width: 38px;
        height: 30px;
        background: #ffd166;
        border: 2px solid #593a1d;
        border-radius: 50% 60% 45% 45%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        color: #3d2610;
        box-shadow: 0 4px 6px rgba(0,0,0,0.4);
      }
      .pond-duck::after {
        content: '';
        position: absolute;
        right: -6px;
        top: 6px;
        width: 8px;
        height: 6px;
        background: #f77f00;
        border-radius: 2px 6px 6px 2px;
      }
      .pond-hook-target {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 44px;
        height: 44px;
        border: 2px dashed rgba(168, 255, 247, 0.75);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: inset 0 0 10px rgba(46, 196, 182, 0.35);
      }
      .pond-hook-target.biting {
        border-color: #ffd166;
        background: rgba(255, 209, 102, 0.25);
        transform: translate(-50%, -50%) scale(1.15);
      }

      /* 3. Стили для Кольцеброса */
      .ringtoss-field {
        position: relative;
        width: 100%;
        height: 115px;
        background: linear-gradient(180deg, #1b2d20 0%, #2f4a34 100%);
        border: 3px solid #6b4c2b;
        border-radius: 10px;
        overflow: hidden;
      }
      .ring-peg {
        position: absolute;
        bottom: 18px;
        width: 12px;
        border-radius: 6px 6px 2px 2px;
        transform: translateX(-50%);
        box-shadow: 0 4px 8px rgba(0,0,0,0.5);
      }
      .ring-peg-label {
        position: absolute;
        bottom: 2px;
        transform: translateX(-50%);
        font-size: 11px;
        font-weight: bold;
      }
      .thrown-ring {
        position: absolute;
        width: 34px;
        height: 14px;
        border: 4px solid #ffd166;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: all 0.45s cubic-bezier(0.2, 0.85, 0.35, 1.2);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  mount(evt, container, bottomBar) {
    this.destroy();

    const type = evt?.type || '';
    const id = evt?.id || '';

    // Маршрутизация на нужный интерактивный аттракцион
    if (type.includes('fishing') || id.includes('fishing')) {
      this.mountDuckFishing(evt, container, bottomBar);
    } else if (type.includes('ringtoss') || id.includes('ring_toss')) {
      this.mountRingToss(evt, container, bottomBar);
    } else {
      // По умолчанию запускаем Дартс («Перекрестие прицела»)
      this.mountDarts(evt, container, bottomBar);
    }
  }

  /* ==========================================================================
     1. МИНИ-ИГРА: ДАРТС «ПЕРЕКРЕСТИЕ ПРИЦЕЛА»
     ========================================================================== */
  mountDarts(evt, container, bottomBar) {
    const stage = document.createElement('div');
    stage.className = 'fair-game-stage';
    stage.innerHTML = `
      <div class="fair-hud-bar">
        <span id="fair-darts-left">Дротиков: 3</span>
        <span id="fair-darts-score">Очки: 0 / 20</span>
      </div>
      <div id="fair-darts-board" class="darts-arena">
        <div id="fair-balloon-0" class="darts-balloon" style="left:16px; top:22px; background:#ffd166;"></div>
        <div id="fair-balloon-1" class="darts-balloon" style="right:16px; top:26px; background:#2ec4b6;"></div>
        <div id="fair-balloon-2" class="darts-balloon" style="left:22px; bottom:20px; background:#ff6b6b;"></div>
        <div id="fair-darts-reticle" class="darts-reticle"></div>
      </div>
      <div id="fair-darts-hint" class="fair-status-hint">
        Жмите ПРОБЕЛ или кликайте по мишени, когда прицел в яблочке или на шарике!
      </div>
    `;
    container.appendChild(stage);

    const boardEl = document.getElementById('fair-darts-board');
    const reticleEl = document.getElementById('fair-darts-reticle');
    const leftEl = document.getElementById('fair-darts-left');
    const scoreEl = document.getElementById('fair-darts-score');
    const hintEl = document.getElementById('fair-darts-hint');

    const balloons = [
      { el: document.getElementById('fair-balloon-0'), x: 29, y: 38, popped: false },
      { el: document.getElementById('fair-balloon-1'), x: 181, y: 42, popped: false },
      { el: document.getElementById('fair-balloon-2'), x: 35, y: 174, popped: false }
    ];

    let dartsLeft = 3;
    let totalScore = 0;
    let bonusDice = 0;
    let phase = Math.random() * 10;
    let speedMult = 1.0;
    let active = true;
    let rx = 105;
    let ry = 105;

    const animate = () => {
      if (!active) return;
      phase += 0.034 * speedMult;
      rx = 105 + Math.sin(phase * 1.7) * 82;
      ry = 105 + Math.sin(phase * 2.4) * 82;
      if (reticleEl) {
        reticleEl.style.left = `${rx}px`;
        reticleEl.style.top = `${ry}px`;
      }
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);

    const throwDart = () => {
      if (!active || dartsLeft <= 0) return;
      dartsLeft--;
      speedMult += 0.25; // Каждый следующий дротик чуть быстрее!

      // Рисуем воткнувшийся дротик
      const pin = document.createElement('div');
      pin.className = 'dart-stuck-pin';
      pin.style.left = `${rx}px`;
      pin.style.top = `${ry}px`;
      boardEl.appendChild(pin);

      // Проверяем попадание в воздушный шарик
      let hitBalloon = false;
      for (const b of balloons) {
        if (!b.popped && Math.hypot(rx - b.x, ry - b.y) <= 22) {
          b.popped = true;
          hitBalloon = true;
          bonusDice++;
          if (b.el) {
            b.el.style.transform = 'scale(1.6)';
            b.el.style.opacity = '0';
          }
          break;
        }
      }

      const dist = Math.hypot(rx - 105, ry - 105);
      let pts = 2;
      let msg = 'Зелёное кольцо (+2 очка)';
      if (dist <= 16) {
        pts = 10;
        msg = 'ЯБЛОЧКО! (+10 очков)';
        audio.playSuccess();
      } else if (dist <= 42) {
        pts = 7;
        msg = 'Синее кольцо (+7 очков)';
        audio.playSuccess();
      } else if (dist <= 68) {
        pts = 5;
        msg = 'Красное кольцо (+5 очков)';
        audio.playClick();
      } else {
        audio.playClick();
      }

      totalScore += pts;
      leftEl.textContent = `Дротиков: ${dartsLeft}`;
      scoreEl.textContent = `Очки: ${totalScore} / 20`;
      hintEl.textContent = hitBalloon ? `${msg} + ЛОПНУТ ШАРИК (+1 кубик)!` : msg;

      if (dartsLeft <= 0) {
        active = false;
        if (btn) btn.disabled = true;
        cancelAnimationFrame(this.rafId);

        this.timerId = setTimeout(() => {
          if (bonusDice > 0) this.eventManager.addRerollDice(bonusDice);
          if (totalScore >= 20) {
            this.eventManager.addEggs(12, 'Дартс: Снайпер');
            if (typeof this.modal.rewardCard === 'function') {
              this.modal.rewardCard('sniper_partridge', `Набрано ${totalScore} очков! (+12 яиц${bonusDice ? ` и +${bonusDice} кубик` : ''})`);
            } else {
              this.modal.showOutcomeWithBanner({
                isGood: true,
                icon: BOARD_ASSET_ICONS.BOOSTER,
                label: `Рекорд тира: ${totalScore} очков!`,
                effectTitle: `Снайперский приз: +12 яиц${bonusDice ? ` и +${bonusDice} кубик` : ''}`,
                narrative: 'Три блестящих броска поразили мишень!'
              });
            }
          } else if (totalScore >= 10) {
            const gained = this.eventManager.addEggs(7, 'Дартс: Меткий стрелок');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: `Итог стрельбы: ${totalScore} очков`,
              effectTitle: `Награда стрелка: +${gained} яиц${bonusDice ? ` и +${bonusDice} кубик` : ''}`,
              narrative: 'Отличная кучность попаданий!'
            });
          } else {
            const gained = this.eventManager.addEggs(3, 'Дартс: Утешение');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: `Итог стрельбы: ${totalScore} очков`,
              effectTitle: `Поощрительный приз: +${gained} яйца${bonusDice ? ` и +${bonusDice} кубик` : ''}`,
              narrative: 'Прицел немного гулял, но вы не уходите с пустыми руками.'
            });
          }
        }, 750);
      }
    };

    boardEl.addEventListener('mousedown', throwDart);

    let btn = null;
    if (bottomBar) {
      bottomBar.innerHTML = '';
      btn = document.createElement('button');
      btn.className = 'btn-leaf-green btn-quest-main-btn';
      btn.innerHTML = '<span class="btn-leaf-green-text">МЕТНУТЬ ДРОТИК (ПРОБЕЛ)</span>';
      btn.addEventListener('click', throwDart);
      bottomBar.appendChild(btn);
    }

    this.keyHandler = (e) => {
      if (e.code === 'Space' && active) {
        e.preventDefault();
        throwDart();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  /* ==========================================================================
     2. МИНИ-ИГРА: «УТИНАЯ РЫБАЛКА» (Хороводы уточек в бадье и ловля в кольце крючка)
     ========================================================================== */
  mountDuckFishing(evt, container, bottomBar) {
    const stage = document.createElement('div');
    stage.className = 'fair-game-stage';
    stage.innerHTML = `
      <div class="fair-hud-bar">
        <span>Аттракцион: Утиная Бадья</span>
        <span id="fair-pond-timer">Поймайте уточку в кольцо!</span>
      </div>
      <div id="fair-pond-basin" class="pond-basin">
        <div id="fair-hook-zone" class="pond-hook-target"></div>
      </div>
      <div id="fair-pond-hint" class="fair-status-hint">
        Дождитесь, когда уточка заплывёт точно в центральный круг крючка, и подсекайте!
      </div>
    `;
    container.appendChild(stage);

    const basinEl = document.getElementById('fair-pond-basin');
    const hookZone = document.getElementById('fair-hook-zone');
    const timerEl = document.getElementById('fair-pond-timer');

    // Создаём 5 плывущих по эллипсу уточек (одна Золотая, одна Инфоцыган, три Обычные)
    const duckConfigs = [
      { type: 'gold', label: '★', bg: '#ffd166', border: '#fff' },
      { type: 'normal', label: '#1', bg: '#fcbf49', border: '#593a1d' },
      { type: 'gypsy', label: '$', bg: '#9b5de5', border: '#ffd166' },
      { type: 'normal', label: '#2', bg: '#fcbf49', border: '#593a1d' },
      { type: 'normal', label: '#3', bg: '#fcbf49', border: '#593a1d' }
    ];

    const ducks = duckConfigs.map((cfg, idx) => {
      const el = document.createElement('div');
      el.className = 'pond-duck';
      el.style.background = cfg.bg;
      el.style.borderColor = cfg.border;
      if (cfg.type === 'gypsy') el.style.color = '#fff';
      el.textContent = cfg.label;
      basinEl.appendChild(el);
      return {
        ...cfg,
        el,
        angle: (idx * Math.PI * 2) / duckConfigs.length,
        x: 0,
        y: 0
      };
    });

    let active = true;
    let t = 0;

    const animateDucks = () => {
      if (!active) return;
      t += 0.024;
      const bw = basinEl.clientWidth || 420;
      const bh = basinEl.clientHeight || 120;
      const cx = bw / 2;
      const cy = bh / 2;

      let anyInHook = false;

      ducks.forEach((d, i) => {
        // Уточки плывут по восьмёрке/волне через центр бадьи
        const a = d.angle + t * (i % 2 === 0 ? 1.15 : -0.95);
        d.x = cx + Math.cos(a) * (bw * 0.34);
        d.y = cy + Math.sin(a * 2) * (bh * 0.28);
        d.el.style.left = `${d.x}px`;
        d.el.style.top = `${d.y}px`;

        if (Math.hypot(d.x - cx, d.y - cy) <= 26) {
          anyInHook = true;
        }
      });

      if (hookZone) {
        hookZone.classList.toggle('biting', anyInHook);
      }
      if (timerEl) {
        timerEl.textContent = anyInHook ? 'ПОКЛЁВКА В КОЛЬЦЕ! ЖМИТЕ!' : 'Ждите уточку в центре...';
        timerEl.style.color = anyInHook ? '#2ec4b6' : '#ffd166';
      }

      this.rafId = requestAnimationFrame(animateDucks);
    };
    this.rafId = requestAnimationFrame(animateDucks);

    const pullHook = () => {
      if (!active) return;
      active = false;
      if (btn) btn.disabled = true;
      cancelAnimationFrame(this.rafId);

      const bw = basinEl.clientWidth || 420;
      const bh = basinEl.clientHeight || 120;
      const cx = bw / 2;
      const cy = bh / 2;

      // Ищем ближайшую к крючку уточку
      let closest = null;
      let minDist = Infinity;
      ducks.forEach(d => {
        const dist = Math.hypot(d.x - cx, d.y - cy);
        if (dist < minDist) {
          minDist = dist;
          closest = d;
        }
      });

      if (closest && minDist <= 34) {
        closest.el.style.transform = 'translate(-50%, -50%) scale(1.45)';
        setTimeout(() => {
          if (closest.type === 'gold') {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(10, 'Золотая уточка');
            this.eventManager.addBoosterPacks(1);
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.BOOSTER,
              label: 'Редчайший улов!',
              effectTitle: `Золотая уточка: +${gained} яиц и +1 Бустер карт!`,
              narrative: 'Вы подсекли главную золотую уточку прямо в центре кольца!'
            });
          } else if (closest.type === 'gypsy' && typeof this.modal.rewardCard === 'function') {
            this.modal.rewardCard('info_gypsy', 'Поймана Утка-Инфоцыган!');
          } else {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(6, 'Призовая уточка');
            this.modal.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: 'Точная подсечка!',
              effectTitle: `Призовая уточка: +${gained} яиц`,
              narrative: 'Крючок ловко выхватил жёлтую уточку из воды!'
            });
          }
        }, 450);
      } else {
        audio.playImpact();
        const gained = this.eventManager.addEggs(2, 'Сорвавшаяся уточка');
        this.modal.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Крючок прошёл мимо!',
          effectTitle: `Уточка выскользнула (+${gained} утешительных яйца)`,
          narrative: 'В момент рывка в центральном кольце не оказалось ни одной уточки.'
        });
      }
    };

    basinEl.addEventListener('mousedown', pullHook);

    let btn = null;
    if (bottomBar) {
      bottomBar.innerHTML = '';
      btn = document.createElement('button');
      btn.className = 'btn-leaf-green btn-quest-main-btn';
      btn.innerHTML = '<span class="btn-leaf-green-text">ПОДСЕЧЬ УТОЧКУ (ПРОБЕЛ)</span>';
      btn.addEventListener('click', pullHook);
      bottomBar.appendChild(btn);
    }

    this.keyHandler = (e) => {
      if (e.code === 'Space' && active) {
        e.preventDefault();
        pullHook();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  /* ==========================================================================
     3. МИНИ-ИГРА: «ЯРМАРОЧНЫЙ КОЛЬЦЕБРОС» (Визуальные колышки и полёт колец)
     ========================================================================== */
  mountRingToss(evt, container, bottomBar) {
    const stage = document.createElement('div');
    stage.className = 'fair-game-stage';
    stage.innerHTML = `
      <div class="fair-hud-bar">
        <span id="fair-rings-left">Колец осталось: 2</span>
        <span id="fair-rings-reward">Трофеи: 0 яиц</span>
      </div>
      <div id="fair-ringtoss-field" class="ringtoss-field">
        <!-- Ближний колышек (30-45%) -->
        <div class="ring-peg" style="left:37.5%; height:42px; background:#2ec4b6;"></div>
        <span class="ring-peg-label" style="left:37.5%; color:#2ec4b6;">+4 яйца</span>

        <!-- Средний колышек (55-70%) -->
        <div class="ring-peg" style="left:62.5%; height:56px; background:#9b5de5;"></div>
        <span class="ring-peg-label" style="left:62.5%; color:#c792ea;">+7 яиц</span>

        <!-- Дальний золотой колышек (82-92%) -->
        <div class="ring-peg" style="left:87%; height:70px; background:#ffd166;"></div>
        <span class="ring-peg-label" style="left:87%; color:#ffd166;">+12 / Пак</span>
      </div>
      <!-- Шкала силы броска -->
      <div style="position:relative; width:100%; height:24px; background:rgba(0,0,0,0.55); border-radius:6px; border:2px solid #7c5832; overflow:hidden;">
        <div style="position:absolute; left:30%; width:15%; top:0; bottom:0; background:rgba(46,196,182,0.3);"></div>
        <div style="position:absolute; left:55%; width:15%; top:0; bottom:0; background:rgba(155,93,229,0.3);"></div>
        <div style="position:absolute; left:82%; width:10%; top:0; bottom:0; background:rgba(255,209,102,0.45);"></div>
        <div id="fair-ring-power" style="position:absolute; left:0; top:0; bottom:0; width:0%; background:linear-gradient(90deg, #2ec4b6, #ffd166, #e63946); border-right:3px solid #fff;"></div>
      </div>
      <div id="fair-ring-hint" class="fair-status-hint">
        Поймайте шкалу силы напротив нужного колышка и бросьте кольцо!
      </div>
    `;
    container.appendChild(stage);

    const fieldEl = document.getElementById('fair-ringtoss-field');
    const powerEl = document.getElementById('fair-ring-power');
    const leftEl = document.getElementById('fair-rings-left');
    const rewardEl = document.getElementById('fair-rings-reward');
    const hintEl = document.getElementById('fair-ring-hint');

    let ringsLeft = 2;
    let totalEggs = 0;
    let wonBooster = false;
    let power = 0;
    let speed = 1.6;
    let active = true;

    const updateBar = () => {
      if (!active) return;
      power += speed;
      if (power >= 100 || power <= 0) speed = -speed;
      if (powerEl) powerEl.style.width = `${Math.max(0, Math.min(100, power))}%`;
      this.rafId = requestAnimationFrame(updateBar);
    };
    this.rafId = requestAnimationFrame(updateBar);

    const tossRing = () => {
      if (!active || ringsLeft <= 0) return;
      ringsLeft--;
      speed = (speed > 0 ? 1 : -1) * (Math.abs(speed) + 0.35);

      const p = power;
      // Создаём визуальное летящее кольцо
      const ring = document.createElement('div');
      ring.className = 'thrown-ring';
      ring.style.left = '8%';
      ring.style.bottom = '10px';
      fieldEl.appendChild(ring);

      requestAnimationFrame(() => {
        ring.style.left = `${p}%`;
        ring.style.bottom = '22px';
      });

      if (p >= 82 && p <= 92) {
        audio.playSuccess();
        ring.style.borderColor = '#ffd166';
        if (!wonBooster && Math.random() < 0.5) {
          wonBooster = true;
          hintEl.textContent = 'Золотой колышек! Выигран Бустер карт!';
        } else {
          totalEggs += 12;
          hintEl.textContent = 'Золотой колышек! (+12 яиц)';
        }
      } else if (p >= 55 && p <= 70) {
        audio.playSuccess();
        ring.style.borderColor = '#c792ea';
        totalEggs += 7;
        hintEl.textContent = 'Средний колышек! (+7 яиц)';
      } else if (p >= 30 && p <= 45) {
        audio.playSuccess();
        ring.style.borderColor = '#2ec4b6';
        totalEggs += 4;
        hintEl.textContent = 'Ближний колышек! (+4 яйца)';
      } else {
        audio.playImpact();
        ring.style.borderColor = '#888';
        totalEggs += 1;
        hintEl.textContent = 'Кольцо упало рядом (+1 утешительное яйцо)';
      }

      leftEl.textContent = `Колец осталось: ${ringsLeft}`;
      rewardEl.textContent = `Трофеи: ${totalEggs} яиц${wonBooster ? ' + 1 Бустер' : ''}`;

      if (ringsLeft <= 0) {
        active = false;
        if (btn) btn.disabled = true;
        cancelAnimationFrame(this.rafId);

        this.timerId = setTimeout(() => {
          const gained = this.eventManager.addEggs(totalEggs, 'Кольцеброс');
          if (wonBooster) this.eventManager.addBoosterPacks(1);
          this.modal.showOutcomeWithBanner({
            isGood: true,
            icon: wonBooster ? BOARD_ASSET_ICONS.BOOSTER : BOARD_ASSET_ICONS.EGG,
            label: 'Итог серии бросков',
            effectTitle: `Выигрыш: +${gained} яиц${wonBooster ? ' и +1 Бустер карт!' : ''}`,
            narrative: 'Отличный глазомер на ярмарочном кольцебросе!'
          });
        }, 800);
      }
    };

    let btn = null;
    if (bottomBar) {
      bottomBar.innerHTML = '';
      btn = document.createElement('button');
      btn.className = 'btn-leaf-green btn-quest-main-btn';
      btn.innerHTML = '<span class="btn-leaf-green-text">БРОСИТЬ КОЛЬЦО (ПРОБЕЛ)</span>';
      btn.addEventListener('click', tossRing);
      bottomBar.appendChild(btn);
    }

    this.keyHandler = (e) => {
      if (e.code === 'Space' && active) {
        e.preventDefault();
        tossRing();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
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
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }
}