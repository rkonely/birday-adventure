import { audio } from '../core/AudioManager.js';

/**
 * Конфигурация уникальной баллистики для каждого типа яиц
 */
export const EGG_CONFIGS = {
  Default: { gravity: 720, speedMult: 1.00, drag: 0.02, scale: 1.0, bounces: 0, color: '#e2e8f0' },
  Blue:    { gravity: 480, speedMult: 1.22, drag: 0.00, scale: 0.95, bounces: 0, color: '#38bdf8' }, // Снайперское (настильная траектория)
  Pink:    { gravity: 680, speedMult: 1.00, drag: 0.02, scale: 1.0, bounces: 1, color: '#f472b6' }, // Прыгучее (1 отскок от земли)
  Purple:  { gravity: 380, speedMult: 0.88, drag: 0.05, scale: 1.05, bounces: 0, color: '#c084fc' }, // Парящее (медленное падение)
  Red:     { gravity: 980, speedMult: 0.92, drag: 0.01, scale: 1.20, bounces: 0, color: '#f87171' }, // Тяжёлое ядро
  Gold:    { gravity: 820, speedMult: 1.12, drag: 0.01, scale: 1.10, bounces: 0, color: '#facc15' }  // Золотое
};

/**
 * Класс отдельного летящего яйца
 */
export class Egg {
  constructor(x, y, vx, vy, typeKey, sprite, groundY = 660) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.typeKey = typeKey;
    this.sprite = sprite;

    const cfg = EGG_CONFIGS[typeKey] || EGG_CONFIGS.Default;
    this.config = cfg;

    this.width = 18 * cfg.scale;
    this.height = 24 * cfg.scale;
    this.angle = Math.atan2(vy, vx) + Math.PI * 0.5;
    this.rotationSpeed = (vx >= 0 ? 1 : -1) * (4 + Math.random() * 4);

    this.gravity = cfg.gravity;
    this.drag = cfg.drag;
    this.bouncesLeft = cfg.bounces;

    this.groundY = groundY;
    this.isBroken = false;
    this.splatLife = 4.0;

