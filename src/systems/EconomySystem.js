// ===== Economy System: gold, interest, tower transactions =====
import { GAME, TOWERS } from '../utils/constants.js';

export class EconomySystem {
  constructor() {
    this.gold = GAME.STARTING_GOLD;
    this.lives = GAME.STARTING_LIVES;
    this.totalGoldEarned = 0;
    this.totalGoldSpent = 0;
  }

  canAfford(amount) {
    return this.gold >= amount;
  }

  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.gold -= amount;
    this.totalGoldSpent += amount;
    return true;
  }

  earn(amount) {
    this.gold += amount;
    this.totalGoldEarned += amount;
  }

  // Interest earned at end of wave
  applyInterest() {
    const interest = Math.floor(this.gold * GAME.INTEREST_RATE);
    this.earn(interest);
    return interest;
  }

  // Lose a life when enemy reaches crystal
  loseLife(damage) {
    this.lives = Math.max(0, this.lives - damage);
    return this.lives <= 0;
  }

  // Tower purchase
  canBuyTower(type) {
    return this.canAfford(TOWERS[type].cost);
  }

  buyTower(type) {
    return this.spend(TOWERS[type].cost);
  }

  // Tower upgrade
  canUpgradeTower(tower) {
    const cost = tower.getUpgradeCost();
    return cost !== Infinity && this.canAfford(cost);
  }

  upgradeTower(tower) {
    const cost = tower.getUpgradeCost();
    if (!this.spend(cost)) return false;
    tower.upgrade();
    return true;
  }

  // Tower sell
  sellTower(tower) {
    const value = tower.getSellValue();
    this.earn(value);
    return value;
  }

  reset() {
    this.gold = GAME.STARTING_GOLD;
    this.lives = GAME.STARTING_LIVES;
    this.totalGoldEarned = 0;
    this.totalGoldSpent = 0;
  }
}
