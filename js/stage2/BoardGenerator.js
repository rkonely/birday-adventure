/**
 * BoardGenerator.js — Процедурный генератор клеток второго уровня (Этап 2 Настолка).
 * 
 * - Сохраняет фиксированными координаты изометрической сетки (36 слотов вокруг стола).
 * - Гарантирует одинаковые:
 *   - Клетка 1: СТАРТ (Врата Черепа)
 *   - Клетка 35: БОСС (Комната Бобра-Строителя)
 *   - Клетка 36: БАРЬЕР / ФИНИШ ("Ты не пройдёшь!")
 * - Слоты 2..34 процедурно генерируются по правилам баланса из доступных тайлов
 *   (01.png, 02.png, 03.png, 04.png) и базы событий EVENT_TEMPLATES.
 */

import { EVENT_TEMPLATES } from './boardEventsData.js';

// Каталог доступных тайлов и связанных с ними типов событий
export const TILE_SPRITES = {
  NORMAL: '01.png',   // Тропа, ориентиры, костры, загадки
  GOOD: '02.png',     // Сундуки, мешочки яиц, магниты, сокровища
  BAD: '03.png',      // Шипы, яд, тухлые яйца, лисицы, опасности
  MINIGAME: '04.png'  // Колесо фортуны, бинго, силач, клевер, мини-игры
};

