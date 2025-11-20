// front/src/integrations/google/gis.ts

/**
 * Google Identity Services & OAuth2 Helper
 *
 * - loadGoogleIdentity(): GSI 스크립트 로드
 * - getCalendarAccessToken(): Google Calendar용 access token 발급
 * - getValidAccessToken(): 로컬 캐시를 고려한 유효 토큰 반환
 * - clearCalendarToken(): 캘린더용 토큰 캐시 삭제
 * - getGoogleUserInfo(): 로그인용(이메일/이름/고유 ID) 정보 조회
 */

let gisLoaded = false;

/**
 * Google Identity Services 스크립트를 1번만 로드
 */
export async function loadGoogleIdentity(): Promise<void> {
  if (gisLoaded) return;

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      gisLoaded = true;
      resolve();
    };
    s.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
};

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const CALENDAR_SCOPES =
  "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";

const CAL_TOKEN_KEY = "google_calendar_token";
const CAL_EXPIRES_KEY = "google_calendar_expires_at";

/**
 * access token + 만료시각을 로컬스토리지에 캐시
 */
function cacheCalendarToken(token: TokenResponse) {
  const expiresAt = Date.now() + (token.expires_in - 30) * 1000; // 30초 여유
  localStorage.setItem(CAL_TOKEN_KEY, token.access_token);
  localStorage.setItem(CAL_EXPIRES_KEY, String(expiresAt));
}

/**
 * 만료 여부를 확인한 뒤, 유효한 캘린더 토큰이 있으면 반환
 */
export function getCachedAccessToken(): string | null {
  const token = localStorage.getItem(CAL_TOKEN_KEY);
  const expiresAt = localStorage.getItem(CAL_EXPIRES_KEY);

  if (!token || !expiresAt) return null;
  if (Date.now() >= Number(expiresAt)) {
    // 만료된 토큰 제거
    localStorage.removeItem(CAL_TOKEN_KEY);
    localStorage.removeItem(CAL_EXPIRES_KEY);
    return null;
  }
  return token;
}

/**
 * Google Calendar용 access token 신규 발급
 */
export async function getCalendarAccessToken(): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error("VITE_GOOGLE_CLIENT_ID 가 설정되어 있지 않습니다.");
  }

  await loadGoogleIdentity();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    throw new Error("Google OAuth2 클라이언트를 초기화할 수 없습니다.");
  }

  const token = await new Promise<TokenResponse>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: CALENDAR_SCOPES,
      callback: (t: TokenResponse) => {
        if (!t?.access_token) {
          reject(new Error("토큰을 받지 못했습니다."));
          return;
        }
        resolve(t);
      },
      error_callback: (err: unknown) => {
        console.error("[GCAL] token error", err);
        reject(
          err instanceof Error ? err : new Error("토큰 요청 중 오류가 발생했습니다.")
        );
      },
    });

    client.requestAccessToken();
  });

  cacheCalendarToken(token);
  return token.access_token;
}

/**
 * 로컬 캐시를 우선 사용하고, 없으면 새로 발급
 */
export async function getValidAccessToken(): Promise<string> {
  const cached = getCachedAccessToken();
  if (cached) return cached;
  return await getCalendarAccessToken();
}

/**
 * 캘린더 토큰 캐시 삭제
 */
export function clearCalendarToken() {
  localStorage.removeItem(CAL_TOKEN_KEY);
  localStorage.removeItem(CAL_EXPIRES_KEY);
}

/* ------------------------------------------------------------------ */
/*  Google 로그인용: 사용자 프로필 정보 (이메일/이름/고유 ID)             */
/* ------------------------------------------------------------------ */

export interface GoogleUserInfo {
  email: string;
  name?: string;
  sub: string; // Google 고유 ID
}

/**
 * Google OAuth2 토큰 클라이언트를 이용해
 * 1) openid email profile 스코프로 access token 발급
 * 2) https://www.googleapis.com/oauth2/v3/userinfo 에서 프로필 조회
 */
export async function getGoogleUserInfo(): Promise<GoogleUserInfo> {
  if (!CLIENT_ID) {
    throw new Error("VITE_GOOGLE_CLIENT_ID 가 설정되어 있지 않습니다.");
  }

  await loadGoogleIdentity();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    throw new Error("Google OAuth2 클라이언트를 초기화할 수 없습니다.");
  }

  // 1) access token 발급
  const token = await new Promise<TokenResponse>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "openid email profile",
      callback: (t: TokenResponse) => {
        if (!t?.access_token) {
          reject(new Error("토큰을 받지 못했습니다."));
          return;
        }
        resolve(t);
      },
      error_callback: (err: unknown) => {
        console.error("[Google Login] token error", err);
        reject(
          err instanceof Error ? err : new Error("토큰 요청 중 오류가 발생했습니다.")
        );
      },
    });

    client.requestAccessToken();
  });

  // 2) userinfo 엔드포인트에서 사용자 정보 조회
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Google 사용자 정보를 가져오지 못했습니다.");
  }

  const data = await res.json();

  if (!data.email || !data.sub) {
    throw new Error("Google 사용자 정보에 email/sub 이 없습니다.");
  }

  return {
    email: data.email,
    name: data.name,
    sub: data.sub,
  };
}
