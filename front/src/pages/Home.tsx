import {
  useState,
  useEffect,
  type ComponentType,
} from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Target, Heart, Zap, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

// ⬇⬇⬇ 펫 일러스트 불러오기 (실제 파일 경로에 맞게 유지)
// 예: src/img/Pet1.png, src/img/Pet2.png, src/img/Pet3.png
import Pet1Img from "@/petimg/Pet1.png";
import Pet2Img from "@/petimg/Pet2.png";
import Pet3Img from "@/petimg/Pet3.png";

// ─────────────────────────────
// 타입 정의
// ─────────────────────────────

type StatCardData = {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  color: string; // tailwind text-color class
};

type TodayGoal = {
  id: string;
  title: string;
  completed: boolean;
};

type PetPreview = {
  id: string;
  name?: string;
  avatar_url?: string; // 실제로는 우리가 매핑해서 넣어줄 로컬 이미지 경로
  is_main?: boolean;
  experience?: number;
};

type RoomSummary = {
  id: string;
  title: string;
  daysLeft: number;
  memberCount: number;
};

// 초기 통계 상태 (비로그인/로그아웃 시 표시용)
const INITIAL_STATS: StatCardData[] = [
  { label: "달성한 목표", value: 0, icon: Target, color: "text-success" },
  { label: "나의 펫", value: 0, icon: Heart, color: "text-accent" },
  { label: "도전 중", value: 0, icon: Zap, color: "text-warning" },
];

