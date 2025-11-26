import type { User } from "../types/user";

const API_URL = import.meta.env.VITE_API_URL as string;
if (!API_URL) throw new Error("VITE_API_URL 이 설정되어 있지 않습니다.");

const TOKEN_KEY = "questpet_token";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Community
export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  display_name: string | null;
}

export interface CommunityComment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  display_name: string | null;
}

export interface CommunityChallenge {
  id: string;
  name: string;
  category: string | null;
  deadline: string | null;
  created_at: string;
}

export interface RankingEntry {
  user_id: string;
  total_exp: number;
  rank: number;
  reward_garu: number;
  display_name: string;
  daily_exp: number[];
}


async function request<T>(
  path: string,
  options: RequestInit = {},
  auth: boolean = false
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  return (await res.json()) as T;
}

// ===== Auth =====
interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  register(email: string, password: string, displayName?: string) {
    return request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // ✅ Google OAuth용 – 이메일/이름/Google ID 받아서 로그인
  googleLogin(profile: {
    email: string;
    displayName?: string;
    googleId: string;
  }) {
    return request<AuthResponse>("/api/auth/google/callback", {
      method: "POST",
      body: JSON.stringify(profile),
    });
  },

  me() {
    return request<User>("/api/users/me", {}, true);
  },
};

// ===== Goals =====
export interface Goal {
  id: string;
  title: string;
  completed: boolean;
  progress: number;
  difficulty: number;
  powder_reward: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export const goalsApi = {
  list() {
    return request<Goal[]>("/api/goals", {}, true);
  },
  create(payload: {
    title: string;
    difficulty?: number;
    powderReward?: number;
    dueDate?: string | null;
  }) {
    return request<Goal>(
      "/api/goals",
      { method: "POST", body: JSON.stringify(payload) },
      true
    );
  },
  update(id: string, patch: Partial<Goal> & { powderReward?: number }) {
    const body: any = { ...patch };
    if (patch.powderReward !== undefined) body.powderReward = patch.powderReward;
    return request<{ message: string }>(
      `/api/goals/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
      true
    );
  },
  remove(id: string) {
    return request<{ message: string }>(
      `/api/goals/${id}`,
      { method: "DELETE" },
      true
    );
  },
};

// ===== Pets =====
export type PetRarity = "common" | "rare" | "epic" | "legendary";

export interface Pet {
  id: string;
  name: string;
  level: number;
  rarity: PetRarity;              // ⬅ string → PetRarity
  experience: number;
  stars: number;
  is_main: boolean;
  last_main_change?: string | null;  // ⬅ 메인 변경 시간 (옵션)
  created_at: string;
  updated_at: string;
}

export const petsApi = {
  list() {
    return request<Pet[]>("/api/pets", {}, true);
  },
  create(payload: { name: string; rarity?: string }) {
    return request<Pet>(
      "/api/pets",
      { method: "POST", body: JSON.stringify(payload) },
      true
    );
  },
  update(id: string, patch: Partial<Pet>) {
    return request<{ message: string }>(
      `/api/pets/${id}`,
      { method: "PATCH", body: JSON.stringify(patch) },
      true
    );
  },
  remove(id: string) {
    return request<{ message: string }>(
      `/api/pets/${id}`,
      { method: "DELETE" },
      true
    );
  },
};

// ===== Powder =====
export const powderApi = {
  get() {
    return request<{ amount: number }>("/api/powder", {}, true);
  },
  update(delta: number) {
    return request<{ amount: number }>(
      "/api/powder",
      { method: "POST", body: JSON.stringify({ delta }) },
      true
    );
  },
};

// ===== Calendar =====
export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export const calendarApi = {
  list() {
    return request<CalendarEvent[]>("/api/calendar-events", {}, true);
  },
  create(payload: {
    title: string;
    description?: string | null;
    startDate: string;
    endDate?: string | null;
  }) {
    return request<CalendarEvent>(
      "/api/calendar-events",
      { method: "POST", body: JSON.stringify(payload) },
      true
    );
  },
  update(id: string, patch: Partial<CalendarEvent>) {
    return request<{ message: string }>(
      `/api/calendar-events/${id}`,
      { method: "PATCH", body: JSON.stringify(patch) },
      true
    );
  },
  remove(id: string) {
    return request<{ message: string }>(
      `/api/calendar-events/${id}`,
      { method: "DELETE" },
      true
    );
  },
};

export const communityApi = {
  // 피드(게시글 + 좋아요/댓글 카운트 + 내가 좋아요한 글)
  async getFeed() {
    return request<{
      posts: CommunityPost[];
      likeCounts: Record<string, number>;
      commentCounts: Record<string, number>;
      likedPostIds: string[];
    }>("/api/community/feed", {}, true);
  },

  async getComments(postId: string) {
    return request<CommunityComment[]>(
      `/api/community/posts/${postId}/comments`,
      {},
      true
    );
  },

  async toggleLike(postId: string) {
    return request<{
      liked: boolean;
      likeCount: number;
    }>(
      `/api/community/posts/${postId}/like`,
      { method: "POST" },
      true
    );
  },

  async addComment(postId: string, content: string) {
    return request<CommunityComment>(
      `/api/community/posts/${postId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
      true
    );
  },

  async createPost(content: string, file?: File | null) {
    // 이미지까지 같이 보내려면 FormData 사용
    const formData = new FormData();
    formData.append("content", content);
    if (file) {
      formData.append("image", file);
    }

    const token = getToken();
    const res = await fetch(`${API_URL}/api/community/posts`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    return (await res.json()) as CommunityPost;
  },

  async getChallenges() {
    return request<CommunityChallenge[]>(
      "/api/community/challenges",
      {},
      true
    );
  },

  async createChallenge(payload: {
    title: string;
    category: string;
    deadline?: string | null;
  }) {
    return request<{ id: string }>(
      "/api/community/challenges",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async getRankings() {
    return request<RankingEntry[]>(
      "/api/community/rankings",
      {},
      true
    );
  },
};

// ===== Daily Tasks =====
export interface DailyTask {
  id: string;
  goal_id: string;
  task_date: string;
  completed: boolean;
  failed: boolean;
  goal?: Goal; // 위에서 정의한 Goal 타입이 있다고 가정
}

export const dailyTasksApi = {
  listToday() {
    return request<DailyTask[]>(
      "/api/daily-tasks/today",
      {},
      true
    );
  },
  complete(id: string) {
    return request<{ message: string }>(
      `/api/daily-tasks/${id}/complete`,
      { method: "POST" },
      true
    );
  },
  fail(id: string) {
    return request<{ message: string }>(
      `/api/daily-tasks/${id}/fail`,
      { method: "POST" },
      true
    );
  },
};
