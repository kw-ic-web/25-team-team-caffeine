let gisLoaded = false;

export async function loadGoogleIdentity(): Promise<void> {
  if (gisLoaded) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => { gisLoaded = true; resolve(); };
    s.onerror = () => reject(new Error("Failed to load GIS"));
    document.head.appendChild(s);
  });
}

type TokenResponse = { access_token: string; expires_in: number };

// 토큰/만료시각 캐시
function cacheToken(token: TokenResponse) {
  const expires_at = Date.now() + (token.expires_in - 30) * 1000; // 30초 여유두기ㅣ
  localStorage.setItem("google_calendar_token", token.access_token);
  localStorage.setItem("google_calendar_expires_at", String(expires_at));
}

export function getCachedAccessToken(): string | null {
  const token = localStorage.getItem("google_calendar_token");
  const exp = Number(localStorage.getItem("google_calendar_expires_at") || 0);
  if (!token || !exp) return null;
  if (Date.now() > exp) return null; 
  return token;
}

export async function getCalendarAccessToken(): Promise<string> {
  await loadGoogleIdentity();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const client = google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/calendar.readonly openid email profile",
    prompt: "", // 재요청 시 팝업 줄이기
  });

  const token = await new Promise<TokenResponse>((resolve, reject) => {
    client.callback = (resp: any) => {
      if (resp && resp.access_token) resolve(resp as TokenResponse);
      else reject(new Error("No access token"));
    };
    client.error_callback = (err: any) => reject(err);
    client.requestAccessToken({ prompt: "consent" }); // 최초 1회 동의
  });


  cacheToken(token);
  return token.access_token;
}

// 유효 토큰 보장 헬퍼
export async function getValidAccessToken(): Promise<string> {
  return getCachedAccessToken() || (await getCalendarAccessToken());
}

// 연결 해제 헬퍼
export function clearCalendarToken() {
  localStorage.removeItem("google_calendar_token");
  localStorage.removeItem("google_calendar_expires_at");
}
