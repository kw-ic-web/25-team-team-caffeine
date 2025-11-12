import { useEffect, useState } from "react";
import { Star } from "lucide-react";

interface UpgradeAnimationProps {
    success: boolean;
    onComplete: () => void;
}

export default function UpgradeAnimation({ success, onComplete }: UpgradeAnimationProps) {
    const [show, setShow] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
        setShow(false);
        onComplete();
        }, 2500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
        <div className="relative">
            {success ? (
            // Success Animation: Star explosion + ring expansion
            <div className="relative flex items-center justify-center">
                {/* Center Star */}
                <div className="relative z-10 animate-scale-in">
                <Star className="w-32 h-32 text-warning fill-warning animate-pulse-glow" />
                </div>

            {/* Exploding Stars */}
            {[...Array(8)].map((_, i) => (
                <div
                    key={i}
                    className="absolute animate-fade-out"
                    style={{
                    animation: `explode-star-${i} 1.5s ease-out forwards`,
                    top: "50%",
                    left: "50%",
                    }}
                >
                    <Star className="w-8 h-8 text-warning fill-warning" />
                </div>
                ))}

                {/* Expanding Rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-32 h-32 rounded-full border-4 border-warning animate-ping" />
                <div 
                    className="absolute w-32 h-32 rounded-full border-2 border-warning/50"
                    style={{ animation: "expand-ring 1.5s ease-out infinite" }}
                />
                </div>

                {/* Success Text */}
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap animate-slide-up">
                <div className="font-pixel text-2xl text-warning">강화 성공!</div>
                </div>
            </div>
        ) : (
          // Failure Animation: Crack + fragment count up
            <div className="relative flex flex-col items-center justify-center gap-8">
                {/* Cracking Star */}
                <div className="relative animate-shake">
                <Star className="w-32 h-32 text-muted-foreground fill-muted" />
                
                {/* Crack Lines */}
                <svg
                    className="absolute inset-0 w-full h-full animate-fade-in"
                    style={{ animationDelay: "0.3s" }}
                >
                    <line
                    x1="50%"
                    y1="20%"
                    x2="50%"
                    y2="80%"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-destructive"
                    />
                    <line
                    x1="30%"
                    y1="30%"
                    x2="70%"
                    y2="70%"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-destructive"
                    />
                    <line
                    x1="70%"
                    y1="30%"
                    x2="30%"
                    y2="70%"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-destructive"
                    />
                </svg>
                </div>

                {/* Failure Text */}
                <div className="animate-fade-in" style={{ animationDelay: "0.7s" }}>
                <div className="font-pixel text-xl text-destructive">강화 실패</div>
                </div>
            </div>
            )}
        </div>

        <style>{`
            @keyframes explode-star-0 {
            0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(0, -120px) scale(0.5); opacity: 0; }
            }
            @keyframes explode-star-1 {
            0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(85px, -85px) scale(0.5); opacity: 0; }
            }
            @keyframes explode-star-2 {
            0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(120px, 0) scale(0.5); opacity: 0; }
            }
            @keyframes explode-star-3 {
            0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(85px, 85px) scale(0.5); opacity: 0; }
            }
            @keyframes explode-star-4 {
            0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(0, 120px) scale(0.5); opacity: 0; }
            }
            @keyframes explode-star-5 {
            0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(-85px, 85px) scale(0.5); opacity: 0; }
            }
            @keyframes explode-star-6 {
            0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(-120px, 0) scale(0.5); opacity: 0; }
            }
            @keyframes explode-star-7 {
            0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(-85px, -85px) scale(0.5); opacity: 0; }
            }
            @keyframes expand-ring {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(3); opacity: 0; }
            }
            @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            @keyframes count-up {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
            }
            .animate-shake {
            animation: shake 0.5s ease-in-out;
            }
            .animate-count-up {
            animation: count-up 0.8s ease-out;
            }
        `}</style>
        </div>
    );
    }
