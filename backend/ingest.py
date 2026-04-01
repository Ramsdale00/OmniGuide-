"""
ingest.py
One-time document ingestion script.

Run this BEFORE starting the FastAPI server:
    cd backend
    python ingest.py

Produces three files in backend/data/:
    chunks.json    — all chunk dicts (without embeddings)
    faiss.index    — FAISS IndexFlatIP with L2-normalised vectors
    bm25.pkl       — serialised BM25Okapi model
"""

import json
import pickle
import re
import sys
from pathlib import Path

import faiss
import numpy as np

# Ensure the backend directory is on the path so `rag.*` imports work
sys.path.insert(0, str(Path(__file__).parent))

from rag.chunker import chunk_documents
from rag.embeddings import encode

# ── Paths ─────────────────────────────────────────────────────────────────
# Check if we're running in Docker (where repo is at /repo) or locally
if Path("/repo").exists():
    REPO_ROOT = Path("/repo")                      # Docker: DOCX files at /repo
else:
    REPO_ROOT = Path(__file__).parent.parent       # Local: OmniGuide- root
DOCS_DIR = REPO_ROOT                               # DOCX files live at root
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def main():
    # ── 1. Find all DOCX files ────────────────────────────────────────────
    # D0 is the RAG test questions guide — it contains expected answers and must
    # be EXCLUDED from the knowledge base to prevent data contamination.
    all_docx = sorted(DOCS_DIR.glob("D*.docx"))
    docx_paths = [p for p in all_docx if not p.name.startswith("D0")]

    if not docx_paths:
        print(f"ERROR: No D1–D6 *.docx files found in {DOCS_DIR}")
        sys.exit(1)

    skipped = [p.name for p in all_docx if p.name.startswith("D0")]
    if skipped:
        print(f"Skipping (test guide, not knowledge base): {skipped}")

    print(f"Found {len(docx_paths)} knowledge document(s):")
    for p in docx_paths:
        print(f"  • {p.name}")

    # ── 2. Chunk all documents ────────────────────────────────────────────
    print("\nChunking documents...")
    chunks = chunk_documents(docx_paths)
    print(f"\nTotal chunks: {len(chunks)}")

    # ── 3. Compute embeddings ─────────────────────────────────────────────
    print("\nComputing embeddings (this may take a minute on first run)...")
    texts = [c["content"] for c in chunks]
    vectors = encode(texts)  # shape (N, 384), L2-normalised float32
    print(f"Embeddings shape: {vectors.shape}")

    # ── 4. Build and save FAISS index ─────────────────────────────────────
    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)   # inner product = cosine on L2-norm vectors
    index.add(vectors)
    faiss_path = DATA_DIR / "faiss.index"
    faiss.write_index(index, str(faiss_path))
    print(f"FAISS index saved → {faiss_path}  ({index.ntotal} vectors)")

    # ── 5. Build and save BM25 model ──────────────────────────────────────
    from rank_bm25 import BM25Okapi
    tokenized_corpus = [tokenize(c["content"]) for c in chunks]
    bm25 = BM25Okapi(tokenized_corpus)
    bm25_path = DATA_DIR / "bm25.pkl"
    with open(bm25_path, "wb") as f:
        pickle.dump(bm25, f)
    print(f"BM25 model saved  → {bm25_path}")

    # ── 6. Save chunks JSON (no embeddings — they live in FAISS) ──────────
    chunks_path = DATA_DIR / "chunks.json"
    with open(chunks_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    print(f"Chunks JSON saved → {chunks_path}")

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n✅ Ingestion complete!")
    print(f"   Documents : {len(docx_paths)}")
    print(f"   Chunks    : {len(chunks)}")
    print(f"   Vectors   : {index.ntotal}")

    # Show per-document stats
    from collections import Counter
    counts = Counter(c["doc_id"] for c in chunks)
    print("\n   Per-document chunk counts:")
    for doc_id in sorted(counts):
        title = next(c["title"] for c in chunks if c["doc_id"] == doc_id)
        print(f"     {doc_id}: {counts[doc_id]:3d} chunks  ({title})")


if __name__ == "__main__":
    main()