// ─────────────────────────────
// 메인 Home 컴포넌트
// ─────────────────────────────

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  const [userName, setUserName] = useState("모험가");

  // MEN_1 / CHR_1 등에서 쓰는 상태들
  const [stats, setStats] = useState<StatCardData[]>(INITIAL_STATS);

  const [todayGoals, setTodayGoals] = useState<TodayGoal[]>([]);
  const [todayProgress, setTodayProgress] = useState<number>(0); // 0~100%
  const [streakDays, setStreakDays] = useState<number>(0); // MIS_3 연속 달성 일수

  const [petsTop3, setPetsTop3] = useState<PetPreview[]>([]); // CHR_1 "내 펫 보기" 프리뷰
  const [rooms, setRooms] = useState<RoomSummary[]>([]); // COM_1 "함께 도전방" 참여중

  const navigate = useNavigate();

  useEffect(() => {
    // 1) 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session || null);
      if (session) {
        loadUserData(session.user.id);
      } else {
        // 비로그인 상태
        setLoadingDashboard(false);
      }
    });

    // 2) 로그인/로그아웃 실시간 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession) {
        loadUserData(nextSession.user.id);
      } else {
        // 로그아웃되면 대시보드 값들 초기화
        setStats(INITIAL_STATS);
        setTodayGoals([]);
        setTodayProgress(0);
        setStreakDays(0);
        setPetsTop3([]);
        setRooms([]);
        setLoadingDashboard(false);
      }
    });

    // cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 로컬 펫 일러스트 선택 로직
  // (여기서는 rarity 기준으로 나눴지만, name/id 기준으로 바꿔도 됨)
  function getPetImage(p: any): string {
    if (p.rarity === "legendary") {
      return Pet3Img;
    }
    if (p.rarity === "epic") {
      return Pet2Img;
    }
    // rare / common 등 나머지
    return Pet1Img;
  }

  // 대시보드용 데이터 한 번에 로드
  async function loadUserData(userId: string) {
    setLoadingDashboard(true);

    try {
      // 병렬로 가져오기
      const [profileRes, goalsRes, petsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("goals").select("*").eq("user_id", userId),
        supabase.from("pets").select("*").eq("user_id", userId),
        // TODO: 도전방 데이터도 여기서 불러올 예정
      ]);

      // ----- 프로필에서 닉네임
      if (profileRes.data) {
        setUserName(profileRes.data.display_name || "모험가");
      } else {
        setUserName("모험가");
      }

      // ----- 목표(goals)에서 통계, 오늘 할 일, 진행률, 스트릭
      const allGoals = goalsRes.data || [];

      const completedGoalsCount = allGoals.filter(
        (g: any) => g.completed
      ).length;
      const activeGoals = allGoals.filter((g: any) => !g.completed);

      // "오늘의 목표" = 아직 완료하지 않은 목표 전체
      const relevantTodayGoals = activeGoals;

      // 오늘 카드에 뿌릴 리스트
      setTodayGoals(
        relevantTodayGoals.map((g: any) => ({
          id: g.id,
          title: g.title ?? "(제목 없음)",
          completed: !!g.completed, // 어차피 false지만 혹시 몰라서 유지
        }))
      );

      // 진행률은 "전체 목표 중 완료된 목표 비율"로 계산
      const totalGoalsCount = allGoals.length;
      const todayPct =
        totalGoalsCount > 0
          ? Math.round((completedGoalsCount / totalGoalsCount) * 100)
          : 0;
      setTodayProgress(todayPct);

      // streakDays (MIS_3) - 아직 백엔드 필드 없으면 0 유지
      // const inferredStreak =
      //   allGoals.length > 0 && allGoals[0].streak_days
      //     ? allGoals[0].streak_days
      //     : 0;
      // setStreakDays(inferredStreak);

      // ----- 펫 정보
      const petList = petsRes.data || [];

      // 메인 펫 1마리 찾기
      const mainPet = petList.find((p: any) => p.is_main);

      // 나머지 펫들 중 경험치 높은 순으로 정렬
      const othersSorted = petList
        .filter((p: any) => !p.is_main)
        .sort(
          (a: any, b: any) =>
            (b.experience ?? 0) - (a.experience ?? 0)
        );

      // 프리뷰에 쓸 상위 3마리: [메인펫] + [경험치 TOP2]
      const previewOrder = [
        ...(mainPet ? [mainPet] : []),
        ...othersSorted.slice(0, 2),
      ];

      // 여기서 avatar_url에 실제 import된 로컬 이미지 경로를 넣어준다
      setPetsTop3(
        previewOrder.map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar_url: getPetImage(p),
          is_main: p.is_main,
          experience: p.experience,
        }))
      );

      // ----- 통계 카드 3개 업데이트
      setStats([
        {
          label: "달성한 목표",
          value: completedGoalsCount,
          icon: Target,
          color: "text-success",
        },
        {
          label: "나의 펫",
          value: petList.length || 0,
          icon: Heart,
          color: "text-accent",
        },
        {
          label: "도전 중",
          value: activeGoals.length,
          icon: Zap,
          color: "text-warning",
        },
      ]);

      // ----- 도전방(챌린지 방) 요약
      const roomsTemp: RoomSummary[] = [
        // 추후 Supabase challenge_rooms 연결
      ];
      setRooms(roomsTemp);
    } catch (err) {
      console.error("Failed to load dashboard:", err);

      // 실패 시 최소한 빈 상태라도 유지
      setStats(INITIAL_STATS);
      setTodayGoals([]);
      setTodayProgress(0);
      setStreakDays(0);
      setPetsTop3([]);
      setRooms([]);
    } finally {
      setLoadingDashboard(false);
    }
  }

  // ① 비로그인 상태 → 랜딩 화면
  if (!session) {
    return <GuestLanding stats={stats} />;
  }

  // ② 로그인 했는데 아직 supabase에서 데이터 긁는 중 → 스켈레톤
  if (loadingDashboard) {
    return <DashboardSkeleton />;
  }

  // ③ 로그인 & 데이터 로드 완료 → 실제 대시보드
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
            onClick={() => navigate("/goals")} // /goals 로 이동
          >
            <TrendingUp className="w-5 h-5 group-hover:animate-pulse" />
            <span className="ml-2 font-korean">새로운 목표 달성하기</span>
          </Button>
        </div>

        {/* 오늘 목표 & 펫 미리보기 */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <TodayGoalsCard
            goals={todayGoals}
            progress={todayProgress}
            streakDays={streakDays}
          />
          <MyPetsPreview pets={petsTop3} />
        </div>

        {/* 내가 참여 중인 도전방 요약 */}
        <div className="mt-8">
          <ActiveRooms rooms={rooms} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────
// 아래부터는 Home 내부에서만 쓰는 하위 컴포넌트들
// ─────────────────────────────

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
            size="hero"
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className="bg-card border-2 border-border hover:border-primary transition-all shadow-card hover:shadow-neon cursor-pointer group"
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

function TodayGoalsCard({
  goals,
  progress,
  streakDays,
}: {
  goals: TodayGoal[];
  progress: number;
  streakDays: number;
}) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card/50 border-2 border-border">
      <CardContent className="p-6">
        <h3 className="font-pixel text-lg mb-4 text-foreground">
          오늘의 목표
        </h3>

        {/* 진행률 바 + 스트릭 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-korean mb-2">
            <span className="text-muted-foreground">전체 진행률</span>
            <span className="text-foreground font-medium">{progress}%</span>
          </div>

          {/* 진행률 바 */}
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

        {/* 아직 완료 전인 목표들 리스트 */}
        <div className="space-y-3">
          {goals.length === 0 ? (
            <div className="text-sm text-muted-foreground font-korean">
              진행 중인 목표가 없어요.
              <br />
              새로운 목표를 만들어볼까요?
            </div>
          ) : (
            goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => navigate("/goals")}
                className={cn(
                  "w-full text-left flex items-center gap-3 p-3 bg-muted/50 rounded-sm border border-border hover:border-primary hover:bg-muted/70 transition-all focus:outline-none"
                )}
              >
                <div className="w-4 h-4 border-2 border-primary rounded-sm flex items-center justify-center text-[10px] leading-none" />
                <span className="font-korean text-sm text-foreground line-clamp-1">
                  {goal.title}
                </span>
              </button>
            ))
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
          <div className="text-sm text-muted-foreground font-korean">
            아직 펫이 없어요. 목표를 달성하고 가루를 모아 펫을 뽑아보세요!
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {pets.slice(0, 3).map((pet) => (
              <button
                key={pet.id}
                onClick={() => navigate("/pets")}
                className={cn(
                  "relative aspect-square bg-gradient-primary rounded-lg flex flex-col items-center justify-center shadow-neon hover:shadow-neon-hover transition-all hover:scale-105 focus:outline-none",
                  pet.is_main && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                {pet.avatar_url ? (
                  <img
                    src={pet.avatar_url}
                    alt={pet.name || "pet"}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <Heart className="w-8 h-8 text-primary-foreground" />
                )}

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
          <div className="text-sm text-muted-foreground font-korean">
            아직 참여 중인 도전방이 없어요. 새 도전방을 만들어보세요!
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
  // supabase에서 데이터 가져오는 동안 보여줄 뼈대 UI
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-6xl animate-pulse">
        {/* 헤더 스켈레톤 */}
        <div className="text-center mb-12">
          <div className="h-8 w-48 bg-muted rounded-lg mx-auto mb-4" />
          <div className="h-4 w-64 bg-muted rounded mx-auto" />
        </div>

        {/* 통계 카드 스켈레톤 */}
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

        {/* 액션 버튼 스켈레톤 */}
        <div className="text-center mb-16">
          <div className="h-10 w-48 bg-muted rounded-lg mx-auto" />
        </div>

        {/* 오늘의 목표 / 펫 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-card/50 border-2 border-border rounded-lg p-6"
            >
              <div className="h-5 w-24 bg-muted rounded mb-4" />
              <div className="space-y-3">
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    className="h-10 bg-muted/60 rounded border border-border"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 도전방 스켈레톤 */}
        <div className="mt-8 bg-card/50 border-2 border-border rounded-lg p-6">
          <div className="h-5 w-32 bg-muted rounded mb-4" />
          <div className="space-y-3">
            {[0, 1].map((j) => (
              <div
                key={j}
                className="h-12 bg-muted/60 rounded border border-border"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
