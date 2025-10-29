import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import {
  Plus,
  Check,
  Star,
  Calendar,
  TrendingUp,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Session } from "@supabase/supabase-js";

// 날짜 관련 유틸
function getDueInfo(dueDateStr: string | null | undefined) {
  if (!dueDateStr) {
    return null;
  }

  // dueDateStr이 "2025-10-31" 또는 "2025-10-31T00:00:00.000Z" 이런 식이라고 가정
  const onlyDate = dueDateStr.split("T")[0];
  const due = new Date(onlyDate + "T00:00:00");
  const today = new Date();
  // 오늘 00:00으로 통일해서 계산 정확하게
  today.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // 올림으로 남은 날수

  let label = "";
  if (diffDays > 0) {
    label = `D-${diffDays}`;
  } else if (diffDays === 0) {
    label = "D-DAY";
  } else {
    label = `지남 ${Math.abs(diffDays)}일`; // 마감 넘김
  }

  return {
    raw: onlyDate,
    dday: label,
    overdue: diffDays < 0,
  };
}

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  progress: number;
  difficulty: number;
  powder_reward: number;
  due_date: string | null;
}

export default function Goals() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<Session | null>(null);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState<boolean>(true);

  // 새 목표 만들기 Dialog 관련 상태
  const [open, setOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDifficulty, setNewGoalDifficulty] = useState(1);
  const [newGoalDueDate, setNewGoalDueDate] = useState("");
  const [newGoalReward, setNewGoalReward] = useState(100);
  const [creating, setCreating] = useState(false);

  // 세션 확인 + 목표 불러오기
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // 로그인 안 된 상태
        toast({
          title: "로그인이 필요합니다",
          description: "로그인 후 이용해주세요.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setSession(session);
      await loadGoals(session.user.id);
    })();
  }, [navigate, toast]);

  // 목표 목록 불러오기
  const loadGoals = useCallback(
    async (userId?: string) => {
      setLoadingGoals(true);

      // userId를 인자로 안 주면 state.session 기준으로 사용
      const uid = userId ?? session?.user.id;
      if (!uid) {
        setGoals([]);
        setLoadingGoals(false);
        return;
      }

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        toast({
          title: "목표를 불러오지 못했어요",
          description: error.message,
          variant: "destructive",
        });
        setGoals([]);
      } else if (data) {
        setGoals(data as Goal[]);
      }

      setLoadingGoals(false);
    },
    [session, toast]
  );

  // 개별 목표 완료 토글
  const toggleGoal = async (id: string, completed: boolean) => {
    if (!session) return;

    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const newCompleted = !completed;

    // 1) 낙관적 업데이트 (UI 먼저 반영)
    const prevGoals = [...goals];
    setGoals((old) =>
      old.map((g) =>
        g.id === id
          ? {
              ...g,
              completed: newCompleted,
              progress: newCompleted ? 100 : g.progress,
            }
          : g
      )
    );

    // 2) 서버 반영
    const { error } = await supabase
      .from("goals")
      .update({
        completed: newCompleted,
        progress: newCompleted ? 100 : goal.progress,
      })
      .eq("id", id);

    if (error) {
      // 롤백
      setGoals(prevGoals);
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // 3) 완료되었다면 보상 지급 로직
    if (newCompleted) {
      const { data: powderData, error: powderError } = await supabase
        .from("user_powder")
        .select("amount")
        .eq("user_id", session.user.id)
        .single();

      if (!powderError && powderData) {
        const { error: updatePowderError } = await supabase
          .from("user_powder")
          .update({
            amount: powderData.amount + goal.powder_reward,
          })
          .eq("user_id", session.user.id);

        if (updatePowderError) {
          console.error(updatePowderError);
        }
      }

      toast({
        title: "목표 달성!",
        description: `${goal.powder_reward} 가루를 획득했습니다!`,
      });
    }
  };

  // 새 목표 추가
  const addGoal = async () => {
    if (!newGoalTitle.trim()) {
      toast({
        title: "제목을 입력해주세요",
        variant: "destructive",
      });
      return;
    }
    if (!session) return;

    setCreating(true);

    const { error } = await supabase.from("goals").insert({
      user_id: session.user.id,
      title: newGoalTitle,
      difficulty: newGoalDifficulty,
      due_date: newGoalDueDate || null,
      powder_reward: newGoalReward,
      // progress, completed 는 기본값(0,false)로 DB에서 처리된다고 가정
    });

    if (error) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
      setCreating(false);
      return;
    }

    toast({ title: "목표 추가 완료!" });

    // 입력값 초기화
    setNewGoalTitle("");
    setNewGoalDifficulty(1);
    setNewGoalDueDate("");
    setNewGoalReward(100);
    setOpen(false);
    setCreating(false);

    // 새 목표까지 반영된 목록 다시 로드
    loadGoals();
  };

  // 컴포넌트 내 계산 값들
  const completedCount = goals.filter((g) => g.completed).length;
  const remainingCount = goals.length - completedCount;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        {/* 헤더 + 요약 카드 + 새 목표 추가 버튼 */}
        <div className="mb-8 animate-slide-up">
          <h1 className="font-pixel text-2xl sm:text-3xl mb-4 text-foreground">
            나의 목표
          </h1>

          {/* 달성/남은 목표 요약 카드 2개 */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Card className="flex-1 min-w-[200px] bg-card/50 border-2 border-success">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="font-pixel text-2xl text-success">
                    {completedCount}
                  </div>
                  <div className="font-korean text-xs text-muted-foreground">
                    달성한 목표
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 min-w-[200px] bg-card/50 border-2 border-warning">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <div className="font-pixel text-2xl text-warning">
                    {remainingCount}
                  </div>
                  <div className="font-korean text-xs text-muted-foreground">
                    남은 목표
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 새 목표 추가 Dialog */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="lg" className="w-full sm:w-auto">
                <Plus className="w-5 h-5" />
                <span className="ml-2 font-korean">새로운 목표 추가</span>
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-pixel">
                  새로운 목표 추가
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* 목표 제목 */}
                <div>
                  <Label htmlFor="title" className="font-korean">
                    목표 제목
                  </Label>
                  <Input
                    id="title"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="목표를 입력하세요"
                  />
                </div>

                {/* 난이도 */}
                <div>
                  <Label htmlFor="difficulty" className="font-korean">
                    난이도 (1~5)
                  </Label>
                  <Input
                    id="difficulty"
                    type="number"
                    min={1}
                    max={5}
                    value={newGoalDifficulty}
                    onChange={(e) =>
                      setNewGoalDifficulty(Number(e.target.value))
                    }
                  />
                </div>

                {/* 보상 가루 */}
                <div>
                  <Label htmlFor="reward" className="font-korean">
                    보상 가루
                  </Label>
                  <Input
                    id="reward"
                    type="number"
                    min={1}
                    value={newGoalReward}
                    onChange={(e) => setNewGoalReward(Number(e.target.value))}
                  />
                </div>

                {/* 마감일 */}
                <div>
                  <Label htmlFor="dueDate" className="font-korean">
                    마감일
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newGoalDueDate}
                    onChange={(e) => setNewGoalDueDate(e.target.value)}
                  />
                </div>

                <Button
                  onClick={addGoal}
                  variant="hero"
                  className="w-full"
                  disabled={creating}
                >
                  {creating ? "추가 중..." : "목표 추가"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 목표 리스트 영역 */}
        <div className="space-y-4 mb-12">
          {loadingGoals ? (
            // 로딩 스켈레톤
            <>
              {[0, 1, 2].map((i) => (
                <Card
                  key={i}
                  className="bg-card border-2 border-border shadow-card animate-pulse"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-sm border-2 border-border bg-muted/50" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-2 bg-muted rounded w-full" />
                        <div className="h-2 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : goals.length === 0 ? (
            <Card className="bg-card border-2 border-border shadow-card">
              <CardContent className="p-6 text-center font-korean text-muted-foreground">
                아직 등록된 목표가 없어요. "새로운 목표 추가" 버튼으로 시작해보세요!
              </CardContent>
            </Card>
          ) : (
            goals.map((goal, index) => {
              const dueInfo = getDueInfo(goal.due_date);

              return (
                <Card
                  key={goal.id}
                  className="bg-card border-2 border-border hover:border-primary transition-all shadow-card animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* 체크 버튼 */}
                      <button
                        onClick={() =>
                          toggleGoal(goal.id, goal.completed)
                        }
                        className={cn(
                          "w-6 h-6 rounded-sm border-2 flex-shrink-0 flex items-center justify-center transition-all mt-1",
                          goal.completed
                            ? "bg-success border-success shadow-neon"
                            : "border-border hover:border-primary"
                        )}
                      >
                        {goal.completed && (
                          <Check className="w-4 h-4 text-success-foreground" />
                        )}
                      </button>

                      {/* 오른쪽 내용 */}
                      <div className="flex-1 min-w-0">
                        {/* 제목 + 난이도 */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                          <div>
                            <h3
                              className={cn(
                                "font-korean text-lg",
                                goal.completed
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              )}
                            >
                              {goal.title}
                            </h3>

                            <div className="font-korean text-xs text-muted-foreground mt-1">
                              보상: {goal.powder_reward} 가루
                            </div>
                          </div>

                          <div className="flex gap-1">
                            {Array.from({
                              length: goal.difficulty,
                            }).map((_, i) => (
                              <Star
                                key={i}
                                className="w-4 h-4 text-warning fill-warning"
                              />
                            ))}
                          </div>
                        </div>

                        {/* 진행률 + 마감일 */}
                        <div className="space-y-2">
                          <Progress value={goal.progress} className="h-2" />

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-korean text-muted-foreground">
                            <span>진행률: {goal.progress}%</span>

                            {dueInfo && (
                              <div
                                className={cn(
                                  "flex items-center gap-2",
                                  dueInfo.overdue
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                )}
                              >
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{dueInfo.raw}</span>
                                </div>
                                <span
                                  className={cn(
                                    "text-[10px] px-2 py-[2px] rounded-sm border",
                                    dueInfo.overdue
                                      ? "border-destructive text-destructive"
                                      : "border-border text-foreground"
                                  )}
                                >
                                  {dueInfo.dday}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}