"""
Shared httpx.AsyncClient for outbound calls (Ollama, OpenAI, D-ID).
Keeps connection pools warm under concurrent users instead of one client per request.
"""
from __future__ import annotations

from typing import Optional

import httpx

_client: Optional[httpx.AsyncClient] = None


def get_http_client() -> httpx.AsyncClient:
    if _client is None:
        raise RuntimeError("HTTP client not initialized — FastAPI lifespan should run first")
    return _client


def create_shared_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=httpx.Timeout(60.0, connect=12.0),
        limits=httpx.Limits(max_keepalive_connections=32, max_connections=128),
    )


def set_http_client(client: Optional[httpx.AsyncClient]) -> None:
    global _client
    _client = client
