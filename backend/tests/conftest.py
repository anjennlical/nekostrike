"""Tests never read local AI credentials and cannot make real HTTP calls."""
import httpx
import pytest


@pytest.fixture(autouse=True)
def isolated_ai(monkeypatch):
    import app.ai.config as config
    for name in list(config.os.environ):
        if name.startswith("MOCHI_AI_") or name == "OPENAI_API_KEY":
            monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(config, "dotenv_values", lambda *a, **kw: {})

    async def forbidden(*args, **kwargs):
        raise AssertionError("Real HTTP is forbidden in tests; use ASGITransport or MockTransport")
    monkeypatch.setattr(httpx.AsyncHTTPTransport, "handle_async_request", forbidden)

    def forbidden_sync(*args, **kwargs):
        raise AssertionError("Real HTTP is forbidden in tests")
    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", forbidden_sync)
