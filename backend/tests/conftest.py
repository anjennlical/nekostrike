"""Tests never read local AI credentials and cannot make real HTTP calls."""
import httpx
import pytest


def guard_ai(monkeypatch):
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


def pytest_sessionstart(session):
    # Collection imports app.main before fixtures run. Protect that import too.
    session._ai_guard = pytest.MonkeyPatch()
    guard_ai(session._ai_guard)


def pytest_sessionfinish(session, exitstatus):
    session._ai_guard.undo()


@pytest.fixture(autouse=True)
def isolated_ai(monkeypatch):
    guard_ai(monkeypatch)
