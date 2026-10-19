/**
 * База данных всех карт пернатых героев для битвы с финальным боссом
 * Соответствует Card - About.txt
 */

export const CARD_RARITIES = {
  COMMON: { key: 'common', name: 'Обычная', color: '#9d9d9d', border: '#b0a48a', glow: 'rgba(180, 180, 180, 0.4)' },
  UNCOMMON: { key: 'uncommon', name: 'Необычная', color: '#1eff00', border: '#2ecc71', glow: 'rgba(46, 204, 113, 0.5)' },
  RARE: { key: 'rare', name: 'Редкая', color: '#0070dd', border: '#3498db', glow: 'rgba(52, 152, 219, 0.6)' },
  EPIC: { key: 'epic', name: 'Эпическая', color: '#a335ee', border: '#9b59b6', glow: 'rgba(155, 89, 182, 0.7)' },
  LEGENDARY: { key: 'legendary', name: 'Легендарная', color: '#ff8000', border: '#f39c12', glow: 'rgba(243, 156, 18, 0.85)' }
};

export const CARDS_DATABASE = [
  // ==========================================
  // ОБЫЧНЫЕ КАРТЫ
  // ==========================================
  {
    id: 'carrier_pigeon',
    name: 'Голубь-почтальон',
    subname: 'Ненавидит свою работу',
    role: 'Поддержка / Контроль',
    rarity: 'common',
    cost: 1,
    atk: 4,
    hp: 12,
    image: 'assets/Market/Card/Carrier pigeon.png',
    abilityName: 'Спам-рассылка',
    abilityDesc: 'Сбрасывает макулатуру, замедляя ход босса и снижая его урон на 15% в этом раунде.'
  },
  {
    id: 'brave_drake',
    name: 'Храбрый селезень',
    subname: 'Рыцарь с поварёшкой',
    role: 'Танк / Защита',
    rarity: 'common',
    cost: 1,
    atk: 3,
    hp: 26,
    image: 'assets/Market/Card/brave drake.png',
    abilityName: 'Кастрюльный панцирь',
    abilityDesc: 'Прочный самодельный шлем поглощает первые 6 урона от любого удара.'
  },
  {
    id: 'chef_chicken',
    name: 'Курица-Шеф',
    subname: 'Шеф-повар с недосыпом',
    role: 'Атака / Ярость',
    rarity: 'common',
    cost: 2,
    atk: 8,
    hp: 16,
    image: 'assets/Market/Card/Chef Chicken.png',
    abilityName: 'Эспрессо-ярость',
    abilityDesc: 'Если здоровье падает ниже 50%, атака удваивается (+8 ATK) за счёт бессонного адреналина.'
  },
  {
    id: 'owl_hairdresser',
    name: 'Сова-Барбер',
    subname: 'Стрижка по записи',
    role: 'Ослабление (Дебафф)',
    rarity: 'common',
    cost: 2,
    atk: 5,
    hp: 14,
    image: 'assets/Market/Card/Owl - Hairdresser.png',
    abilityName: 'Стрижка под ноль',
    abilityDesc: 'Срезает броню и силу атаки босса на 20%, делая его уязвимым для последующих ударов.'
  },
  {
    id: 'penguin_manager',
    name: 'Пингвин-Менеджер',
    subname: 'Менеджер среднего звена',
    role: 'Генератор ресурсов',
    rarity: 'common',
    cost: 1,
    atk: 4,
    hp: 14,
    image: 'assets/Market/Card/Penguin - Manager.png',
    abilityName: 'Квартальный отчёт',
    abilityDesc: 'При выставлении на поле моментально берёт +1 дополнительную карту из колоды за счёт переработок.'
  },
  {
    id: 'woodpecker_drill',
    name: 'Дятел-Перфоратор',
    subname: 'Сосед с дрелью в 7 утра',
    role: 'Чистый урон / Пробивание',
    rarity: 'common',
    cost: 2,
    atk: 12,
    hp: 10,
    image: 'assets/Market/Card/Woodpecker Drill.png',
    abilityName: 'Перфоратор в 7 утра',
    abilityDesc: 'Непрерывные удары по клетке босса, полностью игнорирующие любую броню и щиты.'
  },
  {
    id: 'robin_gardener',
    name: 'Зарянка-Садовник',
    subname: 'Ботаник с лейкой',
    role: 'Лекарь / Поддержка',
    rarity: 'common',
    cost: 2,
    atk: 3,
    hp: 16,
    image: 'assets/Market/Card/robin - Gardener.png',
    abilityName: 'Питательный компост',
    abilityDesc: 'Каждый раунд восстанавливает +8 HP всем соседним союзным птицам на поле.'
  },
  {
    id: 'bodybuilder_sparrow',
    name: 'Воробей-Бодибилдер',
    subname: 'Качает одну лапу',
    role: 'Сокрушительный удар',
    rarity: 'common',
    cost: 2,
    atk: 22,
    hp: 18,
    image: 'assets/Market/Card/Bodybuilder sparrow.png',
    abilityName: 'Удар за семечку',
    abilityDesc: 'Наносит мощный сокрушительный удар на 22 урона по боссу, но затем делает паузу на перекус.'
  },
  {
    id: 'plumber_bullfinch',
    name: 'Снегирь-Сантехник',
    subname: 'Мастер разводного ключа',
    role: 'Танк / Очистка',
    rarity: 'common',
    cost: 2,
    atk: 5,
    hp: 18,
    image: 'assets/Market/Card/Plumber.png',
    abilityName: 'Продувка труб',
    abilityDesc: 'Очищает свою клетку от любой ловушки босса (смолы, льда, песка, лавы) и получает за это +2 к щиту.'
  },
  {
    id: 'tourist_sandpiper',
    name: 'Кулик-Турист',
    subname: 'В панамке и с фотоаппаратом',
    role: 'Поддержка / Ослепление',
    rarity: 'common',
    cost: 2,
    atk: 7,
    hp: 13,
    image: 'assets/Market/Card/Tourist.png',
    abilityName: 'Фото со вспышкой',
    abilityDesc: 'При нажатии «Атака» фотографирует босса со вспышкой — снижает урон от зон AOE в своём ряду на 40%.'
  },
  {
    id: 'nightjar_owl',
    name: 'Козодой-Полуночник',
    subname: 'Охотник за ночным перекусом',
    role: 'Урон / Синергия отдыха',
    rarity: 'common',
    cost: 1,
    atk: 4,
    hp: 12,
    image: 'assets/Market/Card/Night Owl.png',
    abilityName: 'Ночной дожор',
    abilityDesc: 'Получает +2 ATK за каждую птицу, которая сейчас отдыхает в руке (restRounds > 0).'
  },
  {
    id: 'intern_dove',
    name: 'Голубка-Стажёр',
    subname: 'Работает за опыт и зёрнышки',
    role: 'Снятие усталости',
    rarity: 'common',
    cost: 1,
    atk: 4,
    hp: 15,
    image: 'assets/Market/Card/Intern.png',
    abilityName: 'Пора РАБОТАТЬ!',
    abilityDesc: 'При атаке снимает 1 ход отдыха (restRounds) у случайной уставшей птицы в твоей руке и лечит Игрока на +5 HP.'
  },
  {
    id: 'scavenger_pelican',
    name: 'Пеликан-Мусорщик',
    subname: 'Эколог-утилизатор чащи',
    role: 'Урон',
    rarity: 'common',
    cost: 1,
    atk: 2,
    hp: 10,
    image: 'assets/Market/Card/Scavenger.png',
    abilityName: 'Раздельный сбор мусора',
    abilityDesc: 'В начале своего хода бросает в босса случайный найденный предмет: банка наносит 8 урона, бутылка — 5 урона, а крышка наносит 3 урона.'
  },

  // ==========================================
  // НЕОБЫЧНЫЕ КАРТЫ
  // ==========================================
  {
    id: 'info_gypsy',
    name: 'Утка-Инфоцыган',
    subname: 'Учит крякать элитно',
    role: 'Контроль / Риск',
    rarity: 'uncommon',
    cost: 2,
    atk: 6,
    hp: 15,
    image: 'assets/Market/Card/Info-gypsy.png',
    abilityName: 'Элитное кряканье',
    abilityDesc: 'С шансом 50% оглушает босса речью (пропуск хода), иначе продаёт воздух (ничего не делает).'
  },
  {
    id: 'owl_mage',
    name: 'Сова-Маг',
    subname: 'Не взяли в Хогвартс',
    role: 'Магия / Хаос',
    rarity: 'uncommon',
    cost: 3,
    atk: 10,
    hp: 16,
    image: 'assets/Market/Card/Owl Mage.png',
    abilityName: 'Нестабильная магия',
    abilityDesc: 'Кастует заклинание: либо бьёт молнией на 15 урона, либо превращает вражескую атаку в облако.'
  },
  {
    id: 'tit_pyromancer',
    name: 'Синица-Пиромант',
    subname: 'Хочет всех поджечь',
    role: 'Периодический урон (DoT)',
    rarity: 'uncommon',
    cost: 2,
    atk: 7,
    hp: 14,
    image: 'assets/Market/Card/Tit - Pyromancer.png',
    abilityName: 'Огненное чириканье',
    abilityDesc: 'Поджигает клетку на 3 хода (+DoT по боссу) и мгновенно сжигает всю смолу на арене!'
  },
  {
    id: 'starling_musician',
    name: 'Скворец-Музыкант',
    subname: 'Уличный артист в метро',
    role: 'Баффер команды',
    rarity: 'uncommon',
    cost: 2,
    atk: 5,
    hp: 15,
    image: 'assets/Market/Card/Starling - Street Musician.png',
    abilityName: 'Акустический переход',
    abilityDesc: 'Повышает силу атаки всех выставленных на арену птиц на +4 ATK до конца раунда.'
  },
  {
    id: 'raven_alchemist',
    name: 'Ворон-Алхимик',
    subname: 'Готический мыслитель',
    role: 'Яд / Трансмутация',
    rarity: 'uncommon',
    cost: 3,
    atk: 8,
    hp: 16,
    image: 'assets/Market/Card/The Raven - Gothic Alchemist.png',
    abilityName: 'Философская трансмутация',
    abilityDesc: 'Отравляет босса на 12 урона в ход или превращает опасную клетку в целебный эликсир (+4 HP).'
  },
  {
    id: 'magician_peacock',
    name: 'Павлин-Фокусник',
    subname: 'Иллюзионист с зеркалами',
    role: 'Приманка / Иллюзии',
    rarity: 'uncommon',
    cost: 3,
    atk: 6,
    hp: 18,
    image: 'assets/Market/Card/The Magician Peacock.png',
    abilityName: 'Зеркальный дубль',
    abilityDesc: 'При выставлении создаёт две зеркальные копии по бокам, принимающие удар босса на себя.'
  },
  {
    id: 'sniper_partridge',
    name: 'Белая Куропатка-Снайпер',
    subname: 'Один выстрел — один сучок',
    role: 'Урон',
    rarity: 'uncommon',
    cost: 2,
    atk: 9,
    hp: 14,
    image: 'assets/Market/Card/Partridge.png',
    abilityName: 'Поправка на ветер',
    abilityDesc: 'Если стоит в дальнем (3-м) ряду, наносит +8 урона.'
  },
  {
    id: 'secretary_bird',
    name: 'Птица-Секретарь',
    subname: 'Деловая хищница на шпильках',
    role: 'Поддержка',
    rarity: 'uncommon',
    cost: 3,
    atk: 8,
    hp: 17,
    image: 'assets/Market/Card/Secretary.png',
    abilityName: 'Возврат долгов',
    abilityDesc: 'Если стоит на красной клетке прорыва (BREACH), ударом ноги отфутболивает снаряд босса обратно, но получает тоже урон!'
  },
  {
    id: 'hacker_cuckoo',
    name: 'Кукушка-Хакер',
    subname: 'Взлом плотины по Wi-Fi',
    role: 'Поддержка',
    rarity: 'uncommon',
    cost: 2,
    atk: 4,
    hp: 15,
    image: 'assets/Market/Card/Hacker.png',
    abilityName: 'Взлом системы',
    abilityDesc: 'Взламывает 1 красную клетку прорыва (BREACH) на поле — в этом раунде атака босса по ней не наносит урона, а лечит Игрока на +5 HP.'
  },
  {
    id: 'bartender_toucan',
    name: 'Тукан-Бармен',
    subname: 'Миксолог лесных напитков',
    role: 'Поддержка',
    rarity: 'uncommon',
    cost: 2,
    atk: 7,
    hp: 10,
    image: 'assets/Market/Card/Bartender.png',
    abilityName: 'Коктейльная карта',
    abilityDesc: 'В 1-м ряду кидает в босса «Пылающий чили» (поджигает клетку на 3 хода), во 2–3 ряду раздаёт соседям «Ледяной Мохито» (+4 HP).'
  },

  // ==========================================
  // РЕДКИЕ КАРТЫ
  // ==========================================
  {
    id: 'sokol_cosmonaut',
    name: 'Сокол-Космонавт',
    subname: 'В шоке что земля круглая',
    role: 'Манипуляция полем',
    rarity: 'rare',
    cost: 3,
    atk: 10,
    hp: 20,
    image: 'assets/Market/Card/Sokol - Cosmonaut.png',
    abilityName: 'Она круглая?!',
    abilityDesc: 'Искривляет пространство: сдвигает намеченные зоны атак босса на 1 клетку, спасая птиц.'
  },
  {
    id: 'swan_princess',
    name: 'Царевна-Лебедь',
    subname: 'Принцесса из сказки',
    role: 'Очарование / Очищение',
    rarity: 'rare',
    cost: 3,
    atk: 7,
    hp: 20,
    image: 'assets/Market/Card/The Swan Princess.png',
    abilityName: 'Королевская грация',
    abilityDesc: 'Очаровывает босса, заставляя его нанести на 30% меньше урона в текущем раунде.'
  },
  {
    id: 'streamer_owl',
    name: 'Сова-Стример',
    subname: '2 зрителя, 400 часов',
    role: 'Провокация (Таунт)',
    rarity: 'rare',
    cost: 3,
    atk: 8,
    hp: 24,
    image: 'assets/Market/Card/Streamer Owl.png',
    abilityName: 'Вечный бан в чате',
    abilityDesc: 'Начинает бесконечный спор с бобром, заставляя его атаковать эту клетку со сниженным уроном (-35%).'
  },
  {
    id: 'kiwi_secret',
    name: 'Киви-Шпион',
    subname: 'Стелс-агент в кустах',
    role: 'Невидимость / Ассасин',
    rarity: 'rare',
    cost: 3,
    atk: 14,
    hp: 16,
    image: 'assets/Market/Card/Kiwi secret.png',
    abilityName: 'Режим маскировки',
    abilityDesc: 'Игнорируется прямыми ударами босса, а в конце раунда наносит скрытный критический удар на +10.'
  },
  {
    id: 'therapist_robin',
    name: 'Зарянка-Психолог',
    subname: 'На всё: АНТИДЕПРЕССАНТЫ!',
    role: 'Поддержка / Неуязвимость',
    rarity: 'rare',
    cost: 3,
    atk: 5,
    hp: 18,
    image: 'assets/Market/Card/Therapist robin.png',
    abilityName: 'АНТИДЕПРЕССАНТЫ!',
    abilityDesc: 'Выбранная птица на 1 раунд перестаёт чувствовать боль (получает ровно 0 урона с улыбкой).'
  },
  {
    id: 'climber_puffin',
    name: 'Тупик-Альпинист',
    subname: 'Покоритель лесных вершин',
    role: 'Поддержка',
    rarity: 'rare',
    cost: 3,
    atk: 9,
    hp: 22,
    image: 'assets/Market/Card/Climber.png',
    abilityName: 'Страховочный трос',
    abilityDesc: 'Связывает тросом всех птиц в своём ряду. Весь входящий урон по ряду делится поровну и снижается на 4 ед. за каждую птицу в связке!'
  },
  {
    id: 'plantain_cuckoo',
    name: 'Кукушка-Подорожник',
    subname: 'Сверхзвуковой курьер',
    role: 'Урон',
    rarity: 'rare',
    cost: 3,
    atk: 12,
    hp: 16,
    image: 'assets/Market/Card/Plantain.png',
    abilityName: 'Реактивный Двигатель',
    abilityDesc: 'Настолько быстрый, что не получает усталости (restRounds = 0) при возврате в руку, получает -2 ATK.'
  },
  {
    id: 'astrologer_hoopoe',
    name: 'Удод-Астролог',
    subname: 'Звёзды не врут, Бобёр',
    role: 'Поддержка',
    rarity: 'rare',
    cost: 3,
    atk: 8,
    hp: 19,
    image: 'assets/Market/Card/Astrologer.png',
    abilityName: 'Ретроградный Меркурий',
    abilityDesc: 'Временно делает свою клетку и клетки справа Руническими (+4 ATK) до конца боя!'
  },
  {
    id: 'advocate_pelican',
    name: 'Пеликан-Адвокат',
    subname: 'Ваш адвокат по лесным спорам',
    role: 'Поддержка',
    rarity: 'rare',
    cost: 3,
    atk: 7,
    hp: 20,
    image: 'assets/Market/Card/Advocate.png',
    abilityName: 'Встречный иск',
    abilityDesc: 'Фиксирует все повреждения отряда: в конце раунда предъявляет боссу счёт и наносит ему 50% от суммарного урона, который получили все твои птицы в этом ходу!'
  },

  // ==========================================
  // ЭПИЧЕСКИЕ КАРТЫ
  // ==========================================
  {
    id: 'vulture_hunter',
    name: 'Гриф-Охотник',
    subname: 'Королевский ликвидатор',
    role: 'Охотник / Добивание',
    rarity: 'epic',
    cost: 4,
    atk: 16,
    hp: 24,
    image: 'assets/Market/Card/Vulture Hunter.png',
    abilityName: 'Королевский контракт',
    abilityDesc: 'Наносит на +100% больше урона (удвоенная сила), если здоровье босса опустилось ниже 40%.'
  },
  {
    id: 'owl_exorcist',
    name: 'Сова-Экзорцист',
    subname: 'Немигающий жуткий взгляд',
    role: 'Очищение / Блокировка',
    rarity: 'epic',
    cost: 4,
    atk: 14,
    hp: 26,
    image: 'assets/Market/Card/Owl - Exorcist.png',
    abilityName: 'Изыди, нечистый дух!',
    abilityDesc: 'Моментально рассеивает яд и опасные эффекты на арене, блокируя спец-способность бобра на 1 ход.'
  },
  {
    id: 'viking_goose',
    name: 'Гусь-Викинг',
    subname: 'Хонк Вальхаллы с топором',
    role: 'Берсерк / Контратака',
    rarity: 'epic',
    cost: 4,
    atk: 16,
    hp: 30,
    image: 'assets/Market/Card/Viking Goose.png',
    abilityName: 'Хонк Вальхаллы',
    abilityDesc: 'Блокирует первый направленный удар деревянным щитом, затем отвечает сокрушительной серией на 20 урона.'
  },
  {
    id: 'guard_goose',
    name: 'Гусь-Охранник',
    subname: 'Фейсконтроль клуба',
    role: 'Танк / Защитник ряда',
    rarity: 'epic',
    cost: 4,
    atk: 12,
    hp: 36,
    image: 'assets/Market/Card/Guard Goose.png',
    abilityName: 'Фейсконтроль',
    abilityDesc: 'Принимает на себя весь урон от вражеской линии атак; с шансом 50% полностью игнорирует урон.'
  },
  {
    id: 'overseer_owl',
    name: 'Полярная Сова-Надзиратель',
    subname: 'Строгий страж вечной мерзлоты',
    role: 'Поддержка',
    rarity: 'epic',
    cost: 4,
    atk: 13,
    hp: 27,
    image: 'assets/Market/Card/Overseer.png',
    abilityName: 'Абсолютный ноль',
    abilityDesc: 'Замораживает самую сильную зону атаки босса на поле (полностью отменяет удар по 1 клетке с наибольшим уроном) и даёт +2 HP себе.'
  },
  {
    id: 'undertaker_marabou',
    name: 'Марабу-Гробовщик',
    subname: 'Похоронное бюро «Перо и Прах»',
    role: 'Урон',
    rarity: 'epic',
    cost: 4,
    atk: 12,
    hp: 14,
    image: 'assets/Market/Card/Undertaker.png',
    abilityName: 'Некромант',
    abilityDesc: 'Получает +6 ATK и +6 HP за каждую карту в твоём Сбросе (discard).'
  },
  {
    id: 'rocker_capercaillie',
    name: 'Глухарь-Рокер',
    subname: 'Легенда лесного хэви-метала',
    role: 'Поддержка',
    rarity: 'epic',
    cost: 4,
    atk: 15,
    hp: 25,
    image: 'assets/Market/Card/Rocker.png',
    abilityName: 'Соло на глушняк',
    abilityDesc: 'Пока на поле, оглушительный рок снимает со всех союзников штрафы ловушек.'
  },
  {
    id: 'admiral_albatross',
    name: 'Альбатрос-Адмирал',
    subname: 'Командующий пернатым флотом',
    role: 'Урон',
    rarity: 'epic',
    cost: 4,
    atk: 15,
    hp: 25,
    image: 'assets/Market/Card/Admiral.png',
    abilityName: 'Отдать приказ!',
    abilityDesc: 'Отдаёт приказ птице, стоящей в одной вертикальной колонке с ним — эта птица совершает повторную атаку (Double Strike) по боссу в этом раунде!'
  },
  {
    id: 'imperial_penguin',
    name: 'Императорский Пингвин-Могул',
    subname: 'Властелин ледяного престола',
    role: 'Сверх-танк',
    rarity: 'epic',
    cost: 4,
    atk: 8,
    hp: 48,
    image: 'assets/Market/Card/Imperial.png',
    abilityName: 'Указ о защите короны',
    abilityDesc: 'Получая урон за ход, даёт всем отдыхающим картам +2 ATK.'
  },
  {
    id: 'sirin_bird',
    name: 'Птица-Сирин',
    subname: 'Райская дева с птичьим телом',
    role: 'Поддержка',
    rarity: 'epic',
    cost: 4,
    atk: 16,
    hp: 29,
    image: 'assets/Market/Card/Sirin.png',
    abilityName: 'Песнь Забвения',
    abilityDesc: 'Все птицы, которые стоят на клетке с рунами, получают +5 HP, если они получали урон ранее.'
  },

  // ==========================================
  // ЛЕГЕНДАРНЫЕ КАРТЫ
  // ==========================================
  {
    id: 'odin_raven',
    name: 'Ворон Вальгаллы',
    subname: 'Проводник павших воинов',
    role: 'Воскрешение героев',
    rarity: 'legendary',
    cost: 5,
    atk: 18,
    hp: 30,
    image: 'assets/Market/Card/odin raven.png',
    abilityName: 'Врата Вальхаллы',
    abilityDesc: 'Если союзная птица погибает на поле, мгновенно воскрешает её на соседней клетке со 100% HP!'
  },
  {
    id: 'sacred_ibis',
    name: 'Священный Ибис',
    subname: 'Египетский бог солнца',
    role: 'Массовый солнечный урон',
    rarity: 'legendary',
    cost: 5,
    atk: 22,
    hp: 28,
    image: 'assets/Market/Card/Sacred ibis.png',
    abilityName: 'Солнечный зенит Ра',
    abilityDesc: 'Озаряет поле боя слепящим светом, нанося по 6 чистого урона огнём за каждую клетку босса.'
  },
  {
    id: 'owl_sparta',
    name: 'Сова Афина',
    subname: 'Только за Спарту!',
    role: 'Стратегическая защита',
    rarity: 'legendary',
    cost: 5,
    atk: 18,
    hp: 34,
    image: 'assets/Market/Card/owl of ASparta.png',
    abilityName: 'Афинская фаланга',
    abilityDesc: 'Даёт +18 временного щита всем птицам в своей линии, а при атаке босса отвечает копьём на 14 урона.'
  },
  {
    id: 'feathered_king',
    name: 'Пернатый Король',
    subname: 'Мифический социофоб',
    role: 'Ультимативный баффер',
    rarity: 'legendary',
    cost: 5,
    atk: 10,
    hp: 30,
    image: 'assets/Market/Card/Feathered King.png',
    abilityName: 'Аудиенция отменяется',
    abilityDesc: 'Бобёр не может атаковать короля; пока король на поле, все союзники получают +100% к атаке.'
  },
  {
    id: 'celestial_knight',
    name: 'Орёл — Небесный Рыцарь',
    subname: 'В труселях с сердечками',
    role: 'Паладин / Финишер',
    rarity: 'legendary',
    cost: 5,
    atk: 28,
    hp: 35,
    image: 'assets/Market/Card/Celestial Knight.png',
    abilityName: 'Небесный стыд',
    abilityDesc: 'Сокрушительный удар на 28 урона. Комичный вид в труселях смущает бобра, снижая его меткость на 50%.'
  },
  {
    id: 'sand_simurgh',
    name: 'Песчаный Симург',
    subname: 'Древний хранитель пустынных бурь',
    role: 'Танк',
    rarity: 'legendary',
    cost: 5,
    atk: 5,
    hp: 35,
    image: 'assets/Market/Card/Simurgh.png',
    abilityName: 'Песчинка в глазу',
    abilityDesc: 'Уменьшает весь урон от Прорыва на -25%, и разницу в уроне получает Симург.'
  },
  {
    id: 'hell_rooster',
    name: 'Адский Петух',
    subname: 'Огненный вестник рассвета',
    role: 'Урон',
    rarity: 'legendary',
    cost: 5,
    atk: 25,
    hp: 25,
    image: 'assets/Market/Card/Rooster.png',
    abilityName: 'Петушиный Крик',
    abilityDesc: 'Взрывает все горящие клетки и ловушки на поле! За каждую активную ловушку или огонёк на арене наносит боссу +12 чистого огненного урона и оставляет за собой пламя на 2 хода.'
  }
];

