import { events } from './EventManager.js';

/**
 * GameState — глобальное состояние игры с автосохранением в localStorage
 */
const STORAGE_KEY = 'birday_adventure_save_v1';

export class GameState {
  constructor() {
    this.data = {
      // Персональные данные игрока
      playerName: '',
      birthDay: 15,
      birthMonth: 10,
      isVerified: false,

      // Прогресс
      currentStage: 'TITLE', // 'TITLE', 'REGISTRATION', 'TRANSITION', 'STAGE_1', 'STAGE_2', 'SHOP', 'STAGE_3', 'VICTORY'
      completedStages: [],

      // Ресурсы
      eggs: 0,
      lives: 3,

      // Коллекция карт и боевая колода
      cardCollection: [],
      battleDeck: [],

      // Настройки
      soundEnabled: true,
      musicVolume: 0.5,
      sfxVolume: 0.7
    };

    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...this.data, ...parsed };
      }
    } catch (e) {
      console.warn('[GameState] Не удалось прочитать сохранение, создаем новое:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[GameState] Ошибка записи в localStorage:', e);
    }
  }

  setPlayerName(name) {
    this.data.playerName = name.trim();
    this.saveToStorage();
    events.emit('state:updated', this.data);
  }

  setBirthDate(day, month) {
    this.data.birthDay = parseInt(day, 10);
    this.data.birthMonth = parseInt(month, 10);
    this.saveToStorage();
    events.emit('state:updated', this.data);
  }

  verifyBirthday() {
    // Проверка условия: День рождения должен быть 15 октября (day: 15, month: 10)
    const valid = this.data.birthDay === 15 && this.data.birthMonth === 10;
    this.data.isVerified = valid;
    this.saveToStorage();
    return valid;
  }

  setStage(stageName) {
    this.data.currentStage = stageName;
    this.saveToStorage();
    events.emit('stage:changed', stageName);
    events.emit('state:updated', this.data);
  }

  addEggs(amount) {
    this.data.eggs = Math.max(0, this.data.eggs + amount);
    this.saveToStorage();
    events.emit('eggs:changed', this.data.eggs);
    events.emit('state:updated', this.data);
  }

  setLives(amount) {
    this.data.lives = Math.max(0, amount);
    this.saveToStorage();
    events.emit('lives:changed', this.data.lives);
    events.emit('state:updated', this.data);
  }

  toggleSound() {
    this.data.soundEnabled = !this.data.soundEnabled;
    this.saveToStorage();
    events.emit('sound:toggled', this.data.soundEnabled);
    return this.data.soundEnabled;
  }
}

export const gameState = new GameState();
