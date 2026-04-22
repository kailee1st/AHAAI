import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

// PDF 업로드 → 문제 + 요약 생성
export async function processFile(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/api/process', form);
  return data;
}

// 소크라테스 힌트 요청
export async function getHint({ problem, hintsLog, question, attempts }) {
  const { data } = await api.post('/api/hint', {
    problem,
    hints_log: hintsLog,
    question,
    attempts,
  });
  return data.hint;
}

// 오답 분석
export async function analyzeWrongAnswer({ problem, hintsLog, wrongVal, reasoning, attempts }) {
  const { data } = await api.post('/api/wrong-answer', {
    problem,
    hints_log: hintsLog,
    wrong_val: wrongVal,
    reasoning,
    attempts,
  });
  return data.hint;
}

// 서술형 답안 AI 채점
export async function gradeAnswer({ problem, studentAnswer, expectedSolution = '' }) {
  const { data } = await api.post('/api/grade-answer', {
    problem,
    student_answer: studentAnswer,
    expected_solution: expectedSolution,
  });
  return data; // { correct, score, feedback }
}

// 정답 + 풀이 생성 — { solution, answer } 반환
export async function solveProblem({ problem }) {
  const { data } = await api.post('/api/solve', { problem });
  return data; // { solution: string, answer: number|null }
}

// 스킵된 질문 → 문제 객체로 변환
export async function generateSingleProblem({ originalText, source, subject }) {
  const { data } = await api.post('/api/generate-single', {
    original_text: originalText,
    source,
    subject,
  });
  return data;
}

// 창작문제 생성
export async function processYouTube({ url }) {
  const { data } = await api.post('/api/process-youtube', { url });
  return data;
}

export async function processText({ text, title }) {
  const { data } = await api.post('/api/process-text', { text, title });
  return data;
}

export async function generateCreativeProblems({ summary, topics, topic, count, problemType, subject }) {
  const { data } = await api.post('/api/generate-creative', {
    summary,
    topics,
    topic,
    count,
    problem_type: problemType,
    subject,
  });
  return data;
}
