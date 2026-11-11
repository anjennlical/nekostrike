"""Internal public-profile fixture. Never mounted on the workspace API."""
from fastapi import FastAPI, Header, HTTPException
from httpx import ASGITransport, AsyncClient

PUBLIC_PROFILE = {"id": "alice", "display_name": "Alice Sakura"}
FULL_PROFILE = {**PUBLIC_PROFILE, "email": "alice@example.invalid",
                "internal_note": "FIXTURE: anotação interna, não destinada ao perfil público"}


def create_profile_lab(*, protected: bool) -> FastAPI:
    lab = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @lab.get("/lab/profiles/alice")
    def profile(authorization: str | None = Header(default=None)):
        if authorization != "Bearer fixture-bob":
            raise HTTPException(401, "Identidade fictícia necessária")
        # A response allowlist lives on the server, never just in the UI.
        return dict(PUBLIC_PROFILE if protected else FULL_PROFILE)
    return lab


async def check_exposure(mode: str) -> tuple[str, list[dict]]:
    evidence = []
    for scenario, protected, authenticated, expected in [
        ("baseline", True, True, 200),
        ("profile_response", mode == "fixed", True, 200),
        ("negative_control", True, False, 401),
    ]:
        async with AsyncClient(transport=ASGITransport(app=create_profile_lab(protected=protected)),
                               base_url="http://lab.internal") as client:
            path = "/lab/profiles/alice"
            response = await client.get(path, headers={"Authorization": "Bearer fixture-bob"} if authenticated else {})
        try:
            body = response.json()
        except ValueError as exc:
            raise RuntimeError("Resposta inválida; resultado inconclusivo.") from exc
        evidence.append({"scenario": scenario, "method": "GET", "path": path,
                         "actor": "bob" if authenticated else "anonymous",
                         "lab_mode": "fixed" if protected else "vulnerable",
                         "expected_status": expected, "status": response.status_code,
                         "body": body})
    baseline, target, control = evidence
    if (baseline["status"] != 200 or baseline["body"] != PUBLIC_PROFILE
            or control["status"] != 401 or control["body"] != {"detail": "Identidade fictícia necessária"}):
        raise RuntimeError("Os controles do laboratório falharam; resultado inconclusivo.")
    if target["status"] == 200 and target["body"] == FULL_PROFILE:
        return "vulnerable", evidence
    if target["status"] == 200 and target["body"] == PUBLIC_PROFILE:
        return "protected", evidence
    raise RuntimeError("Resposta inesperada; resultado inconclusivo.")
