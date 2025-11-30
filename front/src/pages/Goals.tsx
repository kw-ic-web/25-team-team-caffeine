import { useState, useEffect, useRef, useCallback } from "react"; // useCallback 추가
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Star, Calendar, TrendingUp, CheckCircle2, XCircle, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { localYMD } from "@/lib/date";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ✅ API 및 Auth
import { goalsApi, calendarApi, dailyTasksApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  progress: number;
  difficulty: number;
  powder_reward: number;
  due_date: string | null;
  schedule_type: "none" | "daily" | "specific_days" | "final_day_only";
  schedule_days: number[] | null;
  daily_powder_reward: number;
  total_days: number;
  completed_days: number;
}

interface DailyTask {
  id: string;
  goal_id: string;
  task_date: string;
  completed: boolean;
  failed: boolean;
  goal?: Goal;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
}

const extractYMD = (input: any): string | null => {
  if (!input) return null;
  const date = new Date(input);
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeScheduleDays = (v: any): number[] | null => {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(Number).filter(Number.isFinite);
    } catch { /* ignore */ }
    return v.split(",").map((x) => Number(x.trim())).filter(Number.isFinite);
  }
  return null;
};

const normalizeGoal = (raw: any): Goal => {
  const due = extractYMD(raw?.due_date);
  
  const dailyRewardNum = Number(raw?.daily_powder_reward);
  const daily_powder_reward = Number.isFinite(dailyRewardNum) ? dailyRewardNum : 0;

  const totalDays = Number(raw?.total_days ?? 0) || 1; 
  const completedDays = Number(raw?.completed_days ?? 0) || 0;
  
  const calculatedProgress = Math.round((completedDays / totalDays) * 100);

  return {
    id: String(raw?.id),
    title: String(raw?.title ?? ""),
    completed: Boolean(raw?.completed),
    progress: calculatedProgress > 100 ? 100 : calculatedProgress,
    difficulty: Number(raw?.difficulty ?? 1) || 1,
    powder_reward: Number(raw?.powder_reward ?? 0) || 0,
    due_date: due,
    schedule_type: (raw?.schedule_type ?? "none") as Goal["schedule_type"],
    schedule_days: normalizeScheduleDays(raw?.schedule_days),
    daily_powder_reward,
    total_days: totalDays,
    completed_days: completedDays,
  };
};

