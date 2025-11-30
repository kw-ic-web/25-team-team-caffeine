import { useState, useEffect, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target,
  Heart,
  Zap,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
// ✅ dailyTasksApi와 localYMD 추가
import { goalsApi, petsApi, dailyTasksApi, type Goal } from "@/lib/api";
import { localYMD } from "@/lib/date";

import Pet1Img from "@/petimg/Pet1.png";
import Pet2Img from "@/petimg/Pet2.png";
import Pet3Img from "@/petimg/Pet3.png";

type StatCardData = {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  color: string;
};

// Goals.tsx와 동일한 구조
type DailyTask = {
  id: string;
  goal_id: string;
  task_date: string;
  completed: boolean;
  failed: boolean;
  goal?: Goal;
};

type PetPreview = {
  id: string;
  name?: string;
  avatar_url?: string;
  is_main?: boolean;
  experience?: number;
};

type RoomSummary = {
  id: string;
  title: string;
  daysLeft: number;
  memberCount: number;
};

const INITIAL_STATS: StatCardData[] = [
  { label: "달성한 목표", value: 0, icon: Target, color: "text-success" },
  { label: "나의 펫", value: 0, icon: Heart, color: "text-accent" },
  { label: "도전 중", value: 0, icon: Zap, color: "text-warning" },
];

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  const [userName, setUserName] = useState("모험가");
  const [stats, setStats] = useState<StatCardData[]>(INITIAL_STATS);

  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);
  const [todayProgress, setTodayProgress] = useState<number>(0);
  
  // 연속 달성일은 추후 백엔드 연동 필요 (현재는 0으로 표시)
  const [streakDays, setStreakDays] = useState<number>(0); 

  const [petsTop3, setPetsTop3] = useState<PetPreview[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setUserName("모험가");
      setStats(INITIAL_STATS);
      setTodayTasks([]);
      setTodayProgress(0);
      setStreakDays(0);
      setPetsTop3([]);
      setRooms([]);
      setLoadingDashboard(false);
      return;
    }

    loadUserData(user.id, user.displayName ?? "모험가");
  }, [authLoading, user]);

  async function loadUserData(userId: string, displayName: string) {
    setLoadingDashboard(true);
    try {
      const todayStr = localYMD();

      // ✅ 1. Goals(통계용), Pets(펫용), DailyTasks(오늘일정용) 병렬 호출
      const [goalsRes, petsRes, tasksRaw] = await Promise.all([
        goalsApi.list(),
        petsApi.list(),
        dailyTasksApi.listToday(todayStr), // 백엔드에서 필터링된 진짜 '오늘 할 일'
      ]);

      setUserName(displayName || "모험가");

      // --- 상단 통계 (전체 목표 기준) ---
      const allGoals: Goal[] = goalsRes || [];
      const completedGoalsCount = allGoals.filter((g) => g.completed).length;
      const activeGoalsCount = allGoals.filter((g) => !g.completed).length;

      setStats([
        {
          label: "달성한 목표",
          value: completedGoalsCount,
          icon: Target,
          color: "text-success",
        },
        {
          label: "나의 펫",
          value: petsRes.length || 0,
          icon: Heart,
          color: "text-accent",
        },
        {
          label: "도전 중",
          value: activeGoalsCount,
          icon: Zap,
          color: "text-warning",
        },
      ]);

      // --- 오늘의 할 일 (Goals.tsx와 동일한 데이터 사용) ---
      const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];
      setTodayTasks(tasks);

      // 진행률 계산
      const totalToday = tasks.length;
      const completedToday = tasks.filter((t) => t.completed).length;
      const pct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
      setTodayProgress(pct);

      // --- 펫 미리보기 ---
      const petList = petsRes || [];
      const mainPet = petList.find((p: any) => p.is_main);
      const othersSorted = petList
        .filter((p: any) => !p.is_main)
        .sort((a: any, b: any) => (b.experience ?? 0) - (a.experience ?? 0));
      
      const previewOrder = [
        ...(mainPet ? [mainPet] : []),
        ...othersSorted.slice(0, 2),
      ];
      
      setPetsTop3(
        previewOrder.map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
          is_main: p.is_main,
          experience: p.experience,
        }))
      );

      setRooms([]); // 도전방 기능 추후 구현

    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoadingDashboard(false);
    }
  }

  if (authLoading || loadingDashboard) return <DashboardSkeleton />;
  if (!user) return <GuestLanding stats={stats} />;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        <DashboardHeader userName={userName} streakDays={streakDays} />

        <StatsRow stats={stats} />

        <div className="text-center">
          <Button
            variant="hero"
            size="hero"
            className="group"
            onClick={() => navigate("/goals")}
          >
            <TrendingUp className="w-5 h-5 group-hover:animate-pulse" />
            <span className="ml-2 font-korean">새로운 목표 달성하기</span>
          </Button>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <TodayTasksCard
            tasks={todayTasks}
            progress={todayProgress}
            streakDays={streakDays}
          />
          <MyPetsPreview pets={petsTop3} />
        </div>
        
        <div className="mt-8">
          <ActiveRooms rooms={rooms} />
        </div>
      </div>
    </div>
  );
}

