/**
 * BoardGenerator.js — Процедурный генератор клеток второго уровня (Этап 2 Настолка).
 * Поддерживает 54 клетки (и произвольные размеры сетки).
 * Тексты и шаблоны очищены от эмодзи и синхронизированы с EVENT_TEMPLATES.
 */

import { EVENT_TEMPLATES } from './boardEventsData.js';

export const TILE_SPRITES = {
  START: 'Empty-Tile4.png',
  NORMAL: 'campfire.png',
  GOOD: 'Regular Chest.png',
  BAD: 'Sharp spikes.png',
  MINIGAME: 'Wheel of Fortune.png',
  BOSS: 'Boss Room.png',
  BARRIER: 'closed tile.png'
};

export const EVENT_POOLS = {
  NORMAL: [
    {
      eventId: 'quiz_campfire',
      title: 'Привал у Лесного Костра',
      description: 'Мышонок-летописец сверяет записи об обитателях первого леса.',
      tileSprite: 'campfire.png',
      weight: 10,
      maxPerBoard: 3
    },
    {
      eventId: 'owl_library',
      title: 'Лесной Архив Филина',
      description: 'Мудрый страж ветвей приготовил вопрос для внимательного путника.',
      tileSprite: 'Library.png',
      weight: 9,
      maxPerBoard: 3
    },
    {
      eventId: 'foggy_crossroad',
      title: 'Развилка в Тумане',
      description: 'Густая пелена скрыла указатели. Выберите верное направление.',
      tileSprite: 'Landmark.png',
      weight: 8,
      maxPerBoard: 3
    },
    {
      eventId: 'spring_flask',
      title: 'Сосуд с Живой Росой',
      description: 'Хрустальная колба с ключевой водой на каменном выступе.',
      tileSprite: 'bottle of water.png',
      weight: 10,
      maxPerBoard: 3
    },
    {
      eventId: 'mail_bag',
      title: 'Почтовая Сумка с Картами',
      description: 'Лесная торговка предлагает обменять припасы на редкий набор карт.',
      tileSprite: 'map bag.png',
      weight: 8,
      maxPerBoard: 2,
      minStep: 6
    },
    {
      eventId: 'magic_oracle',
      title: 'Видение Оракула',
      description: 'В глубине хрустальной сферы мелькают знаки будущих побед.',
      tileSprite: 'crystal ball.png',
      weight: 7,
      maxPerBoard: 2
    },
    {
      eventId: 'mysterious_basement',
      title: 'Подземелье под Корнями',
      description: 'Тёмный люк под корнями: внутри ждёт либо награда, либо испытание.',
      tileSprite: 'basement hatch.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'wild_beehive',
      title: 'Дикие Соты',
      description: 'Лесной улей полон целебного дикого мёда.',
      tileSprite: 'Bee comb.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'forest_bell',
      title: 'Лесной Колокол',
      description: 'Бронзовый колокол на развилке лесных троп.',
      tileSprite: 'Bell.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'golden_pen',
      title: 'Золотое Перо',
      description: 'Канцелярия лесного секретаря и учёт припасов.',
      tileSprite: 'Golden Pen.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'mushroom_teremok',
      title: 'Грибной Теремок',
      description: 'Уютный домик под шляпкой лесного боровика.',
      tileSprite: 'mushroom house.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'autumn_fountain',
      title: 'Чаша Осеннего Фонтана',
      description: 'Каменный фонтан с чистейшей родниковой водой.',
      tileSprite: 'water fountain.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'blacksmith_anvil',
      title: 'Кузнечная Наковальня',
      description: 'Походная кузница дятла-бронника для укрепления снаряжения.',
      tileSprite: 'Anvil.png',
      weight: 7,
      maxPerBoard: 2
    },
    {
      eventId: 'blue_crystal',
      title: 'Синий Кристалл Эфира',
      description: 'Магический минерал пульсирует чистой энергией птичьей магии.',
      tileSprite: 'Blue-Crystal.png',
      weight: 7,
      maxPerBoard: 2
    },
    {
      eventId: 'glowing_stump',
      title: 'Сияющий Пень',
      description: 'Древний замшелый пень, светящийся изнутри спорами магии.',
      tileSprite: 'hollow stump.png',
      weight: 7,
      maxPerBoard: 2
    },
    {
      eventId: 'wind_mill',
      title: 'Старая Ветряная Мельница',
      description: 'Деревянные крылья со скрипом вращаются над верхушками елей.',
      tileSprite: 'mill.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'ancient_rune_stone',
      title: 'Рунный Камень Древних',
      description: 'Монолит с рунами древних птичьих хранителей.',
      tileSprite: 'Rune-Stone.png',
      weight: 7,
      maxPerBoard: 2
    },
    {
      eventId: 'brass_telescope',
      title: 'Латунный Телескоп',
      description: 'Дозорная вышка с подзорной трубой для разведки пути.',
      tileSprite: 'telescope.png',
      weight: 7,
      maxPerBoard: 2
    },
    {
      eventId: 'master_toolbox',
      title: 'Красный Ящик Мастера',
      description: 'Набор инструментов лесного инженера для починки снаряжения.',
      tileSprite: 'Toolbox.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'beaver_bridge_outpost',
      title: 'Бобровая Застава на Мосту',
      description: 'Опорный пункт дровосеков на переходе через лесной канал.',
      tileSprite: 'peace-wood.png',
      weight: 8,
      maxPerBoard: 2
    }
  ],

  GOOD: [
    {
      eventId: 'chest_regular',
      title: 'Окованный Ларец',
      description: 'Деревянный сундучок с запасом яиц среди корней старого дуба.',
      tileSprite: 'Regular Chest.png',
      weight: 15
    },
    {
      eventId: 'beaver_legendary_chest',
      title: 'Кованый Ларь Архитектора',
      description: 'Элитный резерв плотины с наборами карт для финальной битвы.',
      tileSprite: 'Legendary Chest.png',
      weight: 5,
      maxPerBoard: 2,
      minStep: 14
    },
    {
      eventId: 'egg_pouch',
      title: 'Походный Саквояж',
      description: 'Кожаная сумка с отборными яйцами, оставленная на ветвях.',
      tileSprite: 'bag of eggs.png',
      weight: 14
    },
    {
      eventId: 'lost_compass',
      title: 'Золотой Компас',
      description: 'Зачарованный компас указывает безопасный путь мимо ловушек.',
      tileSprite: 'Golden Compas.png',
      weight: 9,
      maxPerBoard: 2
    },
    {
      eventId: 'egg_magnet',
      title: 'Магнитный Оберег',
      description: 'Реликвия кузницы, притягивающая яйца из лесных тайников.',
      tileSprite: 'Magnet.png',
      weight: 9,
      maxPerBoard: 2
    },
    {
      eventId: 'divine_healing',
      title: 'Чистый Источник',
      description: 'Ключевая вода снимает отравление и возвращает утраченные припасы.',
      tileSprite: 'God Bless.png',
      weight: 8,
      maxPerBoard: 2,
      minStep: 8
    },
    {
      eventId: 'holiday_gift',
      title: 'Именной Свёрток',
      description: 'Праздничная коробка с боевым бустером карт внутри.',
      tileSprite: 'Gift Box.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'immunity_elixir',
      title: 'Янтарный Эликсир',
      description: 'Защитный настой, оберегающий от одной ловушки или яда.',
      tileSprite: 'Bless-Elixire.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'sacrifice_monument',
      title: 'Алтарь Стража',
      description: 'Древний монолит, дарующий защиту в обмен на скромное подношение.',
      tileSprite: 'Monument.png',
      weight: 7,
      maxPerBoard: 2
    },
    {
      eventId: 'charity_monument',
      title: 'Чаша Возмездия и Щедрости',
      description: 'Тотем, способный многократно возместить потерянные в пути яйца.',
      tileSprite: 'Small Monument.png',
      weight: 6,
      maxPerBoard: 2,
      minStep: 12
    },
    {
      eventId: 'lucky_clover',
      title: 'Четырёхлистный Клевер',
      description: 'Легендарный цветок удачи удваивает награды на следующих клетках.',
      tileSprite: 'clover.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'flying_dice',
      title: 'Крылатый Кубик',
      description: 'Лёгкий лесной бриз наполняет крылья: следующий бросок удваивается.',
      tileSprite: 'Flying Dice.png',
      weight: 9,
      maxPerBoard: 2
    },
    {
      eventId: 'pearl_in_nest',
      title: 'Жемчужина в Гнезде',
      description: 'Редчайшая сияющая жемчужина, спрятанная в ивовом гнезде.',
      tileSprite: 'Pearl-in-Nest.png',
      weight: 7,
      maxPerBoard: 2,
      minStep: 10
    },
    {
      eventId: 'ripe_rowan',
      title: 'Гроздь Спелой Рябины',
      description: 'Свежие лесные ягоды восстанавливают силы и приманивают птиц.',
      tileSprite: 'rowan.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'trapped_animal',
      title: 'Птица в Сети',
      description: 'Освободите попавшего в ловушку сородича и обретите верного друга.',
      tileSprite: 'Helping animal caught in trap.png',
      weight: 7,
      maxPerBoard: 2
    }
  ],

  BAD: [
    {
      eventId: 'sharp_spikes',
      title: 'Острые Колья',
      description: 'Опасные колья лесных браконьеров ранят зазевавшегося путника.',
      tileSprite: 'Sharp spikes.png',
      weight: 10
    },
    {
      eventId: 'poison_thorns',
      title: 'Заросли Колючего Терновника',
      description: 'Колючие плети отравляют путника токсином на 4 хода.',
      tileSprite: 'prickly bush.png',
      weight: 9
    },
    {
      eventId: 'spoiled_egg',
      title: 'Болотная Испарина',
      description: 'Ядовитые споры ослабляют здоровье в течение 5 ходов.',
      tileSprite: 'poisonous egg.png',
      weight: 9
    },
    {
      eventId: 'fox_ambush',
      title: 'Лисья Засада',
      description: 'Рыжая плутовка охотится за содержимым вашего походного мешка.',
      tileSprite: 'Cunning Fox.png',
      weight: 9,
      minStep: 5
    },
    {
      eventId: 'wooden_totem',
      title: 'Тотем Лесных Духов',
      description: 'Механический часовой плотины взимает пошлину за проход.',
      tileSprite: 'Wooden Totem.png',
      weight: 9,
      minStep: 6
    },
    {
      eventId: 'infernal_slab',
      title: 'Плита Преисподней',
      description: 'Штормовая молния, ослабляющая запас сил перед боем с Боссом.',
      tileSprite: 'Devil-Dmg.png',
      weight: 6,
      maxPerBoard: 2,
      minStep: 16
    },
    {
      eventId: 'bear_trap',
      title: 'Медвежий Капкан',
      description: 'Стальные челюсти капкана захлопываются под лапами!',
      tileSprite: 'Iron Trap.png',
      weight: 8
    },
    {
      eventId: 'cat_ambush',
      title: 'Засада в Кустах: Чёрный Кот',
      description: 'Опасный хищник поджидает птиц в густых зарослях.',
      tileSprite: 'hidden beast in bushes-cat.png',
      weight: 8,
      minStep: 7
    },
    {
      eventId: 'spider_cage',
      title: 'Клетка с Паутиной',
      description: 'Липкая паутина гигантского лесного паука опутывает крылья.',
      tileSprite: 'cage with a spiderweb.png',
      weight: 8
    },
    {
      eventId: 'burning_resin',
      title: 'Горящая Смола',
      description: 'Раскалённая древесная смола преграждает тропу.',
      tileSprite: 'burning resin.png',
      weight: 7
    },
    {
      eventId: 'cursed_obelisk',
      title: 'Проклятый Обелиск',
      description: 'Тёмный монолит излучает тревожную гибельную ауру.',
      tileSprite: 'The Cursed Monument.png',
      weight: 6,
      maxPerBoard: 2,
      minStep: 12
    },
    {
      eventId: 'spring_platform',
      title: 'Прыгающая Платформа',
      description: 'Неуправляемая пружина с силой отбрасывает путника назад.',
      tileSprite: 'Spring Platform.png',
      weight: 7
    }
  ],

  MINIGAME: [
    {
      eventId: 'wheel_fortune',
      title: 'Колесо Лесной Фортуны',
      description: 'Раскрутите ярмарочное колесо и заберите приз выпавшего сектора.',
      tileSprite: 'Wheel of Fortune.png',
      weight: 12,
      maxPerBoard: 2
    },
    {
      eventId: 'mystery_boxes',
      title: 'Ларцы Иллюзиониста',
      description: 'Четыре запечатанные шкатулки с наградами и ловушкой.',
      tileSprite: 'Random-box.png',
      weight: 10,
      maxPerBoard: 2
    },
    {
      eventId: 'strongman_game',
      title: 'Наковальня Лесоруба',
      description: 'Остановите бегунок на пике мощности и ударьте молотом.',
      tileSprite: 'force gauge.png',
      weight: 10,
      maxPerBoard: 2
    },
    {
      eventId: 'timestop_game',
      title: 'Хронометр Часовщика',
      description: 'Остановите отсчёт времени точно на заданной секунде.',
      tileSprite: 'Hourglass.png',
      weight: 10,
      maxPerBoard: 2
    },
    {
      eventId: 'bingo_game',
      title: 'Лесной Розыгрыш',
      description: 'Выберите билет и испытайте удачу у лотерейного барабана.',
      tileSprite: 'bingo machine.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'toy_claw_machine',
      title: 'Механический Захват',
      description: 'Опустите клешню в нужный момент, чтобы вытащить капсулу с призом.',
      tileSprite: 'Toy Vending Machine.png',
      weight: 9,
      maxPerBoard: 2
    },
    {
      eventId: 'abandoned_cellar',
      title: 'Запертый Погреб',
      description: 'Взломайте три штифта замка, чтобы добраться до тайника.',
      tileSprite: 'stairway to cellar.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'forest_thimbles',
      title: 'Игра в Скорлупки',
      description: 'Уследите за перемещением ореховых скорлупок и найдите золотое яйцо.',
      tileSprite: 'empty bowl.png',
      weight: 9,
      maxPerBoard: 2
    },
    {
      eventId: 'darts_target',
      title: 'Дартс по Мишеням',
      description: 'Лесной тир с дротиками и яблочком по центру.',
      tileSprite: 'Darts.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'duck_fishing',
      title: 'Рыбалка с Уточками',
      description: 'Поймайте призовую уточку удочкой с крючком.',
      tileSprite: 'Duck Fishing Game.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'ring_toss',
      title: 'Кольцеброс',
      description: 'Набросьте кольца на призовые столбики.',
      tileSprite: 'ring toss.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'scratch_ticket',
      title: 'Лотерейный Билет',
      description: 'Сотрите защитный слой билета и узнайте свой выигрыш.',
      tileSprite: 'scratch-off ticket.png',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'scales_balance',
      title: 'Чаши Весов Судьбы',
      description: 'Уравновесьте весы лесным грузом.',
      tileSprite: 'scales with pans.png',
      weight: 7,
      maxPerBoard: 2
    }
  ]
};

