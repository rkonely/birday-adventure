/**
 * BoardQuestModal.js — Интерактивное модальное окно квестов, видео и диалогов
 * Использует:
 * - Big Frame.png (1039 x 678) для диалогов и заданий
 * - Cut-Scene-Boardgame.png (615 x 410) для обрамления видео кат-сцен
 * - Boardgame-UI-Answer.png (196 x 54) для кнопок вариантов ответов
 * - Leaf Green Button.png для кнопок подтверждения и продолжения
 */

import { audio } from '../core/AudioManager.js';
import { ANIMAL_QUIZ_QUESTIONS } from './boardEventsData.js';

export class BoardQuestModal {
 constructor(eventManager) {
 this.eventManager = eventManager;
 this.modalEl = null;
 this.currentEvent = null;
 this.onCompleteCallback = null;

 // Ссылки на под-элементы
 this.videoEl = null;
 this.videoWrapper = null;
 this.dialogueWrapper = null;
 this.titleText = null;
 this.speakerText = null;
 this.descText = null;
 this.optionsContainer = null;
 this.resultBadge = null;

 // Внутреннее состояние мини-игр
 this.strongmanAnimId = null;
 this.timestopTimerId = null;
 this.timestopStartTime = 0;
 this.isTimestopRunning = false;

 this.createDOM();
 }

 createDOM() {
 let existing = document.getElementById('board-quest-modal');
 if (existing) existing.remove();

 this.modalEl = document.createElement('div');
 this.modalEl.id = 'board-quest-modal';
 this.modalEl.className = 'board-quest-modal hidden';

 this.modalEl.innerHTML = `
 <div class="board-quest-window" id="board-quest-window">
 <!-- Верхняя плашка с заголовком ивента -->
 <div class="board-quest-title-header">
 <span id="board-quest-title" class="board-quest-title-text">СОБЫТИЕ</span>
 </div>

 <!-- Кнопка закрытия (Esc / ✕) -->
 

 <!-- Тело квеста на пергаменте -->
 <div class="board-quest-content">
 
 <!-- 1. Контейнер Видео-Катсцены в Cut-Scene-Boardgame.png -->
 <div id="board-cutscene-container" class="board-cutscene-container hidden">
 <video id="board-cutscene-video" class="board-cutscene-video" playsinline preload="auto"></video>
 <div class="board-cutscene-frame"></div>
 
 </div>

 <!-- 2. Блок повествования и диалогов -->
 <div id="board-dialogue-block" class="board-dialogue-block">
 <div class="board-speaker-row">
 <span id="board-quest-speaker" class="board-speaker-name">Рассказчик</span>
 </div>
 <div id="board-quest-desc" class="board-quest-desc">Описание события...</div>
 </div>

 <!-- 3. Интерактивная зона (Варианты ответов / Мини-игры) -->
 <div id="board-quest-interactive" class="board-quest-interactive">
 <!-- Сюда динамически монтируются кнопки Boardgame-UI-Answer.png или мини-игры -->
 </div>

 <!-- 4. Итоговый результат / Награда -->
 <div id="board-quest-result" class="board-quest-result hidden">
 <div id="board-quest-result-text" class="board-result-text">+5 ЯИЦ!</div>
 
 </div>

 </div>
    <div id="board-quest-bottom-bar" class="board-quest-bottom-bar"></div>
  </div>
  `;

 document.getElementById('ui-layer').appendChild(this.modalEl);

 // Привязываем элементы
 this.titleText = document.getElementById('board-quest-title');
 this.speakerText = document.getElementById('board-quest-speaker');
 this.descText = document.getElementById('board-quest-desc');
 this.videoWrapper = document.getElementById('board-cutscene-container');
 this.videoEl = document.getElementById('board-cutscene-video');
 this.dialogueWrapper = document.getElementById('board-dialogue-block');
 this.interactiveContainer = document.getElementById('board-quest-interactive');
 this.resultContainer = document.getElementById('board-quest-result');
 this.resultText = document.getElementById('board-quest-result-text');

 // Кнопка пропуска видео
 const btnSkip = document.getElementById('btn-skip-cutscene');
 if (btnSkip) {
 btnSkip.addEventListener('click', (e) => {
 e.stopPropagation();
 this.onVideoFinishedOrSkipped();
 });
 }

 // Кнопка закрытия
 const btnClose = document.getElementById('board-quest-close');
 if (btnClose) {
 btnClose.addEventListener('click', () => this.close());
 }

 // Кнопка продолжить
 const btnContinue = document.getElementById('btn-quest-continue');
 if (btnContinue) {
 btnContinue.addEventListener('click', () => {
 audio.playClick();
 this.finishEvent();
 });
 }
 }