// ... (하단 컴포넌트들은 디자인 요소이므로 그대로 유지)

function GuestLanding({ stats }: { stats: StatCardData[] }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-2xl w-full animate-slide-up">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-primary rounded-lg flex items-center justify-center shadow-neon animate-float">
              <Heart className="w-16 h-16 text-primary-foreground animate-pulse-glow" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center animate-pulse">
              <Zap className="w-5 h-5 text-accent-foreground" />
            </div>
          </div>
        </div>

        <h1 className="font-pixel text-2xl sm:text-4xl mb-6 text-foreground">
          QuestPet
        </h1>

        <p className="font-korean text-base sm:text-xl mb-8 text-muted-foreground leading-relaxed">
          오늘도 목표를 깨러 떠나볼까요?
          <br />
          목표를 달성하고 귀여운 펫을 키워보세요!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="hero"
            size="lg"
            onClick={() => navigate("/auth")}
            className="w-full sm:w-auto"
          >
            회원가입 하기
          </Button>
          <Button
            variant="neon"
            size="lg"
            onClick={() => navigate("/auth")}
            className="w-full sm:w-auto"
          >
            로그인
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="bg-card/50 border-2 border-border hover:border-primary transition-all cursor-default"
              >
                <CardContent className="p-6 text-center">
                  <Icon className={cn("w-8 h-8 mx-auto mb-2", stat.color)} />
                  <div className="font-korean text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DashboardHeader({
  userName,
  streakDays,
}: {
  userName: string;
  streakDays: number;
}) {
  return (
    <div className="text-center mb-12 animate-slide-up">
      <h1 className="font-pixel text-2xl sm:text-3xl mb-4 text-foreground">
        {userName}님, 환영합니다!
      </h1>
      <p className="font-korean text-muted-foreground">
        오늘도 목표를 향해 달려봐요!
        {streakDays > 0 && (
          <span className="ml-2 text-primary font-medium">
            (연속 {streakDays}일째🔥)
          </span>
        )}
      </p>
    </div>
  );
}

