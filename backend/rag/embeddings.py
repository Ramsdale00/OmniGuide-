"""
embeddings.py
Thin wrapper around sentence-transformers for producing L2-normalised
float32 vectors (384-dim, all-MiniLM-L6-v2).

L2-normalisation means FAISS IndexFlatIP (inner product) == cosine similarity.
"""

import numpy as np
from sentence_transformers import SentenceTransformer

_MODEL_NAME = "all-MiniLM-L6-v2"
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"Loading embedding model '{_MODEL_NAME}'...")
        _model = SentenceTransformer(_MODEL_NAME)
        print("Embedding model loaded.")
    return _model


def encode(texts: list[str], batch_size: int = 64) -> np.ndarray:
    """
    Encode a list of strings into L2-normalised float32 vectors.

    Returns:
        np.ndarray of shape (len(texts), 384), dtype float32
    """
    model = _get_model()
    vectors = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 50,
        convert_to_numpy=True,
        normalize_embeddings=True,  # L2-normalise in-place
    )
    return vectors.astype(np.float32)


def encode_query(query: str) -> np.ndarray:
    """
    Encode a single query string.

    Returns:
        np.ndarray of shape (1, 384), dtype float32
    """
    return encode([query])
