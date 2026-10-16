import { audio } from '../core/AudioManager.js';

/**
 * Bird — класс управляемой птицы (Кукушки).
 */
export class Bird {
  constructor(flapSprites = [], glideSprites = [], stunSprite = null) {
    this.flapSprites = flapSprites;
    this.glideSprites = glideSprites;
    this.stunSprite = stunSprite;

    this.totalFlapFrames = this.flapSprites.length || 66;
    this.totalGlideFrames = this.glideSprites.length || 30;

    // Координаты и скорость
    this.x = 360;
    this.y = 360;
    this.vx = 0;
    this.vy = 0;

    // Физические параметры
    this.gravity = 300;
    this.flapForce = 300;
    this.maxFallSpeed = 560;
    this.maxRiseSpeed = -480;
    this.horizontalSpeed = 280;
    this.baseForwardSpeed = 190;
    this.forwardBoost = 1.55;
    this.onlyForward = true;
    this.scale = 0.10;

    // Параметры планирования (Shift)
    this.isGliding = false;
    this.glideGravity = 60;
    this.glideMaxSinkRate = 95;
    this.glideForwardBoost = 1.35;
    this.glideAnimSpeed = 36;
    this.glideFrameIndex = 0;
    this.windSpawnTimer = 0;
    this.windSpawnInterval = 0.025; // Фиксированный интервал спавна струй (не зависит от FPS и Slo-Mo)

    // Состояние оглушения
    this.isStunned = false;
    this.isExhausted = false;
    this.stunTimer = 0;
    this.stunStarsAngle = 0;
    this.crashCount = 0;
    this.onCrashCallback = null;

    // Угол наклона (в радианах)
    this.angle = 0;
    this.targetAngle = 0;

    // Анимация взмаха крыльев
    this.frameIndex = 0;
    this.animSpeed = 130;
    this.isFlapping = false;
    this.continuousFlap = false;

    // Границы полета (1280x720)
    this.ceilingY = 50;
    this.groundY = 595;
    this.minX = 120;
    this.maxX = 1160;

    // Эффекты
    this.particles = [];
    this.windStreaks = [];
    this.dustParticles = [];
  }

  flap() {
    if (this.isStunned) {
      if (!this.isExhausted && this.stunTimer > 0.25) {
        this.recoverFromStun();
      }
      return;
    }

    if (this.isGliding) return;

    audio.playFlap();

    this.vy = -this.flapForce;
    this.isFlapping = true;
    this.frameIndex = 0; // Начинаем цикл взмаха с первого кадра

    this.spawnFlapParticles();
  }

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

