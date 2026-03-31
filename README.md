# OmniGuide — LOBP Document Assistant (RAG)

A production-ready **Retrieval-Augmented Generation (RAG)** system for the Lube Oil Blending Plant (LOBP). Ask natural language questions about operations, maintenance, QC procedures, SCADA architecture, cybersecurity, and more — grounded strictly in the seven plant documents (D0–D6).

---

## Features

| Feature | Detail |
|---|---|
| Hybrid retrieval | Semantic (FAISS cosine) + keyword (BM25), combined score |
| LLM synthesis | Ollama llama3.2, 30-second timeout, zero hallucination prompt |
| Fallback mode | Returns raw excerpts with metadata when Ollama is unavailable |
| Source attribution | Every answer shows document ID, title, section, excerpt, relevance score |
| Conversation memory | Last 20 Q&A pairs, with export to JSON |
| Modern UI | React 18 + Tailwind, ChatGPT-style chat, expandable source panel |

---

## Architecture

```
User Query
   ↓
React Frontend (port 5173)
   ↓ POST /query
FastAPI Backend (port 8000)
   ├── Hybrid Retriever
   │     ├── FAISS semantic search (all-MiniLM-L6-v2 embeddings)
   │     └── BM25 keyword search
   │         → top 6 chunks (score = 0.65·semantic + 0.35·BM25)
   └── Ollama llama3.2 (port 11434)
         → synthesised answer OR fallback raw excerpts
```

---

## Quick Start (local dev — recommended)

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com) installed and running

### 1. Pull the LLM model

```bash
ollama pull llama3.2
ollama serve          # start Ollama (if not already running)
```

### 2. Set up and run the backend

```bash
cd backend
pip install -r requirements.txt

# One-time: parse documents, build FAISS + BM25 indexes
python ingest.py

# Start the API server
uvicorn main:app --reload --port 8000
```

The ingest step downloads `all-MiniLM-L6-v2` (~90 MB) on first run and produces `backend/data/` with:
- `chunks.json` — all document chunks with metadata
- `faiss.index` — FAISS vector index
- `bm25.pkl` — BM25 model

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Docker Compose

```bash
# Start Ollama on the host first:
ollama serve

# Then build and run all services:
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

---

## API Reference

### `POST /query`

```json
// Request
{ "user_query": "What is the flash point of 15W-40?" }

// Response
{
  "answer": "The flash point of Engine Oil 15W-40 API SN must be ≥220°C...",
  "sources": [
    {
      "doc_id": "D5",
      "title": "QC Test Procedures Product Specs",
      "section": "Specification Matrix",
      "excerpt": "Engine Oil 15W-40 API SN ... Flash Point ≥220°C ...",
      "score": 0.87
    }
  ],
  "fallback_flag": false,
  "timestamp": "2024-08-12T14:30:00Z"
}
```

### `GET /history`
Returns last 20 Q&A pairs.

### `POST /clear-history`
Clears conversation memory.

### `GET /export`
Downloads conversation history as a timestamped JSON file.

### `GET /health`
Health check: `{ "status": "ok", "index_loaded": true, "chunks": 95 }`

---

## Knowledge Base Documents

| ID | Document | Contents |
|---|---|---|
| D0 | RAG Chatbot User Questions Guide | 88 test questions across 8 user personas |
| D1 | Batch Manufacturing Record 15W40 | Step-by-step blending BMR for Engine Oil 15W-40 |
| D2 | SCADA OPC-UA Tag Register | Siemens S7-1500 PLCs, Ignition SCADA, Azure IoT, OPC-UA endpoints |
| D3 | Cybersecurity Risk Assessment IEC62443 | 5 security zones, risk register, IEC 62443-3-2 controls |
| D4 | Business Process Map As-Is To-Be | Workshop findings, pain points, SAP PP-PI integration |
| D5 | QC Test Procedures Product Specs | 6 product grade specs, ASTM D445 SOP, NCR procedures |
| D6 | LIMS Requirements Specification | 25-40 samples/day, SAP QM integration, instrument connectivity |

---

## Hybrid Retrieval Scoring

```
combined_score = 0.65 × semantic_score + 0.35 × bm25_score
```

- **Semantic score**: cosine similarity via FAISS IndexFlatIP on L2-normalised vectors
- **BM25 score**: min-max normalised BM25Okapi score
- Chunks below 0.15 are discarded; duplicates are deduplicated
- Returns top 6 chunks

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` (local, 384-dim) |
| Vector DB | FAISS `IndexFlatIP` (file-based, no external service) |
| Keyword search | rank-bm25 `BM25Okapi` |
| LLM | Ollama llama3.2 (fully local) |
| Frontend | React 18, Vite, Tailwind CSS v3 |
| Docker | Docker Compose with nginx proxy |
