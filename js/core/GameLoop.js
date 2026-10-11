/**
 * GameLoop — игровой цикл с фиксированным шагом физики (Fixed Timestep Accumulator)
 * Гарантирует абсолютно одинаковую физику полета и поведения на любых мониторах (60/120/144/240Hz)
 */
export class GameLoop {
  constructor(updateFn, renderFn, fixedDeltaTime = 1 / 60) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.fixedDt = fixedDeltaTime; // 60 тиков физики в секунду (~16.66ms)

    this.isRunning = false;
    this.accumulator = 0;
    this.lastTime = 0;
    this.rafId = null;

    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    let frameTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Защита от "спирали смерти" при сворачивании вкладки (максимум 0.25 сек)
    if (frameTime > 0.25) {
      frameTime = 0.25;
    }

    this.accumulator += frameTime;

    // Выполняем физические обновления с фиксированным шагом fixedDt
    while (this.accumulator >= this.fixedDt) {
      this.updateFn(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Рендерим кадр (alpha интерполяция для супер-плавности)
    const alpha = this.accumulator / this.fixedDt;
    this.renderFn(alpha);

    this.rafId = requestAnimationFrame(this.loop);
  }
}
