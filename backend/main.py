import os
import json
import re
import base64
from pathlib import Path

import anthropic
import fitz  # PyMuPDF
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from prompts import (
    GENERATE_SYSTEM,
    WRONG_ANSWER_SYSTEM,
    GRADE_SYSTEM,
    build_generate_prompt,
    build_single_problem_prompt,
    build_grade_messages,
    build_hint_messages,
    build_wrong_answer_messages,
    classify_hint_type,
    get_tutor_system,
)

load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="Aha Moment AI")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    # Vercel 프로덕션 / 프리뷰 도메인
    "https://ahaai.vercel.app",
    "https://frontend-nine-theta-94.vercel.app",
    "https://ahaai.onrender.com",
    "https://aha-study.com",
    "https://www.aha-study.com",
    # Vercel 프리뷰 URL 패턴 (*.vercel.app)
]
# CORS_ORIGINS 환경변수로 추가 도메인 주입 가능 (쉼표 구분)
_extra = os.getenv("CORS_ORIGINS", "")
if _extra:
    ALLOWED_ORIGINS += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MAX_CHARS      = 80_000
MAX_IMG_PAGES  = 15   # Vision으로 보낼 최대 페이지 수
IMG_SCALE      = 1.5  # 렌더링 해상도 배율 (108 DPI)


# ─── 요청 스키마 ───

class HintRequest(BaseModel):
    problem: dict
    hints_log: list
    question: str
    attempts: int = 0


class WrongAnswerRequest(BaseModel):
    problem: dict
    hints_log: list
    wrong_val: float
    reasoning: str = ""
    attempts: int = 0


class GenerateSingleRequest(BaseModel):
    original_text: str
    source: str
    subject: str = ""


class GradeRequest(BaseModel):
    problem: dict
    student_answer: str
    expected_solution: str = ""

class SolveRequest(BaseModel):
    problem: dict


class GenerateCreativeRequest(BaseModel):
    summary: str
    topics: list[str] = []
    topic: str
    count: int = 3
    problem_type: str = "4지선다"  # '4지선다' | '빈칸채우기' | '단답형'
    subject: str = ""


# ─── Claude 응답 JSON 파싱 ───

def parse_claude_json(raw: str) -> dict:
    from json_repair import repair_json
    text = raw.strip()
    # 마크다운 코드블록 제거
    text = re.sub(r"^```json\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    text = text.strip()
    # 1차: 정상 파싱
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # 2차: json_repair로 자동 복구
    try:
        repaired = repair_json(text, return_objects=True)
        if isinstance(repaired, dict):
            return repaired
    except Exception:
        pass
    # 3차: {} 블록 추출 후 repair
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            repaired = repair_json(match.group(), return_objects=True)
            if isinstance(repaired, dict):
                return repaired
        except Exception:
            pass
    raise ValueError("AI 응답 JSON 형식 오류. 다시 시도해주세요.")


# ─── PDF 텍스트 + 페이지 이미지 추출 ───

def extract_pdf_content(data: bytes) -> tuple[str, list[str]]:
    """
    Returns:
        text      - 전체 텍스트 (기존과 동일)
        images_b64 - Vision용 페이지 PNG base64 목록
                     (이미지/도형 포함 페이지 + 텍스트 희박 페이지만 선택)
    """
    doc = fitz.open(stream=data, filetype="pdf")
    matrix = fitz.Matrix(IMG_SCALE, IMG_SCALE)

    # 1) 전체 텍스트 추출
    text = "\n".join(page.get_text() for page in doc)

    # 2) 비주얼 콘텐츠가 있는 페이지 선별
    visual_pages = []
    for i, page in enumerate(doc):
        has_embedded_images = len(page.get_images(full=False)) > 0
        text_chars = len(page.get_text().strip())
        # 이미지 삽입 OR 텍스트가 너무 적은 페이지 (그래프·도형 전용 페이지)
        if has_embedded_images or text_chars < 150:
            visual_pages.append(i)

    # 비주얼 페이지가 없으면 전체를 균등 샘플링 (첫 페이지 포함)
    if not visual_pages:
        total = len(doc)
        if total <= MAX_IMG_PAGES:
            visual_pages = list(range(total))
        else:
            step = total / MAX_IMG_PAGES
            visual_pages = [int(i * step) for i in range(MAX_IMG_PAGES)]

    # 최대 MAX_IMG_PAGES 페이지만
    visual_pages = visual_pages[:MAX_IMG_PAGES]

    images_b64 = []
    for idx in visual_pages:
        page = doc[idx]
        pix = page.get_pixmap(matrix=matrix)
        images_b64.append(base64.b64encode(pix.tobytes("png")).decode())

    print(f"[extract] pages={len(doc)}, visual_pages={len(images_b64)}, chars={len(text)}")
    return text, images_b64


# ─── API 엔드포인트 ───

@app.post("/api/process")
async def process_file(file: UploadFile = File(...)):
    """PDF 업로드 -> 문제 + 요약 생성 (Vision 포함)"""
    import traceback
    try:
        name = file.filename or ""
        data = await file.read()

        if not name.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="PDF only")

        text, images_b64 = extract_pdf_content(data)
        if not text.strip() and not images_b64:
            raise HTTPException(status_code=400, detail="No content extracted")

        truncated = text[:MAX_CHARS] if len(text) > MAX_CHARS else text
        result = await generate_content(truncated, images_b64, name)
        return result

    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[process ERROR] {type(e).__name__}: {e}\n{tb}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@app.post("/api/hint")