// Пул событий для генерации промежуточных клеток (2..34)
export const EVENT_POOLS = {
  // 01.png — Обычные лесные события и квесты
  NORMAL: [
    {
      eventId: 'quiz_campfire',
      type: 'NORMAL',
      tileSprite: '01.png',
      title: 'Отдых у костра с лесными Друзьями',
      description: 'Мышонок-путник угощает ягодным чаем и спрашивает про лесных зверей.',
      icon: '🏕️'
    },
    {
      eventId: 'trail_fork_left_right',
      type: 'NORMAL',
      tileSprite: '01.png',
      title: 'Ориентир: Развилка в тумане',
      description: 'Кто-то пытается сбить вас с курса! Выберите верную тропу.',
      icon: '🧭'
    },
    {
      eventId: 'mystic_flask',
      type: 'NORMAL',
      tileSprite: '01.png',
      title: 'Загадочная родниковая колба',
      description: 'Чистейшая ключевая вода в хрустальном сосуде. Испейте для бодрости духа.',
      icon: '🧪'
    },
    {
      eventId: 'crystal_ball_vision',
      type: 'NORMAL',
      tileSprite: '01.png',
      title: 'Стеклянный Шар Предсказаний',
      description: 'В хрустальных переливах шара мелькают загадочные знаки грядущего!',
      icon: '🔮'
    },
    {
      eventId: null,
      type: 'NORMAL',
      tileSprite: '01.png',
      title: 'Лесная Тропа Пернатых',
      description: 'Мягкий зеленый мох и шелест крон вековых сосен. Путь свободен.',
      icon: '🌲'
    }
  ],

  // 02.png — Сокровища, сундуки, ресурсы
  GOOD: [
    {
      eventId: 'chest_regular',
      type: 'GOOD',
      tileSprite: '02.png',
      title: 'Обычный Сундук',
      description: 'Старинный ларец с золочеными яйцами внутри! (+6 яиц)',
      icon: '📦'
    },
    {
      eventId: 'beaver_legendary_chest',
      type: 'GOOD',
      tileSprite: '02.png',
      title: 'Легендарный Сундук Бобра',
      description: 'Кованый ларь Плотины с редчайшими бустерами карт на следующий этап!',
      icon: '👑'
    },
    {
      eventId: 'egg_sack',
      type: 'GOOD',
      tileSprite: '02.png',
      title: 'Мешочек Лесных Яиц',
      description: 'Аккуратный холщовый мешочек, полный отборных яиц! (+5 яиц)',
      icon: '💰'
    },
    {
      eventId: 'egg_magnet',
      type: 'GOOD',
      tileSprite: '02.png',
      title: 'Яичный Магнит',
      description: 'Магический артефакт: следующая награда яйцами будет умножена на 2!',
      icon: '🧲'
    },
    {
      eventId: 'divine_healing',
      type: 'GOOD',
      tileSprite: '02.png',
      title: 'Божественное Исцеление',
      description: 'Светлый луч снимает яд и возвращает все потерянные на карте яйца!',
      icon: '✨'
    },
    {
      eventId: 'booster_gift',
      type: 'GOOD',
      tileSprite: '02.png',
      title: 'Подарочный Сверток',
      description: 'Праздничная коробка с лентой — внутри лежит ценный бустер карт!',
      icon: '🎁'
    },
    {
      eventId: 'immunity_elixir',
      type: 'GOOD',
      tileSprite: '02.png',
      title: 'Эликсир Неуязвимости',
      description: 'Защитное зелье дарует щит от одной потери яиц или ловушки.',
      icon: '🛡️'
    }
  ],

  // 03.png — Ловушки, яд, испытания
  BAD: [
    {
      eventId: 'hazard_spikes',
      type: 'BAD',
      tileSprite: '03.png',
      title: 'Коварные Шипы Плотины',
      description: 'Острые еловые колья отравляют ядом на 4 хода (-1 яйцо за ход).',
      icon: '🌵'
    },
    {
      eventId: 'rotten_egg',
      type: 'BAD',
      tileSprite: '03.png',
      title: 'Тухлое Яйцо-Ловушка',
      description: 'Едкий токсичный дым накладывает отравление на 5 ходов!',
      icon: '🤢'
    },
    {
      eventId: 'cunning_fox_theft',
      type: 'BAD',
      tileSprite: '03.png',
      title: 'Нападение Хитрой Лисы',
      description: 'Рыжая разбойница выскакивает из кустов и похищает ваши яйца!',
      icon: '🦊'
    },
    {
      eventId: 'secret_basement',
      type: 'BAD',
      tileSprite: '03.png',
      title: 'Таинственный Подвал',
      description: 'Спуск в темноту... Найдёте ли вы курятник или сердитую наседку?',
      icon: '🚪'
    }
  ],

  // 04.png — Азартные мини-игры и редкие шансы
  MINIGAME: [
    {
      eventId: 'lucky_clover',
      type: 'MINIGAME',
      tileSprite: '04.png',
      title: 'Клевер Удачи',
      description: 'Изумрудный четырёхлистник дарует +3 кубика на переброс бросков!',
      icon: '🍀'
    },
    {
      eventId: 'fortune_wheel_spin',
      type: 'MINIGAME',
      tileSprite: '04.png',
      title: 'Колесо Лесной Фортуны',
      description: 'Испытайте удачу! Раскрутите лесное колесо и сорвите куш яиц!',
      icon: '🎡'
    },
    {
      eventId: 'bingo_drum_game',
      type: 'MINIGAME',
      tileSprite: '04.png',
      title: 'Лесное Бинго',
      description: 'Выберите счастливый билет и крутите барабан ради супер-приза +30 яиц!',
      icon: '🎰'
    },
    {
      eventId: 'strength_meter_test',
      type: 'MINIGAME',
      tileSprite: '04.png',
      title: 'Силомер Лесоруба',
      description: 'Зажмите Пробел и ударьте точно в красную зону ради х10 яиц!',
      icon: '🔨'
    },
    {
      eventId: 'time_freeze_challenge',
      type: 'MINIGAME',
      tileSprite: '04.png',
      title: 'Хронометр: Остановка Времени',
      description: 'Остановите таймер ровно на миллисекунде, чтобы забрать до 30 яиц!',
      icon: '⏱️'
    },
    {
      eventId: 'mystery_box_4',
      type: 'MINIGAME',
      tileSprite: '04.png',
      title: 'Коробка с Сюрпризом',
      description: 'Выбор из 4 коробок: Боксерская перчатка, бустер, кубик или 10 золотых яиц!',
      icon: '🎁'
    },
    {
      eventId: 'gacha_toy_machine',
      type: 'MINIGAME',
      tileSprite: '04.png',
      title: 'Автомат с Игрушками',
      description: 'Поймайте механической лапой яйцо или редкий боевой бустер!',
      icon: '🕹️'
    }
  ]
};

