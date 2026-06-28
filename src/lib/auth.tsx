import { createContext, useContext, useEffect, useMemo, useState } from "react";

// 데모 인증 (작업 C / 가드레일: 정직성).
//
// ⚠️ 백엔드가 없는 client-only 데모다. *진짜 보안 인증*은 서버가 필요하다(Supabase/Firebase/Auth0 등).
//    여기서는 mock 인증으로 "공무원이 실제로 쓰는 앱"의 로그인/로그아웃 흐름만 재현한다.
//    로그인 화면·README에 "데모용 인증" 한계를 명시한다(과장 금지).
//
// 교체 가능성(DoD-C): 아래 AuthProvider 인터페이스를 구현만 바꾸면 실제 OAuth/SSO로 교체된다.
//    UI(Context)는 인터페이스에만 의존하고 구현 세부에 의존하지 않는다.

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  dept: string;
  /** 담당 권역(행정동). "전체"면 전 권역 */
  region: string;
  regionLabel: string;
  initial: string;
}

/** 인증 백엔드 추상화 — 구현만 교체하면 실제 OAuth/SSO로 전환 (mock → real) */
export interface AuthBackend {
  signIn(username: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getSession(): AuthUser | null;
}

interface DemoAccount {
  username: string;
  password: string;
  user: AuthUser;
}

// ⚠️ 데모 계정 — 평문이지만 데모 전용. 실서비스에선 절대 금지(서버 인증 + 해시 + httpOnly 쿠키).
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: "kim",
    password: "demo1234",
    user: {
      id: "u-kim",
      name: "김복지",
      role: "복지정책과 주무관",
      dept: "행복동 행정복지센터",
      region: "라동",
      regionLabel: "라동 권역",
      initial: "김",
    },
  },
  {
    username: "lee",
    password: "demo1234",
    user: {
      id: "u-lee",
      name: "이상담",
      role: "통합사례관리사",
      dept: "행복동 행정복지센터",
      region: "전체",
      regionLabel: "전 권역",
      initial: "이",
    },
  },
];

const STORAGE_KEY = "welfare-demo2.auth.session";

/** Mock 인증 백엔드 — localStorage 세션. (실 Vite 앱이므로 사용 가능) */
class MockAuthBackend implements AuthBackend {
  async signIn(username: string, password: string): Promise<AuthUser> {
    // 데모용 인위적 지연 (네트워크 흉내)
    await new Promise((r) => setTimeout(r, 350));
    const acct = DEMO_ACCOUNTS.find(
      (a) => a.username === username.trim().toLowerCase()
    );
    if (!acct || acct.password !== password) {
      throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(acct.user));
    } catch {
      // localStorage 불가 환경에서도 세션은 메모리로 유지
    }
    return acct.user;
  }

  async signOut(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }

  getSession(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}

// 기본 백엔드(교체 지점). 실서비스: new OAuthAuthBackend(...) 등으로 교체.
const backend: AuthBackend = new MockAuthBackend();

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => backend.getSession());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 다른 탭에서 로그아웃 시 동기화
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setUser(backend.getSession());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      error,
      signIn: async (username, password) => {
        setLoading(true);
        setError(null);
        try {
          const u = await backend.signIn(username, password);
          setUser(u);
        } catch (e) {
          setError(e instanceof Error ? e.message : "로그인에 실패했습니다.");
          throw e;
        } finally {
          setLoading(false);
        }
      },
      signOut: () => {
        void backend.signOut();
        setUser(null);
        setError(null);
      },
    }),
    [user, loading, error]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
