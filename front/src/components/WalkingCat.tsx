import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Pet {
  id: string;
  name: string;
  level: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface MovingPet extends Pet {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  direction: "horizontal" | "vertical" | "diagonal";
  nextDirectionChange: number;
}

const rarityGradients = {
  common: "from-muted to-muted-foreground",
  rare: "from-secondary to-secondary/70",
  epic: "from-accent to-accent/70",
  legendary: "from-warning to-warning/70",
};

export const WalkingCat = () => {
  const location = useLocation();
  const [movingPets, setMovingPets] = useState<MovingPet[]>([]);
  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem("walkingPetsEnabled");
    return saved === null ? true : saved === "true";
  });
  const [isAuthed, setIsAuthed] = useState(false);
  const isAuthRoute = location.pathname.startsWith("/auth");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session);
      if (session) {
        loadPets();
      } else {
        setMovingPets([]);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      if (session) loadPets();
      else setMovingPets([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("walkingPetsEnabled");
      setIsEnabled(saved === null ? true : saved === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("walkingPetsToggle", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("walkingPetsToggle", handleStorageChange);
    };
  }, []);

  const loadPets = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("pets")
      .select("id, name, level, rarity")
      .eq("user_id", session.user.id)
      .limit(5);

    if (data && data.length > 0) {
      const pets = data.map((pet) => {
        const x = Math.random() * (window.innerWidth - 100) + 50;
        const y = Math.random() * (window.innerHeight - 100) + 50;
        const speedX = (Math.random() - 0.5) * 4;
        const speedY = (Math.random() - 0.5) * 4;
        const nextDirectionChange = Date.now() + (3000 + Math.random() * 7000);

        return {
          ...pet,
          x,
          y,
          speedX,
          speedY,
          direction: "diagonal" as const,
          nextDirectionChange,
        } as MovingPet;
      });

      setMovingPets(pets);
    } else {
      setMovingPets([]);
    }
  };

  useEffect(() => {
    if (movingPets.length === 0 || !isEnabled || !isAuthed || isAuthRoute) return;

    const interval = setInterval(() => {
      setMovingPets((prevPets) =>
        prevPets.map((pet) => {
          const currentTime = Date.now();
          let newSpeedX = pet.speedX;
          let newSpeedY = pet.speedY;
          let newNextDirectionChange = pet.nextDirectionChange;

          if (currentTime >= pet.nextDirectionChange) {
            newSpeedX = (Math.random() - 0.5) * 4;
            newSpeedY = (Math.random() - 0.5) * 4;
            newNextDirectionChange = currentTime + (3000 + Math.random() * 7000);
          }

          let newX = pet.x + newSpeedX;
          let newY = pet.y + newSpeedY;
          const petSize = 32;
          if (newX <= 0 || newX >= window.innerWidth - petSize) {
            newSpeedX = -newSpeedX;
            newX = newX <= 0 ? 0 : window.innerWidth - petSize;
          }

          if (newY <= 0 || newY >= window.innerHeight - petSize) {
            newSpeedY = -newSpeedY;
            newY = newY <= 0 ? 0 : window.innerHeight - petSize;
          }

          return {
            ...pet,
            x: newX,
            y: newY,
            speedX: newSpeedX,
            speedY: newSpeedY,
            nextDirectionChange: newNextDirectionChange,
          };
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, [movingPets.length, isEnabled, isAuthed, isAuthRoute]);

  if (!isEnabled || !isAuthed || isAuthRoute) return null;

  return (
    <>
      {movingPets.map((pet) => (
        <div
          key={pet.id}
          className="fixed z-50 walking-cat"
          style={{ left: `${pet.x}px`, top: `${pet.y}px` }}
        >
          <div className="relative">
            <div
              className={`w-8 h-8 bg-gradient-to-br ${
                rarityGradients[pet.rarity]
              } rounded-lg flex items-center justify-center shadow-neon animate-bounce-walk`}
            >
              <Heart className="w-4 h-4 text-primary-foreground animate-pulse-glow" />
            </div>
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="bg-card border border-primary px-2 py-0.5 rounded-sm shadow-neon text-[10px] font-korean animate-fade-in">
                {pet.name}
              </div>
            </div>
            {/* Pet legs animation */}
            <div className="absolute -bottom-1 left-1 w-1 h-2 bg-primary rounded-sm animate-leg-left"></div>
            <div className="absolute -bottom-1 right-1 w-1 h-2 bg-primary rounded-sm animate-leg-right"></div>
          </div>
        </div>
      ))}
    </>
  );
};