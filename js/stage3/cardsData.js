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
    abilityDesc: 'Поджигает выбранную клетку на 3 раунда: босс получает по 5 урона горения в начале хода.'
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
  }
];

export const RARITY_PRICES = {
  common: 5,
  uncommon: 10,
  rare: 15,
  epic: 20,
  legendary: 30
};

// Проставляем цену яйцами для каждой карты
CARDS_DATABASE.forEach(card => {
  if (!card.price) {
    card.price = RARITY_PRICES[card.rarity] || 10;
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
