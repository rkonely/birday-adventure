import { Bird } from './Bird.js';
import { gameState } from '../core/GameState.js';
import { events } from '../core/EventManager.js';

/**
 * Stage1Flight — калибровочная сцена движка полёта Кукушки на техническом сером фоне.
 * Поддерживает:
 * - 66 кадров машущего полета (BIRD-FLY)
 * - 30 кадров аэродинамического парения (Bird-PLANE) по клавише SHIFT
 * - 1 спрайт оглушения (BIRD-STUN) при касании опасной земли
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

    // Птица
    this.bird = null;

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

    // 1. Загрузка 66 кадров взмаха (BIRD-FLY)
    for (let i = 1; i <= this.totalFlap; i++) {
      const numStr = String(i).padStart(5, '0');
      const img = new Image();
      img.src = `assets/Character/BIRD-FLY/Last BIRDY_${numStr}.png`;
      img.onload = onSingleLoad;
      img.onerror = () => onError(`Last BIRDY_${numStr}.png`);
      this.flapSprites.push(img);
    }

    // 2. Загрузка 30 кадров парения (Bird-PLANE)
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

    // 3. Загрузка спрайта оглушения (BIRD-STUN)
    this.stunSprite = new Image();
    this.stunSprite.src = 'assets/Character/BIRD-STUN/STUN.png';
    this.stunSprite.onload = onSingleLoad;
    this.stunSprite.onerror = () => onError('STUN.png');
  }

  initBird() {
    this.bird = new Bird(this.flapSprites, this.glideSprites, this.stunSprite);
    this.bird.onCrashCallback = () => {
      this.screenShake = 0.55; // Запуск тряски экрана при падении
    };
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      // Взмах крылом или пробуждение от стана
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
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

      // Навигация
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
        this.trail = [];
      }
      if (e.code === 'KeyH') {
        this.toggleTuningUI();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
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

    // Мышь и тач
    if (this.canvas) {
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      this.canvas.addEventListener('pointerdown', (e) => {
        if (!this.isActive) return;
        if (e.button === 2) {
          this.input.shift = true;
          this.input.up = false;
        } else {
          if (this.bird) {
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
    console.log('🚀 [Stage1Flight] Калибровка полёта, парения и стана активна.');
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
          <span class="hud-badge">ЭТАП I • ПОЛЁТ И КРАШ</span>
          <span id="tel-mode" class="mode-pill">ВЗМАХ</span>
        </div>
        <span class="hud-sub">Кукушка (Взмах + Парение + Стан)</span>
      </div>

      <div class="flight-telemetry" id="flight-telemetry">
        <span>FPS: <b id="tel-fps">60</b></span>
        <span>Y: <b id="tel-y">360</b></span>
        <span>Vy: <b id="tel-vy">0</b></span>
        <span>Угол: <b id="tel-angle">0°</b></span>
        <span>Кадр: <b id="tel-frame">1/66</b></span>
        <span>Крашей: <b id="tel-crashes" style="color: #ef4444;">0</b></span>
      </div>

      <div class="flight-controls-hint">
        <div>• <b>[ПРОБЕЛ / ЛКМ]</b> — Взмах / Взлёт после краша</div>
        <div>• <b>[SHIFT / ПКМ]</b> — Планирование (парение)</div>
        <div>• <b>Земля</b> — <u>Опасность! Краш и оглушение</u></div>
      </div>

      <div class="flight-sliders-box">
        <div class="slider-row">
          <label>Сила взмаха: <span id="val-flap">380</span></label>
          <input type="range" id="slide-flap" min="150" max="650" value="380" step="10">
        </div>

        <div class="slider-row">
          <label>Гравитация полета: <span id="val-grav">820</span></label>
          <input type="range" id="slide-grav" min="300" max="1500" value="820" step="20">
        </div>

        <div class="slider-row">
          <label>Гравитация при SHIFT: <span id="val-glide-grav">150</span></label>
          <input type="range" id="slide-glide-grav" min="40" max="450" value="150" step="10">
        </div>

        <div class="slider-row">
          <label>Снижение при SHIFT (макс): <span id="val-glide-sink">95</span></label>
          <input type="range" id="slide-glide-sink" min="30" max="250" value="95" step="5">
        </div>

        <div class="slider-row">
          <label>Масштаб птицы: <span id="val-scale">0.32</span></label>
          <input type="range" id="slide-scale" min="0.18" max="0.55" value="0.32" step="0.02">
        </div>

        <div class="slider-row checkbox-row">
          <label>
            <input type="checkbox" id="check-continuous"> Непрерывный взмах при зажатии W
          </label>
        </div>

        <div class="flight-btn-row">
          <button id="btn-reset-pos" class="hud-btn">Центрировать [R]</button>
          <button id="btn-exit-stage" class="hud-btn hud-btn-danger">Главное меню</button>
        </div>
      </div>
    `;

    document.getElementById('game-container').appendChild(ui);
    this.uiContainer = ui;

    // Слушатели ползунков
    const slideFlap = ui.querySelector('#slide-flap');
    const valFlap = ui.querySelector('#val-flap');
    slideFlap.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valFlap.textContent = v;
      if (this.bird) this.bird.flapForce = v;
    });

    const slideGrav = ui.querySelector('#slide-grav');
    const valGrav = ui.querySelector('#val-grav');
    slideGrav.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valGrav.textContent = v;
      if (this.bird) this.bird.gravity = v;
    });

    const slideGlideGrav = ui.querySelector('#slide-glide-grav');
    const valGlideGrav = ui.querySelector('#val-glide-grav');
    slideGlideGrav.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valGlideGrav.textContent = v;
      if (this.bird) this.bird.glideGravity = v;
    });

    const slideGlideSink = ui.querySelector('#slide-glide-sink');
    const valGlideSink = ui.querySelector('#val-glide-sink');
    slideGlideSink.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valGlideSink.textContent = v;
      if (this.bird) this.bird.glideMaxSinkRate = v;
    });

    const slideScale = ui.querySelector('#slide-scale');
    const valScale = ui.querySelector('#val-scale');
    slideScale.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valScale.textContent = v.toFixed(2);
      if (this.bird) this.bird.scale = v;
    });

    const checkCont = ui.querySelector('#check-continuous');
    checkCont.addEventListener('change', (e) => {
      if (this.bird) this.bird.continuousFlap = e.target.checked;
    });

    ui.querySelector('#btn-reset-pos').addEventListener('click', () => {
      if (this.bird) {
        this.bird.reset();
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
      this.bird.update(dt, this.input);

      if (!this.bird.isStunned) {
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
    const telAngle = document.getElementById('tel-angle');
    const telFrame = document.getElementById('tel-frame');
    const telCrashes = document.getElementById('tel-crashes');
    const telMode = document.getElementById('tel-mode');

    if (telFps) telFps.textContent = this.fps;
    if (telY) telY.textContent = Math.round(this.bird.y);
    if (telVy) telVy.textContent = Math.round(this.bird.vy);
    if (telAngle) telAngle.textContent = `${(this.bird.angle * (180 / Math.PI)).toFixed(1)}°`;
    if (telCrashes) telCrashes.textContent = this.bird.crashCount;

    if (this.bird.isStunned) {
      if (telFrame) telFrame.textContent = `СТАН (1/1)`;
      if (telMode) {
        telMode.textContent = 'ОГЛУШЕНИЕ';
        telMode.className = 'mode-pill mode-stun';
      }
    } else if (this.bird.isGliding) {
      if (telFrame) telFrame.textContent = `${Math.floor(this.bird.glideFrameIndex) + 1} / ${this.totalGlide}`;
      if (telMode) {
        telMode.textContent = 'ПАРЕНИЕ';
        telMode.className = 'mode-pill mode-glide';
      }
    } else {
      if (telFrame) telFrame.textContent = `${Math.floor(this.bird.frameIndex) + 1} / ${this.totalFlap}`;
      if (telMode) {
        telMode.textContent = 'ВЗМАХ';
        telMode.className = 'mode-pill mode-flap';
      }
    }
  }

  render(alpha) {
    if (!this.isActive || !this.ctx) return;
    const ctx = this.ctx;

    // 1. Применяем экранную тряску при краше
    ctx.save();
    if (this.screenShake > 0) {
      const shakeMag = this.screenShake * 18;
      const sx = (Math.random() - 0.5) * shakeMag;
      const sy = (Math.random() - 0.5) * shakeMag;
      ctx.translate(sx, sy);
    }

    // 2. Серый технический фон
    ctx.fillStyle = '#26282f';
    ctx.fillRect(0, 0, this.width, this.height);

    // 3. Сетка и направляющие
    this.drawCalibrationGrid(ctx);
    this.drawGuidelines(ctx);

    // 4. Опасная зона земли (Hazard Zone)
    this.drawDangerGround(ctx);

    // 5. Траектория полёта
    this.drawFlightTrail(ctx);

    // 6. Отрисовка кукушки
    if (this.bird) {
      this.bird.render(ctx);
    } else {
      this.drawLoadingProgress(ctx);
    }

    ctx.restore(); // Сброс трансформации тряски экрана

    // 7. Эффекты оверлея при краше (Красная виньетка и предупреждающий баннер)
    if (this.bird && this.bird.isStunned) {
      this.renderCrashOverlay(ctx);
    }
  }

  drawDangerGround(ctx) {
    ctx.save();
    const gy = this.bird ? this.bird.groundY : 595;

    // Фоновая зона опасности
    const groundGrad = ctx.createLinearGradient(0, gy, 0, this.height);
    groundGrad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    groundGrad.addColorStop(1, 'rgba(153, 27, 27, 0.6)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gy, this.width, this.height - gy);

    // Предупреждающая линия (Шипы / Hazard Stripes)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(this.width, gy);
    ctx.stroke();

    // Диагональные предупреждающие штрихи ⚠️
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 2;
    for (let x = -40; x < this.width + 40; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + 20, gy + 20);
      ctx.stroke();
    }

    // Текст предупреждения
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = 'rgba(252, 165, 165, 0.85)';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ ЗОНА КРАША • НЕ КАСАТЬСЯ ЗЕМЛИ • GAME OVER ТЕРРИТОРИЯ ⚠️', this.width / 2, gy + 32);

    ctx.restore();
  }

  renderCrashOverlay(ctx) {
    ctx.save();

    // Красная пульсирующая виньетка по краям экрана
    const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.35;
    const vignette = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 280,
      this.width / 2, this.height / 2, 700
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, `rgba(220, 38, 38, ${pulse})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);

    // Аркадный баннер оглушения
    const bannerW = 440;
    const bannerH = 92;
    const bx = (this.width - bannerW) / 2;
    const by = 210;

    // Подложка баннера
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(bx, by, bannerW, bannerH);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bannerW, bannerH);

    // Декоративные уголки
    ctx.fillStyle = '#facc15';
    ctx.fillRect(bx - 3, by - 3, 6, 6);
    ctx.fillRect(bx + bannerW - 3, by - 3, 6, 6);
    ctx.fillRect(bx - 3, by + bannerH - 3, 6, 6);
    ctx.fillRect(bx + bannerW - 3, by + bannerH - 3, 6, 6);

    // Заголовок баннера
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('💥 КРАШ! ПТИЦА ОГЛУШЕНА!', this.width / 2, by + 34);

    // Подсказка взлёта
    ctx.font = '13px monospace';
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
    ctx.font = '12px monospace';
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
    ctx.font = '22px monospace';
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
