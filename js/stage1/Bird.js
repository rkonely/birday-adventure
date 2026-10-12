import { audio } from '../core/AudioManager.js';

/**
 * Bird — класс управляемой птицы (Кукушки).
 * Поддерживает два режима анимации и физики:
 * 1. Активный машущий полёт (66 кадров из BIRD-FLY)
 * 2. Аэродинамическое планирование / парение (30 кадров из Bird-PLANE) при зажатом Shift
 */
export class Bird {
  constructor(flapSprites = [], glideSprites = []) {
    this.flapSprites = flapSprites;   // 66 кадров взмаха
    this.glideSprites = glideSprites; // 30 кадров планирования
    this.totalFlapFrames = this.flapSprites.length || 66;
    this.totalGlideFrames = this.glideSprites.length || 30;

    // Координаты (центр холста 1280x720)
    this.x = 360;
    this.y = 360;
    this.vx = 0;
    this.vy = 0;

    // Базовые физические параметры
    this.gravity = 820;           // Сила гравитации (пикс/сек^2)
    this.flapForce = 380;         // Импульс взмаха вверх (пикс/сек)
    this.maxFallSpeed = 560;      // Терминальная скорость падения
    this.maxRiseSpeed = -480;     // Максимальная скорость подъема
    this.horizontalSpeed = 280;   // Скорость смещения A/D или стрелками
    this.scale = 0.32;            // Масштаб отображения птицы на экране

    // Параметры планирования (Shift)
    this.isGliding = false;       // Активно ли планирование прямо сейчас
    this.glideGravity = 150;      // Уменьшенная гравитация при планировании
    this.glideMaxSinkRate = 95;   // Мягкое плавное снижение (пикс/сек)
    this.glideForwardBoost = 1.35;// Множитель горизонтальной скорости при планировании
    this.glideAnimSpeed = 36;     // Скорость микро-колебаний крыльев в потоке (30 кадров)
    this.glideFrameIndex = 0;

    // Угол наклона (в радианах)
    this.angle = 0;
    this.targetAngle = 0;

    // Анимация взмаха крыльев
    this.frameIndex = 0;
    this.animSpeed = 75;          // Скорость проигрывания взмаха (кадров/сек)
    this.isFlapping = false;      // Активен ли цикл взмаха
    this.flapTimer = 0;
    this.continuousFlap = false;

    // Границы полета (1280x720)
    this.ceilingY = 50;
    this.groundY = 620;
    this.minX = 120;
    this.maxX = 1160;

    // Эффекты
    this.particles = [];          // Перышки от взмахов
    this.windStreaks = [];        // Воздушные струи при планировании
  }

  /**
   * Импульс взмаха крыльями (Space, клик мыши, тап)
   */
  flap() {
    audio.playFlap();

    // Задаем мгновенный импульс вверх
    this.vy = -this.flapForce;

    // Запускаем цикл взмаха крыльев
    this.isFlapping = true;
    this.flapTimer = 66 / this.animSpeed;

    // Добавляем эффект воздушного вихря/перышек
    this.spawnFlapParticles();
  }

  /**
   * Сброс в исходную точку
   */
  reset() {
    if (this.isGliding) {
      audio.stopGlide();
    }
    this.x = 360;
    this.y = 360;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.targetAngle = 0;
    this.frameIndex = 0;
    this.glideFrameIndex = 0;
    this.isFlapping = false;
    this.isGliding = false;
    this.flapTimer = 0;
    this.particles = [];
    this.windStreaks = [];
  }

