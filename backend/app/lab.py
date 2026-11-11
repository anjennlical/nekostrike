"""Internal deliberately vulnerable lab. Never mount on the workspace API."""
from fastapi import FastAPI, Header, HTTPException
from httpx import ASGITransport, AsyncClient

ORDERS = {
    "order-alice": {"id": "order-alice", "owner": "alice", "item": "Teclado Sakura", "total": 120},
    "order-bob": {"id": "order-bob", "owner": "bob", "item": "Mouse Mochi", "total": 80},
}


def create_lab(*, protected: bool) -> FastAPI:
    lab = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @lab.get("/lab/orders/{order_id}")
    def order(order_id: str, authorization: str | None = Header(default=None)):
        actor = {"Bearer fixture-alice": "alice", "Bearer fixture-bob": "bob"}.get(authorization)
        if actor is None:
            raise HTTPException(401, "Identidade fictícia necessária")
        resource = ORDERS.get(order_id)
        if resource is None:
            raise HTTPException(404, "Pedido inexistente")
        if protected and resource["owner"] != actor:
            raise HTTPException(403, "Pedido pertence a outro usuário")
        return resource
    return lab


async def check_bola(mode: str) -> tuple[str, list[dict]]:
    """Capture ASGI responses without sockets, external targets or user credentials."""
    evidence = []
    for scenario, protected, resource, expected in [
        ("baseline", mode == "fixed", "order-alice", 200),
        ("cross_user", mode == "fixed", "order-bob", 403),
        ("negative_control", True, "order-bob", 403),
    ]:
        async with AsyncClient(transport=ASGITransport(app=create_lab(protected=protected)),
                               base_url="http://lab.internal") as client:
            path = f"/lab/orders/{resource}"
            response = await client.get(path, headers={"Authorization": "Bearer fixture-alice"})
        evidence.append({"scenario": scenario, "method": "GET", "path": path, "actor": "alice",
                         "lab_mode": "fixed" if protected else "vulnerable", "expected_status": expected,
                         "status": response.status_code, "body": response.json()})
    baseline, cross, control = evidence
    if baseline["status"] != 200 or baseline["body"] != ORDERS["order-alice"] or control["status"] != 403:
        raise RuntimeError("Os controles do laboratório falharam; resultado inconclusivo.")
    if cross["status"] == 200 and cross["body"] == ORDERS["order-bob"]:
        return "vulnerable", evidence
    if cross["status"] == 403:
        return "protected", evidence
    raise RuntimeError("Resposta inesperada; resultado inconclusivo.")
