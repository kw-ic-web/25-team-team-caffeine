import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  getCalendarAccessToken,
  getCachedAccessToken,
  getValidAccessToken,
} from "@/integrations/google/gis";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
}

export default function Calendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventStartDate, setNewEventStartDate] = useState("");
  const [newEventEndDate, setNewEventEndDate] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Google Calendar 연동 상태
  const [gEvents, setGEvents] = useState<any[]>([]);
  const [gLoading, setGLoading] = useState(false);
  const [gConnected, setGConnected] = useState<boolean>(!!getCachedAccessToken());

  // async function fetchGoogleCalendar() {
  //   try {
  //     setGLoading(true);  
  //     // 캐시된 토큰이 있으면 사용, 없으면 최초 동의 후 발급받기
  //     const token = await getValidAccessToken();

  //     const url =
  //       "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
  //       "?maxResults=50&singleEvents=true&orderBy=startTime" +
  //       `&timeMin=${new Date().toISOString()}`;

  //       const res =await fetch(url, {
  //         headers : { Authorization: `Bearer ${token}` },
  //       })


  //     if (!res.ok) throw new Error("Google Calendar API 호출 실패");

  //     const data = await res.json();
  //     setGEvents(data.items || []);
  //     setGConnected(true);
  //   } catch (e: any) {
  //     console.error(e);
  //     toast({
  //       title: "구글 캘린더 연동 실패",
  //       description: e.message || "다시 시도해 주세요.",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setGLoading(false);
  //   }
  // }

  async function fetchGoogleCalendar() {
  try {
    setGLoading(true);
    const token = await getValidAccessToken();

    // 과거 30일 ~ 미래 60일 구간으로 넉넉하게
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const url =
      "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
      `?singleEvents=true&orderBy=startTime&maxResults=100` +
      `&timeMin=${encodeURIComponent(timeMin)}` +
      `&timeMax=${encodeURIComponent(timeMax)}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();

    console.log("[GCAL] items", Array.isArray(data.items) ? data.items.length : 0);
    if (!res.ok) throw new Error(data.error?.message || "Google Calendar API 호출 실패");

    setGEvents(data.items || []);
    setGConnected(true);
  } catch (e: any) {
    console.error(e);
    toast({
      title: "구글 캘린더 연동 실패",
      description: e.message || "다시 시도해 주세요.",
      variant: "destructive",
    });
  } finally {
    setGLoading(false);
  }
}


  async function debugListCalendars() {
    try {
      const token = await getValidAccessToken();
      const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("[GCAL] calendarList", data);
      toast({
        title: "콘솔에서 캘린더 목록 확인!",
        description: `${data.items?.length || 0}개의 캘린더가 있습니다.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "캘린더 목록 조회 실패",
        description: e.message,
        variant: "destructive",
      });
    }
  }




  useEffect(() => {
    checkAuth();
    loadEvents();
  
    if (getCachedAccessToken()) {
      fetchGoogleCalendar(); 
    }
  }, []);


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

  const loadEvents = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", session.user.id)
      .order("start_date", { ascending: true });

    if (error) {
      toast({
        title: "내 일정 불러오기 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setEvents(data);
    }
  };

  const addEvent = async () => {
    if (!newEventTitle.trim() || !newEventStartDate) {
      toast({
        title: "필수 항목을 입력해주세요",
        description: "제목과 시작 날짜는 필수입니다.",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setLoading(true);

    const { error } = await supabase.from("calendar_events").insert({
      user_id: session.user.id,
      title: newEventTitle,
      description: newEventDescription,
      start_date: newEventStartDate,
      end_date: newEventEndDate || newEventStartDate,
    });

    if (error) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "일정 추가 완료!" });
      setNewEventTitle("");
      setNewEventDescription("");
      setNewEventStartDate("");
      setNewEventEndDate("");
      setOpen(false);
      loadEvents();
    }

    setLoading(false);
  };

  const selectedDateEvents = events.filter((event) => {
    if (!date) return false;
    const eventDate = new Date(event.start_date);
    return (
      eventDate.getDate() === date.getDate() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getFullYear() === date.getFullYear()
    );
  });

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-pixel text-2xl sm:text-3xl mb-4 text-foreground">
            캘린더
          </h1>

          {/* 상단 액션 영역: 내 일정 추가 + 구글 캘린더 연결 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  <Plus className="w-5 h-5" />
                  일정 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-pixel">새로운 일정 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="font-korean">
                      일정 제목
                    </Label>
                    <Input
                      id="title"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="일정 제목"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="font-korean">
                      설명
                    </Label>
                    <Textarea
                      id="description"
                      value={newEventDescription}
                      onChange={(e) => setNewEventDescription(e.target.value)}
                      placeholder="일정 설명"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate" className="font-korean">
                      시작 날짜
                    </Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={newEventStartDate}
                      onChange={(e) => setNewEventStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="font-korean">
                      종료 날짜
                    </Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={newEventEndDate}
                      onChange={(e) => setNewEventEndDate(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={addEvent}
                    variant="hero"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "추가 중..." : "일정 추가"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="lg"
              onClick={fetchGoogleCalendar}
              disabled={gLoading}
              className="w-full sm:w-auto"
            >
              {gConnected ? (gLoading ? "새로고침..." : "구글 일정 새로고침") : "구글 캘린더 연결"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-2 border-border shadow-card">
            <CardContent className="p-6">
              <CalendarUI
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-2 border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="font-pixel text-lg mb-4 text-foreground">
                {date
                  ? `${date.getMonth() + 1}월 ${date.getDate()}일의 일정`
                  : "날짜를 선택하세요"}
              </h3>
              <div className="space-y-3">
                {selectedDateEvents.length === 0 ? (
                  <p className="font-korean text-sm text-muted-foreground">
                    이날은 일정이 없습니다.
                  </p>
                ) : (
                  selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 bg-muted/50 rounded-sm border border-border hover:border-primary transition-all"
                    >
                      <h4 className="font-korean font-bold">{event.title}</h4>
                      {event.description && (
                        <p className="font-korean text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                      <p className="font-korean text-xs text-muted-foreground mt-2">
                        {new Date(event.start_date).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 내 전체 일정 */}
        <Card className="mt-6 bg-card border-2 border-border shadow-card">
          <CardContent className="p-6">
            <h3 className="font-pixel text-lg mb-4 text-foreground">전체 일정</h3>
            <div className="space-y-3">
              {events.length === 0 ? (
                <p className="font-korean text-sm text-muted-foreground">
                  등록된 일정이 없습니다.
                </p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-muted/50 rounded-sm border border-border hover:border-primary transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-korean font-bold">{event.title}</h4>
                        {event.description && (
                          <p className="font-korean text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <p className="font-korean text-xs text-muted-foreground">
                        {new Date(event.start_date).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-card border-2 border-border shadow-card">
          <CardContent className="p-6">
            <h3 className="font-pixel text-lg mb-4 text-foreground">Google Calendar</h3>

            {!gConnected && (
              <p className="font-korean text-sm text-muted-foreground">
                상단의 “구글 캘린더 연결” 버튼을 눌러 연동하세요.
              </p>
            )}

            {gConnected && (
              <div className="space-y-3">
                {gLoading && (
                  <p className="font-korean text-sm text-muted-foreground">
                    불러오는 중...
                  </p>
                )}
                {!gLoading && gEvents.length === 0 ? (
                  <p className="font-korean text-sm text-muted-foreground">
                    표시할 구글 일정이 없습니다.
                  </p>
                ) : (
                  gEvents.map((ev: any) => {
                    const start = ev.start?.dateTime || ev.start?.date;
                    const end = ev.end?.dateTime || ev.end?.date;
                    return (
                      <div
                        key={ev.id}
                        className="p-4 bg-muted/50 rounded-sm border border-border hover:border-primary transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-korean font-bold">
                              {ev.summary || "(제목 없음)"}
                            </h4>
                            {ev.location && (
                              <p className="font-korean text-xs text-muted-foreground mt-1">
                                {ev.location}
                              </p>
                            )}
                          </div>
                          <p className="font-korean text-xs text-muted-foreground">
                            {start ? new Date(start).toLocaleString("ko-KR") : ""}
                            {end ? ` ~ ${new Date(end).toLocaleString("ko-KR")}` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
