import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, Heart, Hand } from "lucide-react";
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
  userId: string;
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

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [movingPets, setMovingPets] = useState<MovingPet[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // 내 메인 펫 정보를 저장할 state (ref 대신 state 사용 권장)
  const [myMainPet, setMyMainPet] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 1. 초기화: 펫 정보 로드 -> 채팅 내역 로드 -> 소켓 연결 순서 보장
  useEffect(() => {
    if (!user || !roomId) {
        if(!user) navigate("/auth");
        return;
    }

    const init = async () => {
        try {
            // [수정] 펫 목록을 가져옵니다.
            const pets = await petsApi.list();
            
            // [핵심 수정 로직]
            // 1순위: 메인 펫 (is_main === true)
            // 2순위: 메인 펫이 없다면 첫 번째 펫 (pets[0])
            const targetPet = pets.find((p) => p.is_main) || pets[0];

            setMyMainPet(targetPet || null); // 상태 저장

            // 2. 채팅 내역 로드
            const history = await communityApi.getChatMessages(roomId);
            setMessages(history);

            // 3. 소켓 연결 (찾아낸 펫 정보를 인자로 넘김)
            connectSocket(targetPet);
            
        } catch (err) {
            console.error("초기화 실패", err);
        }
    };

    init();

    // 펫 산책 모드 잠시 끄기
    const previousState = localStorage.getItem("walkingPetsEnabled");
    localStorage.setItem("walkingPetsEnabled", "false");
    window.dispatchEvent(new Event("walkingPetsToggle"));

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      
      localStorage.setItem("walkingPetsEnabled", previousState || "true");
      window.dispatchEvent(new Event("walkingPetsToggle"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

  // 스크롤 자동 이동
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
          
          const petSize = 48; 
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

  const connectSocket = (petInfo: any) => {
    if(socketRef.current) return;

    socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
        transports: ["websocket"],
    });

    // [중요] 가져온 펫 정보를 사용해 입장 요청
    const joinData = {
        roomId,
        user: { id: user?.id, displayName: user?.displayName },
        pet: petInfo // null이어도 보냄 (백엔드에서 처리)
    };

    socketRef.current.emit("join_room", joinData);

    socketRef.current.on("receive_message", (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
    });

    // 현재 방의 유저/펫 리스트 수신
    socketRef.current.on("room_users", (users: any[]) => {
        if (!chatContainerRef.current) return;
        const containerRect = chatContainerRef.current.getBoundingClientRect();

        const newPets: MovingPet[] = users
            .filter(u => u.pet) 
            .map(u => ({
                id: u.pet.id,
                userId: u.userId,
                name: u.pet.name,
                level: u.pet.level,
                rarity: u.pet.rarity,
                x: Math.random() * (containerRect.width - 100) + 50,
                y: Math.random() * (containerRect.height - 100) + 50,
                speedX: (Math.random() - 0.5) * 3,
                speedY: (Math.random() - 0.5) * 3,
            }));
        
        setMovingPets(newPets); 
    });

    socketRef.current.on("user_joined", (userData: any) => {
        if (!userData.pet || !chatContainerRef.current) return;
        const containerRect = chatContainerRef.current.getBoundingClientRect();

        setMovingPets(prev => {
            if(prev.find(p => p.id === userData.pet.id)) return prev;

            const newPet: MovingPet = {
                id: userData.pet.id,
                userId: userData.user.id,
                name: userData.pet.name,
                level: userData.pet.level,
                rarity: userData.pet.rarity,
                x: Math.random() * (containerRect.width - 100) + 50,
                y: Math.random() * (containerRect.height - 100) + 50,
                speedX: (Math.random() - 0.5) * 3,
                speedY: (Math.random() - 0.5) * 3,
            };
            return [...prev, newPet];
        });
        
        toast({
            description: `${userData.user.displayName}님이 입장하셨습니다.`
        });
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !roomId) return;

    // [수정] 상태값(myMainPet)을 직접 사용
    const myPetId = myMainPet?.id;

    const messageData = {
        roomId,
        userId: user.id,
        message: newMessage.trim(),
        profiles: {
            display_name: user.displayName ?? "모험가"
        },
        petId: myPetId
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

  const handlePetClick = (pet: MovingPet) => {
      if (pet.userId === user?.id) return;

      toast({
          title: "펫 쓰다듬기! 👋",
          description: `${pet.name}의 경험치가 올랐습니다!`,
          className: "bg-primary text-primary-foreground border-none"
      });
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
              {movingPets.length}마리의 펫이 산책 중입니다
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-background/50" ref={chatContainerRef}>
        {movingPets.map((pet) => {
            const isMyPet = pet.userId === user?.id;
            return (
              <div
                key={pet.id}
                className={`absolute z-0 transition-all duration-75 ease-linear
                    ${isMyPet ? "opacity-40 cursor-default" : "opacity-80 cursor-pointer hover:scale-110 z-20"}`}
                style={{ left: `${pet.x}px`, top: `${pet.y}px` }}
                onClick={() => handlePetClick(pet)}
              >
                <div className="relative group">
                  <div className={`w-10 h-10 bg-gradient-to-br ${rarityGradients[pet.rarity]} rounded-lg flex items-center justify-center shadow-neon animate-bounce-walk`}>
                    <Heart className={`w-5 h-5 text-primary-foreground ${!isMyPet && "group-hover:animate-pulse"}`} />
                  </div>
                  
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap pointer-events-none">
                    <span className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full font-korean">
                        {pet.name} {isMyPet && "(나)"}
                    </span>
                  </div>

                  {!isMyPet && (
                      <div className="absolute -right-6 -top-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Hand className="w-6 h-6 text-foreground animate-bounce" />
                      </div>
                  )}
                </div>
              </div>
            );
        })}

        <ScrollArea className="h-full p-4 z-10 relative pointer-events-none" ref={scrollRef}>
          <div className="container mx-auto max-w-6xl space-y-4 pb-4 pointer-events-auto">
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