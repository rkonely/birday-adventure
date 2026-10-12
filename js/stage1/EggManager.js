import { audio } from '../core/AudioManager.js';

/**
 * Класс отдельного летящего яйца
 */
export class Egg {
  constructor(x, y, vx, vy, typeKey, sprite) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.typeKey = typeKey;
    this.sprite = sprite;

    this.width = 18;
    this.height = 24;
    this.angle = 0;
    this.rotationSpeed = (vx >= 0 ? 1 : -1) * (5 + Math.random() * 4); // Вращение в полете

    this.gravity = 720;
    this.groundY = 595;
    this.isBroken = false;
    this.life = 6.0; // Общее время жизни
    this.splatLife = 4.0; // Время отображения разбитого пятна

    // Осколки и брызги
    this.shards = [];
    this.sparkles = [];
  }

  update(dt) {
    if (this.isBroken) {
      this.splatLife -= dt;
      // Обновление осколков
      for (let i = this.shards.length - 1; i >= 0; i--) {
        const s = this.shards[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 600 * dt;
        s.life -= dt;
        s.alpha = Math.max(0, s.life / 0.5);
        if (s.life <= 0) this.shards.splice(i, 1);
      }
      // Золотые искры
      for (let i = this.sparkles.length - 1; i >= 0; i--) {
        const sp = this.sparkles[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        sp.alpha = Math.max(0, sp.life / 0.6);
        if (sp.life <= 0) this.sparkles.splice(i, 1);
      }
      return;
    }

    // Баллистика
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.rotationSpeed * dt;

    // Золотой след в полёте
    if (this.typeKey === 'Gold' && Math.random() < 0.5) {
      this.sparkles.push({
        x: this.x + (Math.random() * 10 - 5),
        y: this.y + (Math.random() * 10 - 5),
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 30,
        size: 3 + Math.random() * 3,
        alpha: 0.9,
        life: 0.4
      });
    }

    // Проверка столкновения с землей
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.shatter();
    }
  }

  shatter() {
    this.isBroken = true;
    audio.playEggSplat();

    // Создаем разлетающиеся осколки скорлупы
    const shardCount = 8;
    const shardColors = {
      Default: '#e2e8f0',
      Blue: '#38bdf8',
      Pink: '#f472b6',
      Purple: '#c084fc',
      Red: '#f87171',
      Gold: '#facc15'
    };
    const col = shardColors[this.typeKey] || '#ffffff';

    for (let i = 0; i < shardCount; i++) {
      const ang = Math.random() * Math.PI;
      const spd = 70 + Math.random() * 140;
      this.shards.push({
        x: this.x,
        y: this.y + 4,
        vx: Math.cos(ang) * (i % 2 === 0 ? 1 : -1) * spd,
        vy: -Math.sin(ang) * spd * 0.8,
        size: 2.5 + Math.random() * 3.5,
        color: col,
        alpha: 0.9,
        life: 0.4 + Math.random() * 0.3
      });
    }

    // Если золотое — фонтан золотых искр!
    if (this.typeKey === 'Gold') {
      audio.playGoldJingle();
      for (let i = 0; i < 16; i++) {
        this.sparkles.push({
          x: this.x,
          y: this.y,
          vx: (Math.random() - 0.5) * 180,
          vy: -60 - Math.random() * 120,
          size: 4 + Math.random() * 4,
          alpha: 1.0,
          life: 0.6 + Math.random() * 0.4
        });
      }
    }
  }

  render(ctx) {
    // 1. Искры
    for (const sp of this.sparkles) {
      ctx.save();
      ctx.fillStyle = `rgba(250, 204, 21, ${sp.alpha})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Если разбито — рисуем пятно желтка и осколки
    if (this.isBroken) {
      const splatAlpha = Math.min(1, this.splatLife / 1.0);
      ctx.save();

      // Желток на земле
      ctx.fillStyle = `rgba(245, 158, 11, ${0.75 * splatAlpha})`;
      ctx.beginPath();
      ctx.ellipse(this.x, this.groundY + 8, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Белок
      ctx.fillStyle = `rgba(254, 240, 138, ${0.85 * splatAlpha})`;
      ctx.beginPath();
      ctx.ellipse(this.x + 2, this.groundY + 7, 9, 3.5, 0, 0, Math.PI * 2);
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
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${0.12 * ratio})`;
      ctx.beginPath();
      ctx.ellipse(this.x, this.groundY + 6, 12 * ratio, 3.5 * ratio, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Отрисовка самого яйца
    ctx.save();
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
      // Запасной рендер
      ctx.fillStyle = '#fef08a';
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

    // Список активных яиц
    this.eggs = [];

    // Система прицеливания и Slo-Mo
    this.isAiming = false;
    this.aimDuration = 1.0; // 1 секунда замедления времени
    this.aimTimer = 0;
    this.aimStartX = 0;
    this.aimStartY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.throwForce = 700; // Базовая скорость полета яйца (пикс/сек)

    // Текущий фактор времени (1.0 = нормальная скорость, 0.12 = слоумо)
    this.timeScale = 1.0;

    // Статистика
    this.eggsThrown = 0;
    this.goldEggsThrown = 0;

    this.preloadSprites();
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
   * Старт прицеливания (при нажатии Пробела)
   */
  startAiming(birdX, birdY, mouseX, mouseY) {
    if (this.isAiming) return;

    this.isAiming = true;
    this.aimTimer = this.aimDuration;
    this.timeScale = 0.12; // Замедление времени до 12% скорости!
    this.aimStartX = birdX;
    this.aimStartY = birdY + 10;
    this.targetX = mouseX;
    this.targetY = mouseY;

    audio.playSloMoEnter();
  }

  /**
   * Обновление координат курсора во время прицеливания
   */
  updateAimCoords(birdX, birdY, mouseX, mouseY) {
    if (!this.isAiming) return;
    this.aimStartX = birdX;
    this.aimStartY = birdY + 10;
    this.targetX = mouseX;
    this.targetY = mouseY;
  }

  /**
   * Завершение прицеливания и запуск яйца (отпускание Пробела или клик)
   */
  releaseAndThrow(birdVx = 0, birdVy = 0) {
    if (!this.isAiming) return;

    this.isAiming = false;
    this.timeScale = 1.0; // Возврат нормального течения времени

    // Расчет вектора направления
    const dx = this.targetX - this.aimStartX;
    const dy = this.targetY - this.aimStartY;
    let dist = Math.hypot(dx, dy);
    if (dist < 10) dist = 10;

    const dirX = dx / dist;
    const dirY = dy / dist;

    // Выбираем тип яйца: 20% шанс на Gold, остальные равновероятно
    let chosenType = 'Default';
    const roll = Math.random();
    if (roll < 0.20) {
      chosenType = 'Gold';
      this.goldEggsThrown++;
    } else {
      const nonGold = ['Default', 'Blue', 'Pink', 'Purple', 'Red'];
      chosenType = nonGold[Math.floor(Math.random() * nonGold.length)];
    }

    // Скорость с учетом инерции птицы
    const eggVx = dirX * this.throwForce + birdVx * 0.35;
    const eggVy = dirY * this.throwForce + birdVy * 0.15;

    const sprite = this.sprites[chosenType];
    const egg = new Egg(this.aimStartX, this.aimStartY, eggVx, eggVy, chosenType, sprite);
    this.eggs.push(egg);
    this.eggsThrown++;

    audio.playEggThrow();

    if (chosenType === 'Gold') {
      audio.playGoldJingle();
    }
  }

  /**
   * Сброс прицеливания без броска
   */
  cancelAiming() {
    this.isAiming = false;
    this.timeScale = 1.0;
  }

  update(dt, birdX, birdY, mouseX, mouseY, birdVx, birdVy) {
    // 1. Таймер замедления времени
    if (this.isAiming) {
      this.updateAimCoords(birdX, birdY, mouseX, mouseY);
      // Таймер тикает в реальном времени (не замедляясь)
      this.aimTimer -= dt;
      if (this.aimTimer <= 0) {
        // Если истекла 1 секунда — автоматический бросок в текущее направление!
        this.releaseAndThrow(birdVx, birdVy);
      }
    }

    // 2. Обновление всех летящих и разбитых яиц
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      const egg = this.eggs[i];
      egg.update(dt);
      if (egg.isBroken && egg.splatLife <= 0) {
        this.eggs.splice(i, 1);
      }
    }
  }

  /**
   * Отрисовка яиц, прицела со стрелочкой и кругового таймера
   */
  render(ctx) {
    // 1. Отрисовка всех яиц на поле
    for (const egg of this.eggs) {
      egg.render(ctx);
    }

    // 2. Если активно прицеливание — рисуем интерфейс прицеливания (Стрелка + Траектория + Таймер)
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

    // 1. Прогнозируемая траектория полета (пунктирная дуга с гравитацией)
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    const steps = 14;
    const stepDt = 0.045;
    const speed = this.throwForce;
    const vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    let px = startX;
    let py = startY;

    for (let i = 0; i < steps; i++) {
      px += vx * stepDt;
      vy += 720 * stepDt;
      py += vy * stepDt;
      if (py > 595) break;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Стрелка прицела от птицы к направлению курсора
    const arrowLen = Math.min(110, Math.max(50, dist * 0.45));
    const arrowEndX = startX + Math.cos(angle) * arrowLen;
    const arrowEndY = startY + Math.sin(angle) * arrowLen;

    // Свечение стрелки
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.stroke();

    // Наконечник стрелки
    const headLen = 14;
    ctx.fillStyle = '#facc15';
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

    // 3. Круговой индикатор таймера Slo-Mo (1 секунда)
    const timerRatio = Math.max(0, this.aimTimer / this.aimDuration);
    const ringRadius = 24;

    // Фоновое кольцо
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(startX, startY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Заполненная дуга таймера
    ctx.strokeStyle = timerRatio > 0.3 ? '#facc15' : '#ef4444';
    ctx.beginPath();
    ctx.arc(startX, startY, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerRatio);
    ctx.stroke();

    // Текстовая метка
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(`${(this.aimTimer).toFixed(1)}s`, startX, startY - ringRadius - 6);

    ctx.restore();
  }
}
