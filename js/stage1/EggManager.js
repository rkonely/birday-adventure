import { audio } from '../core/AudioManager.js';

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

    this.width = 18;
    this.height = 24;
    this.angle = 0;
    this.rotationSpeed = (vx >= 0 ? 1 : -1) * (5 + Math.random() * 4); // Вращение в полете

    this.gravity = 720;
    this.groundY = groundY;
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
    this.throwForce = 425; // Базовая скорость полета яйца (425 пикс/сек по умолчанию)

    // Текущий фактор времени (1.0 = нормальная скорость, 0.12 = слоумо)
    this.timeScale = 1.0;

    // Статистика
    this.eggsThrown = 0;
    this.goldEggsThrown = 0;
    this.currentEggType = 'Default';

    this.preloadSprites();
  }

  selectType(type) {
    if (this.types.includes(type)) {
      this.currentEggType = type;
    }
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
    this.aimDuration = 1.0; // 1 секунда застывания и прицеливания
    this.aimTimer = this.aimDuration;
    this.timeScale = 0.05; // Застывание птицы и мира в воздухе при прицеливании (Slo-Mo)
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
    const egg = new Egg(this.aimStartX, this.aimStartY, eggVx, eggVy, chosenType, sprite, this.groundY || 660);
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

    // 1. Прогнозируемая траектория полета (высококонтрастная дуга #4ad3b7 вместо желтой)
    const steps = 18;
    const stepDt = 0.042;
    const speed = this.throwForce;
    const vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    let px = startX;
    let py = startY;

    const trajectoryPoints = [{ x: px, y: py }];
    for (let i = 0; i < steps; i++) {
      px += vx * stepDt;
      vy += 720 * stepDt;
      py += vy * stepDt;
      if (py > (this.groundY || 660)) {
        trajectoryPoints.push({ x: px, y: this.groundY || 660 });
        break;
      }
      trajectoryPoints.push({ x: px, y: py });
    }

    // Тень под траекторией для идеальной видимости на желто-оранжевом фоне леса
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

    // Основная яркая линия траектории в цвете энергии #4ad3b7
    ctx.strokeStyle = '#4ad3b7';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#4ad3b7';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // Светящиеся маркеры вдоль траектории
    for (let i = 2; i < trajectoryPoints.length; i += 2) {
      const pt = trajectoryPoints[i];
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#4ad3b7';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Стрелка направления броска (#4ad3b7)
    const arrowLen = Math.min(120, Math.max(50, dist * 0.45));
    const arrowEndX = startX + Math.cos(angle) * arrowLen;
    const arrowEndY = startY + Math.sin(angle) * arrowLen;

    // Тень стрелки
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.stroke();

    // Свечение стрелки в стиле энергии
    ctx.strokeStyle = '#4ad3b7';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#4ad3b7';
    ctx.shadowBlur = 9;
    ctx.stroke();

    // Наконечник стрелки
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

    // 3. Увеличенный круг таймера Slo-Mo вокруг птицы (радиус 48px, цвет #4ad3b7)
    const timerRatio = Math.max(0, this.aimTimer / this.aimDuration);
    const ringRadius = 48; // Увеличенный размер круга

    ctx.save();
    // Контрастный черный ободок
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(startX, startY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Полупрозрачная фоновая шкала кольца
    ctx.strokeStyle = 'rgba(74, 211, 183, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(startX, startY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Активная дуга таймера с ярким свечением #4ad3b7
    ctx.strokeStyle = timerRatio > 0.25 ? '#4ad3b7' : '#ef4444';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = timerRatio > 0.25 ? '#4ad3b7' : '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(startX, startY, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerRatio);
    ctx.stroke();

    // Текстовая метка таймера с четкой обводкой
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
