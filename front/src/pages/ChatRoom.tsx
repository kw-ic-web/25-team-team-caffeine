import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { petsApi } from "@/lib/api";

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    display_name: string;
  };
}

interface Participant {
  id: string;
  user_id: string;
  profiles?: {
    display_name: string;
  };
  pets?: {
    id: string;
    name: string;
    level: number;
    rarity: "common" | "rare" | "epic" | "legendary";
  };
}

interface MovingPet {
  id: string;
  name: string;
  level: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  x: number;
  y: number;
  speedX: number;
  speedY: number;
}

const rarityGradients = {
  common: "from-muted to-muted-foreground",
  rare: "from-secondary to-secondary/70",
  epic: "from-accent to-accent/70",
  legendary: "from-warning to-warning/70",
};

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [movingPets, setMovingPets] = useState<MovingPet[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const nowISO = () => new Date().toISOString();
  const storageKey = `chat_messages_${roomId}`;

  // 채팅방 입장 시: 걷는 펫 끄기 + 초기화
  useEffect(() => {
    const previousState = localStorage.getItem("walkingPetsEnabled");
    localStorage.setItem("walkingPetsEnabled", "false");
    window.dispatchEvent(new Event("walkingPetsToggle"));

    initializeRoom();

    return () => {
      localStorage.setItem("walkingPetsEnabled", previousState || "true");
      window.dispatchEvent(new Event("walkingPetsToggle"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

  // 새 메시지 오면 스크롤 맨 아래로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 펫 움직임 애니메이션
  useEffect(() => {
    if (movingPets.length === 0 || !chatContainerRef.current) return;

    const interval = setInterval(() => {
      setMovingPets((prevPets) =>
        prevPets.map((pet) => {
          let newX = pet.x + pet.speedX;
          let newY = pet.y + pet.speedY;

          const containerRect = chatContainerRef.current?.getBoundingClientRect();
          if (!containerRect) return pet;

          const petSize = 32;
          const maxX = containerRect.width - petSize;
          const maxY = containerRect.height - petSize;

          if (newX <= 0 || newX >= maxX) {
            pet = { ...pet, speedX: -pet.speedX };
            newX = newX <= 0 ? 0 : maxX;
          }

          if (newY <= 0 || newY >= maxY) {
            pet = { ...pet, speedY: -pet.speedY };
            newY = newY <= 0 ? 0 : maxY;
          }

          return {
            ...pet,
            x: newX,
            y: newY,
          };
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, [movingPets.length]);

  const initializeRoom = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setCurrentUserId(user.id);

    await loadMessages(user);
    await loadParticipants(user);
  };

  const loadMessages = async (currentUser: { id: string; displayName?: string | null }) => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setMessages([]);
        return;
      }
      const parsed: Message[] = JSON.parse(raw);

      // display_name이 없는 메시지는 현재 유저 이름으로 채워줌
      const enriched = parsed.map((m) => ({
        ...m,
        profiles: m.profiles ?? { display_name: currentUser.displayName ?? "모험가" },
      }));

      setMessages(enriched);
    } catch (err) {
      console.error("failed to load messages from localStorage", err);
      setMessages([]);
    }
  };

  const loadParticipants = async (currentUser: { id: string; displayName?: string | null }) => {
    try {
      // 현재는 "나 혼자" + 내 메인 펫만 참가자로 표시
      const pets = await petsApi.list();
      const mainPet = pets.find((p) => p.is_main);

      const baseParticipant: Participant = {
        id: currentUser.id,
        user_id: currentUser.id,
        profiles: { display_name: currentUser.displayName ?? "모험가" },
        pets: mainPet
          ? {
              id: mainPet.id,
              name: mainPet.name,
              level: mainPet.level,
              rarity: mainPet.rarity as "common" | "rare" | "epic" | "legendary",
            }
          : undefined,
      };

      setParticipants([baseParticipant]);

      if (chatContainerRef.current && mainPet) {
        const containerRect = chatContainerRef.current.getBoundingClientRect();
        const x = Math.random() * (containerRect.width - 100) + 50;
        const y = Math.random() * (containerRect.height - 100) + 50;
        const speedX = (Math.random() - 0.5) * 3;
        const speedY = (Math.random() - 0.5) * 3;

        setMovingPets([
          {
            id: mainPet.id,
            name: mainPet.name,
            level: mainPet.level,
            rarity: mainPet.rarity as "common" | "rare" | "epic" | "legendary",
            x,
            y,
            speedX,
            speedY,
          },
        ]);
      } else {
        setMovingPets([]);
      }
    } catch (err) {
      console.error("failed to load participants / pets", err);
      setParticipants([]);
      setMovingPets([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !user) return;

    const out: Message = {
      id: crypto.randomUUID(),
      user_id: currentUserId,
      message: newMessage.trim(),
      created_at: nowISO(),
      profiles: {
        display_name: user.displayName ?? "모험가",
      },
    };

    setMessages((prev) => {
      const next = [...prev, out];
      // localStorage에 저장 (현재는 로컬 전용 채팅)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        console.error("failed to save messages to localStorage", err);
      }
      return next;
    });

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Seoul",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-card border-b-2 border-border p-4">
        <div className="container mx-auto max-w-6xl flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/community")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-pixel text-xl text-foreground">채팅방</h1>
            <p className="font-korean text-sm text-muted-foreground">
              {participants.length}명 참가중
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden" ref={chatContainerRef}>
        {movingPets.map((pet) => (
          <div
            key={pet.id}
            className="absolute z-10"
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
                <div className="bg-card border border-primary px-2 py-0.5 rounded-sm shadow-neon text-[10px] font-korean">
                  {pet.name}
                </div>
              </div>
            </div>
          </div>
        ))}

        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="container mx-auto max-w-6xl space-y-4 pb-4">
            {messages.map((msg) => {
              const isMyMessage = msg.user_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-2 max-w-[70%] ${
                      isMyMessage ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {!isMyMessage && (
                      <Avatar className="w-8 h-8 border-2 border-primary flex-shrink-0">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-pixel text-xs">
                          {msg.profiles?.display_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`flex flex-col ${
                        isMyMessage ? "items-end" : "items-start"
                      }`}
                    >
                      {!isMyMessage && (
                        <span className="font-korean text-xs text-muted-foreground mb-1 px-2">
                          {msg.profiles?.display_name || "알 수 없음"}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          isMyMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border-2 border-border"
                        }`}
                      >
                        <p className="font-korean text-sm">{msg.message}</p>
                      </div>
                      <span className="font-korean text-xs text-muted-foreground mt-1 px-2">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="bg-card border-t-2 border-border p-4">
        <div className="container mx-auto max-w-6xl flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 font-korean"
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
