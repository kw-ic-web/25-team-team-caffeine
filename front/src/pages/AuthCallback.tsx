import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      // Supabase가 리다이렉트 후 자동으로 세션을 저장함
      const { data: { user } } = await supabase.auth.getUser();
      // 해당 경로로 이동 (대시보드/홈 등등등)
      nav(user ? "/": "/auth", { replace: true });
    })();
  }, [nav]);

  return <div className="p-6 text-sm text-muted-foreground">로그인 처리 중...</div>;
}
