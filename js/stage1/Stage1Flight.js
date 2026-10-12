import { Bird } from './Bird.js';
import { gameState } from '../core/GameState.js';
import { events } from '../core/EventManager.js';

/**
 * Stage1Flight — калибровочная сцена движка полёта Кукушки на техническом сером фоне.
 * Поддерживает:
 * - 66 кадров машущего полета (BIRD-FLY)
 * - 30 кадров аэродинамического парения (Bird-PLANE) по клавише SHIFT
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
    this.totalFlap = 66;
    this.totalGlide = 30;
    this.totalSprites = this.totalFlap + this.totalGlide; // 96 спрайтов
    this.loadedCount = 0;
    this.isLoaded = false;

    // Птица
    this.bird = null;

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
    this.loadedCount = 0;

    const onSingleLoad = () => {
      this.loadedCount++;
      if (this.loadedCount >= this.totalSprites) {
        this.isLoaded = true;
        this.bird = new Bird(this.flapSprites, this.glideSprites);
        console.log(`✨ [Stage1Flight] Успешно загружено 96 спрайтов (66 взмах + 30 планирование)!`);
      }
    };

    const onError = (name) => {
      this.loadedCount++;
      console.warn(`[Stage1Flight] Ошибка загрузки кадра: ${name}`);
      if (this.loadedCount >= this.totalSprites) {
        this.isLoaded = true;
        this.bird = new Bird(this.flapSprites, this.glideSprites);
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
        fileName = 'PLANE- BIRDY_0025.png'; // Обработка специфичного имени файла в папке
      } else {
        fileName = `PLANE- BIRDY_${String(i).padStart(5, '0')}.png`;
      }

      const img = new Image();
      img.src = `assets/Character/Bird-PLANE/${fileName}`;
      img.onload = onSingleLoad;
      img.onerror = () => onError(fileName);
      this.glideSprites.push(img);
    }
  }

  bindEvents() {
    // Клавиатура
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      // Взмах крылом
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.input.up = true;
        if (this.bird && !e.repeat) {
          this.bird.flap();
        }
      }

      // Планирование (Shift)
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.input.shift = true;
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
      // Предотвращаем контекстное меню при ПКМ (чтобы ПКМ можно было зажимать для парения)
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      this.canvas.addEventListener('pointerdown', (e) => {
        if (!this.isActive) return;
        if (e.button === 2) {
          // ПКМ зажатие -> Планирование
          this.input.shift = true;
        } else {
          // ЛКМ / Тап -> Взмах
          if (this.bird) this.bird.flap();
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
      this.bird = new Bird(this.flapSprites, this.glideSprites);
    }

    this.createTuningUI();
    gameState.setStage('STAGE_1');
    console.log('🚀 [Stage1Flight] Режим калибровки полёта и планирования запущен.');
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
          <span class="hud-badge">ЭТАП I • ПОЛЁТ И ПАРЕНИЕ</span>
          <span id="tel-mode" class="mode-pill">ВЗМАХ</span>
        </div>
        <span class="hud-sub">Кукушка (66к взмах + 30к планирование)</span>
      </div>

      <div class="flight-telemetry" id="flight-telemetry">
        <span>FPS: <b id="tel-fps">60</b></span>
        <span>Y: <b id="tel-y">360</b></span>
        <span>Vy: <b id="tel-vy">0</b></span>
        <span>Угол: <b id="tel-angle">0°</b></span>
        <span>Кадр: <b id="tel-frame">1/66</b></span>
        <span>Режим: <b id="tel-state">МАШЕТ</b></span>
      </div>

      <div class="flight-controls-hint">
        <div>• <b>[ПРОБЕЛ / ЛКМ]</b> — Взмах вверх</div>
        <div>• <b>[SHIFT / ПКМ]</b> — <u>Зажать для планирования</u></div>
        <div>• <b>[A / D]</b> — Смещение влево / вправо</div>
        <div>• <b>[R]</b> — Центр | <b>[H]</b> — Панель</div>
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

    this.fpsCounter++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.fpsCounter / this.fpsTimer);
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    if (this.bird) {
      this.bird.update(dt, this.input);

      // Запись траектории
      this.trail.unshift({
        x: this.bird.x,
        y: this.bird.y,
        isGliding: this.bird.isGliding
      });
      if (this.trail.length > this.maxTrail) {
        this.trail.pop();
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
    const telState = document.getElementById('tel-state');
    const telMode = document.getElementById('tel-mode');

    if (telFps) telFps.textContent = this.fps;
    if (telY) telY.textContent = Math.round(this.bird.y);
    if (telVy) telVy.textContent = Math.round(this.bird.vy);
    if (telAngle) telAngle.textContent = `${(this.bird.angle * (180 / Math.PI)).toFixed(1)}°`;

    if (this.bird.isGliding) {
      if (telFrame) telFrame.textContent = `${Math.floor(this.bird.glideFrameIndex) + 1} / ${this.totalGlide}`;
      if (telState) {
        telState.textContent = 'ПАРИТ';
        telState.style.color = '#38bdf8';
      }
      if (telMode) {
        telMode.textContent = 'ПАРЕНИЕ';
        telMode.className = 'mode-pill mode-glide';
      }
    } else {
      if (telFrame) telFrame.textContent = `${Math.floor(this.bird.frameIndex) + 1} / ${this.totalFlap}`;
      if (telState) {
        telState.textContent = this.bird.isFlapping ? 'ВЗМАХ' : 'ПАДЕНИЕ';
        telState.style.color = this.bird.isFlapping ? '#facc15' : '#94a3b8';
      }
      if (telMode) {
        telMode.textContent = 'ВЗМАХ';
        telMode.className = 'mode-pill mode-flap';
      }
    }
  }

  render(alpha) {
    if (!this.isActive || !this.ctx) return;
    const ctx = this.ctx;

    // 1. Серый фон калибровки
    ctx.fillStyle = '#26282f';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Сетка
    this.drawCalibrationGrid(ctx);

    // 3. Линии границ
    this.drawGuidelines(ctx);

    // 4. Траектория
    this.drawFlightTrail(ctx);

    // 5. Отрисовка кукушки
    if (this.bird) {
      this.bird.render(ctx);
    } else {
      this.drawLoadingProgress(ctx);
    }
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

    ctx.strokeStyle = 'rgba(46, 204, 113, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, 620);
    ctx.lineTo(this.width, 620);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
    ctx.fillText('ПОТОЛОК (50px)', 16, 42);

    ctx.fillStyle = 'rgba(46, 204, 113, 0.8)';
    ctx.fillText('УРОВЕНЬ ЗЕМЛИ (620px)', 16, 642);

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

      // При планировании след бирюзово-голубой, при взмахе золотисто-синий
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
    ctx.fillText(`Загрузка спрайтов (взмах + планирование)... (${this.loadedCount} / ${this.totalSprites})`, this.width / 2, this.height / 2 - 20);

    const barW = 360;
    const barH = 14;
    const barX = (this.width - barW) / 2;
    const barY = this.height / 2 + 10;

    ctx.fillStyle = '#1e1f24';
    ctx.fillRect(barX, barY, barW, barH);

    const progress = Math.min(1, this.loadedCount / this.totalSprites);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(barX, barY, barW * progress, barH);
    ctx.restore();
  }
}
