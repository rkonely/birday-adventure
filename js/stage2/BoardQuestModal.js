/**
 * BoardQuestModal.js — Интерактивное модальное окно заданий, мини-игр и уведомлений
 * Использует фирменную графику проекта:
 * - Big Frame.png / Good / Bad рамки
 * - Cut-Scene-Boardgame.png для обрамления видео
 * - Boardgame-UI-Answer.png и Leaf Green Button.png для кнопок
 * - Иконки ресурсов из assets/ для графических оповещений об эффектах
 */

import { audio } from '../core/AudioManager.js';
import { ANIMAL_QUIZ_QUESTIONS, OWL_ARCHIVE_QUESTIONS, BOARD_ASSET_ICONS } from './boardEventsData.js';
import { getCardById } from '../stage3/cardsData.js';
import {
  WheelGame,
  ClawGame,
  LockpickGame,
  ThimblesGame,
  MysteryBoxesGame,
  StrongmanGame,
  TimeStopGame,
  BingoGame,
  CharityGame,
  FairAttractionsGame
} from './minigames/index.js';

export class BoardQuestModal {
  constructor(eventManager) {
    this.eventManager = eventManager;
    this.modalEl = null;
    this.currentEvent = null;
    this.onCompleteCallback = null;
    this.activeMinigame = null;

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

    if (this.activeMinigame && typeof this.activeMinigame.destroy === 'function') {
      this.activeMinigame.destroy();
      this.activeMinigame = null;
    }

    const bottomBar = document.getElementById('board-quest-bottom-bar');

    switch (evt.type) {
      case 'quiz':
        this.renderQuiz(evt);
        break;
      case 'choice':
      case 'choice_video':
      case 'boss_door':
      case 'barrier_door':
        this.renderChoice(evt);
        break;
      case 'mystery_boxes':
        this.activeMinigame = new MysteryBoxesGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      case 'strongman':
        this.activeMinigame = new StrongmanGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      case 'timestop':
        this.activeMinigame = new TimeStopGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      case 'bingo':
        this.activeMinigame = new BingoGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      case 'charity':
        this.activeMinigame = new CharityGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      case 'wheel_game':
      case 'wheel_video':
        this.activeMinigame = new WheelGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      case 'claw_game':
        this.activeMinigame = new ClawGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      case 'lockpick_game':
        this.activeMinigame = new LockpickGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      case 'thimbles_game':
        this.activeMinigame = new ThimblesGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      case 'minigame_stub_darts':
      case 'minigame_stub_fishing':
      case 'minigame_stub_ringtoss':
      case 'minigame_stub_scratch':
      case 'minigame_stub_scales':
        this.activeMinigame = new FairAttractionsGame(this);
        this.activeMinigame.mount(evt, this.interactiveContainer, bottomBar);
        break;
      default:
        if (evt.options && evt.options.length > 0) {
          this.renderChoice(evt);
        } else {
          this.renderSimpleAction(evt);
        }
        break;
    }
  }

