import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import { loadGoogleIdentity } from "@/integrations/google/gis";
import { getGoogleUserInfo } from "@/integrations/google/gis";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();              // ✅ 추가
  const { login, register, loginWithGoogle } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast({ title: "로그인 성공!", description: "환영합니다!" });
        navigate("/");
      } else {
        await register(email, password, displayName || "모험가");
        toast({
          title: "회원가입 성공!",
          description: "자동으로 로그인되었습니다.",
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ 새로 구현한 Google 로그인 버튼용 핸들러
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // 1) Google에서 이메일/이름/고유 ID 받아오기
      const profile = await getGoogleUserInfo();

      // 2) 백엔드로 보내서 회원 생성/로그인
      await loginWithGoogle({
        email: profile.email,
        displayName: profile.name,
        googleId: profile.sub,
      });

      toast({
        title: "로그인 성공!",
        description: "Google 계정으로 로그인되었습니다.",
      });
      navigate("/");
    } catch (error: any) {
      console.error("[Google Login] error:", error);
      toast({
        title: "Google 로그인 실패",
        description: error?.message ?? "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
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

        <h1 className="font-pixel text-2xl sm:text-3xl mb-2 text-center text-foreground">
          QuestPet
        </h1>
        <p className="font-korean text-center text-muted-foreground mb-8">
          {isLogin ? "다시 만나서 반가워요!" : "새로운 모험을 시작하세요!"}
        </p>

        <Card className="bg-card border-2 border-border shadow-neon">
          <CardContent className="p-6">
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="displayName" className="font-korean">
                    닉네임
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="모험가의 이름을 지어주세요"
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="font-korean">
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="example@email.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password" className="font-korean">
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="비밀번호를 입력하세요"
                  className="mt-1"
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading
                  ? "처리 중..."
                  : isLogin
                  ? "로그인"
                  : "회원가입"}
              </Button>
            </form>

            <div className="mt-4">
              <Button
                type="button"
                onClick={handleGoogleLogin}        // ✅ 이제 정의된 함수
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Google 계정으로 시작하기
              </Button>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-korean text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLogin
                  ? "계정이 없으신가요? 회원가입"
                  : "이미 계정이 있으신가요? 로그인"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
