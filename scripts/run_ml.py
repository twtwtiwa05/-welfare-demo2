# -*- coding: utf-8 -*-
"""
run_ml.py — 오프라인 ML 보조선별 파이프라인 (작업 B / 가드레일 G2·G4)

────────────────────────────────────────────────────────────────────────────
무엇을 / 왜
  심사단 지적 ②: "AI 에이전트를 왜 쓰나? 공무원이 점수·그래프 보면 되잖아."
  → 맞다. 그래서 '에이전트'를 제거하고, ML을 *결정자*가 아니라 *대량 선별기(triage)*로
    재정의한다. 사람이 전수로 못 보는 대량 가구에서
      (1) 급속·다변량 악화 케이스를 자동으로 골라내고(anomaly/change detection),
      (2) 비슷한 궤적끼리 묶어(clustering) 방문 우선순위 그룹을 만든다.
  ML은 위험을 *판정하지 않는다* — 그건 scoring.ts의 투명 점수(G1) + 사람(G4)의 몫이다.
  ML은 '건초더미를 줄여' 적은 인력이 집중할 곳을 가리킨다.

  실서비스 선례: 한국전력·통신3사 'AI 안부살핌'이 바로 이 일을 한다 — 전력·통신 패턴을
  개인별로 학습·업데이트해 변화 신호를 자동 포착·알림. 본 파이프라인은 그 접근의 교육용 PoC다.

아키텍처 (G1/G4 자연 충족)
  · 오프라인 학습/추론 → households.json에 보조신호(ml) 필드를 *구워서* 추가.
  · 런타임(브라우저)에선 모델이 돌지 않는다. UI는 구운 값을 *표시만* 한다(client-only 유지).
  · 시드 고정(np.random.seed(42), random_state=42) → 재현 가능.

모델 출처 (정식 서지는 REFERENCES.md)
  · Isolation Forest      — Liu, Ting & Zhou. ICDM 2008.            (다변량 이상점수)
  · Local Outlier Factor  — Breunig et al. SIGMOD 2000.            (보조 이상신호)
  · Min. Covariance Det.  — Rousseeuw 1984 / Rousseeuw & Van Driessen 1999 (robust Mahalanobis)
  · Binary Segmentation / PELT — Killick, Fearnhead & Eckley. JASA 2012 (변화점)
  · Mann-Kendall          — Mann 1945; Kendall 1948.               (단조추세 검정)
  · Theil-Sen estimator   — Theil 1950; Sen 1968.                  (강건 기울기)
  · k-means               — Lloyd 1982 / MacQueen 1967.           (궤적 군집)
  · (Tier 2) LSTM-Autoencoder — Malhotra et al. 2016. ⚠️ 합성 74가구×8주 규모상 과적합 →
      본 PoC에선 미실행, '실데이터 확장 경로'로만 문서화(아래 lstm_autoencoder_reference).

실행: python scripts/run_ml.py   (npm run gen:ml)
입력/출력: src/data/households.json (in-place 보강: ml 필드 추가)
────────────────────────────────────────────────────────────────────────────
"""

import json
import warnings
from pathlib import Path

import numpy as np
from scipy.spatial.distance import mahalanobis as _maha_dist  # noqa: F401 (참고)
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.cluster import KMeans
from sklearn.covariance import MinCovDet, EmpiricalCovariance
from sklearn.preprocessing import StandardScaler

import pymannkendall as mk
import ruptures as rpt

warnings.filterwarnings("ignore")
SEED = 42
np.random.seed(SEED)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "households.json"

SIGNAL_KEYS = ["power", "medical", "mail", "telecom", "isolation"]

# ── 결핍 정규화 (scoring.ts deficits()와 동일) ──────────────────────────────
def deficit_power(v):     return min(max(v / 100.0, 0.0), 1.0)
def deficit_medical(v):   return min(max(v / 365.0, 0.0), 1.0)
def deficit_mail(v):      return min(max(v / 4.0, 0.0), 1.0)
def deficit_telecom(v):   return min(max(v / 3.0, 0.0), 1.0)
def deficit_isolation(v): return 1.0 if v == 0 else 0.0

DEFICIT = {
    "power": deficit_power,
    "medical": deficit_medical,
    "mail": deficit_mail,
    "telecom": deficit_telecom,
    "isolation": deficit_isolation,
}

