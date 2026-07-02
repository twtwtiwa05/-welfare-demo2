// WAI-APG 라디오 그룹 키보드 패턴 — 화살표로 이동·선택(roving tabindex와 함께 사용).
// role="radiogroup" 컨테이너의 onKeyDown에 붙인다. 각 radio는 tabIndex={선택?0:-1}.

export function radioGroupNav(e: React.KeyboardEvent<HTMLElement>): void {
  const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
  const backward = e.key === "ArrowLeft" || e.key === "ArrowUp";
  if (!forward && !backward) return;

  const radios = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')
  );
  if (radios.length < 2) return;

  let idx = radios.findIndex((r) => r === document.activeElement);
  if (idx < 0)
    idx = Math.max(
      0,
      radios.findIndex((r) => r.getAttribute("aria-checked") === "true")
    );

  const next = radios[(idx + (forward ? 1 : -1) + radios.length) % radios.length];
  e.preventDefault();
  next.focus();
  next.click();
}
