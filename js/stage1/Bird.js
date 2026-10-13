import { audio } from '../core/AudioManager.js';

/**
 * Bird — класс управляемой птицы (Кукушки).
 * Поддерживает:
 * 1. Активный машущий полёт (66 кадров из BIRD-FLY)
 * 2. Аэродинамическое планирование / парение (30 кадров из Bird-PLANE) при зажатом Shift
 * 3. Оглушение и краш при падении на землю (BIRD-STUN) с вращающимися звёздочками
 */
export class Bird {
  constructor(flapSprites = [], glideSprites = [], stunSprite = null) {
    this.flapSprites = flapSprites;   // 66 кадров взмаха
    this.glideSprites = glideSprites; // 30 кадров планирования
    this.stunSprite = stunSprite;     // Спрайт оглушения (STUN.png)

    this.totalFlapFrames = this.flapSprites.length || 66;
    this.totalGlideFrames = this.glideSprites.length || 30;

    // Координаты (центр холста 1280x720)
    this.x = 360;
    this.y = 360;
    this.vx = 0;
    this.vy = 0;

    // Базовые физические параметры
    this.gravity = 300;           // Сила гравитации (пикс/сек^2) (по умолчанию 300)
    this.flapForce = 300;         // Импульс взмаха вверх (пикс/сек) (по умолчанию 300)
    this.maxFallSpeed = 560;      // Терминальная скорость падения
    this.maxRiseSpeed = -480;     // Максимальная скорость подъема
    this.horizontalSpeed = 280;   // Скорость смещения A/D или стрелками
    this.baseForwardSpeed = 190;  // Базовая скорость непрерывного полёта вперёд (пикс/сек)
    this.forwardBoost = 1.55;     // Множитель ускорения при зажатии D / Вправо
    this.onlyForward = true;      // Режим "только вперёд" (полёт назад запрещён)
    this.scale = 0.10;            // Стандартный компактный масштаб птицы 0.10

    // Параметры планирования (Shift)
    this.isGliding = false;       // Активно ли планирование прямо сейчас
    this.glideGravity = 60;       // Уменьшенная гравитация при планировании (Shift: 60)
    this.glideMaxSinkRate = 95;   // Мягкое плавное снижение (пикс/сек)
    this.glideForwardBoost = 1.35;// Множитель горизонтальной скорости при планировании
    this.glideAnimSpeed = 36;     // Скорость микро-колебаний крыльев в потоке (30 кадров)
    this.glideFrameIndex = 0;

    // Состояние оглушения (Краш о землю)
    this.isStunned = false;
    this.stunTimer = 0;
    this.stunStarsAngle = 0;
    this.crashCount = 0;
    this.onCrashCallback = null;

    // Угол наклона (в радианах)
    this.angle = 0;
    this.targetAngle = 0;

    // Анимация взмаха крыльев
    this.frameIndex = 0;
    this.animSpeed = 130;         // Скорость проигрывания взмаха (130 кадров/сек по умолчанию)
    this.isFlapping = false;      // Активен ли цикл взмаха
    this.flapTimer = 0;
    this.continuousFlap = false;

    // Границы полета (1280x720)
    this.ceilingY = 50;
    this.groundY = 595;           // Линия земли для точной посадки лапками на грунт
    this.minX = 120;
    this.maxX = 1160;

    // Эффекты
    this.particles = [];          // Перышки от взмахов
    this.windStreaks = [];        // Воздушные струи при планировании
    this.dustParticles = [];      // Пыль от удара о землю
  }

  /**
   * Импульс взмаха крыльями (Space, клик мыши, тап)
   */
  flap() {
    // Если птица оглушена — нажатие клавиши пробуждает её и поднимает в воздух
    if (this.isStunned) {
      if (this.stunTimer > 0.25) {
        this.recoverFromStun();
      }
      return;
    }

    // В режиме планирования (Shift) взмах заблокирован
    if (this.isGliding) return;

    audio.playFlap();

    // Задаем мгновенный импульс вверх
    this.vy = -this.flapForce;

    // Запускаем цикл взмаха крыльев
    this.isFlapping = true;
    this.flapTimer = 66 / this.animSpeed;

    // Эффект воздушного вихря/перышек
    this.spawnFlapParticles();
  }

