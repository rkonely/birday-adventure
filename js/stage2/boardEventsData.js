/**
 * boardEventsData.js — База данных шаблонов событий, мини-игр и квестов настольной игры.
 * Адаптировано под расширенную доску (54 клетки) без использования эмодзи.
 */

export const BOARD_ASSET_ICONS = {
  EGG: 'assets/First-Level/Item/Egg/Default-Egg.png',
  BOOSTER: 'assets/UI/Status-Icon-CardCount.png',
  DICE: 'assets/UI/Status-Icon-DiceCount.png',
  TILE_NORMAL: 'assets/Second Level/Event - Title/01.png',
  TILE_GOOD: 'assets/Second Level/Event - Title/02.png',
  TILE_BAD: 'assets/Second Level/Event - Title/03.png',
  TILE_MINIGAME: 'assets/Second Level/Event - Title/04.png'
};

export const ANIMAL_QUIZ_QUESTIONS = [
  {
    question: 'Сколько мудрых сов пряталось среди ветвей в первом лесу?',
    answers: ['5 сов', '3 совы', '2 совы', '7 сов'],
    correctIndex: 0,
    hint: 'Вспомните верхние ярусы вековых дубов во время полёта.'
  },
  {
    question: 'Сколько колючих ежей шуршало в осенней траве?',
    answers: ['3 ежа', '1 ёж', '5 ежей', '2 ежа'],
    correctIndex: 0,
    hint: 'Они собирали запасы возле старых пней.'
  },
  {
    question: 'Сколько бурых медведей дремало на опушке бора?',
    answers: ['1 медведь', '2 медведя', 'Ни одного', '3 медведя'],
    correctIndex: 0,
    hint: 'Косолапый хозяин чащи предпочитает одиночество.'
  },
  {
    question: 'Сколько быстрых ланей промелькнуло между стволов?',
    answers: ['1 лань', '3 лани', '2 лани', '4 лани'],
    correctIndex: 0,
    hint: 'Грациозный силуэт показался ровно на середине маршрута.'
  },
  {
    question: 'Сколько хитрых лисиц выслеживало птичьи гнёзда?',
    answers: ['1 лиса', '3 лисы', '2 лисы', '5 лисиц'],
    correctIndex: 0,
    hint: 'Рыжий хвост мелькнул у самого подножия сосен.'
  },
  {
    question: 'Сколько трудяг-дятлов стучало по стволам деревьев?',
    answers: ['1 дятел', '2 дятла', '4 дятла', '3 дятла'],
    correctIndex: 0,
    hint: 'Лесной барабанщик работал в гордом одиночестве.'
  },
  {
    question: 'Сколько полосатых енотов полоскало лапки у ручья?',
    answers: ['1 енот', '2 енота', '3 енота', 'Ни одного'],
    correctIndex: 0,
    hint: 'Любопытный зверёк выглядывал из дупла у самой воды.'
  },
  {
    question: 'Сколько осторожных барсуков вырыло нору под корнями?',
    answers: ['1 барсук', '2 барсука', '3 барсука', '4 барсука'],
    correctIndex: 0,
    hint: 'Полосатая мордочка показалась из-под корней всего раз.'
  },
  {
    question: 'Сколько пугливых кроликов улепетывало при виде тени?',
    answers: ['1 кролик', '2 кролика', '5 кроликов', '3 кролика'],
    correctIndex: 0,
    hint: 'Белый комочек стремительно нырнул под раскидистый куст.'
  },
  {
    question: 'Сколько грозных ястребов кружило высоко в небе?',
    answers: ['1 ястреб', '2 ястреба', '4 ястреба', '3 ястреба'],
    correctIndex: 0,
    hint: 'В вышине над кронами парил единственный зоркий страж.'
  }
];

