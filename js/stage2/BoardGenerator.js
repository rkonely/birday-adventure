/**
 * BoardGenerator.js — Процедурный генератор клеток второго уровня (Этап 2 Настолка).
 */

import { EVENT_TEMPLATES } from './boardEventsData.js';

export const TILE_SPRITES = {
  NORMAL: '01.png',   // Тропа, ориентиры, костры, загадки
  GOOD: '02.png',     // Сундуки, мешочки яиц, магниты, сокровища
  BAD: '03.png',      // Шипы, яд, тухлые яйца, лисицы, опасности
  MINIGAME: '04.png'  // Колесо фортуны, бинго, силач, клевер, мини-игры
};

/**
 * Пул событий для генерации промежуточных клеток (2..34).
 * Добавлены параметры баланса:
 * - weight: относительный шанс выпадения внутри категории (по умолчанию 10)
 * - maxPerBoard: лимит таких клеток на всю доску (Infinity по умолчанию)
 * - minStep: минимальный индекс клетки, с которого может появиться событие
 */
export const EVENT_POOLS = {
  NORMAL: [
    {
      eventId: 'quiz_campfire',
      title: 'Отдых у костра с лесными Друзьями',
      description: 'Мышонок-путник угощает ягодным чаем и спрашивает про лесных зверей.',
      icon: '🏕️',
      weight: 10,
      maxPerBoard: 3
    },
    {
      eventId: 'trail_fork_left_right',
      title: 'Ориентир: Развилка в тумане',
      description: 'Кто-то пытается сбить вас с курса! Выберите верную тропу.',
      icon: '🧭',
      weight: 8,
      maxPerBoard: 3
    },
    {
      eventId: 'mystic_flask',
      title: 'Загадочная родниковая колба',
      description: 'Чистейшая ключевая вода в хрустальном сосуде. Испейте для бодрости духа.',
      icon: '🧪',
      weight: 10
    },
    {
      eventId: 'crystal_ball_vision',
      title: 'Стеклянный Шар Предсказаний',
      description: 'В хрустальных переливах шара мелькают загагадочные знаки грядущего!',
      icon: '🔮',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: null,
      title: 'Лесная Тропа Пернатых',
      description: 'Мягкий зеленый мох и шелест крон вековых сосен. Путь свободен.',
      icon: '🌲',
      weight: 16 // Обычная тропа встречается чуть чаще сюжетных ивентов
    }
  ],

  GOOD: [
    {
      eventId: 'chest_regular',
      title: 'Обычный Сундук',
      description: 'Старинный ларец с золочеными яйцами внутри! (+6 яиц)',
      icon: '📦',
      weight: 15
    },
    {
      eventId: 'beaver_legendary_chest',
      title: 'Легендарный Сундук Бобра',
      description: 'Кованый ларь Плотины с редчайшими бустерами карт на следующий этап!',
      icon: '👑',
      weight: 3,       // Редкий шанс
      maxPerBoard: 1,  // Не более 1 легендарного сундука на карту
      minStep: 12      // Только ближе к середине/концу доски
    },
    {
      eventId: 'egg_sack',
      title: 'Мешочек Лесных Яиц',
      description: 'Аккуратный холщовый мешочек, полный отборных яиц! (+5 яиц)',
      icon: '💰',
      weight: 18
    },
    {
      eventId: 'egg_magnet',
      title: 'Яичный Магнит',
      description: 'Магический артефакт: следующая награда яйцами будет умножена на 2!',
      icon: '🧲',
      weight: 8,
      maxPerBoard: 2
    },
    {
      eventId: 'divine_healing',
      title: 'Божественное Исцеление',
      description: 'Светлый луч снимает яд и возвращает все потерянные на карте яйца!',
      icon: '✨',
      weight: 5,
      maxPerBoard: 1,
      minStep: 10 // На первых клетках нечего лечить и возвращать
    },
    {
      eventId: 'booster_gift',
      title: 'Подарочный Сверток',
      description: 'Праздничная коробка с лентой — внутри лежит ценный бустер карт!',
      icon: '🎁',
      weight: 7,
      maxPerBoard: 2
    },
    {
      eventId: 'immunity_elixir',
      title: 'Эликсир Неуязвимости',
      description: 'Защитное зелье дарует щит от одной потери яиц или ловушки.',
      icon: '🛡️',
      weight: 10,
      maxPerBoard: 2
    }
  ],

  BAD: [
    {
      eventId: 'hazard_spikes',
      title: 'Коварные Шипы Плотины',
      description: 'Острые еловые колья отравляют ядом на 4 хода (-1 яйцо за ход).',
      icon: '🌵',
      weight: 12
    },
    {
      eventId: 'rotten_egg',
      title: 'Тухлое Яйцо-Ловушка',
      description: 'Едкий токсичный дым накладывает отравление на 5 ходов!',
      icon: '🤢',
      weight: 10
    },
    {
      eventId: 'cunning_fox_theft',
      title: 'Нападение Хитрой Лисы',
      description: 'Рыжая разбойница выскакивает из кустов и похищает ваши яйца!',
      icon: '🦊',
      weight: 10,
      minStep: 5 // Даем игроку сначала набрать немного яиц
    },
    {
      eventId: 'secret_basement',
      title: 'Таинственный Подвал',
      description: 'Спуск в темноту... Найдёте ли вы курятник или сердитую наседку?',
      icon: '🚪',
      weight: 8,
      maxPerBoard: 2
    }
  ],

  MINIGAME: [
    {
      eventId: 'lucky_clover',
      title: 'Клевер Удачи',
      description: 'Изумрудный четырёхлистник дарует +3 кубика на переброс бросков!',
      icon: '🍀',
      weight: 10,
      maxPerBoard: 2
    },
    {
      eventId: 'fortune_wheel_spin',
      title: 'Колесо Лесной Фортуны',
      description: 'Испытайте удачу! Раскрутите лесное колесо и сорвите куш яиц!',
      icon: '🎡',
      weight: 12,
      maxPerBoard: 2
    },
    {
      eventId: 'bingo_drum_game',
      title: 'Лесное Бинго',
      description: 'Выберите счастливый билет и крутите барабан ради супер-приза +30 яиц!',
      icon: '🎰',
      weight: 8,
      maxPerBoard: 1
    },
    {
      eventId: 'strength_meter_test',
      title: 'Силомер Лесоруба',
      description: 'Зажмите Пробел и ударьте точно в красную зону ради х10 яиц!',
      icon: '🔨',
      weight: 10,
      maxPerBoard: 2
    },
    {
      eventId: 'time_freeze_challenge',
      title: 'Хронометр: Остановка Времени',
      description: 'Остановите таймер ровно на миллисекунде, чтобы забрать до 30 яиц!',
      icon: '⏱️',
      weight: 10,
      maxPerBoard: 2
    },
    {
      eventId: 'mystery_box_4',
      title: 'Коробка с Сюрпризом',
      description: 'Выбор из 4 коробок: Боксерская перчатка, бустер, кубик или 10 золотых яиц!',
      icon: '🎁',
      weight: 12,
      maxPerBoard: 2
    },
    {
      eventId: 'gacha_toy_machine',
      title: 'Автомат с Игрушками',
      description: 'Поймайте механической лапой яйцо или редкий боевой бустер!',
      icon: '🕹️',
      weight: 10,
      maxPerBoard: 2
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

    const categoryWeights = [
      { cat: 'GOOD', weight: 0.30 },
      { cat: 'NORMAL', weight: 0.30 },
      { cat: 'MINIGAME', weight: 0.22 },
      { cat: 'BAD', weight: 0.18 }
    ];

    let consecutiveBadCount = 0;
    let lastEventKey = null; // Защита от двух одинаковых событий подряд
    const eventCounts = {};  // Счетчик выпавших событий для соблюдения maxPerBoard

    for (let i = 0; i < totalCells; i++) {
      const base = baseCells[i];
      const stepIndex = i + 1;

      // 1. Слот 1: СТАРТ
      if (stepIndex === 1) {
        newCells.push(this.createFixedCell(base, 1, {
          type: 'START',
          eventId: 'start_gate',
          title: 'Врата Черепа',
          description: 'Стартовая площадка! Приключение на доске начинается. Бросайте кубик!',
          icon: '🚪',
          tileSprite: TILE_SPRITES.NORMAL
        }));
        continue;
      }

      // 2. Слот 35 (или предпоследний): БОСС
      if (stepIndex === totalCells - 1) {
        newCells.push(this.createFixedCell(base, stepIndex, {
          type: 'BOSS',
          eventId: 'boss_gate',
          title: 'Логово Бобра-Строителя!',
          description: 'Огромные дубовые ворота плотины со скрипом отворяются. За ними трон Бобра!',
          icon: '🦫',
          tileSprite: TILE_SPRITES.MINIGAME
        }));
        continue;
      }

      // 3. Слот 36 (или последний): БАРЬЕР / ФИНИШ
      if (stepIndex === totalCells) {
        newCells.push(this.createFixedCell(base, stepIndex, {
          type: 'BAD',
          eventId: 'magic_barrier',
          title: 'ТЫ НЕ ПРОЙДЕШЬ!',
          description: 'Глухая стена из зачарованных брёвен преграждает путь! Ударная волна отбрасывает вас к Боссу.',
          icon: '🛑',
          tileSprite: TILE_SPRITES.BAD
        }));
        continue;
      }

      // 4. Слоты 2..(totalCells - 2): Процедурная генерация
      let chosenCat = this.pickWeightedCategory(categoryWeights);

      // Защита от скопления ловушек (не более 2 подряд)
      if (chosenCat === 'BAD') {
        consecutiveBadCount++;
        if (consecutiveBadCount > 2) {
          chosenCat = Math.random() < 0.6 ? 'GOOD' : 'NORMAL';
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

      // Опциональная синхронизация с EVENT_TEMPLATES, если там есть расширенные данные
      const templateData = selectedEvent.eventId && EVENT_TEMPLATES?.[selectedEvent.eventId]
        ? EVENT_TEMPLATES[selectedEvent.eventId]
        : null;

      newCells.push({
        ...base,
        index: stepIndex,
        type: selectedEvent.type || chosenCat,
        eventId: selectedEvent.eventId,
        title: selectedEvent.title || templateData?.title,
        description: selectedEvent.description || templateData?.description,
        icon: selectedEvent.icon || templateData?.icon || '❓',
        tileSprite: selectedEvent.tileSprite || TILE_SPRITES[chosenCat] || TILE_SPRITES.NORMAL
      });
    }

    console.log(`🎲 [BoardGenerator] Сгенерирована карта из ${newCells.length} клеток!`, eventCounts);
    return newCells;
  }

  /**
   * Вспомогательный метод для создания фиксированных сюжетных клеток
   */
  static createFixedCell(base, index, overrides) {
    return {
      ...base,
      index,
      ...overrides
    };
  }

  /**
   * Умный выбор события из пула с учётом весов, лимитов на карту, minStep и защиты от повторов подряд
   */
  static pickEventFromPool(category, stepIndex, eventCounts, lastEventKey) {
    const rawPool = EVENT_POOLS[category] || EVENT_POOLS.NORMAL;

    // Фильтруем доступные события по условиям
    let validPool = rawPool.filter(ev => {
      const key = ev.eventId || ev.title;
      const count = eventCounts[key] || 0;
      const withinLimit = ev.maxPerBoard ? count < ev.maxPerBoard : true;
      const meetsMinStep = ev.minStep ? stepIndex >= ev.minStep : true;
      const notRepeatedImmediately = key !== lastEventKey;

      return withinLimit && meetsMinStep && notRepeatedImmediately;
    });

    // Fallback 1: если из-за жестких фильтров пул опустел, разрешаем повтор, но соблюдаем лимит
    if (validPool.length === 0) {
      validPool = rawPool.filter(ev => {
        const key = ev.eventId || ev.title;
        return ev.maxPerBoard ? (eventCounts[key] || 0) < ev.maxPerBoard : true;
      });
    }

    // Fallback 2: если вообще все лимиты категории исчерпаны, берем весь пул категории
    if (validPool.length === 0) {
      validPool = rawPool;
    }

    // Взвешенный рандом внутри отфильтрованного пула
    const totalWeight = validPool.reduce((sum, ev) => sum + (ev.weight ?? 10), 0);
    let roll = Math.random() * totalWeight;

    for (const ev of validPool) {
      roll -= (ev.weight ?? 10);
      if (roll <= 0) {
        return ev;
      }
    }

    return validPool[validPool.length - 1];
  }

  /**
   * Выбор категории с учётом вероятностей
   */
  static pickWeightedCategory(weights) {
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const item of weights) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.cat;
      }
    }
    return 'NORMAL';
  }
}