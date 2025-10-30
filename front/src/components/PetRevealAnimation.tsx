import { useState, useEffect } from "react";
import { Heart, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";

interface PetRevealAnimationProps {
    petName: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    onComplete: () => void;
}

const rarityColors = {
    common: "text-muted-foreground border-muted",
    rare: "text-secondary border-secondary",
    epic: "text-accent border-accent",
    legendary: "text-warning border-warning",
};

const rarityBg = {
    common: "from-muted/20 to-muted/5",
    rare: "from-secondary/20 to-secondary/5",
    epic: "from-accent/20 to-accent/5",
    legendary: "from-warning/20 to-warning/5",
};

const rarityText = {
    common: "커먼",
    rare: "레어",
    epic: "에픽",
    legendary: "레전더리",
};

export default function PetRevealAnimation({ petName, rarity, onComplete }: PetRevealAnimationProps) {
    const [stage, setStage] = useState<"box" | "opening" | "reveal">("box");

    useEffect(() => {
    // Box stage: 1초
    const boxTimer = setTimeout(() => {
        setStage("opening");
    }, 1000);

    // Opening stage: 1.5초
    const openingTimer = setTimeout(() => {
        setStage("reveal");
    }, 2500);

    // Auto close after reveal: 3초
    const completeTimer = setTimeout(() => {
        onComplete();
    }, 5500);

    return () => {
        clearTimeout(boxTimer);
        clearTimeout(openingTimer);
        clearTimeout(completeTimer);
    };
    }, [onComplete]);

    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Grayscale background overlay */}
        <div className="absolute inset-0 backdrop-blur-sm bg-background/80" style={{ filter: "grayscale(100%)" }} />
        
      {/* Content */}
        <div className="relative z-10">
        {stage === "box" && (
            <div className="animate-in zoom-in duration-500">
                <div className="relative">
                <div className="w-64 h-64 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-lg border-4 border-primary shadow-[0_0_50px_rgba(var(--primary),0.5)] flex items-center justify-center">
                    <Sparkles className="w-32 h-32 text-primary animate-pulse" />
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-warning rounded-full animate-bounce shadow-neon" />
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-secondary rounded-full animate-bounce [animation-delay:200ms] shadow-neon" />
                </div>
            </div>
            )}

            {stage === "opening" && (
            <div className="animate-in zoom-in-50 duration-700">
                <div className="relative">
                <div className="w-64 h-64 bg-gradient-to-br from-warning/50 to-accent/50 rounded-lg border-4 border-warning shadow-[0_0_100px_rgba(var(--warning),0.8)] flex items-center justify-center animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-[spin_2s_linear_infinite]" />
                    <Sparkles className="w-40 h-40 text-warning animate-spin" />
                </div>
                {[...Array(8)].map((_, i) => (
                    <div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-4 h-4 bg-warning rounded-full animate-ping"
                    style={{
                        transform: `rotate(${i * 45}deg) translateY(-150px)`,
                        animationDelay: `${i * 100}ms`,
                    }}
                    />
                ))}
                </div>
            </div>
            )}

            {stage === "reveal" && (
            <div className="animate-in zoom-in duration-1000">
                <Card className={`w-80 border-4 shadow-[0_0_80px] ${rarityColors[rarity]}`}>
                <div className={`h-64 bg-gradient-to-br flex items-center justify-center ${rarityBg[rarity]} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-[slide-in-right_2s_ease-in-out_infinite]" />
                    <div className="relative">
                    <div className="w-40 h-40 bg-gradient-primary rounded-full flex items-center justify-center shadow-neon animate-float">
                        <Heart className="w-20 h-20 text-primary-foreground" />
                    </div>
                    </div>
                </div>
                <CardContent className="p-6 space-y-4 text-center bg-card">
                    <div>
                    <div className={`font-pixel text-sm mb-2 uppercase ${rarityColors[rarity]}`}>
                        {rarityText[rarity]}
                    </div>
                    <h2 className="font-korean text-2xl font-bold animate-in slide-in-from-bottom duration-500">
                        {petName}
                    </h2>
                    </div>
                    <div className="font-korean text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500">
                    새로운 펫을 획득했습니다!
                    </div>
                </CardContent>
                </Card>
            </div>
            )}
        </div>
        </div>
    );
    }