    this.sparkleTimer = 0;
    this.shards = [];
    this.sparkles = [];
  }

  removeParticle(arr, idx) {
    arr[idx] = arr[arr.length - 1];
    arr.pop();
  }

  updateParticles(dt) {
    // Обновление золотых искр (работает И в полёте, И после разбития)
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      if (sp.life <= 0) {
        this.removeParticle(this.sparkles, i);
      } else {
        sp.alpha = (sp.life / sp.maxLife) * 0.95;
      }
    }

    // Обновление осколков скорлупы
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 600 * dt;
      s.life -= dt;
      if (s.life <= 0) {
        this.removeParticle(this.shards, i);
      } else {
        s.alpha = (s.life / s.maxLife) * 0.9;
      }
    }
  }

  update(dt) {
    this.updateParticles(dt);

    if (this.isBroken) {
      this.splatLife -= dt;
      return;
    }

    // Баллистика с учётом сопротивления воздуха и гравитации конкретного типа яйца
    if (this.drag > 0) {
      const airFactor = Math.max(0, 1 - this.drag * dt);
      this.vx *= airFactor;
    }
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Вращение ускоряется пропорционально скорости полёта
    const speedRatio = Math.hypot(this.vx, this.vy) / 425;
    this.angle += this.rotationSpeed * Math.max(0.6, speedRatio) * dt;

    // Золотой след в полёте (фиксированный интервал вместо Math.random() на каждый кадр)
    if (this.typeKey === 'Gold') {
      this.sparkleTimer += dt;
      while (this.sparkleTimer >= 0.03) {
        this.sparkleTimer -= 0.03;
        const maxLife = 0.35 + Math.random() * 0.15;
        this.sparkles.push({
          x: this.x + (Math.random() * 10 - 5),
          y: this.y + (Math.random() * 10 - 5),
          vx: (Math.random() - 0.5) * 40,
          vy: -20 - Math.random() * 30,
          size: 3 + Math.random() * 3,
          alpha: 0.9,
          life: maxLife,
          maxLife
        });
      }
    }

    // Проверка столкновения с землей
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      if (this.bouncesLeft > 0 && Math.abs(this.vy) > 120) {
        // Упругий отскок (для Pink яйца)
        this.bouncesLeft--;
        this.vy = -this.vy * 0.55;
        this.vx *= 0.82;
        this.rotationSpeed *= -1.2;
        audio.playEggThrow();
      } else {
        this.shatter();
      }
    }
  }

  shatter() {
    this.isBroken = true;
    audio.playEggSplat();

    const shardCount = this.typeKey === 'Red' ? 12 : 8;
    const col = this.config.color;

    // Учитываем горизонтальную инерцию яйца при разлёте осколков
    const impactCarryVx = this.vx * 0.25;

    for (let i = 0; i < shardCount; i++) {
      const ang = Math.random() * Math.PI;
      const spd = 70 + Math.random() * 140;
      const maxLife = 0.4 + Math.random() * 0.3;
      this.shards.push({
        x: this.x,
        y: this.y + 4,
        vx: impactCarryVx + Math.cos(ang) * (i % 2 === 0 ? 1 : -1) * spd,
        vy: -Math.sin(ang) * spd * 0.85,
        size: 2.5 + Math.random() * 3.5,
        color: col,
        alpha: 0.9,
        life: maxLife,
        maxLife
      });
    }

    if (this.typeKey === 'Gold') {
      audio.playGoldJingle();
      for (let i = 0; i < 16; i++) {
        const maxLife = 0.6 + Math.random() * 0.4;
        this.sparkles.push({
          x: this.x,
          y: this.y,
          vx: impactCarryVx * 0.5 + (Math.random() - 0.5) * 180,
          vy: -60 - Math.random() * 120,
          size: 4 + Math.random() * 4,
          alpha: 1.0,
          life: maxLife,
          maxLife
        });
      }
    }
  }

  render(ctx) {
    ctx.save();

    // 1. Искры
    for (const sp of this.sparkles) {
      ctx.fillStyle = `rgba(250, 204, 21, ${sp.alpha})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Если разбито — рисуем пятно желтка и осколки
    if (this.isBroken) {
      const splatAlpha = Math.min(1, this.splatLife / 1.0);

      // Желток на земле
      ctx.fillStyle = `rgba(245, 158, 11, ${0.75 * splatAlpha})`;
      ctx.beginPath();
      ctx.ellipse(this.x, this.groundY + 8, 18 * this.config.scale, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Белок
      ctx.fillStyle = `rgba(254, 240, 138, ${0.85 * splatAlpha})`;
      ctx.beginPath();
      ctx.ellipse(this.x + 2, this.groundY + 7, 9 * this.config.scale, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Осколки
      for (const sh of this.shards) {
        ctx.fillStyle = sh.color;
        ctx.globalAlpha = sh.alpha * splatAlpha;
        ctx.fillRect(sh.x, sh.y, sh.size, sh.size);
      }
      ctx.restore();
      return;
    }

    // 3. Тень от летящего яйца
    const shadowDist = this.groundY - this.y;
    if (shadowDist > 0 && shadowDist < 500) {
      const ratio = 1 - shadowDist / 500;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.12 * ratio})`;
      ctx.beginPath();
      ctx.ellipse(this.x, this.groundY + 6, 12 * ratio * this.config.scale, 3.5 * ratio, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Отрисовка самого яйца
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
      ctx.drawImage(
        this.sprite,
        -this.width * 0.5,
        -this.height * 0.5,
        this.width,
        this.height
      );
    } else {
      ctx.fillStyle = this.config.color || '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width * 0.5, this.height * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Менеджер управления яйцами, замедлением времени (Slo-Mo) и прицеливанием
 */
export class EggManager {
  constructor() {
    this.sprites = {};
    this.types = ['Default', 'Blue', 'Pink', 'Purple', 'Red', 'Gold'];
    this.loadedCount = 0;
    this.totalSprites = this.types.length;
    this.isLoaded = false;

    this.eggs = [];

    // Система прицеливания и Slo-Mo
    this.isAiming = false;
    this.aimDuration = 1.0;
    this.aimTimer = 0;
    this.aimStartX = 0;
    this.aimStartY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.birdVx = 0;
    this.birdVy = 0;
    this.throwForce = 425;

    this.timeScale = 1.0;

    // Статистика и тип следующего броска
    this.eggsThrown = 0;
    this.goldEggsThrown = 0;
    this.currentEggType = 'Default';
    this.lockedType = false; // Если игрок выбрал тип вручную через selectType

    this.preloadSprites();
  }

  selectType(type) {
    if (this.types.includes(type)) {
      this.currentEggType = type;
      this.lockedType = true;
    }
  }

  rollNextEggType() {
    if (this.lockedType) return this.currentEggType;
    if (Math.random() < 0.20) {
      return 'Gold';
    }
    const nonGold = ['Default', 'Blue', 'Pink', 'Purple', 'Red'];
    return nonGold[Math.floor(Math.random() * nonGold.length)];
  }

  preloadSprites() {
    this.types.forEach((type) => {
      const img = new Image();
      img.src = `assets/First-Level/Item/Egg/${type}-Egg.png`;
      img.onload = () => {
        this.loadedCount++;
        if (this.loadedCount >= this.totalSprites) {
          this.isLoaded = true;
          console.log('🥚 [EggManager] Все 6 типов яиц успешно загружены!');
        }
      };
      img.onerror = () => {
        console.warn(`[EggManager] Не удалось загрузить ${type}-Egg.png`);
      };
      this.sprites[type] = img;
    });
  }

  /**
   * Единый расчёт начальной скорости броска (используется И для броска, И для превью траектории)
   */
  calculateLaunchVelocity(birdVx = this.birdVx, birdVy = this.birdVy) {
    const dx = this.targetX - this.aimStartX;
    const dy = this.targetY - this.aimStartY;
    const dist = Math.max(10, Math.hypot(dx, dy));

    const dirX = dx / dist;
    const dirY = dy / dist;

    // Плавная регулировка силы броска от расстояния курсора (от 75% вблизи до 120% вдали)
    const distancePower = Math.min(1.20, Math.max(0.75, dist / 260));
    const cfg = EGG_CONFIGS[this.currentEggType] || EGG_CONFIGS.Default;
    const effectiveForce = this.throwForce * cfg.speedMult * distancePower;

    return {
      vx: dirX * effectiveForce + birdVx * 0.35,
      vy: dirY * effectiveForce + birdVy * 0.15,
      cfg
    };
  }

  startAiming(birdX, birdY, mouseX, mouseY, birdVx = 0, birdVy = 0) {
    if (this.isAiming) return;

    this.isAiming = true;
    this.aimDuration = 1.0;
    this.aimTimer = this.aimDuration;
    this.timeScale = 0.05;
    this.aimStartX = birdX;
    this.aimStartY = birdY + 10;
    this.targetX = mouseX;
    this.targetY = mouseY;
    this.birdVx = birdVx;
    this.birdVy = birdVy;

    // Генерируем тип яйца ДО броска, чтобы траектория сразу учитывала его гравитацию и скорость
    this.currentEggType = this.rollNextEggType();

    audio.playSloMoEnter();
  }

  updateAimCoords(birdX, birdY, mouseX, mouseY, birdVx = this.birdVx, birdVy = this.birdVy) {
    if (!this.isAiming) return;
    this.aimStartX = birdX;
    this.aimStartY = birdY + 10;
    this.targetX = mouseX;
    this.targetY = mouseY;
    this.birdVx = birdVx;
    this.birdVy = birdVy;
  }

  releaseAndThrow(birdVx = this.birdVx, birdVy = this.birdVy) {
    if (!this.isAiming) return;

    this.isAiming = false;
    this.timeScale = 1.0;

    const chosenType = this.currentEggType;
    if (chosenType === 'Gold') {
      this.goldEggsThrown++;
    }

    const { vx: eggVx, vy: eggVy } = this.calculateLaunchVelocity(birdVx, birdVy);

    const sprite = this.sprites[chosenType];
    const egg = new Egg(
      this.aimStartX,
      this.aimStartY,
      eggVx,
      eggVy,
      chosenType,
      sprite,
      this.groundY || 660
    );
    this.eggs.push(egg);
    this.eggsThrown++;

    audio.playEggThrow();
    if (chosenType === 'Gold') {
      audio.playGoldJingle();
    }

    if (this.onThrowCallback) {
      this.onThrowCallback(chosenType);
    }
  }

  cancelAiming() {
    this.isAiming = false;
    this.timeScale = 1.0;
  }

  update(dt, birdX, birdY, mouseX, mouseY, birdVx = 0, birdVy = 0) {
    // 1. Таймер замедления времени тикает в реальном dt
    if (this.isAiming) {
      this.updateAimCoords(birdX, birdY, mouseX, mouseY, birdVx, birdVy);
      this.aimTimer -= dt;
      if (this.aimTimer <= 0) {
        this.releaseAndThrow(birdVx, birdVy);
      }
    }

    // 2. Летящие в мире яйца замедляются при активном Slo-Mo
    const worldDt = this.isAiming ? dt * this.timeScale : dt;
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      const egg = this.eggs[i];
      egg.update(worldDt);
      if (egg.isBroken && egg.splatLife <= 0) {
        this.eggs.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const egg of this.eggs) {
      egg.render(ctx);
    }

    if (this.isAiming) {
      this.renderAimingInterface(ctx);
    }
  }

  renderAimingInterface(ctx) {
    ctx.save();

    const startX = this.aimStartX;
    const startY = this.aimStartY;
    const targetX = this.targetX;
    const targetY = this.targetY;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);

    // 1. Точная прогнозируемая траектория (с учётом скорости птицы и типа текущего яйца)
    const { vx: launchVx, vy: launchVy, cfg } = this.calculateLaunchVelocity();
    const steps = 20;
    const stepDt = 0.04;
    const maxGroundY = this.groundY || 660;

    let px = startX;
    let py = startY;
    let vx = launchVx;
    let vy = launchVy;

    const trajectoryPoints = [{ x: px, y: py }];
    for (let i = 0; i < steps; i++) {
      if (cfg.drag > 0) {
        vx *= Math.max(0, 1 - cfg.drag * stepDt);
      }
      vy += cfg.gravity * stepDt;
      px += vx * stepDt;
      py += vy * stepDt;

      if (py >= maxGroundY) {
        trajectoryPoints.push({ x: px, y: maxGroundY });
        break;
      }
      trajectoryPoints.push({ x: px, y: py });
    }

    // Тень под траекторией
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 4.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(trajectoryPoints[0].x, trajectoryPoints[0].y);
    for (let i = 1; i < trajectoryPoints.length; i++) {
      ctx.lineTo(trajectoryPoints[i].x, trajectoryPoints[i].y);
    }
    ctx.stroke();

    // Основная линия траектории
    ctx.strokeStyle = '#4ad3b7';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#4ad3b7';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // Светящиеся маркеры вдоль траектории
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#4ad3b7';
    ctx.shadowBlur = 6;
    for (let i = 2; i < trajectoryPoints.length; i += 2) {
      const pt = trajectoryPoints[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Стрелка направления броска
    const arrowLen = Math.min(120, Math.max(50, dist * 0.45));
    const arrowEndX = startX + Math.cos(angle) * arrowLen;
    const arrowEndY = startY + Math.sin(angle) * arrowLen;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.stroke();

    ctx.strokeStyle = '#4ad3b7';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#4ad3b7';
    ctx.shadowBlur = 9;
    ctx.stroke();

    const headLen = 15;
    ctx.fillStyle = '#4ad3b7';
    ctx.shadowColor = '#4ad3b7';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(
      arrowEndX - headLen * Math.cos(angle - Math.PI / 6),
      arrowEndY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowEndX - headLen * Math.cos(angle + Math.PI / 6),
      arrowEndY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Круг таймера Slo-Mo вокруг птицы
    const timerRatio = Math.max(0, this.aimTimer / this.aimDuration);
    const ringRadius = 48;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(startX, startY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(74, 211, 183, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(startX, startY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = timerRatio > 0.25 ? '#4ad3b7' : '#ef4444';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = timerRatio > 0.25 ? '#4ad3b7' : '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(startX, startY, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerRatio);
    ctx.stroke();

    // Текстовая метка таймера и подсказка типа заряженного яйца
    ctx.font = 'bold 12px "8bitoperator", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(`${(this.aimTimer).toFixed(1)}s`, startX + 1, startY - ringRadius - 7);
    ctx.fillStyle = timerRatio > 0.25 ? '#4ad3b7' : '#f87171';
    ctx.fillText(`${(this.aimTimer).toFixed(1)}s`, startX, startY - ringRadius - 8);
    ctx.restore();

    ctx.restore();
  }
}