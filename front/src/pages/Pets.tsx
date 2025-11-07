import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Heart, Star, Sparkles, Zap, Edit2 } from "lucide-react";
import { Progress } from "@/components/ui/progress.tsx";
import { supabase } from "@/integrations/supabase/client.ts";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import PetRevealAnimation from "@/components/PetRevealAnimation.tsx";
import { getRandomPetName } from "@/data/petNames.tsx";

interface Pet {
  id: string;
  name: string;
  level: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  experience: number;
  is_main: boolean;
  stars: number;
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

export default function Pets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [powder, setPowder] = useState(0);
  const [openUpgrade, setOpenUpgrade] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [revealPet, setRevealPet] = useState<{ name: string; rarity: Pet["rarity"] } | null>(null);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editName, setEditName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadPets();
    loadPowder();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "로그인이 필요합니다",
        description: "로그인 후 이용해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
    }
  };

  const loadPets = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("pets")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setPets(data as Pet[]);
    }
  };

  const loadPowder = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("user_powder")
      .select("amount")
      .eq("user_id", session.user.id)
      .single();

    if (data) {
      setPowder(data.amount);
    }
  };

  const canChangeMainPet = (lastChange: string | null): boolean => {
    if (!lastChange) return true;
    
    const now = new Date();
    const lastChangeDate = new Date(lastChange);
    const hoursSinceChange = (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceChange >= 24;
  };

  const getTimeUntilChange = (lastChange: string | null): string => {
    if (!lastChange) return "";
    
    const now = new Date();
    const lastChangeDate = new Date(lastChange);
    const hoursSinceChange = (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.ceil(24 - hoursSinceChange);
    
    if (hoursRemaining <= 0) return "";
    return `${hoursRemaining}시간`;
  };

  const setMainPet = async (id: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data: currentMainPet } = await supabase
      .from("pets")
      .select("last_main_change")
      .eq("user_id", session.user.id)
      .eq("is_main", true)
      .maybeSingle();


    if (currentMainPet && !canChangeMainPet(currentMainPet.last_main_change)) {
      const timeLeft = getTimeUntilChange(currentMainPet.last_main_change);
      toast({
        title: "메인 펫을 변경할 수 없습니다",
        description: `${timeLeft} 후에 다시 시도해주세요.`,
        variant: "destructive",
      });
      return;
    }

    await supabase
      .from("pets")
      .update({ is_main: false })
      .eq("user_id", session.user.id);

    const { error } = await supabase
      .from("pets")
      .update({ 
        is_main: true,
        last_main_change: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "메인 펫 설정 완료!",
        description: "24시간 후에 다시 변경할 수 있습니다.",
      });
      loadPets();
    }
  };

  const getRarityByProbability = (): Pet["rarity"] => {
    const rand = Math.random() * 100;
    
    if (rand < 1) return "legendary";
    if (rand < 10) return "epic";
    if (rand < 32) return "rare";
    return "common"; 
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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setLoading(true);

    const rarity = getRarityByProbability();
    const name = getRandomPetName();

    const { error: petError } = await supabase.from("pets").insert({
      user_id: session.user.id,
      name: name,
      rarity: rarity,
    });

    if (petError) {
      toast({
        title: "오류 발생",
        description: petError.message,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      await supabase
        .from("user_powder")
        .update({ amount: powder - cost })
        .eq("user_id", session.user.id);

      setRevealPet({ name, rarity });
      setShowReveal(true);
      
      loadPowder();
    }

    setLoading(false);
  };

  const handleRevealComplete = () => {
    setShowReveal(false);
    setRevealPet(null);
    loadPets();
  };

  const updatePetName = async () => {
    if (!editingPet || !editName.trim()) return;

    const { error } = await supabase
      .from("pets")
      .update({ name: editName })
      .eq("id", editingPet.id);

    if (error) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "이름 변경 완료!",
      });
      setEditingPet(null);
      setEditName("");
      loadPets();
    }
  };

  const upgradePet = async () => {
    if (!selectedPet) return;

    const cost = (selectedPet.stars + 1) * 100;
    if (powder < cost) {
      toast({
        title: "가루가 부족합니다",
        description: `${cost} 가루가 필요합니다.`,
        variant: "destructive",
      });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setLoading(true);

    const { error } = await supabase
      .from("pets")
      .update({ stars: selectedPet.stars + 1 })
      .eq("id", selectedPet.id);

    if (error) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await supabase
        .from("user_powder")
        .update({ amount: powder - cost })
        .eq("user_id", session.user.id);

      toast({
        title: "강화 완료!",
        description: `${cost} 가루를 사용했습니다.`,
      });
      setOpenUpgrade(false);
      setSelectedPet(null);
      loadPets();
      loadPowder();
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-pixel text-2xl sm:text-3xl mb-4 text-foreground">나의 펫</h1>

          <Card className="bg-gradient-primary border-2 border-primary shadow-neon mb-6">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-warning rounded-lg flex items-center justify-center animate-pulse-glow">
                  <Sparkles className="w-8 h-8 text-warning-foreground" />
                </div>
                <div>
                  <div className="font-korean text-sm text-primary-foreground/80">보유 가루</div>
                  <div className="font-pixel text-2xl text-primary-foreground">{powder}</div>
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
              총 <span className="text-foreground font-bold">{pets.length}</span>마리의 펫을 보유하고 있습니다
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
                pet.is_main && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {pet.is_main && (
                <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-primary rounded-sm">
                  <span className="font-pixel text-xs text-primary-foreground">MAIN</span>
                </div>
              )}

              <div className="absolute top-2 right-2 z-10 flex gap-0.5">
                {Array.from({ length: pet.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-warning fill-warning animate-pulse-glow" />
                ))}
              </div>

              <div className={cn("h-48 bg-gradient-to-br flex items-center justify-center", rarityBg[pet.rarity])}>
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
                    <h3 className="font-korean text-lg font-bold">{pet.name}</h3>
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
                  <div className={cn("font-korean text-xs capitalize", rarityColors[pet.rarity])}>
                    {pet.rarity}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-korean text-muted-foreground">
                    <span>경험치</span>
                    <span>{pet.experience}%</span>
                  </div>
                  <Progress value={pet.experience} className="h-2" />
                </div>

                <div className="flex gap-2">
                  {!pet.is_main && (
                    <Button
                      variant="neon"
                      size="sm"
                      onClick={() => setMainPet(pet.id)}
                      className="flex-1"
                      disabled={pets.some(p => p.is_main && !canChangeMainPet(p.last_main_change))}
                    >
                      메인 설정
                    </Button>
                  )}
                  {pet.is_main && !canChangeMainPet(pet.last_main_change) && (
                    <div className="flex-1 text-center py-2">
                      <p className="font-korean text-xs text-muted-foreground">
                        {getTimeUntilChange(pet.last_main_change)} 후 변경 가능
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
              <h3 className="font-pixel text-xl text-foreground">펫 강화 시스템</h3>
              <p className="font-korean text-sm text-muted-foreground max-w-md mx-auto">
                가루를 사용해 펫을 강화하세요!<br />
                강화할수록 더 많은 가루가 필요합니다.
              </p>
              <div className="flex flex-wrap gap-4 justify-center pt-4">
                <div className="text-center">
                  <div className="font-pixel text-2xl text-warning">★</div>
                  <div className="font-korean text-xs text-muted-foreground">100 가루</div>
                </div>
                <div className="text-center">
                  <div className="font-pixel text-2xl text-warning">★★</div>
                  <div className="font-korean text-xs text-muted-foreground">200 가루</div>
                </div>
                <div className="text-center">
                  <div className="font-pixel text-2xl text-warning">★★★</div>
                  <div className="font-korean text-xs text-muted-foreground">300 가루</div>
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
                  <h3 className="font-korean text-lg font-bold mb-2">{selectedPet.name}</h3>
                  <div className="flex justify-center gap-1 mb-4">
                    {Array.from({ length: selectedPet.stars }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-warning fill-warning" />
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-sm space-y-2">
                  <p className="font-korean text-sm text-muted-foreground">
                    현재 강화 단계: {selectedPet.stars}★
                  </p>
                  <p className="font-korean text-sm text-muted-foreground">
                    강화 비용: {(selectedPet.stars + 1) * 100} 가루
                  </p>
                  <p className="font-korean text-sm text-muted-foreground">
                    보유 가루: {powder}
                  </p>
                </div>
                <Button
                  onClick={upgradePet}
                  variant="hero"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "강화 중..." : "강화하기"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={editingPet !== null} onOpenChange={(open) => !open && setEditingPet(null)}>
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
              <Button
                onClick={updatePetName}
                variant="hero"
                className="w-full"
              >
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
