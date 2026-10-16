/**
 * BoardQuestModal.js — Интерактивное модальное окно заданий, мини-игр и уведомлений
 * Использует фирменную графику проекта:
 * - Big Frame.png / Good / Bad рамки
 * - Cut-Scene-Boardgame.png для обрамления видео
 * - Boardgame-UI-Answer.png и Leaf Green Button.png для кнопок
 * - Иконки ресурсов из assets/ для графических оповещений об эффектах
 */

import { audio } from '../core/AudioManager.js';
import { ANIMAL_QUIZ_QUESTIONS, BOARD_ASSET_ICONS } from './boardEventsData.js';

export class BoardQuestModal {
  constructor(eventManager) {
    this.eventManager = eventManager;
    this.modalEl = null;
    this.currentEvent = null;
    this.onCompleteCallback = null;

    this.strongmanAnimId = null;
    this.timestopTimerId = null;
    this.clawAnimId = null;
    this.lockpickAnimId = null;

    this.injectCustomStyles();
    this.createDOM();
  }

  /**
   * Встроенные стили для новых мини-игр и плашек оповещений в стилистике пергамента и дерева
   */
  injectCustomStyles() {
    if (document.getElementById('board-quest-enhanced-styles')) return;
    const style = document.createElement('style');
    style.id = 'board-quest-enhanced-styles';
    style.textContent = `
      /* Карточка оповещения о полученном эффекте */
      .board-effect-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin: 10px auto 6px;
        padding: 12px 22px;
        max-width: 520px;
        border-radius: 10px;
        border: 2px solid #8c6d46;
        background: linear-gradient(180deg, rgba(44, 33, 22, 0.94) 0%, rgba(26, 19, 12, 0.98) 100%);
        box-shadow: 0 6px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,220,160,0.25);
        animation: effectBannerPop 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      }
      .board-effect-banner.effect-good {
        border-color: #2ec4b6;
        box-shadow: 0 6px 20px rgba(46, 196, 182, 0.25), inset 0 0 12px rgba(46, 196, 182, 0.15);
      }
      .board-effect-banner.effect-bad {
        border-color: #e63946;
        box-shadow: 0 6px 20px rgba(230, 57, 70, 0.28), inset 0 0 12px rgba(230, 57, 70, 0.18);
      }
      .board-effect-icon-wrap {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.16);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .board-effect-icon-wrap img {
        width: 34px;
        height: 34px;
        object-fit: contain;
        image-rendering: pixelated;
      }
      .board-effect-info {
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .board-effect-label {
        font-size: 11px;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #cbb89d;
      }
      .board-effect-title {
        font-size: 17px;
        font-weight: bold;
        color: #ffd166;
      }
      .board-effect-banner.effect-bad .board-effect-title {
        color: #ff6b6b;
      }
      .board-effect-sub {
        font-size: 13px;
        color: #e9dfd0;
      }
      @keyframes effectBannerPop {
        0% { transform: scale(0.86) translateY(8px); opacity: 0; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }

      /* Мини-игра: Колесо Фортуны */
      .wheel-minigame-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        margin-top: 4px;
      }
      .wheel-stage-box {
        position: relative;
        width: 210px;
        height: 210px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .wheel-pointer-arrow {
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 11px solid transparent;
        border-right: 11px solid transparent;
        border-top: 20px solid #ffd166;
        filter: drop-shadow(0 3px 4px rgba(0,0,0,0.7));
        z-index: 5;
      }
      .wheel-disc {
        width: 196px;
        height: 196px;
        border-radius: 50%;
        border: 6px solid #5c3d1e;
        box-shadow: 0 6px 16px rgba(0,0,0,0.55), inset 0 0 12px rgba(0,0,0,0.5);
        position: relative;
        transition: transform 3.4s cubic-bezier(0.14, 0.88, 0.22, 1);
        background: conic-gradient(
          #2a6f4e 0deg 60deg,
          #7c4d25 60deg 120deg,
          #1f5c7a 120deg 180deg,
          #8f2d38 180deg 240deg,
          #9c6b19 240deg 300deg,
          #4f3b6b 300deg 360deg
        );
      }
      .wheel-center-hub {
        position: absolute;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: radial-gradient(circle, #ffd166 0%, #9c6b19 100%);
        border: 3px solid #3d2610;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 3;
      }
      .wheel-legend-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px 12px;
        font-size: 12px;
        color: #3a2615;
        background: rgba(58, 38, 21, 0.08);
        padding: 6px 12px;
        border-radius: 6px;
      }

      /* Мини-игра: Механический кран и Взлом замка */
      .claw-track-box, .lockpick-track-box {
        width: 100%;
        max-width: 440px;
        margin: 8px auto;
        padding: 12px;
        background: rgba(34, 24, 15, 0.85);
        border: 2px solid #7c5832;
        border-radius: 10px;
        color: #f4ece1;
      }
      .claw-rail {
        position: relative;
        height: 58px;
        background: rgba(0,0,0,0.4);
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.12);
      }
      .claw-target-zone {
        position: absolute;
        top: 0;
        bottom: 0;
        background: rgba(46, 196, 182, 0.25);
        border-left: 2px dashed #2ec4b6;
        border-right: 2px dashed #2ec4b6;
      }
      .claw-head {
        position: absolute;
        top: 6px;
        width: 28px;
        height: 44px;
        transform: translateX(-50%);
        background: linear-gradient(180deg, #ffd166 0%, #b57c1e 100%);
        border: 2px solid #2b1d0e;
        border-radius: 4px;
      }
      .lockpick-pins-row {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-bottom: 8px;
      }
      .lockpick-pin-badge {
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
      }
      .lockpick-pin-badge.locked {
        background: rgba(46, 196, 182, 0.3);
        border-color: #2ec4b6;
        color: #a8fff7;
      }
    `;
    document.head.appendChild(style);
  }