export const EVENT_TEMPLATES = {
  // 1. Сюжетные врата
  start_gate: {
    id: 'start_gate',
    category: 'gate',
    title: 'Врата Черепа',
    type: 'info',
    speaker: 'Хранитель Тропы',
    text: 'Древние каменные створы расступаются перед вами. Впереди лежит извилистая тропа через Загадочный Лес к плотине Бобра-Дровосека. Соберите как можно больше ресурсов и карт перед финальным штурмом.',
    actions: [{ text: 'НАЧАТЬ ПУТЬ', result: null }]
  },

  boss_gate: {
    id: 'boss_gate',
    category: 'gate',
    title: 'Цитадель Плотины',
    type: 'boss_door',
    speaker: 'Бобёр-Дровосек',
    text: 'Массивные дубовые ворота содрогаются от гула лесопилки. За ними возвышается трон главного инженера плотины. Приготовьте собранную колоду — отступать больше некуда.',
    actions: [{ text: 'ШТУРМОВАТЬ ПЛОТИНУ', result: { bossBattle: true } }]
  },

  magic_barrier: {
    id: 'magic_barrier',
    category: 'hazard',
    title: 'Зачарованный Завал',
    type: 'bounce',
    video: 'assets/videos/Event-36.mp4',
    speaker: 'Рунный Барьер',
    text: 'Стена из вековых брёвен скреплена древней печатью леса. Мощный импульс отбрасывает вас на шаг назад — прямо к главным воротам плотины.',
    actions: [{ text: 'ВЕРНУТЬСЯ К ВОРОТАМ', result: { stepBack: 1 } }]
  },

  // 2. Квесты и Встречи
  quiz_campfire: {
    id: 'quiz_campfire',
    category: 'quest',
    title: 'Привал у Лесного Костра',
    type: 'quiz',
    video: 'assets/videos/Event-2.mp4',
    speaker: 'Мышонок-летописец',
    text: 'Путник, присядь к огню и переведи дух. Я веду перепись всех обитателей нашей чащи. Поможешь мне сверить записи о тех, кого ты повстречал с высоты птичьего полёта?',
    rewardEggs: 6
  },

  forest_riddle_owl: {
    id: 'forest_riddle_owl',
    category: 'quest',
    title: 'Дозор Старого Филина',
    type: 'quiz',
    speaker: 'Старый Филин',
    text: 'Ночной страж внимательно смотрит на вас с сухой ветви. Ответьте верно на вопрос о лесных тропах, и он укажет на спрятанный в дупле запас.',
    rewardEggs: 7
  },

  // 3. Награды и Находки
  chest_regular: {
    id: 'chest_regular',
    category: 'reward',
    title: 'Окованный Ларец',
    type: 'reward_video',
    video: 'assets/videos/Event-3.mp4',
    speaker: 'Лесной тайник',
    text: 'Между мшистых корней старого дуба скрыт деревянный сундучок с бронзовыми накладками. Замок давно проржавел и легко поддаётся.',
    actions: [{ text: 'ОТПЕРЕТЬ КРЫШКУ', result: { eggs: 6 } }]
  },

  beaver_legendary_chest: {
    id: 'beaver_legendary_chest',
    category: 'reward',
    title: 'Кованый Ларь Архитектора',
    type: 'reward_video',
    video: 'assets/videos/Event-15.mp4',
    speaker: 'Казна Плотины',
    text: 'Перед вами личный резерв Бобра-Дровосека, опечатанный гербом плотины. Внутри хранятся элитные наборы тактических карт для грядущего сражения.',
    actions: [{ text: 'ВСКРЫТЬ ПЕЧАТЬ', result: { boosterPacks: 3 } }]
  },

  lucky_clover: {
    id: 'lucky_clover',
    category: 'reward',
    title: 'Четырёхлистник Судьбы',
    type: 'reward_video',
    video: 'assets/videos/Event-4.mp4',
    speaker: 'Дар поляны',
    text: 'Среди густого папоротника светится редкий изумрудный росток. Его сила позволяет обмануть случайность и изменить исход броска.',
    actions: [{ text: 'СОРВАТЬ ТАЛИСМАН', result: { rerollDice: 3 } }]
  },

  egg_pouch: {
    id: 'egg_pouch',
    category: 'reward',
    title: 'Походный Саквояж',
    type: 'reward_video',
    video: 'assets/videos/Event-6.mp4',
    speaker: 'Находка на ветвях',
    text: 'На нижнем суку сосны зацепилась добротная кожаная сумка, набитая мягким мхом и целыми яйцами. Отличное пополнение припасов.',
    actions: [{ text: 'ЗАБРАТЬ ПРИПАСЫ', result: { eggs: 5 } }]
  },

  egg_magnet: {
    id: 'egg_magnet',
    category: 'reward',
    title: 'Магнитный Оберег',
    type: 'reward_video',
    video: 'assets/videos/Event-7.mp4',
    speaker: 'Реликвия кузницы',
    text: 'Тяжёлая подкова из метеоритного сплава тихо гудит в лапах. Её поле притяжения удвоит следующую найденную вами партию яиц.',
    actions: [{ text: 'АКТИВИРОВАТЬ ОБЕРЕГ', result: { magnet: 2 } }]
  },

  holiday_gift: {
    id: 'holiday_gift',
    category: 'reward',
    title: 'Именной Свёрток',
    type: 'reward',
    speaker: 'Праздничная почта',
    text: 'Перевязанная алой лентой шкатулка адресована лично виновнику торжества. Внутри — запечатанный набор бойцов для вашей стаи.',
    actions: [{ text: 'РАСПАКОВАТЬ НАБОР', result: { boosterPacks: 1 } }]
  },

  magic_oracle: {
    id: 'magic_oracle',
    category: 'reward',
    title: 'Видение Оракула',
    type: 'reward',
    speaker: 'Сфера Предсказаний',
    text: 'Туман внутри хрустального шара складывается в знакомые очертания библиотеки игр. Звёзды гласят: впереди именинника ждёт пополнение коллекции в Steam и верная победа.',
    actions: [{ text: 'ПРИНЯТЬ ЗНАМЕНИЕ', result: { steamProphecy: true, eggs: 4 } }]
  },

  merchant_stash: {
    id: 'merchant_stash',
    category: 'reward',
    title: 'Привал Контрабандиста',
    type: 'reward',
    speaker: 'Брошенная повозка',
    text: 'У обочины стоит перевёрнутая тележка лесного торговца. Среди рассыпанных диковинок удалось отыскать и припасы, и запасную кость.',
    actions: [{ text: 'ОБЫСКАТЬ ТЕЛЕЖКУ', result: { eggs: 4, rerollDice: 1 } }]
  },

  // 4. Интерактивные Мини-Игры (без видео-заглушек)
  wheel_fortune: {
    id: 'wheel_fortune',
    category: 'minigame',
    title: 'Колесо Лесной Фортуны',
    type: 'wheel_game',
    speaker: 'Ярмарочный Механизм',
    text: 'Деревянное колесо оковано медью и разделено на шесть секторов. Толкните обод и проверьте, на чьей стороне сегодня госпожа Удача.'
  },

  timestop_game: {
    id: 'timestop_game',
    category: 'minigame',
    title: 'Хронометр Часовщика',
    type: 'timestop',
    speaker: 'Мастер Маятника',
    text: 'Древний часовой механизм не терпит суеты. Выберите контрольную отметку и остановите ход стрелки точно в заданное мгновение.'
  },

  strongman_game: {
    id: 'strongman_game',
    category: 'minigame',
    title: 'Наковальня Лесоруба',
    type: 'strongman',
    video: 'assets/videos/Event-19.mp4',
    playVideoAfterChoice: true,
    speaker: 'Испытание Силы',
    text: 'Тяжёлый кузнечный молот ждёт крепкого хвата. Поймайте момент наивысшего напряжения шкалы и обрушьте удар на рычаг.'
  },

  mystery_boxes: {
    id: 'mystery_boxes',
    category: 'minigame',
    title: 'Ларцы Иллюзиониста',
    type: 'mystery_boxes',
    playVideoAfterChoice: true,
    speaker: 'Загадочный Прилавок',
    text: 'На сукне выстроены четыре одинаковые шкатулки. Три из них хранят ценные дары, а в одной взведена коварная пружина. Сделайте выбор.'
  },

  bingo_game: {
    id: 'bingo_game',
    category: 'minigame',
    title: 'Лесной Розыгрыш',
    type: 'bingo',
    video: 'assets/videos/Event-32.mp4',
    playVideoAfterChoice: true,
    speaker: 'Распорядитель Тиража',
    text: 'Лотерейный барабан заряжен пронумерованными шарами. Выберите один из четырёх билетов перед тем, как механизм назовёт победный номер.'
  },

  toy_claw_machine: {
    id: 'toy_claw_machine',
    category: 'minigame',
    title: 'Механический Захват',
    type: 'claw_game',
    speaker: 'Автомат Диковинок',
    text: 'За стеклянной витриной движется стальная клешня. Дождитесь момента, когда захват окажется точно над центральной призовой капсулой, и нажмите кнопку.'
  },

  abandoned_cellar: {
    id: 'abandoned_cellar',
    category: 'minigame',
    title: 'Запертый Погреб',
    type: 'lockpick_game',
    speaker: 'Кованый Засов',
    text: 'Дверь в старый погреб удерживает трёхштифтовый механизм. Поочерёдно зафиксируйте все три штифта в зелёной зоне, чтобы отпереть хранилище.'
  },

  forest_thimbles: {
    id: 'forest_thimbles',
    category: 'minigame',
    title: 'Игра в Скорлупки',
    type: 'thimbles_game',
    speaker: 'Ловкий Бурундук',
    text: 'Лесной трюкач прячет золотое яйцо под одну из трёх ореховых скорлупок и стремительно меняет их местами. Уследите за правильной скорлупкой!'
  },

  // 5. Развилки и Выборы
  foggy_crossroad: {
    id: 'foggy_crossroad',
    category: 'choice',
    title: 'Развилка в Тумане',
    type: 'choice_video',
    video: 'assets/videos/Event-10.mp4',
    playVideoAfterChoice: true,
    speaker: 'Густая Дымка',
    text: 'Белая пелена скрыла дорожные камни, а стрелка компаса бешено вращается. Придётся довериться чутью, чтобы не свернуть на обратную петлю.',
    options: [
      { text: 'Свернуть на левую тропу', choiceKey: 'left' },
      { text: 'Держаться правой стороны', choiceKey: 'right' }
    ]
  },

  mysterious_basement: {
    id: 'mysterious_basement',
    category: 'choice',
    title: 'Подземелье под Корнями',
    type: 'choice',
    playVideoAfterChoice: true,
    speaker: 'Дубовый Люк',
    text: 'Из-под приоткрытой крышки люка тянет теплом и слышится тихое копошение. Вы можете проверить подвал или не рисковать припасами.',
    options: [
      { text: 'Спуститься по ступеням', choiceKey: 'enter_basement' },
      { text: 'Обойти стороной', choiceKey: 'pass' }
    ]
  },

  spring_flask: {
    id: 'spring_flask',
    category: 'choice',
    title: 'Сосуд с Живой Росой',
    type: 'choice',
    speaker: 'Алхимический Пьедестал',
    text: 'На каменном выступе покоится хрустальная колба. Жидкость внутри светится мягким лазурным светом и источает аромат хвои.',
    options: [
      { text: 'Осушить сосуд', choiceKey: 'drink_water' },
      { text: 'Не трогать находку', choiceKey: 'pass' }
    ]
  },

  smuggler_deal: {
    id: 'smuggler_deal',
    category: 'choice',
    title: 'Сделка с Сорокой',
    type: 'choice',
    speaker: 'Сорока-Скупщица',
    text: 'Черно-белая торговка предлагает обменять часть ваших яиц на запечатанный бустер карт из личной коллекции Бобра.',
    options: [
      { text: 'Отдать 4 яйца за Бустер карт', choiceKey: 'buy_booster_4' },
      { text: 'Отказаться от обмена', choiceKey: 'pass' }
    ]
  },

  // 6. Алтари и Исцеление
  divine_healing: {
    id: 'divine_healing',
    category: 'heal',
    title: 'Чистый Источник',
    type: 'healing',
    speaker: 'Священный Ключ',
    text: 'Прозрачная ключевая вода мгновенно нейтрализует любые лесные токсины и возвращает утраченные в пути силы и припасы.',
    actions: [{ text: 'ОМЫТЬСЯ В ИСТОЧНИКЕ', result: { heal: true } }]
  },

  immunity_elixir: {
    id: 'immunity_elixir',
    category: 'heal',
    title: 'Янтарный Эликсир',
    type: 'reward',
    speaker: 'Лавка Травника',
    text: 'Густой настой из кедровой живицы укрепляет оперение и создаёт защитный барьер, который примет на себя следующий удар ловушки или яда.',
    actions: [{ text: 'ПРИНЯТЬ ЭЛИКСИР', result: { isImmune: true } }]
  },

  sacrifice_monument: {
    id: 'sacrifice_monument',
    category: 'altar',
    title: 'Алтарь Стража',
    type: 'choice_video',
    video: 'assets/videos/Event-11.mp4',
    playVideoAfterChoice: true,
    speaker: 'Каменный Идол',
    text: 'Высеченный в скале лик хранит древний договор. Оставьте в чаше два яйца, и дух леса укроет вас непробиваемым щитом от следующей беды.',
    options: [
      { text: 'Возложить 2 яйца на алтарь', choiceKey: 'sacrifice_2' },
      { text: 'Продолжить путь без дара', choiceKey: 'pass' }
    ]
  },

  charity_monument: {
    id: 'charity_monument',
    category: 'altar',
    title: 'Чаша Возмездия и Щедрости',
    type: 'charity',
    speaker: 'Древний Тотем',
    text: 'Тотем помнит каждую потерю, понесённую вами на этой тропе. Внесите скромную лепту в 2 яйца, чтобы вернуть все утраченные ранее ресурсы в десятикратном размере.',
    options: [
      { text: 'Внести 2 яйца в чашу', choiceKey: 'charity_pay' },
      { text: 'Пройти мимо тотема', choiceKey: 'pass' }
    ]
  },

  // 7. Опасности и Ловушки
  spoiled_egg: {
    id: 'spoiled_egg',
    category: 'hazard',
    title: 'Болотная Испарина',
    type: 'hazard_video',
    video: 'assets/videos/Event-5.mp4',
    speaker: 'Ядовитая Ловушка',
    text: 'Под шагом вскрылась старая болотная капсула! Едкое облако спор проникает в лёгкие — в течение следующих 5 ходов вы будете терять силы.',
    actions: [{ text: 'ПРОДОЛЖИТЬ ЧЕРЕЗ ДЫМ', result: { poison: 5 } }]
  },

  poison_thorns: {
    id: 'poison_thorns',
    category: 'hazard',
    title: 'Заросли Чёрного Терновника',
    type: 'hazard_video',
    video: 'assets/videos/Event-12.mp4',
    speaker: 'Шипастая Преграда',
    text: 'Колючие плети смыкаются прямо на тропе. Ядовитый сок шипов вызывает ослабление на ближайшие 4 хода.',
    actions: [{ text: 'ПРОРВАТЬСЯ СКВОЗЬ ЧАЩУ', result: { poison: 4 } }]
  },

  fox_ambush: {
    id: 'fox_ambush',
    category: 'hazard',
    title: 'Лисья Засада',
    type: 'hazard_video',
    video: 'assets/videos/Event-23.mp4',
    speaker: 'Лесная Разбойница',
    text: 'Рыжая тень молнией метнулась из папоротника! Прежде чем вы успели взмахнуть крылом, плутовка облегчила ваш походный мешок.',
    actions: [{ text: 'ПРОВЕРИТЬ ОСТАТКИ', result: { loseEggs: 3 } }]
  },

  thunder_strike: {
    id: 'thunder_strike',
    category: 'hazard',
    title: 'Грозовой Разряд',
    type: 'hazard',
    speaker: 'Штормовой Фронт',
    text: 'Ослепительная молния бьёт в верхушку соседней сосны! Ударная волна ослабляет вашу стойкость перед финальной схваткой с Боссом.',
    actions: [{ text: 'ВОССТАНОВИТЬ РАВНОВЕСИЕ', result: { bossHpPenalty: 5 } }]
  },

  beaver_patrol_tax: {
    id: 'beaver_patrol_tax',
    category: 'hazard',
    title: 'Застава Дровосеков',
    type: 'hazard',
    speaker: 'Патруль Плотины',
    text: 'Механический часовой Бобра перегородил узкий мостик. За проход без боя система безопасности списывает пошлину с ваших припасов.',
    actions: [{ text: 'УПЛАТИТЬ ПОШЛИНУ', result: { loseEggs: 2 } }]
  }
};

