import { DAILY_BONUSES, COINS_PER_CREDIT, MAX_MONTHLY_CREDITS } from '../constants/mockData';

export const calculateDailyBonus = (streak) => {
  return DAILY_BONUSES[Math.min(streak - 1, DAILY_BONUSES.length - 1)];
};

export const calculateCreditsFromCoins = (coins) => {
  const credits = Math.floor(coins / COINS_PER_CREDIT);
  return Math.min(credits, MAX_MONTHLY_CREDITS);
};

export const calculateCoinsNeeded = (credits) => {
  return credits * COINS_PER_CREDIT;
};