async def get_hint(req: HintRequest):
    """소크라테스 힌트 요청 — 힌트 유형 자동 분류 후 적합한 프롬프트 사용"""
    hint_type = classify_hint_type(req.question, req.hints_log)
    system = get_tutor_system(hint_type)
    messages = build_hint_messages(req.problem, req.hints_log, req.question, req.attempts, hint_type)
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=system,
        messages=messages,
    )
    return {"hint": response.content[0].text, "hint_type": hint_type}


@app.post("/api/wrong-answer")
async def analyze_wrong_answer(req: WrongAnswerRequest):
    """오답 분석 — 계산 실수 vs 방향 오류 구분"""
    messages = build_wrong_answer_messages(
        req.problem, req.hints_log, req.wrong_val, req.reasoning, req.attempts
    )
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=WRONG_ANSWER_SYSTEM,
        messages=messages,
    )
    return {"hint": response.content[0].text}


@app.post("/api/solve")
async def solve_problem(req: SolveRequest):
    """문제 정답 + 풀이 생성 — solution 텍스트와 정답 값을 함께 반환"""
    import traceback
    try:
        problem_text = req.problem.get("promptText") or req.problem.get("latex") or ""
        if not problem_text.strip():
            raise HTTPException(status_code=400, detail="문제 텍스트가 비어 있습니다.")
        fmt = req.problem.get("format", "서술형")
        # 수치 문제는 정답 숫자도 JSON으로 추출
        # temperature=0 으로 고정 → 동일 문제는 항상 동일한 답
        prompt = (
            f"Solve this problem completely. Show all steps.\n"
            f"At the very end, write exactly: ANSWER: <number>\n\n{problem_text}"
        )
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        if not response.content:
            raise HTTPException(status_code=500, detail="AI 응답이 비어 있습니다.")
        text = response.content[0].text
        def extract_num(t: str):
            m = re.search(r'ANSWER:[^0-9\-]*(-?\d[\d,]*(?:\.\d+)?)', t, re.IGNORECASE)
            if m:
                try: return float(m.group(1).replace(',', ''))
                except: pass
            for line in reversed(t.strip().splitlines()):
                m2 = re.search(r'-?\d[\d,]*(?:\.\d+)?', line)
                if m2:
                    try: return float(m2.group().replace(',', ''))
                    except: pass
            return None

        answer = None
        verified = False

        if fmt == "수치":
            answer = extract_num(text)

        import asyncio

        # ── 교차검증 + LaTeX 후처리를 병렬 실행 ──
        async def cross_validate():
            """Haiku가 독립적으로 풀어서 Sonnet 답과 비교"""
            if fmt != "수치":
                return None
            try:
                ver = await client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=100,
                    temperature=0,
                    messages=[{"role": "user", "content": (
                        f"Solve this problem independently. "
                        f"Reply with ONLY: ANSWER: <number>\n\n{problem_text}"
                    )}]
                )
                return extract_num(ver.content[0].text)
            except Exception as e:
                print(f"[solve] 교차검증 오류: {e}")
                return None

        async def latex_fix(raw: str) -> str:
            """Haiku가 풀이 텍스트의 수식 LaTeX 감싸기를 검수·보완"""
            try:
                fix_prompt = (
                    "You are a LaTeX formatter. Review the math solution below.\n"
                    "Rules:\n"
                    "- Wrap ALL math expressions (numbers in equations, fractions, exponents, variables, Greek letters, operators) with $...$ (inline) or $$...$$ (display/standalone).\n"
                    "- Standalone equations on their own line → $$...$$\n"
                    "- Inline expressions within a sentence → $...$\n"
                    "- Do NOT change any words, steps, or the ANSWER: line.\n"
                    "- If already correctly wrapped, return as-is.\n"
                    "- Return ONLY the corrected solution text. No commentary.\n\n"
                    f"SOLUTION:\n{raw}"
                )
                res = await client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=2000,
                    temperature=0,
                    messages=[{"role": "user", "content": fix_prompt}],
                )
                fixed = res.content[0].text.strip()
                print(f"[solve] LaTeX 후처리 완료 (len {len(raw)}→{len(fixed)})")
                return fixed
            except Exception as e:
                print(f"[solve] LaTeX 후처리 오류: {e}")
                return raw  # 실패 시 원본 반환

        answer2_fut, latex_fut = await asyncio.gather(
            cross_validate(),
            latex_fix(text),
            return_exceptions=False,
        )
        answer2 = answer2_fut
        text = latex_fut  # LaTeX 교정된 풀이로 교체

        # 교차검증 결과 처리
        if fmt == "수치":
            if answer is not None and answer2 is not None:
                tol = max(abs(answer) * 0.001, 0.01)
                verified = abs(answer - answer2) <= tol
                if not verified:
                    print(f"[solve] ⚠ 교차검증 불일치: Sonnet={answer}, Haiku={answer2}")
                else:
                    print(f"[solve] ✓ 교차검증 일치: {answer}")
            elif answer2 is not None and answer is None:
                answer = answer2  # Sonnet 추출 실패 시 Haiku 값 사용

        print(f"[solve] fmt={fmt}, answer={answer}, verified={verified}")
        return {"solution": text, "answer": answer, "verified": verified}
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[solve ERROR] {type(e).__name__}: {e}\n{tb}")
        raise HTTPException(status_code=500, detail=f"풀이 생성 실패: {str(e)}")


