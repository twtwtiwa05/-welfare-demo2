import { useState, type FormEvent } from "react";
import { ShieldCheck, Lock, User, LogIn, AlertCircle, Info } from "lucide-react";
import { useAuth, DEMO_ACCOUNTS } from "../../lib/auth";

// 데모 로그인 화면 (작업 C). "정말 공무원이 쓰는 앱처럼" — 브랜드 + 폼 + 정직성 표기.
export default function LoginScreen() {
  const { signIn, loading, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fillMsg, setFillMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    try {
      await signIn(username, password);
    } catch {
      /* error는 context가 표시 */
    }
  }

  function quickFill(u: string, p: string, name: string) {
    setUsername(u);
    setPassword(p);
    setFillMsg(`${name} 데모 계정이 자동 입력되었습니다. 로그인을 누르세요.`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-hover lg:grid-cols-2">
        {/* 좌: 브랜드 패널 (데스크톱) — 심플·임팩트 */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 p-10 text-white lg:flex">
          {/* 은은한 광 */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />

          <div className="relative flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>
            <span className="text-xs font-semibold tracking-wide text-brand-100/70">
              복지 사각지대 발굴·모니터링 보조 시스템
            </span>
          </div>

          <div className="relative">
            <h2 className="text-[3.5rem] font-bold leading-none tracking-tight">이음누리</h2>
            <p className="mt-3.5 text-sm font-medium text-brand-100/75">
              끊긴 위기 신호와 복지를 잇습니다.
            </p>
          </div>

          <div className="relative flex items-center gap-2.5 text-xs font-medium text-brand-100/45">
            <span>발굴</span>
            <span className="h-1 w-1 rounded-full bg-brand-100/30" />
            <span>우선순위</span>
            <span className="h-1 w-1 rounded-full bg-brand-100/30" />
            <span>방문 동선</span>
          </div>
        </div>

        {/* 우: 로그인 폼 */}
        <div className="p-7 sm:p-9">
          {/* 모바일 브랜드 */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-800">복지망 발굴·모니터링</div>
              <div className="text-xs text-slate-400">보조 시스템</div>
            </div>
          </div>

          <h1 className="text-h1 text-slate-800">로그인</h1>
          <p className="mt-1 text-sm text-slate-500">담당자 계정으로 접속하세요.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="off">
            <Field
              id="username"
              label="아이디"
              icon={<User size={16} />}
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="담당자 아이디"
              autoComplete="username"
            />
            <Field
              id="password"
              label="비밀번호"
              icon={<Lock size={16} />}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="비밀번호"
              autoComplete="current-password"
            />

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="btn-primary w-full !py-2.5"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  로그인 중…
                </>
              ) : (
                <>
                  <LogIn size={16} /> 로그인
                </>
              )}
            </button>
          </form>

          {/* 데모 계정 빠른 채움 */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 text-[11px] font-semibold text-slate-500">데모 계정 (클릭하면 자동 입력)</div>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => quickFill(a.username, a.password, a.user.name)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                    {a.user.initial}
                  </span>
                  <span className="font-semibold text-slate-700">{a.user.name}</span>
                  <span className="text-slate-400">· {a.user.regionLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 데모계정 자동입력 안내 (스크린리더) */}
          <div role="status" aria-live="polite" className="sr-only">
            {fillMsg}
          </div>

          {/* 정직성 표기 (필수) */}
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              <b>데모용 인증입니다.</b> 실제 보안 인증은 백엔드 연동(서버 세션·OAuth/SSO)이 필요합니다.
              현재는 client-only로 흐름만 재현하며, 인증 provider는 교체 가능하게 추상화되어 있습니다.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:border-brand-400 focus-visible:bg-white"
        />
      </div>
    </div>
  );
}
