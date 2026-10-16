/**
 * boardEventsData.js — База данных шаблонов событий и квестов настольной игры
 * Каталог уникальных сущностей (EVENT_TEMPLATES) и привязка к клеткам (BOARD_EVENTS).
 */

export const ANIMAL_QUIZ_QUESTIONS = [
  {
    question: 'Сколько мудрых сов пряталось среди ветвей в первом лесу?',
    answers: ['5 сов', '3 совы', '2 совы', '7 сов'],
    correctIndex: 0,
    hint: 'Совы сидели тихо на верхних ярусах дубов.'
  },
  {
    question: 'Сколько колючих ежей шуршало в осенней траве?',
    answers: ['3 ёжика', '1 ёжик', '5 ежей', '2 ёжика'],
    correctIndex: 0,
    hint: 'Они собирали грибы и яблоки возле пеньков.'
  },
  {
    question: 'Сколько бурых медведей дремало на опушке бора?',
    answers: ['1 медведь', '2 медведя', 'Ни одного', '3 медведя'],
    correctIndex: 0,
    hint: 'Один могучий косолапый сторожил лесную чащу.'
  },
  {
    question: 'Сколько быстрых ланей промелькнуло между стволов?',
    answers: ['1 лань', '3 лани', '2 лани', '4 лани'],
    correctIndex: 0,
    hint: 'Грациозная лань встретилась на середине пути.'
  },
  {
    question: 'Сколько хитрых лисиц выслеживало птичьи гнёзда?',
    answers: ['1 лиса', '3 лисы', '2 лисы', '5 лисиц'],
    correctIndex: 0,
    hint: 'Рыжий хвост мелькал у подножия сосен.'
  },
  {
    question: 'Сколько трудяг-дятлов стучало по стволам деревьев?',
    answers: ['1 дятел', '2 дятла', '4 дятла', '3 дятла'],
    correctIndex: 0,
    hint: 'Красноголовый санитар леса усердно искал жучков.'
  },
  {
    question: 'Сколько полосатых енотов полоскало лапки у ручья?',
    answers: ['1 енот', '2 енота', '3 енота', 'Ни одного'],
    correctIndex: 0,
    hint: 'Любопытный енот прятался в дупле у воды.'
  },
  {
    question: 'Сколько осторожных барсуков вырыло нору под корнями?',
    answers: ['1 барсук', '2 барсука', '3 барсука', '4 барсука'],
    correctIndex: 0,
    hint: 'Скромный барсук показался всего один раз.'
  },
  {
    question: 'Сколько пугливых кроликов улепетывало при виде тени?',
    answers: ['1 кролик', '2 кролика', '5 кроликов', '3 кролика'],
    correctIndex: 0,
    hint: 'Белый пушистый комочек нырнул под куст.'
  },
  {
    question: 'Сколько грозных ястребов кружило высоко в небе?',
    answers: ['1 ястреб', '2 ястреба', '4 ястреба', '3 ястреба'],
    correctIndex: 0,
    hint: 'Один зоркий хищник парил над верхушками крон.'
  }
];

/**
 * Единый Каталог Шаблонов Событий (Event Templates)
 * Позволяет переиспользовать сущности на разных клетках и картах,
 * а также настраивать и выбирать их прямо в Stage2Editor.
 */
