---
name: PracticePage / ProblemReviewPage 성능 최적화 패턴
description: 두 페이지에서 발견된 반복적 성능 병목 및 적용한 최적화 기법 (2025-04 분석)
type: project
---

매 렌더마다 localStorage.getItem('aha_chapters')를 파싱하는 인라인 IIFE 패턴이 두 파일(PracticePage, ProblemReviewPage) 모두에서 발견됐다. `useMemo([chapterId])`로 교체해 파싱 횟수를 렌더 횟수에서 chapterId 변경 횟수로 줄였다.

**Why:** chapterId는 페이지 전체 수명 동안 고정이므로 매 렌더마다 JSON.parse를 반복할 이유가 없다.

**How to apply:** 새 페이지에서 localStorage를 읽어 props 기반으로 필터링하는 코드는 반드시 `useMemo` 안에 넣을 것.

---

localStorage 저장 effect (pState → storageKey)가 마운트 시에도 즉시 실행돼 restore effect와 race가 발생했다. `isMounted` ref 플래그로 첫 렌더 skip.

**Why:** restore effect와 save effect가 같은 렌더 사이클에서 실행되면 복원된 값을 빈 초기값으로 덮어쓸 수 있다.

**How to apply:** write-to-storage effect는 항상 `if (!isMounted.current) return` guard를 추가할 것.

---

choices 생성 effect의 dep에 `problem?.choices?.length`가 포함돼 있었다. choices가 undefined → 0 → N으로 바뀔 때마다 effect가 재실행되는 버그. `triggeredChoiceIdxRef` (Set of indices)로 중복 실행 방지.

**Why:** 의존 배열에 "결과"를 넣으면 결과가 쓰여질 때 다시 트리거된다.

**How to apply:** "이미 요청했는가"를 추적하는 ref Set 패턴을 사용하고, 의존 배열에는 format과 idx만 넣을 것.

---

ProblemReviewPage의 스킵 항목 렌더 루프 안에 `extraProblems.some(p => p.source === item.source)`가 있어 O(n*m) 복잡도. `useMemo`로 `extraSourceSet` (Set)을 미리 만들어 O(1) 조회로 교체.

**How to apply:** 렌더 루프 안에서 배열 탐색(.some/.find/.filter)을 쓰는 경우 루프 밖에서 Set/Map으로 인덱싱할 것.