# 급변/급락 판정 임계 (명시적 가정)
RECENT_DECL_THRESH = 0.15   # 최근 2주 결핍 증가가 이 이상이면 '신호 급락'
CHANGE_MAG_THRESH = 0.10    # 변화점 크기가 이 이상이면 changePoint로 기록
RAPID_ANOM_PCTL = 70        # 다변량 이상 백분위 이 이상 + 급락신호 2개↑ → isRapidDecline


def deficit_matrix(hh):
    """가구의 signalHistory(8주) → 결핍 행렬 D[week, signal] (8 x 5)."""
    series = hh["signalHistory"]
    D = np.zeros((len(series), len(SIGNAL_KEYS)))
    for w, snap in enumerate(series):
        for j, k in enumerate(SIGNAL_KEYS):
            D[w, j] = DEFICIT[k](snap[k])
    return D


def theil_sen_slope(y):
    """Theil-Sen 강건 기울기 (결핍/주). pymannkendall 사용, 실패 시 0."""
    try:
        res = mk.original_test(y)
        return float(res.slope)
    except Exception:
        x = np.arange(len(y))
        if np.allclose(y, y[0]):
            return 0.0
        return float(np.polyfit(x, y, 1)[0])


def change_point(y):
    """
    Binary Segmentation(ruptures, PELT 계열)으로 단일 변화점 추정.
    반환: (week_1based, magnitude=after_mean-before_mean) 또는 (None, 0).
    8포인트 단기 시계열이라 n_bkps=1 Binseg가 PELT보다 안정적.
    """
    y = np.asarray(y, dtype=float)
    if np.allclose(y, y[0]):
        return None, 0.0
    try:
        algo = rpt.Binseg(model="l2", min_size=2, jump=1).fit(y)
        bkps = algo.predict(n_bkps=1)  # [cp, len(y)]
        cp = bkps[0]
        if cp <= 0 or cp >= len(y):
            return None, 0.0
        before = float(np.mean(y[:cp]))
        after = float(np.mean(y[cp:]))
        return cp + 1, after - before  # 1-based 주차
    except Exception:
        return None, 0.0


def build_features(households):
    """가구별 피처: 변화중심(이상탐지용) + 수준(군집용)."""
    n = len(households)
    recent_delta = np.zeros((n, 5))   # 최근 2주 결핍 변화 (양수=악화)
    slopes = np.zeros((n, 5))         # Theil-Sen 기울기
    level = np.zeros((n, 5))          # 현재(W8) 결핍 수준
    change_pts = [[] for _ in range(n)]

    for i, hh in enumerate(households):
        D = deficit_matrix(hh)         # 8 x 5
        for j, k in enumerate(SIGNAL_KEYS):
            col = D[:, j]
            level[i, j] = col[-1]
            recent_delta[i, j] = col[-1] - col[-3]   # W8 - W6
            slopes[i, j] = theil_sen_slope(col)
            cp_week, mag = change_point(col)
            if cp_week is not None and mag >= CHANGE_MAG_THRESH:
                change_pts[i].append(
                    {"signal": k, "week": int(cp_week), "magnitude": round(float(mag), 3)}
                )
    return recent_delta, slopes, level, change_pts


def normalize01(arr):
    """min-max 0~1 정규화 (population 기준). 상수면 0."""
    arr = np.asarray(arr, dtype=float)
    lo, hi = float(arr.min()), float(arr.max())
    if hi - lo < 1e-12:
        return np.zeros_like(arr)
    return (arr - lo) / (hi - lo)


def robust_mahalanobis(Xs):
    """MinCovDet(robust) Mahalanobis. 특이행렬 시 경험적 공분산으로 폴백."""
    try:
        mcd = MinCovDet(random_state=SEED).fit(Xs)
        d2 = mcd.mahalanobis(Xs)
    except Exception:
        emp = EmpiricalCovariance().fit(Xs)
        d2 = emp.mahalanobis(Xs)
    return np.sqrt(np.maximum(d2, 0.0))


def cluster_label(s):
    """
    군집 요약 → 사람이 읽는 라벨 (결정론적·심각도 인지 규칙).
    ⚠️ isolation 결핍은 대부분의 위험가구에서 1로 포화돼 주신호 판별에 부적합 →
       경제·고립 vs 전력·진료는 telecom 수준 대 (power+medical)/2 수준으로 판별한다.
    """
    if s["is_rapid_cluster"]:
        return "급속 다변량 악화"
    if s["is_stable_cluster"]:
        return "안정·관찰 (저위험군)"
    # 낮은 수준이지만 최근 변화가 큰 군집 → 초기 변화 감지(아직 위험 점수는 낮음)
    if s["level_mag"] < 1.5:
        return "초기 변화 감지군"
    # 다신호가 모두 높은 수준으로 누적 → 만성 고위험 (어느 한 신호로 환원 불가)
    if s["level_mag"] >= 3.5:
        return "만성 고위험 (다신호 누적)"
    # 중간 수준에서만 주신호로 패턴 구분 (telecom 대 power+medical)
    econ = s["lvl_telecom"]
    health = 0.5 * (s["lvl_power"] + s["lvl_medical"])
    if econ >= health:
        return "경제·고립 중심 악화"
    return "전력·진료 중심 악화"


