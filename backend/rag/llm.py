"""
llm.py
Ollama integration via external endpoint with async HTTP, 30-second timeout, and clean fallback.

synthesise() returns (answer_text, fallback_flag).
  fallback_flag=False → LLM answered successfully
  fallback_flag=True  → LLM unavailable; caller should use raw chunk excerpts
"""

import httpx
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ollama")

OLLAMA_URL = "http://4.247.160.91:62565/chat"
TIMEOUT = 30.0  # seconds


def _build_prompt(query: str, chunks: list[dict]) -> str:
    excerpts = []
    for i, chunk in enumerate(chunks, 1):
        label = f"[{chunk['doc_id']} — {chunk['title']} | Section: {chunk['section']}]"
        excerpts.append(f"{i}. {label}\n\"{chunk['content'][:600]}\"")

    excerpts_text = "\n\n".join(excerpts)

    return f"""You are OmniGuide, a precise and professional document assistant for a Lube Oil Blending Plant (LOBP). Provide well-structured, technical answers based strictly on the provided document excerpts.

FORMATTING RULES:
- Start with a 1-2 sentence direct answer summarising the key point
- Use numbered steps for procedures or sequences
- Use bullet points for lists of facts, specs, or items
- Use **bold** to highlight critical values, thresholds, or named entities
- Include specific numbers, codes, or standards from the documents (e.g. ISO, ASTM, IEC)
- End with a "Source" note citing the doc IDs referenced (e.g. Source: D1, D5)
- If the answer is not in the excerpts, reply exactly: "Information not found in provided documents."
- Do NOT fabricate or extrapolate beyond what is written

Question: {query}

Document Excerpts:
{excerpts_text}

Answer:"""


def _build_fallback_answer(chunks: list[dict]) -> str:
    """Build a structured excerpt display (no LLM)."""
    lines = ["**Note:** LLM synthesis unavailable. Showing the most relevant document excerpts:\n"]
    for i, chunk in enumerate(chunks, 1):
        label = f"[{chunk['doc_id']} — {chunk['title']} | {chunk['section']}]"
        excerpt = chunk["content"][:400].strip()
        score = chunk.get("score", 0.0)
        relevance_bar = "█" * int(score * 10) + "░" * (10 - int(score * 10))
        lines.append(
            f"**Excerpt {i} — {label}**\n"
            f"> {excerpt}\n"
            f"_Relevance: {relevance_bar} {score:.0%}_"
        )
    return "\n\n---\n\n".join(lines)


async def synthesise(query: str, chunks: list[dict]) -> tuple[str, bool]:
    """
    Attempt to synthesise an answer using the Ollama endpoint.

    Returns:
        (answer_text, fallback_flag)
        fallback_flag=True means LLM was not available.
    """
    if not chunks:
        return "No relevant information found in the provided documents.", False

    prompt = _build_prompt(query, chunks)

    # Log the outgoing prompt
    logger.info("─" * 60)
    logger.info("QUERY  : %s", query)
    logger.info("CHUNKS : %d retrieved (scores: %s)",
                len(chunks),
                ", ".join(f"{c.get('score', 0):.2f}" for c in chunks))
    logger.info("PROMPT :\n%s", prompt[:800] + ("..." if len(prompt) > 800 else ""))
    logger.info("─" * 60)

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                OLLAMA_URL,
                json={"prompt": prompt},
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            data = response.json()

            # Log the raw response for debugging
            logger.info("RESPONSE STATUS : %d", response.status_code)
            logger.info("RESPONSE BODY   : %s", str(data)[:1000])

            # Try common response field names
            answer = (
                data.get("response")
                or data.get("message")
                or data.get("text")
                or data.get("content")
                or data.get("answer")
                or data.get("output")
                or ""
            )

            # Handle nested message object (e.g. OpenAI-style)
            if not answer and isinstance(data.get("message"), dict):
                answer = data["message"].get("content", "")

            answer = answer.strip() if isinstance(answer, str) else ""

            if not answer:
                logger.warning("Empty answer received from Ollama. Full response: %s", data)
                return _build_fallback_answer(chunks), True

            logger.info("ANSWER :\n%s", answer[:600] + ("..." if len(answer) > 600 else ""))
            return answer, False

    except httpx.TimeoutException as exc:
        logger.error("Ollama TIMEOUT after %.0fs: %s", TIMEOUT, exc)
        return _build_fallback_answer(chunks), True

    except httpx.ConnectError as exc:
        logger.error("Ollama CONNECT ERROR — endpoint unreachable: %s", exc)
        return _build_fallback_answer(chunks), True

    except httpx.HTTPStatusError as exc:
        logger.error("Ollama HTTP %d error: %s", exc.response.status_code, exc)
        return _build_fallback_answer(chunks), True

    except Exception as exc:
        logger.error("Ollama UNEXPECTED error [%s]: %s", type(exc).__name__, exc)
        return _build_fallback_answer(chunks), True
