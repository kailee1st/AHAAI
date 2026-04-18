import { BUILTIN_PROBLEMS, RESERVE_PROBLEMS } from './builtinProblems';

// Stewart Calculus §1.4–1.6 극한 — 내장 챕터
export const BUILTIN_LIMITS_CHAPTER = {
  id: 'builtin_limits_ch1',
  title: '극한 §1.4–1.6',
  subject: '미적분학 (Calculus)',
  source: 'Stewart Calculus',
  isDemo: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  summary: `
<h3>§1.4 — 극한의 직관적 이해</h3>
<p>극한(limit)이란 $x$가 어떤 값 $a$에 가까워질 때 함수 $f(x)$가 다가가는 값입니다. 실제로 $x = a$에서 정의되지 않아도 극한값은 존재할 수 있습니다.</p>
<ul>
  <li>표기법: $\\lim_{x \\to a} f(x) = L$</li>
  <li>좌극한 $\\lim_{x \\to a^-}$, 우극한 $\\lim_{x \\to a^+}$ — 양쪽이 같아야 극한 존재</li>
  <li>그래프·수치표로 극한값 추정하기</li>
</ul>

<h3>§1.5 — 극한 법칙</h3>
<p>극한에는 사칙연산 법칙이 그대로 적용됩니다.</p>
<div class="formula-block">$$\\lim_{x\\to a}[f(x)+g(x)] = \\lim_{x\\to a}f(x)+\\lim_{x\\to a}g(x)$$</div>
<ul>
  <li>직접 대입법(Direct Substitution): 다항식·유리함수는 $x=a$를 그냥 대입</li>
  <li>$\\tfrac{0}{0}$ 부정형 → 먼저 인수분해 또는 유리화 필요</li>
</ul>

<h3>§1.6 — 극한 계산 기법</h3>
<ul>
  <li><strong>인수분해:</strong> 분자·분모 공통인수 제거 후 대입</li>
  <li><strong>유리화(켤레곱):</strong> 근호 포함 시 분자·분모에 켤레식 곱하기</li>
  <li><strong>스퀴즈 정리:</strong> $\\lim_{x\\to 0}\\dfrac{\\sin x}{x} = 1$ 등 삼각 극한</li>
</ul>
<div class="formula-block">$$\\lim_{x \\to a} \\frac{f(x)}{g(x)} \\xrightarrow{\\text{factor}} \\lim_{x \\to a} \\frac{(x-a)\\cdot Q(x)}{(x-a)\\cdot R(x)} = \\lim_{x \\to a}\\frac{Q(x)}{R(x)}$$</div>
`,
  problems: [...BUILTIN_PROBLEMS, ...RESERVE_PROBLEMS].map((p, i) => ({
    ...p,
    format: '수치',
    choices: null,
    solution: p.solution ?? null,
  })),
  skipped: [],
};