const normalizeDailyTask = (raw: any): DailyTask => {
  const goal = raw?.goal ? normalizeGoal(raw.goal) : undefined;
  return {
    id: String(raw?.id),
    goal_id: String(raw?.goal_id),
    task_date: String(raw?.task_date ?? ""),
    completed: Boolean(raw?.completed),
    failed: Boolean(raw?.failed),
    goal,
  };
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function getDaysRemainingFromYMD(ymd: string): number | null {
  if (!ymd) return null;
  const date = new Date(ymd);
  if (isNaN(date.getTime())) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

function getDueDisplay(dueDate: string, scheduleLabel?: string) {
  const ymd = extractYMD(dueDate);
  if (!ymd) return "";
  const remain = getDaysRemainingFromYMD(ymd);
  if (remain === null) return "";

  if (remain < 0) return "종료됨";
  if (remain === 0) return `오늘 마감${scheduleLabel ? `, ${scheduleLabel}` : ""}`;
  return `${remain}일 남음${scheduleLabel ? `, ${scheduleLabel}` : ""}`;
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDifficulty, setNewGoalDifficulty] = useState(1);
  const [newGoalDueDate, setNewGoalDueDate] = useState("");
  const [newGoalReward, setNewGoalReward] = useState(100);
  const [scheduleType, setScheduleType] = useState<"none" | "daily" | "specific_days" | "final_day_only">("none");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [completedArchiveCount, setCompletedArchiveCount] = useState(0);

  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ✅ [핵심 수정] 데이터 로딩 중복 방지용 Ref
  const isFetching = useRef(false);

  const { user, loading: authLoading, logout } = useAuth();

  const daysOfWeek = [
    { label: "월", value: 1 }, { label: "화", value: 2 }, { label: "수", value: 3 },
    { label: "목", value: 4 }, { label: "금", value: 5 }, { label: "토", value: 6 }, { label: "일", value: 0 },
  ];

  // 1. 인증 체크
  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "로그인이 필요합니다", description: "로그인 후 이용해주세요.", variant: "destructive" });
      navigate("/auth");
    }
  }, [authLoading, user, navigate, toast]);

  // ✅ [핵심 수정] 데이터 로딩 함수 (useCallback으로 재생성 방지)
  const loadAllData = useCallback(async () => {
    if (isFetching.current) return; // 이미 로딩 중이면 중단
    isFetching.current = true;
    setLoading(true);
    
    try {
      const today = localYMD();

      const [goalsRes, tasksRes, eventsRes] = await Promise.all([
        goalsApi.list(),
        dailyTasksApi.listToday(today),
        calendarApi.list().catch(() => [])
      ]);

      // 목표 처리
      const allGoals = (goalsRes as any[]).map(normalizeGoal);
      const activeGoals = allGoals.filter((g) => !g.completed);
      const completed = allGoals.filter((g) => g.completed);

      setGoals(activeGoals);
      setCompletedArchiveCount(completed.length);

      // 태스크 처리
      const tasksArr = Array.isArray(tasksRes) ? tasksRes : [];
      setDailyTasks(tasksArr.map(normalizeDailyTask));

      // 캘린더 처리
      setCalendarEvents(eventsRes as CalendarEvent[]);

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
        logout();
        navigate("/auth");
      }
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [logout, navigate]); // 의존성 최소화

  // 2. 데이터 로딩 실행 (user.id가 있을 때만)
  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [user?.id, loadAllData]);

  // 3. 보상 계산
  useEffect(() => {
    calculateReward();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newGoalDifficulty, newGoalDueDate]);

  // ... (나머지 함수들은 기존과 동일하므로 그대로 유지) ...
  const handleTitleChange = (value: string) => {
    setNewGoalTitle(value);
    if (value.trim().length > 0) {
      const filtered = calendarEvents.filter((event) => event.title.toLowerCase().includes(value.toLowerCase()));
      setFilteredEvents(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredEvents([]);
    }
  };

  const selectEvent = (event: CalendarEvent) => {
    setNewGoalTitle(event.title);
    const endYmd = extractYMD(event.end_date);
    const startYmd = extractYMD(event.start_date);
    setNewGoalDueDate(endYmd ?? startYmd ?? "");
    setShowSuggestions(false);
    setFilteredEvents([]);
  };

  const calculateReward = () => {
    let reward = 100;
    reward += (newGoalDifficulty - 1) * 50;
    const ymd = extractYMD(newGoalDueDate);
    if (ymd) {
        const date = new Date(ymd);
        if (!isNaN(date.getTime())) {
             const today = new Date();
             today.setHours(0,0,0,0);
             const diffTime = date.getTime() - today.getTime();
             const diffDays = Math.ceil(diffTime / 86400000);
             if (diffDays > 0) {
                const weeks = Math.floor(diffDays / 7);
                reward += weeks * 25;
             }
        }
    }
    setNewGoalReward(reward);
  };

  const toggleDaySelection = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const calculateTotalDays = () => {
    if (!newGoalDueDate || scheduleType === "none" || scheduleType === "final_day_only") return 0;
    
    const ymd = extractYMD(newGoalDueDate);
    if (!ymd) return 0;
    
    const remain = getDaysRemainingFromYMD(ymd);
    if (remain === null || remain < 0) return 0;
    
    const diffDays = remain + 1; 

    if (scheduleType === "daily") return diffDays;
    
    if (scheduleType === "specific_days") {
      let count = 0;
      const today = new Date();
      today.setHours(0,0,0,0);
      
      for (let i = 0; i < diffDays; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        if (selectedDays.includes(checkDate.getDay())) count++;
      }
      return count;
    }
    return 0;
  };

  const addGoal = async () => {
    if (!newGoalTitle.trim()) {
      toast({ title: "제목을 입력해주세요", variant: "destructive" });
      return;
    }
    if (scheduleType === "specific_days" && selectedDays.length === 0) {
      toast({ title: "요일을 선택해주세요", variant: "destructive" });
      return;
    }
    if (!user) return;

    // setLoading(true); // 여기서 loading을 true로 바꾸면 loadAllData와 충돌할 수 있음. isFetching만 체크하거나 별도 처리 필요하지만, 
    // 여기선 다이얼로그 닫히고 loadAllData 호출하므로 괜찮음.

    const totalDays = calculateTotalDays();
    const safeTotalDays = totalDays > 0 ? totalDays : 1;

    try {
      await goalsApi.create({
        title: newGoalTitle,
        difficulty: newGoalDifficulty,
        dueDate: extractYMD(newGoalDueDate) || null,
        powderReward: newGoalReward, 
        schedule_type: scheduleType,
        schedule_days: scheduleType === "specific_days" ? selectedDays : null,
        daily_powder_reward: Math.floor(newGoalReward / safeTotalDays),
        total_days: safeTotalDays,
        completed_days: 0,
      } as any);

      toast({ title: "목표 추가 완료!" });
      setNewGoalTitle("");
      setNewGoalDifficulty(1);
      setNewGoalDueDate("");
      setNewGoalReward(100);
      setScheduleType("none");
      setSelectedDays([]);
      setOpen(false);
      
      // 강제 갱신
      isFetching.current = false; 
      loadAllData();
    } catch (err: any) {
      toast({ title: "오류 발생", description: err?.message ?? "목표 추가 중 오류", variant: "destructive" });
    }
  };

  const completeDailyTask = async (taskId: string, goalId: string) => {
    const task = dailyTasks.find((t) => t.id === taskId);
    const goal = task?.goal ?? goals.find((g) => g.id === goalId);
    if (!goal) return;

    try {
      const res = await dailyTasksApi.complete(taskId);
      const data = res as any;

      if (data.isFinalDay && data.reward > 0) {
        toast({ 
            title: "목표 기간 종료!", 
            description: `최종 정산: ${data.reward} 가루를 획득했습니다! 🎉` 
        });
      } else {
        toast({ 
            title: "오늘의 목표 완료!", 
            description: "수고하셨습니다! 목표 마감일에 보상이 정산됩니다." 
        });
      }

      // 강제 갱신
      isFetching.current = false;
      loadAllData();
    } catch (err: any) {
      console.error("완료 처리 실패:", err);
      toast({ 
        title: "처리 실패", 
        description: err?.message || "오류 발생", 
        variant: "destructive" 
      });
    }
  };

  const failDailyTask = async (taskId: string, goalId: string) => {
    try {
      await dailyTasksApi.fail(taskId);
      toast({ title: "목표 실패", description: "30 가루가 차감되었습니다.", variant: "destructive" });
      
      isFetching.current = false;
      loadAllData();
    } catch (err: any) {
      console.error("실패 처리 오류:", err);
      toast({ 
        title: "처리 실패", 
        description: err?.message || "서버 통신 오류", 
        variant: "destructive" 
      });
    }
  };

  const completedCount = completedArchiveCount;
  const remainingCount = goals.length;
  const todayTasksCompleted = dailyTasks.filter((t) => t.completed).length;
  const todayTasksRemaining = dailyTasks.filter((t) => !t.completed && !t.failed).length;

  const getScheduleLabel = (goal: Goal) => {
    if (goal.schedule_type === "daily") return "매일";
    if (goal.schedule_type === "specific_days" && goal.schedule_days) {
      return goal.schedule_days
        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
        .map((d) => daysOfWeek.find((day) => day.value === d)?.label)
        .filter(Boolean)
        .join(",");
    }
    if (goal.schedule_type === "final_day_only") return "마지막날";
    return "";
  };

  const filteredDailyTasks = dailyTasks.filter((task) => !task.completed && !task.failed);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-pixel text-2xl sm:text-3xl mb-4 text-foreground">나의 목표</h1>

          <div className="flex flex-wrap gap-4 mb-6">
            <Card className="flex-1 min-w-[200px] bg-card/50 border-2 border-success">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="font-pixel text-2xl text-success">{completedCount}</div>
                  <div className="font-korean text-xs text-muted-foreground">달성한 목표</div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 min-w-[200px] bg-card/50 border-2 border-warning">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <div className="font-pixel text-2xl text-warning">{remainingCount}</div>
                  <div className="font-korean text-xs text-muted-foreground">남은 목표</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-stretch gap-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="lg" className="h-12 px-6 w-full sm:w-auto">
                  <Plus className="w-5 h-5" />
                  새로운 목표 추가
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-pixel">새로운 목표 추가</DialogTitle>
                  <DialogDescription className="sr-only">목표 생성 폼입니다.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="font-korean">목표 제목</Label>
                    <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <Input
                            ref={inputRef}
                            id="title"
                            value={newGoalTitle}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder="목표를 입력하세요 (캘린더 일정 연동)"
                            onFocus={() => {
                              if (newGoalTitle.trim() && filteredEvents.length > 0) setShowSuggestions(true);
                            }}
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                        <Command>
                          <CommandList>
                            <CommandEmpty className="font-korean text-sm p-2">일치하는 일정이 없습니다.</CommandEmpty>
                            <CommandGroup>
                              {filteredEvents.map((event) => (
                                <CommandItem key={event.id} onSelect={() => selectEvent(event)} className="font-korean cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <div>
                                      <div>{event.title}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(event.start_date).toLocaleDateString("ko-KR")}
                                      </div>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="difficulty" className="font-korean">난이도 (★)</Label>
                    <Input
                      id="difficulty"
                      type="number"
                      min="1"
                      max="5"
                      value={newGoalDifficulty}
                      onChange={(e) => setNewGoalDifficulty(Number(e.target.value))}
                    />
                    <div className="text-xs text-muted-foreground mt-1 font-korean">난이도 1당 +50 가루</div>
                  </div>

                  <div>
                    <Label htmlFor="dueDate" className="font-korean">마감일</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newGoalDueDate}
                      onChange={(e) => setNewGoalDueDate(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground mt-1 font-korean">1주일당 +25 가루</div>
                  </div>

                  <div>
                    <Label htmlFor="reward" className="font-korean">보상 가루 (자동 계산)</Label>
                    <Input id="reward" type="number" min="1" value={newGoalReward} readOnly className="bg-muted" />
                  </div>

                  <div>
                    <Label className="font-korean mb-3 block">일정 반복</Label>
                    <RadioGroup value={scheduleType} onValueChange={(value: any) => setScheduleType(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="none" />
                        <Label htmlFor="none" className="font-korean cursor-pointer">없음</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="daily" />
                        <Label htmlFor="daily" className="font-korean cursor-pointer">매일</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="specific_days" id="specific_days" />
                        <Label htmlFor="specific_days" className="font-korean cursor-pointer">특정 요일</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="final_day_only" id="final_day_only" />
                        <Label htmlFor="final_day_only" className="font-korean cursor-pointer">마지막날만</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {scheduleType === "specific_days" && (
                    <div>
                      <Label className="font-korean mb-2 block">요일 선택</Label>
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day) => (
                          <div key={day.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${day.value}`}
                              checked={selectedDays.includes(day.value)}
                              onCheckedChange={() => toggleDaySelection(day.value)}
                            />
                            <Label htmlFor={`day-${day.value}`} className="font-korean cursor-pointer">
                              {day.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={addGoal} variant="hero" className="w-full" disabled={loading}>
                    {loading ? "추가 중..." : "목표 추가"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/goals/archive")}
              className="h-12 px-6 w-full sm:w-auto"
            >
              지난 목표 보기
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* 전체 일정 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-pixel text-xl text-foreground">전체 일정</h2>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="font-pixel text-lg text-success">{completedCount}</div>
                  <div className="font-korean text-xs text-muted-foreground">완료</div>
                </div>
                <div className="text-center">
                  <div className="font-pixel text-lg text-warning">{remainingCount}</div>
                  <div className="font-korean text-xs text-muted-foreground">남음</div>
                </div>
              </div>
            </div>

            {goals.length === 0 ? (
              <Card className="bg-card border-2 border-border">
                <CardContent className="p-8 text-center">
                  <p className="font-korean text-muted-foreground">목표가 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal, index) => (
                <Card
                  key={goal.id}
                  className="bg-card border-2 border-border hover:border-primary transition-all shadow-card animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className={cn("font-korean text-lg", goal.completed ? "text-muted-foreground line-through" : "text-foreground")}>
                              {goal.title}
                              {goal.due_date && ` (${getDueDisplay(goal.due_date, getScheduleLabel(goal))})`}
                            </h3>
                            <div className="font-korean text-xs text-muted-foreground mt-1">
                              총 보상: {goal.powder_reward} 가루 (마감일 일괄 지급)
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {Array.from({ length: goal.difficulty }).map((_, i) => (
                              <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Progress value={goal.progress} className="h-2" />
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-korean text-muted-foreground">
                            <span>
                              진행률: {goal.progress}%
                              {goal.total_days > 0 && ` (${goal.completed_days}/${goal.total_days}일)`}
                            </span>
                            {goal.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{goal.due_date}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* 하루 일정 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-pixel text-xl text-foreground">하루 일정</h2>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="font-pixel text-lg text-success">{todayTasksCompleted}</div>
                  <div className="font-korean text-xs text-muted-foreground">완료</div>
                </div>
                <div className="text-center">
                  <div className="font-pixel text-lg text-warning">{todayTasksRemaining}</div>
                  <div className="font-korean text-xs text-muted-foreground">남음</div>
                </div>
              </div>
            </div>

            {filteredDailyTasks.length === 0 ? (
              <Card className="bg-card border-2 border-border">
                <CardContent className="p-8 text-center">
                  <p className="font-korean text-muted-foreground">
                    {dailyTasks.length > 0 
                      ? "오늘 할 일을 모두 마쳤습니다! 🎉" 
                      : "오늘 예정된 일정이 없습니다."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredDailyTasks.map((task, index) => (
                <Card
                  key={task.id}
                  className={cn(
                    "bg-card border-2 transition-all shadow-card animate-slide-up",
                    task.completed ? "border-success" : task.failed ? "border-destructive" : "border-border"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className="font-korean text-lg text-foreground">{task.goal?.title}</h3>
                            <div className="font-korean text-xs text-muted-foreground mt-1">
                              총 보상: {task.goal?.powder_reward ?? 100} 가루 (마감일 일괄 지급)
                            </div>
                          </div>
                          {task.goal && (
                            <div className="flex gap-1">
                              {Array.from({ length: task.goal.difficulty }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => completeDailyTask(task.id, task.goal?.id!)}
                            variant="default"
                            size="sm"
                            className="flex-1"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            완료
                          </Button>
                          <Button
                            onClick={() => failDailyTask(task.id, task.goal?.id!)}
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            실패
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}