@app.post("/api/grade-answer")
async def grade_answer(req: GradeRequest):
    """서술형 답안 AI 채점"""
    messages = build_grade_messages(req.problem, req.student_answer, req.expected_solution)
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=GRADE_SYSTEM,
        messages=messages,
    )
    return parse_claude_json(response.content[0].text)


@app.post("/api/generate-single")
async def generate_single(req: GenerateSingleRequest):
    """객관식 문제에 선택지 생성"""
    prompt = build_single_problem_prompt(req.original_text, req.source, req.subject)
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text
    parsed = parse_claude_json(raw)
    # choices가 없으면 null 보장
    if parsed.get("format") == "수치":
        parsed["choices"] = None
    return parsed


# ─── 멀티모달 메시지 구성 헬퍼 ───

def build_content(text_prompt: str, images_b64: list[str]):
    if not images_b64:
        return text_prompt
    content = []
    for img_b64 in images_b64:
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img_b64}})
    content.append({"type": "text", "text": text_prompt})
    return content


# ─── 문제 추출 (problems only) ───

async def extract_problems(text: str, images_b64: list[str], source_name: str):
    prompt = build_generate_prompt(text, source_name, has_images=bool(images_b64))
    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=16_000,
        system=GENERATE_SYSTEM,
        messages=[{"role": "user", "content": build_content(prompt, images_b64)}],
    ) as stream:
        msg = await stream.get_final_message()
    raw = msg.content[0].text
    print(f"[extract RAW] {raw[:300]}")
    parsed = parse_claude_json(raw)
    problems = parsed.get("problems", [])
    for i, p in enumerate(problems):
        # Claude가 출력한 "text" 필드를 latex/promptText 양쪽에 그대로 사용
        raw_text = p.pop("text", None) or p.get("latex") or p.get("promptText") or ""
        p["latex"]      = raw_text
        p["promptText"] = raw_text
        p["tag"]        = f"Problem {i + 1}"
        p["type"]       = "자료 기반"
        p.setdefault("format",    "객관식")
        p.setdefault("correct",   None)
        p.setdefault("tolerance", 0)
        p.setdefault("choices",   None)
        p.setdefault("solution",  None)
    skipped = parsed.get("skipped", [])
    print(f"[extract] problems={len(problems)}, formats={[p.get('format') for p in problems]}")
    return problems, skipped, parsed.get("title", source_name), parsed.get("subject", "")


# ─── 요약 생성 (Haiku, 별도) ───