export class BoardGenerator {
  /**
   * Сгенерировать новый набор клеток, сохраняя исходные координаты слотов
   * @param {Array} baseCells — исходные 36 клеток с изометрическими координатами
   * @returns {Array} сгенерированный массив клеток
   */
  static generate(baseCells) {
    if (!Array.isArray(baseCells) || baseCells.length === 0) {
      console.warn('⚠️ [BoardGenerator] Передан пустой массив базовых клеток');
      return baseCells;
    }

    const totalCells = baseCells.length;
    const newCells = [];

    // Баланс категорий для промежуточных клеток (2..totalCells-2)
    // Доли: GOOD ~30%, NORMAL ~30%, BAD ~20%, MINIGAME ~20%
    const categoryWeights = [
      { cat: 'GOOD', weight: 0.30 },
      { cat: 'NORMAL', weight: 0.30 },
      { cat: 'MINIGAME', weight: 0.22 },
      { cat: 'BAD', weight: 0.18 }
    ];

    let consecutiveBadCount = 0; // контроль: не более 2 ловушек подряд

    for (let i = 0; i < totalCells; i++) {
      const base = baseCells[i];
      const stepIndex = i + 1;

      // 1. Слот 1: ВСЕГДА СТАРТ
      if (stepIndex === 1) {
        newCells.push({
          ...base,
          index: 1,
          type: 'START',
          eventId: 'start_gate',
          title: 'Врата Черепа',
          description: 'Стартовая площадка! Приключение на доске начинается. Бросайте кубик!',
          icon: '🚪',
          tileSprite: '01.png'
        });
        continue;
      }

      // 2. Слот 35 (или предпоследний): ВСЕГДА БОСС
      if (stepIndex === totalCells - 1 || (totalCells === 36 && stepIndex === 35)) {
        newCells.push({
          ...base,
          index: stepIndex,
          type: 'BOSS',
          eventId: 'boss_gate',
          title: 'Логово Бобра-Строителя!',
          description: 'Огромные дубовые ворота плотины со скрипом отворяются. За ними трон Бобра!',
          icon: '🦫',
          tileSprite: '04.png'
        });
        continue;
      }

      // 3. Слот 36 (или последний): ВСЕГДА БАРЬЕР / ФИНИШ
      if (stepIndex === totalCells) {
        newCells.push({
          ...base,
          index: stepIndex,
          type: 'BAD',
          eventId: 'magic_barrier',
          title: 'ТЫ НЕ ПРОЙДЕШЬ!',
          description: 'Глухая стена из зачарованных брёвен преграждает путь! Ударная волна отбрасывает вас к Боссу.',
          icon: '🛑',
          tileSprite: '03.png'
        });
        continue;
      }

      // 4. Слоты 2..34: Процедурная генерация по балансу
      let chosenCat = this.pickWeightedCategory(categoryWeights);

      // Защита от скопления ловушек
      if (chosenCat === 'BAD') {
        consecutiveBadCount++;
        if (consecutiveBadCount > 2) {
          chosenCat = Math.random() < 0.6 ? 'GOOD' : 'NORMAL';
          consecutiveBadCount = 0;
        }
      } else {
        consecutiveBadCount = 0;
      }

      const pool = EVENT_POOLS[chosenCat] || EVENT_POOLS.NORMAL;
      const randomEvent = pool[Math.floor(Math.random() * pool.length)];

      newCells.push({
        ...base,
        index: stepIndex,
        type: randomEvent.type || chosenCat,
        eventId: randomEvent.eventId,
        title: randomEvent.title,
        description: randomEvent.description,
        icon: randomEvent.icon,
        tileSprite: randomEvent.tileSprite || TILE_SPRITES[chosenCat] || '01.png'
      });
    }

    console.log(`🎲 [BoardGenerator] Успешно сгенерирована новая карта из ${newCells.length} клеток!`);
    return newCells;
  }

  /**
   * Выбор категории с учётом вероятностей
   */
  static pickWeightedCategory(weights) {
    const roll = Math.random();
    let accumulated = 0;
    for (const item of weights) {
      accumulated += item.weight;
      if (roll <= accumulated) {
        return item.cat;
      }
    }
    return 'NORMAL';
  }
}
