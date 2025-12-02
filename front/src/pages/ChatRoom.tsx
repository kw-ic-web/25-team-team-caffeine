import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { petsApi, communityApi } from "@/lib/api";
import io, { Socket } from "socket.io-client";

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    display_name: string;
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

const SOCKET_URL = import.meta.env.VITE_API_URL || "https://team07-api.kwweb.org";

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [movingPets, setMovingPets] = useState<MovingPet[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !roomId) {
        if(!user) navigate("/auth");
        return;
    }

    loadChatHistory();
    loadMyPet();

    socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
    });

    socketRef.current.emit("join_room", roomId);
    socketRef.current.on("receive_message", (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
    });

    const previousState = localStorage.getItem("walkingPetsEnabled");
    localStorage.setItem("walkingPetsEnabled", "false");
    window.dispatchEvent(new Event("walkingPetsToggle"));

    return () => {
      socketRef.current?.disconnect();
      
      localStorage.setItem("walkingPetsEnabled", previousState || "true");
      window.dispatchEvent(new Event("walkingPetsToggle"));
    };
  }, [roomId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
          if(scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
          }
      }, 100);
    }
  }, [messages]);

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
          return { ...pet, x: newX, y: newY };
        })
      );
    }, 50);
    return () => clearInterval(interval);
  }, [movingPets.length]);

  const loadChatHistory = async () => {
    if (!roomId) return;
    try {
        const history = await communityApi.getChatMessages(roomId);
        setMessages(history);
    } catch (err) {
        console.error("채팅 내역 로드 실패", err);
        toast({ title: "채팅 내역을 불러오지 못했습니다.", variant: "destructive" });
    }
  };

  const loadMyPet = async () => {
    try {
      const pets = await petsApi.list();
      const mainPet = pets.find((p) => p.is_main);

      if (chatContainerRef.current && mainPet) {
        const containerRect = chatContainerRef.current.getBoundingClientRect();
        setMovingPets([{
            id: mainPet.id,
            name: mainPet.name,
            level: mainPet.level,
            rarity: mainPet.rarity as any,
            x: Math.random() * (containerRect.width - 100) + 50,
            y: Math.random() * (containerRect.height - 100) + 50,
            speedX: (Math.random() - 0.5) * 3,
            speedY: (Math.random() - 0.5) * 3,
        }]);
      } else {
        setMovingPets([]);
      }
    } catch (err) {
      console.error("펫 로드 실패", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !roomId) return;

    const messageData = {
        roomId,
        userId: user.id,
        message: newMessage.trim(),
        profiles: {
            display_name: user.displayName ?? "모험가"
        }
    };

    socketRef.current?.emit("send_message", messageData);
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
              실시간 대화 중
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden bg-background/50" ref={chatContainerRef}>
        {movingPets.map((pet) => (
          <div
            key={pet.id}
            className="absolute z-0 opacity-30 pointer-events-none"
            style={{ left: `${pet.x}px`, top: `${pet.y}px`, transition: 'left 0.05s linear, top 0.05s linear' }}
          >
            <div className="relative">
              <div className={`w-8 h-8 bg-gradient-to-br ${rarityGradients[pet.rarity]} rounded-lg flex items-center justify-center shadow-neon animate-bounce-walk`}>
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          </div>
        ))}
        <ScrollArea className="h-full p-4 z-10 relative" ref={scrollRef}>
          <div className="container mx-auto max-w-6xl space-y-4 pb-4">
            {messages.map((msg) => {
              const isMyMessage = msg.user_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 max-w-[70%] ${isMyMessage ? "flex-row-reverse" : "flex-row"}`}>
                    {!isMyMessage && (
                      <Avatar className="w-8 h-8 border-2 border-primary flex-shrink-0">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-pixel text-xs">
                          {msg.profiles?.display_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`flex flex-col ${isMyMessage ? "items-end" : "items-start"}`}>
                      {!isMyMessage && (
                        <span className="font-korean text-xs text-muted-foreground mb-1 px-2">
                          {msg.profiles?.display_name || "알 수 없음"}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2 rounded-lg text-sm font-korean break-all ${
                          isMyMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border-2 border-border"
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="font-korean text-[10px] text-muted-foreground mt-1 px-1">
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
