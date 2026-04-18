// 빌트인 문제 — Stewart Calculus §1.4–1.6 극한

export const BUILTIN_PROBLEMS = [
  {
    tag: 'Problem 1', type: '자료 기반', source: '§1.5 Example',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 3} \\dfrac{x^2 - 9}{x - 3}$$',
    promptText: 'lim(x→3) of (x²-9)/(x-3)',
    note:       'Direct substitution gives $\\tfrac{0}{0}$. Simplify first.',
    correct: 6, tolerance: 0.05,
    solution: '$$\\lim_{x \\to 3} \\dfrac{x^2-9}{x-3} = \\lim_{x \\to 3}(x+3) = 6$$',
  },
  {
    tag: 'Problem 2', type: '유형 변형', source: '§1.6 Technique',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 0} \\dfrac{(3+x)^2 - 9}{x}$$',
    promptText: 'lim(x→0) of ((3+x)²-9)/x',
    note:       'Again $\\tfrac{0}{0}$. Try expanding the numerator.',
    correct: 6, tolerance: 0.05,
    solution: '$$\\lim_{x \\to 0} \\dfrac{(3+x)^2-9}{x} = \\lim_{x \\to 0}(6+x) = 6$$',
  },
  {
    tag: 'Problem 3', type: '유형 변형', source: '§1.6 Conjugate',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 4} \\dfrac{\\sqrt{x}-2}{x-4}$$',
    promptText: 'lim(x→4) of (√x - 2)/(x-4)',
    note:       "Factoring won't work here. Try a different algebraic trick.",
    correct: 0.25, tolerance: 0.01,
    solution: '$$\\lim_{x \\to 4} \\dfrac{\\sqrt{x}-2}{x-4} = \\dfrac{1}{\\sqrt{4}+2} = \\dfrac{1}{4}$$',
  },
  {
    tag: 'Problem 4', type: '유형 변형', source: '§1.6 Practice',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 2} \\dfrac{x^2 + x - 6}{x - 2}$$',
    promptText: 'lim(x→2) of (x²+x-6)/(x-2)',
    note:       '$\\tfrac{0}{0}$ form. Factor the numerator.',
    correct: 5, tolerance: 0.05,
    solution: '$$\\lim_{x \\to 2} \\dfrac{x^2+x-6}{x-2} = \\lim_{x \\to 2}(x+3) = 5$$',
  },
  {
    tag: 'Problem 5', type: '유형 변형', source: '§1.6 Practice',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to -1} \\dfrac{x^2 - 1}{x + 1}$$',
    promptText: 'lim(x→-1) of (x²-1)/(x+1)',
    note:       'Watch the sign when factoring.',
    correct: -2, tolerance: 0.05,
    solution: '$$\\lim_{x \\to -1} \\dfrac{x^2-1}{x+1} = \\lim_{x \\to -1}(x-1) = -2$$',
  },
  {
    tag: 'Problem 6', type: '유형 변형', source: '§1.6 Conjugate',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 0} \\dfrac{\\sqrt{x+1}-1}{x}$$',
    promptText: 'lim(x→0) of (√(x+1)-1)/x',
    note:       'Conjugate technique.',
    correct: 0.5, tolerance: 0.01,
    solution: '$$\\lim_{x \\to 0} \\dfrac{\\sqrt{x+1}-1}{x} = \\lim_{x \\to 0}\\dfrac{1}{\\sqrt{x+1}+1} = \\dfrac{1}{2}$$',
  },
];

