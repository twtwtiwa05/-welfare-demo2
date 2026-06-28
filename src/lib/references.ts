// 근거 출처 단일 소스 — REFERENCES.md(레포 루트)와 동기화. UI 근거 패널이 이 데이터를 렌더.
//
// ⚠️ 정직성 원칙(이번 피드백의 핵심): 약한 근거에 강한 인용을 달지 않는다.
//    특히 우편(mail)은 확립된 출처가 없으므로 "보조 지표"로 정직하게 표기한다.

export type RefStrength = "강" | "중상" | "중" | "약" | "맥락" | "방법" | "없음";
export type RefCategory = "academic" | "institutional" | "ml";

export interface Reference {
  id: string;
  category: RefCategory;
  /** 정식 인용 */
  cite: string;
  /** 데모에서의 용도 */
  use: string;
  /** 근거 강도 */
  strength: RefStrength;
  /** 한계·주의 (특히 약한 근거) */
  limitation?: string;
  url?: string;
}

export const REFERENCES: Reference[] = [
  // ── 학술 ──────────────────────────────────────────────────────────
  {
    id: "fi-rockwood",
    category: "academic",
    cite: "Mitnitski AB, Mogilner AJ, Rockwood K. Accumulation of deficits as a proxy measure of aging. ScientificWorldJournal. 2001;1:323-336.",
    use: "점수의 형식적 근거 — 결핍누적(Frailty Index): 여러 결핍을 0~1로 만들고 그 비율/평균으로 0~1 지수. 고전 FI는 가중치 없는 단순 평균 → 무가중 베이스라인의 근거.",
    strength: "강",
    url: "https://doi.org/10.1100/tsw.2001.58",
  },
  {
    id: "fi-jkma",
    category: "academic",
    cite: "원장원. 노쇠의 최신지견. 대한의사협회지. 2022;65(2):108-114.",
    use: "Rockwood Frailty Index(결핍누적) 한글 소개. 한국형 일차의료 노쇠지수(KFI-PC)는 사회활동 부족·인지저하 등 비신체 영역까지 포함 → 복지 신호의 결핍 항목화 정당화.",
    strength: "강",
    url: "https://doi.org/10.5124/jkma.2022.65.2.108",
  },
  {
    id: "power-arxiv",
    category: "academic",
    cite: "Real-time electricity-based non-intrusive well-being monitoring of older adults living alone. arXiv:2407.00524. 2024.",
    use: "전력 데이터로 독거노인 일상 프로파일 대비 이상탐지(비침습 모니터링). power 신호 + §4 패턴기반 이상탐지의 학술적 뒷받침.",
    strength: "중상",
    limitation: "참가자 소수(4명, 67–82세). 정량 위험식은 제시되지 않음 → 변환식은 가정.",
    url: "https://arxiv.org/abs/2407.00524",
  },
  {
    id: "medical-unmet",
    category: "academic",
    cite: "박채린, 김현우. 1인 가구의 의료수요 발생과 미충족의 결정요인: 2022년 지역사회건강조사의 표본선택 프로빗 분석. 보건사회연구. 2025;45(1):221-239.",
    use: "‘미충족 의료=위험’의 1인가구 실증. medical(진료 단절) 신호 정당화.",
    strength: "중",
    url: "https://doi.org/10.15709/hswr.2025.45.1.221",
  },
  {
    id: "isolation-holtlunstad",
    category: "academic",
    cite: "Holt-Lunstad J, Smith TB, Layton JB. Social Relationships and Mortality Risk: A Meta-analytic Review. PLoS Medicine. 2010;7(7):e1000316. (148개 연구·308,849명)",
    use: "사회적 관계가 강한 집단의 생존확률 약 50% 증가 — 종합 효과 OR 1.50 (95% CI 1.42–1.59). isolation 신호 채택 정당화.",
    strength: "강",
    limitation:
      "⚠️ 단순 이분지표 ‘혼자 사는지(living alone)’의 효과는 분석된 모든 측정 중 가장 약하고 통계적으로 유의하지 않음 — OR 1.19 (95% CI 0.99–1.44, 하한이 1.0 포함). 반면 복합 사회통합 측정은 OR 1.91 (1.63–2.23). → 고립을 단순 0/1로 과도 가중 금지, ‘궤적 변화’를 잡는 §4 이상탐지와 결합 시 더 타당. (원문·PMC2910600 교차 verbatim 확인)",
    url: "https://doi.org/10.1371/journal.pmed.1000316",
  },
  {
    id: "mail-none",
    category: "academic",
    cite: "우편 미수령(mail) — ⚠️ 확립된 학술/제도 근거 없음.",
    use: "위기정보 44종·실서비스 어디에도 우편 미수령은 쓰이지 않음(검증 결과). → 보조신호로 최저 가중, 단독 트리거 지양. 다른 신호와 동반 시에만 약하게 가산.",
    strength: "약",
    limitation:
      "가짜 인용 금지. ‘외부에서 관찰 가능한 생활관리 실패 징후’ 계열로만 약하게 서술. 대안 신호 발견 시에만 상향.",
  },
  // ── 제도·실서비스 ─────────────────────────────────────────────────
  {
    id: "mohw-crisis",
    category: "institutional",
    cite: "보건복지부 복지 사각지대 발굴·지원체계 (사회보장급여법 기반).",
    use: "단전·단수·건보료/공공요금 체납·금융연체·임차료 체납·고용위기·의료비 등 위기정보를 빅데이터로 분석해 위기 가능성 상위 분위수를 선별→지자체 통보. 우리 신호(전력·진료·통신·고립)는 이 공식 위기정보 체계의 proxy. ‘상위 % 분위수 선별’의 제도적 선례.",
    strength: "강",
    limitation:
      "⚠️ 통신비 체납이 위기정보 항목에 명시적으로 포함된다고 단정하지 않음(위기정보의 통신 요소는 주로 연락처 연계). 종수(39→44 등)는 개정에 따라 변동.",
    url: "https://www.korea.kr",
  },
  {
    id: "samonyeo",
    category: "institutional",
    cite: "송파 세 모녀(2014)·수원 세 모녀(2022) 사건.",
    use: "발굴 시스템의 계기이자 *실패사례* — 위기정보로 통보됐으나 실거주지 불일치·연락두절로 발굴 실패. 본 프로젝트의 도입 훅: 기존 발굴 체계의 사각/실패를 보조 레이어로 메운다.",
    strength: "맥락",
  },
  {
    id: "ai-ansim",
    category: "institutional",
    cite: "한국전력 + 이동통신 3사 ‘AI 안부살핌’ 서비스 / 서울시 스마트플러그 사업.",
    use: "전력·통신 패턴을 개인별로 학습·업데이트해 변화신호를 자동 포착→담당자 알림. ① power·telecom 신호가 실제로 쓰이는 비침습 위기신호임을 입증, ② 한전이 ‘전력 급감만 → 생활패턴 전반 분석’으로 발전 → 우리 §4 패턴기반 이상탐지의 실서비스 선례.",
    strength: "강",
    url: "https://home.kepco.co.kr",
  },
  {
    id: "godoksa",
    category: "institutional",
    cite: "고독사 실태조사 (보건복지부).",
    use: "사회적 고립이 고독사의 직접 선행요인. 50~60대 남성 비중↑, 가족 발견 감소·제3자(임대인·이웃) 발견 증가 → isolation 신호 맥락 + 중장년 1인가구 특화(profile)의 동기.",
    strength: "맥락",
  },
  {
    id: "caseload",
    category: "institutional",
    cite: "돌봄·복지 인력 1인당 담당 가구 수 (노인맞춤돌봄 생활지원사 등).",
    use: "한 명이 다수(수십 명 규모)를 담당 → 방문·전화만으로 대량 가구의 조기 위험 파악 곤란. ‘공무원이 그냥 보면 되잖아’에 대한 핵심 반박 = ML 대량 선별(triage)의 정당성.",
    strength: "맥락",
    limitation: "정확한 1인당 담당 수는 사업·연도별 상이 → 단정적 수치 인용 지양.",
  },
  // ── ML 모델 ───────────────────────────────────────────────────────
  {
    id: "ml-iforest",
    category: "ml",
    cite: "Liu FT, Ting KM, Zhou ZH. Isolation Forest. ICDM 2008.",
    use: "다변량 이상점수(주). 최근 주간 델타/기울기 피처 벡터에서 ‘결합 급락’을 포착.",
    strength: "방법",
  },
  {
    id: "ml-lof",
    category: "ml",
    cite: "Breunig MM, Kriegel HP, Ng RT, Sander J. LOF: Identifying Density-Based Local Outliers. SIGMOD 2000.",
    use: "보조 이상신호(밀도 기반 국소 이상도).",
    strength: "방법",
  },
  {
    id: "ml-mcd",
    category: "ml",
    cite: "Rousseeuw PJ, Van Driessen K. A Fast Algorithm for the Minimum Covariance Determinant Estimator. Technometrics 1999.",
    use: "보조 이상신호(강건 Mahalanobis 거리, MCD 공분산).",
    strength: "방법",
  },
  {
    id: "ml-pelt",
    category: "ml",
    cite: "Killick R, Fearnhead P, Eckley IA. Optimal Detection of Changepoints With a Linear Computational Cost. JASA 2012.",
    use: "변화점(급락 시점) 탐지 — Binary Segmentation/PELT 계열(ruptures).",
    strength: "방법",
  },
  {
    id: "ml-dbscan-kmeans",
    category: "ml",
    cite: "Ester M et al. DBSCAN. KDD 1996 / MacQueen J. k-means. 1967.",
    use: "궤적 군집화 — 비슷한 악화 패턴끼리 묶어 우선순위 그룹 생성.",
    strength: "방법",
  },
  {
    id: "ml-mannkendall-theilsen",
    category: "ml",
    cite: "Mann HB 1945; Kendall MG 1948 (추세검정) · Theil H 1950; Sen PK 1968 (강건 기울기).",
    use: "신호별 단조추세·기울기 산출 — ‘어느 신호가 언제 악화 중인가’를 설명가능하게.",
    strength: "방법",
  },
  {
    id: "ml-lstm-ae",
    category: "ml",
    cite: "Malhotra P et al. LSTM-based Encoder-Decoder for Multi-sensor Anomaly Detection. ICML 2016 Anomaly Detection Workshop.",
    use: "(Tier 2 · 확장 경로) 다변량 시계열 재구성오차 이상탐지.",
    strength: "방법",
    limitation:
      "⚠️ 합성 74가구×8주 규모에서는 과적합 → 본 PoC 미실행. 실데이터 확장 시에만 의미.",
  },
];

export const REF_BY_ID: Record<string, Reference> = Object.fromEntries(
  REFERENCES.map((r) => [r.id, r])
);

export const STRENGTH_STYLE: Record<RefStrength, string> = {
  강: "bg-emerald-100 text-emerald-700",
  중상: "bg-teal-100 text-teal-700",
  중: "bg-sky-100 text-sky-700",
  약: "bg-amber-100 text-amber-700",
  맥락: "bg-violet-100 text-violet-700",
  방법: "bg-slate-100 text-slate-600",
  없음: "bg-rose-100 text-rose-700",
};
