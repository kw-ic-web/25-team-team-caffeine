import { Sparkles } from "lucide-react";

interface RewardTooltipProps {
    baseReward: number;
    bonusPercent: number;
    totalReward: number;
    show: boolean;
}

export default function RewardTooltip({ baseReward, bonusPercent, totalReward, show }: RewardTooltipProps) {
    if (!show) return null;

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-scale-in">
        <div className="bg-gradient-primary border-2 border-primary rounded-sm p-6 shadow-neon min-w-[300px]">
            <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-warning animate-pulse-glow" />
            <h3 className="font-pixel text-lg text-primary-foreground">보상 획득!</h3>
            <Sparkles className="w-6 h-6 text-warning animate-pulse-glow" />
            </div>
            
            <div className="space-y-2 font-korean text-sm text-primary-foreground/90 text-center">
            <div className="flex items-center justify-between px-4">
                <span>기본 보상:</span>
                <span className="font-pixel text-lg">{baseReward}</span>
            </div>
            <div className="flex items-center justify-between px-4">
                <span>레벨 보너스:</span>
                <span className="font-pixel text-lg text-warning">+{bonusPercent}%</span>
            </div>
            <div className="border-t border-primary-foreground/20 my-2" />
            <div className="flex items-center justify-between px-4 text-base">
                <span className="font-bold">총 획득:</span>
                <span className="font-pixel text-2xl text-warning animate-pulse-glow">{totalReward}</span>
            </div>
            </div>

            <div className="mt-4 text-center">
            <span className="font-korean text-xs text-primary-foreground/70">
                메인 펫 레벨이 높을수록 더 많은 보상!
            </span>
            </div>
        </div>
        </div>
    );
}