 /**
 * Открыть модальное окно для конкретного ивента
 */
 open(eventData, onComplete) {
 this.currentEvent = eventData;
 this.onCompleteCallback = onComplete;
 this.pendingResult = null;

 if (!this.modalEl) this.createDOM();

 this.titleText.textContent = eventData.title || 'СОБЫТИЕ';
 this.speakerText.textContent = eventData.speaker || 'Лесной Путник';
 this.descText.textContent = eventData.text || '';

 // Сброс видимости секций
 this.resultContainer.classList.add('hidden');
    const bb = document.getElementById('board-quest-bottom-bar'); if (bb) bb.innerHTML = '';
 this.interactiveContainer.innerHTML = '';

 this.modalEl.classList.remove('hidden');

 // Если есть вступительное видео — запускаем его
 if (eventData.video) {
 this.playCutscene(eventData.video, () => {
 this.renderEventStage(eventData);
 });
 } else {
 this.videoWrapper.classList.add('hidden');
 this.renderEventStage(eventData);
 }
 }

 /**
 * Запуск видео в рамке Cut-Scene-Boardgame.png
 */
 playCutscene(videoSrc, onFinish) {
 this.videoWrapper.classList.remove('hidden');
 this.videoEl.src = videoSrc;
 this.videoEl.volume = Math.max(0.1, audio.getMusicVolume());
 this.videoEl.currentTime = 0;

 let hasAdvanced = false;
 const advance = () => {
 if (hasAdvanced) return;
 hasAdvanced = true;
 this.videoEl.pause();
 if (onFinish) onFinish();
 };

 // Слушаем завершение видео или достижение 80%
 this.videoEl.onended = advance;
 this.videoEl.ontimeupdate = () => {
 if (this.videoEl.duration > 0) {
 const progress = this.videoEl.currentTime / this.videoEl.duration;
 // Запускаем переход на 80% проигрывания видео
 if (progress >= 0.85 && !hasAdvanced) {
 advance();
 }
 }
 };

 this.onVideoFinishedOrSkipped = () => advance();

 this.videoEl.play().catch(err => {
 console.warn('⚠️ [BoardQuestModal] Автоплей видео не удался, показываем контент:', err);
 advance();
 });
 }

