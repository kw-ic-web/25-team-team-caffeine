import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Target,
  Calendar,
  Heart,
  Users,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast.ts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/lib/api";

const navItems = [
  { path: "/", icon: Home, label: "홈" },
  { path: "/goals", icon: Target, label: "목표" },
  { path: "/calendar", icon: Calendar, label: "캘린더" },
  { path: "/pets", icon: Heart, label: "펫" },
  { path: "/community", icon: Users, label: "커뮤니티" },
];

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [petsEnabled, setPetsEnabled] = useState(() => {
    const saved = localStorage.getItem("walkingPetsEnabled");
    return saved === null ? true : saved === "true";
  });

  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const { user, logout } = useAuth();

  const togglePets = () => {
    const newValue = !petsEnabled;
    setPetsEnabled(newValue);
    localStorage.setItem("walkingPetsEnabled", String(newValue));
    window.dispatchEvent(new Event("walkingPetsToggle"));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("walkingPetsEnabled");
      setPetsEnabled(saved === null ? true : saved === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("walkingPetsToggle", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("walkingPetsToggle", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isNameDialogOpen && user?.displayName) {
      setTempName(user.displayName);
    }
  }, [isNameDialogOpen, user]);

  const handleLogout = () => {
    logout();
    toast({
      title: "로그아웃 완료",
      description: "성공적으로 로그아웃되었습니다.",
    });
    navigate("/auth");
  };

  const handleSaveName = async () => {
    if (!tempName.trim() || tempName === user?.displayName) {
        setIsNameDialogOpen(false);
        return;
    }

    setIsSavingName(true);
    try {
      await usersApi.updateProfile({ display_name: tempName });
      
      toast({
        title: "닉네임 변경 완료",
        description: `앞으로 ${tempName}님이라고 부를게요!`,
      });
      
      setIsNameDialogOpen(false);
      window.location.reload(); 

    } catch (error) {
      console.error("Failed to update name:", error);
      toast({
        title: "변경 실패",
        description: "닉네임을 변경하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
        handleSaveName();
    }
  };

  const displayName = user?.displayName ?? "게스트";
  const displayInitial = displayName[0] || "?";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b-2 border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-primary rounded-sm flex items-center justify-center shadow-neon">
                  <Heart className="w-6 h-6 text-primary-foreground animate-pulse-glow" />
                </div>
                <span className="font-pixel text-sm text-primary hidden sm:inline">
                  QuestPet
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePets}
                className="flex items-center gap-1 px-2 sm:px-3"
                title={petsEnabled ? "펫 숨기기" : "펫 보이기"}
              >
                {petsEnabled ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline font-korean text-xs">
                  {petsEnabled ? "펫 끄기" : "펫 켜기"}
                </span>
              </Button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex flex-col sm:flex-row items-center gap-1 px-3 py-2 rounded-sm transition-all font-korean text-xs sm:text-sm",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-neon"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div 
                    className="flex items-center gap-2 cursor-pointer group hover:bg-muted/50 p-1 rounded transition-colors"
                    onClick={() => setIsNameDialogOpen(true)}
                    title="닉네임 변경"
                  >
                    <Avatar className="w-8 h-8 border-2 border-primary">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-pixel text-xs">
                        {displayInitial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-korean text-sm text-foreground hidden sm:inline group-hover:underline decoration-primary underline-offset-4">
                      {displayName}
                    </span>
                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-2 sm:px-3"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline font-korean text-xs">
                      로그아웃
                    </span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="flex items-center gap-1 px-2 sm:px-3"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline font-korean text-xs">
                    로그인
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] font-korean z-[100]">
          <DialogHeader>
            <DialogTitle className="font-pixel text-xl">닉네임 변경</DialogTitle>
            <DialogDescription>
                사용하실 새로운 닉네임을 입력해 주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nav-name" className="text-right">
                새 닉네임
              </Label>
              <Input
                id="nav-name"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="col-span-3"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                취소
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveName} disabled={isSavingName}>
              {isSavingName ? "변경 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}