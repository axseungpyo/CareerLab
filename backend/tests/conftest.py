"""Shared test fixtures for CareerLab backend tests."""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)
