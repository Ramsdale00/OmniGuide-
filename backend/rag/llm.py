"""
llm.py
Ollama llama3.2 integration with async HTTP, 30-second timeout, and clean fallback.

synthesise() returns (answer_text, fallback_flag).
  fallback_flag=False → LLM answered successfully
  fallback_flag=True  → LLM unavailable; caller should use raw chunk excerpts
"""

import httpx

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2"
TIMEOUT = 30.0  # seconds


def _build_prompt(query: str, chunks: list[dict]) -> str:
    excerpts = []
    for i, chunk in enumerate(chunks, 1):
        label = f"[{chunk['doc_id']} — {chunk['title']} | Section: {chunk['section']}]"
        excerpts.append(f"{label}\n\"{chunk['content'][:600]}\"")

    excerpts_text = "\n\n".join(excerpts)

    return f"""You are a document assistant for a Lube Oil Blending Plant (LOBP).

STRICT RULES:
- Answer ONLY from the provided document excerpts below
- Do NOT hallucinate or add information not present in the excerpts
- Be concise, structured, and technical
- If the answer is not found in the excerpts, respond exactly with: "Information not found in provided documents"
- Use bullet points or numbered lists where appropriate

Question: {query}

Document Excerpts:
{excerpts_text}

Answer:"""


def _build_fallback_answer(chunks: list[dict]) -> str:
    """Build a bullet-point answer from raw chunk excerpts (no LLM)."""
    lines = ["⚠️ Showing relevant excerpts (synthesis unavailable)\n"]
    for chunk in chunks:
        label = f"[{chunk['doc_id']} — {chunk['title']} | Section: {chunk['section']}]"
        excerpt = chunk["content"][:400].strip()
        score = chunk.get("score", 0.0)
        lines.append(f"**{label}**\n> {excerpt}\n_Relevance: {score:.2f}_")
    return "\n\n".join(lines)


async def synthesise(query: str, chunks: list[dict]) -> tuple[str, bool]:
    """
    Attempt to synthesise an answer using Ollama llama3.2.

    Returns:
        (answer_text, fallback_flag)
        fallback_flag=True means LLM was not available.
    """
    if not chunks:
        return "No relevant information found in the provided documents.", False

    prompt = _build_prompt(query, chunks)

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,   # low temp for factual accuracy
                        "top_p": 0.9,
                        "num_ctx": 4096,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            answer = data.get("response", "").strip()

            if not answer:
                return _build_fallback_answer(chunks), True

            return answer, False

    except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError) as exc:
        print(f"[LLM] Ollama unavailable: {type(exc).__name__}: {exc}")
        return _build_fallback_answer(chunks), True

    except Exception as exc:
        print(f"[LLM] Unexpected error: {type(exc).__name__}: {exc}")
        return _build_fallback_answer(chunks), True