 /**
 * Отрисовка интерактивной части после видео
 */
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
 case 'healing':
 case 'reward_video':
 case 'hazard_video':
 case 'reward':
 case 'hazard':
 case 'wheel_video':
 case 'boss_door':
 case 'bounce':
 default:
 this.renderSimpleAction(evt);
 break;
 }
 }

 /**
 * 1. Викторина о лесных зверях (Cell 2 & 34)
 */
 renderQuiz(evt) {
 const qData = ANIMAL_QUIZ_QUESTIONS[Math.floor(Math.random() * ANIMAL_QUIZ_QUESTIONS.length)];
 this.descText.innerHTML = `<em>«${qData.question}»</em><br><small style="color:#a89f91;">(${qData.hint})</small>`;

 const grid = document.createElement('div');
 grid.className = 'board-answers-grid';

 // Перемешиваем ответы
 const answers = qData.answers.map((ans, idx) => ({ text: ans, isCorrect: idx === qData.correctIndex }));
 answers.sort(() => Math.random() - 0.5);

 answers.forEach(item => {
 const btn = document.createElement('button');
 btn.className = 'btn-board-answer';
 btn.innerHTML = `<span class="btn-board-answer-text">${item.text}</span>`;
 btn.addEventListener('click', () => {
 audio.playClick();
 if (item.isCorrect) {
 audio.playSuccess();
 this.eventManager.addEggs(evt.rewardEggs || 5, 'Викторина лесных друзей');
 this.showResult(`ВЕРНО! <br>Мышонок пожимает крыло и дарит +${evt.rewardEggs || 5} яиц!`);
 } else {
 audio.playImpact();
 this.showResult('УВЫ, НЕВЕРНО! <br>Мышонок вздыхает, но угощает вас чаем.');
 }
 });
 grid.appendChild(btn);
 });

 this.interactiveContainer.appendChild(grid);
 }

 /**
 * 2. Выбор из нескольких вариантов (Cell 10, 11, 13, 16, 24)
 */
 renderChoice(evt) {
 const grid = document.createElement('div');
 grid.className = 'board-answers-grid';

 (evt.options || []).forEach(opt => {
 const btn = document.createElement('button');
 btn.className = 'btn-board-answer';
 btn.innerHTML = `<span class="btn-board-answer-text">${opt.text}</span>`;
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
 this.showResult('Вы решили не рисковать и спокойно продолжили путь.');
 return;
 }

 // Cell 10: Ориентир (развилка в тумане)
 if (key === 'left' || key === 'right') {
 const isCorrect = Math.random() < 0.5;
 if (isCorrect) {
 audio.playSuccess();
 this.showResult('ВЫ УГАДАЛИ ТРОПУ! <br>Туман рассеялся, тропа ведёт прямо вперёд!');
 } else {
 audio.playImpact();
 this.eventManager.setReverseNextMove(true);
 this.showResult('ТУМАН ЗАВЁЛ В ТУПИК! <br>Вы потеряли ориентир: следующий бросок кубика сделает шаг НАЗАД!');
 }
 return;
 }

 // Cell 11: Жертвоприношение монументу
 if (key === 'sacrifice_2') {
 if (this.eventManager.stats.eggs >= 2) {
 audio.playSuccess();
 this.eventManager.loseEggs(2, 'Жертва Монументу', true);
 this.eventManager.setImmunity(true);
 this.showResult('ДАР ПРИНЯТ! ️<br>Вы пожертвовали 2 яйца и получили ЩИТ ИММУНИТЕТА к несчастьям!');
 } else {
 audio.playImpact();
 this.showResult('У вас недостаточно яиц для пожертвования.');
 }
 return;
 }

 // Cell 13: Выпить родниковую воду
 if (key === 'drink_water') {
 audio.playSuccess();
 this.eventManager.setMysteriousBuff('Благословение Чистого Ручья');
 this.showResult('ПРОХЛАДА И БОДРОСТЬ! <br>Вы чувствуете прилив сил. В статус-баре появился загадочный бафф!');
 return;
 }

 // Cell 16: Спуститься в подвал (курица)
 if (key === 'enter_basement') {
 const isGood = Math.random() < 0.7; // 70% добрая курица
 if (isGood) {
 this.playCutscene('assets/videos/Event-16-1.mp4', () => {
 this.eventManager.addEggs(2, 'Добрая курочка в подвале');
 this.showResult('ТИХИЙ КУРЯТНИК! <br>Ласковая курочка протягивает вам +2 свежих яйца!');
 });
 } else {
 this.playCutscene('assets/videos/Event-16-2.mp4', () => {
 this.eventManager.loseEggs(2, 'Агрессивная курица');
 this.showResult('КУРИНЫЙ БОЕЦ! <br>Агрессивная курица набросилась и отняла 2 яйца!');
 });
 }
 return;
 }

 // Cell 9: Автомат с игрушками
 if (key === 'play_claw') {
 if (this.eventManager.stats.eggs >= 1) {
 this.eventManager.loseEggs(1, 'Жетоны автомата', true);
 const winBooster = Math.random() < 0.35;
 if (winBooster) {
 audio.playSuccess();
 this.eventManager.addBoosterPacks(1);
 this.showResult('ДЖЕКПОТ АВТОМАТА! карт<br>Клешня подцепила редкий БУСТЕР КАРТ ДЛЯ БОССА!');
 } else {
 audio.playSuccess();
 this.eventManager.addEggs(3, 'Приз из автомата');
 this.showResult('УДАЧНЫЙ УЛОВ! яиц<br>Клешня вытащила капсулу с +3 яйцами!');
 }
 } else {
 this.showResult('Не хватает яиц, чтобы опустить в монетоприёмник.');
 }
 return;
 }

 // Cell 24: Заброшенный подвал
 if (key === 'try_open') {
 audio.playImpact();
 this.showResult('ЗАМОК НЕ ПОДДАЁТСЯ! <br>Ржавый замок намертво заклинил. В подвал не проникнуть.');
 return;
 }
 }

 /**
 * 3. Коробка с 4 сюрпризами (Cell 17 & 25)
 */
 renderMysteryBoxes(evt) {
 const boxContainer = document.createElement('div');
 boxContainer.className = 'mystery-boxes-row';

 const boxes = [
 { id: 1, name: 'Кубик 1 кубик', video: 'assets/videos/Event-17-1.mp4', type: 'glove' },
 { id: 2, name: 'Кубик 2 кубик', video: 'assets/videos/Event-17-2.mp4', type: 'booster' },
 { id: 3, name: 'Кубик 3 кубик', video: 'assets/videos/Event-17-3.mp4', type: 'reroll' },
 { id: 4, name: 'Кубик 4 кубик', video: 'assets/videos/Event-17-4.mp4', type: 'golden' }
 ];

 // Перемешиваем кубики, чтобы игрок действительно угадывал
 boxes.sort(() => Math.random() - 0.5);

 boxes.forEach((box, i) => {
 const btn = document.createElement('button');
 btn.className = 'btn-board-answer mystery-box-btn';
 btn.innerHTML = `<span class="btn-board-answer-text">Шкатулка #${i + 1}</span>`;
 btn.addEventListener('click', () => {
 audio.playClick();
 boxContainer.remove();

 this.playCutscene(box.video, () => {
 if (box.type === 'glove') {
 audio.playImpact();
 this.eventManager.loseEggs(4, 'Боксёрская перчатка');
 this.showResult('БАМ! БОКСЁРСКИЙ ТУМАК! <br>Из коробки вылетела перчатка на пружине! Потеряно -4 яиц яйца!');
 } else if (box.type === 'booster') {
 audio.playSuccess();
 this.eventManager.addBoosterPacks(1);
 this.showResult('БУСТЕР КАРТ! карт<br>Вы достали отличный набор карт с пернатым героем!');
 } else if (box.type === 'reroll') {
 audio.playSuccess();
 this.eventManager.addRerollDice(1);
 this.showResult('ДОПОЛНИТЕЛЬНЫЙ КУБИК! кубик<br>Вам достался +1 кубик на переброс хода!');
 } else if (box.type === 'golden') {
 audio.playSuccess();
 this.eventManager.addEggs(10, 'Золотое Яйцо');
 this.showResult('ЗОЛОТОЕ ЯЙЦО! яиц<br>Королевский куш: вы получаете +10 яиц!');
 }
 });
 });
 boxContainer.appendChild(btn);
 });

 this.interactiveContainer.appendChild(boxContainer);
 }

 /**
 * 4. Аттракцион Силомер (Cell 19)
 */
 renderStrongman(evt) {
 const wrap = document.createElement('div');
 wrap.className = 'strongman-game-wrap';

 wrap.innerHTML = `
 <div class="strongman-gauge-track">
 <div class="zone zone-green">Обычный (0)</div>
 <div class="zone zone-yellow">Средний (+3)</div>
 <div class="zone zone-red">МАКСИМУМ (+10)</div>
 <div id="strongman-pointer" class="strongman-pointer"></div>
 </div>
 <button id="btn-strongman-hit" class="btn-leaf-green">
 <span class="btn-leaf-green-text">УДАРИТЬ! (ПРОБЕЛ)</span>
 </button>
 `;

 this.interactiveContainer.appendChild(wrap);

 const pointer = document.getElementById('strongman-pointer');
 const btnHit = document.getElementById('btn-strongman-hit');

 let position = 0;
 let speed = 1.6;
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
 // Red zone: 75% to 100%
 if (position >= 75) {
 audio.playSuccess();
 this.eventManager.addEggs(10, 'Силомер - Суперудар');
 this.showResult('БОГАТЫРСКИЙ УДАР! <br>Колокол звенит на весь лес! Вы получаете ДЖЕКПОТ +10 яиц яиц!');
 } else if (position >= 40) {
 audio.playClick();
 this.eventManager.addEggs(3, 'Силомер - Средний');
 this.showResult('ХОРОШИЙ УДАР! <br>Неплохая сила: вы получаете +3 яиц яйца!');
 } else {
 audio.playImpact();
 this.showResult('СЛАБОВАТО! <br>Молот едва коснулся наковальни. Награды нет.');
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
 * 5. Челлендж Остановка Времени (Cell 20)
 */
 renderTimeStop(evt) {
 const wrap = document.createElement('div');
 wrap.className = 'timestop-game-wrap';

 wrap.innerHTML = `
 <div class="timestop-target-selector">
 <button id="btn-target-5" class="btn-board-answer"><span class="btn-board-answer-text">Цель: 05:00 с</span></button>
 <button id="btn-target-10" class="btn-board-answer"><span class="btn-board-answer-text">Цель: 10:00 с</span></button>
 </div>
 <div id="timestop-display" class="timestop-clock">00:00.00</div>
 <button id="btn-timestop-action" class="btn-leaf-green" style="display:none;">
 <span class="btn-leaf-green-text" id="timestop-btn-text">СТАРТ</span>
 </button>
 `;

 this.interactiveContainer.appendChild(wrap);

 let targetSeconds = 5;
 const clock = document.getElementById('timestop-display');
 const btnAction = document.getElementById('btn-timestop-action');
 const btnText = document.getElementById('timestop-btn-text');
 const btn5 = document.getElementById('btn-target-5');
 const btn10 = document.getElementById('btn-target-10');

 const selectTarget = (sec) => {
 targetSeconds = sec;
 document.querySelector('.timestop-target-selector').style.display = 'none';
 btnAction.style.display = 'inline-flex';
 clock.textContent = `Цель: ${sec.toFixed(2)} с`;
 };

 btn5.addEventListener('click', () => selectTarget(5));
 btn10.addEventListener('click', () => selectTarget(10));

 let isRunning = false;
 let startTime = 0;

 btnAction.addEventListener('click', () => {
 audio.playClick();
 if (!isRunning) {
 isRunning = true;
 btnText.textContent = 'СТОП! (ПРОБЕЛ)';
 startTime = performance.now();

 const updateClock = () => {
 if (!isRunning) return;
 const elapsed = (performance.now() - startTime) / 1000;
 clock.textContent = elapsed.toFixed(2) + ' s';
 this.timestopTimerId = requestAnimationFrame(updateClock);
 };
 this.timestopTimerId = requestAnimationFrame(updateClock);
 } else {
 isRunning = false;
 cancelAnimationFrame(this.timestopTimerId);
 const finalTime = (performance.now() - startTime) / 1000;
 clock.textContent = finalTime.toFixed(2) + ' s';

 const diff = Math.abs(finalTime - targetSeconds);
 btnAction.style.display = 'none';

 if (diff <= 0.08) {
 audio.playSuccess();
 this.eventManager.addEggs(30, 'Остановка времени - Джекпот');
 this.showResult(`ИДЕАЛЬНАЯ ТОЧНОСТЬ! ️<br>Вы остановили время на ${finalTime.toFixed(2)}с (разница всего ${diff.toFixed(2)}с)!<br>Награда: ДЖЕКПОТ +30 яиц яиц!`);
 } else if (diff <= 0.25) {
 audio.playSuccess();
 this.eventManager.addEggs(15, 'Остановка времени - Отлично');
 this.showResult(`ОТЛИЧНЫЙ ГЛАЗОМЕР! ️<br>Время: ${finalTime.toFixed(2)}с (разница ${diff.toFixed(2)}с).<br>Награда: +15 яиц яиц!`);
 } else if (diff <= 0.50) {
 audio.playSuccess();
 this.eventManager.addEggs(5, 'Остановка времени - Хорошо');
 this.showResult(`ХОРОШАЯ РЕАКЦИЯ! ️<br>Время: ${finalTime.toFixed(2)}с. Награда: +5 яиц яиц!`);
 } else {
 audio.playClick();
 this.eventManager.addEggs(1, 'Остановка времени - Утешительный');
 this.showResult(`ВРЕМЯ УБЕЖАЛО! ️<br>Вы остановились на ${finalTime.toFixed(2)}с.<br>Утешительный приз: +1 яиц яйцо!`);
 }
 }
 });
 }

 /**
 * 6. Птичье Бинго (Cell 32)
 */
 renderBingo(evt) {
 const wrap = document.createElement('div');
 wrap.className = 'bingo-tickets-grid';

 const numbers = [7, 13, 21, 42];
 numbers.forEach(num => {
 const btn = document.createElement('button');
 btn.className = 'btn-board-answer bingo-ticket-btn';
 btn.innerHTML = `<span class="btn-board-answer-text">Билет #${num} ️</span>`;
 btn.addEventListener('click', () => {
 audio.playClick();
 wrap.remove();

 this.playCutscene(evt.video || 'assets/videos/Event-32.mp4', () => {
 // 40% шанс на победу в Бинго
 const winningNumber = Math.random() < 0.45 ? num : numbers[(numbers.indexOf(num) + 1) % numbers.length];
 if (winningNumber === num) {
 audio.playSuccess();
 this.eventManager.addEggs(30, 'Победа в Бинго');
 this.showResult(`БИНГО! ВЫПАЛО ЧИСЛО ${winningNumber}! <br>Ваш билет оказался счастливым! Выигрыш: +30 яиц яиц!`);
 } else {
 audio.playImpact();
 this.showResult(`ВЫПАЛО ЧИСЛО ${winningNumber}! ️<br>К сожалению, ваш билет #${num} не выиграл. Идём дальше!`);
 }
 });
 });
 wrap.appendChild(btn);
 });

 this.interactiveContainer.appendChild(wrap);
 }

 /**
 * 7. Монумент благотворительности больным (Cell 21)
 */
 renderCharity(evt) {
 const grid = document.createElement('div');
 grid.className = 'board-answers-grid';

 const lost = this.eventManager.stats.lostEggsCount || 0;
 const potentialGain = lost * 10;

 const btnPay = document.createElement('button');
 btnPay.className = 'btn-board-answer';
 btnPay.innerHTML = `<span class="btn-board-answer-text">Пожертвовать 2 яиц</span>`;
 btnPay.addEventListener('click', () => {
 audio.playClick();
 if (this.eventManager.stats.eggs >= 2) {
 this.eventManager.loseEggs(2, 'Пожертвование Монументу', true);
 if (potentialGain > 0) {
 audio.playSuccess();
 this.eventManager.addEggs(potentialGain, 'Возврат потерянных яиц x10');
 this.showResult(`ВЕЛИКОЕ ЧУДО МИЛОСЕРДИЯ! ️<br>Вы пожертвовали 2 яйца. Тотем умножил все ${lost} потерянных вами яиц на 10!<br>Получено: +${potentialGain} яиц яиц!`);
 } else {
 audio.playSuccess();
 this.eventManager.addEggs(10, 'Благодарность монумента');
 this.showResult('БЛАГОСЛОВЕНИЕ ТОТЕМА! ️<br>Вы не теряли яиц на карте, но за доброту получаете +10 яиц яиц!');
 }
 } else {
 this.showResult('Недостаточно яиц для пожертвования.');
 }
 });

 const btnPass = document.createElement('button');
 btnPass.className = 'btn-board-answer';
 btnPass.innerHTML = `<span class="btn-board-answer-text">Пройти мимо </span>`;
 btnPass.addEventListener('click', () => {
 audio.playClick();
 this.showResult('Вы почтительно поклонились монументу и пошли дальше.');
 });

 grid.appendChild(btnPay);
 grid.appendChild(btnPass);
 this.interactiveContainer.appendChild(grid);
 }

 /**
 * 8. Простое действие (Сундуки, Мешочки, Яд, Босс, Отскок)
 */
 renderSimpleAction(evt) {
    const bottomBar = document.getElementById('board-quest-bottom-bar');
    if (bottomBar) {
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
  }

 applyActionResult(res, evt) {
 if (!res) {
 this.finishEvent();
 return;
 }

 if (res.eggs) {
 audio.playSuccess();
 this.eventManager.addEggs(res.eggs, evt.title);
 this.showResult(`ПОЛУЧЕНО: +${res.eggs} ЯИЦ!`);
 return;
 }

 if (res.loseEggs) {
 audio.playImpact();
 this.eventManager.loseEggs(res.loseEggs, evt.title);
 this.showResult(`ПОТЕРЯНО: -${res.loseEggs} ЯИЦ!`);
 return;
 }

 if (res.poison) {
 audio.playImpact();
 this.eventManager.addPoison(res.poison);
 this.showResult(`ВЫ ОТРАВЛЕНЫ НА ${res.poison} ХОДОВ!<br>Каждый ход вы будете терять по 1 яйцу.`);
 return;
 }

 if (res.rerollDice) {
 audio.playSuccess();
 this.eventManager.addRerollDice(res.rerollDice);
 this.showResult(`ПОЛУЧЕНО: +${res.rerollDice} КУБИКА ПЕРЕБРОСА!`);
 return;
 }

 if (res.boosterPacks) {
 audio.playSuccess();
 this.eventManager.addBoosterPacks(res.boosterPacks);
 this.showResult(`ПОЛУЧЕНО: +${res.boosterPacks} БУСТЕРА КАРТ ДЛЯ БОССА!`);
 return;
 }

 if (res.magnet) {
 audio.playSuccess();
 this.eventManager.setMagnet(res.magnet);
 this.showResult('ЯИЧНЫЙ МАГНИТ ВКЛЮЧЁН! <br>Следующее получение яиц умножится на 2 (x2)!');
 return;
 }

 if (res.heal) {
 audio.playSuccess();
 const restored = this.eventManager.cleanseAndRestore();
 this.showResult(`ПОЛНОЕ ИСЦЕЛЕНИЕ! <br>Яд снят! Возвращено ${restored} потерянных яиц!`);
 return;
 }

 if (res.isImmune) {
 audio.playSuccess();
 this.eventManager.setImmunity(true);
 this.showResult('ЩИТ ИММУНИТЕТА АКТИВИРОВАН!<br>Вы защищены от следующей потери яиц или яда.');
 return;
 }

 if (res.bossHpPenalty) {
 audio.playImpact();
 this.eventManager.setBossHpPenalty(res.bossHpPenalty);
 this.showResult('КАРА НЕБЕСНАЯ! <br>В финальной битве ваше максимальное HP будет 95 вместо 100!');
 return;
 }

 if (res.stepBack) {
 audio.playImpact();
 this.eventManager.stepBack(1);
 this.showResult('БАРЬЕР ОТБРОСИЛ ВАС НАЗАД! <br>Вы возвращаетесь прямо к логову Бобра!');
 return;
 }

 if (res.bossBattle) {
 this.finishEvent({ startBoss: true });
 return;
 }

 this.finishEvent();
 }

 /**
 * Показ карточки результата перед закрытием
 */
 showResult(htmlMsg) {
    this.videoWrapper.classList.add('hidden');
    this.interactiveContainer.innerHTML = '';
    this.resultContainer.classList.remove('hidden');
    this.resultText.innerHTML = htmlMsg;

    const bottomBar = document.getElementById('board-quest-bottom-bar');
    if (bottomBar) {
      bottomBar.innerHTML = '';
      const btn = document.createElement('button');
      btn.id = 'btn-quest-continue';
      btn.className = 'btn-leaf-green btn-quest-main-btn';
      btn.innerHTML = '<span class="btn-leaf-green-text">ПРОДОЛЖИТЬ</span>';
      btn.addEventListener('click', () => {
        audio.playClick();
        this.finishEvent();
      });
      bottomBar.appendChild(btn);
    }
  }

 finishEvent(meta = {}) {
 this.close();
 if (this.onCompleteCallback) {
 this.onCompleteCallback(meta);
 this.onCompleteCallback = null;
 }
 }

 close() {
 if (this.videoEl) {
 this.videoEl.pause();
 this.videoEl.removeAttribute('src');
 this.videoEl.load();
 }
 if (this.strongmanAnimId) cancelAnimationFrame(this.strongmanAnimId);
 if (this.timestopTimerId) cancelAnimationFrame(this.timestopTimerId);

 const bb = document.getElementById('board-quest-bottom-bar'); if (bb) bb.innerHTML = '';
    if (this.modalEl) {
 this.modalEl.classList.add('hidden');
 }
 }
}
