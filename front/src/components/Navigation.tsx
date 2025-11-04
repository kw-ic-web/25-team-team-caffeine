import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Target, Calendar, Heart, Users, Eye, EyeOff, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const [userProfile, setUserProfile] = useState<{ display_name: string } | null>(null);

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
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", session.user.id)
          .single();
        
        if (data) {
          setUserProfile(data);
        }
      }
    };

    fetchUserProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile();
        }, 0);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "로그아웃 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다.",
      });
      navigate("/auth");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b-2 border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo and Pet Toggle */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-primary rounded-sm flex items-center justify-center shadow-neon">
                <Heart className="w-6 h-6 text-primary-foreground animate-pulse-glow" />
              </div>
              <span className="font-pixel text-sm text-primary hidden sm:inline">QuestPet</span>
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

          {/* Center Section - Navigation Items */}
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

          {/* Right Section - User Info and Logout */}
          <div className="flex items-center gap-2">
            {userProfile && (
              <>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border-2 border-primary">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-pixel text-xs">
                      {userProfile.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-korean text-sm text-foreground hidden sm:inline">
                    {userProfile.display_name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 sm:px-3"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline font-korean text-xs">로그아웃</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
