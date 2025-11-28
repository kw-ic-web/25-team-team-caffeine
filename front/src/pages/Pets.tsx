import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Heart, Star, Sparkles, Zap, Edit2 } from "lucide-react";
import { Progress } from "@/components/ui/progress.tsx";
import { useToast } from "@/hooks/use-toast.ts";

import PetRevealAnimation from "@/components/PetRevealAnimation.tsx";
import { getRandomPetName } from "@/data/petNames.tsx";
import { getExpProgress, getExpRequiredForNextLevel } from "@/utils/petLevel.ts";
import {
  getUpgradeCost,
  UPGRADE_SUCCESS_RATES,
} from "@/utils/upgradeSystem.ts";

import { useAuth } from "@/contexts/AuthContext.tsx";
import { usePet } from "@/contexts/PetContext.tsx";
import {
  petsApi,
  powderApi,
  type Pet as ApiPet,
  type PetRarity,
} from "@/lib/api.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

// API에서 오는 Pet 타입을 확장 (last_main_change를 프론트에서 사용)
interface Pet extends ApiPet {
  last_main_change: string | null;
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

const attemptUpgrade = (stars: number): boolean => {
  const p = Math.max(0.1, 0.7 - stars * 0.1);
  return Math.random() < p;
};

export default function Pets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [powder, setPowder] = useState(0);
  const [openUpgrade, setOpenUpgrade] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [revealPet, setRevealPet] = useState<{
    name: string;
    rarity: PetRarity;
  } | null>(null);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editName, setEditName] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // ✅ PetContext에서 mainPet, setMainPet 가져오기
  const { setMainPet } = usePet();

  useEffect(() => {
    if (user === null) {
      toast({
        title: "로그인이 필요합니다",
        description: "로그인 후 이용해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      await Promise.all([loadPets(), loadPowder()]);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPets = async () => {
    try {
      const data = await petsApi.list();
      setPets(data as Pet[]);
    } catch (err) {
      console.error(err);
      toast({
        title: "오류 발생",
        description: "펫 정보를 불러오지 못했습니다.",
        variant: "destructive",
      });
    }
  };

  const loadPowder = async () => {
    try {
      const res = await powderApi.get();
      setPowder(res.amount);
    } catch (err) {
      console.error(err);
      toast({
        title: "오류 발생",
        description: "가루 정보를 불러오지 못했습니다.",
        variant: "destructive",
      });
    }
  };

  const canChangeMainPet = (lastChange: string | null): boolean => {
    if (!lastChange) return true;
    const now = new Date();
    const lastChangeDate = new Date(lastChange);
    const hoursSinceChange =
      (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceChange >= 24;
  };

  const getTimeUntilChange = (lastChange: string | null): string => {
    if (!lastChange) return "";
    const now = new Date();
    const lastChangeDate = new Date(lastChange);
    const hoursSinceChange =
      (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.ceil(24 - hoursSinceChange);
    if (hoursRemaining <= 0) return "";
    return `${hoursRemaining}시간`;
  };

  // ⚠️ 이름 겹치지 않게 로컬 함수 이름 변경
  const handleSetMainPet = async (id: string) => {
    if (!user) return;

    const currentMain = pets.find((p) => p.is_main);

    if (
      currentMain &&
      !canChangeMainPet((currentMain as Pet).last_main_change ?? null)
    ) {
      const timeLeft = getTimeUntilChange(
        (currentMain as Pet).last_main_change ?? null
      );
      toast({
        title: "메인 펫을 변경할 수 없습니다",
        description: `${timeLeft} 후에 다시 시도해주세요.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      if (currentMain) {
        await petsApi.update(currentMain.id, {
          is_main: false as any,
        });
      }

      await petsApi.update(id, {
        is_main: true as any,
        last_main_change: new Date().toISOString() as any,
      });

      // ✅ PetContext 쪽 메인 펫 상태도 갱신
      const newMain = pets.find((pet) => pet.id === id);
      if (newMain) {
        setMainPet(newMain as any);
      }

      toast({
        title: "메인 펫 설정 완료!",
        description: "24시간 후에 다시 변경할 수 있습니다.",
      });

      await loadPets();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "오류 발생",
        description: error.message ?? "메인 펫 설정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRarityByProbability = (): PetRarity => {
    const rand = Math.random() * 100;

    if (rand < 1) return "legendary";
    if (rand < 10) return "epic";
    if (rand < 32) return "rare";
    return "common";
  };

  // (지금은 안 쓰이고 있어서 냅둬도 되고, 경고 뜨면 삭제해도 됨)
  const getPetImage = (pet: Pet): string => {
    let imagePrefix = "hat_";
    if (pet.stars === 3) {
      imagePrefix = "laptop_";
    } else if (pet.stars === 5) {
      imagePrefix = "worker_";
    }
    return `/petimg/${imagePrefix}${pet.name.toLowerCase()}.png`;
  };

  const PetComponent = () => {
    const [currentPet, setCurrentPet] = useState<Pet>(pets[0]);
    return (
      <div>
        <img src={getPetImage(currentPet)} alt={currentPet.name} className="pet-image" />
        <button onClick={() => setCurrentPet(pets[1])}>Change Pet</button>
      </div>
    );
  };

  const createPet = async () => {
    const cost = 500;
    if (powder < cost) {
      toast({
        title: "가루가 부족합니다",
        description: `${cost} 가루가 필요합니다.`,
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "로그인 후 이용해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

  const hatImages = [
    "bear",
    "cat",
    "dog",
    "fox",
    "hedgehog",
    "koala",
    "otter",
    "panda",
    "quokka",
    "rabbit",
  ];

    const randomAnimal = hatImages[Math.floor(Math.random() * hatImages.length)];
    const avatarUrl = `/petimg/hat_${randomAnimal}.png`; 
    const rarity = getRarityByProbability();
    const name = getRandomPetName();

    setLoading(true);



    try {
      await petsApi.create({ name, rarity, avatar_url: avatarUrl });
      const res = await powderApi.update(-cost);
      setPowder(res.amount);

      setRevealPet({ name, rarity });
      setShowReveal(true);

      await loadPets();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "오류 발생",
        description: error.message ?? "펫 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevealComplete = () => {
    setShowReveal(false);
    setRevealPet(null);
  };

  const updatePetName = async () => {
    if (!editingPet || !editName.trim()) return;

    try {
      await petsApi.update(editingPet.id, { name: editName });
      toast({ title: "이름 변경 완료!" });
      setEditingPet(null);
      setEditName("");
      await loadPets();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "오류 발생",
        description: error.message ?? "이름 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const upgradePet = async () => {
    if (!selectedPet) return;
    if (!user) return;

    const cost = getUpgradeCost(selectedPet.stars);

    if (powder < cost) {
      toast({
        title: "가루가 부족합니다",
        description: `${cost} 가루가 필요합니다.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const res = await powderApi.update(-cost);
      setPowder(res.amount);

      const success = attemptUpgrade(selectedPet.stars);

      if (success) {
        await petsApi.update(selectedPet.id, {
          stars: selectedPet.stars + 1,
        } as any);

        toast({
          title: "강화 성공!",
          description: `${selectedPet.name}이(가) ★${
            selectedPet.stars + 1
          }로 강화되었습니다!`,
        });
      } else {
        toast({
          title: "강화 실패",
          description: "아쉽게도 실패했습니다.",
          variant: "destructive",
        });
      }

      setSelectedPet(null);
      await loadPets();
      await loadPowder();
    } catch (error) {
      console.error("Upgrade error:", error);
      toast({
        title: "오류 발생",
        description: "강화 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-pixel text-2xl sm:text-3xl mb-4 text-foreground">
            나의 펫
          </h1>

          <Card className="bg-gradient-primary border-2 border-primary shadow-neon mb-6">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-warning rounded-lg flex items-center justify-center animate-pulse-glow">
                  <Sparkles className="w-8 h-8 text-warning-foreground" />
                </div>
                <div>
                  <div className="font-korean text-sm text-primary-foreground/80">
                    보유 가루
                  </div>
                  <div className="font-pixel text-2xl text-primary-foreground">
                    {powder}
                  </div>
                </div>
              </div>
              <Button
                variant="hero"
                size="lg"
                onClick={createPet}
                disabled={loading}
              >
                <Zap className="w-5 h-5" />
                {loading ? "생성 중..." : "펫 생성하기"}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mb-4">
            <div className="font-korean text-muted-foreground">
              총{" "}
              <span className="text-foreground font-bold">{pets.length}</span>
              마리의 펫을 보유하고 있습니다
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet, index) => (
            <Card
              key={pet.id}
              className={cn(
                "relative overflow-hidden border-2 transition-all shadow-card hover:shadow-neon animate-slide-up",
                rarityColors[pet.rarity],
                pet.is_main &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {pet.is_main && (
                <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-primary rounded-sm">
                  <span className="font-pixel text-xs text-primary-foreground">
                    MAIN
                  </span>
                </div>
              )}

              <div className="absolute top-2 right-2 z-10 flex gap-0.5">
                {Array.from({ length: pet.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-warning fill-warning animate-pulse-glow"
                  />
                ))}
              </div>

              <div
                className={cn(
                  "h-48 bg-gradient-to-br flex items-center justify-center",
                  rarityBg[pet.rarity]
                )}
              >
                <div className="relative">
                  <div className="w-32 h-32 bg-gradient-primary rounded-full flex items-center justify-center shadow-neon animate-float">
                    <Heart className="w-16 h-16 text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-card/90 rounded-full border border-border">
                    <span className="font-pixel text-xs">Lv.{pet.level}</span>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-korean text-lg font-bold">
                      {pet.name}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingPet(pet);
                        setEditName(pet.name);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div
                    className={cn(
                      "font-korean text-xs capitalize",
                      rarityColors[pet.rarity]
                    )}
                  >
                    {pet.rarity}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-korean text-muted-foreground">
                    <span>경험치</span>
                    <span>
                      {pet.experience} /{" "}
                      {getExpRequiredForNextLevel(pet.level) || "MAX"}
                    </span>
                  </div>
                  <Progress
                    value={getExpProgress(pet.experience, pet.level)}
                    className="h-2"
                  />
                </div>

                <div className="flex gap-2">
                  {!pet.is_main && (
                    <Button
                      variant="neon"
                      size="sm"
                      onClick={() => handleSetMainPet(pet.id)}
                      className="flex-1"
                      disabled={pets.some(
                        (p) =>
                          p.is_main &&
                          !canChangeMainPet(
                            (p as Pet).last_main_change ?? null
                          )
                      )}
                    >
                      메인 설정
                    </Button>
                  )}
                  {pet.is_main &&
                    !canChangeMainPet((pet as Pet).last_main_change ?? null) && (
                      <div className="flex-1 text-center py-2">
                        <p className="font-korean text-xs text-muted-foreground">
                          {getTimeUntilChange(
                            (pet as Pet).last_main_change ?? null
                          )}{" "}
                          후 변경 가능
                        </p>
                      </div>
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedPet(pet);
                      setOpenUpgrade(true);
                    }}
                  >
                    <Star className="w-4 h-4" />
                    강화
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-12 bg-card/50 border-2 border-border">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="inline-flex w-20 h-20 bg-gradient-secondary rounded-lg items-center justify-center shadow-neon animate-float">
                <Sparkles className="w-10 h-10 text-secondary-foreground" />
              </div>
              <h3 className="font-pixel text-xl text-foreground">
                펫 강화 시스템
              </h3>
              <p className="font-korean text-sm text-muted-foreground max-w-md mx-auto">
                가루를 사용해 펫을 강화하세요!
                <br />
                강화할수록 더 많은 가루가 필요합니다.
              </p>
              <div className="flex flex-wrap gap-4 justify-center pt-4">
                <div className="text-center">
                  <div className="font-pixel text-2xl text-warning">★</div>
                  <div className="font-korean text-xs text-muted-foreground">
                    100 가루
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-pixel text-2xl text-warning">★★</div>
                  <div className="font-korean text-xs text-muted-foreground">
                    200 가루
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-pixel text-2xl text-warning">★★★</div>
                  <div className="font-korean text-xs text-muted-foreground">
                    300 가루
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={openUpgrade} onOpenChange={setOpenUpgrade}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-pixel">펫 강화</DialogTitle>
            </DialogHeader>
            {selectedPet && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-korean text-lg font-bold mb-2">
                    {selectedPet.name}
                  </h3>
                  <div className="flex justify-center gap-1 mb-4">
                    {Array.from({ length: selectedPet.stars }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 text-warning fill-warning"
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-sm space-y-2">
                  <p className="font-korean text-sm text-muted-foreground">
                    현재 강화 단계: {selectedPet.stars}★
                  </p>
                  <p className="font-korean text-sm text-foreground font-bold">
                    강화 성공 확률:{" "}
                    {UPGRADE_SUCCESS_RATES[selectedPet.stars] || 0}%
                  </p>
                  <p className="font-korean text-sm text-muted-foreground">
                    실패 시: 별 조각 +1
                  </p>
                </div>

                <div className="p-4 bg-card/50 rounded-sm border-2 border-border space-y-2">
                  <h4 className="font-pixel text-sm text-foreground">
                    일반 강화
                  </h4>
                  <p className="font-korean text-sm text-muted-foreground">
                    비용: {getUpgradeCost(selectedPet.stars)} 가루
                  </p>
                  <p className="font-korean text-sm text-muted-foreground">
                    보유: {powder} 가루
                  </p>
                  <Button
                    onClick={upgradePet}
                    variant="default"
                    className="w-full"
                    disabled={
                      loading || powder < getUpgradeCost(selectedPet.stars)
                    }
                  >
                    {loading ? "강화 중..." : "일반 강화"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={editingPet !== null}
          onOpenChange={(open) => !open && setEditingPet(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-pixel">펫 이름 변경</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="새로운 이름을 입력하세요"
              />
              <Button onClick={updatePetName} variant="hero" className="w-full">
                이름 변경
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {showReveal && revealPet && (
          <PetRevealAnimation
            petName={revealPet.name}
            rarity={revealPet.rarity}
            onComplete={handleRevealComplete}
          />
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}