  /**
   * Частицы пуха/воздуха при взмахе
   */
  spawnFlapParticles() {
    const count = 3;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.x - 20 + (Math.random() * 20 - 10),
        y: this.y + 15 + Math.random() * 15,
        vx: -60 - Math.random() * 80,
        vy: 20 + Math.random() * 60,
        size: 3 + Math.random() * 4,
        alpha: 0.8,
        life: 0.35 + Math.random() * 0.2
      });
    }
  }

  /**
   * Тонкие аэродинамические струи воздуха при планировании
   */
  spawnWindStreak() {
    // Две струи: с левого и правого кончика крыла
    this.windStreaks.push({
      x: this.x - 25 + Math.random() * 10,
      y: this.y - 10 + (Math.random() * 30 - 15),
      vx: -240 - Math.random() * 120,
      vy: Math.random() * 10 - 5,
      length: 22 + Math.random() * 35,
      alpha: 0.65,
      life: 0.25 + Math.random() * 0.15
    });
  }

  /**
   * Обновление физики с фиксированным шагом dt (сек)
   */
  update(dt, input) {
    // 1. Проверяем режим планирования (зажатый Shift)
    const wantsGlide = !!input.shift;

    if (wantsGlide && !this.isGliding) {
      this.isGliding = true;
      audio.startGlide();
    } else if (!wantsGlide && this.isGliding) {
      this.isGliding = false;
      audio.stopGlide();
    }

    // 2. Горизонтальное управление
    let moveX = 0;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    const currentSpeed = this.isGliding
      ? this.horizontalSpeed * this.glideForwardBoost
      : this.horizontalSpeed;

    this.vx = moveX * currentSpeed;
    this.x += this.vx * dt;
    this.x = Math.max(this.minX, Math.min(this.maxX, this.x));

    // 3. Вертикальная физика в зависимости от режима
    if (this.isGliding) {
      // ПЛАНИРОВАНИЕ: низкая гравитация и ограниченная скорость снижения
      this.vy += this.glideGravity * dt;
      this.vy = Math.min(this.glideMaxSinkRate, Math.max(this.maxRiseSpeed, this.vy));

      // Генерация аэродинамических струй воздуха
      if (Math.random() < 0.65) {
        this.spawnWindStreak();
      }

      // Покадровая анимация планирования (30 кадров)
      this.glideFrameIndex = (this.glideFrameIndex + this.glideAnimSpeed * dt) % this.totalGlideFrames;
      this.isFlapping = false;

      // Угол наклона при планировании: аэродинамический нос прямо или слегка вниз
      this.targetAngle = 0.06; // ~ +3.5 градуса
    } else {
      // ОБЫЧНЫЙ ПОЛЕТ: стандартная гравитация и взмахи
      if (input.up && this.continuousFlap) {
        this.vy = Math.max(this.maxRiseSpeed, this.vy - this.flapForce * 2.5 * dt);
        this.isFlapping = true;
      } else {
        this.vy += this.gravity * dt;
      }

      this.vy = Math.min(this.maxFallSpeed, Math.max(this.maxRiseSpeed, this.vy));

      // Угол наклона в обычном полете (Pitch)
      if (this.vy < -50) {
        this.targetAngle = -0.32; // ~ -18 градусов (подъем)
      } else if (this.vy > 100) {
        const fallRatio = Math.min(1, (this.vy - 100) / (this.maxFallSpeed - 100));
        this.targetAngle = 0.1 + fallRatio * 0.45; // ~ +6..+32 градуса (падение)
      } else {
        this.targetAngle = 0; // горизонтально
      }

      // Покадровая анимация взмаха (66 кадров)
      if (this.isFlapping || this.continuousFlap) {
        this.frameIndex += this.animSpeed * dt;
        if (this.frameIndex >= this.totalFlapFrames) {
          this.frameIndex = this.frameIndex % this.totalFlapFrames;
          if (!this.continuousFlap) {
            this.flapTimer -= dt;
            if (this.flapTimer <= 0) {
              this.isFlapping = false;
            }
          }
        }
      } else {
        // Затухание к базовой стойке
        this.frameIndex = 0;
      }
    }

    this.y += this.vy * dt;

    // Плавное сглаживание угла поворота
    this.angle += (this.targetAngle - this.angle) * Math.min(1, 9 * dt);

    // 4. Столкновение с потолком и полом
    if (this.y < this.ceilingY) {
      this.y = this.ceilingY;
      if (this.vy < 0) this.vy = 0;
    }

    if (this.y > this.groundY) {
      this.y = this.groundY;
      if (this.vy > 0) {
        this.vy = 0;
        this.isFlapping = false;
        if (this.isGliding) {
          this.isGliding = false;
          audio.stopGlide();
        }
      }
    }

    // 5. Обновление частиц перышек
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 0.4);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 6. Обновление воздушных струй планирования
    for (let i = this.windStreaks.length - 1; i >= 0; i--) {
      const s = this.windStreaks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      s.alpha = Math.max(0, s.life / 0.25);
      if (s.life <= 0) {
        this.windStreaks.splice(i, 1);
      }
    }
  }

  /**
   * Отрисовка на Canvas
   */
  render(ctx) {
    // 1. Воздушные струи планирования (за птицей)
    for (const s of this.windStreaks) {
      ctx.save();
      ctx.strokeStyle = `rgba(186, 230, 253, ${s.alpha})`;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.length, s.y);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Частицы взмаха (пух/вихрь)
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = `rgba(235, 240, 245, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Тень на полу
    const shadowDist = this.groundY - this.y;
    if (shadowDist > 0 && shadowDist < 420) {
      const shadowRatio = 1 - shadowDist / 420;
      const shadowW = (80 + 40 * shadowRatio) * (this.scale / 0.32);
      const shadowH = 14 * shadowRatio * (this.scale / 0.32);
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${0.12 + 0.22 * shadowRatio})`;
      ctx.beginPath();
      ctx.ellipse(this.x, this.groundY + 12, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Отрисовка спрайта птицы (взмах или планирование)
    let currentSprite = null;

    if (this.isGliding && this.glideSprites.length > 0) {
      // Режим планирования: используем 30 кадров из Bird-PLANE
      const gIndex = Math.floor(this.glideFrameIndex) % this.totalGlideFrames;
      currentSprite = this.glideSprites[gIndex];
    } else {
      // Режим взмаха: используем 66 кадров из BIRD-FLY
      const fIndex = Math.floor(this.frameIndex) % this.totalFlapFrames;
      currentSprite = this.flapSprites[fIndex];
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (currentSprite && currentSprite.complete && currentSprite.naturalWidth > 0) {
      const drawW = 1280 * this.scale;
      const drawH = 720 * this.scale;
      ctx.drawImage(
        currentSprite,
        -drawW * 0.5,
        -drawH * 0.5,
        drawW,
        drawH
      );
    } else {
      // Запасной процедурный рендер
      ctx.fillStyle = this.isGliding ? '#38bdf8' : '#f39c12';
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