export const EVENT_TEMPLATES = {
  // 1. Старт и Сюжетные врата
  start_gate: {
    id: 'start_gate',
    category: 'gate',
    title: 'Врата Черепа',
    icon: '🚪',
    type: 'info',
    speaker: 'Хранитель Врат',
    text: 'Старт настольного приключения! Бросайте кубик, собирайте яйца и готовьтесь к решающей дуэли с Бобром!',
    actions: [{ text: 'В ПУТЬ! 🚀', result: null }]
  },

  boss_gate: {
    id: 'boss_gate',
    category: 'gate',
    title: 'Логово Бобра-Строителя!',
    icon: '🦫',
    type: 'boss_door',
    speaker: 'Бобёр-Архитектор',
    text: 'Огромные дубовые ворота плотины со скрипом отворяются. За ними возвышается трон Бобра! Пора развернуть веер карт и вступить в грандиозную битву!',
    actions: [{ text: 'В БОЙ С БОБРОМ! ⚔️', result: { bossBattle: true } }]
  },

  magic_barrier: {
    id: 'magic_barrier',
    category: 'hazard',
    title: 'ТЫ НЕ ПРОЙДЕШЬ!',
    icon: '🛑',
    type: 'bounce',
    video: 'assets/videos/Event-36.mp4',
    speaker: 'Магический Барьер',
    text: 'Глухая стена из зачарованных брёвен преграждает путь! Могучая ударная волна отбрасывает вас на 1 клетку назад — прямо в Логово Бобра!',
    actions: [{ text: 'ОТСТУПИТЬ К БОССУ (-1 КЛЕТКА)', result: { stepBack: 1 } }]
  },

  // 2. Викторины и Квесты
  quiz_campfire: {
    id: 'quiz_campfire',
    category: 'quest',
    title: 'Отдых у костра с лесными Друзьями',
    icon: '🏕️',
    type: 'quiz',
    video: 'assets/videos/Event-2.mp4',
    speaker: 'Мышонок-путник',
    text: 'Приветствую, крылатый путник! Присядь к костру, отведай горячего чая из лесных ягод. Проверим, насколько ты был внимателен во время полёта через первый лес?',
    rewardEggs: 5
  },

  // 3. Награды и Клады
  chest_regular: {
    id: 'chest_regular',
    category: 'reward',
    title: 'Обычный Сундук',
    icon: '📦',
    type: 'reward_video',
    video: 'assets/videos/Event-3.mp4',
    speaker: 'Тайник в дупле',
    text: 'Среди замшелых корней векового дуба припрятан старинный деревянный ларец. Кажется, замок слегка подался... Рискнёте откинуть кованую крышку?',
    rewardEggs: 6,
    actions: [{ text: 'ОТКРЫТЬ ЛАРЕЦ 🗝️', result: { eggs: 6 } }]
  },

  beaver_legendary_chest: {
    id: 'beaver_legendary_chest',
    category: 'reward',
    title: 'Легендарный Сундук Бобра',
    icon: '👑',
    type: 'reward_video',
    video: 'assets/videos/Event-15.mp4',
    speaker: 'Кованый ларь Плотины',
    text: 'Среди тяжелых бревен плотины замурован огромный золоченый ларь с печатью Бобра! Замки со скрежетом щёлкают... Какая мощь пернатых героев скрыта внутри?',
    actions: [{ text: 'ОТКРЫТЬ ЛЕГЕНДАРНЫЙ ЛАРЬ 👑', result: { boosterPacks: 3 } }]
  },

  lucky_clover: {
    id: 'lucky_clover',
    category: 'reward',
    title: 'Клевер Удачи',
    icon: '🍀',
    type: 'reward_video',
    video: 'assets/videos/Event-4.mp4',
    speaker: 'Лесной Росток',
    text: 'В изумрудной траве мягко сияет редчайший четырёхлистник! Лесные духи благословляют смелого путника, даруя власть над гранями судьбы.',
    actions: [{ text: 'КОСНУТЬСЯ КЛЕВЕРА 🍀', result: { rerollDice: 3 } }]
  },

  egg_pouch: {
    id: 'egg_pouch',
    category: 'reward',
    title: 'Мешочек Яиц',
    icon: '🥚',
    type: 'reward_video',
    video: 'assets/videos/Event-6.mp4',
    speaker: 'Забытый багаж',
    text: 'На толстой ветке сосны покачивается кем-то забытый птичий саквояж из мягкой замши. Увесистый узелок так и просится в руки!',
    actions: [{ text: 'РАЗВЯЗАТЬ УЗЕЛ 🎒', result: { eggs: 5 } }]
  },

  egg_magnet: {
    id: 'egg_magnet',
    category: 'reward',
    title: 'Яичный Магнит',
    icon: '🧲',
    type: 'reward_video',
    video: 'assets/videos/Event-7.mp4',
    speaker: 'Древний Артефакт',
    text: 'В ваших руках начинает вибрировать таинственная золотая подкова. Воздух вокруг наполняется статическим треском, притягивая энергию скорлупы...',
    actions: [{ text: 'ЗАРЯДИТЬ АРТЕФАКТ 🧲', result: { magnet: 2 } }]
  },

  holiday_gift: {
    id: 'holiday_gift',
    category: 'reward',
    title: 'Праздничный Подарок',
    icon: '🎁',
    type: 'reward',
    speaker: 'Бандероль с лентой',
    text: 'Нарядная коробка с пышным бантом подписана вашим именем! Внутри припрятано нечто особенное для именинника...',
    actions: [{ text: 'РАЗВЕРНУТЬ ПОДАРОК 🎁', result: { boosterPacks: 1 } }]
  },

  magic_oracle: {
    id: 'magic_oracle',
    category: 'reward',
    title: 'Магическое Предсказание',
    icon: '🔮',
    type: 'reward',
    speaker: 'Хрустальный Шар Оракула',
    text: 'В глубинах магической сферы клубится туман, сквозь который проступает сияющий логотип Steam... Оракул шепчет: "Великий подарок ждёт именинника — новые игры уже близко!"',
    actions: [{ text: 'ПРИНЯТЬ ПРОРОЧЕСТВО 🔮', result: { steamProphecy: true } }]
  },

  // 4. Мини-игры и Азарт
  mystery_boxes: {
    id: 'mystery_boxes',
    category: 'minigame',
    title: 'Коробка с Сюрпризом',
    icon: '🎁',
    type: 'mystery_boxes',
    playVideoAfterChoice: true,
    speaker: 'Шкатулка Фокусника',
    text: 'Перед вами четыре запечатанных кубика-коробочки с праздничными лентами. Внутри может скрываться как щедрый клад или редкая карта, так и коварный сюрприз... Положитесь на интуицию: какую выберете?'
  },

  wheel_fortune: {
    id: 'wheel_fortune',
    category: 'minigame',
    title: 'Колесо Лесной Фортуны!',
    icon: '🎡',
    type: 'wheel_video',
    video: 'assets/videos/Event-30.mp4',
    playVideoAfterChoice: true,
    speaker: 'Колесо Азарта',
    text: 'В лесной полутьме весело переливаются огни ярмарочного Колеса Фортуны! Стрелка замерла в ожидании смельчака. Какой сектор судьба уготовила именно вам?',
    actions: [{ text: 'ИСПЫТАТЬ УДАЧУ! 🎡', result: { eggs: 10 } }]
  },

  strongman_game: {
    id: 'strongman_game',
    category: 'minigame',
    title: 'Проверка Силача!',
    icon: '🔨',
    type: 'strongman',
    video: 'assets/videos/Event-19.mp4',
    playVideoAfterChoice: true,
    speaker: 'Аттракцион Силомер',
    text: 'Ударьте огромным молотом по наковальне! Зажмите [ПРОБЕЛ] или кнопку, следите за индикатором мощности и отпустите в нужный момент, чтобы показать силу!'
  },

  timestop_game: {
    id: 'timestop_game',
    category: 'minigame',
    title: 'Челлендж: Остановка Времени!',
    icon: '⏱️',
    type: 'timestop',
    speaker: 'Хранитель Хронометра',
    text: 'Проверьте свою реакцию и внутреннее чувство времени! Выберите цель, запустите секундомер и остановите его ровно секунда-в-секунду.'
  },

  bingo_game: {
    id: 'bingo_game',
    category: 'minigame',
    title: 'Птичье Бинго!',
    icon: '🎱',
    type: 'bingo',
    video: 'assets/videos/Event-32.mp4',
    playVideoAfterChoice: true,
    speaker: 'Крупье в смокинге',
    text: 'Лесной крупье в бархатном жилете приветствует вас за лотерейным столом! Вытяните счастливый билет — барабан с шарами уже начинает вращаться!'
  },

  toy_claw_machine: {
    id: 'toy_claw_machine',
    category: 'minigame',
    title: 'Автомат с Игрушками',
    icon: '🕹️',
    type: 'choice',
    speaker: 'Ретро-автомат Кран',
    text: 'Среди вековых сосен весело перемигивается неоновый винтажный кран-автомат. Внутри горой насыпаны призы! Рискнёте испытать ловкость клешни?',
    options: [
      { text: 'Опустить 1 яйцо 🕹️', choiceKey: 'play_claw' },
      { text: 'Пройти мимо 🌲', choiceKey: 'pass' }
    ]
  },

  // 5. Развилки и Выбор пути
  foggy_crossroad: {
    id: 'foggy_crossroad',
    category: 'choice',
    title: 'Ориентир: Развилка в тумане',
    icon: '🌫️',
    type: 'choice_video',
    video: 'assets/videos/Event-10.mp4',
    playVideoAfterChoice: true,
    speaker: 'Таинственный туман',
    text: 'Кто-то сбил стрелки компаса и затянул тропу густым белым паром. Какую тропу выбрать, чтобы не повернуть вспять?',
    options: [
      { text: 'Тропа налево ↖️', choiceKey: 'left' },
      { text: 'Тропа направо ↗️', choiceKey: 'right' }
    ]
  },

  mysterious_basement: {
    id: 'mysterious_basement',
    category: 'choice',
    title: 'Таинственный Подвал',
    icon: '🚪',
    type: 'choice',
    playVideoAfterChoice: true,
    speaker: 'Скрипучий люк',
    text: 'В земле приоткрыт массивный деревянный люк, откуда доносится приглушённое кудахтанье. Спуститься в таинственную прохладу или обойти стороной?',
    options: [
      { text: 'Спуститься в подвал 🔦', choiceKey: 'enter_basement' },
      { text: 'Пройти мимо 🌲', choiceKey: 'pass' }
    ]
  },

  abandoned_cellar: {
    id: 'abandoned_cellar',
    category: 'choice',
    title: 'Заброшенный Подвал',
    icon: '🗝️',
    type: 'choice',
    speaker: 'Ржавый замок',
    text: 'Окованная железом дверь уходит под вековой холм. На ней висит тяжёлый замок, покрытый мхом и ржавчиной. Попробовать взломать?',
    options: [
      { text: 'Попытаться открыть 🗝️', choiceKey: 'try_open' },
      { text: 'Не терять время 🌲', choiceKey: 'pass' }
    ]
  },

  spring_flask: {
    id: 'spring_flask',
    category: 'choice',
    title: 'Колба с Родниковой Водой',
    icon: '🧪',
    type: 'choice',
    speaker: 'Светящаяся Склянка',
    text: 'На серебряном блюдце стоит стеклянная колба с прохладной кристальной влагой. Внутри пляшут крошечные лазурные искорки.',
    options: [
      { text: 'Выпить залпом! 💧', choiceKey: 'drink_water' },
      { text: 'Оставить на месте 🌲', choiceKey: 'pass' }
    ]
  },

  // 6. Алтари и Исцеление
  divine_healing: {
    id: 'divine_healing',
    category: 'heal',
    title: 'Божественное Исцеление',
    icon: '💧',
    type: 'healing',
    speaker: 'Священный Родник',
    text: 'Хрустальные струи родника смывают любую усталость и скверну. Если на вас был яд — он развеивается, а потерянные силы возвращаются!',
    actions: [{ text: 'ОМЫТЬСЯ (ИЗЛЕЧЕНИЕ 💧)', result: { heal: true } }]
  },

  immunity_elixir: {
    id: 'immunity_elixir',
    category: 'heal',
    title: 'Эликсир Иммунитета',
    icon: '🛡️',
    type: 'reward',
    speaker: 'Флакон Алхимика',
    text: 'Густое янтарное зелье пахнет смолой и луговым мёдом. Сделав глоток, ваше тело окутывает мерцающий щит, защищающий от яда и потерь!',
    actions: [{ text: 'ВЫПИТЬ ЩИТ (ИММУНИТЕТ 🛡️)', result: { isImmune: true } }]
  },

  sacrifice_monument: {
    id: 'sacrifice_monument',
    category: 'altar',
    title: 'Монумент Самопожертвования',
    icon: '🗿',
    type: 'choice_video',
    video: 'assets/videos/Event-11.mp4',
    playVideoAfterChoice: true,
    speaker: 'Дух Монумента',
    text: 'Древний каменный монолит ждёт подношения. Если пожертвуете 2 яйца — получите священный Щит Несчастья (полный иммунитет к яду и потере яиц на 1 раз).',
    options: [
      { text: 'Пожертвовать 2 яйца 🥚', choiceKey: 'sacrifice_2' },
      { text: 'Воздержаться 🌲', choiceKey: 'pass' }
    ]
  },

  charity_monument: {
    id: 'charity_monument',
    category: 'altar',
    title: 'Монумент Болеющим и Обездоленным',
    icon: '🤲',
    type: 'charity',
    speaker: 'Статуя Милосердия',
    text: 'Пожертвуйте 2 яйца в чашу монумента. Если ваше сердце щедро, тотем возместит все яйца, когда-либо потерянные вами на этой карте, умножив их на 10 (x10)!',
    options: [
      { text: 'Пожертвовать 2 яйца 🥚', choiceKey: 'charity_pay' },
      { text: 'Пройти мимо 🌲', choiceKey: 'pass' }
    ]
  },

  // 7. Опасности и Ловушки
  spoiled_egg: {
    id: 'spoiled_egg',
    category: 'hazard',
    title: 'Тухлое Яйцо!',
    icon: '☣️',
    type: 'hazard_video',
    video: 'assets/videos/Event-5.mp4',
    speaker: 'Зловонная ловушка',
    text: 'Под ногой с треском лопается подозрительная скорлупа... Воздух наполняет едкий серный дым! Вы отравлены на 5 ходов (-1 яйцо каждый ход).',
    actions: [{ text: 'ОТДЫШАТЬСЯ (ЯД 5 ХОДОВ) ☣️', result: { poison: 5 } }]
  },

  poison_thorns: {
    id: 'poison_thorns',
    category: 'hazard',
    title: 'Ядовитые Шипы!',
    icon: '🥀',
    type: 'hazard_video',
    video: 'assets/videos/Event-12.mp4',
    speaker: 'Терновый капкан',
    text: 'Острые как бритва шипы дикого терновника оцарапали лапки! Растение выделяет токсин: вы отравлены на 4 хода (-1 яйцо за ход).',
    actions: [{ text: 'ТЕРПЕТЬ БОЛЬ (ЯД 4 ХОДА) 🥀', result: { poison: 4 } }]
  },

  fox_ambush: {
    id: 'fox_ambush',
    category: 'hazard',
    title: 'Нападение Хитрой Лисы!',
    icon: '🦊',
    type: 'hazard_video',
    video: 'assets/videos/Event-23.mp4',
    speaker: 'Рыжая воровка',
    text: 'Из кустов с молниеносной быстротой выскакивает рыжая лиса, ловко выхватывает из вашей сумки 3 яйца и растворяется в чаще!',
    actions: [{ text: 'УДЕРЖАТЬ ОСТАЛЬНОЕ (-3 яйца) 🦊', result: { loseEggs: 3 } }]
  },

  thunder_strike: {
    id: 'thunder_strike',
    category: 'hazard',
    title: 'Кара Небесная!',
    icon: '⚡',
    type: 'hazard',
    speaker: 'Громовая Туча',
    text: 'С ясного неба бьёт ослепительный фиолетовый разряд молнии! Опалённые перья ноют: в финальной битве с Бобром ваше здоровье уменьшится на 5 HP!',
    actions: [{ text: 'ВЫСТОЯТЬ (-5 HP К БОССУ) ⚡', result: { bossHpPenalty: 5 } }]
  }
};

