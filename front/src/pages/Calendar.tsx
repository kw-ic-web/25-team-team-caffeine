import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Calendar as CalendarUI } from "@/components/ui/calendar.tsx";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

import {
  getCalendarAccessToken,
  getCachedAccessToken,
  getValidAccessToken,
} from "@/integrations/google/gis.ts";

import { calendarApi, type CalendarEvent as ApiCalendarEvent } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type CalendarEvent = ApiCalendarEvent;

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
  const { user, loading: authLoading } = useAuth();

  // Google Calendar 연동 상태
  const [gEvents, setGEvents] = useState<any[]>([]);
  const [gLoading, setGLoading] = useState(false);
  const [gConnected, setGConnected] = useState<boolean>(
    !!getCachedAccessToken()
  );

  async function fetchGoogleCalendar() {
  try {
    setGLoading(true);
    const token = await getValidAccessToken();

    // 과거 30일 ~ 미래 60일 구간
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

 function GoogleCalendarSection({
  title = "Google Calendar",
  events,
}:{
  title?: string;
  events: CalendarEvent[];
}){
  return (
    <section className="mt-4">
      <h2 className="text-xl font-bold mb-2">{title}</h2>

      {events.length === 0 ? (
        <p>불러온 일정이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="border rounded-lg p-3 text-sm flex flex-col gap-1"
            >
              <div className="font-semibold">{event.title}</div>
              <div className="text-xs opacity-70">
                {event.start_date} ~ {event.end_date}
              </div>
              {event.description && (
                <div className="text-xs">{event.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
} 


  async function debugListCalendars() {
    try {
      const token = await getValidAccessToken();
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
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

  // 로그인 여부 체크 + 일정 로딩
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "로그인 후 이용해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // 로그인 되어 있으면 내 일정 로딩
    loadEvents();

    // Google AccessToken 캐시가 있으면 바로 연동 시도
    if (getCachedAccessToken()) {
      fetchGoogleCalendar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const loadEvents = async () => {
    try {
      const data = await calendarApi.list();
      setEvents(data);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "내 일정 불러오기 실패",
        description: err.message || "다시 시도해 주세요.",
        variant: "destructive",
      });
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

    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "로그인 후 다시 시도해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      await calendarApi.create({
        title: newEventTitle,
        description: newEventDescription || null,
        startDate: newEventStartDate,
        endDate: newEventEndDate || newEventStartDate,
      });

      toast({ title: "일정 추가 완료!" });
      setNewEventTitle("");
      setNewEventDescription("");
      setNewEventStartDate("");
      setNewEventEndDate("");
      setOpen(false);
      loadEvents();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "오류 발생",
        description: err.message || "다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  const selectedGoogleEvents = gEvents.filter((ev) => {
    if (!date) return false;
    const startStr = ev.start?.dateTime || ev.start?.date;
    if (!startStr) return false;
    const start = new Date(startStr);
    return (
      start.getDate() === date.getDate() &&
      start.getMonth() === date.getMonth() &&
      start.getFullYear() === date.getFullYear()
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
                  <DialogTitle className="font-pixel">
                    새로운 일정 추가
                  </DialogTitle>
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
                      onChange={(e) =>
                        setNewEventDescription(e.target.value)
                      }
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
                      onChange={(e) =>
                        setNewEventStartDate(e.target.value)
                      }
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
              {gConnected
                ? gLoading
                  ? "새로고침..."
                  : "구글 일정 새로고침"
                : "구글 캘린더 연결"}
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
                {/* 로컬 + 구글 일정이 모두 비어있을 때만 문구 출력 */}
                {selectedDateEvents.length === 0 && selectedGoogleEvents.length === 0 ? (
                  <p className="font-korean text-sm text-muted-foreground">
                    이날은 일정이 없습니다.
                  </p>
                ) : (
                  <>
                    {/* 1) 기존 로컬 일정 부분 그대로 유지 */}
                    {selectedDateEvents.map((event) => (
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
                    ))}

                    {/* 2) 선택한 날짜의 Google Calendar 일정 추가로 표시 */}
                  {selectedGoogleEvents.map((ev: any) => {
                    // 🔹 원본 시작/끝 값 꺼내기
                    const startRaw = ev.start?.dateTime ?? ev.start?.date;
                    const endRaw = ev.end?.dateTime ?? ev.end?.date;

                    // 🔹 Date 객체로 변환
                    const startDate = startRaw ? new Date(startRaw) : null;
                    const endDate = endRaw ? new Date(endRaw) : null;

                    // 🔹 dateTime 이 있으면 시간 이벤트, 없고 date 만 있으면 종일 이벤트
                    const hasTimeStart = !!ev.start?.dateTime;
                    const hasTimeEnd = !!ev.end?.dateTime;

                    const startLabel = startDate
                      ? hasTimeStart
                        ? startDate.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "종일"
                      : "";

                    const endLabel =
                      endDate && hasTimeEnd
                        ? endDate.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";

                    // 🔹 여기부터는 너가 보내준 JSX 그대로
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
                            {startLabel}
                            {endLabel && ` ~ ${endLabel}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 내 전체 일정 */}
        <Card className="mt-6 bg-card border-2 border-border shadow-card">
          <CardContent className="p-6">
            <h3 className="font-pixel text-lg mb-4 text-foreground">
              전체 일정
            </h3>
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
                        <h4 className="font-korean font-bold">
                          {event.title}
                        </h4>
                        {event.description && (
                          <p className="font-korean text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <p className="font-korean text-xs text-muted-foreground">
                        {new Date(
                          event.start_date
                        ).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar 일정 */}
        <Card className="mt-6 bg-card border-2 border-border shadow-card">
          <CardContent className="p-6">
            <h3 className="font-pixel text-lg mb-4 text-foreground">
              Google Calendar
                {date && (
                  <span className="font-korean text-sm text-muted-foreground ml-2">
                    ({date.getMonth() + 1}월 {date.getDate()}일)
                  </span>
                )}
              </h3>

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

                {!gLoading && !date && (
                  <p className="font-korean text-sm text-muted-foreground">
                    날짜를 선택하면 해당 날짜의 일정을 볼 수 있습니다.
                  </p>
                )}


                {!gLoading && gEvents.length === 0 && (
                  <p className="font-korean text-sm text-muted-foreground">
                    표시할 구글 일정이 없습니다.
                  </p>
                )}

                  {!gLoading && date && selectedGoogleEvents.length > 0 &&(
                    <>
                  {selectedGoogleEvents.map((ev: any) => {
                    const start = ev.start?.dateTime || ev.start?.date;
                    const end = ev.end?.dateTime || ev.end?.date;

                    const startDate = start ? new Date(start) : null;
                    const endDate = end ? new Date(end) : null;

                    const hasTimeStart = !!ev.start?.dateTime;
                    const hasTimeEnd = !!ev.end?.dateTime;

                    const startLabel = startDate

                        ? hasTimeStart
                          ? startDate.toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "종일"
                        : "";

                      const endLabel = 
                        endDate && hasTimeEnd
                          ? endDate.toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                        : "";
                        
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
                            {startLabel}
                            {endLabel && ` ~ ${endLabel}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
