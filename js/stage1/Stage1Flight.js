import { Bird } from './Bird.js';
import { EggManager } from './EggManager.js';
import { gameState } from '../core/GameState.js';
import { events } from '../core/EventManager.js';

/**
 * Stage1Flight — калибровочная сцена движка полёта Кукушки на техническом сером фоне.
 * Поддерживает:
 * - 66 кадров машущего полета (BIRD-FLY)
 * - 30 кадров аэродинамического парения (Bird-PLANE) по клавише SHIFT
 * - 1 спрайт оглушения (BIRD-STUN) при касании опасной земли
 * - Механика броска 6 видов яиц (Egg) на Пробел со Slo-Mo (1 сек) и стрелочкой прицеливания
 */
export class Stage1Flight {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Виртуальное разрешение 16:9
    this.width = 1280;
    this.height = 720;

    // Спрайты
    this.flapSprites = [];
    this.glideSprites = [];
    this.stunSprite = null;
    this.totalFlap = 66;
    this.totalGlide = 30;
    this.totalSprites = this.totalFlap + this.totalGlide + 1; // 97 спрайтов
    this.loadedCount = 0;
    this.isLoaded = false;

    // Птица и Менеджер Яиц
    this.bird = null;
    this.eggManager = new EggManager();

    // Координаты мыши на виртуальном холсте
    this.mouseX = 640;
    this.mouseY = 360;

    // Тряска экрана при ударе о землю
    this.screenShake = 0;

    // Траектория полета
    this.trail = [];
    this.maxTrail = 75;