/**
 * Базовая раскладка на 54 клетки по умолчанию
 */
const DEFAULT_54_SEQUENCE = [
  'start_gate',             // 1
  'quiz_campfire',          // 2
  'chest_regular',          // 3
  'lucky_clover',           // 4
  'spoiled_egg',            // 5
  'egg_pouch',              // 6
  'egg_magnet',             // 7
  'divine_healing',         // 8
  'toy_claw_machine',       // 9
  'foggy_crossroad',        // 10
  'sacrifice_monument',     // 11
  'poison_thorns',          // 12
  'spring_flask',           // 13
  'egg_pouch',              // 14
  'beaver_legendary_chest', // 15
  'mysterious_basement',    // 16
  'mystery_boxes',          // 17
  'immunity_elixir',        // 18
  'strongman_game',         // 19
  'timestop_game',          // 20
  'charity_monument',       // 21
  'holiday_gift',           // 22
  'fox_ambush',             // 23
  'abandoned_cellar',       // 24
  'forest_thimbles',        // 25
  'egg_pouch',              // 26
  'spoiled_egg',            // 27
  'magic_oracle',           // 28
  'lucky_clover',           // 29
  'wheel_fortune',          // 30
  'thunder_strike',         // 31
  'bingo_game',             // 32
  'egg_magnet',             // 33
  'smuggler_deal',          // 34
  'merchant_stash',         // 35
  'beaver_patrol_tax',      // 36
  'forest_riddle_owl',      // 37
  'chest_regular',          // 38
  'foggy_crossroad',        // 39
  'toy_claw_machine',       // 40
  'poison_thorns',          // 41
  'divine_healing',         // 42
  'mystery_boxes',          // 43
  'abandoned_cellar',       // 44
  'fox_ambush',             // 45
  'wheel_fortune',          // 46
  'immunity_elixir',        // 47
  'timestop_game',          // 48
  'beaver_legendary_chest', // 49
  'strongman_game',         // 50
  'charity_monument',       // 51
  'quiz_campfire',          // 52
  'boss_gate',              // 53
  'magic_barrier'           // 54
];

export const BOARD_EVENTS = {};
DEFAULT_54_SEQUENCE.forEach((key, i) => {
  const step = i + 1;
  const tpl = EVENT_TEMPLATES[key] || EVENT_TEMPLATES.egg_pouch;
  BOARD_EVENTS[step] = { ...tpl, index: step };
});