  createDOM() {
    let existingCutscene = document.getElementById('board-fullscreen-cutscene');
    if (existingCutscene) existingCutscene.remove();

    this.fullscreenWrapper = document.createElement('div');
    this.fullscreenWrapper.id = 'board-fullscreen-cutscene';
    this.fullscreenWrapper.className = 'board-fullscreen-cutscene hidden';
    this.fullscreenWrapper.innerHTML = `
      <div class="board-cutscene-fullscreen-box">
        <video id="board-fullscreen-cutscene-video" class="board-cutscene-fullscreen-video" playsinline preload="auto"></video>
        <div class="board-cutscene-fullscreen-frame"></div>
      </div>
    `;
    document.getElementById('ui-layer').appendChild(this.fullscreenWrapper);
    this.fullscreenVideo = document.getElementById('board-fullscreen-cutscene-video');

    let existing = document.getElementById('board-quest-modal');
    if (existing) existing.remove();

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'board-quest-modal';
    this.modalEl.className = 'board-quest-modal hidden';

    this.modalEl.innerHTML = `
      <div class="board-quest-window" id="board-quest-window">
        <div class="board-quest-title-header">
          <span id="board-quest-title" class="board-quest-title-text">СОБЫТИЕ</span>
        </div>

        <div class="board-quest-content">
          <div id="board-dialogue-block" class="board-dialogue-block">
            <div class="board-speaker-row">
              <span id="board-quest-speaker" class="board-speaker-name">Летописец</span>
            </div>
            <div id="board-quest-desc" class="board-quest-desc">Описание события...</div>
          </div>

          <div id="board-quest-interactive" class="board-quest-interactive"></div>

          <div id="board-quest-result" class="board-quest-result hidden">
            <div id="board-quest-result-text" class="board-result-text"></div>
          </div>
        </div>

        <div id="board-quest-bottom-bar" class="board-quest-bottom-bar"></div>
      </div>
    `;

    document.getElementById('ui-layer').appendChild(this.modalEl);

    this.titleText = document.getElementById('board-quest-title');
    this.speakerText = document.getElementById('board-quest-speaker');
    this.descText = document.getElementById('board-quest-desc');
    this.dialogueWrapper = document.getElementById('board-dialogue-block');
    this.interactiveContainer = document.getElementById('board-quest-interactive');
    this.resultContainer = document.getElementById('board-quest-result');
    this.resultText = document.getElementById('board-quest-result-text');
  }

  setWindowFrame(type) {
    const win = document.getElementById('board-quest-window');
    if (!win) return;
    win.classList.remove('frame-big', 'frame-good', 'frame-bad');
    if (type === 'good') {
      win.classList.add('frame-good');
    } else if (type === 'bad') {
      win.classList.add('frame-bad');
    } else {
      win.classList.add('frame-big');
    }
  }

  open(eventData, onComplete) {
    this.currentEvent = eventData;
    this.onCompleteCallback = onComplete;

    if (!this.modalEl) this.createDOM();

    const bigFrameTypes = [
      'quiz', 'choice', 'choice_video', 'mystery_boxes', 'strongman',
      'timestop', 'bingo', 'charity', 'wheel_game', 'claw_game',
      'lockpick_game', 'thimbles_game', 'boss_door'
    ];

    if (bigFrameTypes.includes(eventData.type)) {
      this.setWindowFrame('big');
    } else if (['hazard', 'hazard_video', 'bounce'].includes(eventData.type)) {
      this.setWindowFrame('bad');
    } else {
      this.setWindowFrame('good');
    }

    this.titleText.textContent = eventData.title || 'СОБЫТИЕ';
    this.speakerText.textContent = eventData.speaker || 'Лесной Путник';
    this.descText.textContent = eventData.text || '';

    this.resultContainer.classList.add('hidden');
    const bb = document.getElementById('board-quest-bottom-bar');
    if (bb) bb.innerHTML = '';
    this.interactiveContainer.innerHTML = '';

    if (eventData.video && !eventData.playVideoAfterChoice) {
      this.modalEl.classList.add('hidden');
      this.playCutscene(eventData.video, () => {
        this.modalEl.classList.remove('hidden');
        this.renderEventStage(eventData);
      });
    } else {
      this.modalEl.classList.remove('hidden');
      this.renderEventStage(eventData);
    }
  }

  playCutscene(videoSrc, onFinish) {
    if (!videoSrc) {
      if (onFinish) onFinish();
      return;
    }

    if (!this.fullscreenWrapper) this.createDOM();
    if (this.modalEl) this.modalEl.classList.add('hidden');

    this.fullscreenWrapper.classList.remove('hidden');
    this.fullscreenVideo.src = videoSrc;
    this.fullscreenVideo.volume = Math.max(0.1, audio.getMusicVolume());
    this.fullscreenVideo.currentTime = 0;

    let hasAdvanced = false;
    const advance = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      this.fullscreenVideo.pause();
      this.fullscreenVideo.removeAttribute('src');
      this.fullscreenVideo.load();
      this.fullscreenWrapper.classList.add('hidden');
      if (onFinish) onFinish();
    };

    this.fullscreenVideo.onended = advance;
    this.fullscreenVideo.ontimeupdate = () => {
      if (this.fullscreenVideo.duration > 0) {
        const progress = this.fullscreenVideo.currentTime / this.fullscreenVideo.duration;
        if (progress >= 0.88 && !hasAdvanced) advance();
      }
    };

    this.fullscreenWrapper.onclick = (e) => {
      e.stopPropagation();
      advance();
    };

