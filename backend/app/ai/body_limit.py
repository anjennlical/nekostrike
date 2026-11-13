from starlette.responses import JSONResponse


class AnalyzeBodyLimit:
    """Bound even chunked requests before JSON parsing. Other routes are unchanged."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not (scope["path"] == "/api/ai/analyze" or
                (scope["method"] == "PATCH" and scope["path"].startswith("/api/ai/analyses/"))):
            return await self.app(scope, receive, send)
        data = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            data.extend(message.get("body", b""))
            if len(data) > 1024:
                response = JSONResponse({"detail": {"code": "input_too_large", "message": "Envie apenas os campos permitidos."}}, status_code=413)
                return await response(scope, receive, send)
            if not message.get("more_body", False):
                break
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": bytes(data), "more_body": False}

        await self.app(scope, bounded_receive, send)
