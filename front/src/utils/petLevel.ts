// 레벨별 필요 경험치
export const EXP_REQUIRED: Record<number, number> = {
    1: 20,
    2: 40,
    3: 60,
    4: 100,
    5: 160,
    6: 260,
    7: 420,
    8: 680,
    9: 1100,
};

// 기본 보상 100가루 기준 레벨별 가루 보상 
export const LEVEL_REWARDS: Record<number, number> = {
    1: 100,
    2: 110,
    3: 130,
    4: 160,
    5: 200,
    6: 250,
    7: 310,
    8: 380,
    9: 460,
    10: 550,
};

// 레벨별 보너스 비율 
export const LEVEL_BONUS: Record<number, number> = {
    1: 0,
    2: 0.10,
    3: 0.30,
    4: 0.60,
    5: 1.00,
    6: 1.50,
    7: 2.10,
    8: 2.80,
    9: 3.60,
    10: 4.50,
};

// 도전 과제 보상에 레벨 보너스
export function calculateGaruWithLevelBonus(baseGaru: number, level: number): number {
    const clampedLevel = Math.max(1, Math.min(level, 10));
    const bonus = LEVEL_BONUS[clampedLevel] || 0;
  return Math.floor(baseGaru * (1 + bonus));
}

// 경험치 상수
export const EXP_CONSTANTS = {
    PET_CLICK: 5,
    POST_LIKE: 2,
    DAILY_CHALLENGE_LIMIT: 100,
    DAILY_FEED_LIMIT: 100,
    POST_DAILY_LIMIT: 20,
};

// 다음 레벨까지 필요한 경험치 계산
export function getExpRequiredForNextLevel(currentLevel: number): number {
    if (currentLevel >= 10) return 0;
    return EXP_REQUIRED[currentLevel] || 0;
}

// 현재 레벨 진행률 계산 (0-100)
export function getExpProgress(currentExp: number, currentLevel: number): number {
    if (currentLevel >= 10) return 100;
    const required = getExpRequiredForNextLevel(currentLevel);
    if (required === 0) return 100;
  return Math.min(100, (currentExp / required) * 100);
}

// 레벨업 체크 및 새 레벨 반환
export function checkLevelUp(currentExp: number, currentLevel: number): { newLevel: number; totalReward: number } {
    let level = currentLevel;
    let exp = currentExp;
    let totalReward = 0;

    while (level < 10) {
        const required = getExpRequiredForNextLevel(level);
        if (exp >= required) {
        exp -= required;
        level += 1;
        totalReward += LEVEL_REWARDS[level] || 0;
        } else {
        break;
        }
    }

    return { newLevel: level, totalReward };
}