export const RESERVE_PROBLEMS = [
  {
    tag: 'Problem 7', type: '유형 변형', source: '§1.6 Practice',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 5} \\dfrac{x^2 - 25}{x - 5}$$',
    promptText: 'lim(x→5) of (x²-25)/(x-5)',
    note:       'Difference of squares in the numerator.',
    correct: 10, tolerance: 0.05,
    solution: '$$\\lim_{x \\to 5} \\dfrac{x^2-25}{x-5} = \\lim_{x \\to 5}(x+5) = 10$$',
  },
  {
    tag: 'Problem 8', type: '유형 변형', source: '§1.6 Conjugate',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 9} \\dfrac{\\sqrt{x}-3}{x-9}$$',
    promptText: 'lim(x→9) of (√x-3)/(x-9)',
    note:       'Rationalize the numerator.',
    correct: 1 / 6, tolerance: 0.005,
    solution: '$$\\lim_{x \\to 9} \\dfrac{\\sqrt{x}-3}{x-9} = \\dfrac{1}{\\sqrt{9}+3} = \\dfrac{1}{6}$$',
  },
  {
    tag: 'Problem 9', type: '유형 변형', source: '§1.6 Practice',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to -2} \\dfrac{x^2 + 5x + 6}{x + 2}$$',
    promptText: 'lim(x→-2) of (x²+5x+6)/(x+2)',
    note:       '$\\tfrac{0}{0}$ form. Factor the numerator.',
    correct: 1, tolerance: 0.05,
    solution: '$$\\lim_{x \\to -2} \\dfrac{x^2+5x+6}{x+2} = \\lim_{x \\to -2}(x+3) = 1$$',
  },
  {
    tag: 'Problem 10', type: '도전', source: '§1.6 Technique',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 0} \\dfrac{x}{\\sqrt{4+x}-2}$$',
    promptText: 'lim(x→0) of x/(√(4+x)-2)',
    note:       'Rationalize the denominator this time.',
    correct: 4, tolerance: 0.05,
    solution: '$$\\lim_{x \\to 0} \\dfrac{x}{\\sqrt{4+x}-2} = \\lim_{x \\to 0}(\\sqrt{4+x}+2) = 4$$',
  },
  {
    tag: 'Problem 11', type: '도전', source: '§1.6 Practice',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 3} \\dfrac{x^3 - 27}{x - 3}$$',
    promptText: 'lim(x→3) of (x³-27)/(x-3)',
    note:       'Difference of cubes: $a^3-b^3=(a-b)(a^2+ab+b^2)$.',
    correct: 27, tolerance: 0.1,
    solution: '$$\\lim_{x \\to 3} \\dfrac{x^3-27}{x-3} = \\lim_{x \\to 3}(x^2+3x+9) = 27$$',
  },
  {
    tag: 'Problem 12', type: '도전', source: '§1.6 Practice',
    latex:      '다음 극한값을 구하시오. $$\\lim_{x \\to 1} \\dfrac{x^3 - 1}{x^2 - 1}$$',
    promptText: 'lim(x→1) of (x³-1)/(x²-1)',
    note:       'Factor both numerator and denominator separately.',
    correct: 1.5, tolerance: 0.05,
    solution: '$$\\lim_{x \\to 1} \\dfrac{x^3-1}{x^2-1} = \\lim_{x \\to 1}\\dfrac{x^2+x+1}{x+1} = \\dfrac{3}{2}$$',
  },
  {
    tag: 'Problem 13', type: '자료 기반', source: '§1.5 One-sided limits',
    latex:      '$x \\to 2^-$ 일 때 (왼쪽 극한), 다음 극한값을 구하시오. $$\\lim_{x \\to 2^-} \\dfrac{|x-2|}{x-2}$$',
    promptText: 'lim(x→2⁻) of |x-2|/(x-2) — left-hand limit',
    note:       'Think about the sign of (x-2) when x approaches 2 from the left.',
    correct: -1, tolerance: 0.05,
    solution: '$$\\text{When } x \\to 2^-, \\; x < 2 \\Rightarrow x-2 < 0 \\Rightarrow |x-2| = -(x-2)$$$$\\therefore \\lim_{x \\to 2^-} \\dfrac{|x-2|}{x-2} = \\dfrac{-(x-2)}{x-2} = -1$$',
  },
  {
    tag: 'Problem 14', type: '도전', source: '§1.6 Squeeze Theorem',
    latex:      '대수적으로 단순화할 수 없는 근본 삼각함수 극한이다. 다음 극한값을 구하시오. $$\\lim_{x \\to 0} \\dfrac{\\sin x}{x}$$',
    promptText: 'lim(x→0) of sin(x)/x — the fundamental trigonometric limit',
    note:       'This cannot be simplified algebraically. Think about what theorem applies when a function is "squeezed" between two bounds.',
    correct: 1, tolerance: 0.01,
    solution: '$$\\text{By the Squeeze Theorem: } \\cos x \\leq \\dfrac{\\sin x}{x} \\leq 1 \\text{ for } x \\approx 0$$$$\\lim_{x \\to 0} \\cos x = 1 \\Rightarrow \\lim_{x \\to 0} \\dfrac{\\sin x}{x} = 1$$',
  },
];

// 채점 로직
export function isCorrect(answer, correct, tolerance) {
  // 객관식: 문자열 비교 (A/B/C/D)
  if (typeof correct === 'string') return answer === correct;
  // 수치: 오차 범위 비교
  return Math.abs(answer - correct) <= tolerance;
}
