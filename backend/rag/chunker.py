"""
chunker.py
Parses DOCX files and splits them into overlapping text chunks with rich metadata.
Each chunk carries: id, doc_id, title, section, content, char_count.
"""

import re
from pathlib import Path
from docx import Document

# ---------------------------------------------------------------------------
# Document registry — maps filename stem prefix to (doc_id, human title)
# ---------------------------------------------------------------------------
DOC_REGISTRY = {
    "D0": ("D0", "RAG Chatbot User Questions Guide"),
    "D1": ("D1", "Batch Manufacturing Record 15W40"),
    "D2": ("D2", "SCADA OPC-UA Tag Register"),
    "D3": ("D3", "Cybersecurity Risk Assessment IEC62443"),
    "D4": ("D4", "Business Process Map As-Is To-Be"),
    "D5": ("D5", "QC Test Procedures Product Specs"),
    "D6": ("D6", "LIMS Requirements Specification"),
}

CHUNK_SIZE = 800      # target characters per chunk
OVERLAP = 150         # characters carried over to next chunk


def _doc_meta(path: Path) -> tuple[str, str]:
    """Return (doc_id, title) for the given DOCX path."""
    stem = path.stem  # e.g. "D2_SCADA_OPC-UA_Tag_Register"
    for prefix, (doc_id, title) in DOC_REGISTRY.items():
        if stem.startswith(prefix):
            return doc_id, title
    # Fallback: use stem as both id and title
    return stem[:3], stem


def _flatten_table(table) -> str:
    """Convert a docx Table to pipe-delimited plain text."""
    rows = []
    for row in table.rows:
        cells = [cell.text.strip() for cell in row.cells]
        # Deduplicate adjacent identical cells (merged cells repeat content)
        deduped = []
        prev = None
        for c in cells:
            if c != prev:
                deduped.append(c)
            prev = c
        rows.append(" | ".join(deduped))
    return "\n".join(rows)


def _is_heading(para) -> bool:
    """True if the paragraph style is a heading level."""
    style_name = para.style.name if para.style else ""
    return "Heading" in style_name or style_name.startswith("Title")


def _extract_blocks(doc: Document) -> list[dict]:
    """
    Walk the document body in order, returning a flat list of blocks:
        {"type": "heading"|"text"|"table", "text": str}
    Tables that appear between paragraphs are interleaved correctly because
    we iterate doc.element.body children directly.
    """
    from docx.oxml.ns import qn
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    blocks = []
    body = doc.element.body

    for child in body:
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag

        if tag == "p":
            para = Paragraph(child, doc)
            text = para.text.strip()
            if not text:
                continue
            if _is_heading(para):
                blocks.append({"type": "heading", "text": text})
            else:
                blocks.append({"type": "text", "text": text})

        elif tag == "tbl":
            table = Table(child, doc)
            flat = _flatten_table(table).strip()
            if flat:
                blocks.append({"type": "table", "text": flat})

    return blocks


def _make_chunks(
    blocks: list[dict],
    doc_id: str,
    title: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = OVERLAP,
) -> list[dict]:
    """
    Accumulate blocks into chunks of ~chunk_size characters.
    When a chunk is full, save it and carry forward `overlap` tail chars.
    Heading blocks update the current section tracker but are not chunked alone.
    """
    chunks = []
    current_section = "General"
    buffer = ""
    chunk_counter = 0

    def flush(section: str, buf: str) -> None:
        nonlocal chunk_counter
        content = buf.strip()
        if not content:
            return
        chunks.append(
            {
                "id": f"{doc_id}_{chunk_counter:04d}",
                "doc_id": doc_id,
                "title": title,
                "section": section,
                "content": content,
                "char_count": len(content),
            }
        )
        chunk_counter += 1

    for block in blocks:
        if block["type"] == "heading":
            # Flush existing buffer before switching section
            if len(buffer.strip()) > overlap:
                flush(current_section, buffer)
                buffer = buffer[-overlap:] if len(buffer) > overlap else buffer
            current_section = block["text"]
            continue

        text = block["text"] + " "
        buffer += text

        # If buffer exceeds chunk_size, flush and keep overlap tail
        while len(buffer) >= chunk_size:
            flush(current_section, buffer[:chunk_size])
            buffer = buffer[chunk_size - overlap:]

    # Flush remaining buffer
    if buffer.strip():
        flush(current_section, buffer)

    return chunks


def chunk_document(path: Path) -> list[dict]:
    """Parse a single DOCX and return its chunks."""
    doc_id, title = _doc_meta(path)
    doc = Document(str(path))
    blocks = _extract_blocks(doc)
    return _make_chunks(blocks, doc_id, title)


def chunk_documents(paths: list[Path]) -> list[dict]:
    """Parse all DOCX files and return a combined flat list of chunks."""
    all_chunks = []
    for p in paths:
        try:
            chunks = chunk_document(p)
            all_chunks.extend(chunks)
            print(f"  [{p.name}] → {len(chunks)} chunks")
        except Exception as exc:
            print(f"  [ERROR] {p.name}: {exc}")
    return all_chunks
