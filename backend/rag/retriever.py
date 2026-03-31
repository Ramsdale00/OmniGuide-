"""
retriever.py
Hybrid retrieval engine: semantic (FAISS cosine) + keyword (BM25).

Scoring formula:
    combined = 0.65 * semantic_score + 0.35 * bm25_score

Both scores are normalised to [0, 1] before combining.
"""

import json
import pickle
import re
from pathlib import Path

import faiss
import numpy as np
from rank_bm25 import BM25Okapi

from rag.embeddings import encode_query

DATA_DIR = Path(__file__).parent.parent / "data"

ALPHA = 0.65          # weight for semantic score
BETA = 0.35           # weight for BM25 score
TOP_K = 6             # default number of results
SCORE_THRESHOLD = 0.15  # discard chunks below this combined score


def _tokenize(text: str) -> list[str]:
    """Simple whitespace + punctuation tokenizer (lowercase)."""
    return re.findall(r"\w+", text.lower())


class Retriever:
    def __init__(self):
        chunks_path = DATA_DIR / "chunks.json"
        index_path = DATA_DIR / "faiss.index"
        bm25_path = DATA_DIR / "bm25.pkl"

        if not all(p.exists() for p in [chunks_path, index_path, bm25_path]):
            raise FileNotFoundError(
                "Index files not found. Run `python ingest.py` first."
            )

        with open(chunks_path, "r", encoding="utf-8") as f:
            self.chunks: list[dict] = json.load(f)

        self.index: faiss.IndexFlatIP = faiss.read_index(str(index_path))

        with open(bm25_path, "rb") as f:
            self.bm25: BM25Okapi = pickle.load(f)

        print(f"Retriever loaded: {len(self.chunks)} chunks, FAISS dim={self.index.d}")

    def retrieve(self, query: str, top_k: int = TOP_K) -> list[dict]:
        """
        Retrieve top_k most relevant chunks for the query.

        Returns a list of chunk dicts enriched with a 'score' key (0–1).
        """
        if not query.strip():
            return []

        candidate_k = top_k * 3  # over-fetch before hybrid re-ranking

        # ── 1. Semantic search ────────────────────────────────────────────
        q_vec = encode_query(query)  # shape (1, 384), already L2-normalised
        faiss_scores, faiss_indices = self.index.search(q_vec, min(candidate_k, len(self.chunks)))
        # faiss_scores[0]: cosine similarities in [-1, 1]; clip to [0, 1]
        sem_scores = {
            int(idx): max(0.0, float(score))
            for idx, score in zip(faiss_indices[0], faiss_scores[0])
            if idx >= 0
        }

        # ── 2. BM25 keyword search ────────────────────────────────────────
        tokens = _tokenize(query)
        raw_bm25 = self.bm25.get_scores(tokens)  # shape (N,)
        bm25_min, bm25_max = raw_bm25.min(), raw_bm25.max()
        bm25_range = bm25_max - bm25_min + 1e-9
        norm_bm25 = (raw_bm25 - bm25_min) / bm25_range  # normalise to [0, 1]

        # Top BM25 candidates
        bm25_top_idx = np.argsort(raw_bm25)[::-1][:candidate_k]
        kw_scores = {int(i): float(norm_bm25[i]) for i in bm25_top_idx}

        # ── 3. Union pool + hybrid scoring ────────────────────────────────
        candidate_indices = set(sem_scores.keys()) | set(kw_scores.keys())
        results = []
        seen_content = set()

        for idx in candidate_indices:
            s_sem = sem_scores.get(idx, 0.0)
            s_kw = kw_scores.get(idx, 0.0)
            combined = ALPHA * s_sem + BETA * s_kw

            if combined < SCORE_THRESHOLD:
                continue

            chunk = self.chunks[idx].copy()

            # Deduplication: skip chunks with identical content
            content_key = chunk["content"][:200]
            if content_key in seen_content:
                continue
            seen_content.add(content_key)

            chunk["score"] = round(combined, 4)
            chunk["semantic_score"] = round(s_sem, 4)
            chunk["bm25_score"] = round(s_kw, 4)
            results.append(chunk)

        # ── 4. Sort by combined score, return top_k ───────────────────────
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