  recoverFromStun() {
    this.isStunned = false;
    this.stunTimer = 0;
    this.vy = -340;
    this.isFlapping = true;
    this.frameIndex = 0;
    this.dustParticles.length = 0;

    audio.playSuccess();
    this.spawnFlapParticles();
  }

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
    this.windSpawnTimer = 0;
    this.isFlapping = false;
    this.isGliding = false;
    this.isStunned = false;
    this.isExhausted = false;
    this.stunTimer = 0;
    this.particles.length = 0;
    this.windStreaks.length = 0;
    this.dustParticles.length = 0;
  }

  spawnFlapParticles() {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const maxLife = 0.35 + Math.random() * 0.2;
      this.particles.push({
        x: this.x - 20 + (Math.random() * 20 - 10),
        y: this.y + 15 + Math.random() * 15,
        vx: -60 - Math.random() * 80,
        vy: 20 + Math.random() * 60,
        size: 3 + Math.random() * 4,
        alpha: 0.8,
        life: maxLife,
        maxLife
      });
    }
  }

  spawnImpactDust() {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const dir = (i % 2 === 0 ? 1 : -1) * (0.4 + Math.random() * 0.6);
      const maxLife = 0.5 + Math.random() * 0.3;
      this.dustParticles.push({
        x: this.x + (Math.random() * 40 - 20),
        y: this.groundY + 18,
        vx: dir * (120 + Math.random() * 160),
        vy: -40 - Math.random() * 90,
        size: 5 + Math.random() * 8,
        alpha: 0.85,
        life: maxLife,
        maxLife
      });
    }
  }

  spawnWindStreak() {
    const maxLife = 0.25 + Math.random() * 0.15;
    this.windStreaks.push({
      x: this.x - 25 + Math.random() * 10,
      y: this.y - 10 + (Math.random() * 30 - 15),
      vx: -240 - Math.random() * 120,
      vy: Math.random() * 10 - 5,
      length: 22 + Math.random() * 35,
      alpha: 0.65,
      life: maxLife,
      maxLife
    });
  }

  /**
   * Быстрое удаление частицы (Swap-and-Pop) без сдвига всего массива
   */
  removeParticle(array, index) {
    array[index] = array[array.length - 1];
    array.pop();
  }

  /**
   * Обновление всех систем частиц (работает даже во время оглушения)
   */
  updateParticles(dt) {
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.removeParticle(this.dustParticles, i);
      } else {
        p.alpha = (p.life / p.maxLife) * 0.85;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.removeParticle(this.particles, i);
      } else {
        p.alpha = (p.life / p.maxLife) * 0.8;
      }
    }

    for (let i = this.windStreaks.length - 1; i >= 0; i--) {
      const s = this.windStreaks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) {
        this.removeParticle(this.windStreaks, i);
      } else {
        s.alpha = (s.life / s.maxLife) * 0.65;
      }
    }
  }

  update(dt, input) {
    // Частицы обновляются всегда, чтобы не замирать в воздухе при ударе о землю
    this.updateParticles(dt);

    // 0. Если оглушена
    if (this.isStunned) {
      this.stunTimer += dt;
      this.stunStarsAngle += 4.5 * dt;

      if (this.stunTimer > 3.5 && !this.isExhausted) {
        this.recoverFromStun();
      }
      return;
    }

    // 1. Режим планирования (зажатый Shift)
    const wantsGlide = !!input.shift;
    if (wantsGlide !== this.isGliding) {
      this.isGliding = wantsGlide;
      if (this.isGliding) {
        audio.startGlide();
      } else {
        audio.stopGlide();
      }
    }

    // 2. Горизонтальное движение
    if (this.onlyForward) {
      let forwardMultiplier = input.right ? this.forwardBoost : 1.0;
      if (this.isGliding) {
        forwardMultiplier *= this.glideForwardBoost;
      }
      this.vx = this.baseForwardSpeed * forwardMultiplier;
    } else {
      const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const currentSpeed = this.isGliding
        ? this.horizontalSpeed * this.glideForwardBoost
        : this.horizontalSpeed;
      this.vx = moveX * currentSpeed;
    }

    this.x = Math.max(this.minX, Math.min(this.maxX, this.x + this.vx * dt));

    // 3. Вертикальная физика
    if (this.isGliding) {
      // Плавное гашение вертикального импульса вверх вместо резкого обнуления
      if (this.vy < 0) {
        this.vy = Math.min(0, this.vy + this.gravity * 3.0 * dt);
      } else {
        this.vy = Math.min(this.glideMaxSinkRate, this.vy + this.glideGravity * dt);
      }

      // Независимый от FPS и Slo-Mo спавн струй воздуха
      this.windSpawnTimer += dt;
      while (this.windSpawnTimer >= this.windSpawnInterval) {
        this.windSpawnTimer -= this.windSpawnInterval;
        this.spawnWindStreak();
      }

      this.glideFrameIndex = (this.glideFrameIndex + this.glideAnimSpeed * dt) % this.totalGlideFrames;
      this.isFlapping = false;
      this.targetAngle = 0.06;
    } else {
      this.windSpawnTimer = 0;

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

      // Корректное завершение одиночного цикла взмаха (66 кадров)
      if (this.isFlapping || this.continuousFlap) {
        this.frameIndex += this.animSpeed * dt;
        if (this.frameIndex >= this.totalFlapFrames) {
          if (this.continuousFlap) {
            this.frameIndex %= this.totalFlapFrames;
          } else {
            this.frameIndex = 0;
            this.isFlapping = false;
          }
        }
      } else {
        this.frameIndex = 0;
      }
    }

    this.y += this.vy * dt;
    // Независимое от фреймрейта экспоненциальное сглаживание угла
    this.angle += (this.targetAngle - this.angle) * (1 - Math.exp(-9 * dt));

    // 4. Столкновение с потолком
    if (this.y < this.ceilingY) {
      this.y = this.ceilingY;
      if (this.vy < 0) this.vy = 0;
    }

    // 5. Краш о землю
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.triggerStun();
    }
  }

  render(ctx) {
    ctx.save();

    // 1. Частицы пыли при ударе
    for (const d of this.dustParticles) {
      ctx.fillStyle = `rgba(215, 220, 225, ${d.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Воздушные струи планирования
    if (this.windStreaks.length > 0) {
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      for (const s of this.windStreaks) {
        ctx.strokeStyle = `rgba(186, 230, 253, ${s.alpha})`;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.length, s.y);
        ctx.stroke();
      }
    }

    // 3. Частицы взмаха
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(235, 240, 245, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Тень на полу
    const shadowDist = this.groundY - this.y;
    const scaleRatio = this.scale / 0.10;
    if (shadowDist >= 0 && shadowDist < 420) {
      const shadowRatio = 1 - shadowDist / 420;
      const shadowW = (26 + 14 * shadowRatio) * scaleRatio;
      const shadowH = (this.isStunned ? 7 : 5) * shadowRatio * scaleRatio;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.14 + 0.28 * shadowRatio})`;
      ctx.beginPath();
      ctx.ellipse(this.x + 2, this.groundY + 12, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Отрисовка спрайта птицы
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const drawW = 1280 * this.scale;
    const drawH = 720 * this.scale;

    let currentSprite = null;
    if (this.isStunned) {
      currentSprite = this.stunSprite;
    } else if (this.isGliding && this.glideSprites.length > 0) {
      const gIndex = Math.floor(this.glideFrameIndex) % this.totalGlideFrames;
      currentSprite = this.glideSprites[gIndex];
    } else {
      const fIndex = Math.floor(this.frameIndex) % this.totalFlapFrames;
      currentSprite = this.flapSprites[fIndex];
    }

    if (currentSprite && currentSprite.complete && currentSprite.naturalWidth > 0) {
      ctx.drawImage(currentSprite, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
    } else {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 6. Звёздочки над головой при оглушении
    if (this.isStunned) {
      this.renderDizzyStars(ctx);
    }
  }

  renderDizzyStars(ctx) {
    const starCount = 3;
    const scaleRatio = this.scale / 0.10;
    const centerX = this.x + 3 * scaleRatio;
    const centerY = this.y - 18 * scaleRatio;
    const radiusX = 14 * scaleRatio;
    const radiusY = 5 * scaleRatio;

    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const angle = this.stunStarsAngle + (i * (Math.PI * 2 / starCount));
      const sx = centerX + Math.cos(angle) * radiusX;
      const sy = centerY + Math.sin(angle) * radiusY;
      const starScale = 1 + 0.2 * Math.sin(angle * 2);

      this.drawPixelStar(ctx, sx, sy, 3.5 * starScale * scaleRatio);
    }
    ctx.restore();
  }

  drawPixelStar(ctx, cx, cy, size) {
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    const inner = size * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + inner, cy - inner);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx + inner, cy + inner);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - inner, cy + inner);
    ctx.lineTo(cx - size, cy);
    ctx.lineTo(cx - inner, cy - inner);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }
}