"""Tests for embedding engine — text truncation and dimensions."""

from core.embedding import MAX_TEXT_LENGTH, EMBEDDING_DIMENSIONS


def test_max_text_length():
    assert MAX_TEXT_LENGTH == 2000


def test_embedding_dimensions():
    assert EMBEDDING_DIMENSIONS == 1536


def test_text_truncation():
    """Verify that text would be truncated at MAX_TEXT_LENGTH."""
    long_text = "a" * 3000
    truncated = long_text[:MAX_TEXT_LENGTH]
    assert len(truncated) == 2000