// 수능 수학 영역(미적분) 홀수형 — 내장 챕터
export const DEMO_CHAPTER = {
  id: 'demo_suneung_calculus',
  title: '수학 영역(미적분) 홀수형',
  subject: '수학(미적분)',
  source: '수능 한페이지.pdf',
  isDemo: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  summary: `
<h3>등비수열과 급수의 수렴 조건 (문제 29)</h3>
<p>두 등비수열 $\\{a_n\\}$, $\\{b_n\\}$에 대하여 급수의 수렴 조건과 등비급수 합 공식을 적용하는 문제입니다.</p>
<ul>
  <li>두 급수 $\\sum a_n$, $\\sum b_n$이 각각 수렴하는 조건 분석</li>
  <li>등비급수 합 공식: $S = \\dfrac{a}{1-r}$ (단, $|r| < 1$)</li>
  <li>$\\sum_{n=1}^{\\infty} a_n b_n = \\left(\\sum_{n=1}^{\\infty} a_n\\right) \\times \\left(\\sum_{n=1}^{\\infty} b_n\\right)$ 조건 활용</li>
</ul>
<div class="formula-block">$$3\\times\\sum_{n=1}^{\\infty}|a_{2n}|=7\\times\\sum_{n=1}^{\\infty}|a_{3n}|$$</div>

<h3>미분가능 함수의 접선과 극값 (문제 30)</h3>
<p>도함수 $f'(x) = |\\sin x|\\cos x$가 주어진 함수의 적분과 접선을 이용하는 고난도 문제입니다.</p>
<ul>
  <li>접선의 방정식 $y = g(x)$ 구성</li>
  <li>$h(x) = \\int_{0}^{x}\\{f(t)-g(t)\\}dt$ 의 극값 조건 분석</li>
  <li>극값을 갖는 양수 $a_n$을 크기순으로 나열하여 수열의 규칙 발견</li>
</ul>
<div class="formula-block">$$\\frac{100}{\\pi}\\times(a_6-a_2)$$</div>

<h3>문제 유형 및 난이도</h3>
<ul>
  <li><strong>문제 29 [4점]</strong> — 등비급수·수렴 조건 (중상 난이도)</li>
  <li><strong>문제 30 [4점]</strong> — 적분함수의 극값 (상 난이도, 킬러문항)</li>
</ul>
`,
  problems: [
    {
      source: '29',
      format: '수치',
      tag: 'Problem 1',
      type: '자료 기반',
      latex: '첫째항과 공비가 각각 $0$이 아닌 두 등비수열 $\\{a_n\\}$, $\\{b_n\\}$에 대하여 두 급수 $\\sum_{n=1}^{\\infty}a_n$, $\\sum_{n=1}^{\\infty}b_n$이 각각 수렴하고\n$$\\sum_{n=1}^{\\infty}a_nb_n=\\left(\\sum_{n=1}^{\\infty}a_n\\right)\\times\\left(\\sum_{n=1}^{\\infty}b_n\\right),$$\n$$3\\times\\sum_{n=1}^{\\infty}|a_{2n}|=7\\times\\sum_{n=1}^{\\infty}|a_{3n}|$$\n이 성립한다. $\\sum_{n=1}^{\\infty}\\dfrac{b_{2n-1}+b_{3n+1}}{b_n}=S$일 때, $120S$의 값을 구하시오. [4점]',
      promptText: '첫째항과 공비가 각각 0이 아닌 두 등비수열 {a_n}, {b_n}에 대하여 두 급수 ∑a_n, ∑b_n이 각각 수렴하고 ∑a_n*b_n = (∑a_n)×(∑b_n), 3×∑|a_{2n}| = 7×∑|a_{3n}| 이 성립한다. ∑(b_{2n-1}+b_{3n+1})/b_n = S일 때, 120S의 값을 구하시오.',
      correct: null,
      tolerance: 0,
      choices: null,
      solution: null,
    },
    {
      source: '30',
      format: '수치',
      tag: 'Problem 2',
      type: '자료 기반',
      latex: '실수 전체의 집합에서 미분가능한 함수 $f(x)$의 도함수 $f\'(x)$가\n$$f\'(x)=|\\sin x|\\cos x$$\n이다. 양수 $a$에 대하여 곡선 $y=f(x)$ 위의 점 $(a, f(a))$에서의 접선의 방정식을 $y=g(x)$라 하자. 함수\n$$h(x)=\\int_{0}^{x}\\{f(t)-g(t)\\}dt$$\n가 $x=a$에서 극대 또는 극소가 되도록 하는 모든 양수 $a$를 작은 수부터 크기순으로 나열할 때, $n$번째 수를 $a_n$이라 하자. $\\dfrac{100}{\\pi}\\times(a_6-a_2)$의 값을 구하시오. [4점]',
      promptText: '실수 전체에서 미분가능한 함수 f(x)의 도함수 f\'(x) = |sin x|cos x 이다. 양수 a에 대하여 곡선 y=f(x) 위의 점 (a, f(a))에서의 접선 y=g(x)라 하자. h(x)=∫₀ˣ{f(t)-g(t)}dt 가 x=a에서 극대 또는 극소가 되도록 하는 모든 양수 a를 크기순으로 나열할 때 n번째 수를 a_n이라 하자. (100/π)×(a_6-a_2)의 값을 구하시오.',
      correct: null,
      tolerance: 0,
      choices: null,
      solution: null,
    },
  ],
  skipped: [],
};