  /**
   * 5. Викторина о лесных зверях и архив филина
   */
  renderQuiz(evt) {
    const isOwl = evt.quizType === 'owl';
    const pool = isOwl && Array.isArray(OWL_ARCHIVE_QUESTIONS) && OWL_ARCHIVE_QUESTIONS.length > 0
      ? OWL_ARCHIVE_QUESTIONS
      : ANIMAL_QUIZ_QUESTIONS;

    const qData = pool[Math.floor(Math.random() * pool.length)];
    const hasClover = !!this.eventManager.stats.hasCloverBuff;
    if (hasClover) {
      this.eventManager.setCloverBuff(false);
    }

    this.descText.innerHTML = `<em>«${qData.question}»</em><br><small style="color:#8c7b65;">Подсказка: ${qData.hint}</small>${hasClover ? '<br><span style="color:#2ecc71; font-weight:700;">🍀 Бафф Клевера: 2 неверных ответа вычеркнуты!</span>' : ''}`;

    const grid = document.createElement('div');
    grid.className = 'board-answers-grid';

    const answers = qData.answers.map((ans, idx) => ({ text: ans, isCorrect: idx === qData.correctIndex }));
    answers.sort(() => Math.random() - 0.5);

    const disabledIndices = new Set();
    if (hasClover) {
      const wrongIndices = [];
      answers.forEach((ans, idx) => {
        if (!ans.isCorrect) wrongIndices.push(idx);
      });
      while (disabledIndices.size < 2 && wrongIndices.length > 0) {
        const randPick = wrongIndices.splice(Math.floor(Math.random() * wrongIndices.length), 1)[0];
        disabledIndices.add(randPick);
      }
    }

    const LETTERS = ['A', 'B', 'C', 'D'];
    answers.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-board-answer';
      const isEliminated = disabledIndices.has(idx);

      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[idx]}</span>
        <span class="btn-board-answer-text">${item.text}</span>
      `;

      if (isEliminated) {
        btn.disabled = true;
        btn.style.opacity = '0.35';
        btn.style.textDecoration = 'line-through';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.addEventListener('click', () => {
          audio.playClick();
          if (item.isCorrect) {
            audio.playSuccess();
            const reward = evt.rewardEggs || (isOwl ? 7 : 6);
            const gained = this.eventManager.addEggs(reward, isOwl ? 'Архив Филина' : 'Лесная викторина');
            this.showOutcomeWithBanner({
              isGood: true,
              icon: BOARD_ASSET_ICONS.EGG,
              label: 'Верный ответ',
              effectTitle: `Награда за эрудицию: +${gained} яиц`,
              narrative: isOwl
                ? 'Старый Филин одобрительно кивает и делится архивным пайком!'
                : 'Хранитель летописи с уважением кивает и передаёт вам заслуженный паёк.'
            });
          } else {
            audio.playImpact();
            this.showOutcomeWithBanner({
              isGood: false,
              icon: BOARD_ASSET_ICONS.TILE_NORMAL,
              label: 'Неточность в ответе',
              effectTitle: 'Припасы не изменились',
              narrative: 'Записи не сошлись, однако лесной чай восстановил бодрость духа.'
            });
          }
        });
      }
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
      const isLocked = opt.requiresKey && !this.eventManager.stats.hasGoldenKey;

      btn.innerHTML = `
        <span class="btn-board-answer-letter">${LETTERS[idx] || (idx + 1)}</span>
        <span class="btn-board-answer-text">${opt.text}${isLocked ? ' <span style="color:#e74c3c; font-size:11px;">[НУЖЕН ЗОЛОТОЙ КЛЮЧ]</span>' : ''}</span>
      `;

      if (isLocked) {
        btn.style.opacity = '0.7';
        btn.style.filter = 'grayscale(0.4)';
      }

      btn.addEventListener('click', () => {
        audio.playClick();
        if (isLocked) {
          audio.playImpact();
          this.showOutcomeWithBanner({
            isGood: false,
            icon: BOARD_ASSET_ICONS.TILE_BAD,
            label: 'Проход запечатан',
            effectTitle: 'Требуется Золотой Ключ',
            narrative: 'Магический замок требует Золотой Ключ с 33 клетки доски. Завершите первый круг!'
          });
          return;
        }

        if (opt.result) {
          this.applyActionResult(opt.result, evt);
        } else if (opt.choiceKey) {
          this.handleChoiceKey(opt.choiceKey, evt);
        } else {
          this.finishEvent();
        }
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

    if (key === 'boss_attack') {
      this.finishEvent({ startBoss: true });
      return;
    }

    if (key === 'boss_second_lap') {
      if (this.eventManager.stats.hasGoldenKey) {
        audio.playSuccess();
        this.eventManager.awardLapBonus();
        this.eventManager.teleportToCell(0, true);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.TILE_GOOD,
          label: 'Второй круг открыт!',
          effectTitle: 'Путь на 2-й круг открыт (+10 яиц, +1 бустер)',
          narrative: 'Золотой Ключ открыл путь на второй круг! Вы вернулись на Старт для повторного сбора трофеев.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Заперто',
          effectTitle: 'Требуется Золотой Ключ',
          narrative: 'Сначала найдите Золотой Ключ на доске (клетка 33)!'
        });
      }
      return;
    }

    if (key === 'barrier_return') {
      audio.playImpact();
      this.eventManager.stepBack(1);
      this.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Отступление',
        effectTitle: 'Откат на 1 клетку назад',
        narrative: 'Без Золотого Ключа вы вынуждены отступить назад от запечатанного завала.'
      });
      return;
    }

    if (key === 'barrier_unlock') {
      if (this.eventManager.stats.hasGoldenKey) {
        audio.playSuccess();
        this.eventManager.awardLapBonus();
        this.eventManager.teleportToCell(0, true);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.TILE_GOOD,
          label: 'Завал расчищен!',
          effectTitle: 'Цепи сняты (+10 яиц, +1 бустер)',
          narrative: 'Золотой ключ разрушил зачарованные цепи! Вы перенеслись на Старт для второго круга!'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Заперто',
          effectTitle: 'Требуется Золотой Ключ',
          narrative: 'Цепи не поддаются без реликвии с 33 клетки.'
        });
      }
      return;
    }

    if (key === 'chest_safe') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(4, 'Окованный ларец');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Надёжная добыча',
        effectTitle: `Получено: +${gained} яиц`,
        narrative: 'Вы аккуратно собрали припасы из верхнего отделения ларца.'
      });
      return;
    }

    if (key === 'chest_risk') {
      const isLucky = Math.random() < 0.65;
      if (isLucky) {
        audio.playSuccess();
        const gained = this.eventManager.addEggs(10, 'Потайное дно');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Тайник вскрыт!',
          effectTitle: `Большая добыча: +${gained} яиц`,
          narrative: 'Хитрый замок поддался! Вы извлекли щедрый тайный запас.'
        });
      } else {
        audio.playImpact();
        this.eventManager.setBossHpPenalty(2);
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Сработала ловушка',
          effectTitle: 'Штраф: -2 HP в битве с Боссом',
          narrative: 'Острая спица оцарапала крыло. Ранение скажется на арене.'
        });
      }
      return;
    }

    if (key === 'legendary_cards') {
      audio.playSuccess();
      this.eventManager.addBoosterPacks(2);
      const gained = this.eventManager.addEggs(5, 'Ларь Архитектора');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Кованый Ларь',
        effectTitle: `Награда: +2 Бустера карт и +${gained} яиц`,
        narrative: 'Печать сорвана! Внутри хранились чертежи и ценные карточные наборы.'
      });
      return;
    }

    if (key === 'legendary_beacon') {
      audio.playSuccess();
      this.eventManager.addBoosterPacks(1);
      this.eventManager.addCard('swan_princess');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Маяк Стаи',
        effectTitle: 'Получена Эпическая карта «Царевна-Лебедь» + 1 бустер',
        narrative: 'Магический сигнал привлёк могущественного союзника в вашу колоду!'
      });
      return;
    }

    if (key === 'pouch_eggs') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(5, 'Походный саквояж');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Припасы найдены',
        effectTitle: `Саквояж принёс: +${gained} яиц`,
        narrative: 'Внутри оказалось аккуратно уложенное лесное продовольствие.'
      });
      return;
    }

    if (key === 'pouch_side') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(3, 'Кармашки саквояжа');
      this.eventManager.addRerollDice(1);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: 'Потайной карман',
        effectTitle: `Найдено: +${gained} яйца и +1 кубик переброса`,
        narrative: 'Среди мелочей вы отыскали счастливую игральную кость.'
      });
      return;
    }

    if (key === 'clover_rerolls') {
      audio.playSuccess();
      this.eventManager.addRerollDice(3);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: 'Удача Четырёхлистника',
        effectTitle: 'Получено: +3 кубика переброса',
        narrative: 'Зелёный оберег в оперении гарантирует точность будущих манёвров.'
      });
      return;
    }

    if (key === 'clover_wish') {
      audio.playSuccess();
      this.eventManager.addRerollDice(2);
      this.eventManager.setCloverBuff(true);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Желание загадано',
        effectTitle: '+2 кубика и Бафф Клевера на викторину',
        narrative: 'В следующей викторине два неверных ответа будут автоматически убраны!'
      });
      return;
    }

    if (key === 'lost_compass' || key === 'compass_return') {
      audio.playSuccess();
      this.eventManager.addCard('tourist_sandpiper');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Благодарность Кулика',
        effectTitle: 'Карта «Кулик-Турист» присоединилась к колоде!',
        narrative: 'Тронутый вашей честностью путник решил помочь вам в штурме плотины.'
      });
      return;
    }

    if (key === 'compass_keep') {
      audio.playSuccess();
      this.eventManager.addRerollDice(2);
      this.eventManager.setCompass(true);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: 'Компас оставлен себе',
        effectTitle: '+2 кубика и Защита от тумана',
        narrative: 'Стрелка прибора надёжно ведёт через любые лесные туманы.'
      });
      return;
    }

    if (key === 'oracle_steam') {
      this.applyActionResult({ steamProphecy: true, eggs: 5, rerollDice: 1 }, evt);
      return;
    }

    if (key === 'oracle_tarot') {
      if (Math.random() < 0.5) {
        audio.playSuccess();
        this.eventManager.addCard('owl_mage');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Карта Таро Оракула',
          effectTitle: 'Получена Редкая Карта: «Сова-Маг»',
          narrative: 'Мистический расклад призвал могущественную Сову в ваш отряд!'
        });
      } else {
        audio.playSuccess();
        const gained = this.eventManager.addEggs(4, 'Пророчество Таро');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Знамение достатка',
          effectTitle: `Предсказание принесло: +${gained} яйца`,
          narrative: 'Карты посулили богатство и благополучие на лесных тропах.'
        });
      }
      return;
    }

    if (key === 'library_quiz') {
      this.renderQuiz({ ...evt, quizType: 'owl', rewardEggs: 7 });
      return;
    }

    if (key === 'library_scroll') {
      if (this.eventManager.stats.eggs >= 4) {
        audio.playSuccess();
        this.eventManager.loseEggs(4, 'Архивный сбор', true);
        this.eventManager.addCard('advocate_pelican');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Архивный свиток',
          effectTitle: 'Получена Карта «Пеликан-Адвокат» (за 4 яйца)',
          narrative: 'Юридические тонкости лесного права теперь на вашей стороне!'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно яиц',
          effectTitle: 'Требуется 4 яйца',
          narrative: 'Хранитель архива захлопнул фолиант: припасов не хватает.'
        });
      }
      return;
    }

    if (key === 'fog_left' || key === 'fog_right' || key === 'left' || key === 'right') {
      const hasCompass = !!this.eventManager.stats.hasCompass;
      const isLucky = hasCompass || Math.random() < 0.6;
      if (isLucky) {
        audio.playSuccess();
        const gained = this.eventManager.addEggs(5, 'Развилка в тумане');
        this.eventManager.addRerollDice(1);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.DICE,
          label: hasCompass ? 'Компас указал верный путь' : 'Верный ориентир',
          effectTitle: `Короткая тропа: +${gained} яиц и +1 кубик`,
          narrative: hasCompass
            ? 'Компас безошибочно вывел вас сквозь мглу к спрятанному тайнику.'
            : 'Туман рассеялся, открывая прямой проход и припасы.'
        });
      } else {
        audio.playImpact();
        this.eventManager.setReverseNextMove(true);
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Потеря ориентации',
          effectTitle: 'Эффект: Следующий ход направит назад',
          narrative: 'Тропа сделала петлю в тумане и развернула вас в обратную сторону.'
        });
      }
      return;
    }

    if (key === 'fog_fly_over') {
      if (this.eventManager.stats.eggs >= 2) {
        audio.playSuccess();
        this.eventManager.loseEggs(2, 'Полёт над соснами', true);
        this.eventManager.addRerollDice(1);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.DICE,
          label: 'Полёт над туманом',
          effectTitle: 'Безопасный обход: +1 кубик (за 2 яйца)',
          narrative: 'Вы взмыли над кронами деревьев и обогнули туманную низину.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно сил',
          effectTitle: 'Нужно 2 яйца на разгон',
          narrative: 'Не хватило энергии для взлёта над туманом.'
        });
      }
      return;
    }

    if (key === 'basement_enter' || key === 'enter_basement') {
      const isGood = Math.random() < 0.7;
      if (isGood) {
        audio.playSuccess();
        const gained = this.eventManager.addEggs(6, 'Подземный тайник');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Удачная разведка',
          effectTitle: `Найдено в подземелье: +${gained} яиц`,
          narrative: 'Обитатели погреба дружелюбно поделились с вами запасами.'
        });
      } else {
        audio.playImpact();
        const lost = this.eventManager.loseEggs(2, 'Страж подвала');
        this.eventManager.addRerollDice(1);
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Неожиданная стычка',
          effectTitle: `Потеряно -${lost} яйца, но найден +1 кубик`,
          narrative: 'Пришлось спешно ретироваться, но в суматохе вы подобрали кость переброса.'
        });
      }
      return;
    }

    if (key === 'basement_pass') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(2, 'Жёлуди у люка');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Безопасный сбор',
        effectTitle: `Собрано у входа: +${gained} яйца`,
        narrative: 'Вы не стали рисковать и собрали спелые жёлуди возле корней.'
      });
      return;
    }

    if (key === 'flask_drink' || key === 'drink_water') {
      audio.playSuccess();
      this.eventManager.cleansePoison();
      this.eventManager.setSpeedBoost(1);
      const gained = this.eventManager.addEggs(4, 'Живая роса');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Эффект Живой Росы',
        effectTitle: `Прилив сил: +${gained} яйца, снятие яда и +1 к ходу`,
        narrative: 'Кристальная влага мгновенно сняла усталость и токсины.'
      });
      return;
    }

    if (key === 'flask_save') {
      audio.playSuccess();
      this.eventManager.addCard('intern_dove');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Помощь стае',
        effectTitle: 'Получена Карта «Голубка-Стажёр» в колоду!',
        narrative: 'Благодарная голубка присоединилась к вашему отряду.'
      });
      return;
    }

    if (key === 'mail_help') {
      if (this.eventManager.stats.eggs >= 4) {
        audio.playSuccess();
        this.eventManager.loseEggs(4, 'Помощь почтальону', true);
        this.eventManager.addCard('carrier_pigeon');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Благодарный почтальон',
          effectTitle: 'Карта «Голубь-почтальон» добавлена в колоду!',
          narrative: 'За помощь в доставке писем опытный связист вступил в ваши ряды.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно припасов',
          effectTitle: 'Требуется 4 яйца',
          narrative: 'Не хватило провианта для дальней дороги почтальона.'
        });
      }
      return;
    }

    if (key === 'mail_buy' || key === 'buy_booster_4') {
      const price = key === 'buy_booster_4' ? 4 : 8;
      if (this.eventManager.stats.eggs >= price) {
        audio.playSuccess();
        this.eventManager.loseEggs(price, 'Почтовый пакет', true);
        this.eventManager.addBoosterPacks(1);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Ценный пакет',
          effectTitle: `Куплен Бустер карт (за ${price} яиц)`,
          narrative: 'Запечатанный пакет с редкими картами распакован!'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно ресурсов',
          effectTitle: `Нужно ${price} яиц для покупки`,
          narrative: 'В саквояже не набралось нужной суммы.'
        });
      }
      return;
    }

    if (key === 'sacrifice_give_2' || key === 'sacrifice_2') {
      if (this.eventManager.stats.eggs >= 2) {
        audio.playSuccess();
        this.eventManager.loseEggs(2, 'Дар алтарю', true);
        this.eventManager.setImmunity(true);
        this.eventManager.addRerollDice(1);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.TILE_GOOD,
          label: 'Благословение Алтаря',
          effectTitle: 'Щит Неуязвимости + 1 кубик',
          narrative: 'Алтарь принял дар и укрыл вас янтарным защитным барьером.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно яиц',
          effectTitle: 'Требуется 2 яйца для дара',
          narrative: 'Алтарь остался холоден к пустым рукам.'
        });
      }
      return;
    }

    if (key === 'sacrifice_pray') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(1, 'Молитва у камня');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Тихая молитва',
        effectTitle: `Лесной покой: +${gained} яйцо`,
        narrative: 'Духи леса благословили скромного путника.'
      });
      return;
    }

    if (key === 'charity_restore') {
      if (this.eventManager.stats.eggs >= 2) {
        audio.playSuccess();
        this.eventManager.loseEggs(2, 'Обряд щедрости', true);
        const restored = this.eventManager.cleanseAndRestore();
        const gained = this.eventManager.addEggs(Math.max(6, restored * 2), 'Возмездие Чаши');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.TILE_GOOD,
          label: 'Чаша Щедрости',
          effectTitle: `Очищение и возврат: +${gained} яиц!`,
          narrative: 'Чаша щедро вознаградила вас за бескорыстное подношение.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Пустая чаша',
          effectTitle: 'Нужно 2 яйца для обряда',
          narrative: 'Недостаточно ресурсов для подношения.'
        });
      }
      return;
    }

    if (key === 'charity_ally') {
      if (this.eventManager.stats.eggs >= 2) {
        audio.playSuccess();
        this.eventManager.loseEggs(2, 'Дар союзнику', true);
        this.eventManager.addBoosterPacks(1);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Верный союзник',
          effectTitle: 'Получен +1 Бустер карт (за 2 яйца)',
          narrative: 'Лесное братство прислало подкрепление в вашу колоду!'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно яиц',
          effectTitle: 'Нужно 2 яйца для призыва',
          narrative: 'Союзники не откликнулись на пустой зов.'
        });
      }
      return;
    }

    if (key === 'fox_pay') {
      audio.playImpact();
      const lost = this.eventManager.loseEggs(3, 'Откуп Лисе');
      this.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Откупные уплачены',
        effectTitle: `Потеря припасов: -${lost} яйца`,
        narrative: 'Хитрая Лиса забрала яйца и скрылась в густом папоротнике.'
      });
      return;
    }

    if (key === 'fox_gamble') {
      const isWin = Math.random() < 0.5;
      if (isWin) {
        audio.playSuccess();
        const gained = this.eventManager.addEggs(5, 'Выигрыш у Лисы');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Победа в кости!',
          effectTitle: `Выигрыш у Лисы: +${gained} яиц`,
          narrative: 'Вы раскусили лисьи краплёные кости и сорвали куш!'
        });
      } else {
        audio.playImpact();
        const lost = this.eventManager.loseEggs(4, 'Проигрыш Лисе');
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Лисья уловка',
          effectTitle: `Проигрыш: -${lost} яйца`,
          narrative: 'Лиса смахнула фишки хвостом и победоносно захохотала.'
        });
      }
      return;
    }

    if (key === 'totem_owl') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(2, 'Лик Совы');
      this.eventManager.addRerollDice(1);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: 'Благословение Совы',
        effectTitle: `Получено: +${gained} яйца и +1 кубик`,
        narrative: 'Мудрость ночной птицы направляет ваши мысли.'
      });
      return;
    }

    if (key === 'totem_bear') {
      audio.playSuccess();
      this.eventManager.addBonusMaxHp(5);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Сила Медведя',
        effectTitle: 'Бонус здоровья: +5 Max HP в битве с Боссом',
        narrative: 'Дух Хозяина Тайги наполнил ваши мышцы мощью.'
      });
      return;
    }

    if (key === 'infernal_take_hit') {
      audio.playImpact();
      this.eventManager.setBossHpPenalty(5);
      this.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Огненный ожог',
        effectTitle: 'Штраф к здоровью: -5 HP на Боссе',
        narrative: 'Стихийное пламя опалило крылья перед финальной битвой.'
      });
      return;
    }

    if (key === 'infernal_ice_compress') {
      if (this.eventManager.stats.eggs >= 3) {
        audio.playSuccess();
        this.eventManager.loseEggs(3, 'Ледяной компресс', true);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.TILE_GOOD,
          label: 'Жар потушен',
          effectTitle: 'Здоровье спасено (-3 яйца за компресс)',
          narrative: 'Холодная родниковая вода защитила ваше тело от ожога.'
        });
      } else {
        audio.playImpact();
        this.eventManager.setBossHpPenalty(5);
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Не хватило припасов',
          effectTitle: 'Штраф: -5 HP на Боссе',
          narrative: 'Без компресса пришлось выдержать жар на себе.'
        });
      }
      return;
    }

    if (key === 'infernal_absorb_fire') {
      audio.playImpact();
      this.eventManager.setBossHpPenalty(5);
      this.eventManager.addCard('tit_pyromancer');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Пламя обуздано!',
        effectTitle: 'Получена Карта «Синица-Пиромант» (-5 HP на Боссе)',
        narrative: 'Огонь плиты перешёл в боевой запал вашего нового мага!'
      });
      return;
    }

    if (key === 'iron_trap_stick') {
      audio.playImpact();
      const lost = this.eventManager.loseEggs(3, 'Капкан');
      this.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Зубья капкана',
        effectTitle: `Потеря припасов: -${lost} яйца`,
        narrative: 'Капкан захлопнулся и разбил часть вашей провизии.'
      });
      return;
    }

    if (key === 'iron_trap_rock') {
      const isSuccess = Math.random() < 0.5;
      if (isSuccess) {
        audio.playSuccess();
        const gained = this.eventManager.addEggs(6, 'Приманка из капкана');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Приманка извлечена!',
          effectTitle: `Добыто: +${gained} яиц`,
          narrative: 'Меткий бросок камня разрядил капкан без вреда для вас!'
        });
      } else {
        audio.playImpact();
        const lost = this.eventManager.loseEggs(4, 'Осечка капкана');
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Неудачный манёвр',
          effectTitle: `Потеряно: -${lost} яйца`,
          narrative: 'Камень срикошетил, и пружина ударила по сумке.'
        });
      }
      return;
    }

    if (key === 'cat_treat') {
      if (this.eventManager.stats.eggs >= 2) {
        audio.playSuccess();
        this.eventManager.loseEggs(2, 'Угощение коту', true);
        this.eventManager.addCard('brave_drake');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Кот умиротворён',
          effectTitle: 'Карта «Храбрый селезень» присоединилась к колоде!',
          narrative: 'Сытый кот замурлыкал, а храбрый селезень пришёл на выручку.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Нечем угостить',
          effectTitle: 'Нужно 2 яйца для угощения',
          narrative: 'Кот недовольно зашипел из кустов.'
        });
      }
      return;
    }

    if (key === 'cat_scare') {
      const isWin = Math.random() < 0.5;
      if (isWin) {
        audio.playSuccess();
        const gained = this.eventManager.addEggs(6, 'Трофеи кота');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Кот обращён в бегство!',
          effectTitle: `Найдено в логове: +${gained} яиц`,
          narrative: 'Звон кастрюльного щита напугал кота до полусмерти!'
        });
      } else {
        audio.playImpact();
        const lost = this.eventManager.loseEggs(4, 'Кошачьи когти');
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Коварный прыжок',
          effectTitle: `Урон сумке: -${lost} яйца`,
          narrative: 'Чёрный кот полоснул когтями и распорол шов саквояжа.'
        });
      }
      return;
    }

    if (key === 'cage_break') {
      audio.playImpact();
      const lost = this.eventManager.loseEggs(3, 'Паутина');
      this.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Липкая паутина',
        effectTitle: `Потери при рывке: -${lost} яйца`,
        narrative: 'Вам удалось вырваться из тенет, оставив часть припасов.'
      });
      return;
    }

    if (key === 'cage_cut') {
      audio.playSuccess();
      if (this.eventManager.stats.rerollDice >= 1) {
        this.eventManager.useRerollDice(1);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.DICE,
          label: 'Ловкий срез',
          effectTitle: 'Потрачен 1 кубик, яйца сохранены',
          narrative: 'Острый край кости помог перерезать нити паутины.'
        });
      } else {
        const lost = this.eventManager.loseEggs(2, 'Паутина');
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Нет кубика для среза',
          effectTitle: `Потеряно: -${lost} яйца`,
          narrative: 'Пришлось рвать паутину силой.'
        });
      }
      return;
    }

    if (key === 'resin_fly_through') {
      audio.playImpact();
      const lost = this.eventManager.loseEggs(3, 'Горящая смола');
      this.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Горячий дым',
        effectTitle: `Потери от жара: -${lost} яйца`,
        narrative: 'Смоляной жар опалил перья и повредил запасы.'
      });
      return;
    }

    if (key === 'resin_call_tit') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(5, 'Энергия смолы');
      this.eventManager.addCard('tit_pyromancer');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Пиромант в деле!',
        effectTitle: `Получено +${gained} яиц и Карта «Синица-Пиромант»!`,
        narrative: 'Синица поглотила огонь и обратила его в чистую силу отряда.'
      });
      return;
    }

    if (key === 'outpost_pay') {
      audio.playImpact();
      const lost = this.eventManager.loseEggs(2, 'Бобровая пошлина');
      this.showOutcomeWithBanner({
        isGood: false,
        icon: BOARD_ASSET_ICONS.TILE_BAD,
        label: 'Пошлина уплачена',
        effectTitle: `Списано: -${lost} яйца`,
        narrative: 'Бобровый часовой пропустил вас через мост.'
      });
      return;
    }

    if (key === 'outpost_woodpecker') {
      audio.playSuccess();
      this.eventManager.addCard('woodpecker_drill');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Прорыв заставы!',
        effectTitle: 'Дятел-Перфоратор разнёс преграду в щепки!',
        narrative: 'Карта «Дятел-Перфоратор» добавлена в вашу боевую колоду!'
      });
      return;
    }

    if (key === 'beehive_risk') {
      const isWin = Math.random() < 0.5;
      if (isWin) {
        audio.playSuccess();
        this.eventManager.cleansePoison();
        const gained = this.eventManager.addEggs(10, 'Дикий мёд');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Сладкий триумф!',
          effectTitle: `Целебный мёд: +${gained} яиц и снятие яда`,
          narrative: 'Пчёлы отнеслись к птицам мирно и щедро поделились сотами.'
        });
      } else {
        audio.playImpact();
        this.eventManager.addPoison(3);
        const lost = this.eventManager.loseEggs(2, 'Укусы пчёл');
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Разъярённый рой!',
          effectTitle: `Укусы: яд на 3 хода и -${lost} яйца`,
          narrative: 'Дикие пчёлы ринулись в атаку! Пришлось спасаться бегством.'
        });
      }
      return;
    }

    if (key === 'beehive_smoke') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(2, 'Окуренные соты');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Безопасный мёд',
        effectTitle: `Добыча: +${gained} яйца`,
        narrative: 'Дым усыпил бдительность пчёл. Вы унесли немного мёда без укусов.'
      });
      return;
    }

    if (key === 'bell_loud') {
      const isGood = Math.random() < 0.65;
      if (isGood) {
        audio.playSuccess();
        this.eventManager.addBoosterPacks(1);
        const gained = this.eventManager.addEggs(5, 'Лесной колокол');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Набат созвал друзей!',
          effectTitle: `Подмога стаи: +1 Бустер карт и +${gained} яиц`,
          narrative: 'Звонкий набат разнёсся над лесом, призвав пернатых союзников.'
        });
      } else {
        audio.playImpact();
        const lost = this.eventManager.loseEggs(3, 'Бобровый патруль');
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Шум привлёк стражу',
          effectTitle: `Штраф от патруля: -${lost} яйца`,
          narrative: 'Бобровые часовые всполошились и конфисковали часть припасов.'
        });
      }
      return;
    }

    if (key === 'bell_quiet') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(4, 'Тихий звон колокола');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Мелодичный звон',
        effectTitle: `Спокойствие чащи: +${gained} яйца`,
        narrative: 'Мягкий звон успокоил духов леса, подаривших вам дорожные припасы.'
      });
      return;
    }

    if (key === 'flying_dice_catch') {
      audio.playSuccess();
      this.eventManager.addRerollDice(2);
      const gained = this.eventManager.addEggs(3, 'Крылатый кубик');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: 'Кубик пойман в воздухе!',
        effectTitle: `Трофеи: +2 кубика переброса и +${gained} яйца`,
        narrative: 'Меткий выпад крыла позволил схватить летающую реликвию.'
      });
      return;
    }

    if (key === 'flying_dice_ride') {
      audio.playSuccess();
      this.eventManager.setSpeedBoost(2);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Попутный ветер!',
        effectTitle: 'Бафф скорости: +2 шага к следующему броску',
        narrative: 'Мощный восходящий поток подхватил вас для дальнего перелёта.'
      });
      return;
    }

    if (key === 'pen_report') {
      audio.playSuccess();
      this.eventManager.addCard('penguin_manager');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Отчёт утверждён',
        effectTitle: 'Карта «Пингвин-Менеджер» добавлена в колоду!',
        narrative: 'Квартальный баланс сошёлся! Менеджер берёт управление боем на себя.'
      });
      return;
    }

    if (key === 'pen_grant') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(8, 'Грант из казны');
      this.eventManager.addRerollDice(1);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Грант выписан!',
        effectTitle: `Пополнение казны: +${gained} яиц и +1 кубик`,
        narrative: 'Золотое перо вывело аккуратную подпись на приходном ордере.'
      });
      return;
    }

    if (key === 'obelisk_shadow') {
      audio.playImpact();
      this.eventManager.setBossHpPenalty(5);
      const gained = this.eventManager.addEggs(15, 'Сделка тени');
      this.eventManager.addBoosterPacks(1);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Тёмный контракт',
        effectTitle: `Награда: +${gained} яиц, +1 Бустер (-5 HP на Боссе)`,
        narrative: 'Обелиск даровал несметные сокровища ценой части жизненных сил.'
      });
      return;
    }

    if (key === 'obelisk_cleanse') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(4, 'Очищение обелиска');
      this.eventManager.addCard('owl_exorcist');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Обелиск очищен',
        effectTitle: `Получено +${gained} яйца и Карта «Сова-Экзорцист»!`,
        narrative: 'Светлые молитвы рассеяли мрак над каменным исполином.'
      });
      return;
    }

    if (key === 'portal_step') {
      const isLucky = Math.random() < 0.75;
      if (isLucky) {
        audio.playSuccess();
        this.eventManager.stepForward(4);
        const gained = this.eventManager.addEggs(5, 'Пространственный скачок');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.TILE_GOOD,
          label: 'Телепортация вперёд!',
          effectTitle: `Прыжок на +4 клетки вперёд и +${gained} яиц!`,
          narrative: 'Пространственная воронка перенесла вас далеко вперёд по маршруту!'
        });
      } else {
        audio.playImpact();
        this.eventManager.stepBack(2);
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Гравитационная отдача',
          effectTitle: 'Откат на -2 клетки назад',
          narrative: 'Вихрь нестабильного портала выбросил вас обратно.'
        });
      }
      return;
    }

    if (key === 'portal_feed') {
      if (this.eventManager.stats.eggs >= 5) {
        audio.playSuccess();
        this.eventManager.loseEggs(5, 'Жертва порталу', true);
        this.eventManager.addCard('swan_princess');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Дар Бездны',
          effectTitle: 'Эпическая карта «Царевна-Лебедь» получена!',
          narrative: 'Из светящейся бездны на зов явилась могущественная Царевна-Лебедь!'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Мало яиц для ритуала',
          effectTitle: 'Требуется 5 яиц',
          narrative: 'Разлом не отреагировал на недостаточное подношение.'
        });
      }
      return;
    }

    if (key === 'teremok_cook') {
      if (this.eventManager.stats.eggs >= 2) {
        audio.playSuccess();
        this.eventManager.loseEggs(2, 'Тесто для выпечки', true);
        this.eventManager.addCard('chef_chicken');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Грибная кулинария',
          effectTitle: 'Карта «Курица-Шеф» добавлена в колоду!',
          narrative: 'Курица-Шеф вдохновлена свежим тестом и готова готовить победу!'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Не хватает яиц',
          effectTitle: 'Нужно 2 яйца для рецепта',
          narrative: 'На кухне закончились основные ингредиенты.'
        });
      }
      return;
    }

    if (key === 'teremok_espresso') {
      audio.playSuccess();
      this.eventManager.cleansePoison();
      const gained = this.eventManager.addEggs(4, 'Лесной эспрессо');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Чашечка эспрессо',
        effectTitle: `Бодрость: яд снят и получено +${gained} яйца`,
        narrative: 'Ароматный напиток из лесных желудей снял усталость и яды.'
      });
      return;
    }

    if (key === 'fountain_toss') {
      if (this.eventManager.stats.eggs >= 5) {
        audio.playSuccess();
        this.eventManager.loseEggs(5, 'Монетки в фонтан', true);
        this.eventManager.setMagnet(2);
        this.eventManager.addRerollDice(2);
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Желание у фонтана',
          effectTitle: 'Магнит x2 активирован + 2 кубика переброса',
          narrative: 'Следующая находка яиц на доске удвоится!'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно припасов',
          effectTitle: 'Нужно 5 яиц для броска',
          narrative: 'В кошельке не нашлось достаточного количества монет.'
        });
      }
      return;
    }

    if (key === 'fountain_wash') {
      audio.playSuccess();
      this.eventManager.cleansePoison();
      const gained = this.eventManager.addEggs(5, 'Омовение в фонтане');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Прохладные струи',
        effectTitle: `Очищение: токсины сняты, получено +${gained} яиц`,
        narrative: 'Хрустальные струи осеннего фонтана вернули лёгкость вашим перьям.'
      });
      return;
    }

    if (key === 'anvil_temper') {
      if (this.eventManager.stats.eggs >= 4) {
        audio.playSuccess();
        this.eventManager.loseEggs(4, 'Закалка доспехов', true);
        this.eventManager.addBonusMaxHp(10);
        this.eventManager.addCard('brave_drake');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.TILE_GOOD,
          label: 'Боевая закалка',
          effectTitle: 'Макс. здоровье отряда: +10 HP и Карта «Храбрый селезень»!',
          narrative: 'Кузнец выковал для вас надёжные пластинчатые латы.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Недостаточно яиц',
          effectTitle: 'Нужно 4 яйца за работу кузнеца',
          narrative: 'Горн погас без должной оплаты труда.'
        });
      }
      return;
    }

    if (key === 'anvil_forge_ingot') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(5, 'Кузнечный слиток');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Слиток раскован',
        effectTitle: `Ценный металл: +${gained} яиц`,
        narrative: 'Вы удачно помогли в кузнице и получили долю ценного металла.'
      });
      return;
    }

    if (key === 'crystal_absorb') {
      audio.playSuccess();
      this.eventManager.setImmunity(true);
      this.eventManager.addBoosterPacks(1);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Энергия Эфира',
        effectTitle: 'Щит Неуязвимости + 1 Бустер карт',
        narrative: 'Сияние сапфирового кристалла окутало вас непробиваемой бронёй.'
      });
      return;
    }

    if (key === 'crystal_chip') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(8, 'Осколок кристалла');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Осколок кристалла',
        effectTitle: `Ценный минерал: +${gained} яиц`,
        narrative: 'Сверкающий минерал охотно примут лесные торговцы.'
      });
      return;
    }

    if (key === 'trap_cut_cords') {
      if (this.eventManager.stats.eggs >= 2) {
        audio.playSuccess();
        this.eventManager.loseEggs(2, 'Спасение птицы', true);
        this.eventManager.addCard('carrier_pigeon');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Птица спасена!',
          effectTitle: 'Карта «Голубь-почтальон» в колоде!',
          narrative: 'Освобождённая из сетей птица поклялась в верности вашему отряду.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Не хватило сил',
          effectTitle: 'Нужно 2 яйца для перерубания узлов',
          narrative: 'Слишком прочные канаты требуют больше энергии.'
        });
      }
      return;
    }

    if (key === 'trap_untangle') {
      const isWin = Math.random() < 0.6;
      if (isWin) {
        audio.playSuccess();
        this.eventManager.addCard('carrier_pigeon');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Узлы распутаны!',
          effectTitle: 'Спасён Голубь-почтальон (добавлен в колоду)',
          narrative: 'Терпение принесло плоды: птица на свободе без потери ресурсов!'
        });
      } else {
        audio.playImpact();
        const lost = this.eventManager.loseEggs(2, 'Запутались в сети');
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.TILE_BAD,
          label: 'Сети затянулись',
          effectTitle: `Утрата запасов: -${lost} яйца`,
          narrative: 'Вы сами чуть не угодили в силки браконьеров.'
        });
      }
      return;
    }

    if (key === 'stump_reach') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(7, 'Золотое сияние пня');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Сияющий пень',
        effectTitle: `Солнечные яйца: +${gained} шт.`,
        narrative: 'Тёплое янтарное свечение наполнило ваш саквояж свежими яйцами.'
      });
      return;
    }

    if (key === 'stump_transmute') {
      if (this.eventManager.stats.eggs >= 3) {
        audio.playSuccess();
        this.eventManager.loseEggs(3, 'Трансмутация', true);
        this.eventManager.addCard('raven_alchemist');
        this.showOutcomeWithBanner({
          isGood: true,
          icon: BOARD_ASSET_ICONS.BOOSTER,
          label: 'Трансмутация удалась!',
          effectTitle: 'Карта «Ворон-Алхимик» вошла в колоду!',
          narrative: 'Таинственный Ворон превратил лесные эссенции в боевую магию.'
        });
      } else {
        audio.playImpact();
        this.showOutcomeWithBanner({
          isGood: false,
          icon: BOARD_ASSET_ICONS.EGG,
          label: 'Мало реагентов',
          effectTitle: 'Нужно 3 яйца для алхимии',
          narrative: 'Реакция не запустилась из-за недостатка компонентов.'
        });
      }
      return;
    }

    if (key === 'mill_help') {
      audio.playSuccess();
      this.eventManager.stepForward(2);
      this.eventManager.addCard('bodybuilder_sparrow');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Крылья мельницы крутятся!',
        effectTitle: 'Рывок на +2 клетки и Карта «Воробей-Бодибилдер»!',
        narrative: 'Мельничный ветер подтолкнул вас вперёд по лесной дороге.'
      });
      return;
    }

    if (key === 'mill_grain') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(5, 'Мешочек зерна');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Отборное зерно',
        effectTitle: `Припасы мельницы: +${gained} яиц`,
        narrative: 'Золотистая отборная пшеница пополнила ваш дорожный рацион.'
      });
      return;
    }

    if (key === 'pearl_sell') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(12, 'Продажа жемчужины');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Жемчужина продана',
        effectTitle: `Огромная выручка: +${gained} яиц!`,
        narrative: 'Морская жемчужина произвела фурор среди лесных менял.'
      });
      return;
    }

    if (key === 'pearl_keep') {
      audio.playSuccess();
      this.eventManager.addBoosterPacks(1);
      this.eventManager.addCard('swan_princess');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Талисман Озера',
        effectTitle: 'Эпическая карта «Царевна-Лебедь» + 1 бустер!',
        narrative: 'Жемчужина оказалась королевским знаком доверия Лебединого озера.'
      });
      return;
    }

    if (key === 'rowan_snack') {
      audio.playSuccess();
      this.eventManager.cleansePoison(3);
      const gained = this.eventManager.addEggs(5, 'Спелая рябина');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Витаминный перекус',
        effectTitle: `Ягоды рябины: +${gained} яиц и яд ослаблен`,
        narrative: 'Спелые осенние гроздья нейтрализовали накопившиеся токсины.'
      });
      return;
    }

    if (key === 'rowan_treat') {
      audio.playSuccess();
      this.eventManager.addCard('robin_gardener');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Дружба с Зарянкой',
        effectTitle: 'Карта «Зарянка-Садовник» добавлена в колоду!',
        narrative: 'Заботливая птица-садовник поможет восстанавливать силы отряда.'
      });
      return;
    }

    if (key === 'rune_feathers') {
      audio.playSuccess();
      const gained = this.eventManager.addEggs(8, 'Руна Перьев');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.EGG,
        label: 'Руна Перьев',
        effectTitle: `Древний дар: +${gained} яиц`,
        narrative: 'Каменные знаки наполнили крылья лёгкостью и принесли трофеи.'
      });
      return;
    }

    if (key === 'rune_destiny') {
      audio.playSuccess();
      this.eventManager.addRerollDice(3);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: 'Руна Судьбы',
        effectTitle: 'Власть над роком: +3 кубика переброса',
        narrative: 'Древние руны подчинили случайности вашим тактическим решениям.'
      });
      return;
    }

    if (key === 'rune_steel') {
      audio.playSuccess();
      this.eventManager.addBoosterPacks(1);
      this.eventManager.addCard('viking_goose');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Руна Стали',
        effectTitle: 'Карта «Гусь-Викинг» + 1 бустер карт!',
        narrative: 'Суровый скандинавский воитель встал под ваши знамёна!'
      });
      return;
    }

    if (key === 'telescope_boss') {
      audio.playSuccess();
      this.eventManager.setBossWeaknessHp(50);
      this.eventManager.addCard('sniper_partridge');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Слабые места плотины',
        effectTitle: 'Босс начнёт бой с -50 HP! Получена Карта «Белая Куропатка-Снайпер»',
        narrative: 'Окуляр телескопа выявил трещину в главном шлюзе Бобра.'
      });
      return;
    }

    if (key === 'telescope_stars') {
      audio.playSuccess();
      this.eventManager.addCard('astrologer_hoopoe');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Звёздная карта',
        effectTitle: 'Карта «Удод-Астролог» в колоде!',
        narrative: 'Созвездия подсказали идеальное время для финального штурма.'
      });
      return;
    }

    if (key === 'toolbox_help') {
      audio.playSuccess();
      this.eventManager.addCard('plumber_bullfinch');
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Мастер на все руки',
        effectTitle: 'Карта «Снегирь-Сантехник» добавлена в колоду!',
        narrative: 'Специнструмент поможет взламывать гидравлику бобровой дамбы.'
      });
      return;
    }

    if (key === 'toolbox_take_nuts') {
      audio.playSuccess();
      this.eventManager.addRerollDice(1);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.DICE,
        label: 'Запасные гайки',
        effectTitle: 'Полезная деталь: +1 кубик переброса',
        narrative: 'Латунная гайка послужит отличной игральной костью.'
      });
      return;
    }

    // Резервный обработчик для любых непредусмотренных ключей
    audio.playSuccess();
    const fallbackGained = this.eventManager.addEggs(3, evt.title || 'Лесное событие');
    this.showOutcomeWithBanner({
      isGood: true,
      icon: BOARD_ASSET_ICONS.EGG,
      label: 'Выбор сделан',
      effectTitle: `Трофеи приключения: +${fallbackGained} яиц`,
      narrative: 'Вы успешно продолжили путь через осеннюю чащу.'
    });
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

    if (res.goldenKey) {
      audio.playSuccess();
      this.eventManager.setGoldenKey(true);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Реликвия получена',
        effectTitle: 'Золотой Ключ получен!',
        narrative: 'Этот ключ открывает зачарованные цепи на 54 клетке и путь на второй круг!'
      });
      return;
    }

    if (res.divineHealing) {
      audio.playSuccess();
      const restored = this.eventManager.cleanseAndRestore();
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Очищение и исцеление',
        effectTitle: restored > 0 ? `Токсины сняты, возвращено +${restored} яиц` : 'Все негативные эффекты сняты',
        narrative: 'Целебный источник полностью восстановил ваше состояние.'
      });
      return;
    }

    if (res.amberElixir) {
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

    if (res.cardId || res.card) {
      audio.playSuccess();
      const card = res.cardId || res.card;
      const targetId = typeof card === 'object' ? card.id : card;
      this.eventManager.addCard(targetId);
      const cardInfo = getCardById(targetId);
      const cardName = cardInfo ? `«${cardInfo.name}»` : targetId;
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.BOOSTER,
        label: 'Карта в колоду',
        effectTitle: `Получена карта: ${cardName}`,
        narrative: 'Боевая карта добавлена в вашу коллекцию и готова к битве с Бобром.'
      });
      return;
    }

    if (res.bossWeaknessHp) {
      audio.playSuccess();
      this.eventManager.setBossWeaknessHp(res.bossWeaknessHp);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Уязвимость Босса',
        effectTitle: `Здоровье Бобра уменьшено на -${res.bossWeaknessHp} HP`,
        narrative: 'Вы разведали уязвимые места плотины. В начале битвы босс получит урон.'
      });
      return;
    }

    if (res.bonusMaxHp) {
      audio.playSuccess();
      this.eventManager.addBonusMaxHp(res.bonusMaxHp);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Бонус выносливости',
        effectTitle: `Максимальное здоровье героя: +${res.bonusMaxHp} HP`,
        narrative: 'Ваш запас стойкости в решающей битве увеличен.'
      });
      return;
    }

    if (res.speedBoost) {
      audio.playSuccess();
      this.eventManager.setSpeedBoost(res.speedBoost);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Попутный ветер',
        effectTitle: `Бонус к следующему ходу: +${res.speedBoost} к шагам`,
        narrative: 'Воздушный поток ускорит ваше продвижение при следующем броске костей.'
      });
      return;
    }

    if (res.compass) {
      audio.playSuccess();
      this.eventManager.setCompass(true);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Точный ориентир',
        effectTitle: 'Компас туриста активирован',
        narrative: 'Теперь густой туман на развилках не сможет сбить вас с пути!'
      });
      return;
    }

    if (res.cloverBuff) {
      audio.playSuccess();
      this.eventManager.setCloverBuff(true);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Удача Четырёхлистника',
        effectTitle: 'Бафф Клевера активирован',
        narrative: 'В следующей викторине 2 неверных ответа будут вычеркнуты!'
      });
      return;
    }

    if (res.stepForward) {
      audio.playSuccess();
      this.eventManager.stepForward(res.stepForward);
      this.showOutcomeWithBanner({
        isGood: true,
        icon: BOARD_ASSET_ICONS.TILE_GOOD,
        label: 'Рывок вперёд',
        effectTitle: `Продвижение на +${res.stepForward} клеток вперёд`,
        narrative: 'Лесной вихрь переносит вас вперёд по тропе.'
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
        effectTitle: `Перемещение на ${res.stepBack} клетку назад`,
        narrative: 'Преграда вынуждает вас отступить назад.'
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
    if (this.activeMinigame && typeof this.activeMinigame.destroy === 'function') {
      this.activeMinigame.destroy();
      this.activeMinigame = null;
    }

    const bb = document.getElementById('board-quest-bottom-bar');
    if (bb) bb.innerHTML = '';
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }

  /**
   * Награждение картой (вызывается из мини-игр FairAttractionsGame, CharityGame и др.)
   */
  rewardCard(cardId, narrative = '') {
    if (!cardId) return;
    audio.playSuccess();
    const targetId = typeof cardId === 'object' ? cardId.id : cardId;
    this.eventManager.addCard(targetId);
    const cardInfo = getCardById(targetId);
    const cardName = cardInfo ? `«${cardInfo.name}»` : targetId;
    this.showOutcomeWithBanner({
      isGood: true,
      icon: BOARD_ASSET_ICONS.BOOSTER,
      label: 'Карта в колоду',
      effectTitle: `Получена карта: ${cardName}`,
      narrative: narrative || 'Боевая карта добавлена в вашу коллекцию и готова к битве с Бобром.'
    });
  }
}