    this.fullscreenVideo.play().catch(() => advance());
  }

  renderEventStage(evt) {
    this.interactiveContainer.innerHTML = '';
    this.descText.textContent = evt.text || '';

    switch (evt.type) {
      case 'quiz':
        this.renderQuiz(evt);
        break;
      case 'choice':
      case 'choice_video':
        this.renderChoice(evt);
        break;
      case 'mystery_boxes':
        this.renderMysteryBoxes(evt);
        break;
      case 'strongman':
        this.renderStrongman(evt);
        break;
      case 'timestop':
        this.renderTimeStop(evt);
        break;
      case 'bingo':
        this.renderBingo(evt);
        break;
      case 'charity':
        this.renderCharity(evt);
        break;
      case 'wheel_game':
      case 'wheel_video':
        this.renderWheelGame(evt);
        break;
      case 'claw_game':
        this.renderClawGame(evt);
        break;
      case 'lockpick_game':
        this.renderLockpickGame(evt);
        break;
      case 'thimbles_game':
        this.renderThimblesGame(evt);
        break;
      default:
        this.renderSimpleAction(evt);
        break;
    }
  }

  /**
   * 1. Интерактивное Колесо Фортуны (без видео-заглушки)
   */
  renderWheelGame(evt) {
    const sectors = [
      { label: 'Запас +5 яиц', type: 'eggs', val: 5, good: true },
      { label: 'Бустер карт', type: 'booster', val: 1, good: true },
      { label: 'Запас +12 яиц', type: 'eggs', val: 12, good: true },
      { label: 'Пошлина -2 яйца', type: 'loseEggs', val: 2, good: false },
      { label: 'Джекпот +20 яиц', type: 'eggs', val: 20, good: true },
      { label: 'Кубики переброса +2', type: 'reroll', val: 2, good: true }
    ];

    const wrap = document.createElement('div');
    wrap.className = 'wheel-minigame-wrap';
    wrap.innerHTML = `
      <div class="wheel-stage-box">
        <div class="wheel-pointer-arrow"></div>
        <div id="wheel-interactive-disc" class="wheel-disc">
          <div class="wheel-center-hub"></div>
        </div>
      </div>
      <div class="wheel-legend-grid">
        <span>1: +5 Яиц</span>
        <span>2: Бустер карт</span>
        <span>3: +12 Яиц</span>
        <span>4: Штраф -2</span>
        <span>5: Джекпот +20</span>
        <span>6: +2 Кубика</span>
      </div>
    `;
    this.interactiveContainer.appendChild(wrap);

    const bottomBar = document.getElementById('board-quest-bottom-bar');
    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'btn-leaf-green btn-quest-main-btn';
    btn.innerHTML = '<span class="btn-leaf-green-text">ВРАЩАТЬ КОЛЕСО</span>';

    let spinning = false;
    btn.addEventListener('click', () => {
      if (spinning) return;
      spinning = true;
      btn.disabled = true;
      audio.playClick();

      const chosenIndex = Math.floor(Math.random() * sectors.length);
      const chosen = sectors[chosenIndex];
      const sectorAngle = 360 / sectors.length;
      const targetDeg = 360 * 5 + (360 - (chosenIndex * sectorAngle + sectorAngle / 2));

      const disc = document.getElementById('wheel-interactive-disc');
      if (disc) {
        disc.style.transform = `rotate(${targetDeg}deg)`;
      }

      setTimeout(() => {
        if (chosen.type === 'eggs') {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(chosen.val, 'Колесо Фортуны');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Выигрыш на Колесе Фортуны',
            effectTitle: `Пополнение запасов: +${gained} яиц`,
            narrative: 'Колесо плавно замедляет ход, и стрелка замирает на щедром секторе.'
          });
        } else if (chosen.type === 'booster') {
          audio.playSuccess();
          this.eventManager.addBoosterPacks(chosen.val);
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.BOOSTER,
            label: 'Редкий сектор Колеса',
            effectTitle: 'Тактический резерв: +1 Бустер карт',
            narrative: 'Из призового желоба выпадает запечатанный набор бойцов для битвы с Боссом.'
          });
        } else if (chosen.type === 'reroll') {
          audio.playSuccess();
          this.eventManager.addRerollDice(chosen.val);
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.DICE,
            label: 'Благословение Фортуны',
            effectTitle: 'Контроль судьбы: +2 кубика переброса',
            narrative: 'Механизм отсчитывает вам две дополнительные кости для будущих ходов.'
          });
        } else {
          audio.playImpact();
          const lost = this.eventManager.loseEggs(chosen.val, 'Штрафной сектор');
          this.showOutcomeWithBanner({
            isGood: false,
            icon: BOARD_ASSET_ICONS.TILE_BAD,
            label: 'Сектор неудачи',
            effectTitle: lost > 0 ? `Утрачено припасов: -${lost} яйца` : 'Щит отразил потерю припасов',
            narrative: 'Стрелка остановилась на тёмном секторе ярмарочного колеса.'
          });
        }
      }, 3450);
    });

    bottomBar.appendChild(btn);
  }

  /**
   * 2. Мини-игра: Механический Захват (Кран-автомат на тайминг)
   */
  renderClawGame(evt) {
    const box = document.createElement('div');
    box.className = 'claw-track-box';
    box.innerHTML = `
      <div style="margin-bottom:6px; font-size:13px; text-align:center;">
        Поймайте каретку крана в центральной бирюзовой зоне
      </div>
      <div class="claw-rail">
        <div class="claw-target-zone" style="left: 38%; width: 24%;"></div>
        <div id="claw-moving-head" class="claw-head" style="left: 10%;"></div>
      </div>
    `;
    this.interactiveContainer.appendChild(box);

    const head = document.getElementById('claw-moving-head');
    let pos = 10;
    let dir = 1.45;
    let finished = false;

    const loop = () => {
      if (finished) return;
      pos += dir;
      if (pos >= 92 || pos <= 8) dir = -dir;
      if (head) head.style.left = `${pos}%`;
      this.clawAnimId = requestAnimationFrame(loop);
    };
    this.clawAnimId = requestAnimationFrame(loop);

    const bottomBar = document.getElementById('board-quest-bottom-bar');
    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'btn-leaf-green btn-quest-main-btn';
    btn.innerHTML = '<span class="btn-leaf-green-text">ОПУСТИТЬ ЗАХВАТ</span>';

    btn.addEventListener('click', () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(this.clawAnimId);
      audio.playClick();

      if (pos >= 38 && pos <= 62) {
        audio.playSuccess();
        const winBooster = Math.random() < 0.45;
        if (winBooster) {
          this.eventManager.addBoosterPacks(1);
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.BOOSTER,
            label: 'Точный захват',
            effectTitle: 'Получен набор: +1 Бустер карт',
            narrative: 'Стальные лапки клешни надёжно сомкнулись вокруг главной призовой капсулы.'
          });
        } else {
          const gained = this.eventManager.addEggs(8, 'Механический кран');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Точный захват',
            effectTitle: `Призовая капсула: +${gained} яиц`,
            narrative: 'Кран аккуратно доставил увесистую капсулу с запасом яиц в лоток выдачи.'
          });
        }
      } else {
        audio.playImpact();
        const gained = this.eventManager.addEggs(2, 'Утешительный улов');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Касательный захват',
          effectTitle: `Малый улов: +${gained} яйца`,
          narrative: 'Клешня соскользнула с главного приза, но зацепила малый мешочек у края витрины.'
        });
      }
    });

    bottomBar.appendChild(btn);
  }

  /**
   * 3. Мини-игра: Взлом Запертого Погреба (3 штифта)
   */
  renderLockpickGame(evt) {
    const box = document.createElement('div');
    box.className = 'lockpick-track-box';
    box.innerHTML = `
      <div class="lockpick-pins-row">
        <span id="lp-pin-0" class="lockpick-pin-badge">Штифт I</span>
        <span id="lp-pin-1" class="lockpick-pin-badge">Штифт II</span>
        <span id="lp-pin-2" class="lockpick-pin-badge">Штифт III</span>
      </div>
      <div class="claw-rail">
        <div id="lp-target-zone" class="claw-target-zone" style="left: 35%; width: 30%;"></div>
        <div id="lp-runner" class="claw-head" style="left: 5%;"></div>
      </div>
    `;
    this.interactiveContainer.appendChild(box);

    const runner = document.getElementById('lp-runner');
    const zone = document.getElementById('lp-target-zone');

    let currentPin = 0;
    let pos = 10;
    let speed = 1.3;
    let active = true;
    let zoneMin = 35;
    let zoneMax = 65;

    const moveLoop = () => {
      if (!active) return;
      pos += speed;
      if (pos >= 94 || pos <= 6) speed = -speed;
      if (runner) runner.style.left = `${pos}%`;
      this.lockpickAnimId = requestAnimationFrame(moveLoop);
    };
    this.lockpickAnimId = requestAnimationFrame(moveLoop);

    const bottomBar = document.getElementById('board-quest-bottom-bar');
    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'btn-leaf-green btn-quest-main-btn';
    btn.innerHTML = '<span class="btn-leaf-green-text">ЗАФИКСИРОВАТЬ ШТИФТ</span>';

    btn.addEventListener('click', () => {
      if (!active) return;
      audio.playClick();

      if (pos >= zoneMin && pos <= zoneMax) {
        const pinBadge = document.getElementById(`lp-pin-${currentPin}`);
        if (pinBadge) pinBadge.classList.add('locked');
        currentPin++;

        if (currentPin >= 3) {
          active = false;
          cancelAnimationFrame(this.lockpickAnimId);
          audio.playSuccess();
          const gained = this.eventManager.addEggs(9, 'Тайник в погребе');
          this.eventManager.addRerollDice(1);
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Замок взломан',
            effectTitle: `Тайник открыт: +${gained} яиц и +1 кубик`,
            narrative: 'Последний штифт с глухим щелчком встал на место. Внутри погреба обнаружились нетронутые запасы.'
          });
        } else {
          // Усложняем следующий штифт
          speed = (speed > 0 ? 1 : -1) * (Math.abs(speed) + 0.35);
          zoneMin = 22 + Math.floor(Math.random() * 40);
          zoneMax = zoneMin + 24;
          if (zone) {
            zone.style.left = `${zoneMin}%`;
            zone.style.width = `${zoneMax - zoneMin}%`;
          }
        }
      } else {
        active = false;
        cancelAnimationFrame(this.lockpickAnimId);
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Срыв отмычки',
          effectTitle: 'Механизм заблокирован',
          narrative: 'Пружина сорвалась на последнем витке. Придётся оставить погреб и двигаться дальше.'
        });
      }
    });

    bottomBar.appendChild(btn);
  }

  /**
   * 4. Мини-игра: Игра в Скорлупки (Напёрстки)
   */
  renderThimblesGame(evt) {
    const grid = document.createElement('div');
    grid.className = 'board-answers-grid';

    const winningShell = Math.floor(Math.random() * 3);
    const labels = ['Левая скорлупка', 'Средняя скорлупка', 'Правая скорлупка'];
    const LETTERS = ['A', 'B', 'C'];

    labels.forEach((label, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-board-answer';
      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[idx]}</span>
        <span class="btn-board-answer-text">${label}</span>
      `;
      btn.addEventListener('click', () => {
        audio.playClick();
        if (idx === winningShell) {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(8, 'Игра в скорлупки');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Безупречная внимательность',
            effectTitle: `Выигрыш: +${gained} яиц`,
            narrative: 'Под выбранной ореховой скорлупкой действительно оказалось золочёное яйцо.'
          });
        } else {
          audio.playImpact();
          this.eventManager.addRerollDice(1);
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.DICE,
            label: 'Поощрение за партию',
            effectTitle: 'Получено: +1 кубик переброса',
            narrative: 'Золотое яйцо оказалось под соседней скорлупкой, но бурундук подарил вам счастливую кость за игру.'
          });
        }
      });
      grid.appendChild(btn);
    });

    this.interactiveContainer.appendChild(grid);
  }

  /**
   * 5. Викторина о лесных зверях
   */
  renderQuiz(evt) {
    const qData = ANIMAL_QUIZ_QUESTIONS[Math.floor(Math.random() * ANIMAL_QUIZ_QUESTIONS.length)];
    this.descText.innerHTML = `<em>«${qData.question}»</em><br><small style="color:#8c7b65;">Подсказка: ${qData.hint}</small>`;

    const grid = document.createElement('div');
    grid.className = 'board-answers-grid';

    const answers = qData.answers.map((ans, idx) => ({ text: ans, isCorrect: idx === qData.correctIndex }));
    answers.sort(() => Math.random() - 0.5);

    const LETTERS = ['A', 'B', 'C', 'D'];
    answers.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-board-answer';
      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[idx]}</span>
        <span class="btn-board-answer-text">${item.text}</span>
      `;
      btn.addEventListener('click', () => {
        audio.playClick();
        if (item.isCorrect) {
          audio.playSuccess();
          const reward = evt.rewardEggs || 6;
          const gained = this.eventManager.addEggs(reward, 'Лесная викторина');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Верный ответ',
            effectTitle: `Награда за наблюдательность: +${gained} яиц`,
            narrative: 'Хранитель летописи с уважением кивает и передаёт вам заслуженный паёк.'
          });
        } else {
          audio.playImpact();
          this.showOutcomeWithBanner({
            isGood: false,
            icon: BOARD_ASSET_ICONS.TILE_NORMAL,
            label: 'Неточность в расчётах',
            effectTitle: 'Припасы не изменились',
            narrative: 'Записи не сошлись, однако горячий травяной чай у костра восстановил бодрость духа.'
          });
        }
      });
      grid.appendChild(btn);
    });

    this.interactiveContainer.appendChild(grid);
  }

  /**
   * 6. События с выбором
   */
  renderChoice(evt) {
    const grid = document.createElement('div');
    grid.className = 'board-answers-grid';

    const LETTERS = ['A', 'B', 'C', 'D'];
    (evt.options || []).forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-board-answer';
      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[idx]}</span>
        <span class="btn-board-answer-text">${opt.text}</span>
      `;
      btn.addEventListener('click', () => {
        audio.playClick();
        this.handleChoiceKey(opt.choiceKey, evt);
      });
      grid.appendChild(btn);
    });

    this.interactiveContainer.appendChild(grid);
  }

  handleChoiceKey(key, evt) {
    if (key === 'pass') {
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_NORMAL,
        label: 'Осторожное решение',
        effectTitle: 'Путь продолжен без риска',
        narrative: 'Вы предпочли сохранить имеющиеся ресурсы и двинулись дальше по маршруту.'
      });
      return;
    }

    if (key === 'left' || key === 'right') {
      const isCorrect = Math.random() < 0.55;
      this.playCutscene('assets/videos/Event-10.mp4', () => {
        if (isCorrect) {
          audio.playSuccess();
          this.eventManager.addRerollDice(1);
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.DICE,
            label: 'Верный ориентир',
            effectTitle: 'Короткая тропа: +1 кубик переброса',
            narrative: 'Туман расступился, открывая прямую дорогу и тайник со счастливой костью.'
          });
        } else {
          audio.playImpact();
          this.eventManager.setReverseNextMove(true);
          this.showOutcomeWithBanner({
            isGood: false,
            icon: BOARD_ASSET_ICONS.TILE_BAD,
            label: 'Потеря ориентации',
            effectTitle: 'Эффект: Следующий ход направит вас назад',
            narrative: 'Тропа сделала крутую петлю в густом тумане и развернула вас в обратную сторону.'
          });
        }
      });
      return;
    }

    if (key === 'sacrifice_2') {
      if (this.eventManager.stats.eggs >= 2) {
        audio.playSuccess();
        this.eventManager.loseEggs(2, 'Дар Алтарю', true);
        this.eventManager.setImmunity(true);
        this.playCutscene('assets/videos/Event-11.mp4', () => {
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.TILE_GOOD,
            label: 'Благословение Монолита',
            effectTitle: 'Активирован: Щит Неуязвимости',
            narrative: 'Алтарь принял дар и окутал вас защитным куполом от следующей ловушки или отравления.'
          });
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Нехватка ресурсов',
          effectTitle: 'Требуется минимум 2 яйца',
          narrative: 'В вашем саквояже недостаточно припасов для совершения подношения.'
        });
      }
      return;
    }

    if (key === 'drink_water') {
      audio.playSuccess();
      this.eventManager.setMysteriousBuff('Благословение Чистого Ручья');
      const gained = this.eventManager.addEggs(3, 'Родниковая роса');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Эффект родника',
        effectTitle: `Прилив сил: +${gained} яйца и Особый тонус`,
        narrative: 'Кристальная влага мгновенно сняла дорожную усталость и укрепила ваш дух.'
      });
      return;
    }

    if (key === 'enter_basement') {
      const isGood = Math.random() < 0.7;
      if (isGood) {
        this.playCutscene('assets/videos/Event-16-1.mp4', () => {
          const gained = this.eventManager.addEggs(4, 'Подземный тайник');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Удачная разведка',
            effectTitle: `Найдено в подвале: +${gained} яйца`,
            narrative: 'Обитательница тёплого подвала дружелюбно поделилась с вами свежими запасами.'
          });
        });
      } else {
        this.playCutscene('assets/videos/Event-16-2.mp4', () => {
          const lost = this.eventManager.loseEggs(2, 'Страж подвала');
          this.showOutcomeWithBanner({
            isGood: false,
            icon: BOARD_ASSET_ICONS.TILE_BAD,
            label: 'Неожиданная стычка',
            effectTitle: lost > 0 ? `Потеря при отступлении: -${lost} яйца` : 'Щит предотвратил потерю яиц',
            narrative: 'В темноте вас встретила разъярённая наседка. Пришлось спешно ретироваться по ступеням.'
          });
        });
      }
      return;
    }

    if (key === 'buy_booster_4') {
      if (this.eventManager.stats.eggs >= 4) {
        audio.playSuccess();
        this.eventManager.loseEggs(4, 'Обмен у Сороки', true);
        this.eventManager.addBoosterPacks(1);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Успешная сделка',
          effectTitle: 'Приобретено: +1 Бустер карт (за 4 яйца)',
          narrative: 'Сорока ловко пересчитала яйца и сбросила вам запечатанный свёрток с картами.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Сделка сорвалась',
          effectTitle: 'Недостаточно яиц для обмена (нужно 4)',
          narrative: 'Сорока недовольно застрекотала и перелетела на соседнюю ветку.'
        });
      }
    }
  }

  /**
   * 7. Четыре шкатулки Иллюзиониста
   */
  renderMysteryBoxes(evt) {
    const boxContainer = document.createElement('div');
    boxContainer.className = 'board-answers-grid mystery-boxes-row';

    const boxes = [
      { id: 1, video: 'assets/videos/Event-17-1.mp4', type: 'glove' },
      { id: 2, video: 'assets/videos/Event-17-2.mp4', type: 'booster' },
      { id: 3, video: 'assets/videos/Event-17-3.mp4', type: 'reroll' },
      { id: 4, video: 'assets/videos/Event-17-4.mp4', type: 'golden' }
    ];
    boxes.sort(() => Math.random() - 0.5);

    const LETTERS = ['A', 'B', 'C', 'D'];
    boxes.forEach((box, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn-board-answer mystery-box-btn';
      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[i]}</span>
        <span class="btn-board-answer-text">Ларец #${i + 1}</span>
      `;
      btn.addEventListener('click', () => {
        audio.playClick();
        boxContainer.remove();

        this.playCutscene(box.video, () => {
          if (box.type === 'glove') {
            audio.playImpact();
            const lost = this.eventManager.loseEggs(4, 'Пружинная ловушка');
            this.showOutcomeWithBanner({
              isGood: false,
              icon: BOARD_ASSET_ICONS.TILE_BAD,
              label: 'Коварный механизм',
              effectTitle: lost > 0 ? `Удар пружины: -${lost} яйца` : 'Защитный щит поглотил удар',
              narrative: 'Под крышкой сработала тугая пружина с боксёрской перчаткой.'
            });
          } else if (box.type === 'booster') {
            audio.playSuccess();
            this.eventManager.addBoosterPacks(1);
            this.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.BOOSTER,
              label: 'Ценная находка',
              effectTitle: 'Арсенал пополнен: +1 Бустер карт',
              narrative: 'На бархатной подушечке внутри шкатулки лежал набор боевых карт.'
            });
          } else if (box.type === 'reroll') {
            audio.playSuccess();
            this.eventManager.addRerollDice(2);
            this.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.DICE,
              label: 'Дар Иллюзиониста',
              effectTitle: 'Получено: +2 кубика переброса',
              narrative: 'Внутри ларца оказались две кости из резного костяного дерева.'
            });
          } else {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(10, 'Золотой запас');
            this.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: 'Главный приз',
              effectTitle: `Золотая кладка: +${gained} яиц`,
              narrative: 'Вы открыли самый богатый ларец из четырёх!'
            });
          }
        });
      });
      boxContainer.appendChild(btn);
    });

    this.interactiveContainer.appendChild(boxContainer);
  }

  /**
   * 8. Аттракцион Силомер
   */
  renderStrongman(evt) {
    const wrap = document.createElement('div');
    wrap.className = 'strongman-game-wrap';
    wrap.innerHTML = `
      <div class="strongman-gauge-track">
        <div class="zone zone-green">Слабо (0)</div>
        <div class="zone zone-yellow">Точно (+4)</div>
        <div class="zone zone-red">ПИК СИЛЫ (+10)</div>
        <div id="strongman-pointer" class="strongman-pointer"></div>
      </div>
      <button id="btn-strongman-hit" class="btn-leaf-green">
        <span class="btn-leaf-green-text">НАНЕСТИ УДАР (ПРОБЕЛ)</span>
      </button>
    `;
    this.interactiveContainer.appendChild(wrap);

    const pointer = document.getElementById('strongman-pointer');
    const btnHit = document.getElementById('btn-strongman-hit');

    let position = 0;
    let speed = 1.65;
    let isFinished = false;

    const animate = () => {
      if (isFinished) return;
      position += speed;
      if (position >= 100 || position <= 0) speed = -speed;
      if (pointer) pointer.style.left = `${Math.min(100, Math.max(0, position))}%`;
      this.strongmanAnimId = requestAnimationFrame(animate);
    };
    this.strongmanAnimId = requestAnimationFrame(animate);

    const strike = () => {
      if (isFinished) return;
      isFinished = true;
      cancelAnimationFrame(this.strongmanAnimId);

      this.playCutscene(evt.video || 'assets/videos/Event-19.mp4', () => {
        if (position >= 75) {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(10, 'Силомер: Пик силы');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Сокрушительный удар',
            effectTitle: `Максимальная награда: +${gained} яиц`,
            narrative: 'Гиря взлетела до самой вершины столба и ударила в медный гонг!'
          });
        } else if (position >= 40) {
          audio.playClick();
          const gained = this.eventManager.addEggs(4, 'Силомер: Средний удар');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Крепкий замах',
            effectTitle: `Заработано: +${gained} яйца`,
            narrative: 'Удар вышел уверенным, хоть и немного не дотянул до вершины шкалы.'
          });
        } else {
          audio.playImpact();
          this.showOutcomeWithBanner({
            isGood: false,
            icon: BOARD_ASSET_ICONS.TILE_NORMAL,
            label: 'Скользящий удар',
            effectTitle: 'Награда не получена',
            narrative: 'Молот опустился слишком рано, и бегунок едва оторвался от основания.'
          });
        }
      });
    };

    btnHit.addEventListener('click', strike);
    const keyHandler = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        window.removeEventListener('keydown', keyHandler);
        strike();
      }
    };
    window.addEventListener('keydown', keyHandler, { once: true });
  }

  /**
   * 9. Хронометр Часовщика (Остановка времени)
   */
  renderTimeStop(evt) {
    const wrap = document.createElement('div');
    wrap.className = 'timestop-game-wrap';
    wrap.innerHTML = `
      <div class="timestop-target-selector">
        <button id="btn-target-5" class="btn-board-answer"><span class="btn-board-answer-letter">A</span><span class="btn-board-answer-text">Рубеж: 05.00 сек</span></button>
        <button id="btn-target-8" class="btn-board-answer"><span class="btn-board-answer-letter">B</span><span class="btn-board-answer-text">Рубеж: 08.00 сек</span></button>
      </div>
      <div id="timestop-display" class="timestop-clock">00.00 с</div>
      <button id="btn-timestop-action" class="btn-leaf-green" style="display:none;">
        <span class="btn-leaf-green-text" id="timestop-btn-text">ЗАПУСТИТЬ ОТСЧЁТ</span>
      </button>
    `;
    this.interactiveContainer.appendChild(wrap);

    let targetSeconds = 5;
    const clock = document.getElementById('timestop-display');
    const btnAction = document.getElementById('btn-timestop-action');
    const btnText = document.getElementById('timestop-btn-text');

    const selectTarget = (sec) => {
      audio.playClick();
      targetSeconds = sec;
      const sel = wrap.querySelector('.timestop-target-selector');
      if (sel) sel.style.display = 'none';
      btnAction.style.display = 'inline-flex';
      clock.textContent = `Цель: ${sec.toFixed(2)} с`;
    };

    document.getElementById('btn-target-5').addEventListener('click', () => selectTarget(5));
    document.getElementById('btn-target-8').addEventListener('click', () => selectTarget(8));

    let isRunning = false;
    let startTime = 0;

    btnAction.addEventListener('click', () => {
      audio.playClick();
      if (!isRunning) {
        isRunning = true;
        btnText.textContent = 'ОСТАНОВИТЬ ХОД';
        startTime = performance.now();

        const updateClock = () => {
          if (!isRunning) return;
          const elapsed = (performance.now() - startTime) / 1000;
          clock.textContent = elapsed.toFixed(2) + ' с';
          this.timestopTimerId = requestAnimationFrame(updateClock);
        };
        this.timestopTimerId = requestAnimationFrame(updateClock);
      } else {
        isRunning = false;
        cancelAnimationFrame(this.timestopTimerId);
        const finalTime = (performance.now() - startTime) / 1000;
        const diff = Math.abs(finalTime - targetSeconds);
        btnAction.style.display = 'none';

        if (diff <= 0.10) {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(25, 'Хронометр: Идеал');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: `Результат: ${finalTime.toFixed(2)} с (погрешность ${diff.toFixed(2)} с)`,
            effectTitle: `Ювелирная точность: +${gained} яиц`,
            narrative: 'Стрелка замерла почти идеально на контрольном делении циферблата!'
          });
        } else if (diff <= 0.30) {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(12, 'Хронометр: Точно');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: `Результат: ${finalTime.toFixed(2)} с (погрешность ${diff.toFixed(2)} с)`,
            effectTitle: `Отличное чувство ритма: +${gained} яиц`,
            narrative: 'Часовщик одобрительно кивает вашей выдержке.'
          });
        } else if (diff <= 0.65) {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(5, 'Хронометр: Близко');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: `Результат: ${finalTime.toFixed(2)} с`,
            effectTitle: `Малая награда: +${gained} яиц`,
            narrative: 'Вы остановили маятник достаточно близко к заданной отметке.'
          });
        } else {
          audio.playImpact();
          const gained = this.eventManager.addEggs(1, 'Хронометр: Утешение');
          this.showOutcomeWithBanner({
            isGood: false,
            icon: BOARD_ASSET_ICONS.EGG,
            label: `Результат: ${finalTime.toFixed(2)} с`,
            effectTitle: `Поощрительный приз: +${gained} яйцо`,
            narrative: 'Маятник ушёл слишком далеко от контрольного рубежа.'
          });
        }
      }
    });
  }

  /**
   * 10. Лесной Розыгрыш (Бинго)
   */
  renderBingo(evt) {
    const wrap = document.createElement('div');
    wrap.className = 'board-answers-grid bingo-tickets-grid';

    const numbers = [7, 13, 21, 42];
    const LETTERS = ['A', 'B', 'C', 'D'];
    numbers.forEach((num, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-board-answer bingo-ticket-btn';
      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[idx]}</span>
        <span class="btn-board-answer-text">Билет №${num}</span>
      `;
      btn.addEventListener('click', () => {
        audio.playClick();
        wrap.remove();

        this.playCutscene(evt.video || 'assets/videos/Event-32.mp4', () => {
          const isWin = Math.random() < 0.5;
          const winningNumber = isWin ? num : numbers[(idx + 1) % numbers.length];
          if (winningNumber === num) {
            audio.playSuccess();
            const gained = this.eventManager.addEggs(24, 'Победа в тираже');
            this.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: `Выпал шар №${winningNumber}`,
              effectTitle: `Счастливый билет: +${gained} яиц`,
              narrative: 'Ваш номер совпал с главным шаром лотерейного барабана!'
            });
          } else {
            audio.playImpact();
            this.eventManager.addRerollDice(1);
            this.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.DICE,
              label: `Выпал шар №${winningNumber}`,
              effectTitle: 'Утешительный жетон: +1 кубик переброса',
              narrative: `Главный приз достался номеру ${winningNumber}, но крупье вручил вам запасную кость.`
            });
          }
        });
      });
      wrap.appendChild(btn);
    });

    this.interactiveContainer.appendChild(wrap);
  }

  /**
   * 11. Чаша Возмездия и Щедрости
   */
  renderCharity(evt) {
    const grid = document.createElement('div');
    grid.className = 'board-answers-grid';

    const lost = this.eventManager.stats.lostEggsCount || 0;
    const potentialGain = lost * 10;

    const btnPay = document.createElement('button');
    btnPay.className = 'btn-board-answer';
    btnPay.innerHTML = `
      <span class="btn-board-answer-letter">A</span>
      <span class="btn-board-answer-text">Внести 2 яйца в чашу</span>
    `;
    btnPay.addEventListener('click', () => {
      audio.playClick();
      if (this.eventManager.stats.eggs >= 2) {
        this.eventManager.loseEggs(2, 'Дар Тотему', true);
        if (potentialGain > 0) {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(potentialGain, 'Возмещение потерь x10');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: `Возмещено потерь: ${lost} x 10`,
            effectTitle: `Дар Тотема: +${gained} яиц`,
            narrative: 'Древний тотем многократно вернул все припасы, отнятые у вас ловушками на этом пути.'
          });
        } else {
          audio.playSuccess();
          const gained = this.eventManager.addEggs(10, 'Благословение Тотема');
          this.showOutcomeWithBanner({
            isGood: true,
            icon: BOARD_ASSET_ICONS.EGG,
            label: 'Чистый путь без потерь',
            effectTitle: `Награда за щедрость: +${gained} яиц`,
            narrative: 'Вы ещё не теряли яиц на карте, поэтому тотем одарил вас из собственного резерва.'
          });
        }
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно припасов',
          effectTitle: 'Для обряда требуется 2 яйца',
          narrative: 'Чаша осталась пустой. Вы продолжили движение по тропе.'
        });
      }
    });

    const btnPass = document.createElement('button');
    btnPass.className = 'btn-board-answer';
    btnPass.innerHTML = `
      <span class="btn-board-answer-letter">B</span>
      <span class="btn-board-answer-text">Пройти мимо тотема</span>
    `;
    btnPass.addEventListener('click', () => {
      audio.playClick();
      this.finishEvent();
    });

    grid.appendChild(btnPay);
    grid.appendChild(btnPass);
    this.interactiveContainer.appendChild(grid);
  }

  /**
   * 12. Прямые события (Награды, Ловушки, Врата)
   */
  renderSimpleAction(evt) {
    const bottomBar = document.getElementById('board-quest-bottom-bar');
    if (!bottomBar) return;
    bottomBar.innerHTML = '';

    const actions = evt.actions || [{ text: 'ПРОДОЛЖИТЬ', result: null }];
    actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = 'btn-leaf-green btn-quest-main-btn';
      btn.innerHTML = `<span class="btn-leaf-green-text">${act.text}</span>`;
      btn.addEventListener('click', () => {
        audio.playClick();
        this.applyActionResult(act.result, evt);
      });
      bottomBar.appendChild(btn);
    });
  }

  applyActionResult(res, evt) {
    if (!res) {
      this.finishEvent();
      return;
    }

    if (res.bossBattle) {
      this.finishEvent({ startBoss: true });
      return;
    }

    if (res.eggs && res.rerollDice) {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(res.eggs, evt.title);
      this.eventManager.addRerollDice(res.rerollDice);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Двойная находка',
        effectTitle: `Получено: +${gained} яиц и +${res.rerollDice} кубик`,
        narrative: 'Все найденные трофеи аккуратно упакованы в ваш походный инвентарь.'
      });
      return;
    }

    if (res.steamProphecy) {
      audio.playSuccess();
      const gained = res.eggs ? this.eventManager.addEggs(res.eggs, evt.title) : 0;
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Праздничное пророчество',
        effectTitle: gained > 0 ? `Знамение принято (+${gained} яйца)` : 'Знамение Оракула активировано',
        narrative: 'Оракул предрёк имениннику отличное настроение и скорое пополнение игровой коллекции.'
      });
      return;
    }

    if (res.eggs) {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(res.eggs, evt.title);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Пополнение припасов',
        effectTitle: `Добавлено в инвентарь: +${gained} яиц`,
        narrative: 'Ваши запасы для покупки бустеров карт успешно увеличены.'
      });
      return;
    }

    if (res.loseEggs) {
      audio.playImpact();
      const hadShield = this.eventManager.stats.isImmune;
      const lost = this.eventManager.loseEggs(res.loseEggs, evt.title);
      this.showOutcomeWithBanner({
        isGood: hadShield,
        icon: hadShield ? BOARD_ASSET_ICONS.TILE_GOOD : BOARD_ASSET_ICONS.TILE_BAD,
        label: hadShield ? 'Сработала защита' : 'Потеря ресурсов',
        effectTitle: hadShield ? 'Щит отразил потерю яиц' : `Утрачено запасов: -${lost} яиц`,
        narrative: hadShield
          ? 'Защитный эликсир принял удар на себя и сохранил ваши яйца в целости.'
          : 'Часть припасов была потеряна. Будьте осторожнее на лесных тропах.'
      });
      return;
    }

    if (res.poison) {
      audio.playImpact();
      const hadShield = this.eventManager.stats.isImmune;
      this.eventManager.addPoison(res.poison);
      this.showOutcomeWithBanner({
        isGood: hadShield,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: hadShield ? 'Нейтрализация токсина' : 'Негативный статус',
        effectTitle: hadShield ? 'Щит нейтрализовал отравление' : `Токсичное отравление (${res.poison} хода)`,
        narrative: hadShield
          ? 'Янтарный барьер рассеял ядовитые споры без вреда для здоровья.'
          : 'В начале каждого следующего броска вы будете терять по 1 яйцу, пока действие токсина не иссякнет.'
      });
      return;
    }

    if (res.rerollDice) {
      audio.playSuccess();
      this.eventManager.addRerollDice(res.rerollDice);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: 'Бонус тактики',
        effectTitle: `Кубики переброса: +${res.rerollDice} шт.`,
        narrative: 'Используйте их после любого броска, если захотите изменить выпавшее число.'
      });
      return;
    }

    if (res.boosterPacks) {
      audio.playSuccess();
      this.eventManager.addBoosterPacks(res.boosterPacks);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Усиление колоды',
        effectTitle: `Получено бустеров карт: +${res.boosterPacks}`,
        narrative: 'Вы сможете вскрыть эти паки перед началом сражения на арене Босса.'
      });
      return;
    }

    if (res.magnet) {
      audio.playSuccess();
      this.eventManager.setMagnet(res.magnet);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Активный артефакт',
        effectTitle: `Магнитное поле x${res.magnet} активировано`,
        narrative: 'Следующее получение яиц на доске будет автоматически удвоено.'
      });
      return;
    }

    if (res.heal) {
      audio.playSuccess();
      const restored = this.eventManager.cleanseAndRestore();
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Очищение и возврат',
        effectTitle: restored > 0 ? `Токсины сняты, возвращено +${restored} яиц` : 'Все негативные эффекты сняты',
        narrative: 'Целебный источник полностью восстановил ваше состояние.'
      });
      return;
    }

    if (res.isImmune) {
      audio.playSuccess();
      this.eventManager.setImmunity(true);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Защитный барьер',
        effectTitle: 'Активирован: Щит Неуязвимости (1 заряд)',
        narrative: 'Следующая ловушка или отравление будут полностью заблокированы.'
      });
      return;
    }

    if (res.bossHpPenalty) {
      audio.playImpact();
      this.eventManager.setBossHpPenalty(res.bossHpPenalty);
      this.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Последствие разряда',
        effectTitle: `Штраф к запасу здоровья на арене: -${res.bossHpPenalty} HP`,
        narrative: 'Грозовой удар оставил след, который скажется в начале битвы с Бобром.'
      });
      return;
    }

    if (res.stepBack) {
      audio.playImpact();
      this.eventManager.stepBack(res.stepBack);
      this.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Отбрасывающий импульс',
        effectTitle: 'Перемещение на 1 клетку назад',
        narrative: 'Зачарованный барьер возвращает вас ко входу в Цитадель Плотины.'
      });
      return;
    }

    this.finishEvent();
  }

  /**
   * Завершение события с показом сочного игрового оповещения в едином стиле игры
   * (без повторного открытия окна с кнопкой «Продолжить»)
   */
  showOutcomeWithBanner({ isGood = true, icon, label, effectTitle, narrative }) {
    // 1. Немедленно закрываем модальное окно и завершаем фазу события
    this.finishEvent();

    // 2. Отображаем статусное уведомление в едином пиксельном стиле игры
    const toastTitle = effectTitle ? effectTitle : (label || 'СОБЫТИЕ ЗАВЕРШЕНО');
    const toastSub = narrative || (label && label !== 'Итог события' && label !== 'Сводка события' ? label : '');
    const toastType = isGood ? 'good' : 'bad';

    if (this.eventManager && this.eventManager.boardGame && typeof this.eventManager.boardGame.showGameToast === 'function') {
      this.eventManager.boardGame.showGameToast(toastTitle, toastType, toastSub);
    } else {
      const container = document.getElementById('toast-container');
      if (container) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${toastType}`;
        if (toastSub) {
          toast.innerHTML = `<span>${toastTitle}</span><span class="toast-sub">${toastSub}</span>`;
        } else {
          toast.textContent = toastTitle;
        }
        container.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transition = 'opacity 0.35s';
          setTimeout(() => toast.remove(), 350);
        }, 2600);
      }
    }
  }

  showResult(htmlMsg, isGood = true) {
    const cleanText = htmlMsg ? htmlMsg.replace(/<br\s*\/?>/gi, ' — ').replace(/<[^>]+>/g, '') : '';
    this.showOutcomeWithBanner({
      isGood,
      label: 'ИТОГ',
      effectTitle: cleanText,
      narrative: ''
    });
  }

  finishEvent(meta = {}) {
    this.close();
    if (this.onCompleteCallback) {
      this.onCompleteCallback(meta);
      this.onCompleteCallback = null;
    }
  }

  close() {
    if (this.fullscreenVideo) {
      this.fullscreenVideo.pause();
      this.fullscreenVideo.removeAttribute('src');
      this.fullscreenVideo.load();
    }
    if (this.fullscreenWrapper) {
      this.fullscreenWrapper.classList.add('hidden');
    }
    if (this.strongmanAnimId) cancelAnimationFrame(this.strongmanAnimId);
    if (this.timestopTimerId) cancelAnimationFrame(this.timestopTimerId);
    if (this.clawAnimId) cancelAnimationFrame(this.clawAnimId);
    if (this.lockpickAnimId) cancelAnimationFrame(this.lockpickAnimId);

    const bb = document.getElementById('board-quest-bottom-bar');
    if (bb) bb.innerHTML = '';
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }
}