export class BoardGenerator {
  static generate(baseCells) {
    if (!Array.isArray(baseCells) || baseCells.length === 0) {
      console.warn('[BoardGenerator] Передан пустой массив базовых клеток');
      return baseCells;
    }

    const totalCells = baseCells.length;
    const newCells = [];

    const categoryWeights = [
      { cat: 'GOOD', weight: 0.30 },
      { cat: 'NORMAL', weight: 0.28 },
      { cat: 'MINIGAME', weight: 0.24 },
      { cat: 'BAD', weight: 0.18 }
    ];

    let consecutiveBadCount = 0;
    let lastEventKey = null;
    const eventCounts = {};

    for (let i = 0; i < totalCells; i++) {
      const base = baseCells[i];
      const stepIndex = i + 1;

      // 1. Первая клетка: СТАРТ
      if (stepIndex === 1) {
        newCells.push({
          ...base,
          index: 1,
          type: 'START',
          eventId: 'start_gate',
          title: 'Врата Черепа',
          description: 'Стартовая площадка приключения. Бросайте кубик, чтобы начать путь.',
          icon: '',
          tileSprite: TILE_SPRITES.START
        });
        continue;
      }

      // 2. Предпоследняя клетка (Босс)
      if (stepIndex === totalCells - 1) {
        newCells.push({
          ...base,
          index: stepIndex,
          type: 'BOSS',
          eventId: 'boss_gate',
          title: 'Цитадель Плотины',
          description: 'Главные ворота плотины Бобра-Дровосека. Финальное испытание.',
          icon: '',
          tileSprite: TILE_SPRITES.BOSS
        });
        continue;
      }

      // 3. Последняя клетка (Барьер)
      if (stepIndex === totalCells) {
        newCells.push({
          ...base,
          index: stepIndex,
          type: 'BAD',
          eventId: 'magic_barrier',
          title: 'Зачарованный Завал',
          description: 'Непреодолимая преграда из брёвен отбрасывает назад к воротам плотины.',
          icon: '',
          tileSprite: TILE_SPRITES.BARRIER
        });
        continue;
      }

      // 3.5 Клетка 33: Золотой Ключ от Плотины (для открытия барьера на второй круг)
      if (stepIndex === 33 && totalCells >= 36) {
        newCells.push({
          ...base,
          index: 33,
          type: 'GOOD',
          eventId: 'golden_key',
          title: 'Золотой Ключ от Плотины',
          description: 'Древний ключ, открывающий зачарованный завал позади плотины для выхода на второй круг.',
          icon: '🔑',
          tileSprite: 'Golden Key.png'
        });
        continue;
      }

      // 4. Промежуточные клетки (2 .. totalCells - 2)
      let chosenCat = this.pickWeightedCategory(categoryWeights);

      if (chosenCat === 'BAD') {
        consecutiveBadCount++;
        if (consecutiveBadCount > 2) {
          chosenCat = Math.random() < 0.55 ? 'GOOD' : 'MINIGAME';
          consecutiveBadCount = 0;
        }
      } else {
        consecutiveBadCount = 0;
      }

      const selectedEvent = this.pickEventFromPool(
        chosenCat,
        stepIndex,
        eventCounts,
        lastEventKey
      );

      const eventKey = selectedEvent.eventId || selectedEvent.title;
      eventCounts[eventKey] = (eventCounts[eventKey] || 0) + 1;
      lastEventKey = eventKey;

      const template = selectedEvent.eventId ? EVENT_TEMPLATES[selectedEvent.eventId] : null;

      newCells.push({
        ...base,
        index: stepIndex,
        type: selectedEvent.type || chosenCat,
        eventId: selectedEvent.eventId,
        title: selectedEvent.title || template?.title || `Клетка #${stepIndex}`,
        description: selectedEvent.description || template?.text || '',
        icon: '',
        tileSprite: selectedEvent.tileSprite || template?.tileSprite || TILE_SPRITES[chosenCat] || TILE_SPRITES.NORMAL
      });
    }

    console.log(`[BoardGenerator] Сгенерирована карта на ${newCells.length} клеток.`);
    return newCells;
  }

