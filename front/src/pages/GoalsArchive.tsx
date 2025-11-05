import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type Goal = {
  id: string;
  title: string;
  completed: boolean;
  progress: number;
  powder_reward: number;
  due_date: string | null;
  difficulty: number;
  schedule_type: "none" | "daily" | "specific_days" | "final_day_only";
  schedule_days: number[] | null;
  daily_powder_reward: number;
  total_days: number;
  completed_days: number;
};

export default function GoalsArchive() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    loadArchive();
  }, []);

  const isExpired = (due: string | null) => !!due && due < todayISO;

  const loadArchive = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", session.user.id)
      // 완료됐거나 마감이 지난 목표 = 아카이브 대상
      .or(`completed.eq.true,due_date.lt.${todayISO}`)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "로드 실패", description: error.message, variant: "destructive" });
    } else {
      setGoals((data || []) as Goal[]);
    }
    setLoading(false);
  };

  const completedGoals = goals.filter((g) => g.completed);
  const pastDueGoals = goals.filter((g) => !g.completed && isExpired(g.due_date));

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 animate-slide-up flex items-center justify-between">
          <h1 className="font-pixel text-2xl sm:text-3xl text-foreground">지난 목표</h1>
          <Button variant="neon" onClick={() => navigate("/goals")}>목표로 돌아가기</Button>
        </div>

        {/* 상단 요약 카드 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Card className="flex-1 min-w-[220px] bg-card/50 border-2 border-success">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="font-pixel text-2xl text-success">{completedGoals.length}</div>
                <div className="font-korean text-xs text-muted-foreground">완료한 목표</div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 min-w-[220px] bg-card/50 border-2 border-warning">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="font-pixel text-2xl text-warning">{pastDueGoals.length}</div>
                <div className="font-korean text-xs text-muted-foreground">마감 지난 목표</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="bg-card border-2 border-border">
            <CardContent className="p-8 text-center font-korean text-muted-foreground">
              불러오는 중...
            </CardContent>
          </Card>
        ) : goals.length === 0 ? (
          <Card className="bg-card border-2 border-border">
            <CardContent className="p-8 text-center font-korean text-muted-foreground">
              지난 목표가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {/* 완료된 목표 섹션 */}
            <section>
              <h2 className="font-pixel text-xl mb-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-success" />
                완료한 목표
                <span className="font-korean text-xs text-muted-foreground">({completedGoals.length})</span>
              </h2>

              {completedGoals.length === 0 ? (
                <Card className="bg-card border-2 border-border">
                  <CardContent className="p-6 text-center font-korean text-muted-foreground">
                    완료한 목표가 없습니다.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {completedGoals.map((g, i) => (
                    <Card
                      key={g.id}
                      className="bg-card border-2 border-success/50 hover:border-success transition-all shadow-card animate-slide-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-korean text-lg text-foreground break-words">
                                {g.title}
                              </h3>
                              <span className="text-xs font-korean px-2 py-0.5 rounded-sm bg-success/20 border border-success text-success">
                                완료됨
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 font-korean">
                              {g.due_date && (
                                <>
                                  <Calendar className="w-3 h-3" />
                                  <span>{g.due_date}</span>
                                </>
                              )}
                              <span>· 보상 {g.powder_reward} 가루</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* 마감 지난 목표 섹션 */}
            <section>
              <h2 className="font-pixel text-xl mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                마감 지난 목표
                <span className="font-korean text-xs text-muted-foreground">({pastDueGoals.length})</span>
              </h2>

              {pastDueGoals.length === 0 ? (
                <Card className="bg-card border-2 border-border">
                  <CardContent className="p-6 text-center font-korean text-muted-foreground">
                    마감이 지난 목표가 없습니다.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pastDueGoals.map((g, i) => (
                    <Card
                      key={g.id}
                      className="bg-card border-2 border-warning/50 hover:border-warning transition-all shadow-card animate-slide-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-korean text-lg text-foreground break-words">
                                {g.title}
                              </h3>
                              <span className="text-xs font-korean px-2 py-0.5 rounded-sm bg-destructive/20 border border-destructive text-destructive">
                                마감 지남
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 font-korean">
                              {g.due_date && (
                                <>
                                  <Calendar className="w-3 h-3" />
                                  <span>{g.due_date}</span>
                                </>
                              )}
                              <span>· 보상 {g.powder_reward} 가루</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
