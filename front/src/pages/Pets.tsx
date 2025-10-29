import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Sparkles, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Pet1Img from "@/petimg/Pet1.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Pet {
  id: string;
  name: string;
  level: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  experience: number;
  is_main: boolean;
  stars: number;
  avatar_url?: string;
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
  const [newPetName, setNewPetName] = useState("");
  const [newPetRarity, setNewPetRarity] = useState<Pet["rarity"]>("common");
  const [openCreate, setOpenCreate] = useState(false);
  const [openUpgrade, setOpenUpgrade] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(false);
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

  const setMainPet = async (id: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // Set all pets to not main
    await supabase
      .from("pets")
      .update({ is_main: false })
      .eq("user_id", session.user.id);

    // Set selected pet as main
    const { error } = await supabase
      .from("pets")
      .update({ is_main: true })
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
      });
      loadPets();
    }
  };

  const createPet = async () => {
    if (!newPetName.trim()) {
      toast({
        title: "이름을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

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

    const { error: petError } = await supabase.from("pets").insert({
      user_id: session.user.id,
      name: newPetName,
      rarity: newPetRarity,
    });

    if (petError) {
      toast({
        title: "오류 발생",
        description: petError.message,
        variant: "destructive",
      });
    } else {
      await supabase
        .from("user_powder")
        .update({ amount: powder - cost })
        .eq("user_id", session.user.id);

      toast({
        title: "펫 생성 완료!",
        description: `${cost} 가루를 사용했습니다.`,
      });
      setNewPetName("");
      setNewPetRarity("common");
      setOpenCreate(false);
      loadPets();
      loadPowder();
    }

    setLoading(false);
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
              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogTrigger asChild>
                  <Button variant="hero" size="lg">
                    <Zap className="w-5 h-5" />
                    펫 생성하기
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-pixel">새로운 펫 생성</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="petName" className="font-korean">
                        펫 이름
                      </Label>
                      <Input
                        id="petName"
                        value={newPetName}
                        onChange={(e) => setNewPetName(e.target.value)}
                        placeholder="펫 이름을 입력하세요"
                      />
                    </div>
                    <div>
                      <Label htmlFor="petRarity" className="font-korean">
                        희귀도
                      </Label>
                      <Select
                        value={newPetRarity}
                        onValueChange={(value: Pet["rarity"]) => setNewPetRarity(value)}
                      >
                        <SelectTrigger id="petRarity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="epic">Epic</SelectItem>
                          <SelectItem value="legendary">Legendary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-4 bg-muted rounded-sm">
                      <p className="font-korean text-sm text-muted-foreground">
                        생성 비용: 500 가루
                      </p>
                      <p className="font-korean text-sm text-muted-foreground">
                        보유 가루: {powder}
                      </p>
                    </div>
                    <Button
                      onClick={createPet}
                      variant="hero"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "생성 중..." : "펫 생성"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                      <img
                        src={pet.avatar_url && pet.avatar_url.trim() !== "" ? pet.avatar_url : Pet1Img}
                        alt={pet.name}
                        className="w-24 h-24 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                      />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-card/90 rounded-full border border-border">
                    <span className="font-pixel text-xs">Lv.{pet.level}</span>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-korean text-lg font-bold mb-1">{pet.name}</h3>
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
                    >
                      메인 설정
                    </Button>
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
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