    // Ввод
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      shift: false
    };

    this.isActive = false;
    this.uiContainer = null;
    this.showTuningUI = true;

    // FPS
    this.fps = 60;
    this.fpsCounter = 0;
    this.fpsTimer = 0;

    this.initCanvas();
    this.bindEvents();
    this.preloadSprites();
  }

  initCanvas() {
    if (!this.canvas) return;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  preloadSprites() {
    this.flapSprites = [];
    this.glideSprites = [];
    this.stunSprite = null;
    this.loadedCount = 0;

    const onSingleLoad = () => {
      this.loadedCount++;
      if (this.loadedCount >= this.totalSprites) {
        this.isLoaded = true;
        this.initBird();
        console.log(`✨ [Stage1Flight] Успешно загружено 97 спрайтов (взмах + парение + стан)!`);
      }
    };

    const onError = (name) => {
      this.loadedCount++;
      console.warn(`[Stage1Flight] Ошибка загрузки кадра: ${name}`);
      if (this.loadedCount >= this.totalSprites) {
        this.isLoaded = true;
        this.initBird();
      }
    };

    // 1. 66 кадров взмаха (BIRD-FLY)
    for (let i = 1; i <= this.totalFlap; i++) {
      const numStr = String(i).padStart(5, '0');
      const img = new Image();
      img.src = `assets/Character/BIRD-FLY/Last BIRDY_${numStr}.png`;
      img.onload = onSingleLoad;
      img.onerror = () => onError(`Last BIRDY_${numStr}.png`);
      this.flapSprites.push(img);
    }

    // 2. 30 кадров парения (Bird-PLANE)
    for (let i = 1; i <= this.totalGlide; i++) {
      let fileName = '';
      if (i === 25) {
        fileName = 'PLANE- BIRDY_0025.png';
      } else {
        fileName = `PLANE- BIRDY_${String(i).padStart(5, '0')}.png`;
      }

      const img = new Image();
      img.src = `assets/Character/Bird-PLANE/${fileName}`;
      img.onload = onSingleLoad;
      img.onerror = () => onError(fileName);
      this.glideSprites.push(img);
    }

    // 3. Спрайт оглушения (BIRD-STUN)
    this.stunSprite = new Image();
    this.stunSprite.src = 'assets/Character/BIRD-STUN/STUN.png';
    this.stunSprite.onload = onSingleLoad;
    this.stunSprite.onerror = () => onError('STUN.png');
  }

  initBird() {
    this.bird = new Bird(this.flapSprites, this.glideSprites, this.stunSprite);
    this.bird.onCrashCallback = () => {
      this.screenShake = 0.55;
      if (this.eggManager.isAiming) {
        this.eggManager.cancelAiming();
      }
    };
  }

  bindEvents() {
    // Движение мыши для точного прицеливания
    window.addEventListener('pointermove', (e) => {
      if (!this.canvas || !this.isActive) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      // ПРОБЕЛ: Активирует замедление времени (Slo-Mo) и режим прицеливания яйцом!
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.bird) {
          if (this.bird.isStunned) {
            this.bird.recoverFromStun();
          } else if (!e.repeat) {
            this.eggManager.startAiming(this.bird.x, this.bird.y, this.mouseX, this.mouseY);
          }
        }
      }

      // W / Стрелка вверх: Взмах крыльями вверх
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.input.up = true;
        if (this.bird && !e.repeat) {
          if (!this.input.shift || this.bird.isStunned) {
            this.bird.flap();
          }
        }
      }

      // Планирование (Shift)
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.input.shift = true;
        this.input.up = false;
      }

      // Навигация влево/вправо
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.input.left = true;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.input.right = true;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.input.down = true;
      }

      // Горячие клавиши
      if (e.code === 'KeyR' && this.bird) {
        this.bird.reset();
        this.eggManager.eggs = [];
        this.trail = [];
      }
      if (e.code === 'KeyH') {
        this.toggleTuningUI();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;

      // Отпускание Пробела -> Бросок яйца по направлению стрелки!
      if (e.code === 'Space') {
        if (this.eggManager.isAiming && this.bird) {
          this.eggManager.releaseAndThrow(this.bird.vx, this.bird.vy);
        }
      }

      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.input.up = false;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.input.shift = false;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.input.left = false;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.input.right = false;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.input.down = false;
      }
    });

    // Мышь на холсте
    if (this.canvas) {
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      this.canvas.addEventListener('pointerdown', (e) => {
        if (!this.isActive) return;
        if (e.button === 2) {
          // ПКМ -> Планирование
          this.input.shift = true;
          this.input.up = false;
        } else {
          // ЛКМ:
          if (this.eggManager.isAiming && this.bird) {
            // Если игрок целился Пробелом и кликнул — сразу бросаем!
            this.eggManager.releaseAndThrow(this.bird.vx, this.bird.vy);
          } else if (this.bird) {
            // Обычный клик в полете -> Взмах крыльями
            if (!this.input.shift || this.bird.isStunned) {
              this.bird.flap();
            }
          }
        }
      });

      this.canvas.addEventListener('pointerup', (e) => {
        if (!this.isActive) return;
        if (e.button === 2) {
          this.input.shift = false;
        }
      });
    }
  }

  start() {
    this.isActive = true;
    if (this.canvas) {
      this.canvas.style.display = 'block';
    }

    if (!this.bird && this.isLoaded) {
      this.initBird();
    }

    this.createTuningUI();
    gameState.setStage('STAGE_1');
    console.log('🚀 [Stage1Flight] Режим калибровки полёта и броска яиц запущен.');
  }

  stop() {
    this.isActive = false;
    if (this.bird) {
      this.bird.reset();
    }
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    if (this.uiContainer) {
      this.uiContainer.remove();
      this.uiContainer = null;
    }
  }

  toggleTuningUI() {
    this.showTuningUI = !this.showTuningUI;
    if (this.uiContainer) {
      this.uiContainer.style.display = this.showTuningUI ? 'flex' : 'none';
    }
  }

  createTuningUI() {
    if (this.uiContainer) return;

    const ui = document.createElement('div');
    ui.id = 'stage1-tuning-overlay';
    ui.innerHTML = `
      <div class="flight-hud-header">
        <div class="hud-top-row">
          <span class="hud-badge">ЭТАП I • ПОЛЁТ И БРОСКИ ЯИЦ</span>
          <span id="tel-mode" class="mode-pill">ВЗМАХ</span>
        </div>
        <span class="hud-sub">Кукушка (6 видов яиц + Slo-Mo)</span>
      </div>

      <div class="flight-telemetry" id="flight-telemetry">
        <span>FPS: <b id="tel-fps">60</b></span>
        <span>Y: <b id="tel-y">360</b></span>
        <span>Vy: <b id="tel-vy">0</b></span>
        <span>Яиц: <b id="tel-eggs">0</b></span>
        <span>Золотых: <b id="tel-gold-eggs" style="color: #facc15;">0</b></span>
        <span>Крашей: <b id="tel-crashes" style="color: #ef4444;">0</b></span>
      </div>

      <div class="flight-controls-hint">
        <div>• <b>[W / ЛКМ]</b> — Взмах крыльями вверх</div>
        <div>• <b>[SHIFT / ПКМ]</b> — Режим планирования</div>
        <div>• <b>[ПРОБЕЛ]</b> — Застыть на 1 сек (Slo-Mo) и бросить яйцо</div>
        <div>• <b>[МЫШЬ]</b> — Направление броска</div>
      </div>

      <div class="flight-sliders-box">
        <div class="slider-row">
          <label>Сила броска яйца: <span id="val-egg-force">425</span></label>
          <input type="range" id="slide-egg-force" min="200" max="900" value="425" step="25">
        </div>

        <div class="slider-row">
          <label>Сила взмаха: <span id="val-flap">300</span></label>
          <input type="range" id="slide-flap" min="100" max="600" value="300" step="10">
        </div>

        <div class="slider-row">
          <label>Гравитация полета: <span id="val-grav">300</span></label>
          <input type="range" id="slide-grav" min="100" max="1000" value="300" step="20">
        </div>

        <div class="slider-row">
          <label>Гравитация при SHIFT: <span id="val-glide-grav">60</span></label>
          <input type="range" id="slide-glide-grav" min="20" max="300" value="60" step="5">
        </div>

        <div class="slider-row">
          <label>Скорость анимации: <span id="val-anim">130</span> к/с</label>
          <input type="range" id="slide-anim" min="30" max="160" value="130" step="5">
        </div>

        <div class="flight-btn-row">
          <button id="btn-goto-level1" class="hud-btn" style="border-color: #22c55e; color: #4ade80;">🌲 В УРОВЕНЬ 1</button>
          <button id="btn-reset-pos" class="hud-btn">Центр [R]</button>
          <button id="btn-exit-stage" class="hud-btn hud-btn-danger">В Меню</button>
        </div>
      </div>
    `;

    document.getElementById('game-container').appendChild(ui);
    this.uiContainer = ui;

    const btnGotoLevel1 = ui.querySelector('#btn-goto-level1');
    if (btnGotoLevel1) {
      btnGotoLevel1.addEventListener('click', () => {
        events.emit('stage:switch_to_level1');
      });
    }

    // Слушатели ползунков
    const slideEggForce = ui.querySelector('#slide-egg-force');
    const valEggForce = ui.querySelector('#val-egg-force');
    if (this.eggManager) {
      slideEggForce.value = this.eggManager.throwForce;
      valEggForce.textContent = this.eggManager.throwForce;
    }
    slideEggForce.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valEggForce.textContent = v;
      this.eggManager.throwForce = v;
    });

    const slideFlap = ui.querySelector('#slide-flap');
    const valFlap = ui.querySelector('#val-flap');
    if (this.bird) {
      slideFlap.value = this.bird.flapForce;
      valFlap.textContent = this.bird.flapForce;
    }
    slideFlap.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valFlap.textContent = v;
      if (this.bird) this.bird.flapForce = v;
    });

    const slideGrav = ui.querySelector('#slide-grav');
    const valGrav = ui.querySelector('#val-grav');
    if (this.bird) {
      slideGrav.value = this.bird.gravity;
      valGrav.textContent = this.bird.gravity;
    }
    slideGrav.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valGrav.textContent = v;
      if (this.bird) this.bird.gravity = v;
    });

    const slideGlideGrav = ui.querySelector('#slide-glide-grav');
    const valGlideGrav = ui.querySelector('#val-glide-grav');
    if (this.bird) {
      slideGlideGrav.value = this.bird.glideGravity;
      valGlideGrav.textContent = this.bird.glideGravity;
    }
    slideGlideGrav.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valGlideGrav.textContent = v;
      if (this.bird) this.bird.glideGravity = v;
    });

    const slideAnim = ui.querySelector('#slide-anim');
    const valAnim = ui.querySelector('#val-anim');
    if (this.bird) {
      slideAnim.value = this.bird.animSpeed;
      valAnim.textContent = this.bird.animSpeed;
    }
    slideAnim.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valAnim.textContent = v;
      if (this.bird) this.bird.animSpeed = v;
    });

    ui.querySelector('#btn-reset-pos').addEventListener('click', () => {
      if (this.bird) {
        this.bird.reset();
        this.eggManager.eggs = [];
        this.trail = [];
      }
    });

    ui.querySelector('#btn-exit-stage').addEventListener('click', () => {
      this.stop();
      events.emit('stage:exit_to_title');
    });
  }

  update(dt) {
    if (!this.isActive) return;

    // Угасание тряски экрана
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 2.2);
    }

    this.fpsCounter++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.fpsCounter / this.fpsTimer);
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    if (this.bird) {
      // Эффективный дельта-тайм: замедляется при прицеливании (Slo-Mo)
      const effectiveDt = dt * this.eggManager.timeScale;

      this.bird.update(effectiveDt, this.input);

      // Обновление менеджера яиц
      this.eggManager.update(
        dt,
        this.bird.x,
        this.bird.y,
        this.mouseX,
        this.mouseY,
        this.bird.vx,
        this.bird.vy
      );

      if (!this.bird.isStunned && !this.eggManager.isAiming) {
        this.trail.unshift({
          x: this.bird.x,
          y: this.bird.y,
          isGliding: this.bird.isGliding
        });
        if (this.trail.length > this.maxTrail) {
          this.trail.pop();
        }
      }

      this.updateTelemetryUI();
    }
  }

  updateTelemetryUI() {
    if (!this.uiContainer || !this.bird) return;
    const telFps = document.getElementById('tel-fps');
    const telY = document.getElementById('tel-y');
    const telVy = document.getElementById('tel-vy');
    const telEggs = document.getElementById('tel-eggs');
    const telGoldEggs = document.getElementById('tel-gold-eggs');
    const telCrashes = document.getElementById('tel-crashes');
    const telMode = document.getElementById('tel-mode');

    if (telFps) telFps.textContent = this.fps;
    if (telY) telY.textContent = Math.round(this.bird.y);
    if (telVy) telVy.textContent = Math.round(this.bird.vy);
    if (telEggs) telEggs.textContent = this.eggManager.eggsThrown;
    if (telGoldEggs) telGoldEggs.textContent = this.eggManager.goldEggsThrown;
    if (telCrashes) telCrashes.textContent = this.bird.crashCount;

    if (this.bird.isStunned) {
      if (telMode) {
        telMode.textContent = 'ОГЛУШЕНИЕ';
        telMode.className = 'mode-pill mode-stun';
      }
    } else if (this.eggManager.isAiming) {
      if (telMode) {
        telMode.textContent = 'ПРИЦЕЛ (SLO-MO)';
        telMode.className = 'mode-pill mode-aim';
      }
    } else if (this.bird.isGliding) {
      if (telMode) {
        telMode.textContent = 'ПАРЕНИЕ';
        telMode.className = 'mode-pill mode-glide';
      }
    } else {
      if (telMode) {
        telMode.textContent = 'ВЗМАХ';
        telMode.className = 'mode-pill mode-flap';
      }
    }
  }

  render(alpha) {
    if (!this.isActive || !this.ctx) return;
    const ctx = this.ctx;

    // 1. Применяем экранную тряску при ударе
    ctx.save();
    if (this.screenShake > 0) {
      const shakeMag = this.screenShake * 18;
      const sx = (Math.random() - 0.5) * shakeMag;
      const sy = (Math.random() - 0.5) * shakeMag;
      ctx.translate(sx, sy);
    }

    // 2. Серый фон
    ctx.fillStyle = '#26282f';
    ctx.fillRect(0, 0, this.width, this.height);

    // 3. Сетка и направляющие
    this.drawCalibrationGrid(ctx);
    this.drawGuidelines(ctx);

    // 4. Опасная земля
    this.drawDangerGround(ctx);

    // 5. Траектория полёта
    this.drawFlightTrail(ctx);

    // 6. Отрисовка всех яиц на поле (летящие и разбитые)
    this.eggManager.render(ctx);

    // 7. Отрисовка кукушки
    if (this.bird) {
      this.bird.render(ctx);
    } else {
      this.drawLoadingProgress(ctx);
    }

    ctx.restore();

    // 8. Виньетка Slo-Mo кинематографичного замедления
    if (this.eggManager.isAiming) {
      this.renderSloMoVignette(ctx);
    }

    // 9. Оверлей краша
    if (this.bird && this.bird.isStunned) {
      this.renderCrashOverlay(ctx);
    }
  }

  renderSloMoVignette(ctx) {
    ctx.save();
    const vig = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 240,
      this.width / 2, this.height / 2, 700
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(14, 165, 233, 0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  drawDangerGround(ctx) {
    ctx.save();
    const gy = this.bird ? this.bird.groundY : 595;

    const groundGrad = ctx.createLinearGradient(0, gy, 0, this.height);
    groundGrad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    groundGrad.addColorStop(1, 'rgba(153, 27, 27, 0.6)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gy, this.width, this.height - gy);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(this.width, gy);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 2;
    for (let x = -40; x < this.width + 40; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + 20, gy + 20);
      ctx.stroke();
    }

    ctx.font = 'bold 12px "8bitoperator", monospace';
    ctx.fillStyle = 'rgba(252, 165, 165, 0.85)';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ ЗОНА КРАША • НЕ КАСАТЬСЯ ЗЕМЛИ • GAME OVER ТЕРРИТОРИЯ ⚠️', this.width / 2, gy + 32);

    ctx.restore();
  }

  renderCrashOverlay(ctx) {
    ctx.save();

    const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.35;
    const vignette = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 280,
      this.width / 2, this.height / 2, 700
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, `rgba(220, 38, 38, ${pulse})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);

    const bannerW = 440;
    const bannerH = 92;
    const bx = (this.width - bannerW) / 2;
    const by = 210;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(bx, by, bannerW, bannerH);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bannerW, bannerH);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(bx - 3, by - 3, 6, 6);
    ctx.fillRect(bx + bannerW - 3, by - 3, 6, 6);
    ctx.fillRect(bx - 3, by + bannerH - 3, 6, 6);
    ctx.fillRect(bx + bannerW - 3, by + bannerH - 3, 6, 6);

    ctx.font = 'bold 18px "8bitoperator", monospace';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('💥 КРАШ! ПТИЦА ОГЛУШЕНА!', this.width / 2, by + 34);

    ctx.font = '13px "8bitoperator", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('Нажмите [ПРОБЕЛ] или [КЛИК], чтобы взлететь!', this.width / 2, by + 64);

    ctx.restore();
  }

  drawCalibrationGrid(ctx) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';

    for (let x = 0; x <= this.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let x = 80; x < this.width; x += 160) {
      for (let y = 80; y < this.height; y += 160) {
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    ctx.restore();
  }

  drawGuidelines(ctx) {
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 360);
    ctx.lineTo(this.width, 360);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, 50);
    ctx.lineTo(this.width, 50);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = '12px "8bitoperator", monospace';
    ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
    ctx.fillText('ПОТОЛОК (50px)', 16, 42);

    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.fillText('ЦЕНТР (360px)', 16, 354);
    ctx.restore();
  }

  drawFlightTrail(ctx) {
    if (this.trail.length < 2) return;

    ctx.save();
    for (let i = 0; i < this.trail.length - 1; i++) {
      const p1 = this.trail[i];
      const p2 = this.trail[i + 1];
      const ratio = 1 - i / this.trail.length;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      if (p1.isGliding) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.6 * ratio})`;
        ctx.lineWidth = 3.2 * ratio;
      } else {
        ctx.strokeStyle = `rgba(100, 200, 255, ${0.4 * ratio})`;
        ctx.lineWidth = 2.2 * ratio;
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLoadingProgress(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px "8bitoperator", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Загрузка спрайтов (полет + стан)... (${this.loadedCount} / ${this.totalSprites})`, this.width / 2, this.height / 2 - 20);

    const barW = 360;
    const barH = 14;
    const barX = (this.width - barW) / 2;
    const barY = this.height / 2 + 10;

    ctx.fillStyle = '#1e1f24';
    ctx.fillRect(barX, barY, barW, barH);

    const progress = Math.min(1, this.loadedCount / this.totalSprites);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(barX, barY, barW * progress, barH);
    ctx.restore();
  }
}
