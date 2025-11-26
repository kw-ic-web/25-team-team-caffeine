import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    nav("/auth", { replace: true });
  }, [nav]);

  return <div className="p-6 text-sm text-muted-foreground">로그인 처리 중...</div>;
}
