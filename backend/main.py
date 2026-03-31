"""
main.py
FastAPI application — Document Assistant RAG backend.

Endpoints:
    POST /query         → {answer, sources, fallback_flag, timestamp}
    GET  /history       → list of last 20 Q&A pairs
    POST /clear-history → clears memory
    GET  /export        → download chat history as JSON file
"""

import json
import sys
import tempfile
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Ensure the backend directory is on sys.path
sys.path.insert(0, str(Path(__file__).parent))

from rag.llm import synthesise
from rag.memory import memory
from rag.retriever import Retriever

# ── App state ─────────────────────────────────────────────────────────────
retriever: Retriever | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the retriever (FAISS index + BM25) on startup."""
    global retriever
    try:
        retriever = Retriever()
        # Validate FAISS index and chunks.json are in sync
        if retriever.index.ntotal != len(retriever.chunks):
            raise RuntimeError(
                f"Index out of sync: FAISS has {retriever.index.ntotal} vectors "
                f"but chunks.json has {len(retriever.chunks)} entries. "
                "Re-run `python ingest.py`."
            )
        print("✅ Retriever ready.")
    except FileNotFoundError as exc:
        print(f"⚠️  {exc}")
        print("Run 'python ingest.py' to build the index, then restart the server.")
        # Allow server to start anyway; /query will return 503
    yield
    # No teardown needed


# ── FastAPI app ───────────────────────────────────────────────────────────
app = FastAPI(
    title="OmniGuide RAG Document Assistant",
    description="Retrieval-Augmented Generation for a Lube Oil Blending Plant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ───────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    user_query: str = Field(..., min_length=1, max_length=2000)


class SourceItem(BaseModel):
    doc_id: str
    title: str
    section: str
    excerpt: str
    score: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    fallback_flag: bool
    timestamp: str


class HistoryEntry(BaseModel):
    question: str
    answer: str
    sources: list[SourceItem]
    fallback_flag: bool
    timestamp: str


# ── Helper ────────────────────────────────────────────────────────────────
def _chunk_to_source(chunk: dict) -> SourceItem:
    return SourceItem(
        doc_id=chunk["doc_id"],
        title=chunk["title"],
        section=chunk["section"],
        excerpt=chunk["content"][:400],   # truncate long excerpts for API response
        score=round(chunk.get("score", 0.0), 4),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────
@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Main RAG endpoint.
    1. Retrieve relevant chunks via hybrid search.
    2. Synthesise answer with Ollama (or fall back to raw excerpts).
    3. Store in conversation memory.
    4. Return answer + source attribution.
    """
    if retriever is None:
        raise HTTPException(
            status_code=503,
            detail="Index not loaded. Run `python ingest.py` first, then restart the server.",
        )

    user_query = request.user_query.strip()

    # ── Retrieve ──────────────────────────────────────────────────────────
    chunks = retriever.retrieve(user_query)

    if not chunks:
        no_info_answer = "No relevant information found in the provided documents."
        entry = memory.add(
            question=user_query,
            answer=no_info_answer,
            sources=[],
            fallback_flag=False,
        )
        return QueryResponse(
            answer=no_info_answer,
            sources=[],
            fallback_flag=False,
            timestamp=entry["timestamp"],
        )

    # ── Synthesise ────────────────────────────────────────────────────────
    answer, fallback_flag = await synthesise(user_query, chunks)

    # ── Build source list ─────────────────────────────────────────────────
    sources = [_chunk_to_source(c) for c in chunks]

    # ── Store in memory ───────────────────────────────────────────────────
    entry = memory.add(
        question=user_query,
        answer=answer,
        sources=[s.model_dump() for s in sources],
        fallback_flag=fallback_flag,
    )

    return QueryResponse(
        answer=answer,
        sources=sources,
        fallback_flag=fallback_flag,
        timestamp=entry["timestamp"],
    )


@app.get("/history", response_model=list[HistoryEntry])
async def get_history():
    """Return last 20 Q&A pairs."""
    return memory.get_all()


@app.post("/clear-history")
async def clear_history():
    """Clear conversation memory."""
    memory.clear()
    return {"status": "cleared", "message": "Conversation history has been cleared."}


@app.get("/export")
async def export_history():
    """
    Export conversation history as a downloadable JSON file.
    Filename includes a timestamp to avoid collisions.
    """
    entries = memory.get_all()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    filename = f"chat_export_{timestamp}.json"

    # Write to a temp file and return as download
    tmp = tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".json",
        delete=False,
        encoding="utf-8",
    )
    json.dump(
        {"exported_at": timestamp, "entries": entries},
        tmp,
        ensure_ascii=False,
        indent=2,
    )
    tmp.flush()
    tmp.close()

    return FileResponse(
        path=tmp.name,
        media_type="application/json",
        filename=filename,
    )


@app.get("/health")
async def health():
    """Health check — useful for Docker / load balancer probes."""
    return {
        "status": "ok",
        "index_loaded": retriever is not None,
        "chunks": len(retriever.chunks) if retriever else 0,
    }


# ── Document viewer endpoints ─────────────────────────────────────────────

@app.get("/documents")
async def list_documents():
    """
    Return metadata for every document in the knowledge base.
    Derived from the loaded chunks; each entry includes doc_id, title,
    total chunk count, and a list of unique section names in order.
    """
    if retriever is None:
        raise HTTPException(status_code=503, detail="Index not loaded.")

    # Aggregate per doc_id preserving insertion order
    docs: dict[str, dict] = {}
    for chunk in retriever.chunks:
        did = chunk["doc_id"]
        if did not in docs:
            docs[did] = {
                "doc_id": did,
                "title": chunk["title"],
                "chunk_count": 0,
                "sections": [],
                "char_total": 0,
            }
        docs[did]["chunk_count"] += 1
        docs[did]["char_total"] += chunk.get("char_count", len(chunk["content"]))
        sec = chunk["section"]
        if sec not in docs[did]["sections"]:
            docs[did]["sections"].append(sec)

    return list(docs.values())


@app.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """
    Return all chunks for a specific document, grouped by section.
    Response: { doc_id, title, sections: [{ name, chunks: [{ id, content, char_count }] }] }
    """
    if retriever is None:
        raise HTTPException(status_code=503, detail="Index not loaded.")

    doc_chunks = [c for c in retriever.chunks if c["doc_id"].upper() == doc_id.upper()]
    if not doc_chunks:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")

    title = doc_chunks[0]["title"]
    sections: dict[str, list] = {}
    for chunk in doc_chunks:
        sec = chunk["section"]
        if sec not in sections:
            sections[sec] = []
        sections[sec].append({
            "id": chunk["id"],
            "content": chunk["content"],
            "char_count": chunk.get("char_count", len(chunk["content"])),
        })

    return {
        "doc_id": doc_id.upper(),
        "title": title,
        "sections": [{"name": sec, "chunks": chunks} for sec, chunks in sections.items()],
    }