  static pickEventFromPool(category, stepIndex, eventCounts, lastEventKey) {
    const rawPool = EVENT_POOLS[category] || EVENT_POOLS.NORMAL;

    let validPool = rawPool.filter(ev => {
      const key = ev.eventId || ev.title;
      const count = eventCounts[key] || 0;
      const withinLimit = ev.maxPerBoard ? count < ev.maxPerBoard : true;
      const meetsMinStep = ev.minStep ? stepIndex >= ev.minStep : true;
      const notRepeated = key !== lastEventKey;
      return withinLimit && meetsMinStep && notRepeated;
    });

    if (validPool.length === 0) {
      validPool = rawPool.filter(ev => {
        const key = ev.eventId || ev.title;
        return ev.maxPerBoard ? (eventCounts[key] || 0) < ev.maxPerBoard : true;
      });
    }

    if (validPool.length === 0) {
      validPool = rawPool;
    }

    const totalWeight = validPool.reduce((sum, ev) => sum + (ev.weight ?? 10), 0);
    let roll = Math.random() * totalWeight;

    for (const ev of validPool) {
      roll -= (ev.weight ?? 10);
      if (roll <= 0) return ev;
    }

    return validPool[validPool.length - 1];
  }

  static pickWeightedCategory(weights) {
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of weights) {
      roll -= item.weight;
      if (roll <= 0) return item.cat;
    }
    return 'NORMAL';
  }
}