export const RARITY_PRICES = {
  common: 5,
  uncommon: 10,
  rare: 15,
  epic: 20,
  legendary: 30
};

export function getFullArtPath(cardOrImagePath) {
  if (!cardOrImagePath) return '';
  const imgPath = typeof cardOrImagePath === 'string'
    ? cardOrImagePath
    : (cardOrImagePath.fullArtImage || cardOrImagePath.image || '');
  if (!imgPath) return '';
  if (imgPath.includes('assets/Market/Card/Full Art/')) return imgPath;
  return imgPath
    .replace('assets/Market/Card/', 'assets/Market/Card/Full Art/')
    .replace(/\.png$/i, '.jpg');
}

// Проставляем цену яйцами и путь к квадратному Full Art для каждой карты
CARDS_DATABASE.forEach(card => {
  if (!card.price) {
    card.price = RARITY_PRICES[card.rarity] || 10;
  }
  if (!card.fullArtImage) {
    card.fullArtImage = getFullArtPath(card.image);
  }
});


export function getCardById(id) {
  return CARDS_DATABASE.find(c => c.id === id);
}

export function getRandomStarterDeck(size = 12) {
  // Набор для интересного старта: немного дешевых, парочка средних и пара мощных
  const commons = CARDS_DATABASE.filter(c => c.rarity === 'common');
  const uncommons = CARDS_DATABASE.filter(c => c.rarity === 'uncommon');
  const rares = CARDS_DATABASE.filter(c => c.rarity === 'rare');
  const epics = CARDS_DATABASE.filter(c => c.rarity === 'epic' || c.rarity === 'legendary');

  const deck = [];
  const pick = (arr, count) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  deck.push(...pick(commons, 5));
  deck.push(...pick(uncommons, 3));
  deck.push(...pick(rares, 2));
  deck.push(...pick(epics, 2));

  return deck.sort(() => 0.5 - Math.random());
}
