import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check, Star, Calendar, TrendingUp, X, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { localYMD } from "@/lib/date";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


interface Goal {
  id: string;
  title: string;
  completed: boolean;
  progress: number;
  difficulty: number;
  powder_reward: number;
  due_date: string;
  schedule_type: 'none' | 'daily' | 'specific_days' | 'final_day_only';
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

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDifficulty, setNewGoalDifficulty] = useState(1);
  const [newGoalDueDate, setNewGoalDueDate] = useState("");
  const [newGoalReward, setNewGoalReward] = useState(100);
  const [scheduleType, setScheduleType] = useState<'none' | 'daily' | 'specific_days' | 'final_day_only'>('none');
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

  const daysOfWeek = [
    { label: "월", value: 1 },
    { label: "화", value: 2 },
    { label: "수", value: 3 },
    { label: "목", value: 4 },
    { label: "금", value: 5 },
    { label: "토", value: 6 },
    { label: "일", value: 0 },
  ];

  useEffect(() => {
    checkAuth();
    loadGoals();
    loadCalendarEvents();
    loadDailyTasks();
    loadCompletedArchiveCount();
  }, []);

  useEffect(() => {
    calculateReward();
  }, [newGoalDifficulty, newGoalDueDate]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "로그인이 필요합니다",
        description: "로그인 후 이용해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
    }
  };

  const loadGoals = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const today = localYMD();

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("completed", false)                    // (선택) 완료된 건 진행 목록에서 제외
      .or(`due_date.is.null,due_date.gte.${today}`) // ⬅ 오늘 이후 + due_date 없음
      .order("created_at", { ascending: false });

    if (!error && data) setGoals(data as Goal[]);
  };

  const loadDailyTasks = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const today = new Date().toISOString().split('T')[0];

    const { data: tasksData } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("task_date", today);

    if (tasksData) {
      const tasksWithGoals = await Promise.all(
        tasksData.map(async (task) => {
          const { data: goalData } = await supabase
            .from("goals")
            .select("*")
            .eq("id", task.goal_id)
            .single();
          
          return { ...task, goal: goalData as Goal };
        })
      );
      
      setDailyTasks(tasksWithGoals as DailyTask[]);
    }
    await generateDailyTasks();
  };
  const loadCompletedArchiveCount = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // completed=true 인 목표 개수만 정확히 집계
    const { count, error } = await supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("completed", true);

    if (!error && typeof count === "number") {
      setCompletedArchiveCount(count);
    }
  };
  const generateDailyTasks = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayDayOfWeek = today.getDay();

    const { data: goalsData } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", session.user.id)
      .neq("schedule_type", "none");

    if (!goalsData) return;

    for (const goal of goalsData) {
      const { data: existingTask } = await supabase
        .from("daily_tasks")
        .select("id")
        .eq("goal_id", goal.id)
        .eq("task_date", todayStr)
        .maybeSingle();

      if (existingTask) continue;

      let shouldCreateTask = false;

      if (goal.schedule_type === "daily") {
        shouldCreateTask = true;
      } else if (goal.schedule_type === "specific_days" && goal.schedule_days) {
        shouldCreateTask = goal.schedule_days.includes(todayDayOfWeek);
      } else if (goal.schedule_type === "final_day_only" && goal.due_date) {
        shouldCreateTask = goal.due_date === todayStr;
      }

      if (shouldCreateTask) {
        await supabase.from("daily_tasks").insert({
          goal_id: goal.id,
          user_id: session.user.id,
          task_date: todayStr,
        });
      }
    }
    loadDailyTasks();
  };

  const loadCalendarEvents = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("calendar_events")
      .select("id, title, start_date, end_date")
      .eq("user_id", session.user.id)
      .order("start_date", { ascending: true });

    if (data) {
      setCalendarEvents(data);
    }
  };

  const handleTitleChange = (value: string) => {
    setNewGoalTitle(value);
    
    if (value.trim().length > 0) {
      const filtered = calendarEvents.filter((event) =>
        event.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredEvents(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredEvents([]);
    }
  };

  const selectEvent = (event: CalendarEvent) => {
    setNewGoalTitle(event.title);
    if (event.end_date) {
      setNewGoalDueDate(event.end_date.split('T')[0]);
    } else {
      setNewGoalDueDate(event.start_date.split('T')[0]);
    }
    setShowSuggestions(false);
    setFilteredEvents([]);
  };

  const calculateReward = () => {
    let reward = 100;
    reward += (newGoalDifficulty - 1) * 50;
    
    if (newGoalDueDate) {
      const today = new Date();
      const dueDate = new Date(newGoalDueDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        const weeks = Math.floor(diffDays / 7);
        reward += weeks * 25;
      }
    }
    
    setNewGoalReward(reward);
  };

  const completeDailyTask = async (taskId: string, goalId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const task = dailyTasks.find((t) => t.id === taskId);
    const goal = goals.find((g) => g.id === goalId);
    if (!task || !goal) return;

    const { error } = await supabase
      .from("daily_tasks")
      .update({ completed: true })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const { data: powderData } = await supabase
      .from("user_powder")
      .select("amount")
      .eq("user_id", session.user.id)
      .single();

    if (powderData) {
      await supabase
        .from("user_powder")
        .update({ amount: powderData.amount + goal.daily_powder_reward })
        .eq("user_id", session.user.id);
    }

    const newCompletedDays = (goal.completed_days || 0) + 1;
    const newProgress = goal.total_days > 0 
      ? Math.round((newCompletedDays / goal.total_days) * 100)
      : goal.progress;

    const isGoalCompleted = newProgress >= 100;

    await supabase
      .from("goals")
      .update({
        completed_days: newCompletedDays,
        progress: newProgress,
        completed: isGoalCompleted,
      })
      .eq("id", goalId);

    if (isGoalCompleted) {
      if (powderData) {
        await supabase
          .from("user_powder")
          .update({ amount: powderData.amount + goal.daily_powder_reward + goal.powder_reward })
          .eq("user_id", session.user.id);
      }

      toast({
        title: "전체 목표 달성!",
        description: `${goal.powder_reward} 가루를 추가로 획득했습니다!`,
      });
    } else {
      toast({
        title: "오늘의 목표 완료!",
        description: `${goal.daily_powder_reward} 가루를 획득했습니다!`,
      });
    }

    loadGoals();
    loadDailyTasks();
  };

  const failDailyTask = async (taskId: string, goalId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const task = dailyTasks.find((t) => t.id === taskId);
    const goal = goals.find((g) => g.id === goalId);
    if (!task || !goal) return;

    const { error } = await supabase
      .from("daily_tasks")
      .update({ failed: true })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const { data: powderData } = await supabase
      .from("user_powder")
      .select("amount")
      .eq("user_id", session.user.id)
      .single();

    if (powderData) {
      const newAmount = Math.max(0, powderData.amount - 30);
      await supabase
        .from("user_powder")
        .update({ amount: newAmount })
        .eq("user_id", session.user.id);
    }
    const newCompletedDays = (goal.completed_days || 0) + 1;
    const newProgress = goal.total_days > 0 
      ? Math.round((newCompletedDays / goal.total_days) * 100)
      : goal.progress;

    await supabase
      .from("goals")
      .update({
        completed_days: newCompletedDays,
        progress: newProgress,
      })
      .eq("id", goalId);

    toast({
      title: "목표 실패",
      description: "30 가루가 차감되었습니다.",
      variant: "destructive",
    });

    loadGoals();
    loadDailyTasks();
  };

  const toggleDaySelection = (day: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const calculateTotalDays = () => {
    if (!newGoalDueDate || scheduleType === 'none' || scheduleType === 'final_day_only') {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(newGoalDueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays <= 0) return 0;

    if (scheduleType === 'daily') {
      return diffDays;
    } else if (scheduleType === 'specific_days') {
      let count = 0;
      for (let i = 0; i < diffDays; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        if (selectedDays.includes(checkDate.getDay())) {
          count++;
        }
      }
      return count;
    }

    return 0;
  };

  const addGoal = async () => {
    if (!newGoalTitle.trim()) {
      toast({
        title: "제목을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    if (scheduleType === 'specific_days' && selectedDays.length === 0) {
      toast({
        title: "요일을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setLoading(true);

    const totalDays = calculateTotalDays();

    const { error } = await supabase.from("goals").insert({
      user_id: session.user.id,
      title: newGoalTitle,
      difficulty: newGoalDifficulty,
      due_date: newGoalDueDate || null,
      powder_reward: newGoalReward,
      schedule_type: scheduleType,
      schedule_days: scheduleType === 'specific_days' ? selectedDays : null,
      daily_powder_reward: 50,
      total_days: totalDays,
      completed_days: 0,
    });

    if (error) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "목표 추가 완료!",
      });
      setNewGoalTitle("");
      setNewGoalDifficulty(1);
      setNewGoalDueDate("");
      setNewGoalReward(100);
      setScheduleType('none');
      setSelectedDays([]);
      setOpen(false);
      loadGoals();
      loadDailyTasks();
    }

    setLoading(false);
  };

  const completedCount = completedArchiveCount;
  const remainingCount = goals.length;
  const todayTasksCompleted = dailyTasks.filter((t) => t.completed).length;
  const todayTasksRemaining = dailyTasks.filter((t) => !t.completed && !t.failed).length;

  const getScheduleLabel = (goal: Goal) => {
    if (goal.schedule_type === 'daily') return '매일';
    if (goal.schedule_type === 'specific_days' && goal.schedule_days) {
      const dayLabels = goal.schedule_days
        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
        .map((d) => daysOfWeek.find((day) => day.value === d)?.label)
        .join(',');
      return dayLabels;
    }
    if (goal.schedule_type === 'final_day_only') return '마지막날';
    return '';
  };

  const getDaysRemaining = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="font-korean">
                    목표 제목
                  </Label>
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
                            if (newGoalTitle.trim() && filteredEvents.length > 0) {
                              setShowSuggestions(true);
                            }
                          }}
                        />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-full p-0" 
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <Command>
                        <CommandList>
                          <CommandEmpty className="font-korean text-sm p-2">
                            일치하는 일정이 없습니다.
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredEvents.map((event) => (
                              <CommandItem
                                key={event.id}
                                onSelect={() => selectEvent(event)}
                                className="font-korean cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <div>
                                    <div>{event.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(event.start_date).toLocaleDateString('ko-KR')}
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
                  <Label htmlFor="difficulty" className="font-korean">
                    난이도 (★)
                  </Label>
                  <Input
                    id="difficulty"
                    type="number"
                    min="1"
                    max="5"
                    value={newGoalDifficulty}
                    onChange={(e) => setNewGoalDifficulty(Number(e.target.value))}
                  />
                  <div className="text-xs text-muted-foreground mt-1 font-korean">
                    난이도 1당 +50 가루
                  </div>
                </div>
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
                  <div className="text-xs text-muted-foreground mt-1 font-korean">
                    1주일당 +25 가루
                  </div>
                </div>
                <div>
                  <Label htmlFor="reward" className="font-korean">
                    보상 가루 (자동 계산)
                  </Label>
                  <Input
                    id="reward"
                    type="number"
                    min="1"
                    value={newGoalReward}
                    readOnly
                    className="bg-muted"
                  />
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
                {scheduleType === 'specific_days' && (
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
                          <Label
                            htmlFor={`day-${day.value}`}
                            className="font-korean cursor-pointer"
                          >
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  onClick={addGoal}
                  variant="hero"
                  className="w-full"
                  disabled={loading}
                >
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
                            <h3
                              className={cn(
                                "font-korean text-lg",
                                goal.completed ? "text-muted-foreground line-through" : "text-foreground"
                              )}
                            >
                              {goal.title}
                              {goal.due_date && ` (${getDueDisplay(goal.due_date, getScheduleLabel(goal))})`}
                            </h3>
                            <div className="font-korean text-xs text-muted-foreground mt-1">
                              보상: {goal.powder_reward} 가루
                              {goal.schedule_type !== 'none' && ` | 일일 보상: ${goal.daily_powder_reward} 가루`}
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

            {dailyTasks.length === 0 ? (
              <Card className="bg-card border-2 border-border">
                <CardContent className="p-8 text-center">
                  <p className="font-korean text-muted-foreground">오늘의 일정이 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              dailyTasks.map((task, index) => (
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
                            <h3 className="font-korean text-lg text-foreground">
                              {task.goal?.title}
                            </h3>
                            <div className="font-korean text-xs text-muted-foreground mt-1">
                              보상: {task.goal?.daily_powder_reward || 50} 가루
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

                        {!task.completed && !task.failed ? (
                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={() => completeDailyTask(task.id, task.goal_id)}
                              variant="default"
                              size="sm"
                              className="flex-1"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              완료
                            </Button>
                            <Button
                              onClick={() => failDailyTask(task.id, task.goal_id)}
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              실패
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-4 p-3 rounded-lg bg-muted">
                            <p className="font-korean text-sm text-center">
                              {task.completed ? "✅ 완료됨" : "❌ 실패"}
                            </p>
                          </div>
                        )}
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
function getDaysRemaining(dueDate: string) {
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, (m ?? 1) - 1, d ?? 1);
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getDueDisplay(dueDate: string, scheduleLabel?: string) {
  const remain = getDaysRemaining(dueDate);
  if (remain < 0) return "종료됨";
  if (remain === 0) return `오늘 마감${scheduleLabel ? `, ${scheduleLabel}` : ""}`;
  return `${remain}일 남음${scheduleLabel ? `, ${scheduleLabel}` : ""}`;
}