def main():
    households = json.loads(DATA.read_text(encoding="utf-8"))
    n = len(households)
    print(f"[run_ml] 입력 {n}가구 · 시드 {SEED}")

    recent_delta, slopes, level, change_pts = build_features(households)

    # 이상탐지 피처 = 변화 중심(최근 델타 + 기울기) 10차원 → '급속·다변량 악화'에 민감
    X_anom = np.hstack([recent_delta, slopes])
    # 군집 피처 = 변화 + 수준 15차원 → 패턴 + 심각도 모두 반영
    X_clust = np.hstack([recent_delta, slopes, level])

    scaler = StandardScaler()
    Xs_anom = scaler.fit_transform(X_anom)
    Xs_clust = StandardScaler().fit_transform(X_clust)

    # ── (1) Isolation Forest — 주(主) 다변량 이상점수 ───────────────────────
    iso = IsolationForest(
        n_estimators=300, contamination="auto", random_state=SEED
    ).fit(Xs_anom)
    raw = -iso.score_samples(Xs_anom)        # 높을수록 이상
    anomaly = normalize01(raw)
    # 백분위(0~100): population 내 순위
    order = raw.argsort()
    pctl = np.zeros(n)
    pctl[order] = np.linspace(0, 100, n)

    # ── (2) Local Outlier Factor — 보조 이상신호 ──────────────────────────
    nneigh = min(20, n - 1)
    lof = LocalOutlierFactor(n_neighbors=nneigh)
    lof.fit_predict(Xs_anom)
    lof_score = normalize01(-lof.negative_outlier_factor_)

    # ── (3) robust Mahalanobis (MCD) — 보조 이상신호 ──────────────────────
    maha = normalize01(robust_mahalanobis(Xs_anom))

    # ── (4) k-means 궤적 군집 ─────────────────────────────────────────────
    K = 5
    km = KMeans(n_clusters=K, random_state=SEED, n_init=10).fit(Xs_clust)
    labels = km.labels_

    # 급락 신호 수 / topSignals / isRapidDecline
    n_decl = (recent_delta >= RECENT_DECL_THRESH).sum(axis=1)
    is_rapid = (pctl >= RAPID_ANOM_PCTL) & (n_decl >= 2)

    # 군집 요약
    summaries = {}
    for c in range(K):
        idx = labels == c
        if idx.sum() == 0:
            summaries[c] = dict(change_mag=0.0, level_mag=0.0, mean_anom=0.0,
                                dom_signal="power", lvl_power=0.0, lvl_medical=0.0,
                                lvl_telecom=0.0, rapid_frac=0.0,
                                is_rapid_cluster=False, is_stable_cluster=False)
            continue
        mean_delta = recent_delta[idx].mean(axis=0)
        mean_level = level[idx].mean(axis=0)
        summaries[c] = dict(
            change_mag=float(mean_delta.sum()),
            level_mag=float(mean_level.sum()),
            mean_anom=float(anomaly[idx].mean()),
            dom_signal=SIGNAL_KEYS[int(mean_level.argmax())],
            lvl_power=float(mean_level[0]),
            lvl_medical=float(mean_level[1]),
            lvl_telecom=float(mean_level[3]),
            rapid_frac=float(is_rapid[idx].mean()),
            is_rapid_cluster=False,
            is_stable_cluster=False,
        )
    # 급락 비율 최고 군집 = '급속 다변량 악화' (1개)
    rapid_cluster = max(summaries, key=lambda c: (summaries[c]["rapid_frac"],
                                                  summaries[c]["change_mag"]))
    if summaries[rapid_cluster]["rapid_frac"] > 0:
        summaries[rapid_cluster]["is_rapid_cluster"] = True
    # 비급속 군집 중 이상도·수준 모두 최저 = '안정·관찰 (저위험군)' (1개)
    non_rapid = [c for c in range(K) if not summaries[c]["is_rapid_cluster"]
                 and (labels == c).sum() > 0]
    if non_rapid:
        stable = min(non_rapid, key=lambda c: (summaries[c]["mean_anom"],
                                               summaries[c]["level_mag"]))
        if summaries[stable]["mean_anom"] < 0.30:
            summaries[stable]["is_stable_cluster"] = True
    cluster_labels = {c: cluster_label(summaries[c]) for c in range(K)}

    # ── 가구별 ml 필드 작성 ───────────────────────────────────────────────
    for i, hh in enumerate(households):
        # topSignals: 최근 급락 큰 신호 우선, 없으면 현재 수준 높은 신호
        deltas = [(SIGNAL_KEYS[j], recent_delta[i, j]) for j in range(5)]
        top = [k for k, d in sorted(deltas, key=lambda x: -x[1]) if d >= CHANGE_MAG_THRESH][:3]
        if not top:
            lv = [(SIGNAL_KEYS[j], level[i, j]) for j in range(5)]
            top = [k for k, v in sorted(lv, key=lambda x: -x[1]) if v > 0][:2]

        hh["ml"] = {
            "anomalyScore": round(float(anomaly[i]), 3),
            "anomalyPercentile": round(float(pctl[i]), 1),
            "lofScore": round(float(lof_score[i]), 3),
            "mahalanobis": round(float(maha[i]), 3),
            "isRapidDecline": bool(is_rapid[i]),
            "clusterId": int(labels[i]),
            "clusterLabel": cluster_labels[int(labels[i])],
            "trendSlopes": {
                SIGNAL_KEYS[j]: round(float(slopes[i, j]), 4) for j in range(5)
            },
            "changePoints": change_pts[i],
            "topSignals": top,
        }

    DATA.write_text(
        json.dumps(households, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # ── 검산 요약 ─────────────────────────────────────────────────────────
    residual = [h for h in households if not h["haengbokFlagged"]]
    rapid_res = [h for h in residual if h["ml"]["isRapidDecline"]]
    print(f"[run_ml] 완료 → {DATA}")
    print(f"  잔여 {len(residual)}가구 중 급속악화(isRapidDecline): {len(rapid_res)}건")
    for c in range(K):
        cnt = int((labels == c).sum())
        s = summaries[c]
        print(f"  군집 {c} '{cluster_labels[c]}': {cnt}가구 "
              f"(급락 {s['rapid_frac']:.0%}, 평균이상 {s['mean_anom']:.2f}, "
              f"수준합 {s['level_mag']:.2f}, 주신호 {s['dom_signal']})")
    motif = next((h for h in households if h["repeatedFlags"] >= 8), None)
    if motif:
        m = motif["ml"]
        print(f"  수원모녀 모티프 {motif['id']}: 이상점수 {m['anomalyScore']} "
              f"(상위 {100 - m['anomalyPercentile']:.0f}%), 급속악화={m['isRapidDecline']}, "
              f"군집='{m['clusterLabel']}', 변화점 {len(m['changePoints'])}개")


# ─────────────────────────────────────────────────────────────────────────
# Tier 2 (DL) — 확장 경로. ⚠️ 본 PoC에선 실행하지 않는다.
# 이유(정직성): 현재 데이터는 합성 74가구 × 8주. 이 규모에서 LSTM-Autoencoder 같은 DL은
#   과적합·시연용에 가깝다. Tier 1(해석가능)을 본체로 두고, DL은 '실데이터 확장 경로'로만
#   문서화한다(README '한계와 책임' 기조). 실데이터(수십만 가구·장기 시계열) 확보 시 아래를
#   활성화해 다변량 재구성오차를 이상점수로 쓸 수 있다.
# 출처: Malhotra et al. "LSTM-based Encoder-Decoder for Multi-sensor Anomaly Detection."
#       ICML 2016 Anomaly Detection Workshop. (더 최신: USAD KDD2020, Anomaly Transformer ICLR2022)
def lstm_autoencoder_reference():
    """
    [확장 경로 / 미실행] 다변량 시계열 LSTM-AE 이상탐지 스케치.
      입력  : (N, 8, 5) 결핍 시퀀스
      구조  : LSTM encoder → latent → LSTM decoder, 재구성오차(MSE)를 이상점수로
      학습  : '정상' 궤적(완만/평탄)으로만 학습 → 급속·이상 궤적에서 오차↑
      한계  : 74×8 합성 규모로는 일반화 불가. 실데이터·정상 라벨 충분 시에만 의미.
    """
    raise NotImplementedError(
        "Tier 2 LSTM-AE는 실데이터 확장 경로 — 합성 PoC 규모에서 미실행(과적합)."
    )


if __name__ == "__main__":
    main()
