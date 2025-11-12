// 강화 확률 (90 70 50 30 10)
export const UPGRADE_SUCCESS_RATES: Record<number, number> = {
    0: 90,
    1: 70,
    2: 50,
    3: 30,
    4: 10,
};

// 성공 여부 = 성? 실? 
export interface UpgradeResult {
    success: boolean;
}

// 강화 시도
export function attemptUpgrade(currentStars: number): UpgradeResult {
    const successRate = UPGRADE_SUCCESS_RATES[currentStars] || 0;
    const random = Math.random() * 100;
    const success = random < successRate;
    
    return {
        success,
    };
}

// 강화 비용
export function getUpgradeCost(currentStars: number): number {
  return (currentStars + 1) * 100;
}