/**
 * Карта событий 1..36 для классической доски (ссылается на уникальные шаблоны)
 */
export const BOARD_EVENTS = {
  1:  { ...EVENT_TEMPLATES.start_gate, index: 1 },
  2:  { ...EVENT_TEMPLATES.quiz_campfire, index: 2 },
  3:  { ...EVENT_TEMPLATES.chest_regular, index: 3 },
  4:  { ...EVENT_TEMPLATES.lucky_clover, index: 4 },
  5:  { ...EVENT_TEMPLATES.spoiled_egg, index: 5 },
  6:  { ...EVENT_TEMPLATES.egg_pouch, index: 6 },
  7:  { ...EVENT_TEMPLATES.egg_magnet, index: 7 },
  8:  { ...EVENT_TEMPLATES.divine_healing, index: 8 },
  9:  { ...EVENT_TEMPLATES.toy_claw_machine, index: 9 },
  10: { ...EVENT_TEMPLATES.foggy_crossroad, index: 10 },
  11: { ...EVENT_TEMPLATES.sacrifice_monument, index: 11 },
  12: { ...EVENT_TEMPLATES.poison_thorns, index: 12 },
  13: { ...EVENT_TEMPLATES.spring_flask, index: 13 },
  14: { ...EVENT_TEMPLATES.egg_pouch, index: 14 },
  15: { ...EVENT_TEMPLATES.beaver_legendary_chest, index: 15 },
  16: { ...EVENT_TEMPLATES.mysterious_basement, index: 16 },
  17: { ...EVENT_TEMPLATES.mystery_boxes, index: 17 },
  18: { ...EVENT_TEMPLATES.immunity_elixir, index: 18 },
  19: { ...EVENT_TEMPLATES.strongman_game, index: 19 },
  20: { ...EVENT_TEMPLATES.timestop_game, index: 20 },
  21: { ...EVENT_TEMPLATES.charity_monument, index: 21 },
  22: { ...EVENT_TEMPLATES.holiday_gift, index: 22 },
  23: { ...EVENT_TEMPLATES.fox_ambush, index: 23 },
  24: { ...EVENT_TEMPLATES.abandoned_cellar, index: 24 },
  25: { ...EVENT_TEMPLATES.mystery_boxes, index: 25 },
  26: { ...EVENT_TEMPLATES.egg_pouch, index: 26 },
  27: { ...EVENT_TEMPLATES.spoiled_egg, index: 27 },
  28: { ...EVENT_TEMPLATES.magic_oracle, index: 28 },
  29: { ...EVENT_TEMPLATES.lucky_clover, index: 29 },
  30: { ...EVENT_TEMPLATES.wheel_fortune, index: 30 },
  31: { ...EVENT_TEMPLATES.thunder_strike, index: 31 },
  32: { ...EVENT_TEMPLATES.bingo_game, index: 32 },
  33: { ...EVENT_TEMPLATES.egg_magnet, index: 33 },
  34: { ...EVENT_TEMPLATES.quiz_campfire, index: 34 },
  35: { ...EVENT_TEMPLATES.boss_gate, index: 35 },
  36: { ...EVENT_TEMPLATES.magic_barrier, index: 36 }
};
