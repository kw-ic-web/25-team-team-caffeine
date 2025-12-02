import { useState, useEffect } from "react";
import { Heart, Sparkles, Star, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";

interface PetRevealAnimationProps {
    petName: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    onComplete: () => void;
    imageUrl?: string; // ✅ 펫 이미지 경로 (선택)
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

const rarityParticleCount = {
    common: 4,
    rare: 3,
    epic: 2,
    legendary: 1,
};

const rarityGlowColor = {
    common: "rgba(var(--muted), 0.5)",
    rare: "rgba(var(--secondary), 0.8)",
    epic: "rgba(var(--accent), 1)",
    legendary: "rgba(var(--warning), 1.2)",
};

export default function PetRevealAnimation({
    petName,
    rarity,
    onComplete,
    imageUrl,
}: PetRevealAnimationProps) {

    const [stage, setStage] = useState<"box" | "opening" | "reveal">("box");

    useEffect(() => {
    const boxTimer = setTimeout(() => {
    setStage("opening");
    }, 1000);

    const openingTimer = setTimeout(() => {
        setStage("reveal");
    }, 2500);

    const completeTimer = setTimeout(() => {
        onComplete();
    }, 5500);

    return () => {
        clearTimeout(boxTimer);
        clearTimeout(openingTimer);
        clearTimeout(completeTimer);
    };}, [onComplete]);

return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
        
        <div
            className="absolute inset-0 backdrop-blur-sm bg-background/80"
            style={{ filter: "grayscale(100%)" }}
        />
        <div className="relative z-10">
            {/* 1단계: 박스 */}
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

            {/* 2단계: 박스 오픈 + 희귀도 연출 */}
            {stage === "opening" && (
            <div className="animate-in zoom-in-50 duration-700">
                <div className="relative">
                {rarity === "common" && (
                    <div className="w-64 h-64 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border-4 border-muted shadow-[0_0_50px_rgba(var(--muted),0.3)] flex items-center justify-center">
                    <Sparkles className="w-32 h-32 text-muted-foreground animate-pulse" />
                    </div>
                )}

                {rarity === "rare" && (
                    <div className="w-64 h-64 bg-gradient-to-br from-secondary/50 to-secondary/20 rounded-lg border-4 border-secondary shadow-[0_0_70px_rgba(var(--secondary),0.6)] flex items-center justify-center animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-[spin_2s_linear_infinite]" />
                    <Sparkles className="w-36 h-36 text-secondary animate-spin" />
                    </div>
                )}

                {rarity === "epic" && (
                    <div className="w-64 h-64 bg-gradient-to-br from-accent/60 to-accent/30 rounded-lg border-4 border-accent shadow-[0_0_90px_rgba(var(--accent),0.9)] flex items-center justify-center animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-[spin_1.5s_linear_infinite]" />
                    <div className="absolute inset-0 rounded-lg border-4 border-accent/50 animate-ping" />
                    <Star className="w-40 h-40 text-accent animate-spin" />
                    </div>
                )}

                {rarity === "legendary" && (
                    <div className="w-64 h-64 bg-gradient-to-br from-warning/70 to-warning/40 rounded-lg border-4 border-warning shadow-[0_0_120px_rgba(var(--warning),1.2)] flex items-center justify-center animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent animate-[spin_1s_linear_infinite]" />
                    <div className="absolute inset-0 rounded-lg border-4 border-warning/70 animate-ping" />
                    <div
                        className="absolute inset-0 rounded-lg border-2 border-warning/40 animate-ping"
                        style={{ animationDelay: "0.3s" }}
                    />
                    <Zap className="w-44 h-44 text-warning animate-spin" />
                    </div>
                )}

                {/* 희귀도별 파티클 */}
                {[...Array(rarityParticleCount[rarity])].map((_, i) => {
                    const particleColor =
                    rarity === "legendary"
                        ? "bg-warning"
                        : rarity === "epic"
                        ? "bg-accent"
                        : rarity === "rare"
                        ? "bg-secondary"
                        : "bg-muted-foreground";
                    return (
                    <div
                        key={i}
                        className={`absolute top-1/2 left-1/2 w-3 h-3 ${particleColor} rounded-full animate-ping`}
                        style={{
                        transform: `rotate(${
                            i * (360 / rarityParticleCount[rarity])
                        }deg) translateY(-${
                            120 + (rarity === "legendary" ? 30 : 0)
                        }px)`,
                        animationDelay: `${
                            i * (1000 / rarityParticleCount[rarity])
                        }ms`,
                        }}
                    />
                    );
                })}

                {/* 레전더리 추가 스타 연출 */}
                {rarity === "legendary" && (
                    <>
                    {[...Array(4)].map((_, i) => (
                        <Star
                        key={`star-${i}`}
                        className="absolute top-1/2 left-1/2 w-8 h-8 text-warning fill-warning animate-ping"
                        style={{
                            transform: `rotate(${i * 90 + 45}deg) translateY(-180px)`,
                            animationDelay: `${i * 200}ms`,
                        }}
                        />
                    ))}
                    </>
                )}
                </div>
            </div>
            )}

            {/* 3단계: 실제 펫 공개 */}
            {stage === "reveal" && (
            <div className="animate-in zoom-in duration-1000">
                <Card
                className={`w-80 border-4 ${rarityColors[rarity]}`}
                style={{ boxShadow: `0 0 80px ${rarityGlowColor[rarity]}` }}
                >
                <div
                    className={`h-64 bg-gradient-to-br flex items-center justify-center ${rarityBg[rarity]} relative overflow-hidden`}
                >
                    {/* 스윽 지나가는 하이라이트 */}
                    <div
                    className={`absolute inset-0 bg-gradient-to-tr from-transparent to-transparent animate-[slide-in-right_2s_ease-in-out_infinite] ${
                        rarity === "legendary"
                        ? "via-white/30"
                        : rarity === "epic"
                        ? "via-white/20"
                        : rarity === "rare"
                        ? "via-white/15"
                        : "via-white/10"
                    }`}
                    />

                    {/* 에픽 / 레전더리 파티클 */}
                    {(rarity === "epic" || rarity === "legendary") && (
                    <>
                        {[...Array(rarity === "legendary" ? 12 : 6)].map((_, i) => (
                        <div
                            key={`float-${i}`}
                            className={`absolute w-2 h-2 rounded-full ${
                            rarity === "legendary"
                                ? "bg-warning"
                                : "bg-accent"
                            } animate-float opacity-60`}
                            style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${
                                3 + Math.random() * 2
                            }s`,
                            }}
                        />
                        ))}
                    </>
                    )}

                    {/* 중앙 펫 이미지 / 기본 하트 */}
                    <div className="relative">
                    <div
                        className={`w-40 h-40 bg-gradient-primary rounded-full flex items-center justify-center animate-float ${
                        rarity === "legendary"
                            ? "shadow-[0_0_60px_rgba(var(--warning),0.8)]"
                            : rarity === "epic"
                            ? "shadow-[0_0_40px_rgba(var(--accent),0.6)]"
                            : rarity === "rare"
                            ? "shadow-[0_0_30px_rgba(var(--secondary),0.4)]"
                            : "shadow-neon"
                        } overflow-hidden`}
                    >
                        {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={petName}
                            className="w-full h-full object-contain"
                        />
                        ) : (
                        <Heart className="w-20 h-20 text-primary-foreground" />
                        )}
                    </div>

                    {rarity === "legendary" && (
                        <>
                        <div className="absolute inset-0 rounded-full border-4 border-warning/50 animate-ping" />
                        <div
                            className="absolute inset-0 rounded-full border-2 border-warning/30 animate-ping"
                            style={{ animationDelay: "0.5s" }}
                        />
                        </>
                    )}
                    </div>
                </div>

                <CardContent className="p-6 space-y-4 text-center bg-card">
                    <div>
                    <div
                        className={`font-pixel text-sm mb-2 uppercase ${
                        rarityColors[rarity]
                        } ${
                        rarity === "legendary" ? "animate-pulse-glow" : ""
                        }`}
                    >
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
