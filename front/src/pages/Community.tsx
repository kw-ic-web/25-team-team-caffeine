import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users,
  Trophy,
  Heart,
  MessageCircle,
  ThumbsUp,
  Lock,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function Community() {
  // 현재 탭 (도전방 / 피드 / 랭킹)
  const [activeTab, setActiveTab] = useState("challenges");

  // 도전방 생성 모달 상태
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomPrivacy, setNewRoomPrivacy] = useState<"public" | "private">(
    "public"
  );
  const [newRoomDuration, setNewRoomDuration] = useState<number>(14); // 기간(일 단위)
  const [createOpen, setCreateOpen] = useState(false);

  // 피드 작성 (한줄 공유)
  const [newPostText, setNewPostText] = useState("");

  const navigate = useNavigate();

  // 예시: 커뮤니티 도전방 목록 (COM_1 / COM_2)
  // 실제에선 supabase에서 받아오면 됨
  const challenges = [
    {
      id: "room-1",
      title: "30일 운동 챌린지",
      category: "운동",
      members: 24,
      dday: 15,
      privacy: "public" as const,
      joined: true,
    },
    {
      id: "room-2",
      title: "매일 독서 1시간",
      category: "독서",
      members: 18,
      dday: 7,
      privacy: "private" as const,
      joined: false,
    },
    {
      id: "room-3",
      title: "코딩 테스트 정복",
      category: "공부",
      members: 32,
      dday: 30,
      privacy: "public" as const,
      joined: true,
    },
    {
      id: "room-4",
      title: "아침 루틴 만들기",
      category: "습관",
      members: 45,
      dday: 21,
      privacy: "public" as const,
      joined: false,
    },
  ];

  // 예시: 피드 목록 (COM_3)
  const feedPosts = [
    {
      user: "모험가123",
      rank: "Gold",
      content: "오늘도 목표 달성! 🎉",
      likes: 42,
      comments: 8,
      time: "2시간 전",
    },
    {
      user: "목표왕",
      rank: "Platinum",
      content: "30일 운동 챌린지 완료했습니다!",
      likes: 156,
      comments: 23,
      time: "3시간 전",
    },
    {
      user: "펫마스터",
      rank: "Diamond",
      content: "레전더리 펫 획득! 너무 기쁘네요 ✨",
      likes: 89,
      comments: 15,
      time: "5시간 전",
    },
  ];

  // 예시: 주간 랭킹 (COM_4)
  const ranking = [
    { rank: 1, user: "목표왕", score: 2450, badge: "🥇" },
    { rank: 2, user: "펫마스터", score: 2230, badge: "🥈" },
    { rank: 3, user: "챌린저", score: 2100, badge: "🥉" },
    { rank: 4, user: "모험가123", score: 1890, badge: "" },
    { rank: 5, user: "열정맨", score: 1750, badge: "" },
  ];

  // 도전방 생성 (프론트 데모용)
  function handleCreateRoom() {
    // 추후 supabase insert 예정
    console.log({
      title: newRoomTitle,
      privacy: newRoomPrivacy,
      durationDays: newRoomDuration,
    });
    // 생성 후 초기화 & 닫기
    setNewRoomTitle("");
    setNewRoomPrivacy("public");
    setNewRoomDuration(14);
    setCreateOpen(false);
  }

  // 피드 공유 (프론트 데모용)
  function handleSharePost() {
    console.log("공유한 메시지:", newPostText);
    setNewPostText("");
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        {/* 상단 헤더 */}
        <div className="mb-8 animate-slide-up">
          <h1 className="font-pixel text-2xl sm:text-3xl mb-4 text-foreground">
            커뮤니티
          </h1>
          <p className="font-korean text-muted-foreground">
            함께 목표를 달성하고 동기부여를 받아보세요
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* 탭 목록: 도전방 / 피드 / 랭킹 */}
          <TabsList className="grid w-full grid-cols-3 h-auto bg-card/50 p-1 border-2 border-border">
            <TabsTrigger
              value="challenges"
              className="font-korean data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              도전방
            </TabsTrigger>

            <TabsTrigger
              value="feed"
              className="font-korean data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              피드
            </TabsTrigger>

            <TabsTrigger
              value="ranking"
              className="font-korean data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              랭킹
            </TabsTrigger>
          </TabsList>

          {/* ─────────────────────────────
              COM_1 도전방 탭
              - 방 만들기 (공개/비공개, 기간)
              - 참여중/참여 가능한 도전방 카드
             ───────────────────────────── */}
          <TabsContent value="challenges" className="space-y-6">
            {/* 도전방 만들기 CTA + Dialog */}
            <Card className="bg-gradient-primary border-2 border-primary shadow-neon">
              <CardContent className="p-6">
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      <Users className="w-5 h-5" />
                      <span className="font-korean ml-2">도전방 만들기</span>
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-pixel">
                        새로운 도전방 만들기
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* 도전방 이름 */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="roomTitle"
                          className="font-korean text-sm"
                        >
                          도전방 이름
                        </Label>
                        <Input
                          id="roomTitle"
                          placeholder="예: 30일 운동 챌린지"
                          value={newRoomTitle}
                          onChange={(e) => setNewRoomTitle(e.target.value)}
                        />
                      </div>

                      {/* 공개 여부 */}
                      <div className="space-y-2">
                        <Label className="font-korean text-sm">
                          공개 설정
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              newRoomPrivacy === "public"
                                ? "hero"
                                : "outline"
                            }
                            className="flex-1 font-korean"
                            onClick={() => setNewRoomPrivacy("public")}
                          >
                            공개
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              newRoomPrivacy === "private"
                                ? "hero"
                                : "outline"
                            }
                            className="flex-1 font-korean"
                            onClick={() => setNewRoomPrivacy("private")}
                          >
                            비공개
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground font-korean">
                          비공개 방은 초대받은 사람만 참여할 수 있어요.
                        </p>
                      </div>

                      {/* 기간 설정 (며칠 동안 진행?) */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="duration"
                          className="font-korean text-sm"
                        >
                          진행 기간 (일)
                        </Label>
                        <Input
                          id="duration"
                          type="number"
                          min={1}
                          max={60}
                          value={newRoomDuration}
                          onChange={(e) =>
                            setNewRoomDuration(Number(e.target.value))
                          }
                        />
                        <p className="text-xs text-muted-foreground font-korean">
                          방은 설정된 기간이 지나면 자동 종료돼요.
                        </p>
                      </div>

                      <Button
                        variant="hero"
                        size="lg"
                        className="w-full font-korean"
                        onClick={handleCreateRoom}
                      >
                        방 생성하기
                      </Button>
                      <p className="text-[11px] text-muted-foreground font-korean text-center">
                        방 개설에는 일정량의 가루/코인이 필요할 수 있어요.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* 도전방 카드들 (참여/참가 가능 목록) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {challenges.map((challenge, i) => (
                <Card
                  key={challenge.id}
                  className={cn(
                    "bg-card border-2 border-border hover:border-primary transition-all shadow-card hover:shadow-neon cursor-pointer animate-slide-up"
                  )}
                  style={{ animationDelay: `${i * 50}ms` }}
                  onClick={() => navigate(`/rooms/${challenge.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="font-korean text-lg mb-2 text-foreground">
                          {challenge.title}
                        </CardTitle>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* 카테고리 뱃지 */}
                          <span className="inline-block px-2 py-1 bg-primary/20 rounded-sm border border-primary">
                            <span className="font-korean text-xs text-primary">
                              {challenge.category}
                            </span>
                          </span>

                          {/* 공개 / 비공개 뱃지 */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-xs font-korean",
                              challenge.privacy === "public"
                                ? "bg-success/20 border-success text-success"
                                : "bg-muted/50 border-border text-muted-foreground"
                            )}
                          >
                            {challenge.privacy === "public" ? (
                              <>
                                <Users className="w-3 h-3" />
                                공개
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                비공개
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between text-sm font-korean text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{challenge.members}명 참가중</span>
                      </div>
                      <div>D-{challenge.dday}</div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-korean text-xs w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/rooms/${challenge.id}/chat`);
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        실시간 채팅
                      </Button>

                      <Button
                        variant="neon"
                        size="sm"
                        className="font-korean text-xs w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 여기서 방 참여 로직 / 가입 로직 붙일 수 있음
                          navigate(`/rooms/${challenge.id}`);
                        }}
                      >
                        {challenge.joined ? "입장하기" : "참가하기"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─────────────────────────────
              COM_3 피드 탭
              - 내가 한 줄 공유하기
              - 다른 사람들의 진행 상황
             ───────────────────────────── */}
          <TabsContent value="feed" className="space-y-6">
            {/* 내 진행상황 공유 영역 */}
            <Card className="bg-card border-2 border-border shadow-card">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Label className="font-korean text-sm">
                    지금 어떤 목표를 달성 중인가요?
                  </Label>
                  <div className="mt-2 flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="예) 오늘 러닝 5km 성공! 🏃‍♂️"
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="hero"
                      size="lg"
                      className="font-korean"
                      onClick={handleSharePost}
                    >
                      공유
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-korean mt-2">
                    한 줄로 현재 진행 중인 목표 상황을 공유해요.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 커뮤니티 피드 목록 */}
            {feedPosts.map((post, i) => (
              <Card
                key={i}
                className="bg-card border-2 border-border shadow-card animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-primary">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-pixel text-sm">
                        {post.user[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-korean font-bold text-foreground">
                          {post.user}
                        </span>
                        <span className="px-2 py-0.5 bg-warning/20 rounded-sm border border-warning">
                          <span className="font-pixel text-xs text-warning">
                            {post.rank}
                          </span>
                        </span>
                      </div>
                      <p className="font-korean text-sm text-muted-foreground">
                        {post.time}
                      </p>
                    </div>
                  </div>

                  <p className="font-korean mb-4 text-foreground">
                    {post.content}
                  </p>

                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 font-korean text-sm"
                    >
                      <Heart className="w-4 h-4" />
                      <span>{post.likes}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 font-korean text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 font-korean text-sm"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>칭찬하기</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ─────────────────────────────
              COM_4 랭킹 탭
              - 주간 목표 달성 상위 유저
             ───────────────────────────── */}
          <TabsContent value="ranking" className="space-y-6">
            <Card className="bg-card border-2 border-border shadow-card">
              <CardHeader>
                <CardTitle className="font-pixel text-xl flex items-center gap-2 text-foreground">
                  <Trophy className="w-6 h-6 text-warning" />
                  주간 목표 달성 랭킹
                </CardTitle>
                <p className="font-korean text-sm text-muted-foreground">
                  이번 주에 가장 많은 목표를 달성한 모험가들이에요.
                </p>
              </CardHeader>

              <CardContent className="space-y-3">
                {ranking.map((entry, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-sm border-2 transition-all",
                      entry.rank <= 3
                        ? "bg-gradient-primary border-primary shadow-neon"
                        : "bg-card border-border hover:border-primary"
                    )}
                  >
                    <div className="font-pixel text-2xl w-12 text-center text-foreground">
                      {entry.badge || entry.rank}
                    </div>

                    <Avatar className="w-10 h-10 border-2 border-primary">
                      <AvatarFallback className="bg-gradient-secondary text-secondary-foreground font-pixel text-sm">
                        {entry.user[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="font-korean font-bold text-foreground">
                        {entry.user}
                      </div>
                      <div className="font-korean text-sm text-muted-foreground">
                        {entry.score} 점
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}