async def generate_summary(text: str, images_b64: list[str], title: str) -> str:
    prompt = (
        f"Write an HTML summary of this document: '{title}'.\n"
        f"Use <h3>, <p>, <ul><li>, <strong>, <div class='formula-block'>$$...$$</div>.\n"
        f"Cover all major topics and key formulas. Min 3 sections.\n\n"
        f"TEXT:\n{text[:30000]}\n\nReturn ONLY the HTML string."
    )
    async with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=3000,
        messages=[{"role": "user", "content": build_content(prompt, images_b64[:2])}],
    ) as stream:
        msg = await stream.get_final_message()
    return msg.content[0].text.strip()


# ─── 토픽 생성 (창작문제용, 업로드 시 1회) ───

async def generate_topics(text: str, title: str) -> list[str]:
    prompt = (
        f"Based on this educational content titled '{title}', list 5-8 specific topics "
        f"that could be tested as quiz questions (concepts, theorems, formulas, definitions).\n"
        f"Return ONLY a JSON array of short Korean strings, e.g. [\"극한의 정의\", \"연속성 조건\"].\n\n"
        f"CONTENT:\n{text[:8000]}"
    )
    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        match = re.search(r'\[[\s\S]*?\]', raw)
        if match:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                return [str(t) for t in parsed[:8]]
    except Exception as e:
        print(f"[topics] 생성 오류: {e}")
    return []


# ─── 통합 생성 ───

async def generate_content(text: str, images_b64: list[str], source_name: str) -> dict:
    import asyncio
    problems, skipped, title, subject = await extract_problems(text, images_b64, source_name)
    summary, topics = await asyncio.gather(
        generate_summary(text, images_b64, title),
        generate_topics(text, title),
    )
    return {
        "title": title,
        "subject": subject,
        "summary": summary,
        "problems": problems,
        "skipped": skipped,
        "topics": topics,
    }


# ─── 창작문제 생성 ───

@app.post("/api/generate-creative")
async def generate_creative(req: GenerateCreativeRequest):
    count = max(1, min(5, req.count))
    type_instructions = {
        "4지선다": (
            "Multiple choice with exactly 4 options.\n"
            "- choices: [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"]\n"
            "- correct: \"A\", \"B\", \"C\", or \"D\""
        ),
        "빈칸채우기": (
            "Fill-in-the-blank. Replace exactly ONE key term/phrase with ___.\n"
            "- choices: null\n"
            "- correct: the exact word/phrase that fills the blank"
        ),
        "단답형": (
            "Short answer question.\n"
            "- choices: null\n"
            "- correct: concise expected answer (1-3 words or a number)"
        ),
    }.get(req.problem_type, "Short answer. choices: null.")

    # 커스텀 토픽 관련성 체크 지시
    custom_note = ""
    if req.topics and req.topic not in req.topics:
        custom_note = (
            f"The topic '{req.topic}' was user-specified. "
            f"If it is completely unrelated to the content, respond with JSON: "
            f'[{{"error": "unrelated"}}] instead of problems.\n'
        )

    prompt = (
        f"Create {count} quiz problem(s) on the topic: '{req.topic}'\n"
        f"Subject: {req.subject}\n"
        f"Problem format: {req.problem_type}\n"
        f"{custom_note}\n"
        f"Format rules:\n{type_instructions}\n\n"
        f"Content summary:\n{req.summary[:6000]}\n\n"
        f"Return ONLY a JSON array (no markdown):\n"
        f'[{{"latex": "Korean problem text with $math$ if needed", '
        f'"promptText": "same text plain", '
        f'"format": "{req.problem_type}", '
        f'"choices": [...] or null, '
        f'"correct": "answer"}}]'
    )

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    raw = re.sub(r"^```json\s*\n?", "", raw)
    raw = re.sub(r"\n?```\s*$", "", raw)

    match = re.search(r'\[[\s\S]*\]', raw)
    if not match:
        raise HTTPException(status_code=500, detail="문제 생성 실패: AI 응답 파싱 오류")

    try:
        problems = json.loads(match.group())
    except Exception:
        from json_repair import repair_json
        problems = repair_json(match.group(), return_objects=True)

    if not isinstance(problems, list) or not problems:
        raise HTTPException(status_code=500, detail="문제 생성 실패")

    # 관련 없는 토픽 기각
    if problems[0].get("error") == "unrelated":
        raise HTTPException(status_code=400, detail="해당 토픽은 자료 내용과 관련이 없습니다.")

    result = []
    for p in problems[:count]:
        result.append({
            "latex":      p.get("latex", ""),
            "promptText": p.get("promptText") or p.get("latex", ""),
            "format":     req.problem_type,
            "choices":    p.get("choices"),
            "correct":    p.get("correct"),
            "tolerance":  0,
            "solution":   None,
            "isCreative": True,
        })

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