  /**
   * Срабатывание краша о землю
   */
  triggerStun() {
    if (this.isStunned) return;

    this.isStunned = true;
    this.stunTimer = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.targetAngle = 0;
    this.isFlapping = false;
    this.crashCount++;

    if (this.isGliding) {
      this.isGliding = false;
      audio.stopGlide();
    }

    audio.playBonk();
    this.spawnImpactDust();

    if (this.onCrashCallback) {
      this.onCrashCallback();
    }
  }

  /**
   * Восстановление после оглушения
   */
  recoverFromStun() {
    this.isStunned = false;
    this.stunTimer = 0;
    this.vy = -340; // Мягкий взлёт вверх
    this.isFlapping = true;
    this.flapTimer = 66 / this.animSpeed;
    this.dustParticles = [];

    audio.playSuccess();
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
    this.isStunned = false;
    this.stunTimer = 0;
    this.flapTimer = 0;
    this.particles = [];
    this.windStreaks = [];
    this.dustParticles = [];
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
   * Пылевой взрыв от падения на землю
   */
  spawnImpactDust() {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const dir = (i % 2 === 0 ? 1 : -1) * (0.4 + Math.random() * 0.6);
      this.dustParticles.push({
        x: this.x + (Math.random() * 40 - 20),
        y: this.groundY + 18,
        vx: dir * (120 + Math.random() * 160),
        vy: -40 - Math.random() * 90,
        size: 5 + Math.random() * 8,
        alpha: 0.85,
        life: 0.5 + Math.random() * 0.3
      });
    }
  }

  /**
   * Тонкие аэродинамические струи воздуха при планировании
   */
  spawnWindStreak() {
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
    // 0. Если оглушена — только анимация таймера и звёздочек
    if (this.isStunned) {
      this.stunTimer += dt;
      this.stunStarsAngle += 4.5 * dt;

      // Обновление частиц пыли
      for (let i = this.dustParticles.length - 1; i >= 0; i--) {
        const p = this.dustParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 220 * dt; // оседание пыли
        p.life -= dt;
        p.alpha = Math.max(0, p.life / 0.6);
        if (p.life <= 0) {
          this.dustParticles.splice(i, 1);
        }
      }

      // Авто-восстановление через 3.5 секунды, если игрок не нажал Пробел
      if (this.stunTimer > 3.5) {
        this.recoverFromStun();
      }
      return;
    }

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
    // 2. Горизонтальное движение (Только вперёд, летать назад нельзя!)
    if (this.onlyForward) {
      let forwardMultiplier = 1.0;
      if (input.right) {
        forwardMultiplier = this.forwardBoost;
      }
      if (this.isGliding) {
        forwardMultiplier *= this.glideForwardBoost;
      }
      this.vx = this.baseForwardSpeed * forwardMultiplier;
    } else {
      let moveX = 0;
      if (input.right) moveX += 1;
      const currentSpeed = this.isGliding
        ? this.horizontalSpeed * this.glideForwardBoost
        : this.horizontalSpeed;
      this.vx = moveX * currentSpeed;
    }

    this.x += this.vx * dt;
    this.x = Math.max(this.minX, Math.min(this.maxX, this.x));

    // 3. Вертикальная физика в зависимости от режима
    if (this.isGliding) {
      if (this.vy < 0) {
        this.vy = 0;
      }

      this.vy += this.glideGravity * dt;
      this.vy = Math.min(this.glideMaxSinkRate, Math.max(0, this.vy));

      if (Math.random() < 0.65) {
        this.spawnWindStreak();
      }

      this.glideFrameIndex = (this.glideFrameIndex + this.glideAnimSpeed * dt) % this.totalGlideFrames;
      this.isFlapping = false;
      this.targetAngle = 0.06;
    } else {
      if (input.up && this.continuousFlap) {
        this.vy = Math.max(this.maxRiseSpeed, this.vy - this.flapForce * 2.5 * dt);
        this.isFlapping = true;
      } else {
        this.vy += this.gravity * dt;
      }

      this.vy = Math.min(this.maxFallSpeed, Math.max(this.maxRiseSpeed, this.vy));

      if (this.vy < -50) {
        this.targetAngle = -0.32;
      } else if (this.vy > 100) {
        const fallRatio = Math.min(1, (this.vy - 100) / (this.maxFallSpeed - 100));
        this.targetAngle = 0.1 + fallRatio * 0.45;
      } else {
        this.targetAngle = 0;
      }

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
        this.frameIndex = 0;
      }
    }

