"""Read-only public API for the scholarship pilot. No credentials or storage."""

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from starlette.requests import ClientDisconnect

from .eligibility import QUESTIONS, SCHEME, ScholarshipAnswers, evaluate
from .reports import render_report


MAX_ANSWER_BYTES = 1024
PRIVATE_HEADERS = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}
router = APIRouter()


def rejected(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail, headers=PRIVATE_HEADERS)


@router.get("/api/scholarship")
async def scholarship() -> Response:
    return JSONResponse({"scheme": SCHEME, "questions": QUESTIONS}, headers=PRIVATE_HEADERS)


@router.post("/api/scholarship")
async def check_scholarship(request: Request, format: str = "json") -> Response:
    if format not in {"json", "pdf"}:
        raise rejected(400, "The result format must be json or pdf.")
    if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/json":
        raise rejected(415, "Send the questionnaire answers as JSON.")
    body = bytearray()
    try:
        async for chunk in request.stream():
            if len(body) + len(chunk) > MAX_ANSWER_BYTES:
                raise rejected(413, "The questionnaire request is too large.")
            body.extend(chunk)
        answers = ScholarshipAnswers.model_validate_json(body)
    except (ValidationError, ClientDisconnect):
        raise rejected(422, "Use only the questionnaire's Yes, No, or Not sure choices.") from None

    result = evaluate(answers)
    if format == "pdf":
        pdf = await run_in_threadpool(render_report, result)
        headers = {**PRIVATE_HEADERS, "Content-Disposition": 'attachment; filename="yojnaagent-scholarship-report.pdf"'}
        return Response(pdf, media_type="application/pdf", headers=headers)
    return JSONResponse(result, headers=PRIVATE_HEADERS)


def create_app() -> FastAPI:
    app = FastAPI(title="YojnaAgent scholarship pilot", docs_url=None, redoc_url=None,
                  openapi_url=None, redirect_slashes=False)
    app.include_router(router)
    return app


app = create_app()
