---
name: Aha Moment v2 — UX 패턴 및 반복 문제 유형
description: PracticePage/ProblemReviewPage에서 발견된 UX 상태 관리 패턴과 반복 발생 버그 유형
type: project
---

## 확인된 UX 패턴

**상태 초기화 (문제 전환 시)**
- `currentIdx` 변경 useEffect에서 mcq/essay/solution 상태를 초기화하는 패턴 사용.
- `answerInput` (수치 입력) 은 별도 state로 관리되어 동일 useEffect에서 명시적으로 초기화해야 함.
  기존에는 누락되어 있어 문제 전환 시 이전 입력이 남아 있는 버그가 있었음 (2025-04 수정).

**문제 풀이 상태 트리**
- `pState[idx].solved` — localStorage에 저장됨. 다음 세션에서도 유지.
- `mcqResult` / `essayResult` — 세션 내 UI 전용 상태. localStorage 저장 안 됨.
- 따라서 이미 solved된 문제를 다시 열면 solved-note만 표시되고 mcqResult는 null로 초기화.

**MCQ 상태 흐름**
- 선택 → `mcqSelected` 설정 → 제출 → `mcqResult = 'correct'|'wrong'`
- `mcqResult` 설정 후 choices 전부 disabled됨.
- 오답 후 재시도 버튼으로 `mcqResult`, `mcqSelected` 모두 null로 리셋.

**MetacogModal (메타인지 모달)**
- 수치 답 제출 직후 표시됨. 닫기 방법이 없으면 사용자가 갇힘.
- overlay 클릭 + ESC 키 → `onSubmit('')` (건너뛰기)로 탈출 허용. (2025-04 수정)
- 의도적으로 overlay 차단하던 원래 설계를 수정 — 소크라테스 AI 흐름을 방해하지 않으면서도 탈출 허용.

**Why:** 메타인지 모달이 blocking되면 사용자가 앱 자체를 이탈하는 더 큰 문제 발생.
**How to apply:** 모달 설계 시 항상 ESC + overlay 탈출 경로를 제공할 것. 단, 비즈니스 로직(건너뛰기 시 빈 reasoning 전달)은 유지.

## 반복 발생 버그 유형

1. **입력창 초기화 누락** — 여러 입력 state가 있을 때 문제 전환 useEffect에서 하나라도 빠지면 잔여값 노출.
2. **무음 실패 (silent fail)** — isNaN 체크 시 return만 하고 UI 피드백 없음. 항상 error state로 표시할 것.
3. **재시도 UI 누락** — 결과 표시 후 retry 버튼 없으면 사용자가 방법을 모름. MCQ/서술형 모두 오답 후 retry 버튼 필요.
