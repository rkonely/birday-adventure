/**
 * boardEventsData.js — База данных шаблонов событий, мини-игр и квестов настольной игры.
 * Полная синхронизация с «Ивенты-Описание.pdf» и тайлами из assets/Second Level/Event - Title/Forest/.
 */

export const BOARD_ASSET_ICONS = {
  EGG: 'assets/First-Level/Item/Egg/Default-Egg.png',
  BOOSTER: 'assets/UI/Status-Icon-CardCount.png',
  DICE: 'assets/UI/Status-Icon-DiceCount.png',
  TILE_NORMAL: 'assets/Second Level/Event - Title/Forest/campfire.png',
  TILE_GOOD: 'assets/Second Level/Event - Title/Forest/Regular Chest.png',
  TILE_BAD: 'assets/Second Level/Event - Title/Forest/poisonous egg.png',
  TILE_MINIGAME: 'assets/Second Level/Event - Title/Forest/Wheel of Fortune.png'
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

export const OWL_ARCHIVE_QUESTIONS = [
  {
    question: 'Какой древний закон леса запрещает бобрам строить дамбу без согласования птиц?',
    answers: ['Уложение Осеннего Ветра', 'Кодекс Птичьих Гнёзд', 'Указ Дятла-Зодчего', 'Пакт Дубовых Крон'],
    correctIndex: 0,
    hint: 'Старый закон был начертан на коре первой упавшей сосны.'
  },
  {
    question: 'Какая птица в архиве числится главным знатоком тайных троп?',
    answers: ['Кулик-Турист', 'Белая Куропатка', 'Сова-Экзорцист', 'Снегирь-Сантехник'],
    correctIndex: 0,
    hint: 'Он никогда не выходит из дома без своего золотого компаса.'
  },
  {
    question: 'Что способно пробить каменную кладку плотины Бобра согласно свиткам?',
    answers: ['Удар клюва Дятла-Перфоратора', 'Штормовой разряд', 'Смола пиромантов', 'Тяжёлый якорь'],
    correctIndex: 0,
    hint: 'Непрерывное сверление способно сокрушить любую плотину.'
  }
];

export const EVENT_TEMPLATES = {
  // =========================================================================
  // 1. Сюжетные врата и рубежи
  // =========================================================================
  start_gate: {
    id: 'start_gate',
    category: 'gate',
    title: 'Врата Черепа (Старт)',
    type: 'start_gate',
    tileSprite: 'Empty-Tile4.png',
    speaker: 'Хранитель Тропы',
    text: 'Каменный пьедестал начала пути через Загадочный Лес к плотине Бобра-Дровосека. Соберите армию и припасы перед штурмом!',
    actions: [{ text: 'НАЧАТЬ ПУТЬ', result: null }]
  },

  boss_gate: {
    id: 'boss_gate',
    category: 'gate',
    title: 'Цитадель Плотины (Босс)',
    type: 'boss_door',
    tileSprite: 'Boss Room.png',
    speaker: 'Бобёр-Дровосек',
    text: 'Массивные дубовые ворота содрогаются от гула лесопилки. За ними возвышается трон главного инженера плотины — Бобра-Дровосека!',
    options: [
      { text: 'ШТУРМОВАТЬ ПЛОТИНУ', choiceKey: 'boss_attack' },
      { text: 'ПРОЙТИ НА ВТОРОЙ КРУГ (Нужен Золотой Ключ)', choiceKey: 'boss_second_lap', requiresKey: true }
    ]
  },

  magic_barrier: {
    id: 'magic_barrier',
    category: 'hazard',
    title: 'Зачарованный Завал (Барьер)',
    type: 'barrier_door',
    tileSprite: 'closed tile.png',
    speaker: 'Ворон-Страж Завала',
    text: 'Плита скована цепями и навесным замком. Ворон-страж не пускает дальше без Золотого Ключа.',
    options: [
      { text: 'ВЕРНУТЬСЯ К ВОРОТАМ (Без ключа: отбросит на 1 назад)', choiceKey: 'barrier_return' },
      { text: 'ОТПЕРЕТЬ ЦЕПИ КЛЮЧОМ (С ключом: перенесёт на Старт с бонусом!)', choiceKey: 'barrier_unlock', requiresKey: true }
    ]
  },

  // =========================================================================
  // 2. Ценные находки и дары (Позитивные клетки)
  // =========================================================================
  chest_regular: {
    id: 'chest_regular',
    category: 'reward',
    title: 'Окованный Ларец',
    type: 'choice',
    tileSprite: 'Regular Chest.png',
    speaker: 'Лесной Тайник',
    text: 'Среди замшелых корней векового дуба врос добротный сундучок с бронзовыми уголками. Под крышкой звенят припасы, но в дне виднеется потайная задвижка с хитрой пружиной.',
    options: [
      { text: 'Забрать верхний слой припасов (Надёжно: +4 яйца)', choiceKey: 'chest_safe' },
      { text: 'Поддеть потайное дно ножом (65%: +10 яиц / 35%: -2 HP на боссе)', choiceKey: 'chest_risk' }
    ]
  },

  beaver_legendary_chest: {
    id: 'beaver_legendary_chest',
    category: 'reward',
    title: 'Кованый Ларь Архитектора',
    type: 'choice',
    tileSprite: 'Legendary Chest.png',
    speaker: 'Сейф Плотины',
    text: 'Личный сейф Бобра-Дровосека, окованный воронёной сталью и скреплённый сургучной печатью плотины. Внутри хранится элитный резерв для решающего штурма.',
    options: [
      { text: 'Сорвать печать и забрать наборы карт (+2 бустера и +5 яиц)', choiceKey: 'legendary_cards' },
      { text: 'Активировать маячок стаи (+1 бустер + редкая/эпик карта)', choiceKey: 'legendary_beacon' }
    ]
  },

  egg_pouch: {
    id: 'egg_pouch',
    category: 'reward',
    title: 'Походный Саквояж',
    type: 'choice',
    tileSprite: 'bag of eggs.png',
    speaker: 'Находка разведчика',
    text: 'На нижнем суку раскидистой ели висит кожаная сумка разведчика, подбитая мягким лесным мхом. Внутри аккуратно уложен паёк и дорожные заметки.',
    options: [
      { text: 'Упаковать яйца в свой рюкзак (+5 яиц)', choiceKey: 'pouch_eggs' },
      { text: 'Обыскать боковые кармашки (+3 яйца и +1 кубик переброса)', choiceKey: 'pouch_side' }
    ]
  },

  lucky_clover: {
    id: 'lucky_clover',
    category: 'reward',
    title: 'Четырёхлистник Судьбы',
    type: 'choice',
    tileSprite: 'clover.png',
    speaker: 'Дар папоротника',
    text: 'В гуще папоротника мягким изумрудным светом мерцает редкий четырёхлистник. Лепестки клевера шепчут, позволяя переписать неудачный бросок кости.',
    options: [
      { text: 'Вплести клевер в оперение (+3 кубика переброса)', choiceKey: 'clover_rerolls' },
      { text: 'Загадать желание на удачу (+2 кубика + Бафф Клевера)', choiceKey: 'clover_wish' }
    ]
  },

  egg_magnet: {
    id: 'egg_magnet',
    category: 'reward',
    title: 'Магнитный Оберег',
    type: 'reward',
    tileSprite: 'Magnet.png',
    speaker: 'Реликвия рудокопов',
    text: 'Массивная подкова из намагниченной руды тихо гудит в лапах. Мелкие монетки и скорлупки в траве сами собой начинают катиться в вашу сторону!',
    actions: [{ text: 'ЗАРЯДИТЬ ПОЛЕ ПРИТЯЖЕНИЯ (+2 яйца и Магнит x2)', result: { eggs: 2, magnet: 2 } }]
  },

  holiday_gift: {
    id: 'holiday_gift',
    category: 'reward',
    title: 'Именной Свёрток',
    type: 'reward',
    tileSprite: 'Gift Box.png',
    speaker: 'Праздничная почта',
    text: 'Нарядная алая коробка с золотым пышным бантом спущена на парашюте праздничной почты прямо к вашим лапам. На бирке выведено имя именинника!',
    actions: [{ text: 'РАЗВЯЗАТЬ ЗОЛОТУЮ ЛЕНТУ (+1 бустер и +5 яиц)', result: { boosterPacks: 1, eggs: 5 } }]
  },

  lost_compass: {
    id: 'lost_compass',
    category: 'reward',
    title: 'Потерянный Компас Туриста',
    type: 'choice',
    tileSprite: 'Golden Compas.png',
    speaker: 'Кулик-Турист',
    text: 'Растерянный Кулик ищет свой походный прибор для ориентирования в тумане.',
    options: [
      { text: 'Вернуть компас владельцу (Карта «Кулик-Турист»)', choiceKey: 'compass_return' },
      { text: 'Оставить компас себе (+2 кубика и Защита от Тумана)', choiceKey: 'compass_keep' }
    ]
  },

  magic_oracle: {
    id: 'magic_oracle',
    category: 'reward',
    title: 'Видение Оракула',
    type: 'choice',
    tileSprite: 'crystal ball.png',
    speaker: 'Сфера Предсказаний',
    text: 'На лиловой скатерти среди горящих свечей покоится хрустальная сфера и расклад карт Таро. Внутри шара клубится сиреневый туман, складываясь в очертания заветного подарка в Steam.',
    options: [
      { text: 'Вглядеться в пророчество Steam (+5 яиц, +1 кубик, знамение)', choiceKey: 'oracle_steam' },
      { text: 'Вытянуть одну из карт Таро (50% шанс карты «Сова-Маг»)', choiceKey: 'oracle_tarot' }
    ]
  },

  // =========================================================================
  // 3. Квесты и викторины
  // =========================================================================
  quiz_campfire: {
    id: 'quiz_campfire',
    category: 'quest',
    title: 'Привал у Лесного Костра',
    type: 'quiz',
    tileSprite: 'campfire.png',
    speaker: 'Мышонок-летописец',
    text: 'В ночной прохладе уютно потрескивают сосновые поленья. Мышонок-летописец разливает по кружкам горячий взвар из шиповника и сверяет заметки о зверях первого леса.',
    rewardEggs: 6
  },

  owl_library: {
    id: 'owl_library',
    category: 'quest',
    title: 'Лесной Архив Филина',
    type: 'choice',
    tileSprite: 'Library.png',
    speaker: 'Мудрый Ночной Страж',
    text: 'Мудрый ночной страж сидит среди свитков и задаёт вопрос о лесных тропах.',
    options: [
      { text: 'Ответить на вопрос летописи (Викторина: +7 яиц)', choiceKey: 'library_quiz' },
      { text: 'Изучить судебный свиток (-4 яйца: Карта «Пеликан-Адвокат» / «Сова-Маг»)', choiceKey: 'library_scroll' }
    ]
  },

  // =========================================================================
  // 4. Развилки и выбор пути
  // =========================================================================
  foggy_crossroad: {
    id: 'foggy_crossroad',
    category: 'choice',
    title: 'Развилка в Тумане',
    type: 'choice',
    tileSprite: 'Landmark.png',
    speaker: 'Покосившийся Указатель',
    text: 'Покосившийся деревянный указатель на перекрёстке окутан густым молочным туманом. Одна из стрелок явно повёрнута озорными духами леса в обратную сторону.',
    options: [
      { text: 'Пойти по левой стрелке (60% +5 яиц и кубик / 40% реверс)', choiceKey: 'fog_left' },
      { text: 'Пойти по правой стрелке (60% +5 яиц и кубик / 40% реверс)', choiceKey: 'fog_right' },
      { text: 'Взлететь над соснами (-2 яйца на разгон: безопасный обход + кубик)', choiceKey: 'fog_fly_over' }
    ]
  },

  mysterious_basement: {
    id: 'mysterious_basement',
    category: 'choice',
    title: 'Подземелье под Корнями',
    type: 'choice',
    tileSprite: 'basement hatch.png',
    speaker: 'Массивный деревянный люк',
    text: 'Массивный деревянный люк в каменной кладке ведёт в тёплый погреб под корнями дуба. Снизу доносится сонное квохтанье и звон склянок.',
    options: [
      { text: 'Спуститься со стуком и гостинцем (70% +6 яиц / 30% -2 яйца и кубик)', choiceKey: 'basement_enter' },
      { text: 'Не тревожить люк и собрать жёлуди рядом (+2 яйца безопасно)', choiceKey: 'basement_pass' }
    ]
  },

  spring_flask: {
    id: 'spring_flask',
    category: 'choice',
    title: 'Сосуд с Живой Росой',
    type: 'choice',
    tileSprite: 'bottle of water.png',
    speaker: 'Аптекарская Склянка',
    text: 'На деревянной подставке стоит пузатая склянка с лазурной родниковой водой. На дне переливаются кристаллы мяты и хвои.',
    options: [
      { text: 'Выпить живую росу (+4 яйца, снятие яда, «Тонус Ручья» +1 к ходу)', choiceKey: 'flask_drink' },
      { text: 'Приберечь колбу для уставших птиц (Карта «Голубка-Стажёр» или кубик)', choiceKey: 'flask_save' }
    ]
  },

  mail_bag: {
    id: 'mail_bag',
    category: 'choice',
    title: 'Почтовая Сумка с Картами',
    type: 'choice',
    tileSprite: 'map bag.png',
    speaker: 'Сорока-Почтальон',
    text: 'Чёрно-белая скупщица предлагает выменять запечатанный бустер карт или ценную почтовую птицу.',
    options: [
      { text: 'Помочь собрать письма (-4 яйца: Карта «Голубь-почтальон»)', choiceKey: 'mail_help' },
      { text: 'Выкупить секретный пакет (-8 яиц: +1 бустер карт)', choiceKey: 'mail_buy' }
    ]
  },

  // =========================================================================
  // 5. Алтари и Исцеление
  // =========================================================================
  divine_healing: {
    id: 'divine_healing',
    category: 'heal',
    title: 'Чистый Источник',
    type: 'healing',
    tileSprite: 'God Bless.png',
    speaker: 'Священный Родник',
    text: 'Сквозь изумрудную листву бьёт тёплый солнечный луч, озаряя лесную купель. Любая хворь и усталость отступают перед светом этого места.',
    actions: [{ text: 'ПРИНЯТЬ БЛАГОСЛОВЕНИЕ СВЕТА', result: { divineHealing: true } }]
  },

  immunity_elixir: {
    id: 'immunity_elixir',
    category: 'heal',
    title: 'Янтарный Эликсир',
    type: 'reward',
    tileSprite: 'Bless-Elixire.png',
    speaker: 'Лесной Травник',
    text: 'Хрустальный флакон в золотой оправе, наполненный густым медовым эликсиром лесного травника.',
    actions: [{ text: 'ВЫПИТЬ ЗАЩИТНЫЙ НАСТОЙ (Щит Неуязвимости / +6 яиц)', result: { amberElixir: true } }]
  },

  sacrifice_monument: {
    id: 'sacrifice_monument',
    category: 'altar',
    title: 'Алтарь Стража',
    type: 'choice',
    tileSprite: 'Monument.png',
    speaker: 'Гранитный Постамент',
    text: 'Строгий гранитный постамент древних защитников леса. На верхней плите высечена клятва: кто поделится малым, тот обретёт несокрушимую броню.',
    options: [
      { text: 'Возложить 2 яйца на алтарь (Щит Неуязвимости и +1 кубик)', choiceKey: 'sacrifice_give_2' },
      { text: 'Помолиться у камня без дара (+1 яйцо бесплатно)', choiceKey: 'sacrifice_pray' }
    ]
  },

  charity_monument: {
    id: 'charity_monument',
    category: 'altar',
    title: 'Чаша Возмездия и Щедрости',
    type: 'choice',
    tileSprite: 'Small Monument.png',
    speaker: 'Каменный Жертвенник',
    text: 'Приземистый каменный жертвенник со светящимся рунным углублением в центре. Камень хранит память о каждом яйце, отнятом ловушками.',
    options: [
      { text: 'Внести 2 яйца для обряда возмещения (Возврат потерь x3 или +10 яиц)', choiceKey: 'charity_restore' },
      { text: 'Попросить союзника вместо золота (-2 яйца: +1 обычная карта)', choiceKey: 'charity_ally' }
    ]
  },

  // =========================================================================
  // 6. Опасности и ловушки (Дебаффы)
  // =========================================================================
  spoiled_egg: {
    id: 'spoiled_egg',
    category: 'hazard',
    title: 'Болотная Испарина',
    type: 'hazard',
    tileSprite: 'poisonous egg.png',
    speaker: 'Треснувшее Яйцо Дракона',
    text: 'Среди кочек лежит треснувшее зелёное яйцо с силуэтом дракона, сочащееся едким болотным газом!',
    actions: [{ text: 'ПРОДОЛЖИТЬ ЧЕРЕЗ ДЫМ (Яд на 5 ходов)', result: { poison: 5 } }]
  },

  poison_thorns: {
    id: 'poison_thorns',
    category: 'hazard',
    title: 'Заросли Чёрного Терновника',
    type: 'hazard',
    tileSprite: 'prickly bush.png',
    speaker: 'Шипастые Лозы',
    text: 'Густое сплетение фиолетовых колючих лоз и зелёных щупалец преграждает тропу. На шипах поблёскивает сонный яд!',
    actions: [{ text: 'ПРОРВАТЬСЯ СКВОЗЬ ЧАЩУ (Яд на 4 хода)', result: { poison: 4 } }]
  },

  fox_ambush: {
    id: 'fox_ambush',
    category: 'hazard',
    title: 'Лисья Засада',
    type: 'choice',
    tileSprite: 'Cunning Fox.png',
    speaker: 'Рыжая Плутовка',
    text: 'На тропе, хитро прищурившись, сидит рыжая плутовка. Она явно намерена облегчить ваш кошель, но обожает азартные споры!',
    options: [
      { text: 'Отдать откупные и не связываться (-3 яйца)', choiceKey: 'fox_pay' },
      { text: 'Сыграть с Лисой в кости на интерес! (50%: +5 яиц / 50%: -4 яйца)', choiceKey: 'fox_gamble' }
    ]
  },

  wooden_totem: {
    id: 'wooden_totem',
    category: 'altar',
    title: 'Тотем Лесных Духов',
    type: 'choice',
    tileSprite: 'Wooden Totem.png',
    speaker: 'Деревянный Идол',
    text: 'Механический тотем часовых плотины требует почтения к духам леса перед переправой.',
    options: [
      { text: 'Поклониться Лику Совы (+1 кубик переброса и +2 яйца)', choiceKey: 'totem_owl' },
      { text: 'Поклониться Лику Медведя (+5 к макс. HP в битве с Боссом)', choiceKey: 'totem_bear' }
    ]
  },

  infernal_slab: {
    id: 'infernal_slab',
    category: 'hazard',
    title: 'Плита Преисподней',
    type: 'choice',
    tileSprite: 'Devil-Dmg.png',
    speaker: 'Раскалённый Багровый Алтарь',
    text: 'Раскалённая багровая плита, окружённая языками алого пламени! Жар опаляет перья и пытается ослабить вашу стойкость перед битвой с Боссом.',
    options: [
      { text: 'Принять удар стихии на себя (-5 HP на Боссе)', choiceKey: 'infernal_take_hit' },
      { text: 'Откупиться ледяным компрессом (-3 яйца, спасает здоровье)', choiceKey: 'infernal_ice_compress' },
      { text: 'Впитать пламя для стаи (-5 HP на Боссе: шанс карты «Синица-Пиромант»)', choiceKey: 'infernal_absorb_fire' }
    ]
  },

  sharp_spikes: {
    id: 'sharp_spikes',
    category: 'hazard',
    title: 'Острые Колья',
    type: 'hazard',
    tileSprite: 'Sharp spikes.png',
    speaker: 'Стальная Ловушка',
    text: 'Механическая ловушка плотины с вылетающими из земли острыми пиками!',
    actions: [{ text: 'ПЕРЕПРЫГНУТЬ ЧЕРЕЗ ПИКИ (-4 яйца, щит блокирует)', result: { loseEggs: 4 } }]
  },

  bear_trap: {
    id: 'bear_trap',
    category: 'hazard',
    title: 'Медвежий Капкан',
    type: 'choice',
    tileSprite: 'Iron Trap.png',
    speaker: 'Стальной Капкан',
    text: 'В траве щёлкает тяжёлая пружина стального капкана браконьеров!',
    options: [
      { text: 'Разжать зубья палкой (-3 яйца, щит защищает)', choiceKey: 'iron_trap_stick' },
      { text: 'Бросить камень и забрать приманку (50% +6 яиц / 50% -4 яйца)', choiceKey: 'iron_trap_rock' }
    ]
  },

  cat_ambush: {
    id: 'cat_ambush',
    category: 'hazard',
    title: 'Засада в Кустах: Чёрный Кот',
    type: 'choice',
    tileSprite: 'hidden beast in bushes-cat.png',
    speaker: 'Упитанный Лесной Кот',
    text: 'Из листвы бесшумно выскакивает упитанный лесной кот! Он не прочь полакомиться птичьими припасами, но выглядит ленивым.',
    options: [
      { text: 'Бросить коту угощение (-2 яйца: Карта «Храбрый селезень»)', choiceKey: 'cat_treat' },
      { text: 'Выставить вперёд кастрюльный щит и прогнать! (50% +6 яиц / 50% -4 яйца)', choiceKey: 'cat_scare' }
    ]
  },

  spider_cage: {
    id: 'spider_cage',
    category: 'hazard',
    title: 'Клетка с Паутиной',
    type: 'choice',
    tileSprite: 'cage with a spiderweb.png',
    speaker: 'Западня Лесного Паука',
    text: 'Старая западня лесного паука. Липкая паутина опутывает крылья и мешает разбегу.',
    options: [
      { text: 'Вырваться силой (-3 яйца, щит защищает)', choiceKey: 'cage_break' },
      { text: 'Срезать паутину (-1 кубик переброса)', choiceKey: 'cage_cut' }
    ]
  },

  spring_platform: {
    id: 'spring_platform',
    category: 'hazard',
    title: 'Прыгающая Платформа',
    type: 'hazard',
    tileSprite: 'Spring Platform.png',
    speaker: 'Инженерная Катапульта',
    text: 'Скрытая инженерная ловушка Бобра! Под вашим весом срабатывает мощная катапульта и отправляет в воздух.',
    actions: [{ text: 'СГРУППИРОВАТЬСЯ В ПОЛЁТЕ (Отброс на 3 клетки назад)', result: { stepBack: 3 } }]
  },

  burning_resin: {
    id: 'burning_resin',
    category: 'hazard',
    title: 'Горящая Смола',
    type: 'choice',
    tileSprite: 'burning resin.png',
    speaker: 'Огненная Преграда',
    text: 'Та самая смола, которую Бобёр-Дровосек любит использовать на арене! Огонь преграждает дорогу.',
    options: [
      { text: 'Пролететь сквозь жар (-3 яйца, щит защищает)', choiceKey: 'resin_fly_through' },
      { text: 'Позвать Синицу-Пироманта поглотить огонь (+5 яиц и 50% Карта «Синица-Пиромант»)', choiceKey: 'resin_call_tit' }
    ]
  },

  beaver_bridge_outpost: {
    id: 'beaver_bridge_outpost',
    category: 'hazard',
    title: 'Бобровая Застава на Мосту',
    type: 'choice',
    tileSprite: 'peace-wood.png',
    speaker: 'Бобры-Вымогатели',
    text: 'Бобры заложили мост брёвнами и не дают пройти, требуя пошлину за проход.',
    options: [
      { text: 'Уплатить пошлину (-2 яйца, щит защищает)', choiceKey: 'outpost_pay' },
      { text: 'Позвать Дятла разобрать завал (Бесплатно, если есть «Дятел-Перфоратор»)', choiceKey: 'outpost_woodpecker' }
    ]
  },

  // =========================================================================
  // 7. Интерактивные мини-игры (Скилл и Азарт)
  // =========================================================================
  wheel_fortune: {
    id: 'wheel_fortune',
    category: 'minigame',
    title: 'Колесо Лесной Фортуны',
    type: 'wheel_game',
    tileSprite: 'Wheel of Fortune.png',
    speaker: 'Ярмарочный Механизм',
    text: 'Деревянное ярмарочное колесо, окованное медью, на 6 секторов. Раскрутите обод!'
  },

  mystery_boxes: {
    id: 'mystery_boxes',
    category: 'minigame',
    title: 'Ларцы Иллюзиониста',
    type: 'mystery_boxes',
    tileSprite: 'Random-box.png',
    speaker: 'Загадочный Прилавок',
    text: 'Четыре одинаковых запечатанных ларца. В трёх спрятаны дары, а в одном взведена боксёрская перчатка!'
  },

  strongman_game: {
    id: 'strongman_game',
    category: 'minigame',
    title: 'Наковальня Лесоруба (Силомер)',
    type: 'strongman',
    tileSprite: 'force gauge.png',
    speaker: 'Испытание Силы',
    text: 'Столб-силомер с бегающим указателем и кузнечный молот. Поймайте шкалу на пике мощности!'
  },

  timestop_game: {
    id: 'timestop_game',
    category: 'minigame',
    title: 'Хронометр Часовщика (Тайм-стоп)',
    type: 'timestop',
    tileSprite: 'Hourglass.png',
    speaker: 'Мастер Маятника',
    text: 'Древний часовой маятник, который нужно остановить ровно на контрольной секунде.'
  },

  bingo_game: {
    id: 'bingo_game',
    category: 'minigame',
    title: 'Лесной Розыгрыш (Птичье Бинго)',
    type: 'bingo',
    tileSprite: 'bingo machine.png',
    speaker: 'Лотерейный Барабан',
    text: 'Лотерейный барабан с номерами шаров. Выберите один из четырёх счастливых билетов!'
  },

  toy_claw_machine: {
    id: 'toy_claw_machine',
    category: 'minigame',
    title: 'Механический Захват (Кран-автомат)',
    type: 'claw_game',
    tileSprite: 'Toy Vending Machine.png',
    speaker: 'Автомат Диковинок',
    text: 'Витрина с движущейся кареткой стальной клешни над призовыми капсулами. Опустите захват вовремя!'
  },

  abandoned_cellar: {
    id: 'abandoned_cellar',
    category: 'minigame',
    title: 'Запертый Погреб (Взлом замка)',
    type: 'lockpick_game',
    tileSprite: 'stairway to cellar.png',
    speaker: 'Кованый Засов',
    text: 'Кованый трёхштифтовый засов старого погреба. Зафиксируйте все 3 штифта в зелёной зоне!'
  },

  forest_thimbles: {
    id: 'forest_thimbles',
    category: 'minigame',
    title: 'Игра в Скорлупки (Напёрстки)',
    type: 'thimbles_game',
    tileSprite: 'empty bowl.png',
    speaker: 'Ловкий Бурундук',
    text: 'Бурундук прячет золотое яйцо под одну из трёх ореховых скорлупок и перемешивает их!'
  },

  // -------------------------------------------------------------------------
  // Новые мини-игры (стилизованные функциональные заглушки-испытания)
  // -------------------------------------------------------------------------
  darts_target: {
    id: 'darts_target',
    category: 'minigame',
    title: 'Перекрестие прицела (Дартс)',
    type: 'minigame_stub_darts',
    tileSprite: 'Darts.png',
    speaker: 'Тир Лесных Стрелков',
    text: 'Круглая мишень с кольцами и воздушные шарики по краям. Бросьте 3 дротика и проверьте меткость!'
  },

  duck_fishing: {
    id: 'duck_fishing',
    category: 'minigame',
    title: 'Утиная Рыбалка',
    type: 'minigame_stub_fishing',
    tileSprite: 'Duck Fishing Game.png',
    speaker: 'Ярмарочный Аттракцион',
    text: 'Бадья с жёлтыми уточками, плывущими по кругу. Забросьте удочку и вовремя подсеките призовую утку!'
  },

  ring_toss: {
    id: 'ring_toss',
    category: 'minigame',
    title: 'Кольцеброс',
    type: 'minigame_stub_ringtoss',
    tileSprite: 'ring toss.png',
    speaker: 'Лесная Забава',
    text: 'Три колышка на разной дистанции: ближний, средний и дальний золотой. Набросьте кольца на призы!'
  },

  scratch_ticket: {
    id: 'scratch_ticket',
    category: 'minigame',
    title: 'Золотой Билет (Скретч-лотерея)',
    type: 'minigame_stub_scratch',
    tileSprite: 'scratch-off ticket.png',
    speaker: 'Праздничный Киоск',
    text: 'Золотой лотерейный билет с защитным серебристым слоем. Сотрите ячейки монеткой!'
  },

  scales_balance: {
    id: 'scales_balance',
    category: 'minigame',
    title: 'Аптекарские Весы',
    type: 'minigame_stub_scales',
    tileSprite: 'scales with pans.png',
    speaker: 'Лаборатория Равновесия',
    text: 'На левой чаше весов лежит лесное сокровище. Подберите нужные гирьки, чтобы уравновесить чаши!'
  },

  // =========================================================================
  // 8. Новые сюжетные находки, персонажи и алтари
  // =========================================================================
  wild_beehive: {
    id: 'wild_beehive',
    category: 'quest',
    title: 'Дикие Соты',
    type: 'choice',
    tileSprite: 'Bee comb.png',
    speaker: 'Лесная Пасека',
    text: 'Сладкий аромат дикого мёда манит путника, но вокруг гудит встревоженный рой лесных пчёл!',
    options: [
      { text: 'Рискнуть и зачерпнуть целебного мёда! (50%: +10 яиц, снятие яда / 50%: яд на 3 хода, -2 яйца)', choiceKey: 'beehive_risk' },
      { text: 'Окурить соты дымом и взять немного (+2 яйца безопасно)', choiceKey: 'beehive_smoke' }
    ]
  },

  forest_bell: {
    id: 'forest_bell',
    category: 'quest',
    title: 'Лесной Колокол',
    type: 'choice',
    tileSprite: 'Bell.png',
    speaker: 'Сигнальный Колокол',
    text: 'Сигнальный колокол лесной стражи. Его звон может либо созвать союзных птиц на подмогу, либо всполошить караул Бобра.',
    options: [
      { text: 'Ударить в колокол во всю мощь! (65%: подмога +1 карта и +5 яиц / 35%: часовые -3 яйца)', choiceKey: 'bell_loud' },
      { text: 'Тихонько позвонить один раз (+4 яйца без риска)', choiceKey: 'bell_quiet' }
    ]
  },

  flying_dice: {
    id: 'flying_dice',
    category: 'reward',
    title: 'Крылатый Кубик',
    type: 'choice',
    tileSprite: 'Flying Dice.png',
    speaker: 'Зачарованная Кость Ветра',
    text: 'В воздухе кружится крылатая кость, излучающая порывы свежего попутного ветра.',
    options: [
      { text: 'Поймать крылатый кубик (+2 кубика переброса и +3 яйца)', choiceKey: 'flying_dice_catch' },
      { text: 'Оседлать воздушный поток (Бафф «Попутный Ветер»: +2 шага к следующему броску)', choiceKey: 'flying_dice_ride' }
    ]
  },

  golden_key: {
    id: 'golden_key',
    category: 'reward',
    title: 'Золотой Ключ',
    type: 'reward',
    tileSprite: 'Golden Key.png',
    speaker: 'Реликвия Хранителя Врат',
    text: 'Этот ключ отпирает цепи на 54-й клетке («Зачарованный Завал») и позволяет пройти весь круг настольной игры повторно, чтобы собрать вдвое больше карт и яиц перед Боссом!',
    actions: [{ text: 'ВЗЯТЬ ЗОЛОТОЙ КЛЮЧ', result: { goldenKey: true } }]
  },

  golden_pen: {
    id: 'golden_pen',
    category: 'reward',
    title: 'Золотое Перо',
    type: 'choice',
    tileSprite: 'Golden Pen.png',
    speaker: 'Бюрократическая Магия',
    text: 'С его помощью Пингвин-Менеджер и Птица-Секретарь переписывают законы леса в пользу именинника.',
    options: [
      { text: 'Подписать квартальный отчёт (Карта «Пингвин-Менеджер» или «Птица-Секретарь»)', choiceKey: 'pen_report' },
      { text: 'Выписать себе грант из казны (+8 яиц и +1 кубик переброса)', choiceKey: 'pen_grant' }
    ]
  },

  cursed_obelisk: {
    id: 'cursed_obelisk',
    category: 'altar',
    title: 'Проклятый Обелиск',
    type: 'choice',
    tileSprite: 'The Cursed Monument.png',
    speaker: 'Сова-Экзорцист',
    text: 'Монумент тёмной сделки, у которого дежурит Сова-Экзорцист. Обелиск предлагает огромную мощь в обмен на часть жизненной силы.',
    options: [
      { text: 'Заключить сделку тени (-5 HP на Боссе: +15 яиц и +1 бустер)', choiceKey: 'obelisk_shadow' },
      { text: 'Провести обряд очищения монумента (+4 яйца и шанс карты «Сова-Экзорцист»)', choiceKey: 'obelisk_cleanse' }
    ]
  },

  abyss_portal: {
    id: 'abyss_portal',
    category: 'choice',
    title: 'Портал в Бездну',
    type: 'choice',
    tileSprite: 'portal to the abyss.png',
    speaker: 'Сокол-Космонавт',
    text: 'Пространственная аномалия, открытая Соколом-Космонавтом. Прыжок в воронку искривляет маршрут на доске!',
    options: [
      { text: 'Шагнуть в пространственную воронку (+4 клетки вперёд, +5 яиц; 25% шанс -2 назад)', choiceKey: 'portal_step' },
      { text: 'Бросить в разлом 5 яиц и наблюдать (+1 Эпическая карта!)', choiceKey: 'portal_feed' }
    ]
  },

  mushroom_teremok: {
    id: 'mushroom_teremok',
    category: 'reward',
    title: 'Грибной Теремок',
    type: 'choice',
    tileSprite: 'mushroom house.png',
    speaker: 'Мышка-Хозяюшка',
    text: 'Внутри грибного домика кипит работа: Мышка-хозяюшка и Курица-Шеф варят бодрящий лесной эспрессо и пекут пироги.',
    options: [
      { text: 'Подарить 2 яйца для теста (Карта «Курица-Шеф» удвоит атаку при HP < 50%)', choiceKey: 'teremok_cook' },
      { text: 'Выпить чашечку лесного эспрессо (Полное снятие яда и +4 яйца с собой)', choiceKey: 'teremok_espresso' }
    ]
  },

  autumn_fountain: {
    id: 'autumn_fountain',
    category: 'heal',
    title: 'Чаша Осеннего Фонтана',
    type: 'choice',
    tileSprite: 'water fountain.png',
    speaker: 'Купель Спокойствия',
    text: 'Древняя купель спокойствия. Брошенное в воду яйцо возвращается сторицей.',
    options: [
      { text: 'Бросить 5 яиц на счастье (Магнит x2 на следующую награду + 2 кубика)', choiceKey: 'fountain_toss' },
      { text: 'Омыть крылья прохладной водой (Снимает яд + 5 яиц)', choiceKey: 'fountain_wash' }
    ]
  },

  blacksmith_anvil: {
    id: 'blacksmith_anvil',
    category: 'altar',
    title: 'Кузнечная Наковальня',
    type: 'choice',
    tileSprite: 'Anvil.png',
    speaker: 'Кузница Лесных Защитников',
    text: 'Походная кузница лесных защитников. Здесь можно выковать броню для своих пернатых бойцов или переплавить скорлупу.',
    options: [
      { text: 'Закалить снаряжение отряда (-4 яйца: +10 к макс. HP на Боссе + шанс карты «Храбрый селезень»)', choiceKey: 'anvil_temper' },
      { text: 'Расковать старый слиток (+5 яиц без затрат)', choiceKey: 'anvil_forge_ingot' }
    ]
  },

  blue_crystal: {
    id: 'blue_crystal',
    category: 'reward',
    title: 'Синий Кристалл Эфира',
    type: 'choice',
    tileSprite: 'Blue-Crystal.png',
    speaker: 'Полярная Сова',
    text: 'Концентрированная энергия стужи и магии. Вокруг кристалла кружит Полярная Сова.',
    options: [
      { text: 'Впитать энергию кристалла (Щит Неуязвимости + 1 бустер карт)', choiceKey: 'crystal_absorb' },
      { text: 'Отколоть осколок для обмена (+8 яиц)', choiceKey: 'crystal_chip' }
    ]
  },

  trapped_animal: {
    id: 'trapped_animal',
    category: 'quest',
    title: 'Птица в Браконьерской Сети',
    type: 'choice',
    tileSprite: 'Helping animal caught in trap.png',
    speaker: 'Пленник Сетей',
    text: 'В браконьерскую сеть Бобра попалась молодая птица! Верёвки крепко стянуты, а вдалеке уже слышны шаги патруля.',
    options: [
      { text: 'Перерубить канаты клювом (-2 яйца сил: гарантированно Карта «Голубь-почтальон»)', choiceKey: 'trap_cut_cords' },
      { text: 'Попытаться распутать узлы (60% Карта «Голубь-почтальон» / 40% потеря -2 яиц)', choiceKey: 'trap_untangle' }
    ]
  },

  glowing_stump: {
    id: 'glowing_stump',
    category: 'reward',
    title: 'Сияющий Пень',
    type: 'choice',
    tileSprite: 'hollow stump.png',
    speaker: 'Ворон-Алхимик',
    text: 'Внутри дупла устроил свою лабораторию Ворон-Алхимик. Из глубины пахнет золотом и пряными травами.',
    options: [
      { text: 'Опустить лапу в золотое сияние (+7 яиц)', choiceKey: 'stump_reach' },
      { text: 'Провести трансмутацию (-3 яйца: Карта «Ворон-Алхимик»)', choiceKey: 'stump_transmute' }
    ]
  },

  wind_mill: {
    id: 'wind_mill',
    category: 'reward',
    title: 'Старая Ветряная Мельница',
    type: 'choice',
    tileSprite: 'mill.png',
    speaker: 'Воробей-Бодибилдер',
    text: 'Лопасти-перья скрипят на ветру. Наверху тренируется Воробей-атлет, таская мешки с отборными семечками.',
    options: [
      { text: 'Помочь повернуть крылья мельницы (+2 клетки вперёд + Карта «Воробей-Бодибилдер»)', choiceKey: 'mill_help' },
      { text: 'Набрать мешочек отборного зерна (+5 яиц)', choiceKey: 'mill_grain' }
    ]
  },

  pearl_in_nest: {
    id: 'pearl_in_nest',
    category: 'reward',
    title: 'Жемчужина в Гнезде',
    type: 'choice',
    tileSprite: 'Pearl-in-Nest.png',
    speaker: 'Дар Царевны-Лебедь',
    text: 'Дар Царевны-Лебедь. Редчайшее сокровище лесного озера покоится в шелковистом гнезде.',
    options: [
      { text: 'Обменять жемчужину у торговцев на яйца (+12 яиц, работает с Магнитом x2)', choiceKey: 'pearl_sell' },
      { text: 'Сохранить жемчужину как талисман (+1 бустер карт или 35% Карта «Царевна-Лебедь»)', choiceKey: 'pearl_keep' }
    ]
  },

  ripe_rowan: {
    id: 'ripe_rowan',
    category: 'reward',
    title: 'Гроздь Спелой Рябины',
    type: 'choice',
    tileSprite: 'rowan.png',
    speaker: 'Зарянка-Садовник',
    text: 'Любимое лакомство лесных пернатых, собранное Зарянкой-Садовником. Мгновенно восстанавливает тонус и выводит токсины.',
    options: [
      { text: 'Устроить витаминный перекус (Снимает 3 хода яда и даёт +5 яиц)', choiceKey: 'rowan_snack' },
      { text: 'Угостить Зарянку-Садовника (Карта «Зарянка-Садовник» в колоду)', choiceKey: 'rowan_treat' }
    ]
  },

  ancient_rune_stone: {
    id: 'ancient_rune_stone',
    category: 'altar',
    title: 'Рунный Камень Древних',
    type: 'choice',
    tileSprite: 'Rune-Stone.png',
    speaker: 'Мудрость Вальгаллы',
    text: 'Камень хранит мудрость Вальгаллы. Коснитесь одной из трёх рун, чтобы получить благословение на битву.',
    options: [
      { text: 'Руна Перьев (+8 яиц)', choiceKey: 'rune_feathers' },
      { text: 'Руна Судьбы (+3 кубика переброса)', choiceKey: 'rune_destiny' },
      { text: 'Руна Стали (+1 бустер карт и шанс Карты «Гусь-Викинг»)', choiceKey: 'rune_steel' }
    ]
  },

  brass_telescope: {
    id: 'brass_telescope',
    category: 'altar',
    title: 'Латунный Телескоп',
    type: 'choice',
    tileSprite: 'telescope.png',
    speaker: 'Обсерватория на Холме',
    text: 'Обсерватория на холме, где Удод-Астролог и Белая Куропатка вычисляют слабые места в дамбе Бобра.',
    options: [
      { text: 'Навести окуляр на плотину Босса (Босс начнёт бой с -50 HP, Карта «Белая Куропатка-Снайпер»)', choiceKey: 'telescope_boss' },
      { text: 'Навести окуляр на созвездия (Карта «Удод-Астролог» или +2 кубика переброса)', choiceKey: 'telescope_stars' }
    ]
  },

  master_toolbox: {
    id: 'master_toolbox',
    category: 'reward',
    title: 'Красный Ящик Мастера',
    type: 'choice',
    tileSprite: 'Toolbox.png',
    speaker: 'Снегирь в Каске',
    text: 'На пеньке оставлен тяжёлый слесарный набор. Рядом возится Снегирь в рабочей каске, которому не хватает деталей для починки вентиля.',
    options: [
      { text: 'Подать разводной ключ и помочь (Карта «Снегирь-Сантехник» или «Дятел-Перфоратор»)', choiceKey: 'toolbox_help' },
      { text: 'Забрать запасные гайки на продажу (+1 кубик переброса)', choiceKey: 'toolbox_take_nuts' }
    ]
  }
};

// Обратная совместимость для старых ключей событий
EVENT_TEMPLATES.forest_riddle_owl = EVENT_TEMPLATES.owl_library;
EVENT_TEMPLATES.smuggler_deal = EVENT_TEMPLATES.mail_bag;
EVENT_TEMPLATES.merchant_stash = EVENT_TEMPLATES.lost_compass;
EVENT_TEMPLATES.beaver_patrol_tax = EVENT_TEMPLATES.wooden_totem;
EVENT_TEMPLATES.thunder_strike = EVENT_TEMPLATES.infernal_slab;

/**
 * Базовая последовательность 54 клеток на доске Загадочного Леса
 */
export const DEFAULT_54_SEQUENCE = [
  'start_gate',              // 1 (Старт)
  'quiz_campfire',           // 2
  'chest_regular',           // 3
  'lucky_clover',            // 4
  'spoiled_egg',             // 5
  'egg_pouch',               // 6
  'egg_magnet',              // 7
  'divine_healing',          // 8
  'toy_claw_machine',        // 9
  'foggy_crossroad',         // 10
  'sacrifice_monument',      // 11
  'poison_thorns',           // 12
  'spring_flask',            // 13
  'wild_beehive',            // 14
  'beaver_legendary_chest',  // 15
  'mysterious_basement',     // 16
  'mystery_boxes',           // 17
  'immunity_elixir',         // 18
  'strongman_game',          // 19
  'timestop_game',           // 20
  'charity_monument',        // 21
  'holiday_gift',            // 22
  'fox_ambush',              // 23
  'abandoned_cellar',        // 24
  'forest_thimbles',         // 25
  'flying_dice',             // 26
  'forest_bell',             // 27
  'magic_oracle',            // 28
  'autumn_fountain',         // 29
  'wheel_fortune',           // 30
  'infernal_slab',           // 31
  'bingo_game',              // 32
  'golden_key',              // 33 (Золотой ключ для 2-го круга!)
  'mail_bag',                // 34
  'lost_compass',            // 35
  'wooden_totem',            // 36
  'owl_library',             // 37
  'golden_pen',              // 38
  'mushroom_teremok',        // 39
  'darts_target',            // 40
  'duck_fishing',            // 41
  'ring_toss',               // 42
  'scratch_ticket',          // 43
  'blacksmith_anvil',        // 44
  'blue_crystal',            // 45
  'trapped_animal',          // 46
  'cat_ambush',              // 47
  'glowing_stump',           // 48
  'ancient_rune_stone',      // 49
  'brass_telescope',         // 50
  'scales_balance',          // 51
  'master_toolbox',          // 52
  'boss_gate',               // 53 (Врата к Бобу)
  'magic_barrier'            // 54 (Запечатанный завал на 2-й круг)
];

export const BOARD_EVENTS = {};
DEFAULT_54_SEQUENCE.forEach((key, i) => {
  const step = i + 1;
  const tpl = EVENT_TEMPLATES[key] || EVENT_TEMPLATES.egg_pouch;
  BOARD_EVENTS[step] = { ...tpl, index: step };
});