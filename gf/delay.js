function getHumanDelay() {
  const rand = Math.random();
  if (rand < 0.05) return randBetween(4000, 6000);      // -3，5%
  if (rand < 0.35) return randBetween(2000, 4000);      // -2~0，30%
  if (rand < 0.85) return randBetween(1000, 3000);      // 0~2，50%
  return 0;                                             // 3，15%
}
