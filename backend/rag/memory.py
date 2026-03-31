"""
memory.py
In-process conversation memory using a fixed-size deque (max 20 Q&A pairs).
"""

from collections import deque
from datetime import datetime, timezone

MAX_HISTORY = 20


class ConversationMemory:
    def __init__(self):
        self._history: deque[dict] = deque(maxlen=MAX_HISTORY)

    def add(
        self,
        question: str,
        answer: str,
        sources: list[dict],
        fallback_flag: bool,
    ) -> dict:
        entry = {
            "question": question,
            "answer": answer,
            "sources": sources,
            "fallback_flag": fallback_flag,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._history.append(entry)
        return entry

    def get_all(self) -> list[dict]:
        return list(self._history)

    def clear(self) -> None:
        self._history.clear()

    def __len__(self) -> int:
        return len(self._history)


# Module-level singleton shared across the FastAPI app
memory = ConversationMemory()
