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
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast.ts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";

const navItems = [
  { path: "/", icon: Home, label: "홈" },
  { path: "/goals", icon: Target, label: "목표" },
  { path: "/calendar", icon: Calendar, label: "캘린더" },
  { path: "/pets", icon: Heart, label: "펫" },
  { path: "/community", icon: Users, label: "커뮤니티" },
  { path: "/ranking", icon: Trophy, label: "랭킹" },
];

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [petsEnabled, setPetsEnabled] = useState(() => {
    const saved = localStorage.getItem("walkingPetsEnabled");
    return saved === null ? true : saved === "true";
  });

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

  const handleLogout = () => {
    logout();
    toast({
      title: "로그아웃 완료",
      description: "성공적으로 로그아웃되었습니다.",
    });
    navigate("/auth");
  };

  // user.displayName 없으면 "게스트"로 표시
  const displayName = user?.displayName ?? "게스트";
  const displayInitial = displayName[0] || "?";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b-2 border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 왼쪽 부분 */}
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

          {/* 가운데 부분 */}
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

          {/* 오른쪽 섹션 */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border-2 border-primary">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-pixel text-xs">
                      {displayInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-korean text-sm text-foreground hidden sm:inline">
                    {displayName}
                  </span>
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
              // 아직 로그인 안 된 경우: 로그인 버튼만 보여주고 싶으면 여기서 처리
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
  );
}