function StatsRow({ stats }: { stats: StatCardData[] }) {
  const navigate = useNavigate();

  const routeFor = (label: string) => {
    if (label === "달성한 목표") return "/goals/archive";
    if (label === "나의 펫") return "/pets";
    if (label === "도전 중") return "/goals";
    return "/";
  };

  const onKey = (e: React.KeyboardEvent, label: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(routeFor(label));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            role="button"
            tabIndex={0}
            aria-label={`${stat.label} 보러가기`}
            onClick={() => navigate(routeFor(stat.label))}
            onKeyDown={(e) => onKey(e, stat.label)}
            className="bg-card border-2 border-border hover:border-primary transition-all shadow-card hover:shadow-neon cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center shadow-neon group-hover:animate-float">
                  <Icon className={cn("w-8 h-8 text-primary-foreground")} />
                </div>
              </div>
              <div className="font-pixel text-4xl mb-2 text-foreground">
                {stat.value}
              </div>
              <div className="font-korean text-sm text-muted-foreground">
                {stat.label}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TodayTasksCard({
  tasks,
  progress,
  streakDays,
}: {
  tasks: DailyTask[];
  progress: number;
  streakDays: number;
}) {
  const navigate = useNavigate();

  const statusIcon = (t: DailyTask) => {
    if (t.completed) return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (t.failed) return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const statusText = (t: DailyTask) =>
    t.completed ? "완료" : t.failed ? "실패" : "진행 중";

  // 정렬: 완료된 것을 아래로, 진행 중인 것을 위로
  const sortedTasks = [...tasks].sort((a, b) => {
      const aDone = a.completed || a.failed;
      const bDone = b.completed || b.failed;
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
  });

  return (
    <Card className="bg-card/50 border-2 border-border">
      <CardContent className="p-6">
        <h3 className="font-pixel text-lg mb-4 text-foreground">
          오늘의 목표
        </h3>
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-korean mb-2">
            <span className="text-muted-foreground">오늘 진행률</span>
            <span className="text-foreground font-medium">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-muted rounded-sm overflow-hidden border border-border">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {streakDays > 0 && (
            <div className="text-[11px] text-primary font-korean mt-2">
              연속 {streakDays}일 달성 중 🔥
            </div>
          )}
        </div>
        <div className="space-y-3">
          {sortedTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground font-korean text-center py-4">
              오늘의 목표가 없어요.
              <br />
              새로운 목표를 만들어볼까요?
            </div>
          ) : (
            sortedTasks.slice(0, 5).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate("/goals")}
                className={cn(
                  "w-full text-left flex items-center gap-3 p-3 rounded-sm border transition-all focus:outline-none",
                  t.completed
                    ? "bg-success/10 border-success hover:bg-success/15"
                    : t.failed
                    ? "bg-destructive/10 border-destructive hover:bg-destructive/15"
                    : "bg-muted/50 border-border hover:border-primary hover:bg-muted/70"
                )}
              >
                <div className="flex items-center justify-center">
                  {statusIcon(t)}
                </div>
                <span className="font-korean text-sm text-foreground line-clamp-1 flex-1">
                  {t.goal?.title ?? "(제목 없음)"}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                   {statusText(t)}
                </span>
              </button>
            ))
          )}
          {sortedTasks.length > 5 && (
              <div className="text-center mt-2">
                  <span className="text-xs text-muted-foreground cursor-pointer hover:underline" onClick={() => navigate("/goals")}>
                      + 더 보기
                  </span>
              </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MyPetsPreview({ pets }: { pets: PetPreview[] }) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card/50 border-2 border-border">
      <CardContent className="p-6">
        <h3 className="font-pixel text-lg mb-4 text-foreground">나의 펫</h3>

        {pets.length === 0 ? (
          <div className="text-sm text-muted-foreground font-korean text-center py-8">
            아직 펫이 없어요. <br/>목표를 달성하고 펫을 뽑아보세요!
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {pets.slice(0, 3).map((pet) => (
              <button
                key={pet.id}
                onClick={() => navigate("/pets")}
                className={cn(
                  "relative aspect-square bg-gradient-primary rounded-lg flex flex-col items-center justify-center shadow-neon hover:shadow-neon-hover transition-all hover:scale-105 focus:outline-none",
                  pet.is_main &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <img
                  src={
                    pet.avatar_url && pet.avatar_url.trim() !== ""
                      ? pet.avatar_url
                      : Pet1Img
                  }
                  alt={pet.name || "pet"}
                  className="w-16 h-16 object-contain"
                />

                {pet.is_main && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground font-pixel text-[10px] rounded-sm">
                    MAIN
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveRooms({ rooms }: { rooms: RoomSummary[] }) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card/50 border-2 border-border">
      <CardContent className="p-6">
        <h3 className="font-pixel text-lg mb-4 text-foreground">
          진행 중인 도전방
        </h3>

        {rooms.length === 0 ? (
          <div className="text-sm text-muted-foreground font-korean text-center py-4">
            아직 참여 중인 도전방이 없어요.
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-sm border border-border hover:border-primary transition-all cursor-pointer"
                onClick={() => navigate(`/rooms/${room.id}`)}
              >
                <div>
                  <div className="font-korean text-sm text-foreground">
                    {room.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    D-{room.daysLeft} · {room.memberCount}명 참여 중
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="font-korean text-xs"
                >
                  입장
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-6xl animate-pulse">
        <div className="text-center mb-12">
          <div className="h-8 w-48 bg-muted rounded-lg mx-auto mb-4" />
          <div className="h-4 w-64 bg-muted rounded mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-card border-2 border-border rounded-lg p-8 text-center shadow-card"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-muted rounded-lg" />
              </div>
              <div className="h-8 w-12 bg-muted rounded mx-auto mb-2" />
              <div className="h-4 w-24 bg-muted rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}