    this.y += this.vy * dt;
    this.angle += (this.targetAngle - this.angle) * Math.min(1, 9 * dt);

    // 4. Столкновение с потолком
    if (this.y < this.ceilingY) {
      this.y = this.ceilingY;
      if (this.vy < 0) this.vy = 0;
    }

    // 5. КРАШ О ЗЕМЛЮ!
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.triggerStun();
    }

    // 6. Обновление частиц перышек
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

    // 7. Обновление воздушных струй
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
    // 1. Частицы пыли при ударе
    for (const d of this.dustParticles) {
      ctx.save();
      ctx.fillStyle = `rgba(215, 220, 225, ${d.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Воздушные струи планирования
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

    // 3. Частицы взмаха
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = `rgba(235, 240, 245, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Тень на полу
    const shadowDist = this.groundY - this.y;
    if (shadowDist >= 0 && shadowDist < 420) {
      const shadowRatio = 1 - shadowDist / 420;
      const shadowW = (26 + 14 * shadowRatio) * (this.scale / 0.10);
      const shadowH = (this.isStunned ? 7 : 5) * shadowRatio * (this.scale / 0.10);
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${0.14 + 0.28 * shadowRatio})`;
      ctx.beginPath();
      ctx.ellipse(this.x + 2, this.groundY + 12, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Отрисовка спрайта птицы
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const drawW = 1280 * this.scale;
    const drawH = 720 * this.scale;

    if (this.isStunned && this.stunSprite && this.stunSprite.complete && this.stunSprite.naturalWidth > 0) {
      // Спрайт оглушения (STUN.png)
      ctx.drawImage(
        this.stunSprite,
        -drawW * 0.5,
        -drawH * 0.5,
        drawW,
        drawH
      );
    } else {
      let currentSprite = null;
      if (this.isGliding && this.glideSprites.length > 0) {
        const gIndex = Math.floor(this.glideFrameIndex) % this.totalGlideFrames;
        currentSprite = this.glideSprites[gIndex];
      } else {
        const fIndex = Math.floor(this.frameIndex) % this.totalFlapFrames;
        currentSprite = this.flapSprites[fIndex];
      }

      if (currentSprite && currentSprite.complete && currentSprite.naturalWidth > 0) {
        ctx.drawImage(
          currentSprite,
          -drawW * 0.5,
          -drawH * 0.5,
          drawW,
          drawH
        );
      } else {
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // 6. Вращающиеся мультяшные звёздочки над головой при оглушении
    if (this.isStunned) {
      this.renderDizzyStars(ctx);
    }
  }

  /**
   * Отрисовка вращающихся звёздочек головокружения
   */
  renderDizzyStars(ctx) {
    const starCount = 3;
    const centerX = this.x + 3 * (this.scale / 0.10);
    const centerY = this.y - 18 * (this.scale / 0.10); // Точно над головой птицы
    const radiusX = 14 * (this.scale / 0.10);
    const radiusY = 5 * (this.scale / 0.10);

    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const angle = this.stunStarsAngle + (i * (Math.PI * 2 / starCount));
      const sx = centerX + Math.cos(angle) * radiusX;
      const sy = centerY + Math.sin(angle) * radiusY;

      // Размер звёздочки с легкой пульсацией
      const starScale = 1 + 0.2 * Math.sin(angle * 2);

      this.drawPixelStar(ctx, sx, sy, 3.5 * starScale * (this.scale / 0.10));
    }
    ctx.restore();
  }

  /**
   * Рисование аккуратной 4-лучевой ретро-звёздочки
   */
  drawPixelStar(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#facc15'; // Яркий золотисто-жёлтый
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    // 4-лучевая звезда
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.35, cy - size * 0.35);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx + size * 0.35, cy + size * 0.35);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.35, cy + size * 0.35);
    ctx.lineTo(cx - size, cy);
    ctx.lineTo(cx - size * 0.35, cy - size * 0.35);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Белый блик в центре
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    ctx.restore();
  }
}
