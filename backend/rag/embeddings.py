"""
embeddings.py
Thin wrapper around fastembed (ONNX-based, no PyTorch) for producing
L2-normalised float32 vectors (384-dim, all-MiniLM-L6-v2).

L2-normalisation means FAISS IndexFlatIP (inner product) == cosine similarity.
fastembed normalises internally; no post-processing needed.
"""

import numpy as np
from fastembed import TextEmbedding

_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model: TextEmbedding | None = None


def _get_model() -> TextEmbedding:
    global _model
    if _model is None:
        print(f"Loading embedding model '{_MODEL_NAME}'...")
        _model = TextEmbedding(_MODEL_NAME)
        print("Embedding model loaded.")
    return _model


def encode(texts: list[str], batch_size: int = 64) -> np.ndarray:
    """
    Encode a list of strings into L2-normalised float32 vectors.

    Returns:
        np.ndarray of shape (len(texts), 384), dtype float32
    """
    model = _get_model()
    return np.array(list(model.embed(texts, batch_size=batch_size)), dtype=np.float32)


def encode_query(query: str) -> np.ndarray:
    """
    Encode a single query string.

    Returns:
        np.ndarray of shape (1, 384), dtype float32
    """
    return encode([query])
